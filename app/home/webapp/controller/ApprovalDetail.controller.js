sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageBox, MessageToast) {
    "use strict";

    return Controller.extend("com.trusaic.rti.home.controller.ApprovalDetail", {

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
                showDenialReason: false,
                denialReason: ""
            });
            this.getView().setModel(oViewModel, "ad");
        },

        loadRequest: function (sRequestId) {
            if (!sRequestId || sRequestId === this._currentRequestId) {
                return;
            }
            this._currentRequestId = sRequestId;
            this._loadRequestDetail(sRequestId);
        },

        _loadRequestDetail: function (sRequestId) {
            var oViewModel = this.getView().getModel("ad");

            oViewModel.setProperty("/request", {});
            oViewModel.setProperty("/statusHistory", []);
            oViewModel.setProperty("/showDenialReason", false);
            oViewModel.setProperty("/denialReason", "");

            var sUrl = "/api/approver/Requests(" + sRequestId +
                       ")?$expand=statusHistory($orderby=changedAt asc),employee";

            fetch(sUrl)
                .then(function (response) { return response.json(); })
                .then(function (data) {
                    data.employeeName = (data.employee && data.employee.name) || data.employee_employeeId || "—";
                    oViewModel.setProperty("/request", data);
                    oViewModel.setProperty("/statusHistory", data.statusHistory || []);
                }.bind(this))
                .catch(function (err) {
                    console.error("Failed to load request:", err);
                    MessageToast.show("Failed to load request details");
                });
        },

        onApprove: function () {
            var oViewModel = this.getView().getModel("ad");
            var sRequestId = oViewModel.getProperty("/request/ID");

            MessageBox.confirm(
                "Are you sure you want to approve this request?",
                {
                    title: "Confirm Approval",
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            this._doApprove(sRequestId);
                        }
                    }.bind(this)
                }
            );
        },

        _doApprove: function (sRequestId) {
            fetch("/api/approver/approveRequest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestId: sRequestId })
            })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Approve failed with status " + response.status);
                }
                return response.json();
            })
            .then(function () {
                MessageBox.success("Request has been approved.", {
                    title: "Approved",
                    onClose: function () {
                        this._currentRequestId = null;
                        var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                        oRouter.navTo("approvals");
                    }.bind(this)
                });
            }.bind(this))
            .catch(function (err) {
                console.error("Approve error:", err);
                MessageBox.error("Failed to approve request: " + err.message);
            });
        },

        onDenyToggle: function () {
            var oViewModel = this.getView().getModel("ad");
            var bShow = !oViewModel.getProperty("/showDenialReason");
            oViewModel.setProperty("/showDenialReason", bShow);
        },

        onDenyConfirm: function () {
            var oViewModel = this.getView().getModel("ad");
            var sRequestId = oViewModel.getProperty("/request/ID");
            var sDenialReason = (oViewModel.getProperty("/denialReason") || "").trim();

            if (!sDenialReason) {
                MessageToast.show("Please provide a reason for denial.");
                return;
            }

            MessageBox.confirm(
                "Are you sure you want to deny this request?",
                {
                    title: "Confirm Denial",
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            this._doDeny(sRequestId, sDenialReason);
                        }
                    }.bind(this)
                }
            );
        },

        _doDeny: function (sRequestId, sDenialReason) {
            fetch("/api/approver/denyRequest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestId: sRequestId, denialReason: sDenialReason })
            })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Deny failed with status " + response.status);
                }
                return response.json();
            })
            .then(function () {
                MessageBox.success("Request has been denied.", {
                    title: "Denied",
                    onClose: function () {
                        this._currentRequestId = null;
                        var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                        oRouter.navTo("approvals");
                    }.bind(this)
                });
            }.bind(this))
            .catch(function (err) {
                console.error("Deny error:", err);
                MessageBox.error("Failed to deny request: " + err.message);
            });
        },

        onCloseDetail: function () {
            this._currentRequestId = null;
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("approvals");
        }
    });
});