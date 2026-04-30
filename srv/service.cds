using { com.trusaic.rti as rti } from '../db/schema';

service EmployeeService @(path: '/api/employee') {
    @readonly
    entity MyRequests      as projection on rti.Requests;
    @readonly
    entity MyStatusHistory as projection on rti.StatusHistory;
    @readonly
    entity MyReports       as projection on rti.Reports;
    @readonly
    entity MyComments      as projection on rti.ReportComments;
    action submitRequest(
        requestType     : String,
        comparisonGroup : String,
        justification   : String
    ) returns MyRequests;
    action postComment(
        requestId : UUID,
        message   : String
    ) returns MyComments;
}

service ApproverService @(path: '/api/approver') {
    @cds.redirection.target
    entity Requests        as projection on rti.Requests;
    @readonly
    entity StatusHistory   as projection on rti.StatusHistory;
    @readonly
    entity Users           as projection on rti.Users;
    action approveRequest(requestId : UUID)                          returns Requests;
    action denyRequest(requestId : UUID, denialReason : String)      returns Requests;
}

service AdminService @(path: '/api/admin') {
    @readonly
    entity AllRequests     as projection on rti.Requests;
    @readonly
    entity StatusHistory   as projection on rti.StatusHistory;
    @readonly
    entity Reports         as projection on rti.Reports;
    @readonly
    entity Users           as projection on rti.Users;
    @readonly
    entity AllComments     as projection on rti.ReportComments;
}