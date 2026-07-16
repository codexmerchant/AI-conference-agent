# EPIC12 Feature 5 User Story 1

## Epic
EPIC-12 — Search, Memory & Retrieval

## Feature
FEATURE-05 — Hybrid Graph + Vector Retrieval

---

# User Story

As a user,
I want to find people connected to someone I know who discussed a specific topic,
so that I can identify warm introduction paths instead of relying on cold outreach.

---

# Business Value

- Surfaces non-obvious, high-value connections that neither pure keyword nor pure relationship search would find
- Increases the practical usefulness of the knowledge graph beyond simple contact lookup
- Supports the product's relationship-intelligence positioning, not just note storage
- Improves conversion of captured contacts into actionable follow-up opportunities

---

# Acceptance Criteria

## Functional Criteria

- Hybrid queries combining a relationship seed (e.g., "connected to my colleague") and a topic filter return correctly fused, ranked results
- Purely relational queries route to graph-only retrieval without unnecessary vector overhead
- Purely semantic queries route to vector-only retrieval without unnecessary graph traversal
- Results indicate whether each match came from graph signal, vector signal, or both

## UX Criteria

- Hybrid results render within the performance target with a visible source-match badge
- Users can expand a result to see the connection path and matched content
- Query intent (relational vs. semantic vs. hybrid) is inferred without requiring special query syntax

## Technical Criteria

- Graph and vector scores are normalized onto a comparable scale before fusion
- Deduplication correctly merges entities appearing in both the graph and vector result sets
- Query routing decision is logged for later tuning and debugging

---

# Preconditions

- User has an existing relationship graph with resolved entities
- Vector Memory Platform has indexed relevant topic content
- Both Graph DB and Vector DB are available and healthy

---

# Postconditions

- Hybrid query and fused result set logged for telemetry
- User can act on a surfaced connection (e.g., request an introduction, view full profile)
- Query routing decision recorded for ranking model improvement

---

# Edge Cases

- Hybrid retrieval ranking disagreement between graph and vector signals produces a surprising top result
- Query has no relational component but is misrouted into an unnecessary graph traversal
- Graph traversal timeout on a high-degree "super-connector" node
- Vector index and Graph DB briefly out of sync, causing a mismatched result
- No hybrid results found despite strong signal on one side (e.g., strong topic match but no relational path)
- User's query intent is ambiguous between relational and semantic framing

---

# Telemetry

Track:
- `hybrid_query_executed`
- `hybrid_query_routed_graph_only`
- `hybrid_query_routed_vector_only`
- `hybrid_result_clicked`
- `hybrid_result_explanation_viewed`

---

# Dependencies

- Knowledge Graph Platform (EPIC-06)
- Vector Memory Platform (Feature 2)
- Identity resolution for consistent entity IDs

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify hybrid queries combining relationship and topic filters return correctly fused results
2. Verify purely relational queries route to graph-only retrieval efficiently
3. Verify purely semantic queries route to vector-only retrieval efficiently
4. Verify result badges correctly indicate graph, vector, or both as the match source
5. Verify deduplication merges entities appearing in both result sets correctly
6. Verify graph traversal timeout on a high-degree node degrades gracefully
7. Verify query routing decisions are logged accurately

---

# Story Variation

This is user story variation 1 for Hybrid Graph + Vector Retrieval, focusing on the happy-path experience of finding relational-and-semantic matches.

---

# Notes

- Query routing logic should be tunable without requiring a full redeploy as usage patterns are observed
- Users should never need special query syntax to trigger hybrid retrieval — intent should be inferred automatically
- This feature is a key differentiator versus tools that only offer either graph browsing or keyword search
