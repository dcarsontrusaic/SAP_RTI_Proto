sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/Text",
    "sap/m/Label",
    "sap/m/ObjectNumber",
    "sap/m/VBox",
    "sap/m/HBox",
    "sap/m/Table",
    "sap/m/Column",
    "sap/m/ColumnListItem",
    "sap/m/MessageToast"
], function (Controller, JSONModel, Text, Label, ObjectNumber, VBox, HBox, Table, Column, ColumnListItem, MessageToast) {
    "use strict";

    // Display labels for the well-known pay types and breakdowns.
    // Unknown keys fall through to an auto-generated label (camelCase → "Camel Case").
    var PAY_TYPE_LABELS = {
        basePay:          "Base Pay",
        complementaryPay: "Complementary / Variable Pay",
        totalRewards:     "Total Rewards"
    };

    var BREAKDOWN_LABELS = {
        all:    "All Employees",
        male:   "Male",
        female: "Female"
    };

    return Controller.extend("com.trusaic.rti.home.controller.RequestDetail", {

        formatDate: function (sDate) {
            if (!sDate) { return ""; }
            var oDate = new Date(sDate);
            if (isNaN(oDate.getTime())) { return sDate; }
            return oDate.toLocaleDateString("en-US", {
                year: "numeric", month: "short", day: "numeric"
            });
        },

        onInit: function () {
            var oViewModel = new JSONModel({
                request: {},
                statusHistory: [],
                report: null,
                reportParsed: null
            });
            this.getView().setModel(oViewModel, "detail");
        },

        /**
         * Public method called by MyRequestsFCL controller
         */
        loadRequest: function (sRequestId) {
            if (!sRequestId || sRequestId === this._currentRequestId) {
                return;
            }
            this._currentRequestId = sRequestId;
            this._loadRequestDetail(sRequestId);
        },

        _loadRequestDetail: function (sRequestId) {
            var oViewModel = this.getView().getModel("detail");

            // Reset state before loading
            oViewModel.setProperty("/request", {});
            oViewModel.setProperty("/statusHistory", []);
            oViewModel.setProperty("/report", null);
            oViewModel.setProperty("/reportParsed", null);

            var sUrl = "/api/admin/AllRequests(" + sRequestId +
                       ")?$expand=statusHistory($orderby=changedAt asc),report,employee";

            fetch(sUrl)
                .then(function (response) { return response.json(); })
                .then(function (data) {
                    oViewModel.setProperty("/request", data);
                    oViewModel.setProperty("/statusHistory", data.statusHistory || []);
                    oViewModel.setProperty("/report", data.report || null);

                    if (data.report && data.report.reportData) {
                        try {
                            var oParsed = JSON.parse(data.report.reportData);
                            oViewModel.setProperty("/reportParsed", oParsed);
                            this._renderReportData(oParsed);
                        } catch (e) {
                            console.error("Failed to parse report data:", e);
                        }
                    }
                }.bind(this))
                .catch(function (err) {
                    console.error("Failed to load request:", err);
                    MessageToast.show("Failed to load request details");
                });
        },

        // ---------- Rendering ----------

        _renderReportData: function (oReportData) {
            var oSchema = oReportData.schema || {};
            var oData   = oReportData.data   || {};

            // Employee details chips (kept as an HBox with small label/value pairs)
            var oEmpBox = this.byId("employeeDetailsBox");
            if (oEmpBox && oData.employee && oSchema.employeeFields) {
                oEmpBox.removeAllItems();
                oSchema.employeeFields.forEach(function (sField) {
                    oEmpBox.addItem(new VBox({
                        items: [
                            new Label({ text: this._humanize(sField) }),
                            new Text({ text: oData.employee[sField] || "—" })
                        ]
                    }).addStyleClass("sapUiSmallMarginEnd"));
                }.bind(this));
            }

            // Employee Pay — single table, rows = pay types, cols = Annual (+ Hourly)
            var oEmpPayBox = this.byId("employeePayBox");
            if (oEmpPayBox && oData.employeePay) {
                oEmpPayBox.removeAllItems();
                oEmpPayBox.addItem(this._buildEmployeePayTable(oSchema, oData.employeePay));
            }

            // Comparison Group — one table with rows = pay types and a column per breakdown
            var oCompBox = this.byId("compGroupPayBox");
            if (oCompBox && oData.comparisonGroup) {
                oCompBox.removeAllItems();
                oCompBox.addItem(this._buildComparisonGroupTable(oSchema, oData.comparisonGroup));
            }
        },

        /**
         * Employee Pay table:
         *   | Pay Type            | Annual       | Hourly  |
         *   | Base Pay            | 125,000 USD  | 60.10   |
         *   | Complementary Pay   | 18,000 USD   | 8.65    |
         *   | Total Rewards       | 155,000 USD  | 74.52   |
         */
        _buildEmployeePayTable: function (oSchema, oEmployeePay) {
            var aPayTypes = oSchema.payTypes || [];
            var bHourly   = !!oSchema.includeHourly;

            var aColumns = [
                new Column({ header: new Label({ text: "Pay Type" }) }),
                new Column({ header: new Label({ text: "Annual" }), hAlign: "End" })
            ];
            if (bHourly) {
                aColumns.push(new Column({ header: new Label({ text: "Hourly" }), hAlign: "End" }));
            }

            var oTable = new Table({
                columns: aColumns,
                inset: false,
                showSeparators: "All"
            });

            aPayTypes.forEach(function (sPayType) {
                var oPay = oEmployeePay[sPayType] || {};
                var aCells = [
                    new Text({ text: this._payTypeLabel(sPayType) }),
                    new Text({ text: this._formatAnnual(oPay), textAlign: "End" })
                ];
                if (bHourly) {
                    aCells.push(new Text({ text: this._formatHourly(oPay), textAlign: "End" }));
                }
                oTable.addItem(new ColumnListItem({ cells: aCells }));
            }.bind(this));

            return oTable;
        },

        /**
         * Comparison Group table:
         *   | Pay Type            | All Employees | Male        | Female      |
         *   | Base Pay            | 121,000 USD   | 123,500 ... | 117,000 ... |
         *   | Complementary Pay   | 17,500 USD    | ...         | ...         |
         *   | Total Rewards       | 150,000 USD   | ...         | ...         |
         *   | Number of Employees | 34            | 21          | 13          |
         *
         * Each pay-type cell shows the annual amount on the first line and,
         * when includeHourly is true, the hourly amount on a smaller second line.
         * The final row is rendered only when includeCompGroupSize is true.
         */
        _buildComparisonGroupTable: function (oSchema, oComparisonGroup) {
            var aPayTypes   = oSchema.payTypes || [];
            var aBreakdowns = oSchema.comparisonBreakdowns || ["all"];
            var bHourly     = !!oSchema.includeHourly;
            var bShowSize   = !!oSchema.includeCompGroupSize;

            // Columns: first column is pay type label, then one per breakdown
            var aColumns = [new Column({ header: new Label({ text: "Pay Type" }) })];

            aBreakdowns.forEach(function (sBreakdown) {
                aColumns.push(new Column({
                    header: new Label({ text: this._breakdownLabel(sBreakdown) }),
                    hAlign: "End"
                }));
            }.bind(this));

            var oTable = new Table({
                columns: aColumns,
                inset: false,
                showSeparators: "All"
            });

            // Pay-type rows
            aPayTypes.forEach(function (sPayType) {
                var aCells = [new Text({ text: this._payTypeLabel(sPayType) })];

                aBreakdowns.forEach(function (sBreakdown) {
                    var oGroup = oComparisonGroup[sBreakdown] || {};
                    var oPay   = oGroup[sPayType] || {};

                    // Primary = annual; secondary (if hourly enabled) = small hourly line
                    var aLines = [
                        new Text({ text: this._formatAnnual(oPay), textAlign: "End" })
                    ];
                    if (bHourly) {
                        var oHourly = new Text({
                            text: this._formatHourly(oPay),
                            textAlign: "End"
                        });
                        oHourly.addStyleClass("sapUiTinyMarginTop");
                        oHourly.addStyleClass("sapMTextColorSubtle");
                        aLines.push(oHourly);
                    }

                    aCells.push(new VBox({
                        items: aLines,
                        alignItems: "End"
                    }));
                }.bind(this));

                oTable.addItem(new ColumnListItem({ cells: aCells }));
            }.bind(this));

            // Final row: Number of Employees (only when includeCompGroupSize is true)
            if (bShowSize) {
                var aSizeCells = [
                    new Label({ text: "Number of Employees", design: "Bold" })
                ];
                aBreakdowns.forEach(function (sBreakdown) {
                    var oGroup = oComparisonGroup[sBreakdown] || {};
                    var sSize  = (typeof oGroup.size === "number") ? oGroup.size.toString() : "—";
                    aSizeCells.push(new Text({ text: sSize, textAlign: "End" }));
                }.bind(this));
                oTable.addItem(new ColumnListItem({ cells: aSizeCells }));
            }

            return oTable;
        },

        // ---------- Helpers ----------

        _payTypeLabel: function (sKey) {
            return PAY_TYPE_LABELS[sKey] || this._humanize(sKey);
        },

        _breakdownLabel: function (sKey) {
            return BREAKDOWN_LABELS[sKey] || this._humanize(sKey);
        },

        _humanize: function (sKey) {
            if (!sKey) { return ""; }
            return sKey
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, function (s) { return s.toUpperCase(); })
                .trim();
        },

        _formatAnnual: function (oPay) {
            if (!oPay || typeof oPay.annual !== "number") { return "—"; }
            var sCurrency = oPay.currency ? " " + oPay.currency : "";
            return oPay.annual.toLocaleString() + sCurrency + " / year";
        },

        _formatHourly: function (oPay) {
            if (!oPay || typeof oPay.hourly !== "number") { return "—"; }
            var sCurrency = oPay.currency ? " " + oPay.currency : "";
            return oPay.hourly.toFixed(2) + sCurrency + " / hour";
        },

        onCloseDetail: function () {
            this._currentRequestId = null;
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("myRequests");
        },

        onNavBack: function () {
            this.onCloseDetail();
        }
    });
});