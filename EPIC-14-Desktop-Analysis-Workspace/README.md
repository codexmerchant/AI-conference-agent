# EPIC-14 — Desktop Analysis Workspace

## Objective
Provide the Mac/Desktop tier of the Agentic Conference Secretary (PRD §6) with deep-analysis, editing, and reporting workflows: reviewing transcripts, exploring the relationship graph, monitoring conference intelligence, searching across everything captured, editing AI-generated reports, bulk-classifying data, managing follow-ups, exporting/sharing output, and continuing to work offline. This epic consumes and refines intelligence produced upstream — it does not generate raw intelligence itself.

## Feature Files

| Feature | File |
|---|---|
| FEATURE-01 — Transcript Review Workspace | `FEATURE-01-Transcript-Review-Workspace.md` |
| FEATURE-02 — Relationship Graph Explorer | `FEATURE-02-Relationship-Graph-Explorer.md` |
| FEATURE-03 — Conference Intelligence Dashboard | `FEATURE-03-Conference-Intelligence-Dashboard.md` |
| FEATURE-04 — Advanced Search Workspace | `FEATURE-04-Advanced-Search-Workspace.md` |
| FEATURE-05 — Report Editing Studio | `FEATURE-05-Report-Editing-Studio.md` |
| FEATURE-06 — Bulk Tagging and Classification | `FEATURE-06-Bulk-Tagging-and-Classification.md` |
| FEATURE-07 — Follow-Up Management Workspace | `FEATURE-07-Follow-Up-Management-Workspace.md` |
| FEATURE-08 — Export and Sharing Platform | `FEATURE-08-Export-and-Sharing-Platform.md` |
| FEATURE-09 — Offline Analysis Mode | `FEATURE-09-Offline-Analysis-Mode.md` |

## Implementation Notes

- The desktop client is a native macOS app (SwiftUI + AppKit interop for dense data views like the graph canvas and transcript tables); it is a read/write client of cloud-stored intelligence, not an independent processing tier — heavy AI inference stays server-side per PRD §6/§7.
- This epic is downstream of EPIC-05 (Session & Conference Intelligence), EPIC-06 (Knowledge Graph Platform), and EPIC-07 (Reporting & Output Generation): every workspace here visualizes, edits, or exports objects those epics produce, and edits made here must round-trip back through the same APIs those epics expose rather than mutating derived data directly.
- Local caching (Feature 9) and near-real-time cloud sync run concurrently, so every mutable entity in this epic needs an `updated_at`/version field and a conflict-detection path — the same contact or transcript can be edited from mobile (EPIC-01) while a desktop offline edit is queued.
- Because desktop workflows operate on large aggregates (full transcripts, dense graphs, bulk selections, large exports), every feature needs explicit performance budgets and pagination/virtualization strategies rather than assuming mobile-scale payloads.
- All editing surfaces (transcript corrections, report edits, bulk reclassification) must preserve version history and attribution, since desktop is the primary place humans override AI output and those overrides need to be auditable and, where relevant, fed back as training/QA signal.
