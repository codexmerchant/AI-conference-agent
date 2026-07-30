# AI Conference Agent — Vertical Slice Map

**Status:** Approved roadmap baseline; future-slice details remain subject to acceptance findings and stakeholder review

**Last updated:** July 30, 2026
**Source:** Product strategy, business requirements, PRD, and EPIC-01 through EPIC-14

## Purpose

This map turns the fourteen capability epics into seven ordered, demonstrable product slices. Epics describe capability ownership; slices describe complete user outcomes that cross those epic boundaries.

The roadmap is intentionally progressive:

- The complete slice sequence and dependency order are defined now.
- Only the next implementation slice should receive detailed acceptance criteria, fixtures, and technical design.
- Findings from an accepted slice may refine later slices without rewriting the historical scope of completed work.
- Security, privacy, infrastructure, and operations mature with every slice rather than being deferred to the end.

## Slice sequence

| Slice | User outcome | Primary epics | Status |
|---|---|---|---|
| 1. Conversation to Reviewed Action | Turn a consented recording into a reviewed transcript, contact, summary, actions, follow-up draft, and saved interaction | EPIC-02, 03, 04, 07, 14 | Accepted — 94/100; all critical gates pass |
| 2. Trusted Mobile Conference Capture | Reliably capture approved conference interactions on mobile, recover through interruptions/offline periods, and deliver media for processing | EPIC-01, 02, 10, 11, 13 | Planned |
| 3. Multi-Speaker Session Intelligence | Understand panels and presentations with speaker-aware transcripts, quotes, insights, slides, and reviewable session summaries | EPIC-02, 03, 05, 07, 14 | Planned |
| 4. Contacts, Relationships, and Memory | Recognize people and organizations, prevent duplicates, preserve interaction history, and retrieve prior context | EPIC-03, 04, 06, 12, 14 | Planned |
| 5. Connected Follow-Through | Move reviewed contacts, actions, meetings, and messages into approved external tools with visible sync and conflict handling | EPIC-04, 07, 08, 14 | Planned |
| 6. Conference Intelligence and Reporting | Combine conversations and sessions into searchable daily and conference-level intelligence and exportable reports | EPIC-05, 06, 07, 12, 14 | Planned |
| 7. Goals, Coaching, and Team Operations | Measure outcomes, track goals and follow-through, deliver grounded coaching, and support governed team-scale operation | EPIC-06, 09, 12, 13, 14 | Planned; post-V1 |

EPIC-10 (Cloud Infrastructure and DevOps), EPIC-11 (Security, Privacy and Compliance), and EPIC-13 (Admin, Observability and Operations) provide supporting capabilities throughout the roadmap. They are shown explicitly in each slice where their behavior becomes part of the user-visible or operational definition of done.

## Slice 1 — Conversation to Reviewed Action

### Outcome

A user provides a recording they are permitted to process and receives an editable interaction containing the transcript, primary contact, topics, factual summary, correctly attributed actions, a sender-correct follow-up draft, source audio, and persistence/reopen behavior.

### Epic alignment

- **EPIC-02:** audio ingestion and transcription
- **EPIC-03:** interaction context, topics, entities, and necessary clarification
- **EPIC-04:** basic contact creation with confidence and provenance
- **EPIC-07:** meeting summary, action extraction, and follow-up draft
- **EPIC-11:** consent gate and local media-handling boundary
- **EPIC-13:** provider readiness and visible processing failures
- **EPIC-14:** review, correction, follow-up editing, save, and reopen workspace

### Acceptance boundary

Slice 1 passed acceptance on July 30, 2026. The final controlled run scored 94/100, passed all nine critical gates, and is covered by 27 automated tests plus browser verification. The accepted workflow includes local MLX Whisper transcription, FluidAudio within-recording speaker diarization, evidence-grounded Qwen3 analysis, visible uncertainty, correction, save, and reopen. See the [acceptance record](../demo/SLICE-1-ACCEPTANCE.md) and [validation evidence](../demo/LOCAL-AI-VALIDATION.md).

### Explicit exclusions

- Native mobile/background recording
- Production authentication and multi-user isolation
- Session-scale and open-ended multi-speaker analysis beyond the accepted interaction workflow
- External sending or synchronization
- Production cloud persistence
- Cross-conference memory and coaching

## Slice 2 — Trusted Mobile Conference Capture

### Outcome

A user can start an approved conference capture on mobile, understand its true state, survive locks, interruptions, weak connectivity, and battery pressure, and trust that recoverable media reaches the processing pipeline without silent loss or duplication.

### Epic alignment

