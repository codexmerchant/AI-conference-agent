# EPIC05 Feature 1 User Story 3

## Epic
EPIC-05 — Session & Conference Intelligence

## Feature
FEATURE-01 — Panel Mode Analysis

---

# User Story

As an admin,
I want to control who can view panel analysis outputs and audit every manual role correction,
so that sensitive panel data — including talk-time analytics that could reflect on a speaker's standing — is properly governed and traceable.

---

# Business Value

- Prevents unauthorized access to talk-time analytics and role classifications that could be reputationally sensitive for panelists
- Provides an auditable trail of manual corrections for compliance and dispute resolution
- Ensures panel analysis access aligns with the same permissions as the underlying session/transcript
- Reduces legal/compliance exposure from misattributed or leaked panel structure data

---

# Acceptance Criteria

## Functional Criteria
- Access to `panel_analysis`, `panelist_role`, and `crosstalk_event` records is enforced by the same ownership/role model as the parent session
- Every manual correction to a role label or Q&A boundary is recorded with actor identity and timestamp
- Admins can view a full audit history of corrections for any session

## UX Criteria
- Admin audit view lists corrections chronologically with before/after values
- Access control settings for panel analysis are visible alongside the session's general sharing settings, not in a separate hidden location
- Export of audit history is available for compliance review

## Technical Criteria
- Role-based access control (RBAC) checks are enforced at the API layer, not only in the UI
- Audit log entries are immutable and stored separately from the mutable `panel_analysis` state
- Data retention and deletion of panel analysis records follows the same policy as the parent transcript

---

# Preconditions

- Admin role is provisioned with audit-view permissions
- Session and its panel analysis data exist
- Organization-level access control policy is configured

---

# Postconditions

- Audit log entry created for every correction, viewable by authorized admins
- Access attempts outside the permitted role/ownership scope are denied and logged
- Compliance export is available on demand

---

# Edge Cases

- A user with session-edit access but not admin rights attempts to bypass correction audit logging
- Panel analysis data outlives the retention period of its parent transcript due to a sync bug
- Bulk correction import (e.g., re-tagging all panelists from a corrected roster) needs to be audited as a batch, not as individual noise
- A former collaborator's access is revoked but their past corrections must remain in the audit trail
- Cross-organization sharing of a panel session requires re-evaluating access scope for panel analysis specifically

---

# Telemetry

Track:
- `panel_analysis_access_denied`
- `panel_role_manually_corrected`
- `panel_analysis_audit_exported`
- `panel_analysis_permission_changed`
- `panel_analysis_data_deleted`

---

# Dependencies

- Authentication and identity/RBAC platform
- Audit logging infrastructure
- Session-level sharing/visibility policy (shared with EPIC-01/EPIC-02)

---

# Priority

High

---

# Estimated Complexity

High

---

# QA Test Scenarios

1. Verify a user without session access cannot retrieve panel analysis via direct API call
2. Verify a manual role correction creates an immutable audit log entry with correct actor and timestamp
3. Verify audit history displays accurate before/after values for a corrected Q&A boundary
4. Verify RBAC denies panel analysis access even when the requester has partial session permissions
5. Verify bulk roster-based corrections are logged as a traceable batch operation
6. Verify deletion of a parent transcript cascades to deletion of its panel analysis and audit-appropriate tombstone record
7. Verify compliance export produces a complete, correctly formatted audit history
8. Verify access revocation for a removed collaborator does not delete their historical audit entries

---

# Story Variation

This is user story variation 3 for Panel Mode Analysis, focusing on access control, auditability, and compliance governance over panel analysis data.

---

# Notes

- Talk-time and role data can be sensitive in corporate or political panel contexts; treat it with the same care as the underlying transcript
- Audit trail design should anticipate future dispute-resolution needs (e.g., a panelist disputing their recorded talk-time share)
