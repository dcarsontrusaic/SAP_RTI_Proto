sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/Text",
    "sap/m/Title",
    "sap/m/Label",
    "sap/m/HBox",
    "sap/m/ObjectNumber",
    "sap/m/VBox",
    "sap/m/Table",
    "sap/m/Column",
    "sap/m/ColumnListItem",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, Text, Title, Label, HBox, ObjectNumber, VBox, Table, Column, ColumnListItem, MessageToast, MessageBox) {
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

        formatDateTime: function (sDate) {
            if (!sDate) { return ""; }
            var oDate = new Date(sDate);
            if (isNaN(oDate.getTime())) { return sDate; }
            return oDate.toLocaleDateString("en-US", {
                year: "numeric", month: "short", day: "numeric"
            }) + " · " + oDate.toLocaleTimeString("en-US", {
                hour: "numeric", minute: "2-digit"
            });
        },

        onInit: function () {
            var oViewModel = new JSONModel({
                request: {},
                statusHistory: [],
                report: null,
                reportParsed: null,
                comments: [],
                commentCount: 0,
                newCommentText: "",
                isPosting: false
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
            oViewModel.setProperty("/comments", []);
            oViewModel.setProperty("/commentCount", 0);
            oViewModel.setProperty("/newCommentText", "");

            // Clear any previously rendered narrative content
            var oNarrativeBox = this.byId("narrativeBox");
            if (oNarrativeBox) { oNarrativeBox.removeAllItems(); }

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

                    if (data.report && data.report.narrative) {
                        this._renderNarrative(data.report.narrative);
                    }

                    // Load comments only if status is Completed (matches panel visibility)
                    if (data.status === "Completed") {
                        this._loadComments(sRequestId);
                    }
                }.bind(this))
                .catch(function (err) {
                    console.error("Failed to load request:", err);
                    MessageToast.show("Failed to load request details");
                });
        },

        _loadComments: function (sRequestId) {
            var oViewModel = this.getView().getModel("detail");
            var sUrl = "/api/admin/AllComments?$filter=request_ID eq " + sRequestId +
                       "&$orderby=postedAt asc";
            fetch(sUrl)
                .then(function (response) { return response.json(); })
                .then(function (data) {
                    var aComments = (data && data.value) ? data.value : [];
                    oViewModel.setProperty("/comments", aComments);
                    oViewModel.setProperty("/commentCount", aComments.length);
                })
                .catch(function (err) {
                    console.error("Failed to load comments:", err);
                    oViewModel.setProperty("/comments", []);
                    oViewModel.setProperty("/commentCount", 0);
                });
        },

        onPostComment: function () {
            var oViewModel = this.getView().getModel("detail");
            var sMessage = (oViewModel.getProperty("/newCommentText") || "").trim();
            if (!sMessage) {
                MessageToast.show("Please enter a comment before posting.");
                return;
            }
            if (oViewModel.getProperty("/isPosting")) {
                return;
            }
            oViewModel.setProperty("/isPosting", true);

            var sRequestId = this._currentRequestId;
            fetch("/api/employee/postComment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    requestId: sRequestId,
                    message: sMessage
                })
            })
                .then(function (response) {
                    if (!response.ok) {
                        return response.text().then(function (text) {
                            throw new Error(text || "Failed to post comment");
                        });
                    }
                    return response.json();
                })
                .then(function () {
                    oViewModel.setProperty("/newCommentText", "");
                    MessageToast.show("Comment posted");
                    // Refresh thread
                    this._loadComments(sRequestId);
                }.bind(this))
                .catch(function (err) {
                    console.error("Failed to post comment:", err);
                    MessageBox.error("Failed to post comment. Please try again.");
                })
                .finally(function () {
                    oViewModel.setProperty("/isPosting", false);
                });
        },

        // ---------- Report rendering ----------

        _renderReportData: function (oReportData) {
            var oSchema = oReportData.schema || {};
            var oData   = oReportData.data   || {};

            // Employee details — kept as label/value chips in an HBox
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

            // Employee Pay — small table: rows = pay types, cols = Annual (+ Hourly)
            var oEmpPayBox = this.byId("employeePayBox");
            if (oEmpPayBox && oData.employeePay) {
                oEmpPayBox.removeAllItems();
                oEmpPayBox.addItem(this._buildEmployeePayTable(oSchema, oData.employeePay));
            }

            // Comparison Group — table with rows = pay types and one column per breakdown
            var oCompBox = this.byId("compGroupPayBox");
            if (oCompBox && oData.comparisonGroup) {
                oCompBox.removeAllItems();
                oCompBox.addItem(this._buildComparisonGroupTable(oSchema, oData.comparisonGroup));
            }
        },

        /**
         * Employee Pay table:
         *   | Pay Type                     | Annual       | Hourly  |
         *   | Base Pay                     | 125,000 USD  | 60.10   |
         *   | Complementary / Variable Pay | 18,000 USD   | 8.65    |
         *   | Total Rewards                | 155,000 USD  | 74.52   |
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
         *   | Pay Type                     | All Employees | Male        | Female      |
         *   | Base Pay                     | 121,000 USD   | 123,500 ... | 117,000 ... |
         *   | Complementary / Variable Pay | 17,500 USD    | ...         | ...         |
         *   | Total Rewards                | 150,000 USD   | ...         | ...         |
         *   | Number of Employees          | 34            | 21          | 13          |
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
                    new Label({ text: "Number of Employees", design: "Bold", wrapping: true })
                ];
                aBreakdowns.forEach(function (sBreakdown) {
                    var oGroup = oComparisonGroup[sBreakdown] || {};
                    var sSize  = (typeof oGroup.size === "number") ? oGroup.size.toString() : "—";
                    aSizeCells.push(new Text({ text: sSize, textAlign: "End" }));
                });
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

        // ---------- Narrative rendering (preserved) ----------

        _renderNarrative: function (sNarrative) {
            var oBox = this.byId("narrativeBox");
            if (!oBox) { return; }
            oBox.removeAllItems();

            // Try to parse as structured JSON; fall back to plain text
            var oData;
            try {
                oData = JSON.parse(sNarrative);
            } catch (e) {
                oBox.addItem(new Text({ text: sNarrative, wrapping: true }));
                return;
            }

            // Validate it looks like our narrative shape
            if (!oData || typeof oData !== "object" ||
                (!oData.title && !oData.intro && !oData.sections)) {
                oBox.addItem(new Text({ text: sNarrative, wrapping: true }));
                return;
            }

            if (oData.title) {
                oBox.addItem(new Title({
                    text: oData.title,
                    level: "H4"
                }).addStyleClass("sapUiSmallMarginBottom"));
            }

            if (oData.intro) {
                oBox.addItem(new Text({
                    text: oData.intro,
                    wrapping: true
                }).addStyleClass("sapUiMediumMarginBottom"));
            }

            if (Array.isArray(oData.sections)) {
                oData.sections.forEach(function (oSection) {
                    if (oSection.heading) {
                        oBox.addItem(new Title({
                            text: oSection.heading.replace(/:$/, ""),
                            level: "H5"
                        }).addStyleClass("sapUiSmallMarginTop sapUiTinyMarginBottom"));
                    }
                    if (oSection.intro) {
                        oBox.addItem(new Text({
                            text: oSection.intro,
                            wrapping: true
                        }).addStyleClass("sapUiTinyMarginBottom"));
                    }
                    if (Array.isArray(oSection.paragraphs)) {
                        oSection.paragraphs.forEach(function (sPara) {
                            oBox.addItem(new Text({
                                text: sPara,
                                wrapping: true
                            }).addStyleClass("sapUiTinyMarginBottom"));
                        });
                    }
                    if (Array.isArray(oSection.bullets) && oSection.bullets.length > 0) {
                        oSection.bullets.forEach(function (sBullet) {
                            var oBulletRow = new HBox({
                                alignItems: "Start",
                                items: [
                                    new Text({ text: "•" })
                                        .addStyleClass("sapUiTinyMarginEnd"),
                                    new Text({ text: sBullet, wrapping: true })
                                ]
                            }).addStyleClass("sapUiTinyMarginBegin sapUiTinyMarginBottom");
                            oBox.addItem(oBulletRow);
                        });
                    }
                });
            }
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