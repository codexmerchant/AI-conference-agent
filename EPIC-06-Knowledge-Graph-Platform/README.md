# EPIC-06 — Knowledge Graph Platform Feature Files

## Objective
Create the central graph intelligence layer that stores People, Companies, Sessions, Conversations, Conferences, and Topics as nodes, and `met_at`, `spoke_at`, `introduced_by`, `discussed`, and `followed_up` as relationships — grounding retrieval, scoring, and agent decisions across the platform.

## Feature Files

| Feature | File |
|---|---|
| FEATURE-01 — Graph Schema Management | `FEATURE-01-Graph-Schema-Management.md` |
| FEATURE-02 — Entity Linking | `FEATURE-02-Entity-Linking.md` |
| FEATURE-03 — Relationship Storage | `FEATURE-03-Relationship-Storage.md` |
| FEATURE-04 — Graph Traversal APIs | `FEATURE-04-Graph-Traversal-APIs.md` |
| FEATURE-05 — Temporal Relationship Modeling | `FEATURE-05-Temporal-Relationship-Modeling.md` |
| FEATURE-06 — Interaction Graph Updates | `FEATURE-06-Interaction-Graph-Updates.md` |
| FEATURE-07 — Graph Scoring | `FEATURE-07-Graph-Scoring.md` |
| FEATURE-08 — Network Analysis | `FEATURE-08-Network-Analysis.md` |
| FEATURE-09 — Graph Visualization APIs | `FEATURE-09-Graph-Visualization-APIs.md` |

## Implementation Notes
- The graph database is the system of record for relationships; all writes must go through Relationship Storage's idempotent upsert path — no feature should write edges directly.
- Graph schema changes are versioned and backward-compatible by default; breaking changes require a migration and a deprecation window before old readers are cut off.
- Entity Linking must run (or at least deterministic-match) before any relationship write, since edges are only as trustworthy as the node identity they connect.
- High-degree nodes (popular speakers, large companies) require enforced traversal depth/result limits and caching — unbounded queries against them are the platform's most likely source of latency incidents.
- Scoring and temporal decay are derived state, not source-of-truth data; they must be fully recomputable from the relationship event history at any time.
