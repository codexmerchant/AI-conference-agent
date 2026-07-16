# EPIC04 Feature 3 User Story 1

## Epic
EPIC-04 — Contact & Relationship Intelligence

## Feature
FEATURE-03 — Duplicate Merging

---

# User Story

As a user,
I want to merge two contact entries that are actually the same person into one record,
so that all my notes, meetings, and history with them live in a single place.

---

# Business Value

- Consolidates fragmented relationship history into a single trustworthy profile
- Removes the confusion of deciding which of two records to update or follow up from
- Improves the accuracy of relationship scoring and timeline features that depend on a unified record
- Gives users a safety net (undo) that makes them comfortable merging without fear of losing data

---

# Acceptance Criteria

## Functional Criteria
- Merge preview shows both source records side by side with per-field conflict highlighting
- User can accept the proposed (higher-confidence) value or override any field individually
- All meetings, notes, and timeline events from both contacts appear under the merged contact afterward
- Merge can be undone within the configured retention window, restoring both original records

## UX Criteria
- Merge is reachable both from a suggested-duplicate notification and directly from a contact's detail view
- Conflicting fields are visually distinct from matching fields in the preview
- Confirmation step clearly states which record will be the surviving one

## Technical Criteria
- `POST /contacts/{id}/merge` performs the merge as a single atomic transaction
- Re-parented data (meetings, notes, scores, timeline) is complete and consistent post-merge
- Pre-merge state is snapshotted for undo before any destructive write occurs

---

# Preconditions

- Two or more contacts exist and are owned by the requesting user
- At least one is flagged as a possible duplicate, or the user has manually selected two contacts to merge
- User has edit permission on both contacts

---

# Postconditions

- A single surviving contact record contains the unioned data from all merged contacts
- Merged-away records are archived with a pointer to the surviving contact, not deleted
- A merge event with pre-merge snapshots is logged for the undo window

---

# Edge Cases

- Merging three or more contacts that all represent the same person from different sources
- Conflicting emails where both are legitimately valid (work and personal)
- Undo requested after downstream relationship scores have already recomputed on the merged record
- User merges two contacts that turn out to be different people
- Merge attempted on a contact that has already been merged into another record
- Field conflict where neither source has higher confidence than the other

---

# Telemetry

Track:
- `duplicate_merge_completed`
- `duplicate_merge_undone`
- `duplicate_merge_field_conflict_resolved`
- `duplicate_merge_preview_viewed`

---

# Dependencies

- Identity Resolution (FEATURE-02)
- Relationship Scoring (FEATURE-04)
- Relationship Timeline (FEATURE-09)

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify merge preview correctly identifies conflicting vs. matching fields
2. Verify accepting a proposed field value applies it to the merged record
3. Verify overriding a field value with a manual entry is respected in the merged record
4. Verify all meetings and notes from both contacts appear on the merged contact
5. Verify merge completes as a single atomic operation (no partial state on failure)
6. Verify undo within the retention window fully restores both original contacts
7. Verify undo after the retention window is correctly disallowed
8. Verify merging an already-merged contact is handled gracefully with a clear error

---

# Story Variation

This is user story variation 1 for Duplicate Merging, focusing on the happy-path merge and undo experience.

---

# Notes

- Merge is the fallback safety net for the cases Identity Resolution didn't auto-resolve or only suggested
- Undo is what makes users trust merge enough to actually use it instead of leaving duplicates in place
