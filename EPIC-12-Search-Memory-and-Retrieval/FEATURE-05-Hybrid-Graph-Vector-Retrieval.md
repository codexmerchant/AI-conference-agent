# FEATURE-05 — Hybrid Graph + Vector Retrieval

## Epic
EPIC-12 — Search, Memory & Retrieval

---

# 1. Objective

Combine graph traversal (relationship structure) with vector similarity search (semantic meaning) so retrieval can answer queries that require both — "who," connected "how," discussing "what."

---

# 2. Problem Statement

Pure vector search finds semantically similar content but misses relationship structure ("people connected to X"). Pure graph traversal finds connections but misses semantic meaning ("who talked about something like Y"). Neither alone can answer relational-and-semantic queries like "who on my team is connected to someone who discussed pricing strategy."

---

# 3. Feature Overview

A retrieval orchestration layer that routes queries to the Graph DB, the Vector DB, or both, then fuses and re-scores the combined result set into a single ranked list with an explainable retrieval path showing why each result was returned.

---

# 4. Key Functionalities

## Query planner and routing
Determines whether a query needs graph traversal, vector search, or a hybrid of both based on query structure.

## Graph traversal expansion
Executes N-hop relationship queries from a seed entity (e.g., "people 2 hops from X").

## Vector similarity fusion and score normalization
Normalizes and merges graph-derived and vector-derived relevance scores into a single fused score.

## Result deduplication and merge ranking
Deduplicates entities/content appearing in both graph and vector result sets before final ranking.

## Explainable retrieval path
Surfaces the reasoning path (graph hops + semantic matches) behind each returned result.

---

# 5. Primary Use Cases

## Use Case 1
User queries "people connected to my manager who discussed AI safety" — combining a graph hop with semantic topic matching.

## Use Case 2
User queries a purely semantic question with no relational component, and the planner routes to vector-only retrieval for speed.

## Use Case 3
User inspects why a surprising result was returned and sees the explainable graph-hop + semantic-match path.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want to find people connected to someone I know who discussed a specific topic,
so that I can identify warm introduction paths instead of cold outreach.

### Acceptance Criteria
- Hybrid queries combining a relationship seed and a topic return correctly fused, ranked results.
- Purely relational or purely semantic queries are routed efficiently without unnecessary hybrid overhead.
- Results indicate whether they were matched via graph, vector, or both signals.

## User Story 2
As a power user,
I want to see why a retrieval result was surfaced,
so that I can trust and act on non-obvious connections.

### Acceptance Criteria
- Each result exposes an explainable path (e.g., "2 hops via colleague X, semantic match on 'pricing strategy'").
- Explanation data is available via API without materially increasing query latency.
- Users can drill into the explanation to view the underlying graph edges and matched content.

---

# 7. User Workflow

1. User submits a query that may contain relational and/or semantic intent.
2. Query planner classifies the query and selects a retrieval strategy (graph-only, vector-only, or hybrid).
3. For hybrid queries, graph traversal expands from the seed entity to N hops in parallel with vector similarity search.
4. Graph and vector result sets are normalized onto a comparable score scale.
5. Results are deduplicated and fused into a single ranked list.
6. Explanation metadata (traversal path, matched content) is attached to each result.
7. Ranked, explained results are returned to the calling feature (search, recall, or ranking).

---

# 8. UI / UX Requirements

- Result badges indicating match source (graph, semantic, or both)
- "Why this result" expandable explanation panel
- Graph path visualization for multi-hop relational matches
- Graceful degradation messaging when one subsystem (graph or vector) is temporarily unavailable

---

# 9. Technical Requirements

## Frontend
Consumed primarily by other features (search, recall, ranking) via API; any direct UI surfaces result-source badges and an explanation panel for transparency.

## Backend
Retrieval orchestrator issues parallel calls to the Graph DB and Vector DB, applies score normalization (e.g., min-max or learned fusion weights), deduplicates by entity/content ID, and assembles the final ranked, explainable result set.

## AI/ML
Score fusion may use a learned weighting model trained on click/engagement feedback rather than fixed weights, to adapt to which signal (graph vs. vector) is more predictive of relevance over time.

## Infrastructure
Requires low-latency parallel access to both the Graph DB and Vector DB, with circuit breakers so a slow or failed subsystem degrades to single-source retrieval rather than blocking the query.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| POST /retrieval/hybrid | Execute a hybrid graph+vector retrieval query |
| GET /retrieval/explain/{result_id} | Retrieve the explainable retrieval path for a result |
| Knowledge Graph Platform (EPIC-06) | Supplies relationship traversal |
| Vector Memory Platform (Feature 2) | Supplies semantic similarity search |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| HybridQuery | id, user_id, query_text, graph_seed_entity_id, hop_depth, created_at |
| RetrievalResult | id, query_id, source, graph_score, vector_score, fused_score, path_explanation |

---

# 12. Security & Privacy

- Graph traversal respects relationship visibility permissions (no surfacing of connections a user isn't authorized to see)
- Fused results only include content the requesting user has access to on both the graph and vector side
- Explanation metadata does not leak details of entities outside the user's access scope
- Query and result logs encrypted at rest with correlation IDs for traceability

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Hybrid query latency (P50) | <1.5 sec |
| Hybrid query latency (P99) | <4 sec |
| Graph traversal depth supported | Up to 3 hops within latency budget |
| Single-subsystem fallback activation time | <500 ms |

---

# 14. Edge Cases

- Hybrid retrieval ranking disagreement between graph and vector signals produces an unintuitive top result
- Graph traversal timeout on high-degree "super-connector" nodes with thousands of edges
- Vector index and Graph DB fall out of sync (entity deleted in one but not the other)
- Score fusion weighting produces an irrelevant top result despite strong individual signals
- Circular relationship traversal risks infinite-loop expansion without depth limits
- One subsystem (graph or vector) is down, requiring graceful single-source fallback

---

# 15. Dependencies

- Knowledge Graph Platform (EPIC-06) for relationship data
- Vector Memory Platform (Feature 2) for semantic data
- Identity resolution for consistent entity IDs across both systems
- Personalized Ranking Engine (Feature 6) as a downstream consumer

---

# 16. Risks

- Graph and vector systems drifting out of sync degrades fused result quality silently
- Fixed fusion weights may not generalize across query types; learned weights add model maintenance overhead
- High-degree nodes risk runaway traversal cost without careful depth/fanout limits
- Explainability overhead may add latency if not computed efficiently in parallel

---

# 17. Telemetry & Analytics

Track:
- `hybrid_query_executed`
- `hybrid_query_routed_graph_only`
- `hybrid_query_routed_vector_only`
- `hybrid_query_fallback_triggered`
- `hybrid_result_explanation_viewed`
- `graph_vector_sync_drift_detected`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Hybrid query latency (P90) | <3 sec |
| Fused result relevance (vs. single-source baseline) | +15% precision uplift |
| Fallback activation success rate | 100% (no failed queries on single-subsystem outage) |
| Graph/vector sync drift incidents | <1 per month |

---

# 19. Future Enhancements

- Adaptive hop-depth selection based on query complexity
- User-tunable fusion weighting (favor relationships vs. topical relevance)
- Real-time sync verification between Graph DB and Vector DB

---

# 20. Open Questions

- Should fusion weights be global, per-user, or per-query-type?
- What is the maximum acceptable graph traversal depth before diminishing relevance returns?
- How should conflicting graph vs. vector signals be surfaced to end users, if at all?
