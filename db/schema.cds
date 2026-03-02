namespace com.trusaic.rti;

using { cuid, managed } from '@sap/cds/common';

/**
 * Users — role-based access, SSO mapping, employee context
 */
entity Users {
    key employeeId : String(100);       // From SSO/IDP
    name           : String(255);
    email          : String(255);
    role           : String(20) enum { Employee; Approver; Admin };
    department     : String(255);       // For Admin filters, V2 approval routing
    location       : String(255);       // Same

    // Associations
    requests       : Association to many Requests on requests.employee = $self;
    approvals      : Association to many Requests on approvals.approver = $self;
}

/**
 * Requests — central workflow table, every screen reads from this
 */
entity Requests : cuid, managed {
    requestType                : String(100);   // e.g. "Individual Pay Gap", "Pay Level Comparison"
    comparisonGroup            : String(500);   // Parameters dependent on request type
    justification              : String(5000);  // Optional
    status                     : String(20) enum { Submitted; UnderReview; Approved; Denied; Completed };
    submittedAt                : Timestamp;
    lastUpdatedAt              : Timestamp;
    approvedAt                 : Timestamp;
    deniedAt                   : Timestamp;
    denialReason               : String(5000);
    payparityValidationSummary : LargeString;   // JSON from iFlow 2
    completedAt                : Timestamp;

    // Associations
    employee       : Association to Users;
    approver       : Association to Users;
    statusHistory  : Composition of many StatusHistory on statusHistory.request = $self;
    report         : Composition of one Reports on report.request = $self;
}

/**
 * StatusHistory — timeline on Screen 4, SLA tracking for V2
 */
entity StatusHistory : cuid, managed {
    request   : Association to Requests;
    status    : String(20);             // Status at this point in time
    changedAt : Timestamp;
    changedBy : String(100);            // System or user ID
    note      : String(5000);           // e.g. denial reason, system note
}

/**
 * Reports — completed RTI report data, 1:1 with Requests
 * Structure varies per PayParity project config, stored as self-describing JSON snapshot
 */
entity Reports : cuid, managed {
    request            : Association to Requests;
    payparityProjectId : String(100);   // Which PayParity project config produced this
    generatedAt        : Timestamp;
    reportData         : LargeString;   // Full JSON payload with embedded schema + data
    narrative          : LargeString;   // Pulled out for display convenience
    reportFileUrl      : String(1000);  // PDF download link
}