sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/f/library"
], function (Controller, JSONModel, fLibrary) {
    "use strict";

    var LayoutType = fLibrary.LayoutType;

    return Controller.extend("com.trusaic.rti.home.controller.MyRequestsFCL", {

        onInit: function () {
            this._oFCLModel = new JSONModel({
                fclLayout: LayoutType.OneColumn
            });
            this.getView().setModel(this._oFCLModel);

            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("myRequests").attachPatternMatched(this._onMyRequestsMatched, this);
            oRouter.getRoute("requestDetail").attachPatternMatched(this._onDetailMatched, this);
        },

        _onMyRequestsMatched: function () {
            this._oFCLModel.setProperty("/fclLayout", LayoutType.OneColumn);
        },

        _onDetailMatched: function (oEvent) {
            this._oFCLModel.setProperty("/fclLayout", LayoutType.TwoColumnsBeginExpanded);

            var sRequestId = oEvent.getParameter("arguments").requestId;
            var oDetailView = this.byId("requestDetailView");
            if (oDetailView) {
                var oDetailController = oDetailView.getController();
                if (oDetailController && oDetailController.loadRequest) {
                    oDetailController.loadRequest(sRequestId);
                }
            }
        },

        getFCL: function () {
            return this.byId("fcl");
        }
    });
});