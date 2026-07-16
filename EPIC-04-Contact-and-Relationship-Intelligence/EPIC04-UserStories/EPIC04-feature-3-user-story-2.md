# EPIC04 Feature 3 User Story 2

## Epic
EPIC-04 — Contact & Relationship Intelligence

## Feature
FEATURE-03 — Duplicate Merging

---

# User Story

As an operator,
I want merge operations to be transactionally reliable and fully observable, including bulk merges,
so that a failed or partial merge never leaves the contact graph in an inconsistent state.

---

# Business Value

- Prevents partial-merge corruption, which is far more damaging than a duplicate contact
- Enables safe support of bulk-merge workflows after large contact imports
- Gives operators the visibility to catch and remediate merge failures before they compound
- Reduces the risk surface of one of the few genuinely destructive operations in the product

---

# Acceptance Criteria

## Functional Criteria
- Every merge (single or bulk) runs inside a transaction that either fully commits or fully rolls back
- Bulk merge reports per-pair success/failure rather than an all-or-nothing result
- Merge failures are retriable without re-triggering already-successful pairs in the same batch
- Merge transaction duration and failure rate are tracked as operational metrics

## UX Criteria
- Operator dashboard shows merge failure rate and average transaction duration
- Bulk merge failures are itemized with enough detail to diagnose (which pair, which step failed)
- Alerting is configurable on merge failure-rate thresholds

## Technical Criteria
- Re-parenting of meetings, notes, scores, and timeline events happens within the same transaction boundary as the contact-record merge itself
- Bulk merge processes pairs independently so one failure doesn't block the rest of the batch
- Merge snapshots used for undo are written before the destructive re-parenting step, not after

---

# Preconditions

- Transactional database support for multi-table re-parenting operations
- Monitoring and alerting infrastructure is active
- Bulk merge queue/worker infrastructure is provisioned

---

# Postconditions

- All completed merges are fully consistent across contact, meeting, score, and timeline data
- Failed merges are logged with enough detail for retry or manual remediation
- Bulk merge batch results are queryable after completion

---

# Edge Cases

- Bulk merge of 50+ pairs where the underlying database experiences a transient connection failure mid-batch
- Two merges targeting overlapping contacts are submitted concurrently
- A re-parenting step succeeds for meetings but fails for relationship scores within the same merge
- Merge worker crashes mid-transaction and must recover cleanly on restart
- Bulk merge includes a pair where one contact was deleted between suggestion and execution
- High-volume bulk merge following a large LinkedIn import stresses the merge queue

---

# Telemetry

Track:
- `duplicate_merge_transaction_duration_ms`
- `duplicate_merge_failed`
- `duplicate_bulk_merge_batch_completed`
- `duplicate_merge_retry_triggered`
- `duplicate_merge_concurrent_conflict_detected`

---

# Dependencies

- Transactional database/storage layer
- Bulk merge queue and worker infrastructure
- Monitoring and alerting system
- Merge snapshot storage (undo support)

---

# Priority

High

---

# Estimated Complexity

Medium-High

---

# QA Test Scenarios

1. Verify a merge that fails partway through fully rolls back with no orphaned data
2. Verify bulk merge reports accurate per-pair success/failure status
3. Verify a failed pair in a bulk batch can be retried without affecting already-merged pairs
4. Verify concurrent merge requests on overlapping contacts are safely serialized or rejected
5. Verify merge snapshot is written before any destructive re-parenting occurs
6. Verify worker crash recovery does not leave a merge half-applied
7. Verify merge transaction duration is recorded accurately under load
8. Verify alert fires when merge failure rate exceeds the configured threshold

---

# Story Variation

This is user story variation 2 for Duplicate Merging, focusing on transactional reliability and bulk-operation observability.

---

# Notes

- Merge is one of the few operations in EPIC-04 that mutates data across many related entities at once — transactional discipline here is non-negotiable
- Bulk merge should be treated as a first-class operational workload, not an edge case of single merge
