sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("com.trusaic.rti.home.controller.ApprovalQueue", {

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
            this.getView().setModel(oViewModel, "aq");
            this._allRequests = [];

            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("approvals").attachPatternMatched(this._onRouteMatched, this);
            oRouter.getRoute("approvalDetail").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            this._loadRequests();
        },

        _loadRequests: function () {
            var oViewModel = this.getView().getModel("aq");
            fetch("/api/approver/Requests?$expand=employee&$orderby=submittedAt asc")
                .then(function (response) { return response.json(); })
                .then(function (data) {
                    var aRequests = (data.value || []).map(function (req) {
                        var daysPending = 0;
                        if (req.submittedAt && (req.status === "Submitted" || req.status === "UnderReview")) {
                            var submitted = new Date(req.submittedAt);
                            var now = new Date();
                            daysPending = Math.floor((now - submitted) / (1000 * 60 * 60 * 24));
                        }
                        return Object.assign({}, req, {
                            employeeName: (req.employee && req.employee.name) || req.employee_employeeId || "—",
                            daysPending: daysPending
                        });
                    });
                    this._allRequests = aRequests;
                    this._applyFilters(null, null);
                }.bind(this))
                .catch(function (err) {
                    console.error("Failed to load approvals:", err);
                    MessageToast.show("Failed to load approvals");
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
            var oViewModel = this.getView().getModel("aq");
            if (sSearchQuery === null) {
                var oSearchField = this.getView().byId("approvalsTable")
                    .getHeaderToolbar().getContent()[2];
                sSearchQuery = (oSearchField.getValue() || "").toLowerCase();
            }
            if (sStatusKey === null) {
                sStatusKey = this.byId("statusFilter").getSelectedKey();
            }
            var aFiltered = this._allRequests.filter(function (req) {
                var bMatchSearch = !sSearchQuery ||
                    (req.requestType || "").toLowerCase().indexOf(sSearchQuery) > -1 ||
                    (req.comparisonGroup || "").toLowerCase().indexOf(sSearchQuery) > -1 ||
                    (req.employeeName || "").toLowerCase().indexOf(sSearchQuery) > -1 ||
                    (req.ID || "").toLowerCase().indexOf(sSearchQuery) > -1;
                var bMatchStatus = sStatusKey === "All" || req.status === sStatusKey;
                return bMatchSearch && bMatchStatus;
            });
            oViewModel.setProperty("/requests", aFiltered);
            oViewModel.setProperty("/requestCount", aFiltered.length);
        },

        onRequestPress: function (oEvent) {
            var oItem = oEvent.getSource();
            var oBindingContext = oItem.getBindingContext("aq");
            var sRequestId;
            if (oBindingContext) {
                sRequestId = oBindingContext.getProperty("ID");
            } else {
                sRequestId = oItem.getCells()[0].getText();
            }
            if (!sRequestId) { return; }
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("approvalDetail", { requestId: sRequestId });
        },

        onNavBack: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("home");
        }
    });
});