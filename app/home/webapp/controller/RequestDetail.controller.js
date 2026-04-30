sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/Text",
    "sap/m/Title",
    "sap/m/Label",
    "sap/m/HBox",
    "sap/m/ObjectNumber",
    "sap/m/VBox",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, Text, Title, Label, HBox, ObjectNumber, VBox, MessageToast, MessageBox) {
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