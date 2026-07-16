# EPIC06 Feature 7 User Story 1

## Epic
EPIC-06 — Knowledge Graph Platform

## Feature
FEATURE-07 — Graph Scoring

---

# User Story

As a user,
I want my contacts ranked by how strong and recent my relationship with them is,
so that after a conference with 150 new contacts, I know exactly who to follow up with first.

---

# Business Value

- Reduces decision fatigue when facing a large number of new contacts after a conference.
- Increases follow-up conversion by directing attention to the highest-value relationships first.
- Makes the "warmth" of a connection tangible instead of relying on the user's memory.
- Provides a foundation for smarter, prioritized follow-up drafting by other agents.

---

# Acceptance Criteria

## Functional Criteria
- Every contact with at least one interaction has a computed warmth score.
- Scores update automatically as new interactions occur, without requiring a manual recalculation request.
- The user can view a simple explanation of the top factors behind a contact's score.

## UX Criteria
- The contact list is sortable/filterable by score.
- Score explanations use plain language (e.g., "met twice, exchanged a follow-up") rather than raw factor weights.

## Technical Criteria
- Score computation reuses decay-adjusted weights from Temporal Relationship Modeling.
- Score and factor breakdown are persisted together so historical scores remain explainable.
- Cold-start contacts (single interaction, no reciprocity yet) receive a sensible default score rather than an error or zero.

---

# Preconditions

- The user has at least one contact with recorded interaction history.
- Graph scoring service is operational and subscribed to relevant graph update events.
- Temporal relationship modeling has computed decay-adjusted weights for relevant edges.

---

# Postconditions

- The user's contact list reflects up-to-date warmth scores.
- Score factor breakdowns are available for any scored contact on request.
- Newly captured contacts receive an initial score shortly after their first interaction is recorded.

---

# Edge Cases

- A contact has exactly one interaction and no reciprocal follow-up yet (cold-start scoring).
- Two contacts have identical interaction counts but very different recency, and must be ranked differently.
- A user manually boosts a contact's priority, and the display must reflect both the structural score and the override.
- A large batch of new contacts from a single conference all need scores computed within a short window.

---

# Telemetry

Track:
- `relationship_score_computed`
- `score_recompute_triggered`
- `score_breakdown_viewed`
- `contact_list_sorted_by_score`

---

# Dependencies

- Relationship storage and temporal relationship modeling (scoring inputs)
- Interaction graph updates (trigger source for recomputation)
- Contact list UI

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify a warmth score is computed for every contact with at least one interaction.
2. Verify scores update automatically after a new interaction is recorded.
3. Verify the factor breakdown is shown in understandable, plain-language form.
4. Verify cold-start contacts receive a sensible default score, not an error.
5. Verify contacts with identical interaction counts but different recency rank differently.
6. Verify a manual priority boost is reflected alongside the structural score.
7. Verify a batch of new contacts from one conference all receive scores within the target latency.

---

# Story Variation

This is user story variation 1 for Graph Scoring, focusing on the happy-path experience of ranked, explainable contact prioritization after a conference.

---

# Notes

- Plain-language factor explanations are essential for user trust — raw weighted scores alone will not be compelling.
- Cold-start scoring behavior should be explicitly designed rather than left as an incidental edge case.
