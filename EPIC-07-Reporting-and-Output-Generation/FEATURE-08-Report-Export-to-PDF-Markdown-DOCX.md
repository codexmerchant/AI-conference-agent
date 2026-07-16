# FEATURE-08 — Report Export to PDF/Markdown/DOCX

## Epic
EPIC-07 — Reporting & Output Generation

---

# 1. Objective

Allow any generated report or summary — meeting summary, daily summary, conference report, or executive summary — to be exported as a downloadable PDF, Markdown, or DOCX file for offline sharing, CRM attachment, or archival.

---

# 2. Problem Statement

Reports that only live inside the app cannot be emailed to a colleague, attached to a CRM record, dropped into a shared drive, or archived per a company's document-retention policy. Without export, the reporting layer's outputs are trapped in a single interface and lose most of their downstream utility.

---

# 3. Feature Overview

A rendering pipeline takes the canonical Markdown representation of any report type (per the epic-wide convention of Markdown as the source of truth) and converts it into the requested output format — PDF, raw Markdown file, or DOCX — applying a branded template, embedding any referenced media (slide images, network graph snapshots), and producing a downloadable file tracked through an async export job.

---

# 4. Key Functionalities

## Format-specific rendering
Converts the canonical Markdown source into PDF (via headless-browser/HTML rendering) or DOCX (via a document-generation library), or serves the Markdown directly.

## Embedded media handling
Includes referenced images (slide captures, network graph snapshots) inline in the rendered output, laid out per format-appropriate templates.

## Branded template selection
Applies a consistent header/footer/styling template appropriate to the report type and, where configured, the user's organization branding.

## Async export job with status polling
Handles potentially large renders (e.g., a conference report with many embedded slide images) as a background job with a pollable status endpoint.

## Secure, expirable download links
Produces a time-limited, access-controlled download URL for the rendered file.

---

# 5. Primary Use Cases

## Use Case 1
User exports a Conference Report to PDF to attach to an internal expense/travel justification email.

## Use Case 2
User exports a Meeting Summary to Markdown to paste directly into a personal notes tool.

## Use Case 3
User exports an Executive Summary to DOCX so a colleague can further edit it before it's shared with leadership.

---

# 6. User Stories

## User Story 1
As a user who needs to share a report outside the app,
I want to export it to PDF, Markdown, or DOCX,
so that I can attach, print, or further edit it in tools outside the platform.

### Acceptance Criteria
- User can select a target format and trigger export from any completed report/summary.
- Exported file accurately reflects the in-app report content, including embedded images where applicable.
- Export completes and is downloadable within a reasonable time even for large reports.

## User Story 2
As a user exporting a large report with embedded slide images,
I want the export to succeed without silently dropping content or timing out,
so that I can trust the exported file is a complete, faithful copy of the report.

### Acceptance Criteria
- Export handles reports with a large number of embedded images without failing outright.
- If size limits are hit, the user is clearly informed and offered an alternative (e.g., compressed images, split export) rather than a silent failure.
- Export job status is visible to the user while rendering is in progress.

---

# 7. User Workflow

1. User opens a completed report/summary (any of FEATURE-01 through FEATURE-07's outputs).
2. User selects "Export" and chooses a target format (PDF, Markdown, DOCX).
3. Export request creates a `ReportExportJob` and returns immediately with a job status.
4. Rendering service converts the canonical Markdown (with embedded media) into the target format.
5. Rendered file is uploaded to object storage and a secure download URL is generated.
6. User is notified (or polls) when the export is ready.
7. User downloads the file via the expirable link.

---

# 8. UI / UX Requirements

- Export option available from every report/summary view with a clear format picker.
- Progress indicator for exports that take more than a couple of seconds.
- Clear error messaging with a retry option if rendering fails.
- Download history showing prior exports of the same report with re-download capability within the link's validity window.
- File size shown before download for large exports.

---

# 9. Technical Requirements

## Frontend
Export action sheet with format picker, progress state, and a download-history list scoped to the current report.

## Backend
Report Export Service exposes an async export endpoint that enqueues a `ReportExportJob`, resolves the report's canonical Markdown and any embedded media references, and writes the rendered output to object storage with a generated expirable URL.

## AI/ML
No inference required in the export path itself; export operates purely on already-generated report content.

## Infrastructure
PDF rendering via a headless-browser HTML-to-PDF pipeline; DOCX generation via a templated document-generation library; both run as isolated, resource-bounded worker jobs to contain memory/CPU spikes from large embedded-image reports; object storage lifecycle policy expires download links after a configurable retention window.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Meeting/Daily/Conference/Executive report sources (FEATURES 01, 03, 04, 07) | Supply the canonical Markdown content to render |
| PDF Rendering Service (headless-browser HTML-to-PDF) | Converts styled HTML/Markdown into a PDF file |
| DOCX Generation Library | Converts styled content into a DOCX file |
| Object Storage (e.g., S3) | Hosts the rendered file and serves the expirable download URL |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| ReportExportJob | export_id, source_report_id, report_type, format (pdf/markdown/docx), status (queued/rendering/completed/failed), requested_at, completed_at, file_url, file_size_bytes, expiry_at, error_message, requested_by |

---

# 12. Security & Privacy

- Download links are tokenized, time-limited, and scoped to the requesting user's access rights on the source report.
- Rendered files are encrypted at rest in object storage and deleted after the retention/expiry window.
- Export of a report containing another person's PII (e.g., contact details in a shared executive summary) inherits the same redaction rules applied at generation time.
- Export requests are logged with requester identity for audit purposes.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Markdown export latency | <2 sec |
| PDF export latency (typical report, ≤10 images) | <15 sec |
| DOCX export latency | <15 sec |
| Export job success rate | >97% |

---

# 14. Edge Cases

- Export exceeds file-size limit due to a large number of embedded slide images.
- DOCX table/formatting rendering diverges visually from the PDF version of the same report.
- Concurrent export requests for the same report and format (should dedupe or queue, not duplicate render work).
- Export requested for a report that is still in the process of generating.
- Unsupported characters/emoji in report text breaking the PDF renderer.
- Download link accessed after expiration.

---

# 15. Dependencies

- FEATURE-01 Meeting Summaries, FEATURE-03 Daily Summaries, FEATURE-04 Conference Reports, FEATURE-07 Executive Summaries (as export sources)
- PDF rendering service
- DOCX generation library
- Object storage service

---

# 16. Risks

- Large embedded-image reports cause rendering timeouts or excessive resource consumption.
- Format-specific rendering drift (PDF vs. DOCX) undermines trust that "export" is a faithful copy.
- Expired or leaked download links could expose report content if link scoping is implemented too loosely.

---

# 17. Telemetry & Analytics

Track:
- `report_export_requested`
- `report_export_completed`
- `report_export_failed`
- `report_export_downloaded`
- `report_export_size_limit_exceeded`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Export job success rate | >97% |
| P95 export completion time (PDF/DOCX) | <20 sec |
| Export-to-download conversion rate | >85% |

---

# 19. Future Enhancements

- Batch export of multiple reports (e.g., all daily summaries for a conference) into a single archive.
- Direct export to third-party storage (Google Drive, Dropbox, Notion) alongside local download.
- Custom branding/template upload for organizational users.

---

# 20. Open Questions

- What is the maximum supported embedded-image count/size before requiring compression or a split export?
- Should Markdown export include embedded images as linked files, base64-inline, or omitted entirely?
- How long should download links remain valid by default, and should that be user-configurable?
