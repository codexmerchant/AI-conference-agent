# FEATURE-06 — Interaction Graph Updates

## Epic
EPIC-06 — Knowledge Graph Platform

---

# 1. Objective

Continuously and incrementally update the knowledge graph as new interactions, conversations, and sessions are captured, via the Graph Agent described in PRD §7, so relationship data stays current during a live conference.

---

# 2. Problem Statement

Conference intelligence loses value if the graph lags behind capture. If a user's mobile recording, transcription, and tagging events take too long to propagate into relationship edges, follow-up recommendations and daily summaries operate on stale data during the exact window — mid-conference — when freshness matters most.

---

# 3. Feature Overview

An event-driven update pipeline where the Graph Agent consumes interaction events from capture, transcription, and context pipelines, resolves entities, and upserts relationship edges in near-real-time, with batching/throttling to absorb bursty conference traffic and a dead-letter path for failed updates.

---

# 4. Key Functionalities

## Event-driven ingestion
Consume interaction events (conversation ended, session tagged, follow-up sent) from upstream pipelines via an event bus.

## Graph Agent orchestration
Coordinate entity linking and relationship storage calls needed to translate an interaction event into graph updates.

## Update conflict resolution
Resolve cases where multiple events about the same interaction arrive with differing details.

## Update batching/throttling
Buffer and batch updates during high-volume bursts (e.g., end of a keynote) to protect graph write throughput.

## Dead-letter handling
Capture and retry failed updates without blocking the rest of the pipeline.

---

# 5. Primary Use Cases

## Use Case 1
A conversation ends and the Graph Agent creates or reinforces a `met_at` edge between the two participants within seconds.

## Use Case 2
A keynote session concludes and hundreds of `spoke_at` and `discussed` events arrive in a burst; the pipeline batches and applies them without overwhelming the graph database.

## Use Case 3
An update fails due to a downstream entity-linking timeout; the event is routed to a dead-letter queue and retried automatically.

---

# 6. User Stories

## User Story 1
As a user,
I want my graph to reflect a conversation I just had within moments of it ending,
so that follow-up suggestions and contact summaries are accurate right away.

### Acceptance Criteria
- Graph updates for a completed interaction appear within the defined latency target.
- The user sees an up-to-date relationship state without manual refresh triggers.
- Delayed updates (e.g., due to transcription lag) do not silently drop data.

## User Story 2
As an operator monitoring the update pipeline,
I want visibility into event processing lag and failure rates,
so that I can detect and respond to pipeline degradation during a live conference.

### Acceptance Criteria
- Processing lag per event type is visible on an operational dashboard.
- Failed events are retried automatically with exponential backoff and are not silently lost.
- Alerts fire when dead-letter queue depth exceeds a defined threshold.

---

# 7. User Workflow

1. Upstream pipeline (capture, transcription, tagging) emits an interaction event to the event bus.
2. Graph Agent consumes the event and identifies the relevant entities and relationship type.
3. Agent calls Entity Linking to resolve source/target nodes.
4. Agent calls Relationship Storage to upsert the corresponding edge(s).
5. During bursts, events are batched and processed in controlled-size groups.
6. Successful updates are acknowledged; failures are routed to a dead-letter queue.
7. Dead-lettered events are retried on a backoff schedule or surfaced to operators after repeated failure.

---

# 8. UI / UX Requirements

- No direct end-user UI beyond the freshness the user perceives in contact/relationship views.
- Operator dashboard showing event throughput, processing lag, and dead-letter queue depth.

---

# 9. Technical Requirements

## Frontend
Not applicable to end users directly; an internal operator dashboard visualizes pipeline health.

## Backend
The Graph Agent service consuming from an event bus, orchestrating entity linking and relationship storage calls, with batching logic tuned to conference traffic patterns and a dead-letter queue for failed updates.

## AI/ML
The Graph Agent applies lightweight heuristics to classify incoming events into the correct relationship type when not explicitly labeled by the upstream producer.

## Infrastructure
A durable, at-least-once event bus (e.g., Kafka-style) with consumer group scaling to handle conference-hour traffic spikes, plus a dead-letter queue and retry scheduler.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Event Bus | Source of interaction events from capture/transcription/context pipelines |
| Entity Linking | Resolves event participants to canonical nodes |
| Relationship Storage | Persists resulting edges |
| Context & Intelligence Engine (EPIC-03) | Supplies classified interaction/context events |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| InteractionEvent | event_id, event_type (conversation_ended\|session_tagged\|follow_up_sent), conference_id, participants[], session_id, payload_ref, occurred_at, received_at, status (pending\|processed\|failed) |
| GraphUpdateJob | job_id, event_id, resolved_edges[], status, attempts, last_error, processed_at |
| DeadLetterRecord | record_id, event_id, failure_reason, first_failed_at, retry_count |

---

# 12. Security & Privacy

- Interaction event payloads referencing raw media are access-scoped to the owning user.
- Dead-letter records retain enough context to debug without storing unnecessary PII duplicates.
- Graph Agent operates under a service identity with least-privilege write access.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Event-to-graph-update latency | <10 sec p95 (non-burst) |
| Burst throughput | >2,000 events/min sustained |
| Dead-letter recovery rate | >99% within 1 hour |

---

# 14. Edge Cases

- A burst of thousands of interaction events arrives simultaneously at a keynote's end.
- Events are delivered out of order relative to when the interactions actually occurred.
- An event references an entity still mid-resolution in Entity Linking.
- A downstream dependency (entity linking or storage) is temporarily unavailable, causing a processing backlog.
- Duplicate event delivery from an at-least-once event bus creates redundant update attempts.
- A malformed event payload cannot be parsed and must be quarantined rather than crash the consumer.

---

# 15. Dependencies

- Event bus / streaming infrastructure
- Entity linking service
- Relationship storage service
- Context & Intelligence Engine event producers

---

# 16. Risks

- Processing backlog during conference peak hours degrading data freshness.
- Cascading failures if entity linking or relationship storage becomes a bottleneck.
- Silent data loss if dead-letter handling is misconfigured.

---

# 17. Telemetry & Analytics

Track:
- `interaction_event_received`
- `graph_update_applied`
- `graph_update_failed`
- `graph_update_dead_lettered`
- `graph_update_batch_processed`
- `processing_lag_seconds`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Event-to-graph-update p95 latency | <10 sec |
| Update success rate | >99% |
| Dead-letter queue recovery within SLA | >99% |

---

# 19. Future Enhancements

- Predictive pre-fetching of likely entity matches during high-traffic sessions to reduce latency.
- Adaptive batching that tunes batch size based on real-time load.
- Priority lanes for high-value interactions (e.g., VIP contacts) to guarantee faster propagation.

---

# 20. Open Questions

- What is the acceptable staleness window before a user-visible "syncing" indicator is shown?
- Should burst throttling ever intentionally drop low-priority events, or must all events eventually process?
- How should the Graph Agent handle conflicting event classifications from different upstream producers for the same interaction?
