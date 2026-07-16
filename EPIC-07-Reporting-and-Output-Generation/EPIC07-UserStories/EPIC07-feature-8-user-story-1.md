# EPIC07 Feature 8 User Story 1

## Epic
EPIC-07 — Reporting & Output Generation

## Feature
FEATURE-08 — Report Export to PDF/Markdown/DOCX

---

# User Story

As a user,
I want to export any report or summary to PDF, Markdown, or DOCX,
so that I can attach it to an email, print it, or continue editing it in a tool outside the app.

---

# Business Value

- Extends the reporting layer's value beyond the app itself into email, CRM, and document-storage workflows
- Enables sharing conference outcomes with people who don't use the app
- Supports archival and compliance needs that require a portable file format
- Removes a common blocker to broader adoption ("great insights, but I can't get them out of the app")

---

# Acceptance Criteria

## Functional Criteria
- User can select a target format and trigger export from any completed report/summary type
- Exported file accurately reflects the in-app report content, including embedded images where applicable
- Export completes and is downloadable within a reasonable time even for larger reports

## UX Criteria
- Export option is available from every report/summary view with a clear format picker
- Progress indicator is shown for exports taking more than a couple of seconds
- Download history is available for re-downloading a prior export within its validity window

## Technical Criteria
- Export operates on the canonical Markdown source rather than re-deriving content separately per format
- Export job status is pollable rather than blocking the client on a long-running render
- Download links are time-limited and access-scoped to the requesting user

---

# Preconditions

- The source report/summary is in a completed (not still-generating) state
- User has selected a target export format
- Object storage and rendering services are available

---

# Postconditions

- `ReportExportJob` record is created and reaches a terminal status (completed/failed)
- Rendered file is available at a secure, expirable download URL upon success
- Export activity is recorded in the report's download history

---

# Edge Cases

- Export requested for a report that is still in the process of generating
- Export exceeds a size limit due to a large number of embedded slide images
- Concurrent export requests for the same report and format
- Unsupported characters/emoji in the report text affecting the PDF renderer
- Download link accessed after its expiration window

---

# Telemetry

Track:
- `report_export_requested`
- `report_export_completed`
- `report_export_downloaded`
- `report_export_failed`
- `report_export_format_selected`

---

# Dependencies

- FEATURE-01, FEATURE-03, FEATURE-04, FEATURE-07 (as export sources)
- PDF rendering service
- DOCX generation library
- Object storage service

---

# Priority

Medium

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify export succeeds for each supported format (PDF, Markdown, DOCX)
2. Verify exported content accurately reflects the in-app report, including embedded images
3. Verify export blocked or gracefully deferred when the source report is still generating
4. Verify progress indicator displays correctly for a longer-running export
5. Verify download link works within its validity window and fails gracefully after expiry
6. Verify concurrent export requests for the same report/format do not duplicate render work
7. Verify a report with an unusually large number of embedded images either completes or clearly informs the user of the limit
8. Verify download history correctly lists prior exports with re-download capability

---

# Story Variation

This is user story variation 1 for Report Export, focusing on the happy-path user experience of fast, faithful, multi-format export.

---

# Notes

- Treating Markdown as the canonical source (per the epic-wide implementation note) is what keeps PDF and DOCX exports consistent with each other and with the in-app view.
- Export is the feature most likely to be used right before a time-sensitive moment (e.g., about to send an email), so perceived latency matters more than raw throughput here.
