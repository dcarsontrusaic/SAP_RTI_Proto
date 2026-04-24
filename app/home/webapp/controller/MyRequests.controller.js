sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast"
], function (Controller, JSONModel, Filter, FilterOperator, MessageToast) {
    "use strict";

    return Controller.extend("com.trusaic.rti.home.controller.MyRequests", {

        formatDate: function (sDate) {
            if (!sDate) { return ""; }
            var oDate = new Date(sDate);
            if (isNaN(oDate.getTime())) { return sDate; }
            return oDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
        },

        onInit: function () {
            var oViewModel = new JSONModel({
                requests: [],
                requestCount: 0
            });
            this.getView().setModel(oViewModel, "view");
            this._allRequests = [];
            this._loadRequests();
        },

        _loadRequests: function () {
            var oViewModel = this.getView().getModel("view");
            fetch("/api/employee/MyRequests?$orderby=submittedAt desc")
                .then(function (response) { return response.json(); })
                .then(function (data) {
                    var aRequests = data.value || [];
                    this._allRequests = aRequests;
                    oViewModel.setProperty("/requests", aRequests);
                    oViewModel.setProperty("/requestCount", aRequests.length);
                }.bind(this))
                .catch(function (err) {
                    console.error("Failed to load requests:", err);
                    MessageToast.show("Failed to load requests");
                });
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("newValue").toLowerCase();
            this._applyFilters(sQuery, null);
        },

        onStatusFilterChange: function (oEvent) {
            var sKey = oEvent.getParameter("selectedItem").getKey();
            this._applyFilters(null, sKey);
        },

        _applyFilters: function (sSearchQuery, sStatusKey) {
            var oViewModel = this.getView().getModel("view");
            if (sSearchQuery === null) {
                var oSearchField = this.getView().byId("requestsTable")
                    .getHeaderToolbar().getContent()[2];
                sSearchQuery = (oSearchField.getValue() || "").toLowerCase();
            }
            if (sStatusKey === null) {
                sStatusKey = this.byId("statusFilter").getSelectedKey();
            }
            var aFiltered = this._allRequests.filter(function (req) {
                var bMatchSearch = !sSearchQuery ||
                    (req.comparisonGroup || "").toLowerCase().indexOf(sSearchQuery) > -1 ||
                    (req.ID || "").toLowerCase().indexOf(sSearchQuery) > -1;
                var bMatchStatus = sStatusKey === "All" || req.status === sStatusKey;
                return bMatchSearch && bMatchStatus;
            });
            oViewModel.setProperty("/requests", aFiltered);
            oViewModel.setProperty("/requestCount", aFiltered.length);
        },

        onRequestPress: function (oEvent) {
            var oItem = oEvent.getSource();
            var oBindingContext = oItem.getBindingContext("view");
            var sRequestId;
            if (oBindingContext) {
                sRequestId = oBindingContext.getProperty("ID");
            } else {
                sRequestId = oItem.getCells()[0].getText();
            }
            if (!sRequestId) { return; }
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("requestDetail", { requestId: sRequestId });
        },

        onNewRequest: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("requestForm");
        },

        onNavBack: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("home");
        }
    });
});