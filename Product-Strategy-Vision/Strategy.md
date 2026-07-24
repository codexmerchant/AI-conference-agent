# Agentic Conference Secretary — Product Strategy

**Status:** Draft for stakeholder review

**Planning horizon:** V1 foundation through platform expansion

**Last updated:** July 23, 2026

## Strategic objective

Establish an AI-native conference and relationship intelligence platform by first solving the complete capture-to-follow-up workflow, then compounding value through memory, relationship intelligence, integrations, and coaching.

## Strategic position

The product will compete on the continuity of the experience rather than on any single AI capability. Its differentiation is the connected workflow:

**capture → understand → structure → act → remember → improve**

Point solutions can transcribe audio, store contacts, or draft messages. The strategic advantage is connecting those functions through shared context and a persistent intelligence layer.

## Target market

The initial focus is individual conference-heavy professionals whose work depends on high-value interactions and timely follow-through:

- Investors
- Executives and operators
- Consultants
- Sales and business-development leaders
- Researchers

The priority segment and commercial buyer are **TBD pending customer discovery**.

## Strategic pillars

### 1. Win on capture reliability and trust

Conference intelligence is only useful when the underlying inputs are captured reliably and lawfully. The mobile experience must make approved recording and image capture fast, visible, battery-aware, and resilient to connectivity loss.

Related epics: Mobile Capture; Security, Privacy and Compliance; Cloud Infrastructure and DevOps.

### 2. Deliver immediate, practical outputs

The first user value should come from accurate transcripts, contact creation, meeting summaries, action items, and follow-up drafts. These outputs reduce work immediately and create a reason to use the product at every event.

Related epics: AI Transcription and Media Pipeline; Context and Intelligence; Contact and Relationship Intelligence; Reporting and Output Generation.

### 3. Build context as a shared platform capability

Every media item and generated output should retain its conference, session, interaction, speaker, topic, time, and source context. Context should be reusable across capture, reporting, search, and integrations rather than rebuilt independently.

Related epics: Context and Intelligence; Session and Conference Intelligence; Knowledge Graph Platform.

### 4. Compound value through memory and relationships

Once the basic workflow is reliable, the platform should connect people, companies, sessions, conversations, conferences, and topics across time. Search and graph intelligence turn individual event records into durable user value.

Related epics: Knowledge Graph Platform; Search, Memory and Retrieval; Contact and Relationship Intelligence.

### 5. Expand through controlled integrations

Calendar, email, contacts, CRM, notes, and storage integrations should be introduced when they remove manual handoffs from validated workflows. Each integration must have clear permission, sync, conflict-resolution, and audit behavior.

Related epic: Integrations and Sync Platform.

### 6. Earn the right to coach

Scoring and recommendations should follow sufficient usage, trustworthy data, and transparent measurements. Coaching must provide explainable guidance rather than premature or opaque judgments.

Related epic: User Productivity and Coaching.

## Recommended delivery sequence

### Phase 1 — Trusted V1 workflow

Prove an end-to-end workflow for:

- Approved audio capture
- Transcription
- Basic context classification
- Basic contact creation
- Meeting summaries
- Follow-up drafts
- Cloud synchronization
- Essential privacy, security, and operational controls

The PRD identifies these capabilities as the recommended V1 foundation.

### Phase 2 — Conference intelligence

Add:

- Speaker diarization and media alignment
- Session and presentation analysis
- Stronger identity resolution
- Daily and conference reporting
- Search and desktop review workflows
- Priority calendar, contact, and communication integrations

### Phase 3 — Compounding intelligence

Expand into:

- Knowledge and relationship graphs
- Cross-event semantic memory
- Advanced integrations
- Performance analytics and coaching
- Team and enterprise intelligence

The detailed release boundary, dates, staffing, and owners are **TBD pending stakeholder approval**.

## Product and technical approach

- Use mobile devices for low-friction capture and immediate interaction.
- Use the desktop workspace for deeper review, correction, analysis, and export.
- Use cloud services for computationally intensive AI, synchronization, storage, search, and graph operations.
- Use multiple specialized agents where separation improves reliability and traceability.
- Preserve lineage from original media to every derived artifact.
- Require confidence, source references, and processing status for AI-generated outputs.
- Design processing stages to be idempotent and observable.

## Decision principles

When prioritizing work:

1. Prefer capabilities that complete a user workflow over isolated demonstrations.
2. Prefer trust, reliability, and correction mechanisms over additional generation features.
3. Prefer same-day user value before long-term intelligence.
4. Prefer shared platform services over duplicated epic-specific implementations.
5. Defer integrations until the target workflow and system of record are clear.
6. Defer coaching until measurements are reliable and explainable.

## Success framework

### Product signals

- Interaction capture rate
- Transcription and summary quality
- Follow-up draft acceptance and completion
- Time from interaction to useful output
- Conference-day engagement

### Customer-value signals

- Time saved
- Reduction in missed follow-ups
- Recall and retrieval success
- User-reported relationship and conference value
- Retention across multiple events

### Platform signals

- Processing success and latency
- Offline recovery success
- AI correction rates
- Synchronization reliability
- Security, privacy, and audit compliance

Targets and measurement methods are **TBD**.

## Key risks and responses

| Risk | Strategic response |
|---|---|
| Recording laws and user trust | Explicit consent workflows, visible indicators, regional controls, and user-managed retention |
| Poor AI accuracy | Confidence scores, source lineage, review workflows, correction, and quality monitoring |
| Capture failure or battery impact | Offline buffering, status visibility, resilience testing, and battery optimization |
| Scope expansion across 14 epics | Phase delivery around complete workflows and enforce V1 boundaries |
| Integration complexity | Introduce integrations only after validating the underlying workflow |
| Weak differentiation | Focus on connected context, memory, relationships, and cross-event value |
| Premature coaching | Delay scoring until sufficient trustworthy data exists |

## Open strategic decisions

- Primary initial customer segment and buyer
- Commercial model and pricing
- V1 pilot cohort
- Release timeline and staffing
- Final V1 acceptance thresholds
- Geographic launch scope and legal review
- Priority integrations
- System-of-record policy for contacts and relationship data
