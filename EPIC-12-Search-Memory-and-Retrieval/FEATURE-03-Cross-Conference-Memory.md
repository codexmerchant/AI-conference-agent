# FEATURE-03 — Cross-Conference Memory

## Epic
EPIC-12 — Search, Memory & Retrieval

---

# 1. Objective

Persist and link memory across multiple conferences over time so relationships, context, and history compound instead of resetting at every event.

---

# 2. Problem Statement

Each conference today is captured as an isolated session. Users can't recall "we also spoke at last year's event" or see how a relationship or topic has evolved across a multi-year conference series, losing the compounding value that long-term memory is supposed to deliver.

---

# 3. Feature Overview

A long-term memory layer that links resolved entities (people, companies, topics) across conference boundaries, builds a timeline per entity, and surfaces relevant historical context automatically when a known entity reappears at a new event.

---

# 4. Key Functionalities

## Cross-event entity linking
Connects the same resolved person/company entity across separate conference sessions and years.

## Relationship timeline aggregation
Builds a chronological timeline of every interaction with an entity across all conferences attended.

## Automatic historical context surfacing
Proactively surfaces prior interaction history when a known entity is re-encountered at a new event.

## Conference-to-conference recall query
Answers queries like "what did we discuss with this person at the last three events."

## Retention and archival tiering
Applies data retention policy and archival tiering to memory older than the active recall window.

---

# 5. Primary Use Cases

## Use Case 1
User re-meets a contact at a new conference and the app surfaces "You last spoke at [Conference] in [Year] about [Topic]."

## Use Case 2
User queries the full multi-year history of interactions with a specific company across every conference attended.

## Use Case 3
User reviews how a relationship has progressed (frequency, topics, sentiment) across a three-year conference series.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want to see my prior history with someone I'm meeting again,
so that I can pick up the relationship with full context instead of starting over.

### Acceptance Criteria
- Re-encountering a resolved entity surfaces a summarized history of prior interactions within the session view.
- Historical summaries include conference, date, and key topics discussed.
- Users can drill from the summary into the full historical interaction record.

## User Story 2
As a power user,
I want to query my full interaction history with a company across every conference,
so that I can prepare for a meeting with complete context.

### Acceptance Criteria
- Cross-conference queries return a chronological timeline spanning all linked events.
- Timeline entries are attributed to the correct conference and date.
- Query results load within the performance target even across years of history.

---

# 7. User Workflow

1. Entity (person/company) is resolved during a new conference capture.
2. System checks cross-conference memory for existing records of the same entity.
3. If a match exists, prior interaction history is retrieved and summarized.
4. Historical context is surfaced to the user in the active session.
5. New interaction data from the current conference is appended to the entity's timeline.
6. Entity timeline is re-aggregated and made available for future cross-conference queries.
7. Data older than the active retention window is tiered to archival storage per policy.

---

# 8. UI / UX Requirements

- "You've met before" surfacing card shown on entity re-encounter
- Entity timeline view with conference, date, and topic chips per interaction
- Clear visual distinction between active and archived memory entries
- Option to correct mismatched entity links directly from the timeline view

---

# 9. Technical Requirements

## Frontend
Timeline UI component rendering chronological interaction history per entity, with expandable detail per conference touchpoint.

## Backend
Cross-conference memory service links entity records via the identity resolution graph, aggregates interaction history on write, and serves timeline queries with pagination.

## AI/ML
Entity resolution and merge logic reuses the identity resolution models from the Contact & Relationship Intelligence epic; summarization models condense multi-event history into short recap text.

## Infrastructure
Long-term storage tiering (hot for recent conferences, cold/archival for older history) balances query performance against storage cost as history accumulates over years.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| GET /memory/cross-conference | Retrieve linked cross-conference history for an entity |
| GET /memory/timeline/{entity_id} | Retrieve the full chronological timeline for an entity |
| POST /memory/link-entity | Manually link or correct an entity match across conferences |
| Identity Resolution (EPIC-04) | Provides entity matching used to link records across events |
| Knowledge Graph Platform (EPIC-06) | Stores relationship structure referenced by timelines |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| MemoryRecord | memory_id, user_id, entity_id, entity_type, conference_id, summary, created_at |
| EntityTimeline | entity_id, first_seen_at, last_seen_at, conference_ids, interaction_count, last_summary |

---

# 12. Security & Privacy

- Cross-conference linking respects per-user data ownership; memory is not shared across accounts without explicit consent
- Historical records honor right-to-be-forgotten deletion requests across all linked conferences
- Archived memory remains encrypted at rest under the same policy as active memory
- Entity re-linking actions are logged for audit and reversibility

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Cross-conference lookup on entity resolution | <1 sec |
| Timeline query (up to 5 years history) | <2 sec |
| Entity link accuracy | >90% |
| Archival tiering job completion | Nightly batch, <2 hr window |

---

# 14. Edge Cases

- Cross-conference recall returns stale contact info after a job change or company merger
- Same person attends under different name spellings or email addresses across events
- Entity merge or split required after an incorrect cross-conference link is detected
- Memory spans the data retention cutoff, requiring partial archival mid-timeline
- Two conferences produce conflicting summaries about the same relationship
- User attends the same conference series under two different accounts

---

# 15. Dependencies

- Identity resolution service (EPIC-04 Contact & Relationship Intelligence)
- Knowledge Graph Platform (EPIC-06)
- Vector Memory Platform for semantic summarization retrieval
- Data retention and archival infrastructure

---

# 16. Risks

- Incorrect entity linking silently merges two different people's histories
- Stale historical context misleads users if not refreshed on re-encounter
- Archival tiering may increase latency for rarely-accessed but still-relevant history
- Long-term storage cost grows unbounded without an agreed retention policy

---

# 17. Telemetry & Analytics

Track:
- `cross_conference_match_found`
- `cross_conference_match_corrected`
- `entity_timeline_viewed`
- `entity_history_surfaced_on_reencounter`
- `archival_tiering_job_completed`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Entity link accuracy | >90% |
| Historical context surfaced within session | >80% of re-encounters |
| User-reported relevance of surfaced history | >4.0/5.0 |
| Timeline query latency (P90) | <2 sec |

---

# 19. Future Enhancements

- Relationship health scoring based on multi-year interaction cadence
- Predictive "you should reconnect with" suggestions based on decay patterns
- Cross-organization shared memory for team accounts (with consent)

---

# 20. Open Questions

- What is the default retention window before memory is archived vs. fully deleted?
- Should cross-conference surfacing be automatic or require an explicit user prompt?
- How should conflicting entity data from two conferences be reconciled by default?
