# EPIC07 Feature 8 User Story 3

## Epic
EPIC-07 — Reporting & Output Generation

## Feature
FEATURE-08 — Report Export to PDF/Markdown/DOCX

---

# User Story

As an admin,
I want download links and exported file storage to be strictly access-scoped, time-limited, and audited,
so that an exported report can't become an unintended, unauthorized copy of sensitive conference and contact data.

---

# Business Value

- Prevents exported files from becoming a persistent, ungoverned copy of data that should otherwise respect retention and access policy
- Supports compliance requirements for tracking where and to whom sensitive report data was distributed
- Reduces the organization's exposure if a download link is inadvertently shared or leaked
- Enables timely response to a data-deletion request that must also account for previously exported copies

---

# Acceptance Criteria

## Functional Criteria
- Download links are tokenized, time-limited, and scoped to the requesting user's access rights on the source report
- Every export request and download is logged with requester identity, source report, and format
- Exported files in object storage are deleted automatically at the end of the configured retention window
- A data-deletion request for a source report triggers deletion of its associated exported files where still retained

## UX Criteria
- Admin console shows export/download activity logs, filterable by user, report, and date
- Admin can manually revoke an active download link before its natural expiry

## Technical Criteria
- Object storage lifecycle policy enforces automatic expiry independent of application-layer bugs
- Exported files are encrypted at rest with the same key management approach as the source report
- Export access logs are immutable and tamper-evident

---

# Preconditions

- Admin has verified permissions to view export/download audit logs
- Object storage lifecycle and encryption policies are configured
- Data-deletion workflow includes exported-file cleanup as a defined step

---

# Postconditions

- All export and download activity is logged and attributable to a specific user
- Exported files are automatically purged at the end of the retention window
- Data-deletion requests correctly remove any still-retained exported copies

---

# Edge Cases

- A download link is shared beyond the intended recipient before it naturally expires
- Object storage lifecycle policy fails to fire due to a misconfiguration, leaving files past their retention window
- A data-deletion request arrives for a report that has multiple outstanding exported copies in different formats
- Admin manually revokes a link while a download is already in progress
- Exported file retention window conflicts with a longer legal-hold requirement placed on the source report

---

# Telemetry

Track:
- Export request and download events with requester identity
- Object storage lifecycle expiry events
- Manual link-revocation events
- Data-deletion cascade events for exported files
- Legal-hold conflicts flagged during retention cleanup

---

# Dependencies

- Object storage service with lifecycle policy support
- Key management service (KMS)
- Data deletion workflow engine
- Audit logging infrastructure

---

# Priority

Medium

---

# Estimated Complexity

High

---

# QA Test Scenarios

1. Verify download links are scoped to the requesting user's access rights and reject unauthorized access
2. Verify every export and download event is logged with correct requester identity and metadata
3. Verify object storage lifecycle policy automatically purges exported files at the retention window boundary
4. Verify a data-deletion request cascades to remove all outstanding exported copies of the source report
5. Verify manual link revocation immediately blocks an in-progress download
6. Verify exported files are encrypted at rest consistent with source report encryption policy
7. Verify a legal-hold flag correctly overrides automatic retention-based deletion where required
8. Verify audit logs for export/download activity are immutable and queryable by admin

---

# Story Variation

This is user story variation 3 for Report Export, focusing on download-link security, storage retention governance, and deletion-cascade compliance.

---

# Notes

- Exported files are the point where reporting-layer governance meets the physical reality of a downloadable file — retention and deletion guarantees only matter if they cover exports too, not just in-app records.
- Legal-hold handling should be designed as an explicit override path from the start rather than retrofitted later.
