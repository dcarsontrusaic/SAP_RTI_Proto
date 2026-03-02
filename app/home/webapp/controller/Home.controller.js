sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("com.trusaic.rti.home.controller.Home", {

        onInit: function () {
            // Local JSON model for UI state (counts, role flags)
            var oViewModel = new JSONModel({
                userRole: "",
                isApprover: false,
                isAdmin: false,
                myRequestCount: 0,
                pendingApprovalCount: 0,
                totalRequests: 0,
                pendingRequests: 0,
                completedRequests: 0
            });
            this.getView().setModel(oViewModel);

            // Load data
            this._loadUserRole();
            this._loadMyRequestCount();
        },

        /**
         * Determine user role and set visibility flags.
         * In dev mode with dummy auth, we simulate role detection.
         * In production, this would come from XSUAA JWT claims.
         */
        _loadUserRole: function () {
            var oModel = this.getView().getModel();
            var oViewModel = this.getView().getModel();

            // For dev/testing: try to detect role from Users table
            // In production, replace with JWT role extraction
            var sUrl = "/api/admin/Users?$filter=role eq 'Admin'&$top=1";

            fetch(sUrl)
                .then(function (response) {
                    if (response.ok) {
                        // User has admin access
                        oViewModel.setProperty("/userRole", "Admin");
                        oViewModel.setProperty("/isApprover", true);
                        oViewModel.setProperty("/isAdmin", true);
                        this._loadApprovalCount();
                        this._loadAdminStats();
                    }
                }.bind(this))
                .catch(function () {
                    // Try approver
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

        /**
         * Load count of current user's requests
         */
        _loadMyRequestCount: function () {
            var oViewModel = this.getView().getModel();

            fetch("/api/employee/MyRequests/$count")
                .then(function (response) { return response.text(); })
                .then(function (count) {
                    oViewModel.setProperty("/myRequestCount", parseInt(count, 10) || 0);
                })
                .catch(function () {
                    oViewModel.setProperty("/myRequestCount", 0);
                });
        },

        /**
         * Load count of pending approvals (status = UnderReview)
         */
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

        /**
         * Load admin summary statistics
         */
        _loadAdminStats: function () {
            var oViewModel = this.getView().getModel();

            // Total requests
            fetch("/api/admin/AllRequests/$count")
                .then(function (response) { return response.text(); })
                .then(function (count) {
                    oViewModel.setProperty("/totalRequests", parseInt(count, 10) || 0);
                });

            // Pending requests
            fetch("/api/admin/AllRequests/$count?$filter=status eq 'Submitted' or status eq 'UnderReview'")
                .then(function (response) { return response.text(); })
                .then(function (count) {
                    oViewModel.setProperty("/pendingRequests", parseInt(count, 10) || 0);
                });

            // Completed requests
            fetch("/api/admin/AllRequests/$count?$filter=status eq 'Completed'")
                .then(function (response) { return response.text(); })
                .then(function (count) {
                    oViewModel.setProperty("/completedRequests", parseInt(count, 10) || 0);
                });
        },

        // --- Navigation Handlers ---

        onNewRequest: function () {
            // TODO: Navigate to Screen 2 (Request Form)
            MessageToast.show("Navigate to Request Form — not yet implemented");
        },

        onViewMyRequests: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("myRequests");
        },

        onOpenApprovals: function () {
            // TODO: Navigate to Screen 5 (Approval Queue)
            MessageToast.show("Navigate to Approval Queue — not yet implemented");
        },

        onOpenDashboard: function () {
            // TODO: Navigate to Screen 7 (Admin Dashboard)
            MessageToast.show("Navigate to Admin Dashboard — not yet implemented");
        }
    });
});