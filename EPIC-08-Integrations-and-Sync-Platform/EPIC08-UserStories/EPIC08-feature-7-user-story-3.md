# EPIC08 Feature 7 User Story 3

## Epic
EPIC-08 — Integrations & Sync Platform

## Feature
FEATURE-07 — Notes and Drive Sync

---

# User Story

As an admin,
I want to restrict which artifact types can be auto-exported and audit every file written to external storage/notes destinations,
so that sensitive session content is never exported to a shared destination without explicit organizational approval.

---

# Business Value

- Prevents raw transcripts or private session notes from being auto-exported to a shared team Notion database or Drive folder
- Satisfies data-handling policy requirements for organizations that classify conference recordings/transcripts as sensitive
- Provides an audit trail of every artifact written externally, supporting compliance review
- Reduces risk of unintended data exposure through overly permissive default export settings

---

# Acceptance Criteria

## Functional Criteria
- Admin can restrict which artifact types (summary, transcript, slides, action items) are eligible for auto-export at the organization level
- Admin can view an audit log of every export including artifact type, destination, and destination sharing scope where knowable
- Admin can disable auto-export entirely for the organization if required by policy

## UX Criteria
- Artifact-type eligibility configuration clearly lists each type with a plain-language description of its sensitivity
- Audit log entries are searchable by user, artifact type, destination provider, and date range
- Org-wide disable shows the number of active export connections that will be affected before confirming

## Technical Criteria
- Artifact-type restrictions are enforced server-side in the export pipeline, not only reflected in client UI defaults
- Audit log captures destination provider, destination folder/database identifier, and artifact type per export
- Org-wide disable halts future exports immediately but does not retroactively delete artifacts already exported externally

---

# Preconditions

- Admin has organization-level administrative access
- At least one user in the organization has an active storage/notes connection
- Audit logging infrastructure is enabled for the organization

---

# Postconditions

- Artifact-type restrictions apply to all future exports within one sync cycle
- Audit log reflects every export with artifact type, destination, and user attribution
- Org-wide disable halts future exports immediately across all connections

---

# Edge Cases

- A user's destination (e.g., a Notion database) is a shared team workspace with broader visibility than the admin intended when approving that artifact type
- Admin restricts transcript export after transcripts were already exported under a prior, more permissive policy
- Org-wide disable is applied while a bulk export is mid-batch, requiring in-flight items to complete or fail gracefully
- A user connects a personal (non-corporate) storage account despite an org policy intended to restrict to corporate accounts only
- Audit log needs to distinguish auto-export-triggered exports from manually triggered ones for accurate policy compliance reporting

---

# Telemetry

Track:
- `export_org_artifact_restriction_applied`
- `export_org_disabled`
- `export_admin_audit_log_queried`
- `export_audit_logged`
- `export_destination_sharing_scope_flagged`

---

# Dependencies

- Organization/role-based access control system
- Google Drive API, Notion API, Dropbox API, Microsoft Graph Files/OneDrive API
- Audit logging and compliance retention infrastructure
- Privacy/consent settings service

---

# Priority

Medium

---

# Estimated Complexity

High

---

# QA Test Scenarios

1. Verify admin can restrict specific artifact types from auto-export at the organization level
2. Verify a restricted artifact type is never exported, even if a user's preference attempts to include it
3. Verify audit log records artifact type, destination, and destination identifier per export
4. Verify org-wide disable halts future exports immediately without retroactively deleting already-exported files
5. Verify a mid-batch org-wide disable does not leave the export queue in a corrupted state
6. Verify audit log distinguishes auto-export-triggered exports from manually triggered ones
7. Verify detection/flagging when a destination is a broadly shared workspace inconsistent with the artifact's sensitivity classification
8. Verify audit log is searchable by user, artifact type, destination provider, and date range

---

# Story Variation

This is user story variation 3 for Notes and Drive Sync, focusing on data governance, artifact-sensitivity controls, and export auditability.

---

# Notes

- Raw transcript export is the highest-sensitivity artifact type in this feature and should default to excluded from auto-export pending explicit org approval
- Destination sharing-scope awareness (e.g., a Notion database visible to an entire workspace) is a meaningful risk factor that the audit log should surface, even if the app cannot fully control the destination's own sharing settings
