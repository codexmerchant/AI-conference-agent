# FEATURE-05 — Temporal Relationship Modeling

## Epic
EPIC-06 — Knowledge Graph Platform

---

# 1. Objective

Model relationships as time-bound, evolving facts rather than static edges, so the graph captures when a connection formed, how it has strengthened or gone cold, and supports point-in-time historical queries.

---

# 2. Problem Statement

A relationship is not a single fact recorded once — a user might meet someone at a 2024 conference, follow up twice, then go quiet for a year. A static edge model can't answer "how has this relationship evolved" or distinguish a one-time contact from a recurring one, which limits the accuracy of follow-up prioritization and reporting.

---

# 3. Feature Overview

An event-sourced extension to relationship edges that records discrete relationship events (created, reinforced, decayed, reactivated) over time, computes a current weight from a decay function applied to interaction recency and frequency, and supports "as of" queries that reconstruct the graph's state at a past point in time.

---

# 4. Key Functionalities

## Time-versioned edges
Store `valid_from`/`valid_to` bounds on edges and edge property changes.

## Relationship strength decay
Apply a decay function to edge weight based on time since last interaction.

## Event-sourced relationship history
Record every relationship-affecting event (met, followed up, session overlap) as an immutable event on the edge.

## Point-in-time snapshot queries
Reconstruct the graph (or a subgraph) as it existed at a specified past timestamp.

## Relationship reactivation
Detect and record when a dormant relationship resumes after a new interaction.

---

# 5. Primary Use Cases

## Use Case 1
A user's relationship with a contact met a year ago and not followed up with shows a decayed weight, prompting a "reconnect" suggestion.

## Use Case 2
A report generator queries "who did I meet at last year's conference" using an as-of snapshot query scoped to that conference's date range.

## Use Case 3
A dormant contact reappears at a new conference; the system detects reactivation and records a new relationship event rather than treating it as a brand-new edge.

---

# 6. User Stories

## User Story 1
As a user,
I want my relationship graph to reflect how connections have grown or faded over time,
so that I know who to prioritize reconnecting with versus who is still an active contact.

### Acceptance Criteria
- Edge weight visibly reflects recency and frequency of interaction.
- The user can view a relationship's event history (when met, when followed up).
- Reactivated relationships are shown as continuous history, not duplicate entries.

## User Story 2
As an operator monitoring data quality,
I want relationship decay and reactivation to run reliably on schedule,
so that stale weights don't silently mislead prioritization features.

### Acceptance Criteria
- Decay computation runs on a defined schedule with monitored success/failure status.
- Missed decay runs are detectable and backfillable without double-applying decay.
- Reactivation events are logged and do not conflict with concurrent decay jobs.

---

# 7. User Workflow

1. A new interaction event is ingested and linked to an existing or new edge.
2. If the edge is new, a `created` relationship event is recorded.
3. If the edge exists and was active, a `reinforced` event updates its weight and recency.
4. If the edge exists but had gone dormant, a `reactivated` event is recorded.
5. A scheduled job applies decay to edges with no recent activity, emitting `decayed` events.
6. Current weight is recomputed from the full event history using the decay function.
7. As-of queries reconstruct edge state by replaying events up to the requested timestamp.

---

# 8. UI / UX Requirements

- Relationship detail view showing a timeline of events (met, followed up, decayed, reactivated).
- Visual indicator of relationship "warmth" trend (strengthening, stable, fading).
- No user action required for decay; it is a background process with transparent results.

---

# 9. Technical Requirements

## Frontend
A relationship timeline component in the contact detail view, rendering event history and current warmth trend.

## Backend
An event-sourcing layer atop relationship edges that appends immutable events and derives current edge state via a decay/aggregation function, plus an as-of query engine.

## AI/ML
A decay function calibrated against historical follow-up and re-engagement data to reflect realistic relationship half-life by relationship type.

## Infrastructure
A scheduled batch job (or streaming aggregation) that applies decay across active edges without requiring full graph recomputation on every read.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Relationship Storage | Base edge records that temporal events attach to |
| Graph Scoring | Consumes decayed/reinforced weights as scoring input |
| Interaction Graph Updates | Source of new interaction events triggering reinforcement |
| Reporting/Output Layer | Consumes as-of snapshots for historical conference reports |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| RelationshipEvent | event_id, edge_id, event_type (created\|reinforced\|decayed\|reactivated), occurred_at, delta_weight, source_ref |
| RelationshipEdge (extended) | edge_id, current_weight, last_interaction_at, decay_rate, status (active\|dormant) |
| SnapshotQuery | query_id, scope (node_id\|subgraph), as_of_timestamp, requested_by |

---

# 12. Security & Privacy

- Historical event data inherits the same access controls as the underlying edge.
- As-of queries cannot be used to bypass current soft-delete/tombstone restrictions.
- Decay computation does not expose raw interaction content, only aggregated weight changes.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Scheduled decay job completion | <30 min for full active-edge set |
| As-of snapshot query latency | <2 sec p95 for bounded subgraph |
| Event append latency | <100ms p95 |

---

# 14. Edge Cases

- A backfilled historical event arrives out of chronological order relative to already-processed events.
- Decay function produces a weight below zero and must be floored.
- An as-of query requests a timestamp before the node existed.
- Two reinforcement events for the same edge arrive concurrently.
- A relationship's decay job is missed for an extended period due to a scheduling failure.
- Reactivation logic misfires on a coincidental duplicate interaction rather than genuine reconnection.

---

# 15. Dependencies

- Relationship storage (base edge model)
- Interaction Graph Updates (event source)
- Scheduled job orchestration infrastructure
- Graph scoring (consumer of decayed weights)

---

# 16. Risks

- Incorrect decay calibration causing premature "cold" labeling of active relationships.
- Event history growth increasing storage and query cost over time.
- Out-of-order event ingestion producing inconsistent current-weight computations.

---

# 17. Telemetry & Analytics

Track:
- `relationship_event_recorded`
- `relationship_decay_applied`
- `relationship_reactivated`
- `relationship_decay_job_completed`
- `relationship_snapshot_query_executed`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Decay job success rate | >99.5% |
| As-of query accuracy (vs. audit sample) | 100% |
| User-reported relationship-warmth accuracy | >85% satisfaction |

---

# 19. Future Enhancements

- Per-relationship-type decay curves (e.g., `spoke_at` decays slower than `met_at`).
- Predictive reactivation suggestions before a relationship fully decays.
- Compaction/archival of old event history to control storage growth.

---

# 20. Open Questions

- Should decay rate be uniform across relationship types or configurable per type/industry?
- How far back should event history be retained before compaction into summary state?
- Should as-of queries be available to end users directly, or only to internal reporting features?
