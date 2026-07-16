# EPIC-07 — Reporting & Output Generation Feature Files

## Objective
Generate summaries, reports, action items, and follow-up outputs from the structured intelligence produced upstream (context tags, session intelligence, and the knowledge graph), across four output tiers defined in PRD §5.8: per-interaction, per-session, daily, and full conference report.

## Feature Files

| Feature | File |
|---|---|
| FEATURE-01 — Meeting Summaries | `FEATURE-01-Meeting-Summaries.md` |
| FEATURE-02 — Follow-Up Drafts | `FEATURE-02-Follow-Up-Drafts.md` |
| FEATURE-03 — Daily Summaries | `FEATURE-03-Daily-Summaries.md` |
| FEATURE-04 — Conference Reports | `FEATURE-04-Conference-Reports.md` |
| FEATURE-05 — Opportunity Detection | `FEATURE-05-Opportunity-Detection.md` |
| FEATURE-06 — Action-Item Extraction | `FEATURE-06-Action-Item-Extraction.md` |
| FEATURE-07 — Executive Summaries | `FEATURE-07-Executive-Summaries.md` |
| FEATURE-08 — Report Export to PDF/Markdown/DOCX | `FEATURE-08-Report-Export-to-PDF-Markdown-DOCX.md` |

## Implementation Notes

- **Markdown as canonical intermediate representation.** Every report type (meeting summary, daily digest, conference report, executive summary) is generated and stored as structured Markdown first; PDF and DOCX are rendering targets produced on demand at export time, not separate generation paths. This keeps a single source of truth and avoids format-specific drift.
- **Versioned prompt templates.** Every LLM-generated output stores a `prompt_version` and `model_version` alongside the content, so summary quality regressions can be traced to a specific prompt/model change and safely rolled back without touching already-generated reports.
- **Full source traceability.** Every generated artifact carries `source_*_id` references back to the transcript segments (EPIC-02), context tags (EPIC-03), session intelligence (EPIC-05), and knowledge-graph entities (EPIC-06) it was derived from — this is what makes summaries auditable and lets a user jump from a bullet point back to the exact transcript moment it came from.
- **Async generation and export pipeline.** Summary/report generation and file rendering (especially PDF with embedded slide images) run as background jobs behind a status-polling API rather than synchronous requests, so the mobile/desktop client never blocks on LLM or rendering latency.
- **Confidence surfaced everywhere.** Every generated output carries a confidence/completeness score derived from upstream transcript and context-resolution confidence, so users can tell at a glance when a summary was built from sparse or noisy source data before they act on it (e.g., send a follow-up).
