sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    // ── Mock suggestion catalogs ──────────────────────────────────────
    // In production these would come from SF OData / BTP Auth API / IAS SCIM.

    var SUGGESTIONS = {
        projects: [
            { key: "PP-PROJ-2025-001", text: "PP-PROJ-2025-001 — US Engineering" },
            { key: "PP-PROJ-2025-002", text: "PP-PROJ-2025-002 — US Marketing & Sales" },
            { key: "PP-PROJ-2025-003", text: "PP-PROJ-2025-003 — US Finance" },
            { key: "PP-PROJ-2025-004", text: "PP-PROJ-2025-004 — EMEA All Departments" },
            { key: "PP-PROJ-2025-005", text: "PP-PROJ-2025-005 — APAC All Departments" }
        ],
        SFDynamic: [
            { key: "US_Engineering",          text: "US_Engineering — Dept=Engineering, Country=US" },
            { key: "US_Marketing",            text: "US_Marketing — Dept=Marketing, Country=US" },
            { key: "US_Finance",              text: "US_Finance — Dept=Finance, Country=US" },
            { key: "US_Sales",                text: "US_Sales — Dept=Sales, Country=US" },
            { key: "EMEA_All_Employees",      text: "EMEA_All_Employees — Region=EMEA" },
            { key: "APAC_All_Employees",      text: "APAC_All_Employees — Region=APAC" },
            { key: "All_Managers",            text: "All_Managers — isManager=true" },
            { key: "All_Directors_Above",     text: "All_Directors_Above — jobLevel≥Director" }
        ],
        SFStatic: [
            { key: "RTI_Pilot_Group",         text: "RTI_Pilot_Group — 12 named users" },
            { key: "Executive_Leadership",    text: "Executive_Leadership — 8 named users" },
            { key: "Comp_Review_Panel",       text: "Comp_Review_Panel — 5 named users" }
        ],
        IASGroup: [
            { key: "RTI_REQUESTORS",          text: "RTI_REQUESTORS" },
            { key: "RTI_APPROVERS",           text: "RTI_APPROVERS" },
            { key: "HR_COMPENSATION",         text: "HR_COMPENSATION" },
            { key: "HR_ADMINS",               text: "HR_ADMINS" },
            { key: "ALL_EMPLOYEES",           text: "ALL_EMPLOYEES" }
        ],
        RoleCollection: [
            { key: "RTI_Employee",            text: "RTI_Employee" },
            { key: "RTI_Approver",            text: "RTI_Approver" },
            { key: "RTI_Admin",               text: "RTI_Admin" },
            { key: "SAP_BR_PURCHASER",        text: "SAP_BR_PURCHASER" },
            { key: "SAP_BR_HR_MANAGER",       text: "SAP_BR_HR_MANAGER" }
        ],
        Individual: [
            { key: "EMP001", text: "EMP001 — Alice Chen" },
            { key: "EMP002", text: "EMP002 — Bob Martinez" },
            { key: "EMP003", text: "EMP003 — Carol Davis" },
            { key: "APR001", text: "APR001 — Diana Patel" },
            { key: "APR002", text: "APR002 — Erik Johansson" },
            { key: "ADM001", text: "ADM001 — Fatima Al-Rashid" }
        ]
    };

    // ── Helpers ───────────────────────────────────────────────────────

    function typeLabel(sType) {
        var map = {
            SFDynamic: "SF Dynamic Group",
            SFStatic: "SF Static Group",
            IASGroup: "IAS User Group",
            RoleCollection: "BTP Role Collection",
            Individual: "Individual User"
        };
        return map[sType] || sType;
    }

    function toDisplay(arr) {
        if (!arr || arr.length === 0) { return "—"; }
        return arr.map(function (item) {
            return "[" + typeLabel(item.type) + "] " + item.value;
        }).join(", ");
    }

    function withDisplay(arr) {
        return (arr || []).map(function (item) {
            return {
                type: item.type,
                value: item.value,
                display: "[" + typeLabel(item.type) + "] " + item.value
            };
        });
    }

    /**
     * Look up a friendly display name for a user ID from the Individual catalog.
     * Falls back to the key itself if not found.
     */
    function lookupUserName(sKey) {
        var match = SUGGESTIONS.Individual.find(function (i) { return i.key === sKey; });
        if (!match) { return ""; }
        // text format is "EMP001 — Alice Chen", extract the name half
        var idx = match.text.indexOf(" — ");
        return idx > -1 ? match.text.substring(idx + 3).trim() : match.text;
    }

    // ══════════════════════════════════════════════════════════════════

    return Controller.extend("com.trusaic.rti.home.controller.AdminSettings", {

        onInit: function () {

            // ── Seed project mappings with realistic mock data ────────
            var aProjectMappings = [
                {
                    project: "PP-PROJ-2025-001",
                    requestors: [
                        { type: "SFDynamic", value: "US_Engineering" }
                    ],
                    approvers: [
                        { type: "IASGroup", value: "HR_COMPENSATION" },
                        { type: "Individual", value: "APR001" }
                    ],
                    requestorsDisplay: "",
                    approversDisplay: ""
                },
                {
                    project: "PP-PROJ-2025-002",
                    requestors: [
                        { type: "SFDynamic", value: "US_Marketing" },
                        { type: "SFDynamic", value: "US_Sales" }
                    ],
                    approvers: [
                        { type: "RoleCollection", value: "RTI_Approver" }
                    ],
                    requestorsDisplay: "",
                    approversDisplay: ""
                },
                {
                    project: "PP-PROJ-2025-003",
                    requestors: [
                        { type: "SFDynamic", value: "US_Finance" },
                        { type: "Individual", value: "EMP003" }
                    ],
                    approvers: [
                        { type: "SFDynamic", value: "All_Managers" },
                        { type: "Individual", value: "APR002" }
                    ],
                    requestorsDisplay: "",
                    approversDisplay: ""
                }
            ];

            aProjectMappings.forEach(function (m) {
                m.requestorsDisplay = toDisplay(m.requestors);
                m.approversDisplay  = toDisplay(m.approvers);
            });

            // ── Seed administrators ───────────────────────────────────
            var aAdmins = [
                { userId: "ADM001", name: "Fatima Al-Rashid" }
            ];

            var oModel = new JSONModel({
                suggestions: {
                    projects: SUGGESTIONS.projects,
                    individuals: SUGGESTIONS.Individual
                },
                pm: {
                    newProject: "",
                    newRequestorType: "SFDynamic",
                    newRequestorValue: "",
                    newApproverType: "SFDynamic",
                    newApproverValue: "",
                    pendingRequestors: [],
                    pendingApprovers: [],
                    filteredRequestorSuggestions: SUGGESTIONS.SFDynamic,
                    filteredApproverSuggestions: SUGGESTIONS.SFDynamic,
                    count: aProjectMappings.length,
                    mappings: aProjectMappings
                },
                pmEdit: {
                    editingIndex: -1,
                    project: "",
                    requestors: [],
                    approvers: [],
                    newRequestorType: "SFDynamic",
                    newRequestorValue: "",
                    newApproverType: "SFDynamic",
                    newApproverValue: "",
                    filteredRequestorSuggestions: SUGGESTIONS.SFDynamic,
                    filteredApproverSuggestions: SUGGESTIONS.SFDynamic
                },
                admins: {
                    newUser: "",
                    count: aAdmins.length,
                    list: aAdmins
                }
            });
            this.getView().setModel(oModel, "admin");
        },

        // ═══ Suggestion filtering on type change ═════════════════════

        onRequestorTypeChange: function () {
            var oModel = this.getView().getModel("admin");
            var sType  = oModel.getProperty("/pm/newRequestorType");
            oModel.setProperty("/pm/filteredRequestorSuggestions", SUGGESTIONS[sType] || []);
            oModel.setProperty("/pm/newRequestorValue", "");
        },

        onApproverTypeChange: function () {
            var oModel = this.getView().getModel("admin");
            var sType  = oModel.getProperty("/pm/newApproverType");
            oModel.setProperty("/pm/filteredApproverSuggestions", SUGGESTIONS[sType] || []);
            oModel.setProperty("/pm/newApproverValue", "");
        },

        // ═══ Requestor / Approver staging ════════════════════════════

        onPmAddRequestor: function () {
            var oModel = this.getView().getModel("admin");
            var sType  = oModel.getProperty("/pm/newRequestorType");
            var sVal   = (oModel.getProperty("/pm/newRequestorValue") || "").trim();
            if (!sVal) {
                MessageToast.show("Select or type a requestor group.");
                return;
            }
            var sKey = this._extractKey(sVal);
            var arr  = oModel.getProperty("/pm/pendingRequestors").slice();
            var bDup = arr.some(function (r) { return r.type === sType && r.value === sKey; });
            if (bDup) {
                MessageToast.show("\"" + sKey + "\" is already added.");
                return;
            }
            arr.push({
                type: sType,
                value: sKey,
                display: "[" + typeLabel(sType) + "] " + sKey
            });
            oModel.setProperty("/pm/pendingRequestors", arr);
            oModel.setProperty("/pm/newRequestorValue", "");
        },

        onPmRemovePendingRequestor: function (oEvent) {
            var oToken   = oEvent.getSource();
            var oContext = oToken.getBindingContext("admin");
            if (!oContext) { return; }
            var sPath    = oContext.getPath();
            var iIndex   = parseInt(sPath.split("/").pop(), 10);
            var oModel   = this.getView().getModel("admin");
            var arr      = oModel.getProperty("/pm/pendingRequestors").slice();
            arr.splice(iIndex, 1);
            oModel.setProperty("/pm/pendingRequestors", arr);
        },

        onPmAddApprover: function () {
            var oModel = this.getView().getModel("admin");
            var sType  = oModel.getProperty("/pm/newApproverType");
            var sVal   = (oModel.getProperty("/pm/newApproverValue") || "").trim();
            if (!sVal) {
                MessageToast.show("Select or type an approver group.");
                return;
            }
            var sKey = this._extractKey(sVal);
            var arr  = oModel.getProperty("/pm/pendingApprovers").slice();
            var bDup = arr.some(function (a) { return a.type === sType && a.value === sKey; });
            if (bDup) {
                MessageToast.show("\"" + sKey + "\" is already added.");
                return;
            }
            arr.push({
                type: sType,
                value: sKey,
                display: "[" + typeLabel(sType) + "] " + sKey
            });
            oModel.setProperty("/pm/pendingApprovers", arr);
            oModel.setProperty("/pm/newApproverValue", "");
        },

        onPmRemovePendingApprover: function (oEvent) {
            var oToken   = oEvent.getSource();
            var oContext = oToken.getBindingContext("admin");
            if (!oContext) { return; }
            var sPath    = oContext.getPath();
            var iIndex   = parseInt(sPath.split("/").pop(), 10);
            var oModel   = this.getView().getModel("admin");
            var arr      = oModel.getProperty("/pm/pendingApprovers").slice();
            arr.splice(iIndex, 1);
            oModel.setProperty("/pm/pendingApprovers", arr);
        },

        _extractKey: function (sVal) {
            var idx = sVal.indexOf(" — ");
            return idx > -1 ? sVal.substring(0, idx).trim() : sVal.trim();
        },

        // ═══ Save / Delete project mapping ═══════════════════════════

        onPmAdd: function () {
            var oModel      = this.getView().getModel("admin");
            var sProjectRaw = (oModel.getProperty("/pm/newProject") || "").trim();
            var sProject    = this._extractKey(sProjectRaw);
            var aReq        = oModel.getProperty("/pm/pendingRequestors") || [];
            var aApp        = oModel.getProperty("/pm/pendingApprovers")  || [];

            if (!sProject) {
                MessageToast.show("Please select or enter a Trusaic Project ID.");
                return;
            }
            if (aReq.length === 0 && aApp.length === 0) {
                MessageToast.show("Add at least one requestor or approver group.");
                return;
            }

            var aMappings = oModel.getProperty("/pm/mappings");

            var iExisting = -1;
            aMappings.forEach(function (m, i) {
                if (m.project === sProject) { iExisting = i; }
            });

            if (iExisting > -1) {
                var oEx = aMappings[iExisting];
                aReq.forEach(function (r) {
                    var bExists = oEx.requestors.some(function (e) { return e.type === r.type && e.value === r.value; });
                    if (!bExists) { oEx.requestors.push({ type: r.type, value: r.value }); }
                });
                aApp.forEach(function (a) {
                    var bExists = oEx.approvers.some(function (e) { return e.type === a.type && e.value === a.value; });
                    if (!bExists) { oEx.approvers.push({ type: a.type, value: a.value }); }
                });
                oEx.requestorsDisplay = toDisplay(oEx.requestors);
                oEx.approversDisplay  = toDisplay(oEx.approvers);
                MessageToast.show("Groups merged into existing project \"" + sProject + "\".");
            } else {
                var aReqClean = aReq.map(function (r) { return { type: r.type, value: r.value }; });
                var aAppClean = aApp.map(function (a) { return { type: a.type, value: a.value }; });
                aMappings.push({
                    project: sProject,
                    requestors: aReqClean,
                    approvers: aAppClean,
                    requestorsDisplay: toDisplay(aReqClean),
                    approversDisplay:  toDisplay(aAppClean)
                });
                MessageToast.show("Project mapping added.");
            }

            oModel.setProperty("/pm/mappings", aMappings);
            oModel.setProperty("/pm/count", aMappings.length);

            oModel.setProperty("/pm/newProject", "");
            oModel.setProperty("/pm/pendingRequestors", []);
            oModel.setProperty("/pm/pendingApprovers", []);
        },

        onPmDelete: function (oEvent) {
            var oRow      = oEvent.getSource().getParent().getParent();
            var sPath     = oRow.getBindingContext("admin").getPath();
            var iIndex    = parseInt(sPath.split("/").pop(), 10);
            var oModel    = this.getView().getModel("admin");
            var aMappings = oModel.getProperty("/pm/mappings");

            MessageBox.confirm(
                "Remove all mappings for project \"" + aMappings[iIndex].project + "\"?",
                {
                    title: "Confirm Delete",
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            aMappings.splice(iIndex, 1);
                            oModel.setProperty("/pm/mappings", aMappings);
                            oModel.setProperty("/pm/count", aMappings.length);
                            MessageToast.show("Project mapping removed.");
                        }
                    }
                }
            );
        },

        // ═══ Edit project mapping ════════════════════════════════════

        onPmEdit: function (oEvent) {
            var oRow      = oEvent.getSource().getParent().getParent();
            var sPath     = oRow.getBindingContext("admin").getPath();
            var iIndex    = parseInt(sPath.split("/").pop(), 10);
            var oModel    = this.getView().getModel("admin");
            var aMappings = oModel.getProperty("/pm/mappings");
            var oMapping  = aMappings[iIndex];

            oModel.setProperty("/pmEdit", {
                editingIndex: iIndex,
                project: oMapping.project,
                requestors: withDisplay(oMapping.requestors),
                approvers:  withDisplay(oMapping.approvers),
                newRequestorType: "SFDynamic",
                newRequestorValue: "",
                newApproverType: "SFDynamic",
                newApproverValue: "",
                filteredRequestorSuggestions: SUGGESTIONS.SFDynamic,
                filteredApproverSuggestions: SUGGESTIONS.SFDynamic
            });

            this.byId("pmEditDialog").open();
        },

        onPmEditRequestorTypeChange: function () {
            var oModel = this.getView().getModel("admin");
            var sType  = oModel.getProperty("/pmEdit/newRequestorType");
            oModel.setProperty("/pmEdit/filteredRequestorSuggestions", SUGGESTIONS[sType] || []);
            oModel.setProperty("/pmEdit/newRequestorValue", "");
        },

        onPmEditApproverTypeChange: function () {
            var oModel = this.getView().getModel("admin");
            var sType  = oModel.getProperty("/pmEdit/newApproverType");
            oModel.setProperty("/pmEdit/filteredApproverSuggestions", SUGGESTIONS[sType] || []);
            oModel.setProperty("/pmEdit/newApproverValue", "");
        },

        onPmEditAddRequestor: function () {
            var oModel = this.getView().getModel("admin");
            var sType  = oModel.getProperty("/pmEdit/newRequestorType");
            var sVal   = (oModel.getProperty("/pmEdit/newRequestorValue") || "").trim();
            if (!sVal) {
                MessageToast.show("Select or type a requestor group.");
                return;
            }
            var sKey = this._extractKey(sVal);
            var arr  = oModel.getProperty("/pmEdit/requestors").slice();
            var bDup = arr.some(function (r) { return r.type === sType && r.value === sKey; });
            if (bDup) {
                MessageToast.show("\"" + sKey + "\" is already added.");
                return;
            }
            arr.push({
                type: sType,
                value: sKey,
                display: "[" + typeLabel(sType) + "] " + sKey
            });
            oModel.setProperty("/pmEdit/requestors", arr);
            oModel.setProperty("/pmEdit/newRequestorValue", "");
        },

        onPmEditAddApprover: function () {
            var oModel = this.getView().getModel("admin");
            var sType  = oModel.getProperty("/pmEdit/newApproverType");
            var sVal   = (oModel.getProperty("/pmEdit/newApproverValue") || "").trim();
            if (!sVal) {
                MessageToast.show("Select or type an approver group.");
                return;
            }
            var sKey = this._extractKey(sVal);
            var arr  = oModel.getProperty("/pmEdit/approvers").slice();
            var bDup = arr.some(function (a) { return a.type === sType && a.value === sKey; });
            if (bDup) {
                MessageToast.show("\"" + sKey + "\" is already added.");
                return;
            }
            arr.push({
                type: sType,
                value: sKey,
                display: "[" + typeLabel(sType) + "] " + sKey
            });
            oModel.setProperty("/pmEdit/approvers", arr);
            oModel.setProperty("/pmEdit/newApproverValue", "");
        },

        onPmEditRemoveRequestor: function (oEvent) {
            var oToken    = oEvent.getSource();
            var oContext  = oToken.getBindingContext("admin");
            if (!oContext) { return; }
            var sPath     = oContext.getPath();
            var iIndex    = parseInt(sPath.split("/").pop(), 10);
            var oModel    = this.getView().getModel("admin");
            var arr       = oModel.getProperty("/pmEdit/requestors").slice();
            arr.splice(iIndex, 1);
            oModel.setProperty("/pmEdit/requestors", arr);
        },

        onPmEditRemoveApprover: function (oEvent) {
            var oToken    = oEvent.getSource();
            var oContext  = oToken.getBindingContext("admin");
            if (!oContext) { return; }
            var sPath     = oContext.getPath();
            var iIndex    = parseInt(sPath.split("/").pop(), 10);
            var oModel    = this.getView().getModel("admin");
            var arr       = oModel.getProperty("/pmEdit/approvers").slice();
            arr.splice(iIndex, 1);
            oModel.setProperty("/pmEdit/approvers", arr);
        },

        onPmEditSave: function () {
            var oModel    = this.getView().getModel("admin");
            var iIndex    = oModel.getProperty("/pmEdit/editingIndex");
            if (iIndex < 0) { return; }

            var aReq = oModel.getProperty("/pmEdit/requestors") || [];
            var aApp = oModel.getProperty("/pmEdit/approvers")  || [];

            if (aReq.length === 0 && aApp.length === 0) {
                MessageBox.confirm(
                    "This mapping has no requestors or approvers. Save anyway?",
                    {
                        title: "Empty Mapping",
                        onClose: function (oAction) {
                            if (oAction === MessageBox.Action.OK) {
                                this._commitPmEdit();
                            }
                        }.bind(this)
                    }
                );
                return;
            }

            this._commitPmEdit();
        },

        _commitPmEdit: function () {
            var oModel    = this.getView().getModel("admin");
            var iIndex    = oModel.getProperty("/pmEdit/editingIndex");
            var aMappings = oModel.getProperty("/pm/mappings");
            var oTarget   = aMappings[iIndex];
            if (!oTarget) { return; }

            var aReqClean = oModel.getProperty("/pmEdit/requestors").map(function (r) {
                return { type: r.type, value: r.value };
            });
            var aAppClean = oModel.getProperty("/pmEdit/approvers").map(function (a) {
                return { type: a.type, value: a.value };
            });

            oTarget.requestors        = aReqClean;
            oTarget.approvers         = aAppClean;
            oTarget.requestorsDisplay = toDisplay(aReqClean);
            oTarget.approversDisplay  = toDisplay(aAppClean);

            oModel.setProperty("/pm/mappings", aMappings);
            this.byId("pmEditDialog").close();
            MessageToast.show("Mapping updated.");
        },

        onPmEditCancel: function () {
            this.byId("pmEditDialog").close();
        },

        // ═══ Admin Access ════════════════════════════════════════════

        onAdminAdd: function () {
            var oModel = this.getView().getModel("admin");
            var sRaw   = (oModel.getProperty("/admins/newUser") || "").trim();
            if (!sRaw) {
                MessageToast.show("Select or type a user.");
                return;
            }

            var sUserId = this._extractKey(sRaw);
            var aAdmins = oModel.getProperty("/admins/list").slice();

            var bDup = aAdmins.some(function (a) { return a.userId === sUserId; });
            if (bDup) {
                MessageToast.show("\"" + sUserId + "\" is already an administrator.");
                return;
            }

            aAdmins.push({
                userId: sUserId,
                name: lookupUserName(sUserId) || "—"
            });
            oModel.setProperty("/admins/list", aAdmins);
            oModel.setProperty("/admins/count", aAdmins.length);
            oModel.setProperty("/admins/newUser", "");
            MessageToast.show("Administrator added.");
        },

        onAdminRemove: function (oEvent) {
            var oItem   = oEvent.getSource().getParent();
            var sPath   = oItem.getBindingContext("admin").getPath();
            var iIndex  = parseInt(sPath.split("/").pop(), 10);
            var oModel  = this.getView().getModel("admin");
            var aAdmins = oModel.getProperty("/admins/list");
            var oTarget = aAdmins[iIndex];

            // Don't allow removing the last admin — that would lock everyone out
            if (aAdmins.length === 1) {
                MessageBox.warning(
                    "You cannot remove the last administrator. Add another admin before removing this one.",
                    { title: "Cannot Remove" }
                );
                return;
            }

            MessageBox.confirm(
                "Remove \"" + (oTarget.name || oTarget.userId) + "\" as an administrator? They will lose access to Admin Settings.",
                {
                    title: "Confirm Remove Admin",
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            aAdmins.splice(iIndex, 1);
                            oModel.setProperty("/admins/list", aAdmins);
                            oModel.setProperty("/admins/count", aAdmins.length);
                            MessageToast.show("Administrator removed.");
                        }
                    }
                }
            );
        },

        // ═══ Navigation ══════════════════════════════════════════════

        onNavBack: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("home");
        }
    });
});