- **EPIC-01:** one-tap mode, background audio, status, offline buffering, battery behavior, lock-screen controls, tagging, push-to-capture, and session switching
- **EPIC-02:** chunk ingestion, processing orchestration, lineage, and visible processing states
- **EPIC-03:** conference/session context and interaction classification
- **EPIC-10:** API gateway, object storage, database foundation, deployment pipeline, and event delivery
- **EPIC-11:** recording consent, encryption, secure storage, access control, retention, and audit trail
- **EPIC-13:** capture/upload health, logging, alerting, and feature flags
- **EPIC-14:** desktop visibility into synchronized capture and failure/recovery state

### Completion evidence

- Real-device capture tests across backgrounding, locking, calls/alarms, offline recovery, duplicate retry, low battery, and session switching
- No durable media without valid consent
- Accurate user-visible state from capture through processing handoff
- Traceable, idempotent media ingestion with diagnosed and retryable failures

### Explicit exclusions

- Full panels, slide intelligence, relationship graph, external integrations, and coaching

## Slice 3 — Multi-Speaker Session Intelligence

### Outcome

A user can review a panel or presentation as a speaker-aware, time-aligned session with source-linked quotes, insights, topics, slides, and a corrected summary.

### Epic alignment

- **EPIC-02:** streaming transcription, diarization, OCR, slide extraction, timestamps, segmentation, indexing, and reprocessing
- **EPIC-03:** interaction classification, entities, topics, context, intent, and clarification
- **EPIC-05:** panel roles, speaker recognition, quotes, slide/topic links, summaries, insights, session search, and topic clustering
- **EPIC-07:** session-level outputs with source traceability and versioned generation
- **EPIC-11:** consent and stricter handling for biometric-adjacent voice data
- **EPIC-13:** transcription/diarization model-quality monitoring and correction telemetry
- **EPIC-14:** transcript correction and session-analysis workspace

### Completion evidence

- Controlled multi-speaker and presentation fixtures with known speakers, turns, quotes, slides, and expected insights
- Corrections propagate idempotently to affected summaries, quotes, and links
- Every claim links back to a timestamped source segment
- Unresolved speakers remain explicitly unresolved

### Explicit exclusions

- Cross-event relationship memory, external sync, conference-wide reporting, and coaching

## Slice 4 — Contacts, Relationships, and Memory

### Outcome

A user can recognize who they met, correct identities, avoid duplicates, see how people and organizations are connected, and retrieve relevant context from prior interactions and conferences.

### Epic alignment

- **EPIC-03:** entity extraction, semantic enrichment, context tags, and clarification
- **EPIC-04:** contact creation, identity resolution, reversible merging, confidence, company association, enrichment, and relationship timeline
- **EPIC-06:** graph schema, entity linking, relationship storage, temporal modeling, updates, traversal, and initial visualization APIs
- **EPIC-12:** semantic search, vector memory, conversation recall, cross-conference memory, and hybrid graph/vector retrieval
- **EPIC-11:** PII protection, access, retention, export, deletion, and auditability
- **EPIC-13:** identity-resolution quality and graph/index consistency monitoring
- **EPIC-14:** graph explorer, contact correction, and advanced search workspace

### Completion evidence

- Known-duplicate, ambiguous-identity, merge, undo, delete, and re-index fixtures
- Every contact field and relationship retains source and confidence
- New approved interactions become searchable within the defined freshness objective
- Graph and vector results remain reconcilable after corrections

### Explicit exclusions

- Automated external synchronization, full conference reports, coaching, and team intelligence

## Slice 5 — Connected Follow-Through

### Outcome

A user can approve a contact, follow-up, task, or meeting and synchronize it into selected work tools without silent sending, duplicate creation, credential exposure, or unexplained conflicts.

### Epic alignment

- **EPIC-04:** authoritative contact/company identity and meeting association
- **EPIC-07:** reviewed follow-up drafts and action items
- **EPIC-08:** priority email, calendar, contacts, CRM, notes/drive, and webhook capabilities
- **EPIC-10:** secure integration services, queues, deployment, and retry infrastructure
- **EPIC-11:** least-privilege authorization, credential protection, audit records, and revocation
- **EPIC-13:** sync health, rate-limit/error monitoring, operational controls, and cost visibility
- **EPIC-14:** follow-up management, approval, sync status, conflict resolution, and retry workspace

### Completion evidence

- A stakeholder-approved initial provider set and system-of-record policy
- Explicit review before external effects
- Idempotent writes, provider-specific retry behavior, token refresh, revocation, and visible conflict handling
- Complete audit trail from approved internal artifact to external record

### Explicit exclusions

- Broad provider coverage before the first provider workflow is validated, conference-wide analytics, and coaching

