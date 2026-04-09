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
        // Keyed by group type
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

            var oModel = new JSONModel({
                suggestions: {
                    projects: SUGGESTIONS.projects
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
                sm: {
                    newSourceType: "User",
                    newSourceValue: "",
                    newAppScope: "Employee",
                    count: 4,
                    mappings: [
                        { sourceType: "Group",          sourceValue: "ALL_EMPLOYEES",                appScope: "Employee" },
                        { sourceType: "Role",           sourceValue: "HR_COMPENSATION_LEAD",         appScope: "Approver" },
                        { sourceType: "RoleCollection", sourceValue: "RTI_Approvers",                appScope: "Approver" },
                        { sourceType: "User",           sourceValue: "fatima.alrashid@trusaic.com",  appScope: "Admin" }
                    ]
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
            // Extract key portion if user picked a suggestion with description
            var sKey = this._extractKey(sVal);
            var arr  = oModel.getProperty("/pm/pendingRequestors");
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

        onPmClearRequestors: function () {
            this.getView().getModel("admin").setProperty("/pm/pendingRequestors", []);
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
            var arr  = oModel.getProperty("/pm/pendingApprovers");
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

        onPmClearApprovers: function () {
            this.getView().getModel("admin").setProperty("/pm/pendingApprovers", []);
        },

        /**
         * If the ComboBox value is "US_Engineering — Dept=Engineering, Country=US",
         * extract just "US_Engineering" (the part before " — ").
         * If there's no " — ", return the value as-is (custom typed entry).
         */
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

            // Check for existing project — merge if found
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

            // Reset form
            oModel.setProperty("/pm/newProject", "");
            oModel.setProperty("/pm/pendingRequestors", []);
            oModel.setProperty("/pm/pendingApprovers", []);
        },

        onPmDelete: function (oEvent) {
            var oItem    = oEvent.getSource().getParent();
            var sPath    = oItem.getBindingContext("admin").getPath();
            var iIndex   = parseInt(sPath.split("/").pop(), 10);
            var oModel   = this.getView().getModel("admin");
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

        // ═══ Scope Mapping (unchanged) ═══════════════════════════════

        onSmAdd: function () {
            var oModel       = this.getView().getModel("admin");
            var sSourceType  = oModel.getProperty("/sm/newSourceType");
            var sSourceValue = (oModel.getProperty("/sm/newSourceValue") || "").trim();
            var sAppScope    = oModel.getProperty("/sm/newAppScope");

            if (!sSourceValue) {
                MessageToast.show("Please provide a source value.");
                return;
            }

            var aMappings = oModel.getProperty("/sm/mappings");
            aMappings.push({ sourceType: sSourceType, sourceValue: sSourceValue, appScope: sAppScope });
            oModel.setProperty("/sm/mappings", aMappings);
            oModel.setProperty("/sm/count", aMappings.length);
            oModel.setProperty("/sm/newSourceValue", "");
            MessageToast.show("Scope mapping added.");
        },

        onSmDelete: function (oEvent) {
            var oItem     = oEvent.getSource().getParent();
            var sPath     = oItem.getBindingContext("admin").getPath();
            var iIndex    = parseInt(sPath.split("/").pop(), 10);
            var oModel    = this.getView().getModel("admin");
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

        // ═══ Navigation ══════════════════════════════════════════════

        onNavBack: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("home");
        }
    });
});