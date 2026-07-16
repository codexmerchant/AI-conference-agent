# FEATURE-06 — Bulk Tagging and Classification

## Epic
EPIC-14 — Desktop Analysis Workspace

---

# 1. Objective

Let users select large sets of contacts, sessions, or interactions and apply, remove, or correct tags and classifications in a single operation, so AI classification errors and organizational needs can be handled at scale rather than one record at a time.

---

# 2. Problem Statement

AI classification (interaction type, topic tags, relationship category) is not always correct, and users returning from a large conference may have hundreds of contacts or interactions needing the same correction or organizational tag; there is no way to act on many records at once, making cleanup impractical on mobile or record-by-record desktop editing.

---

# 3. Feature Overview

A table/grid workspace with multi-select, a tag taxonomy manager, and bulk-apply/remove/reclassify actions that run as trackable background operations with progress, partial-failure handling, and undo.

---

# 4. Key Functionalities

## Multi-select data grid
Table view of contacts, sessions, or interactions with checkboxes, select-all, and filter-based selection (e.g., "select all from this conference").

## Bulk tag apply/remove
Apply or remove one or more tags across the entire selection in a single action.

## Bulk reclassification
Change interaction type, relationship category, or other classification fields across the selection, overriding AI-assigned values.

## Tag taxonomy manager
Create, rename, merge, or retire tags, with usage counts to guide cleanup decisions.

## Operation history and undo
Every bulk operation is logged and can be undone as a single reversible action.

---

# 5. Primary Use Cases

## Use Case 1
User returns from a conference and bulk-tags all 200 contacts made there with the conference name and a "warm lead" tag.

## Use Case 2
User notices the AI miscategorized a batch of "chance encounter" interactions as "scheduled meeting" and bulk-reclassifies them.

## Use Case 3
User merges two near-duplicate tags ("VC" and "Venture Capital") created over time into a single canonical tag.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want to select many contacts or interactions and tag them all at once,
so that I can organize my conference data without editing each record individually.

### Acceptance Criteria
- User can multi-select records via checkboxes or a filter-based "select all matching" action.
- User can apply or remove one or more tags across the entire selection in one action.
- Applied tags are immediately visible on each affected record.

## User Story 2
As a power user,
I want to bulk-correct AI misclassifications across many records,
so that I don't have to fix the same recurring error one record at a time.

### Acceptance Criteria
- User can select records sharing an incorrect classification and reassign the correct value in bulk.
- The system shows how many records were affected and how many failed, if any.
- Reclassified records are excluded from future automated reclassification unless explicitly reset.

---

# 7. User Workflow

1. User opens a grid view of contacts, sessions, or interactions.
2. User multi-selects records manually or via a filter-based selection.
3. User chooses a bulk action: apply tag, remove tag, or reclassify.
4. System previews the number of affected records before confirming.
5. Operation runs as a background job with a visible progress indicator.
6. User reviews the completion summary, including any partial failures.
7. User can undo the entire operation from the operation history if needed.

---

# 8. UI / UX Requirements

- Persistent selection count and "select all N matching filter" affordance.
- Confirmation step showing scope of the bulk action before execution.
- Non-blocking progress indicator for long-running operations.
- Clear partial-failure reporting (e.g., "198 of 200 updated, 2 failed — view details").
- One-click undo from a recent-operations list.

---

# 9. Technical Requirements

## Frontend
SwiftUI virtualized data grid supporting large row counts, multi-select state management, and an operation-progress toast/panel independent of the main view so users can keep working while a bulk job runs.

## Backend
Bulk operations are processed asynchronously as queued jobs against the same contact/session/interaction services used elsewhere, with per-record success/failure tracking and idempotent retry.

## AI/ML
Consumes existing classification confidence scores to help users identify likely-incorrect records for bulk correction; manual reclassifications can be fed back as labeled correction signal.

## Infrastructure
Large selections are processed in batches server-side to avoid long-held locks or timeouts; job status is polled or pushed to the desktop client until completion.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| `POST /desktop/bulk-operations` | Submit a bulk tag/reclassify operation |
| `GET /desktop/bulk-operations/{id}/status` | Poll progress and per-record results |
| `POST /desktop/bulk-operations/{id}/undo` | Reverse a completed bulk operation |
| `POST /desktop/tags` | Create or update a tag definition |
| `POST /desktop/tags/merge` | Merge two tags into one |
| Contact & Relationship Intelligence (EPIC-04) | Target entity store for contact-level operations |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| BulkOperation | id, user_id, entity_type, entity_ids, operation_type, tag_ids, status, success_count, failure_count, created_at, completed_at |
| BulkOperationResult | id, bulk_operation_id, entity_id, status, error_message |
| TagDefinition | id, name, category, color, created_by, usage_count, merged_into_id |

---

# 12. Security & Privacy

- Bulk operations are scoped to entities the requesting user owns or has edit permission on; unauthorized records are excluded and reported, not silently skipped.
- Tag taxonomy changes (merge/retire) are audit-logged with the acting user.
- Undo operations require the same authorization as the original action.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Bulk operation submission acknowledgment | <500 ms |
| Processing throughput | ≥50 records/sec |
| Progress status refresh | every 1–2 sec |
| Undo of a 500-record operation | <10 sec |

---

# 14. Edge Cases

- Bulk tagging operation submitted against a 500+ contact selection times out or partially completes.
- Some selected records are locked or being edited elsewhere (e.g., mobile) during the bulk operation.
- Tag taxonomy conflict from creating a tag name that already exists under a different casing.
- User attempts to undo a bulk operation after a downstream report has already been generated using the changed data.
- Selection includes records the user does not have permission to modify.
- Operation is cancelled by the user mid-flight after partial completion.

---

# 15. Dependencies

- EPIC-04 Contact & Relationship Intelligence (contact records)
- EPIC-05 Session & Conference Intelligence (interaction/session records)
- EPIC-03 Context & Intelligence Engine (source classification and confidence scores)
- Background job processing infrastructure

---

# 16. Risks

- Users bulk-applying incorrect tags or reclassifications at scale, requiring reliable undo.
- Long-running bulk jobs on very large selections degrading perceived responsiveness.
- Tag taxonomy sprawl if merge/retire tools aren't used, reducing search/filter usefulness over time.

---

# 17. Telemetry & Analytics

Track:
- `bulk_operation_submitted`
- `bulk_operation_completed`
- `bulk_operation_partial_failure`
- `bulk_operation_undone`
- `tag_created`
- `tag_merged`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Bulk operations completing without partial failure | >95% |
| Median time to complete a 200-record operation | <15 sec |
| Undo usage rate on bulk operations | <5% |
| Tag taxonomy duplicate rate after merge tooling adoption | decreasing trend |

---

# 19. Future Enhancements

- Rule-based auto-tagging ("always tag contacts from conference X with Y").
- Bulk operations schedulable for off-peak processing on very large datasets.
- Suggested bulk corrections based on detected classification drift.

---

# 20. Open Questions

- Should bulk operations be capped at a maximum selection size, or fully asynchronous with no cap?
- How long should undo remain available after a bulk operation completes?
- Should tag merges be reversible, given they affect potentially thousands of records?
