# FEATURE-04 — Graph Traversal APIs

## Epic
EPIC-06 — Knowledge Graph Platform

---

# 1. Objective

Provide low-latency, filterable query APIs for traversing the graph — neighbor lookups, multi-hop paths, and subgraph extraction — so agents and features can retrieve relationship context without writing raw graph-database queries.

---

# 2. Problem Statement

The Retrieval Layer (PRD §7) and downstream agents (Follow-Up Agent, Graph Agent) need fast answers to questions like "who introduced me to this person" or "what did I discuss with this contact." Without dedicated traversal APIs, every consumer would hand-roll graph queries against the database, duplicating logic and risking inconsistent or unsafe query patterns against high-degree nodes.

---

# 3. Feature Overview

A traversal service exposing neighbor, N-hop, shortest-path, and subgraph endpoints on top of the graph database, with built-in depth limits, relationship-type filtering, time-range filtering, and pagination to keep queries bounded and performant even on high-degree nodes (e.g., a keynote speaker connected to thousands of attendees).

---

# 4. Key Functionalities

## Neighbor lookup
Return the immediate (1-hop) neighbors of a node, optionally filtered by relationship type.

## N-hop traversal
Traverse up to a configurable depth from a starting node, filtered by relationship type and direction.

## Shortest path query
Find the shortest connecting path between two nodes (e.g., "how am I connected to this person").

## Subgraph extraction
Return a bounded subgraph centered on a node for context assembly or visualization.

## Time-range filtering
Restrict traversal results to edges active within a given time window.

---

# 5. Primary Use Cases

## Use Case 1
The Follow-Up Agent queries "who introduced me to Person X" via a shortest-path query filtered to `introduced_by` edges.

## Use Case 2
The Retrieval Layer fetches a 2-hop subgraph around a contact to ground a conversational answer about shared connections.

## Use Case 3
A user views "mutual connections" with a new contact, computed via a bounded 2-hop neighbor intersection.

---

# 6. User Stories

## User Story 1
As a user,
I want to ask "how am I connected to this person" and get an answer quickly,
so that I can find a warm introduction path before reaching out cold.

### Acceptance Criteria
- Shortest-path queries between two known nodes return within performance targets.
- Results clearly show each hop and the relationship type connecting it.
- No-path-found cases return a clear empty result rather than an error.

## User Story 2
As an operator responsible for platform stability,
I want traversal queries on high-degree nodes to be bounded and safe,
so that a single expensive query cannot degrade the graph database for all users.

### Acceptance Criteria
- Depth and result-size limits are enforced server-side on every traversal request.
- Queries exceeding limits are truncated with a clear `truncated` flag rather than timing out.
- Query cost/latency is logged per request for capacity planning.

---

# 7. User Workflow

1. Consumer (agent, API client) submits a traversal request with a starting node and query parameters.
2. Traversal service validates depth, relationship-type filters, and pagination parameters.
3. Query is executed against the graph database with enforced limits.
4. Results are assembled into nodes/edges with pagination metadata.
5. Truncated or capped results are flagged for the consumer.
6. Response is returned or cached for repeat queries on hot nodes.

---

# 8. UI / UX Requirements

- No direct end-user UI; consumed by other features (recommendations, visualization, agent grounding).
- Internal API explorer/console for engineers to test traversal queries during development.

---

# 9. Technical Requirements

## Frontend
Not applicable directly; downstream UI features (e.g., Graph Visualization APIs, mutual-connections view) consume traversal results.

## Backend
A traversal service layered over the graph database exposing REST endpoints for neighbor, N-hop, shortest-path, and subgraph queries, with query-cost estimation and enforced depth/result limits.

## AI/ML
No inference; traversal is purely structural graph querying, though results may be re-ranked downstream using Graph Scoring output.

## Infrastructure
Read replica or caching layer for hot-node queries (e.g., popular keynote speakers) to protect the primary graph database from repeated expensive traversals.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Graph DB | Executes underlying traversal/path queries |
| Retrieval Layer | Consumes subgraphs to ground agent responses |
| Follow-Up Agent | Consumes path queries for introduction-chain lookups |
| Graph Visualization APIs | Consumes bounded subgraphs for rendering |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| TraversalQuery | query_id, from_node_id, depth, relationship_types[], direction (in\|out\|both), time_range{}, page_token |
| TraversalResult | query_id, nodes[], edges[], truncated (boolean), next_page_token |
| PathQuery | from_node_id, to_node_id, relationship_types[], max_depth |
| PathResult | path_found (boolean), hops[], total_hops |

---

# 12. Security & Privacy

- Traversal results are scoped to nodes/edges the requesting user is authorized to view.
- Cross-user traversal (e.g., viewing another user's private contact graph) is denied by default.
- Query logs exclude sensitive node property values, retaining only IDs and types.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| 1-hop neighbor query latency | <150ms p95 |
| 3-hop bounded traversal latency | <800ms p95 |
| Shortest-path query (depth ≤ 6) | <1.5 sec p95 |

---

# 14. Edge Cases

- Graph traversal timeout on high-degree nodes (e.g., a keynote speaker with thousands of edges).
- Requested depth exceeds the maximum allowed and must be capped.
- No path exists between two requested nodes.
- Cyclic paths causing infinite-loop risk without depth guards.
- Traversal request references a merged or tombstoned node.
- Disconnected subgraph returns an empty but valid result.

---

# 15. Dependencies

- Relationship storage (edge data to traverse)
- Graph schema management (valid relationship types for filtering)
- Graph database with efficient path-query support
- Caching layer for hot-node protection

---

# 16. Risks

- Unbounded queries against high-degree nodes causing database contention.
- Stale cached results diverging from real-time graph state.
- Overly aggressive depth/result limits degrading answer quality for legitimate use cases.

---

# 17. Telemetry & Analytics

Track:
- `graph_traversal_query_executed`
- `graph_traversal_truncated`
- `graph_traversal_timeout`
- `graph_path_query_no_result`
- `graph_traversal_cache_hit`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Traversal query success rate | >99% |
| p95 traversal latency (≤3 hops) | <800ms |
| Cache hit rate on hot nodes | >60% |

---

# 19. Future Enhancements

- Adaptive depth limits based on node degree to balance completeness and latency.
- GraphQL-style query interface for flexible client-defined traversal shapes.
- Precomputed common traversal patterns (e.g., "mutual connections") as materialized views.

---

# 20. Open Questions

- What is the maximum traversal depth allowed by default, and should it vary by consumer (internal agent vs. external API)?
- Should traversal results include soft-deleted/tombstoned edges when explicitly requested for audit purposes?
- How aggressively should hot-node results be cached given the graph updates near-real-time?
