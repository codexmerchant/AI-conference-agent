# EPIC08 Feature 5 User Story 3

## Epic
EPIC-08 — Integrations & Sync Platform

## Feature
FEATURE-05 — CRM Sync

---

# User Story

As an admin,
I want to control which contact fields are eligible for outbound CRM sync and audit every write made to our CRM,
so that sensitive notes never leave the app and every CRM change can be traced back to its origin.

---

# Business Value

- Prevents sensitive or personal capture notes from being pushed into a shared CRM where a wider audience can see them
- Satisfies enterprise change-control requirements that all automated CRM writes be traceable to a specific actor and cause
- Gives the organization a single point of control to pause CRM sync org-wide in the event of a data quality incident
- Reduces risk of accidental data leakage through overly permissive default field mappings

---

# Acceptance Criteria

## Functional Criteria
- Admin can configure which contact fields are eligible for outbound sync at the organization level, overriding user-level defaults
- Admin can view an audit log of every CRM write (create/update) including which field values were sent and which CRM record was affected
- Admin can pause CRM sync organization-wide, halting all outbound writes until resumed

## UX Criteria
- Field eligibility configuration clearly shows which fields are currently synced vs. excluded, with a plain-language description of each
- Audit log entries are searchable by CRM record ID, app contact ID, and date range
- Org-wide pause action requires explicit confirmation and shows the number of pending/in-flight syncs affected

## Technical Criteria
- Field-eligibility restrictions are enforced server-side in the sync pipeline, not only hidden in the client field-mapping UI
- Org-wide pause immediately halts the sync queue for the organization's connections without dropping queued jobs (they resume, not restart, when unpaused)
- Audit log entries are immutable and retained per the organization's compliance retention policy

---

# Preconditions

- Admin has organization-level administrative access
- At least one CRM connection is active for the organization
- Audit logging infrastructure is enabled for the organization

---

# Postconditions

- Field-eligibility restrictions apply to all future outbound syncs within one sync cycle
- Audit log reflects every CRM write with field-level detail and the app contact/CRM record IDs involved
- Paused sync resumes cleanly from the queue without data loss when an admin re-enables it

---

# Edge Cases

- Admin excludes a field from sync that a user-level field mapping had already configured, requiring the more restrictive org-level setting to win
- Org-wide pause is applied while a bulk sync job is mid-batch, requiring in-flight items to be safely requeued rather than lost
- A field excluded from sync was already pushed to the CRM in a prior sync before the restriction was applied, requiring the admin to understand this doesn't retroactively remove it
- Audit log volume grows very large for high-activity organizations, requiring pagination and possibly archival tiering
- A user attempts to bypass field restrictions via a custom field mapping alias

---

# Telemetry

Track:
- `crm_admin_field_restriction_applied`
- `crm_admin_sync_paused`
- `crm_admin_sync_resumed`
- `crm_write_audit_logged`
- `crm_admin_audit_log_queried`

---

# Dependencies

- Organization/role-based access control system
- Salesforce REST/Bulk API, HubSpot CRM API, Affinity API
- Audit logging and compliance retention infrastructure
- Rate-limited job queue infrastructure (for safe pause/resume)

---

# Priority

High

---

# Estimated Complexity

High

---

# QA Test Scenarios

1. Verify admin can configure org-level field-eligibility restrictions and they are enforced server-side
2. Verify a restricted field is never included in an outbound CRM write, even if a user's field mapping attempts to include it
3. Verify admin-initiated org-wide pause halts all outbound syncs for the organization
4. Verify paused, queued jobs resume correctly (not restarted or dropped) when sync is re-enabled
5. Verify audit log records every CRM write with field-level detail and correct record correlation
6. Verify audit log is searchable by CRM record ID, app contact ID, and date range
7. Verify a field restriction applied after data was already synced does not retroactively alter already-written CRM records
8. Verify attempts to bypass field restrictions via aliasing are blocked and logged as a policy violation

---

# Story Variation

This is user story variation 3 for CRM Sync, focusing on data governance, field-level access control, and write-level auditability.

---

# Notes

- Server-side enforcement of field eligibility is non-negotiable; a client-only restriction would not withstand a security review of an integration that writes to a customer's CRM
- Org-wide pause/resume must be queue-safe (no dropped jobs) since this is likely to be used reactively during an incident, when data integrity matters most