## Slice 6 — Conference Intelligence and Reporting

### Outcome

A user can understand an entire conference across interactions and sessions, search supporting evidence, review daily and final reports, identify opportunities, and export trusted outputs.

### Epic alignment

- **EPIC-05:** cross-session insights, search, topics, quotes, and session summaries
- **EPIC-06:** conference/person/company/topic relationships, temporal context, and network analysis
- **EPIC-07:** daily summaries, conference reports, opportunities, executive summaries, and Markdown/PDF/DOCX export
- **EPIC-12:** cross-conference retrieval, hybrid search, ranking, and topic memory
- **EPIC-13:** report-generation reliability, quality, usage, and cost monitoring
- **EPIC-14:** conference dashboard, advanced search, report editing, bulk classification, export, and offline review
- **EPIC-11:** access, export controls, retention, and source-sensitive redaction

### Completion evidence

- Reports are generated from canonical structured Markdown and retain source lineage
- Users can navigate every material claim to its supporting interaction/session evidence
- Corrections trigger targeted regeneration without duplicating reports
- Exported artifacts match the reviewed canonical version

### Explicit exclusions

- Behavioral coaching and team/enterprise governance

## Slice 7 — Goals, Coaching, and Team Operations

### Outcome

A user or authorized team can define conference goals, measure follow-through and value, receive evidence-grounded recommendations, and operate the product with appropriate governance, visibility, and controls.

### Epic alignment

- **EPIC-09:** conference scoring, interaction quality, follow-up completion, coaching, missed opportunities, time allocation, and goals
- **EPIC-06:** recomputable graph signals and network analysis
- **EPIC-12:** personalized ranking and longitudinal topic memory
- **EPIC-13:** admin console, dashboards, AI-model monitoring, analytics, cost, flags, alerts, and operational reporting
- **EPIC-10:** scalable compute, event replay, multi-region durability, and controlled delivery
- **EPIC-11:** role-based access, audit, regional compliance, privacy controls, and organization-level governance
- **EPIC-14:** goal, coaching, reporting, and governed team review surfaces

### Completion evidence

- Every score and recommendation is versioned, recomputable, and linked to supporting evidence
- Users can correct, dismiss, or disable recommendations without losing source history
- False-positive and tone testing demonstrates that coaching is helpful rather than judgmental
- Team access, audit, retention, cost attribution, and operational recovery are validated

### Explicit exclusions

- Unapproved autonomous decisions, opaque employee surveillance, and unsupported benchmarking claims

## Epic-to-slice coverage

Legend: **P** = primary capability delivery, **S** = supporting or progressively hardened capability.

| Epic | S1 | S2 | S3 | S4 | S5 | S6 | S7 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| EPIC-01 Mobile Capture |  | **P** |  |  |  |  |  |
| EPIC-02 Transcription & Media | **P** | **P** | **P** | S |  | S |  |
| EPIC-03 Context & Intelligence | **P** | S | **P** | **P** | S | S | S |
| EPIC-04 Contact & Relationship | **P** |  | S | **P** | **P** | S | S |
| EPIC-05 Session & Conference |  |  | **P** | S |  | **P** | S |
| EPIC-06 Knowledge Graph |  |  |  | **P** | S | **P** | **P** |
| EPIC-07 Reporting & Output | **P** |  | **P** | S | **P** | **P** | S |
| EPIC-08 Integrations & Sync |  |  |  |  | **P** | S | S |
| EPIC-09 Productivity & Coaching |  |  |  |  |  |  | **P** |
| EPIC-10 Cloud & DevOps | S | **P** | S | S | **P** | S | **P** |
| EPIC-11 Security & Compliance | S | **P** | **P** | **P** | **P** | S | **P** |
| EPIC-12 Search & Memory |  |  | S | **P** | S | **P** | **P** |
| EPIC-13 Admin & Operations | S | **P** | **P** | **P** | **P** | **P** | **P** |
| EPIC-14 Desktop Workspace | **P** | S | **P** | **P** | **P** | **P** | **P** |

## Delivery governance

Before a planned slice moves into implementation, create or approve:

1. A concise user journey and explicit exclusions.
2. Acceptance criteria with weighted quality measures and hard failure gates.
3. Controlled, privacy-safe fixtures with machine-readable expected results.
4. Automated regression, integration, UI, failure-path, and recovery tests appropriate to the slice.
5. Required security, privacy, observability, and data-migration behavior.
6. A demonstration scenario and evidence record.

A slice is complete only when its acceptance evidence passes. Implementation, a working happy path, or a high aggregate AI score does not override a failed critical gate.
