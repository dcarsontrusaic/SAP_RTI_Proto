sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("com.trusaic.rti.home.controller.AdminSettings", {

        onInit: function () {
            var oModel = new JSONModel({
                pm: {
                    newAssignmentType: "Employee",
                    newTarget: "",
                    newProject: "",
                    count: 3,
                    mappings: [
                        { type: "Department", target: "Engineering", project: "PP-PROJ-2025-001" },
                        { type: "Department", target: "Marketing", project: "PP-PROJ-2025-002" },
                        { type: "Employee", target: "EMP003 (Carol Davis)", project: "PP-PROJ-2025-003" }
                    ]
                },
                sm: {
                    newSourceType: "User",
                    newSourceValue: "",
                    newAppScope: "Employee",
                    count: 4,
                    mappings: [
                        { sourceType: "Group", sourceValue: "ALL_EMPLOYEES", appScope: "Employee" },
                        { sourceType: "Role", sourceValue: "HR_COMPENSATION_LEAD", appScope: "Approver" },
                        { sourceType: "RoleCollection", sourceValue: "RTI_Approvers", appScope: "Approver" },
                        { sourceType: "User", sourceValue: "fatima.alrashid@trusaic.com", appScope: "Admin" }
                    ]
                }
            });
            this.getView().setModel(oModel, "admin");
        },

        // ========== Project Mapping ==========

        onPmTypeChange: function () {
            // placeholder for dependent field logic if needed later
        },

        onPmAdd: function () {
            var oModel = this.getView().getModel("admin");
            var sType = oModel.getProperty("/pm/newAssignmentType");
            var sTarget = (oModel.getProperty("/pm/newTarget") || "").trim();
            var sProject = (oModel.getProperty("/pm/newProject") || "").trim();

            if (!sTarget || !sProject) {
                MessageToast.show("Please fill in all required fields.");
                return;
            }

            var aMappings = oModel.getProperty("/pm/mappings");
            aMappings.push({
                type: sType,
                target: sTarget,
                project: sProject
            });
            oModel.setProperty("/pm/mappings", aMappings);
            oModel.setProperty("/pm/count", aMappings.length);

            // Reset inputs
            oModel.setProperty("/pm/newTarget", "");
            oModel.setProperty("/pm/newProject", "");

            MessageToast.show("Project mapping added.");
        },

        onPmDelete: function (oEvent) {
            var oItem = oEvent.getSource().getParent();
            var sPath = oItem.getBindingContext("admin").getPath();
            var iIndex = parseInt(sPath.split("/").pop(), 10);

            var oModel = this.getView().getModel("admin");
            var aMappings = oModel.getProperty("/pm/mappings");

            MessageBox.confirm(
                "Remove mapping for \"" + aMappings[iIndex].target + "\" → \"" + aMappings[iIndex].project + "\"?",
                {
                    title: "Confirm Delete",
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            aMappings.splice(iIndex, 1);
                            oModel.setProperty("/pm/mappings", aMappings);
                            oModel.setProperty("/pm/count", aMappings.length);
                            MessageToast.show("Mapping removed.");
                        }
                    }
                }
            );
        },

        // ========== Scope Mapping ==========

        onSmAdd: function () {
            var oModel = this.getView().getModel("admin");
            var sSourceType = oModel.getProperty("/sm/newSourceType");
            var sSourceValue = (oModel.getProperty("/sm/newSourceValue") || "").trim();
            var sAppScope = oModel.getProperty("/sm/newAppScope");

            if (!sSourceValue) {
                MessageToast.show("Please provide a source value.");
                return;
            }

            var aMappings = oModel.getProperty("/sm/mappings");
            aMappings.push({
                sourceType: sSourceType,
                sourceValue: sSourceValue,
                appScope: sAppScope
            });
            oModel.setProperty("/sm/mappings", aMappings);
            oModel.setProperty("/sm/count", aMappings.length);

            // Reset input
            oModel.setProperty("/sm/newSourceValue", "");

            MessageToast.show("Scope mapping added.");
        },

        onSmDelete: function (oEvent) {
            var oItem = oEvent.getSource().getParent();
            var sPath = oItem.getBindingContext("admin").getPath();
            var iIndex = parseInt(sPath.split("/").pop(), 10);

            var oModel = this.getView().getModel("admin");
            var aMappings = oModel.getProperty("/sm/mappings");

            MessageBox.confirm(
                "Remove scope mapping for \"" + aMappings[iIndex].sourceValue + "\" → \"" + aMappings[iIndex].appScope + "\"?",
                {
                    title: "Confirm Delete",
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            aMappings.splice(iIndex, 1);
                            oModel.setProperty("/sm/mappings", aMappings);
                            oModel.setProperty("/sm/count", aMappings.length);
                            MessageToast.show("Scope mapping removed.");
                        }
                    }
                }
            );
        },

        // ========== Navigation ==========

        onNavBack: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("home");
        }
    });
});