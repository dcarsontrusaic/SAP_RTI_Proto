namespace com.trusaic.rti;

using { cuid, managed } from '@sap/cds/common';

entity Users {
    key employeeId : String(100);
    name           : String(255);
    email          : String(255);
    role           : String(20) enum { Employee; Approver; Admin };
    department     : String(255);
    location       : String(255);
    requests       : Association to many Requests on requests.employee = $self;
    approvals      : Association to many Requests on approvals.approver = $self;
}

entity Requests : cuid, managed {
    requestType                : String(100);
    comparisonGroup            : String(500);
    justification              : String(5000);
    status                     : String(20) enum { Submitted; UnderReview; Approved; Denied; Completed };
    submittedAt                : Timestamp;
    lastUpdatedAt              : Timestamp;
    approvedAt                 : Timestamp;
    deniedAt                   : Timestamp;
    denialReason               : String(5000);
    payparityValidationSummary : LargeString;
    completedAt                : Timestamp;
    employee       : Association to Users;
    approver       : Association to Users;
    statusHistory  : Composition of many StatusHistory on statusHistory.request = $self;
    report         : Composition of one Reports on report.request = $self;
    comments       : Composition of many ReportComments on comments.request = $self;
}

entity StatusHistory : cuid, managed {
    request   : Association to Requests;
    status    : String(20);
    changedAt : Timestamp;
    changedBy : String(100);
    note      : String(5000);
}

entity Reports : cuid, managed {
    request            : Association to Requests;
    payparityProjectId : String(100);
    generatedAt        : Timestamp;
    reportData         : LargeString;
    narrative          : LargeString;
    reportFileUrl      : String(1000);
}

entity ReportComments : cuid, managed {
    request    : Association to Requests;
    authorId   : String(100);
    authorName : String(255);
    authorRole : String(20) enum { Requestor; Responder };
    message    : String(5000);
    postedAt   : Timestamp;
}