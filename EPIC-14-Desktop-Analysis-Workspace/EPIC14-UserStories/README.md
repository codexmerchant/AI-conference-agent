# EPIC-14 User Stories — Desktop Analysis Workspace

This folder contains user stories for EPIC-14 (Desktop Analysis Workspace), covering all 9 features with 3 story variations per feature (27 total). Each feature is told from three perspectives — user, operator, and admin — so functional behavior, operational reliability, and security/compliance requirements are all captured explicitly rather than left implicit.

## Feature 1: Transcript Review Workspace
- **EPIC14-feature-1-user-story-1.md** — User: reviewing and correcting transcripts with synchronized audio playback
- **EPIC14-feature-1-user-story-2.md** — Operator: reliability and monitoring of edit propagation to summaries/graph
- **EPIC14-feature-1-user-story-3.md** — Admin: audio access control, edit audit trail, and retention compliance

## Feature 2: Relationship Graph Explorer
- **EPIC14-feature-2-user-story-1.md** — User: exploring the network graph and finding introduction paths
- **EPIC14-feature-2-user-story-2.md** — Operator: query/render performance monitoring at scale
- **EPIC14-feature-2-user-story-3.md** — Admin: query-layer authorization and cross-user data isolation

## Feature 3: Conference Intelligence Dashboard
- **EPIC14-feature-3-user-story-1.md** — User: viewing conference KPIs, score breakdown, and comparisons
- **EPIC14-feature-3-user-story-2.md** — Operator: snapshot generation reliability and staleness monitoring
- **EPIC14-feature-3-user-story-3.md** — Admin: per-user data scoping and local cache confidentiality

## Feature 4: Advanced Search Workspace
- **EPIC14-feature-4-user-story-1.md** — User: cross-entity natural-language and keyword search
- **EPIC14-feature-4-user-story-2.md** — Operator: index freshness, latency, and relevance quality monitoring
- **EPIC14-feature-4-user-story-3.md** — Admin: tenant isolation and query-log data governance

## Feature 5: Report Editing Studio
- **EPIC14-feature-5-user-story-1.md** — User: editing reports and verifying AI citations against source transcripts
- **EPIC14-feature-5-user-story-2.md** — Operator: autosave, version history, and regeneration-conflict reliability
- **EPIC14-feature-5-user-story-3.md** — Admin: edit access control and report-integrity audit trail

## Feature 6: Bulk Tagging and Classification
- **EPIC14-feature-6-user-story-1.md** — User: multi-select bulk tag apply/remove and reclassification
- **EPIC14-feature-6-user-story-2.md** — Operator: large-batch processing reliability and undo correctness
- **EPIC14-feature-6-user-story-3.md** — Admin: per-record authorization enforcement and tag taxonomy governance

## Feature 7: Follow-Up Management Workspace
- **EPIC14-feature-7-user-story-1.md** — User: reviewing, editing, and batch-sending follow-up drafts
- **EPIC14-feature-7-user-story-2.md** — Operator: scheduler/delivery reliability monitoring
- **EPIC14-feature-7-user-story-3.md** — Admin: outbound-communication authorization and opt-out compliance

## Feature 8: Export and Sharing Platform
- **EPIC14-feature-8-user-story-1.md** — User: exporting reports, pushing to CRM, and generating share links
- **EPIC14-feature-8-user-story-2.md** — Operator: export/CRM-push job monitoring and failure handling
- **EPIC14-feature-8-user-story-3.md** — Admin: share-link permission governance, PII redaction, and export audit trail

## Feature 9: Offline Analysis Mode
- **EPIC14-feature-9-user-story-1.md** — User: working offline and syncing edits on reconnect
- **EPIC14-feature-9-user-story-2.md** — Operator: sync batch reliability and conflict-detection accuracy
- **EPIC14-feature-9-user-story-3.md** — Admin: local cache encryption and enforced wipe on logout/deauthorization

## Key Themes

- **Edit propagation integrity**: transcript corrections, report edits, and bulk reclassifications all need reliable, auditable paths back into EPIC-05/06/07 data rather than becoming orphaned local changes.
- **Scale-aware reliability**: several features (graph explorer, bulk tagging, search, export) explicitly account for desktop-scale data volumes — thousands of graph nodes, hundreds of bulk-selected records, large report exports — that mobile never has to handle.
- **Sync and conflict handling**: because desktop, mobile, and cloud can all mutate the same entities, nearly every feature's operator story addresses conflict detection, and Feature 9 makes offline/online reconciliation a first-class capability.
- **Consent and compliance on outbound actions**: Follow-Up Management and Export/Sharing both touch data leaving the app boundary (real people, external systems) and carry the epic's highest-stakes admin stories around opt-out enforcement and redaction.
- **Access scoping over convenience**: every admin story defaults to the most restrictive access/permission posture, requiring explicit opt-in for broader sharing, cross-account visibility, or elevated support access.
