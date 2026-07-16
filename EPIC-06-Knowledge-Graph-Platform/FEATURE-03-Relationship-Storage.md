# FEATURE-03 — Relationship Storage

## Epic
EPIC-06 — Knowledge Graph Platform

---

# 1. Objective

Durably persist relationship edges (`met_at`, `spoke_at`, `introduced_by`, `discussed`, `followed_up`) between graph nodes with provenance, weight, and lifecycle metadata, so the graph remains a trustworthy record of every interaction.

---

# 2. Problem Statement

Interaction evidence about the same relationship arrives from multiple producers — mobile capture, transcription pipeline, CRM sync — often at different times. Naive edge writes create duplicate or conflicting edges and discard the evidence trail needed to trust and later audit the graph.

---

# 3. Feature Overview

A write API and storage layer for relationship edges that performs idempotent upserts keyed on relationship type and node pair (plus context such as session or conference), merges provenance from multiple sources onto the same logical edge, and supports soft-delete/versioning rather than destructive overwrites.

---

# 4. Key Functionalities

## Idempotent edge upsert
Write or update an edge without creating duplicates when the same interaction is reported more than once.

## Multi-source provenance merging
Attach evidence from every contributing source (capture app, transcript, CRM) to a single logical edge.

## Edge property updates
Update weight, confidence, and status fields on an existing edge without losing history.

## Edge soft delete / tombstoning
Mark an edge inactive without physically deleting it, preserving auditability.

## Batch edge writes
Accept high-volume batch writes from pipelines processing an entire conference session at once.

---

# 5. Primary Use Cases

## Use Case 1
The mobile app logs a `met_at` interaction at check-in, and the transcription pipeline later confirms the same interaction from audio — both merge into one edge with two provenance entries.

## Use Case 2
A keynote session ends and the media pipeline batch-writes `spoke_at` edges for all identified speakers in one call.

## Use Case 3
A user marks a contact as incorrectly linked; the corresponding edges are soft-deleted rather than purged, preserving the audit trail.

---

# 6. User Stories

## User Story 1
As a user,
I want every conversation and session I attend to be recorded as a relationship in my graph without creating duplicates,
so that my contact history stays accurate and trustworthy.

### Acceptance Criteria
- Submitting the same interaction twice does not create a duplicate edge.
- Each edge shows which sources contributed evidence.
- Edge weight reflects the strength/recency of the underlying interaction.

## User Story 2
As an operator monitoring pipeline health,
I want relationship writes to be idempotent and safely retryable,
so that transient failures during batch ingestion don't corrupt the graph.

### Acceptance Criteria
- Retried writes with the same idempotency key never create duplicate edges.
- Failed batch writes can be replayed without side effects on already-written edges.
- Write failures are logged with enough context to diagnose root cause.

---

# 7. User Workflow

1. Producer service (capture app, transcription pipeline, CRM sync) emits a relationship write request.
2. Storage layer computes the idempotency key from relationship type, source/target node, and context.
3. Existing edge is looked up; if found, provenance and weight are merged; if not, a new edge is created.
4. Write is committed with updated `created_at`/`updated_at` timestamps.
5. Downstream consumers (scoring, traversal) are notified of the change.
6. If a delete is requested, the edge is soft-deleted (tombstoned) rather than removed.
7. Batch writes are acknowledged per-record so partial failures can be retried individually.

---

# 8. UI / UX Requirements

- No direct end-user UI; relationship storage is a backend service consumed by other features.
- Internal debugging view for operators to inspect an edge's full provenance and history.

---

# 9. Technical Requirements

## Frontend
Not applicable — this is a backend platform service; the only surface is an internal operator debugging console.

## Backend
A relationship write API enforcing idempotency via a deterministic edge key, provenance-merging logic, and soft-delete semantics, backed by the graph database's edge storage.

## AI/ML
No inference in the write path; confidence scores passed through from upstream producers (e.g., entity linking, transcription) are stored as-is.

## Infrastructure
Batch write endpoint backed by a queue/worker pattern to absorb bursts during conference peak hours (e.g., end-of-session interaction floods).

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Graph DB | Persist edges and their provenance/version history |
| Entity Linking | Supplies resolved source/target node IDs for edge writes |
| Mobile Capture Platform (EPIC-01) | Producer of `met_at` interaction events |
| AI Transcription Pipeline (EPIC-02) | Producer of `spoke_at` and `discussed` evidence |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| RelationshipEdge | edge_id, relationship_type (met_at\|spoke_at\|introduced_by\|discussed\|followed_up), source_node_id, target_node_id, weight, confidence, status (active\|superseded\|deleted), valid_from, valid_to, created_at, updated_at |
| EdgeProvenance | provenance_id, edge_id, source_system, source_ref, ingested_at, confidence_contribution |
| EdgeWriteRequest | request_id, idempotency_key, payload{}, status (accepted\|duplicate\|rejected), received_at |

---

# 12. Security & Privacy

- Edge writes require an authenticated service identity; end users cannot write raw edges directly.
- Provenance references to source media (audio, transcripts) are access-controlled to the owning user.
- Soft-deleted edges remain queryable only by authorized audit/compliance roles.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Single edge write latency | <100ms p95 |
| Batch write throughput | >5,000 edges/min |
| Duplicate edge rate | <0.5% |

---

# 14. Edge Cases

- Two producers race to write the same logical edge simultaneously.
- Same node pair accumulates multiple relationship types (e.g., both `met_at` and `discussed`) that must remain distinct edges.
- An edge references a source or target node that is mid-merge in entity linking.
- Batch write partially fails, requiring per-record retry without duplicating successful writes.
- A conference generates a burst of thousands of edge writes within minutes of a session ending.
- A soft-deleted edge is referenced by a downstream traversal query.

---

# 15. Dependencies

- Graph schema management (edge type definitions and constraints)
- Entity linking (resolved node IDs)
- Graph database with transactional upsert support
- Message queue for batch/burst absorption

---

# 16. Risks

- Race conditions producing duplicate or conflicting edges under high concurrency.
- Provenance merge logic silently overwriting legitimate conflicting evidence.
- Storage growth from retaining full edge history and tombstones.

---

# 17. Telemetry & Analytics

Track:
- `relationship_edge_created`
- `relationship_edge_updated`
- `relationship_edge_duplicate_detected`
- `relationship_edge_soft_deleted`
- `relationship_batch_write_completed`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Duplicate edge rate | <0.5% |
| Batch write success rate | >99.5% |
| Edge write p95 latency | <100ms |

---

# 19. Future Enhancements

- Automatic edge weight recalculation triggered by new provenance rather than a separate scoring pass.
- Cross-conference edge consolidation for long-term relationship history.
- Configurable retention policy for tombstoned edges.

---

# 20. Open Questions

- Should conflicting relationship_type claims between the same node pair be merged, kept as separate edges, or flagged for review?
- What is the retention period for soft-deleted edges before permanent purge?
- Should edge weight be computed at write time or deferred entirely to the Graph Scoring feature?
