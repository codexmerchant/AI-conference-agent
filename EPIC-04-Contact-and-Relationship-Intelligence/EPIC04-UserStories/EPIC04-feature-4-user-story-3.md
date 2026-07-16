# EPIC04 Feature 4 User Story 3

## Epic
EPIC-04 — Contact & Relationship Intelligence

## Feature
FEATURE-04 — Relationship Scoring

---

# User Story

As an admin,
I want relationship scoring data to be strictly access-controlled and derived only from consented interaction data,
so that the feature never scores a relationship using data the user was never authorized to capture in the first place.

---

# Business Value

- Ensures scoring inputs never include interaction data captured without valid recording consent
- Prevents relationship scores from being visible to anyone other than the owning user
- Provides an audit trail linking every score back to the specific consented interactions that produced it
- Supports data-subject deletion requests by ensuring score history is fully removable

---

# Acceptance Criteria

## Functional Criteria
- Scoring pipeline excludes any interaction event lacking valid recording/consent status
- Relationship scores and their component breakdowns are visible only to the owning user, never to the scored contact or other users
- Deleting a contact or an underlying interaction removes or recomputes affected score history, not leaving orphaned data
- Score computation audit trail links each score to the specific interaction events that contributed to it

## UX Criteria
- Admin console can trace a specific score back to its contributing interactions for a compliance or dispute review
- Data deletion requests affecting scoring inputs are confirmed complete, including score history
- Access to another user's relationship-score data is structurally prevented, not just UI-hidden

## Technical Criteria
- Consent status is checked at the interaction-event level before it is allowed to feed the scoring pipeline
- Score history storage supports selective deletion tied to specific interaction or contact deletion
- Data access layer enforces per-user scoping on all score read paths

---

# Preconditions

- Consent status is tracked and available on every interaction event
- Data deletion workflow has a defined path for scoring data
- RBAC and data-scoping are enforced at the access layer

---

# Postconditions

- No score reflects any interaction lacking valid consent
- Deleted interactions or contacts no longer contribute to any score, current or historical
- Access to score data remains correctly scoped to the owning user at all times

---

# Edge Cases

- A recording's consent status is revoked after it already contributed to a computed score
- A contact deletion request arrives mid-recompute, requiring the in-flight computation to be aborted or corrected
- An interaction event is missing a consent flag due to a legacy data-migration gap
- An admin needs to trace a disputed score back to its exact contributing interactions
- Score history must be selectively purged for one interaction without affecting the rest of a contact's score trend
- A user requests full data export including their relationship-score history and its derivation

---

# Telemetry

Track:
- `relationship_score_consent_check_failed`
- `relationship_score_excluded_unconsented_interaction`
- `relationship_score_deletion_cascade_completed`
- `relationship_score_access_denied`
- `relationship_score_audit_trace_generated`

---

# Dependencies

- Consent tracking on interaction/recording events (EPIC-01/EPIC-02)
- Data deletion and export workflow engine
- Role-based access control (RBAC) system
- Score history storage with selective deletion support

---

# Priority

High

---

# Estimated Complexity

High

---

# QA Test Scenarios

1. Verify an interaction lacking valid consent is excluded from score computation
2. Verify revoking consent on a past recording triggers a recompute that removes its contribution
3. Verify deleting a contact removes its score and score history completely
4. Verify deleting a single interaction correctly adjusts the affected score without deleting unrelated history
5. Verify score data is inaccessible to any user other than the contact's owner
6. Verify an admin can generate a full audit trace from a score back to its contributing interactions
7. Verify a legacy interaction missing a consent flag is treated as non-consenting by default (fail closed)
8. Verify a full data export includes score history and its derivation in a compliance-usable format

---

# Story Variation

This is user story variation 3 for Relationship Scoring, focusing on consent enforcement, data isolation, and compliance-grade auditability.

---

# Notes

- Consent enforcement here must fail closed: any ambiguity about consent status should exclude the interaction from scoring, not include it
- This is the compliance backbone that keeps the "helpful CRM" feature from becoming a surveillance liability
