# EPIC-06 User Stories — Knowledge Graph Platform

This folder contains user stories for EPIC-06 (Knowledge Graph Platform), covering all 9 features with 3 story variations per feature (27 total). Each feature has a user-perspective story (happy-path functionality), an operator-perspective story (reliability, monitoring, auditability), and an admin-perspective story (security, privacy, access control, compliance).

## Feature 1: Graph Schema Management
Defines and versions the canonical node/edge schema (Person, Company, Session, Conversation, Conference, Topic; `met_at`, `spoke_at`, `introduced_by`, `discussed`, `followed_up`) so all producers/consumers stay consistent.

- **EPIC06-feature-1-user-story-1.md** — User: schema evolution is invisible and non-disruptive to existing contacts/relationships.
- **EPIC06-feature-1-user-story-2.md** — Operator: monitored, checkpointed, reversible schema migrations.
- **EPIC06-feature-1-user-story-3.md** — Admin: RBAC-restricted, immutably audited schema governance.

## Feature 2: Entity Linking
Resolves entity mentions from OCR, transcripts, LinkedIn, and CRM sources to a single canonical graph node.

- **EPIC06-feature-2-user-story-1.md** — User: contacts from multiple sources unify automatically without duplicates.
- **EPIC06-feature-2-user-story-2.md** — Operator: match-rate and review-queue monitoring to catch quality regressions.
- **EPIC06-feature-2-user-story-3.md** — Admin: encrypted PII handling and right-to-be-forgotten cascades.

## Feature 3: Relationship Storage
Durably persists `met_at`/`spoke_at`/`introduced_by`/`discussed`/`followed_up` edges with provenance and idempotent writes.

- **EPIC06-feature-3-user-story-1.md** — User: deduplicated, trustworthy interaction history across capture sources.
- **EPIC06-feature-3-user-story-2.md** — Operator: idempotent, batch-friendly writes that survive conference-hour bursts.
- **EPIC06-feature-3-user-story-3.md** — Admin: access-controlled soft-delete and retention-policy compliance.

## Feature 4: Graph Traversal APIs
Provides neighbor, N-hop, shortest-path, and subgraph query endpoints for agents and features.

- **EPIC06-feature-4-user-story-1.md** — User: fast "how am I connected to X" introduction-path discovery.
- **EPIC06-feature-4-user-story-2.md** — Operator: bounded, cached queries that protect high-degree nodes.
- **EPIC06-feature-4-user-story-3.md** — Admin: strict per-user/per-tenant authorization on every traversal result.

## Feature 5: Temporal Relationship Modeling
Models relationships as time-bound, decaying, event-sourced facts rather than static edges.

- **EPIC06-feature-5-user-story-1.md** — User: relationship timelines and warmth trends that guide reconnection.
- **EPIC06-feature-5-user-story-2.md** — Operator: reliable, idempotent decay jobs and correct out-of-order event handling.
- **EPIC06-feature-5-user-story-3.md** — Admin: access-controlled historical/as-of queries consistent with deletion policy.

## Feature 6: Interaction Graph Updates
The Graph Agent's near-real-time, event-driven pipeline that keeps the graph current during a live conference.

- **EPIC06-feature-6-user-story-1.md** — User: graph reflects a conversation within moments of it ending.
- **EPIC06-feature-6-user-story-2.md** — Operator: lag, dead-letter queue, and burst-handling monitoring.
- **EPIC06-feature-6-user-story-3.md** — Admin: least-privilege, attributable, anomaly-monitored automated writes.

## Feature 7: Graph Scoring
Computes explainable warmth/priority/relevance scores to rank contacts and topics.

- **EPIC06-feature-7-user-story-1.md** — User: ranked, explainable contact prioritization after a conference.
- **EPIC06-feature-7-user-story-2.md** — Operator: incremental, recompute-storm-safe, drift-monitored scoring.
- **EPIC06-feature-7-user-story-3.md** — Admin: versioned models, attributed overrides, defensible dispute resolution.

## Feature 8: Network Analysis
Runs graph-wide algorithms — centrality, community detection, mutual connections — at conference scale.

- **EPIC06-feature-8-user-story-1.md** — User: mutual connections and human-readable clusters around a new contact.
- **EPIC06-feature-8-user-story-2.md** — Operator: isolated batch compute with cached, freshness-tracked results.
- **EPIC06-feature-8-user-story-3.md** — Admin: consent-aware, de-anonymization-safe organizer reports.

## Feature 9: Graph Visualization APIs
Serves visualization-ready, bounded graph payloads for interactive network maps.

- **EPIC06-feature-9-user-story-1.md** — User: interactive, zoomable network map with expandable clusters.
- **EPIC06-feature-9-user-story-2.md** — Operator: bounded payloads and monitored client render performance.
- **EPIC06-feature-9-user-story-3.md** — Admin: authorization-consistent payloads and gated exports.

## Key Themes

- **Trustworthy identity first**: nearly every feature depends on Entity Linking producing stable node identities — schema, storage, traversal, and scoring all assume duplicate-free entities.
- **Freshness under burst load**: conference-hour traffic spikes (keynote endings, mass check-ins) are a recurring stress scenario across storage, updates, scoring, and network analysis.
- **Derived state must be recomputable**: scores and decayed weights are never source-of-truth — they must be fully reconstructable from relationship event history.
- **Authorization enforced once, applied everywhere**: traversal, network analysis, and visualization all reuse the same per-user/per-tenant authorization boundary rather than each inventing their own.
- **Privacy by aggregation, not by redaction**: consent and access filtering happens before data is combined or exported, not as a post-hoc cleanup step.
