# EPIC-05 User Stories — Session & Conference Intelligence

This folder contains 24 user stories covering the 8 features of EPIC-05 (Panel Mode Analysis, Speaker Recognition, Quote Extraction, Slide-to-Topic Linking, Session Summarization, Key Insight Extraction, Session Search, and Topic Clustering). Each feature has three stories written from a different perspective — a conference attendee using the feature day to day, an operator responsible for pipeline reliability and monitoring, and an admin responsible for access control, privacy, and compliance — so that functional, operational, and governance requirements are all captured explicitly rather than left implicit.

### Feature 1: Panel Mode Analysis
- `EPIC05-feature-1-user-story-1.md` — Attendee gets the panel transcript auto-organized by role and Q&A boundary
- `EPIC05-feature-1-user-story-2.md` — Operator monitors panel analysis job health and reprocessing after corrections
- `EPIC05-feature-1-user-story-3.md` — Admin governs access to and audits corrections of panel role/talk-time data

### Feature 2: Speaker Recognition
- `EPIC05-feature-2-user-story-1.md` — Attendee gets speaker turns auto-labeled with real names
- `EPIC05-feature-2-user-story-2.md` — Operator monitors resolution accuracy and voiceprint match quality
- `EPIC05-feature-2-user-story-3.md` — Admin enforces voiceprint consent and biometric data retention policy

### Feature 3: Quote Extraction
- `EPIC05-feature-3-user-story-1.md` — Attendee gets notable quotes surfaced automatically for review and sharing
- `EPIC05-feature-3-user-story-2.md` — Operator monitors extraction throughput and flagged-incorrect reports
- `EPIC05-feature-3-user-story-3.md` — Admin governs quote export/sharing permissions and attribution enforcement

### Feature 4: Slide-to-Topic Linking
- `EPIC05-feature-4-user-story-1.md` — Attendee reviews synced slides and narration linked by topic
- `EPIC05-feature-4-user-story-2.md` — Operator monitors dual-dependency linking pipeline health and orphan rate
- `EPIC05-feature-4-user-story-3.md` — Admin controls slide access permissions and audits manual link corrections

### Feature 5: Session Summarization
- `EPIC05-feature-5-user-story-1.md` — Attendee reads a structured, concise summary instead of the full transcript
- `EPIC05-feature-5-user-story-2.md` — Operator monitors groundedness scores, latency, and inference cost
- `EPIC05-feature-5-user-story-3.md` — Admin governs summarization eligibility, export, and version audit history

### Feature 6: Key Insight Extraction
- `EPIC05-feature-6-user-story-1.md` — Attendee captures typed, structured takeaways from a session automatically
- `EPIC05-feature-6-user-story-2.md` — Operator monitors deduplication quality and knowledge graph export reliability
- `EPIC05-feature-6-user-story-3.md` — Admin governs insight export review and retraction of disputed claims

### Feature 7: Session Search
- `EPIC05-feature-7-user-story-1.md` — Attendee searches across their full session archive for a remembered topic
- `EPIC05-feature-7-user-story-2.md` — Operator monitors index freshness, query latency, and zero-result rate
- `EPIC05-feature-7-user-story-3.md` — Admin enforces query-time access scoping and query log retention policy

### Feature 8: Topic Clustering
- `EPIC05-feature-8-user-story-1.md` — Attendee explores conference-wide themes via auto-generated topic clusters
- `EPIC05-feature-8-user-story-2.md` — Operator monitors clustering coherence, stability, and shared infra load
- `EPIC05-feature-8-user-story-3.md` — Admin governs cross-conference access scoping and audits manual cluster edits

## Key Themes

- **Attribution is foundational.** Nearly every feature in this epic (quotes, insights, summaries, panel talk-time) depends on Speaker Recognition resolving anonymous diarized speakers to real identities — misattribution risk shows up repeatedly across the admin-perspective stories.
- **Everything traces back to source evidence.** Summaries, insights, and quotes are all required to carry evidence links back to transcript timestamps, both for user trust and for admin/compliance dispute resolution.
- **Reprocessing is a first-class concern, not an afterthought.** Because this epic sits downstream of EPIC-02's corrigible pipeline (diarization and transcript corrections), nearly every operator story addresses idempotent reprocessing and correction-triggered regeneration.
- **Access scoping gets harder as features aggregate more.** Session-level permissions are straightforward, but Session Search and Topic Clustering aggregate across many sessions and conferences, making query-time (not post-filter) access enforcement a recurring admin-story requirement.
- **Biometric and confidential content carry a stricter bar.** Voiceprints (Speaker Recognition) and confidential slides (Slide-to-Topic Linking) are called out as needing tighter consent, flagging, and retention controls than the epic's general text-based outputs.
