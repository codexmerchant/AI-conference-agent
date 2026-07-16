# EPIC14 Feature 8 User Story 1

## Epic
EPIC-14 — Desktop Analysis Workspace

## Feature
FEATURE-08 — Export and Sharing Platform

---

# User Story

As a user,
I want to export my reports and contact lists into common file formats or push them to my CRM,
so that I can share conference intelligence with people and tools outside the app.

---

# Business Value

- Makes conference intelligence usable in the tools stakeholders already work in (email, CRM, docs)
- Eliminates manual re-entry of contacts and notes into external systems
- Increases the product's integration into existing professional workflows
- Enables sharing polished output with people who don't have accounts

---

# Acceptance Criteria

## Functional Criteria

- User can select a report or contact list and export it to PDF, DOCX, CSV, or Markdown
- User can push selected contacts/interactions to a connected CRM with field mapping
- User can generate a shareable link to a report with a configurable permission level and expiry
- Export/push results report clear success and failure counts

## UX Criteria

- Format/destination selection shows a preview of what will be exported
- Job progress is visible without blocking other app usage
- Share link management screen lists active links with revoke controls

## Technical Criteria

- Exports submit via `POST /desktop/export` and complete asynchronously
- CRM pushes submit via `POST /desktop/crm-push` with field mapping applied
- Share links are created via `POST /desktop/share-links` with configurable expiry

---

# Preconditions

- User is authenticated and owns the report/contacts being exported or shared
- For CRM push, the user has an active CRM connector configured

---

# Postconditions

- Exported files are available for download via a signed URL
- CRM push results are recorded with per-record success/failure detail
- Share links are active and accessible per their configured permission level

---

# Edge Cases

- Export of a very large report with embedded images times out or exceeds size limits
- CRM push fails due to a field mapping mismatch or CRM-side validation error
- Share link is accessed after its expiry date
- Concurrent export requests for the same resource create redundant jobs
- Export destination format doesn't support certain content (e.g., interactive graph in CSV)
- Duplicate contacts already synced to the CRM are pushed again

---

# Telemetry

Track:
- `export_job_submitted`
- `export_job_completed`
- `share_link_created`
- `crm_push_completed`

---

# Dependencies

- EPIC-07 Reporting & Output Generation (report content)
- EPIC-08 Integrations & Sync Platform (CRM connectors)
- Object storage with signed-URL support

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify a report exports correctly to PDF, DOCX, CSV, and Markdown formats
2. Verify exported file formatting matches the source content structure
3. Verify CRM push correctly maps and creates/updates records
4. Verify duplicate detection prevents redundant CRM record creation
5. Verify share link creation respects the selected permission level and expiry
6. Verify share link becomes inaccessible after expiry
7. Verify export job progress is visible and doesn't block other app usage
8. Verify concurrent export requests for the same resource are handled without producing duplicate jobs unnecessarily

---

# Story Variation

This is user story variation 1 for Export and Sharing Platform, focusing on the happy-path export, CRM push, and sharing experience.

---

# Notes

- CRM field mapping defaults should be sensible out of the box to minimize setup friction for first-time push
- Consider format-specific content warnings (e.g., "graph view will be flattened to an image in PDF export")
