# EPIC04 Feature 9 User Story 2

## Epic
EPIC-04 — Contact & Relationship Intelligence

## Feature
FEATURE-09 — Relationship Timeline

---

# User Story

As an operator,
I want timeline aggregation and merge re-indexing to be reliable and performant at scale,
so that long-history contacts and high-volume merges never produce a slow, incomplete, or corrupted timeline.

---

# Business Value

- Protects the accuracy of the product's flagship long-term-memory feature as data volume grows over years of use
- Ensures merge operations (Feature 3) don't silently degrade timeline completeness
- Keeps timeline load performant even for power users who attend many conferences per year
- Gives operators the tools to detect and fix aggregation gaps before users notice missing history

---

# Acceptance Criteria

## Functional Criteria
- Timeline aggregation correctly pulls from all contributing event sources (meetings, follow-ups, knowledge-graph edges) with no silent gaps
- Merge re-indexing completes within 5 seconds and is verified for completeness (event count before equals event count after, per source)
- Timeline pagination/virtualization performs correctly for contacts with thousands of events
- Aggregation failures (e.g., a source service timeout) are retried and logged, not silently dropped

## UX Criteria
- Operator dashboard shows timeline aggregation latency and failure rate
- Merge re-indexing completeness checks are visible and alertable on mismatch
- Long-history contact load performance is tracked as a distinct metric from typical contacts

## Technical Criteria
- Timeline events are stored in an append-only log keyed by contact_id for efficient chronological retrieval
- Merge re-indexing is idempotent and safely retriable if interrupted
- Aggregation queries are paginated server-side, not loaded in full before rendering

---

# Preconditions

- Timeline event log infrastructure is provisioned
- Merge re-indexing job is integrated with Duplicate Merging's completion event
- Monitoring and alerting have access to timeline aggregation metrics

---

# Postconditions

- Timeline aggregation completeness is verifiable and monitored
- Merge re-indexing failures are caught and retried automatically
- Long-history contact timelines remain performant

---

# Edge Cases

- A merge re-indexing job is interrupted partway through a contact with thousands of pre-merge events
- A source service (e.g., Follow-Up/Output Layer) is temporarily unavailable during timeline aggregation
- Two merges affecting overlapping contacts are processed concurrently
- A power-user contact accumulates events across ten or more conferences over several years
- Timeline pagination boundary splits a set of same-timestamp events inconsistently across pages
- Aggregation completeness check itself times out on an unusually large contact

---

# Telemetry

Track:
- `relationship_timeline_aggregation_latency_ms`
- `relationship_timeline_reindex_duration_ms`
- `relationship_timeline_reindex_completeness_check`
- `relationship_timeline_aggregation_failed`
- `relationship_timeline_pagination_performance`

---

# Dependencies

- Duplicate Merging (FEATURE-03), triggers re-indexing
- Meeting Association and Follow-Up/Output Layer, primary event sources
- Monitoring and alerting system

---

# Priority

High

---

# Estimated Complexity

Medium-High

---

# QA Test Scenarios

1. Verify timeline aggregation pulls events correctly from all contributing sources
2. Verify merge re-indexing completes within the 5-second target for a typical contact
3. Verify re-indexing completeness check correctly detects a missing or duplicated event
4. Verify a re-indexing job interrupted mid-run resumes safely on retry
5. Verify a source service timeout triggers a retry rather than a silent gap in the timeline
6. Verify pagination performs correctly for a contact with thousands of events
7. Verify concurrent merges affecting overlapping contacts do not corrupt either timeline
8. Verify same-timestamp events are handled consistently across pagination boundaries

---

# Story Variation

This is user story variation 2 for Relationship Timeline, focusing on aggregation reliability, merge re-indexing integrity, and performance at scale.

---

# Notes

- Timeline correctness after a merge is one of the best end-to-end tests of whether Feature 3's re-parenting guarantees actually hold
- Long-history performance will only become more important as the product's oldest users accumulate years of data
