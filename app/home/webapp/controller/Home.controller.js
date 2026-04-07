sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("com.trusaic.rti.home.controller.Home", {

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
                userRole: "",
                isApprover: false,
                isAdmin: false,
                myRequestCount: 0,
                recentRequests: [],
                pendingApprovalCount: 0,
                totalRequests: 0,
                pendingRequests: 0,
                completedRequests: 0
            });
            this.getView().setModel(oViewModel);
            this._loadUserRole();
            this._loadMyRequestCount();
        },

        _loadUserRole: function () {
            var oViewModel = this.getView().getModel();
            var sUrl = "/api/admin/Users?$filter=role eq 'Admin'&$top=1";
            fetch(sUrl)
                .then(function (response) {
                    if (response.ok) {
                        oViewModel.setProperty("/userRole", "Admin");
                        oViewModel.setProperty("/isApprover", true);
                        oViewModel.setProperty("/isAdmin", true);
                        this._loadApprovalCount();
                        this._loadAdminStats();
                    }
                }.bind(this))
                .catch(function () {
                    fetch("/api/approver/Requests?$top=1")
                        .then(function (response) {
                            if (response.ok) {
                                oViewModel.setProperty("/userRole", "Approver");
                                oViewModel.setProperty("/isApprover", true);
                                this._loadApprovalCount();
                            } else {
                                oViewModel.setProperty("/userRole", "Employee");
                            }
                        }.bind(this))
                        .catch(function () {
                            oViewModel.setProperty("/userRole", "Employee");
                        });
                }.bind(this));
        },

        _loadMyRequestCount: function () {
            var oViewModel = this.getView().getModel();

            // Fetch top 3 recent requests (for the preview table) and derive count
            fetch("/api/employee/MyRequests?$orderby=submittedAt desc&$top=3")
                .then(function (response) { return response.json(); })
                .then(function (data) {
                    var aRequests = data.value || [];
                    oViewModel.setProperty("/recentRequests", aRequests);
                }.bind(this))
                .catch(function () {
                    oViewModel.setProperty("/recentRequests", []);
                });

            // Separate count call for the accurate total
            fetch("/api/employee/MyRequests/$count")
                .then(function (response) { return response.text(); })
                .then(function (count) {
                    oViewModel.setProperty("/myRequestCount", parseInt(count, 10) || 0);
                })
                .catch(function () {
                    oViewModel.setProperty("/myRequestCount", 0);
                });
        },

        _loadApprovalCount: function () {
            var oViewModel = this.getView().getModel();
            fetch("/api/approver/Requests/$count?$filter=status eq 'UnderReview'")
                .then(function (response) { return response.text(); })
                .then(function (count) {
                    oViewModel.setProperty("/pendingApprovalCount", parseInt(count, 10) || 0);
                })
                .catch(function () {
                    oViewModel.setProperty("/pendingApprovalCount", 0);
                });
        },

        _loadAdminStats: function () {
            var oViewModel = this.getView().getModel();
            fetch("/api/admin/AllRequests/$count")
                .then(function (response) { return response.text(); })
                .then(function (count) {
                    oViewModel.setProperty("/totalRequests", parseInt(count, 10) || 0);
                });
            fetch("/api/admin/AllRequests/$count?$filter=status eq 'Submitted' or status eq 'UnderReview'")
                .then(function (response) { return response.text(); })
                .then(function (count) {
                    oViewModel.setProperty("/pendingRequests", parseInt(count, 10) || 0);
                });
            fetch("/api/admin/AllRequests/$count?$filter=status eq 'Completed'")
                .then(function (response) { return response.text(); })
                .then(function (count) {
                    oViewModel.setProperty("/completedRequests", parseInt(count, 10) || 0);
                });
        },

        onNewRequest: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("requestForm");
        },

        onViewMyRequests: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("myRequests");
        },

        onRecentRequestPress: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext();
            var sRequestId = oCtx ? oCtx.getProperty("ID") : null;
            if (!sRequestId) { return; }
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("requestDetail", { requestId: sRequestId });
        },

        onOpenApprovals: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("approvals");
        },

        onOpenDashboard: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("adminSettings");
        }
    });
});