# EPIC04 Feature 9 User Story 3

## Epic
EPIC-04 — Contact & Relationship Intelligence

## Feature
FEATURE-09 — Relationship Timeline

---

# User Story

As an admin,
I want relationship timeline data to inherit strict consent boundaries and support complete, verifiable deletion,
so that a persistent interaction history never outlives the consent or retention rights it was built on.

---

# Business Value

- Ensures the product's flagship "persistent memory" feature doesn't become a persistent liability when consent is revoked or a deletion request arrives
- Provides an auditable guarantee that deleted source records don't leave orphaned timeline traces
- Supports data-subject rights (access, deletion) specifically for long-lived, cross-conference interaction history
- Protects against timeline entries surfacing content from a recording that should have been excluded

---

# Acceptance Criteria

## Functional Criteria
- Timeline entries are deleted or anonymized when their source record is deleted, never retained as an orphaned summary
- A full data export of a contact's timeline is available for data-subject access requests
- Deleting a contact removes its entire timeline, with no residual events queryable by any path
- Timeline entries inherit the consent status of their source recording; a consent revocation cascades to remove the affected entry

## UX Criteria
- Admin console can generate a complete timeline export for a specific contact on request
- Deletion confirmation clearly states that timeline history is included in the scope of the deletion
- Consent-revocation cascades affecting the timeline are visible in an auditable log, not silent

## Technical Criteria
- Timeline event deletion is enforced via the same cascade logic as the underlying source record (transcript, meeting association, follow-up)
- Deletion completeness is verifiable — a post-deletion query returns zero events for the deleted contact or source
- Timeline export format is structured and suitable for compliance/data-portability requirements

---

# Preconditions

- Cascading deletion logic between source records and timeline events is implemented
- Data export tooling supports timeline-specific structured output
- Consent-revocation cascade from Meeting Association (Feature 6) reaches the timeline layer

---

# Postconditions

- No timeline entry references a deleted or consent-revoked source record
- Deletion and export requests affecting timeline data are fully auditable
- Timeline data fully complies with the account's retention and data-subject rights policies

---

# Edge Cases

- A source transcript is deleted after its timeline summary has already been viewed and cached client-side
- A consent revocation cascades through Meeting Association and must also remove the corresponding timeline entry
- A data-subject deletion request arrives while a merge re-indexing job (Story 2) is in progress for the same contact
- An export request is made for a contact with a multi-year, multi-conference timeline history
- A timeline entry references a third-party introduction whose own source data has separate retention rules
- Verification query after deletion must confirm zero residual entries across all read paths, including any cache

---

# Telemetry

Track:
- `relationship_timeline_entry_deleted_via_cascade`
- `relationship_timeline_consent_revocation_cascade`
- `relationship_timeline_export_generated`
- `relationship_timeline_deletion_verified`

---

# Dependencies

- Meeting Association (FEATURE-06), source of consent-linked events
- Data deletion and export workflow engine
- Duplicate Merging (FEATURE-03), for deletion-during-reindex coordination
- Immutable audit log storage

---

# Priority

High

---

# Estimated Complexity

High

---

# QA Test Scenarios

1. Verify deleting a source transcript removes its corresponding timeline entry
2. Verify a consent revocation on a recording cascades to remove the affected timeline entry
3. Verify deleting a contact removes its entire timeline with zero residual entries on re-query
4. Verify a full timeline export is generated correctly for a data-subject access request
5. Verify deletion completeness is verifiable via a post-deletion query across all read paths, including cache
6. Verify a deletion request arriving mid-reindex is handled correctly without leaving orphaned entries
7. Verify export format meets structured data-portability requirements
8. Verify a third-party introduction entry's separate retention rules are respected independently of the primary contact's deletion

---

# Story Variation

This is user story variation 3 for Relationship Timeline, focusing on consent-linked deletion, data-subject rights, and verifiable compliance.

---

# Notes

- Because the timeline aggregates data from nearly every other EPIC-04 feature, its deletion cascade is the most complex compliance surface in the epic and deserves dedicated integration testing
- Verification queries (proving zero residual data) should be treated as a required deliverable, not an afterthought
