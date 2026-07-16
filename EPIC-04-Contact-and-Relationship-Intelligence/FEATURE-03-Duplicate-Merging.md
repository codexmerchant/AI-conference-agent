# FEATURE-03 — Duplicate Merging

## Epic
EPIC-04 — Contact & Relationship Intelligence

---

# 1. Objective

Provide a safe, reversible workflow for combining two or more duplicate contact records into a single canonical record without losing any interaction history, notes, or source data from either side.

---

# 2. Problem Statement

Identity Resolution catches most duplicates before they're created, but suggested (non-auto) matches, retroactively discovered duplicates, and imported contact lists still leave duplicate records in the system. Left unmerged, they split a person's relationship history across two profiles and corrupt relationship and confidence scores.

---

# 3. Feature Overview

A merge engine that takes two or more contact records, computes a field-by-field resolution (preferring higher-confidence sources, letting the user override), unions all interaction/timeline history under one surviving contact, and preserves the losing record(s) as an immutable "merged-from" reference so the merge can be undone.

---

# 4. Key Functionalities

## Field-level conflict resolution
For each conflicting field (e.g., two different job titles), proposes the higher-confidence value while letting the user pick either or a manual value.

## History and relationship union
All meetings, timeline events, notes, and relationship-score inputs from merged contacts roll up under the surviving contact_id.

## Merge preview
Shows a side-by-side diff of both records and the resulting merged record before the user commits.

## Reversible merge
Retains a snapshot of pre-merge state so a merge can be undone within a configurable window.

## Bulk merge for imports
Supports merging many suggested-duplicate pairs at once after a bulk import (e.g., LinkedIn export).

---

# 5. Primary Use Cases

## Use Case 1
User reviews a "possible duplicate" notification and merges two contacts that Identity Resolution flagged as a suggested (not auto) match.

## Use Case 2
User imports LinkedIn connections and 40 of them overlap with existing contacts; user bulk-merges the overlapping set in one action.

## Use Case 3
User realizes a merge was wrong (two different people with the same name) and undoes it, restoring both original contacts.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want to merge two contact entries that are actually the same person,
so that all my notes and meeting history live in one place.

### Acceptance Criteria
- Merge preview shows both source records and the proposed merged result before commit.
- All meetings, notes, and timeline events from both contacts appear under the merged contact afterward.
- Merge can be undone within 30 days of being performed.

## User Story 2
As a power user,
I want to bulk-merge duplicates found after a contact import,
so that I don't have to review dozens of pairs one at a time.

### Acceptance Criteria
- Bulk merge screen lists all suggested pairs with match confidence and a select-all option.
- User can exclude specific pairs from the bulk operation before confirming.
- Bulk merge completes and reports success/failure count per pair.

---

# 7. User Workflow

1. User opens a suggested-duplicate notification or the duplicates list.
2. System shows a side-by-side merge preview with per-field resolution proposals.
3. User accepts proposed field values or overrides individual fields.
4. User confirms the merge.
5. System designates a surviving contact_id, re-parents all related records, and archives the losing record(s) with a `merged_from` pointer.
6. A merge event is logged with full pre-merge snapshots.
7. User can undo the merge from the merge history within the retention window.

---

# 8. UI / UX Requirements

- Side-by-side diff view highlighting conflicting fields in a distinct color.
- Clear indication of which record will be "primary" (surviving contact_id) vs. absorbed.
- Undo action accessible from both the merge confirmation toast and a persistent merge-history screen.
- Bulk merge screen supports filtering by confidence and per-pair exclude toggle.

---

# 9. Technical Requirements

## Frontend
Merge review screen with field-level diff rendering and drag-free single-tap resolution controls; bulk merge table view with checkbox selection.

## Backend
Merge service exposing `POST /contacts/{id}/merge` that performs the re-parenting transaction atomically (all related records or none), plus `POST /contacts/{id}/merge/undo`.

## AI/ML
Reuses Identity Resolution's match score to pre-populate field-resolution proposals (higher-confidence source wins by default).

## Infrastructure
All re-parenting operations (timeline events, meeting associations, notes, relationship scores) run inside a single database transaction to avoid partial merges; merge snapshots stored in a separate append-only store to support undo.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| `POST /contacts/{id}/merge` | Merge one or more contacts into a primary record |
| `POST /contacts/{id}/merge/undo` | Reverse a merge within the retention window |
| `GET /contacts/{id}/merge-history` | List past merges affecting a contact |
| `POST /contacts/bulk-merge` | Merge multiple suggested-duplicate pairs in one call |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| Contact | ...(as Feature 1), plus merged_from_ids[], merge_status (active/merged) |
| MergeEvent | merge_id, primary_contact_id, merged_contact_ids[], field_resolutions (json), performed_by, performed_at, undo_expires_at |
| MergeSnapshot | snapshot_id, merge_id, contact_id, pre_merge_state (json) |

---

# 12. Security & Privacy

- Merge operations require the same ownership/authorization as editing either source contact.
- Pre-merge snapshots are encrypted at rest and purged after the undo window expires.
- Merge history is auditable but not exposed to any other user (contacts are private to their owning user).

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Single merge transaction time | <1 sec |
| Bulk merge (50 pairs) completion time | <15 sec |
| Undo restoration time | <2 sec |

---

# 14. Edge Cases

- Merging three or more contacts that all reference the same person from different sources.
- Conflicting emails where both are valid (work + personal) and neither should be dropped.
- Undo requested after downstream relationship scores have already been recomputed on the merged record.
- Bulk merge partially fails (some pairs succeed, some fail validation).
- User merges two contacts that are later discovered to be different people.
- Merge attempted on a contact that was already merged into another record.

---

# 15. Dependencies

- Identity Resolution (FEATURE-02), as the source of merge suggestions
- Relationship Scoring (FEATURE-04) and Relationship Timeline (FEATURE-09), whose data must be re-parented correctly
- Company Association (FEATURE-07), if merged contacts point to different company records

---

# 16. Risks

- Irreversible data loss if the undo window or snapshot mechanism has a bug.
- Users merging two genuinely different people due to over-trusting the confidence score.
- Partial-failure states in bulk merge leaving the contact set inconsistent.

---

# 17. Telemetry & Analytics

Track:
- `duplicate_merge_completed`
- `duplicate_merge_undone`
- `duplicate_bulk_merge_completed`
- `duplicate_merge_field_conflict_resolved`
- `duplicate_merge_failed`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Merge completion success rate | >99% |
| Undo usage rate (lower is healthier) | <3% of merges |
| Average time to resolve a suggested duplicate | <20 sec |

---

# 19. Future Enhancements

- Smart bulk-merge auto-grouping across more than two duplicate records at once.
- Merge-quality feedback loop back into the Identity Resolution scoring model.

---

# 20. Open Questions

- What is the right default undo window — 7, 30, or 90 days?
- Should merged-away contact records be permanently deletable by the user, separate from the undo mechanism?
