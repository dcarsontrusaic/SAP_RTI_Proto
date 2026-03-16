sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageBox, MessageToast) {
    "use strict";

    return Controller.extend("com.trusaic.rti.home.controller.RequestForm", {

        onInit: function () {
            var oFormModel = new JSONModel({
                language: "",
                submitEnabled: false,
                busy: false
            });
            this.getView().setModel(oFormModel, "formModel");

            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("requestForm").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            var oFormModel = this.getView().getModel("formModel");
            oFormModel.setProperty("/language", "");
            oFormModel.setProperty("/submitEnabled", false);
            oFormModel.setProperty("/busy", false);
        },

        onLanguageChange: function () {
            var oFormModel = this.getView().getModel("formModel");
            var sLang = oFormModel.getProperty("/language");
            oFormModel.setProperty("/submitEnabled", !!sLang);
        },

        onSubmit: function () {
            var oFormModel = this.getView().getModel("formModel");
            var sLanguage = oFormModel.getProperty("/language");

            if (!sLanguage) {
                MessageToast.show("Please select a language.");
                return;
            }

            oFormModel.setProperty("/busy", true);

            var oLanguageMap = {
                "EN": "English", "DE": "Deutsch", "FR": "Français",
                "ES": "Español", "IT": "Italiano", "PT": "Português",
                "NL": "Nederlands", "PL": "Polski", "SV": "Svenska",
                "DA": "Dansk", "FI": "Suomi", "NO": "Norsk"
            };
            var sLanguageName = oLanguageMap[sLanguage] || sLanguage;

            var oPayload = {
                requestType: "Individual Pay Gap",
                comparisonGroup: sLanguageName,
                justification: "RTI request submitted in " + sLanguageName
            };

            fetch("/api/employee/submitRequest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(oPayload)
            })
            .then(function (response) {
                oFormModel.setProperty("/busy", false);
                if (!response.ok) {
                    throw new Error("Submit failed with status " + response.status);
                }
                return response.json();
            })
            .then(function (data) {
                var sRequestId = (data && data.ID) ? data.ID : "N/A";
                MessageBox.success(
                    "Your RTI request has been submitted successfully and is pending approval.\n\nRequest ID: " + sRequestId,
                    {
                        title: "Request Submitted",
                        onClose: function () {
                            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                            oRouter.navTo("myRequests");
                        }.bind(this)
                    }
                );
            }.bind(this))
            .catch(function (err) {
                oFormModel.setProperty("/busy", false);
                console.error("Submit error:", err);
                MessageBox.error(
                    "Something went wrong while submitting your request. Please try again.",
                    { title: "Submission Failed" }
                );
            }.bind(this));
        },

        onNavBack: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("home");
        }
    });
});