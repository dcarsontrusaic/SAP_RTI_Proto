const cds = require("@sap/cds");
const { v4: uuidv4 } = require("uuid");

// EmployeeService handler
module.exports = cds.service.impl(function () {

    // ---------- submitRequest ----------
    this.on("submitRequest", async (req) => {
        const { requestType, comparisonGroup, justification } = req.data;
        const now = new Date().toISOString();

        const db = await cds.connect.to("db");
        const { Requests, StatusHistory } = db.entities("com.trusaic.rti");

        const requestId = uuidv4();
        const userId = (req.user.id && req.user.id !== "privileged")
            ? req.user.id
            : "EMP001";

        console.log(">>> submitRequest called with:", JSON.stringify(req.data));
        console.log(">>> Generated requestId:", requestId);
        console.log(">>> User:", userId);

        try {
            await db.run(
                INSERT.into(Requests).entries({
                    ID: requestId,
                    requestType: requestType || "Individual Pay Gap",
                    comparisonGroup: comparisonGroup || "",
                    justification: justification || "",
                    status: "Submitted",
                    submittedAt: now,
                    lastUpdatedAt: now,
                    employee_employeeId: userId
                })
            );
            console.log(">>> Request inserted successfully");

            await db.run(
                INSERT.into(StatusHistory).entries({
                    ID: uuidv4(),
                    request_ID: requestId,
                    status: "Submitted",
                    changedAt: now,
                    changedBy: userId,
                    note: ""
                })
            );
            console.log(">>> StatusHistory inserted successfully");

            const result = await db.run(
                SELECT.one.from(Requests).where({ ID: requestId })
            );
            console.log(">>> SELECT result:", JSON.stringify(result));

            return result;
        } catch (err) {
            console.error(">>> INSERT failed:", err);
            req.error(500, "Failed to create request: " + err.message);
        }
    });

    // ---------- approveRequest ----------
    this.on("approveRequest", async (req) => {
        const { requestId } = req.data;
        const now = new Date().toISOString();

        const db = await cds.connect.to("db");
        const { Requests, StatusHistory } = db.entities("com.trusaic.rti");

        const approverId = (req.user.id && req.user.id !== "privileged")
            ? req.user.id
            : "APR001";

        console.log(">>> approveRequest called for:", requestId);

        try {
            await db.run(
                UPDATE(Requests).set({
                    status: "Approved",
                    approvedAt: now,
                    lastUpdatedAt: now,
                    approver_employeeId: approverId
                }).where({ ID: requestId })
            );

            await db.run(
                INSERT.into(StatusHistory).entries({
                    ID: uuidv4(),
                    request_ID: requestId,
                    status: "Approved",
                    changedAt: now,
                    changedBy: approverId,
                    note: ""
                })
            );

            console.log(">>> Request approved successfully");
            const result = await db.run(
                SELECT.one.from(Requests).where({ ID: requestId })
            );
            return result;
        } catch (err) {
            console.error(">>> Approve failed:", err);
            req.error(500, "Failed to approve request: " + err.message);
        }
    });

    // ---------- denyRequest ----------
    this.on("denyRequest", async (req) => {
        const { requestId, denialReason } = req.data;
        const now = new Date().toISOString();

        const db = await cds.connect.to("db");
        const { Requests, StatusHistory } = db.entities("com.trusaic.rti");

        const approverId = (req.user.id && req.user.id !== "privileged")
            ? req.user.id
            : "APR001";

        console.log(">>> denyRequest called for:", requestId);

        try {
            await db.run(
                UPDATE(Requests).set({
                    status: "Denied",
                    deniedAt: now,
                    lastUpdatedAt: now,
                    denialReason: denialReason,
                    approver_employeeId: approverId
                }).where({ ID: requestId })
            );

            await db.run(
                INSERT.into(StatusHistory).entries({
                    ID: uuidv4(),
                    request_ID: requestId,
                    status: "Denied",
                    changedAt: now,
                    changedBy: approverId,
                    note: denialReason
                })
            );

            console.log(">>> Request denied successfully");
            const result = await db.run(
                SELECT.one.from(Requests).where({ ID: requestId })
            );
            return result;
        } catch (err) {
            console.error(">>> Deny failed:", err);
            req.error(500, "Failed to deny request: " + err.message);
        }
    });

});