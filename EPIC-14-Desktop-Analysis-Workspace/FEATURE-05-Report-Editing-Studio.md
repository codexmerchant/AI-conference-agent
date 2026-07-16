# FEATURE-05 — Report Editing Studio

## Epic
EPIC-14 — Desktop Analysis Workspace

---

# 1. Objective

Provide a desktop WYSIWYG editor for AI-generated reports (meeting summaries, daily summaries, conference reports, executive summaries) so users can refine, restructure, and polish output before exporting or sharing it.

---

# 2. Problem Statement

AI-generated reports are useful drafts but not always publication-ready; there is no desktop-grade editing surface to adjust wording, reorder sections, fix citations, or apply a consistent template before the report goes to a stakeholder, forcing users to copy content into external tools and lose the link back to source data.

---

# 3. Feature Overview

A block-based rich text editor that opens any AI-generated report as an editable draft, preserves links from generated content back to its source transcript/session, supports section reordering and template switching, and tracks version history with rollback.

---

# 4. Key Functionalities

## Block-based rich text editing
Edit report content as structured blocks (headings, paragraphs, bullet lists, quote blocks) with standard rich-text formatting.

## Source citation linking
AI-generated statements retain a link back to the transcript segment or interaction they were derived from, viewable inline.

## Section reordering and templates
Drag-and-drop section reordering and the ability to switch the report's template while preserving content.

## Version history and rollback
Every save creates a version snapshot; users can view diffs and restore a prior version.

## Draft status and handoff
Reports move through draft/in-review/final states so users know what's ready to export or share.

---

# 5. Primary Use Cases

## Use Case 1
User opens an AI-generated conference report, rewrites the executive summary, and reorders sections to match a stakeholder's preferred format.

## Use Case 2
User notices a citation in a meeting summary looks off, clicks through to the source transcript segment, and corrects the wording in the report.

## Use Case 3
User accidentally deletes a section, then restores the previous version from history.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want to edit my AI-generated conference report before sharing it,
so that the final document matches my voice and stakeholder expectations.

### Acceptance Criteria
- User can open any generated report in an editable, block-based view.
- Edits autosave and are reflected in a version history.
- User can switch the report's template without losing existing content.

## User Story 2
As a power user,
I want to trace a report statement back to its source transcript,
so that I can verify accuracy before finalizing the report.

### Acceptance Criteria
- AI-generated statements display an inline citation indicator linking to their source.
- Clicking the citation navigates to the exact transcript segment or interaction.
- Editing the report text does not remove the citation link unless the user explicitly detaches it.

---

# 7. User Workflow

1. User opens a generated report from the dashboard or reports list.
2. Report Editing Studio loads the report as an editable block-based draft.
3. User edits text, reorders sections, or swaps the template.
4. User clicks citation markers to verify content against source transcripts.
5. Draft autosaves continuously, creating version snapshots at meaningful intervals.
6. User marks the report "Final" when ready.
7. User proceeds to Export and Sharing Platform to distribute the finished report.

---

# 8. UI / UX Requirements

- Familiar rich-text toolbar (headings, bold/italic, lists, quote blocks).
- Inline, unobtrusive citation markers that expand on hover/click.
- Section outline sidebar for quick navigation and drag-to-reorder.
- Version history panel with visual diffs between versions.
- Clear draft/in-review/final status indicator.

---

# 9. Technical Requirements

## Frontend
SwiftUI-hosted rich text editing component supporting structured block content, with a document outline sidebar and diff viewer for version comparison.

## Backend
Report drafts are persisted through desktop endpoints that read/write the same report entities produced by the Reporting & Output Generation service, so edits remain the canonical version consumed by export and sharing.

## AI/ML
No new generation occurs in this feature; it consumes existing AI-generated report content and citation metadata. Optionally, a "regenerate section" action can re-invoke the summarization service for a single section.

## Infrastructure
Version snapshots are stored incrementally (diffs) rather than full-copy per save to keep storage costs bounded on frequently-edited reports.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| `GET /desktop/reports/{id}/draft` | Fetch the current editable draft |
| `PUT /desktop/reports/{id}/draft` | Save edits to the draft |
| `POST /desktop/reports/{id}/versions/restore` | Restore a prior version |
| `POST /desktop/reports/{id}/sections/{section_id}/regenerate` | Re-invoke AI generation for one section |
| Reporting & Output Generation (EPIC-07) | Source of generated report content and templates |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| ReportDraft | id, report_id, user_id, content_blocks_json, template_id, status, version, last_edited_at |
| ReportVersion | id, report_draft_id, version_number, content_snapshot, edited_by, created_at, change_summary |
| ReportCitation | id, report_draft_id, block_id, source_type, source_id, source_timestamp_ms |

---

# 12. Security & Privacy

- Draft edits require authentication and are attributed to the editing user.
- Citation links resolve only for entities the user has access to; broken/unauthorized citations are hidden, not errored visibly.
- Version history is retained per data retention policy and excluded from casual export.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Draft load time | <1 sec |
| Autosave round-trip | <500 ms |
| Version restore | <1 sec |
| Citation navigation jump | <500 ms |

---

# 14. Edge Cases

- Two devices edit the same report draft concurrently.
- The underlying AI regenerates the source report while a manual draft edit is in progress.
- A citation link breaks because the source transcript segment was later edited or deleted.
- Template switch causes loss of custom formatting not supported by the new template.
- Autosave conflicts with a manual save triggered at the same moment.
- User requests export while the draft is mid-edit and unsaved.

---

# 15. Dependencies

- EPIC-07 Reporting & Output Generation (source reports, templates, summarization)
- EPIC-05 Session & Conference Intelligence (transcript sources for citations)
- Feature 8 Export and Sharing Platform (downstream distribution)
- Desktop authentication and sync service

---

# 16. Risks

- Manual edits diverging significantly from regenerated AI content, causing confusion about which version is authoritative.
- Version history storage growth on reports edited very frequently.
- Citation links becoming stale as source transcripts are corrected independently.

---

# 17. Telemetry & Analytics

Track:
- `report_draft_opened`
- `report_section_edited`
- `report_template_switched`
- `report_citation_clicked`
- `report_version_restored`
- `report_marked_final`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Reports edited before export | >50% |
| Median time from draft open to "Final" | <15 min |
| Citation click-through rate | >20% |
| Version restore usage indicating recoverable errors | tracked, no target |

---

# 19. Future Enhancements

- Collaborative real-time co-editing for team-shared reports.
- AI-assisted tone/style rewriting suggestions.
- Commenting and review workflow before marking final.

---

# 20. Open Questions

- Should "regenerate section" preserve manual edits elsewhere in the report, or require full re-review?
- How long should version history be retained, and should it be user-configurable?
- Should reports support named collaborators before the collaborative editing enhancement ships?
