# EPIC-07 User Stories — Reporting & Output Generation

This folder contains user stories for EPIC-07 (Reporting & Output Generation), covering all 8 features with 3 story variations per feature (24 total). Each feature is examined from three perspectives — user (functional/happy-path), operator (reliability, monitoring, auditability of the generation pipeline), and admin (access control, data governance, and compliance) — reflecting that this epic sits at the point where generated intelligence becomes shareable, exportable, and externally distributable data.

## Feature 1: Meeting Summaries
Per-interaction summaries generated automatically from finalized transcripts and resolved contact identity.
- **EPIC07-feature-1-user-story-1.md** — User: automatic, trustworthy summary generation and editing
- **EPIC07-feature-1-user-story-2.md** — Operator: generation pipeline reliability, retries, and audit logging
- **EPIC07-feature-1-user-story-3.md** — Admin: access control, encryption, and deletion cascade for summary data

## Feature 2: Follow-Up Drafts
Personalized outreach drafts generated from meeting summaries, sent through connected email/LinkedIn integrations.
- **EPIC07-feature-2-user-story-1.md** — User: fast, personalized draft generation and sending
- **EPIC07-feature-2-user-story-2.md** — Operator: send reliability and integration health monitoring
- **EPIC07-feature-2-user-story-3.md** — Admin: credential security and outbound message audit trail

## Feature 3: Daily Summaries
End-of-day digests aggregating top contacts, insights, and action items across a conference day.
- **EPIC07-feature-3-user-story-1.md** — User: timely, well-organized end-of-day digest
- **EPIC07-feature-3-user-story-2.md** — Operator: scheduling reliability across timezones
- **EPIC07-feature-3-user-story-3.md** — Admin: retention governance and redaction propagation

## Feature 4: Conference Reports
Full-event reports covering trends, opportunities, network insights, and recommendations.
- **EPIC07-feature-4-user-story-1.md** — User: comprehensive, trustworthy whole-event report
- **EPIC07-feature-4-user-story-2.md** — Operator: scalability under peak post-conference load
- **EPIC07-feature-4-user-story-3.md** — Admin: data isolation and access scoping for network insights

## Feature 5: Opportunity Detection
Persona-aware detection of deal, partnership, hiring, and investment signals from conversation content.
- **EPIC07-feature-5-user-story-1.md** — User: persona-relevant, actionable opportunity flagging
- **EPIC07-feature-5-user-story-2.md** — Operator: precision monitoring and feedback-loop health
- **EPIC07-feature-5-user-story-3.md** — Admin: CRM push authorization and configuration governance

## Feature 6: Action-Item Extraction
Extraction of assignable commitments from transcripts/summaries into a trackable checklist.
- **EPIC07-feature-6-user-story-1.md** — User: accurate, low-friction commitment capture
- **EPIC07-feature-6-user-story-2.md** — Operator: extraction quality monitoring and deduplication correctness
- **EPIC07-feature-6-user-story-3.md** — Admin: external-sync authorization and cascading deletion integrity

## Feature 7: Executive Summaries
Audience-tiered, length-constrained distillations of a Conference Report for upward reporting.
- **EPIC07-feature-7-user-story-1.md** — User: fast, accurately-scoped summary generation for reporting upward
- **EPIC07-feature-7-user-story-2.md** — Operator: share-link reliability and redaction-rule observability
- **EPIC07-feature-7-user-story-3.md** — Admin: redaction enforcement and revocable, audited sharing

## Feature 8: Report Export to PDF/Markdown/DOCX
Rendering pipeline converting any report's canonical Markdown into a downloadable PDF, Markdown, or DOCX file.
- **EPIC07-feature-8-user-story-1.md** — User: fast, faithful, multi-format export
- **EPIC07-feature-8-user-story-2.md** — Operator: rendering resource isolation and pipeline observability
- **EPIC07-feature-8-user-story-3.md** — Admin: download-link security and storage retention governance

## Key Themes

- **Markdown as the canonical source of truth.** Every generation and export path in this epic treats a structured Markdown representation as the single source of truth, with PDF/DOCX/slide-ready formats produced as rendering targets rather than parallel generation paths.
- **Traceability back to source.** Every generated artifact — summary, draft, digest, report, opportunity, action item — carries source references back to the transcript, context tags, or knowledge-graph entities it was derived from, making every output auditable.
- **Confidence and redaction as first-class fields.** Confidence scores gate how much a user should trust a generated output, and redaction rules gate what leaves the platform in shared/exported form; both are enforced server-side and versioned for audit.
- **Explicit confirmation before anything leaves the platform.** Sending a follow-up, pushing an opportunity to a CRM, or sharing an executive summary all require an explicit user confirmation step — none of these outbound actions happen automatically.
- **Governance scales with sensitivity.** Higher-sensitivity outputs (network insights in conference reports, board-tier executive summaries, CRM pushes) carry correspondingly stricter access, redaction, and audit requirements than lower-sensitivity ones (a single meeting summary).
