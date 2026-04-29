sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/Text",
    "sap/m/Title",
    "sap/m/Label",
    "sap/m/ObjectNumber",
    "sap/m/VBox",
    "sap/m/HBox",
    "sap/m/MessageToast"
], function (Controller, JSONModel, Text, Title, Label, ObjectNumber, VBox, HBox, MessageToast) {
    "use strict";

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

            // Clear narrative container before reload
            var oNarrativeBox = this.byId("narrativeBox");
            if (oNarrativeBox) {
                oNarrativeBox.removeAllItems();
            }

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
                }.bind(this))
                .catch(function (err) {
                    console.error("Failed to load request:", err);
                    MessageToast.show("Failed to load request details");
                });
        },

        _renderReportData: function (oReportData) {
            var oSchema = oReportData.schema;
            var oData = oReportData.data;

            var oEmpBox = this.byId("employeeDetailsBox");
            if (oEmpBox && oData.employee) {
                oEmpBox.removeAllItems();
                oSchema.employeeFields.forEach(function (field) {
                    var sLabel = field.replace(/([A-Z])/g, " $1")
                        .replace(/^./, function (s) { return s.toUpperCase(); });
                    oEmpBox.addItem(new VBox({
                        items: [
                            new Label({ text: sLabel }),
                            new Text({ text: oData.employee[field] || "—" })
                        ]
                    }).addStyleClass("sapUiSmallMarginEnd"));
                });
            }

            var oEmpPayBox = this.byId("employeePayBox");
            if (oEmpPayBox && oData.employeePay) {
                oEmpPayBox.removeAllItems();
                this._renderPaySection(oEmpPayBox, oData.employeePay, oSchema);
            }

            var oCompBox = this.byId("compGroupPayBox");
            if (oCompBox && oData.comparisonGroup) {
                oCompBox.removeAllItems();
                this._renderPaySection(oCompBox, oData.comparisonGroup, oSchema);
            }
        },

        _renderPaySection: function (oContainer, oPayData, oSchema) {
            oSchema.payTypes.forEach(function (payType) {
                var oPay = oPayData[payType];
                if (!oPay) { return; }
                var sLabel = payType.replace(/([A-Z])/g, " $1")
                    .replace(/^./, function (s) { return s.toUpperCase(); });
                var aItems = [
                    new Label({ text: sLabel }),
                    new ObjectNumber({
                        number: oPay.annual.toLocaleString(),
                        unit: oPay.currency + " / year"
                    })
                ];
                if (oSchema.includeHourly && oPay.hourly) {
                    aItems.push(new ObjectNumber({
                        number: oPay.hourly.toFixed(2),
                        unit: oPay.currency + " / hour"
                    }));
                }
                oContainer.addItem(new VBox({
                    items: aItems
                }).addStyleClass("sapUiSmallMarginEnd"));
            });
        },

        /**
         * Render the narrative section. Supports two formats:
         *   1) Structured JSON: { title, intro, sections: [{ heading, intro, paragraphs, bullets }] }
         *   2) Plain text (legacy fallback)
         */
        _renderNarrative: function (sNarrative) {
            var oBox = this.byId("narrativeBox");
            if (!oBox) { return; }
            oBox.removeAllItems();

            var oNarrative = null;
            if (typeof sNarrative === "string") {
                var sTrimmed = sNarrative.trim();
                if (sTrimmed.charAt(0) === "{" || sTrimmed.charAt(0) === "[") {
                    try {
                        oNarrative = JSON.parse(sTrimmed);
                    } catch (e) {
                        oNarrative = null;
                    }
                }
            } else if (typeof sNarrative === "object" && sNarrative !== null) {
                oNarrative = sNarrative;
            }

            // Fallback: render plain text
            if (!oNarrative) {
                oBox.addItem(new Text({ text: sNarrative, wrapping: true }));
                return;
            }

            // Top-level title
            if (oNarrative.title) {
                oBox.addItem(new Title({
                    text: oNarrative.title,
                    level: "H3"
                }).addStyleClass("sapUiSmallMarginBottom"));
            }

            // Intro paragraph
            if (oNarrative.intro) {
                oBox.addItem(new Text({
                    text: oNarrative.intro,
                    wrapping: true
                }).addStyleClass("sapUiSmallMarginBottom"));
            }

            // Sections
            if (Array.isArray(oNarrative.sections)) {
                oNarrative.sections.forEach(function (oSection, iIndex) {
                    if (oSection.heading) {
                        var oHeading = new Title({
                            text: oSection.heading,
                            level: "H4"
                        }).addStyleClass("sapUiTinyMarginBottom");
                        // Only add top margin for sections after the first
                        if (iIndex > 0) {
                            oHeading.addStyleClass("sapUiSmallMarginTop");
                        }
                        oBox.addItem(oHeading);
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
                            oBox.addItem(new HBox({
                                items: [
                                    new Text({ text: "•" }).addStyleClass("sapUiTinyMarginEnd"),
                                    new Text({ text: sBullet, wrapping: true })
                                ]
                            }));
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