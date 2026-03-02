using { com.trusaic.rti as rti } from '../db/schema';

/**
 * Employee-facing service — submit requests, view own requests and reports
 */
service EmployeeService @(path: '/api/employee') {

    @readonly
    entity MyRequests      as projection on rti.Requests;

    @readonly
    entity MyStatusHistory as projection on rti.StatusHistory;

    @readonly
    entity MyReports       as projection on rti.Reports;

    // Submit a new request
    action submitRequest(
        requestType     : String,
        comparisonGroup : String,
        justification   : String
    ) returns MyRequests;
}

/**
 * Approver-facing service — review and act on pending requests
 */
service ApproverService @(path: '/api/approver') {

    @cds.redirection.target
    entity Requests        as projection on rti.Requests;

    @readonly
    entity StatusHistory   as projection on rti.StatusHistory;

    @readonly
    entity Users           as projection on rti.Users;

    // Approve or deny a request
    action approveRequest(requestId : UUID)                          returns Requests;
    action denyRequest(requestId : UUID, denialReason : String)      returns Requests;
}

/**
 * Admin service — full visibility across all requests
 */
service AdminService @(path: '/api/admin') {

    @readonly
    entity AllRequests     as projection on rti.Requests;

    @readonlyc
    entity StatusHistory   as projection on rti.StatusHistory;

    @readonly
    entity Reports         as projection on rti.Reports;

    @readonly
    entity Users           as projection on rti.Users;
}