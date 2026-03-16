const cds = require("@sap/cds");
const { v4: uuidv4 } = require("uuid");

module.exports = cds.service.impl(function () {

    this.on("submitRequest", async (req) => {
        const { requestType, comparisonGroup, justification } = req.data;
        const now = new Date().toISOString();

        const db = await cds.connect.to("db");
        const { Requests, StatusHistory } = db.entities("com.trusaic.rti");

        const requestId = uuidv4();

        console.log(">>> submitRequest called with:", JSON.stringify(req.data));
        console.log(">>> Generated requestId:", requestId);
        // In dev with dummy auth, user.id is "privileged" — default to EMP001
        const userId = (req.user.id && req.user.id !== "privileged") 
            ? req.user.id 
            : "EMP001";
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

});