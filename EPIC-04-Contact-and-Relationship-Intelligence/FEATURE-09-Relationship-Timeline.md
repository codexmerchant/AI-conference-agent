# FEATURE-09 — Relationship Timeline

## Epic
EPIC-04 — Contact & Relationship Intelligence

---

# 1. Objective

Present a chronological, cross-event history of every interaction with a contact — meetings, follow-ups, introductions, topics discussed — as a single unified timeline that compounds across conferences over time.

---

# 2. Problem Statement

Interaction data is captured piecemeal across features (meeting associations, follow-ups sent, topics discussed, introductions made) and across many separate conferences over months or years. Without a unified timeline, users cannot answer "what's the history with this person" without manually piecing together fragments, defeating the product's long-term-memory value proposition.

---

# 3. Feature Overview

A timeline aggregation service that reads events from Meeting Association, Follow-Up/Output Layer, Duplicate Merging, and the Knowledge Graph's relationship edges (`met_at`, `introduced_by`, `discussed`, `followed_up`) and renders them as a single ordered feed per contact, spanning every conference the user has attended.

---

# 4. Key Functionalities

## Cross-event chronological aggregation
Combines interaction events from every conference into one ordered timeline per contact.

## Event-type-aware rendering
Displays each event with type-specific detail (meeting summary snippet, follow-up sent/replied, introduction chain, topic tags).

## Timeline filtering
Lets the user filter the timeline by event type or by conference.

## Merge-aware continuity
When two contacts are merged (Feature 3), their timelines combine into one continuous history rather than showing a gap or duplicate entries.

## Timeline-driven relationship context
Surfaces the most recent and most significant timeline entries as context when the user is about to interact with the contact again (e.g., before a follow-up).

---

# 5. Primary Use Cases

## Use Case 1
User opens a contact met a year ago at a different conference and sees the full history: first meeting, follow-up email sent, reply received, and now a second in-person meeting today.

## Use Case 2
User filters a contact's timeline to see only follow-up events to check whether they ever replied.

## Use Case 3
Two duplicate contact records are merged and their previously separate timelines combine into one continuous, correctly-ordered history.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want to see the full history of my interactions with a contact in one place,
so that I can walk into a repeat meeting with full context.

### Acceptance Criteria
- Timeline displays all meeting, follow-up, and introduction events in chronological order.
- Each entry shows enough detail (date, conference, type, brief summary) to be useful without opening the full record.
- Timeline spans all conferences, not just the current one.

## User Story 2
As a power user,
I want to filter a contact's timeline by event type or conference,
so that I can quickly find a specific past interaction.

### Acceptance Criteria
- Filter controls for event type (meeting, follow-up, introduction, discussed topic) and conference are available on the timeline view.
- Filtering updates the timeline instantly without a full page reload.
- Filtered state is shareable/preservable when navigating away and back.

---

# 7. User Workflow

1. Interaction events occur over time (meeting associations, follow-ups, introductions, topic tags).
2. Each event is written to the shared timeline event log, referencing contact_id and conference_id.
3. When a user opens a contact's timeline, the service queries and orders all events chronologically.
4. Events render with type-specific summaries and links back to full source records (transcript, follow-up email).
5. User can filter by type or conference.
6. If a merge occurs, the timeline re-queries under the surviving contact_id, combining prior separate histories.
7. Key recent timeline entries surface as context in relevant follow-up/preparation flows.

---

# 8. UI / UX Requirements

- Vertical chronological feed, most recent first, grouped by conference.
- Type-specific icons/colors for meeting, follow-up, introduction, and discussed-topic events.
- Tap-through from any timeline entry to its full source record.
- Filter chips for event type and conference, persistent across navigation within a session.

---

# 9. Technical Requirements

## Frontend
Timeline feed component with virtualized scrolling for contacts with long histories; filter chip bar bound to query parameters.

## Backend
Timeline service exposing `GET /contacts/{id}/timeline`, aggregating from Meeting Association, Follow-Up/Output Layer, and Knowledge Graph edge events; re-indexes affected contacts on merge completion.

## AI/ML
Optional short natural-language summary generated per timeline entry (e.g., condensing a meeting transcript into one line) reusing the Summarization Agent from the PRD's agentic architecture.

## Infrastructure
Timeline events stored in an append-only event log keyed by contact_id for efficient chronological retrieval; merge re-indexing is a background job that preserves original event timestamps.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| `GET /contacts/{id}/timeline` | Retrieve the chronological interaction history for a contact |
| `GET /contacts/{id}/timeline?type=&conference_id=` | Filtered timeline query |
| Meeting Association Service | Source of met_at timeline events |
| Follow-Up/Output Layer | Source of followed_up timeline events |
| Knowledge Graph Engine | Source of introduced_by and discussed edges |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| TimelineEvent | event_id, contact_id, conference_id, event_type (met_at/introduced_by/discussed/followed_up), occurred_at, summary, source_ref_type, source_ref_id |

---

# 12. Security & Privacy

- Timeline entries inherit the access and consent boundaries of their underlying source records (e.g., a transcript-derived summary requires the original recording consent to have been valid).
- Timeline data is private to the owning user and never exposed to the contact themselves or other users.
- Timeline entries are deleted or anonymized when their source record is deleted, not retained as an orphaned summary.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Timeline load latency (contact with <100 events) | <500 ms |
| Timeline re-index after merge | <5 sec |
| Filtered query latency | <300 ms |

---

# 14. Edge Cases

- Contact with events spanning five or more years and multiple conferences — pagination/virtualization required.
- Timeline entries from a merged contact that overlap in time (e.g., both source contacts logged an event on the same day).
- Source record (e.g., transcript) deleted after the timeline entry was created — entry must degrade gracefully, not break.
- Timeline requested for a contact with zero events.
- Two events with identical timestamps requiring a stable secondary sort order.
- Introduction chain event referencing a third contact that was later deleted.

---

# 15. Dependencies

- Meeting Association (FEATURE-06), primary event source
- Duplicate Merging (FEATURE-03), for merge-aware continuity
- Relationship Scoring (FEATURE-04), which shares the same underlying interaction events
- Knowledge Graph Engine (PRD §5.6), source of introduced_by/discussed edges

---

# 16. Risks

- Timeline becomes noisy/low-signal if every minor event (e.g., a single badge re-scan) is surfaced without aggregation.
- Merge re-indexing bugs could duplicate or drop timeline entries.
- Long-history contacts risk slow load times without proper pagination.

---

# 17. Telemetry & Analytics

Track:
- `relationship_timeline_viewed`
- `relationship_timeline_filtered`
- `relationship_timeline_entry_opened`
- `relationship_timeline_reindexed_after_merge`
- `relationship_timeline_load_failed`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Timeline load latency | <500 ms P50 |
| % of contacts with a populated timeline (≥1 event) | >90% |
| User engagement with timeline before follow-up actions | >40% of follow-ups preceded by a timeline view |

---

# 19. Future Enhancements

- AI-generated "catch-up" summary of everything that's happened with a contact since the last interaction.
- Timeline-based reminders ("you haven't followed up with this contact since your last meeting 3 months ago").

---

# 20. Open Questions

- Should low-signal events (e.g., a duplicate badge re-scan) be filtered out of the default timeline view entirely?
- How far back should timeline history be retained by default before requiring archival/export?
