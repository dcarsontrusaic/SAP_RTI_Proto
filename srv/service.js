const cds = require('@sap/cds');
const { v4: uuidv4 } = require('uuid');

module.exports = cds.service.impl(async function () {

    const { Requests, StatusHistory, ReportComments, Users } = this.entities;
    const db = await cds.connect.to('db');

    // -----------------------------------------------------------------
    // EmployeeService.submitRequest
    // -----------------------------------------------------------------
    this.on('submitRequest', async (req) => {
        const { requestType, comparisonGroup, justification } = req.data;
        const now = new Date().toISOString();
        const newId = uuidv4();
        const employeeId = 'EMP001'; // dev default

        // Block if employee has a pending request
        const pending = await db.read(Requests).where({
            employee_employeeId: employeeId,
            status: { in: ['Submitted', 'UnderReview', 'Approved'] }
        });
        if (pending && pending.length > 0) {
            return req.reject(400,
                'You already have a pending request. Please wait until it is completed before submitting another.');
        }

        await db.create(Requests).entries({
            ID: newId,
            requestType,
            comparisonGroup,
            justification,
            status: 'Submitted',
            submittedAt: now,
            lastUpdatedAt: now,
            employee_employeeId: employeeId
        });

        await db.create(StatusHistory).entries({
            ID: uuidv4(),
            request_ID: newId,
            status: 'Submitted',
            changedAt: now,
            changedBy: employeeId,
            note: ''
        });

        return await db.read(Requests).where({ ID: newId });
    });

    // -----------------------------------------------------------------
    // ApproverService.approveRequest
    // -----------------------------------------------------------------
    this.on('approveRequest', async (req) => {
        const { requestId } = req.data;
        const now = new Date().toISOString();
        const approverId = 'APR001';

        await db.update(Requests).set({
            status: 'Approved',
            approvedAt: now,
            lastUpdatedAt: now,
            approver_employeeId: approverId
        }).where({ ID: requestId });

        await db.create(StatusHistory).entries({
            ID: uuidv4(),
            request_ID: requestId,
            status: 'Approved',
            changedAt: now,
            changedBy: approverId,
            note: ''
        });

        return await db.read(Requests).where({ ID: requestId });
    });

    // -----------------------------------------------------------------
    // ApproverService.denyRequest
    // -----------------------------------------------------------------
    this.on('denyRequest', async (req) => {
        const { requestId, denialReason } = req.data;
        const now = new Date().toISOString();
        const approverId = 'APR001';

        await db.update(Requests).set({
            status: 'Denied',
            deniedAt: now,
            lastUpdatedAt: now,
            denialReason,
            approver_employeeId: approverId
        }).where({ ID: requestId });

        await db.create(StatusHistory).entries({
            ID: uuidv4(),
            request_ID: requestId,
            status: 'Denied',
            changedAt: now,
            changedBy: approverId,
            note: denialReason
        });

        return await db.read(Requests).where({ ID: requestId });
    });

    // -----------------------------------------------------------------
    // EmployeeService.postComment
    // -----------------------------------------------------------------
    this.on('postComment', async (req) => {
        const { requestId, message } = req.data;
        if (!message || !message.trim()) {
            return req.reject(400, 'Comment cannot be empty.');
        }

        const employeeId = 'EMP001'; // dev default
        const now = new Date().toISOString();
        const commentId = uuidv4();

        // Look up author display name
        const [user] = await db.read(Users).where({ employeeId });
        const authorName = user ? user.name : employeeId;

        await db.create(ReportComments).entries({
            ID: commentId,
            request_ID: requestId,
            authorId: employeeId,
            authorName,
            authorRole: 'Requestor',
            message: message.trim(),
            postedAt: now
        });

        // Future: trigger iFlow to push comment to PayParity here

        return await db.read(ReportComments).where({ ID: commentId });
    });

});