# FEATURE-08 — Export and Sharing Platform

## Epic
EPIC-14 — Desktop Analysis Workspace

---

# 1. Objective

Let users export reports, graph views, and contact lists into standard formats (PDF, DOCX, CSV, Markdown), push data to connected CRMs, and generate shareable links, so conference intelligence can leave the app and reach the tools and people that need it.

---

# 2. Problem Statement

Finished reports and curated contact lists are only useful if they can leave the app in a format stakeholders and other systems expect; without export and sharing, users must manually retype or screenshot content into CRMs, decks, or emails.

---

# 3. Feature Overview

An export workspace supporting multiple output formats, a job queue with history for tracking export progress, CRM push integration for contact/interaction data, and shareable links with configurable permissions and expiry.

---

# 4. Key Functionalities

## Multi-format export
Export reports and lists to PDF, DOCX, CSV, or Markdown with consistent formatting and optional branding/watermarking.

## CRM push
Push contacts, interactions, and notes directly into a connected CRM (Salesforce, HubSpot, Affinity) with field mapping.

## Shareable links
Generate a link to a report or view with configurable permission level and expiration date.

## Export job queue and history
Track in-progress and completed exports, with retry for failures and a history of past exports.

## Branding and formatting options
Apply a user or organization template (logo, color, footer) to exported documents.

---

# 5. Primary Use Cases

## Use Case 1
User exports a finished conference report to PDF to email to their team lead.

## Use Case 2
User pushes 150 newly tagged contacts from a conference directly into their Salesforce CRM.

## Use Case 3
User generates a time-limited share link to a report for an external partner who doesn't have an account.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want to export my reports and contact lists into common file formats,
so that I can share them with people and tools outside the app.

### Acceptance Criteria
- User can select a report or contact list and export it to PDF, DOCX, CSV, or Markdown.
- Export completes and the resulting file is available for download or local save.
- Exported documents preserve formatting, structure, and any applied branding.

## User Story 2
As a power user,
I want to push contacts and interactions directly into my connected CRM,
so that my conference data becomes part of my existing sales/relationship workflow without manual re-entry.

### Acceptance Criteria
- User can select records and push them to a connected CRM with field mapping applied.
- System reports how many records succeeded and which failed, with reasons.
- Duplicate detection prevents creating redundant CRM records for contacts already synced.

---

# 7. User Workflow

1. User selects a report, graph view, or contact list to export or share.
2. User chooses export format or CRM destination.
3. System validates the request and queues the export/push job.
4. User monitors progress in the export job queue.
5. On completion, user downloads the file, opens the share link, or reviews CRM push results.
6. User can retry any failed export or push from the job history.
7. User can revoke a previously generated share link at any time.

---

# 8. UI / UX Requirements

- Format/destination picker with a clear preview of what will be exported.
- Non-blocking job queue panel showing progress for in-flight exports.
- Share link management screen listing active links with revoke controls.
- Field-mapping UI for CRM push, with sensible defaults pre-filled.
- Clear success/failure summary after each export or push completes.

---

# 9. Technical Requirements

## Frontend
SwiftUI export panel with a background-job status list that persists across app navigation, plus a link-management view for created share links.

## Backend
Export jobs are processed asynchronously, rendering PDFs/DOCX server-side from the same report content maintained by Reporting & Output Generation, and writing to CRMs through the connectors maintained by Integrations & Sync Platform.

## AI/ML
No new inference; may reuse existing PII/sensitive-field detection to flag content for optional redaction before export.

## Infrastructure
Generated files are stored in object storage behind short-lived signed URLs; share links are backed by access-controlled tokens with configurable expiry and revocation.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| `POST /desktop/export` | Submit an export job (format, source entity) |
| `GET /desktop/export/{job_id}` | Check export job status and retrieve file URL |
| `POST /desktop/share-links` | Create a shareable link with permission/expiry settings |
| `DELETE /desktop/share-links/{id}` | Revoke a share link |
| `POST /desktop/crm-push` | Push selected records to a connected CRM |
| Reporting & Output Generation (EPIC-07) | Source content for PDF/DOCX/Markdown export |
| Integrations & Sync Platform (EPIC-08) | CRM connector for push operations |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| ExportJob | id, user_id, source_entity_type, source_entity_id, format, status, file_url, created_at, completed_at |
| ShareLink | id, resource_id, resource_type, token, permission_level, expires_at, created_by, view_count, revoked_at |
| CrmPushJob | id, user_id, crm_provider, entity_ids, field_mapping_json, success_count, failure_count, created_at |

---

# 12. Security & Privacy

- Exported files are accessible only via short-lived signed URLs, never permanent public paths.
- Share links default to the most restrictive permission level and require explicit opt-in to broaden access.
- CRM push requests are logged with field-level mapping for audit, and PII fields can be excluded per organization policy.
- Revoked share links are invalidated immediately, including for already-opened browser tabs on next request.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| PDF/DOCX export (standard report) | <5 sec |
| CSV export (1,000 contacts) | <3 sec |
| Share link creation | <500 ms |
| CRM push (100 records) | <10 sec |

---

# 14. Edge Cases

- Export of a very large report with embedded images/graphs times out or exceeds size limits.
- CRM push fails due to a field mapping mismatch or CRM-side validation error.
- Share link is accessed after its expiry date.
- A revoked share link was already cached/bookmarked by a recipient.
- Concurrent export requests for the same resource create redundant jobs.
- Export content contains PII that should be redacted before leaving the app.

---

# 15. Dependencies

- EPIC-07 Reporting & Output Generation (report content and templates)
- EPIC-08 Integrations & Sync Platform (CRM connectors)
- EPIC-11 Security, Privacy & Compliance (redaction, access policy)
- Object storage with signed-URL support

---

# 16. Risks

- Share links inadvertently exposing sensitive conference intelligence if permissions default too broad.
- CRM field-mapping drift as external CRM schemas change, silently breaking pushes.
- Large export volume creating storage/cost growth if job history isn't pruned.

---

# 17. Telemetry & Analytics

Track:
- `export_job_submitted`
- `export_job_completed`
- `export_job_failed`
- `share_link_created`
- `share_link_revoked`
- `crm_push_completed`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Export jobs completing successfully | >97% |
| Median export time (standard report) | <5 sec |
| CRM push success rate | >90% |
| Share links revoked before natural expiry (misuse signal) | tracked, no fixed target |

---

# 19. Future Enhancements

- Scheduled recurring exports (e.g., weekly CRM sync).
- Additional CRM/connector destinations beyond the initial set.
- Export presets/templates per organization or team.

---

# 20. Open Questions

- What is the default share link expiry, and should it be organization-configurable?
- Should CRM push support two-way sync (pulling CRM updates back) or remain one-way from this feature?
- Should redaction of PII in exports be opt-in or on-by-default for external share links?
