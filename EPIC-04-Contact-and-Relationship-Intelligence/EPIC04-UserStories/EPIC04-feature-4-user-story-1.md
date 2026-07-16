# EPIC04 Feature 4 User Story 1

## Epic
EPIC-04 — Contact & Relationship Intelligence

## Feature
FEATURE-04 — Relationship Scoring

---

# User Story

As a user,
I want to see a relationship strength score on each of my contacts,
so that I know who in my network deserves the most follow-up attention.

---

# Business Value

- Turns a flat contact list into a prioritized network view
- Helps users focus limited follow-up time on the relationships most worth investing in
- Surfaces relationships that are quietly cooling before they go cold entirely
- Makes the compounding value of repeated conference attendance visible to the user

---

# Acceptance Criteria

## Functional Criteria
- Every contact with at least one recorded interaction has a visible relationship score
- Score combines interaction frequency, recency, conversation depth, and reciprocity (follow-up sent/replied)
- Score recomputes within minutes of a new interaction being recorded
- Score is shown with a plain-language tier label, not just a raw number

## UX Criteria
- Score/tier is visible on both the contact list and contact detail views
- Contact list is sortable by relationship score
- Score changes do not generate intrusive notifications for minor fluctuations

## Technical Criteria
- `GET /contacts/{id}/relationship-score` returns the current composite score and tier
- Score updates propagate to contact list sort order without a manual refresh
- Score computation handles contacts with zero interactions gracefully (baseline score, no error)

---

# Preconditions

- Contact has at least one meeting association or other interaction event
- Relationship scoring service is running and consuming interaction events
- Time-decay batch job is scheduled

---

# Postconditions

- Contact record reflects an up-to-date composite score and tier
- Score history entry is recorded for trend visibility
- Score is available for use in contact list sorting and network graph views

---

# Edge Cases

- Contact with a single very long, deep conversation but no follow-up sent
- Contact met at back-to-back sessions within minutes, risking inflated frequency
- Long gap between conferences (e.g., 18 months) where decay should not zero out a genuinely strong relationship
- Reciprocity signal unavailable because no email/CRM integration is connected
- Score requested for a contact with zero recorded interactions
- Contact recently merged (Feature 3), requiring recompute from the unioned history

---

# Telemetry

Track:
- `relationship_score_computed`
- `relationship_score_tier_changed`
- `relationship_score_sort_used`

---

# Dependencies

- Meeting Association (FEATURE-06)
- Relationship Timeline (FEATURE-09)
- Output & Reporting Layer (follow-up reciprocity signal)

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify score appears on a contact after its first recorded interaction
2. Verify score recomputes within a few minutes of a new interaction
3. Verify tier label matches the underlying score range consistently
4. Verify contact list sorts correctly by relationship score, ascending and descending
5. Verify a contact with zero interactions shows a sensible baseline state, not an error
6. Verify score for a merged contact reflects the combined interaction history of both source contacts
7. Verify decay reduces score gradually over a long gap without interaction, not abruptly
8. Verify score is not inflated by two interactions minutes apart within the same session

---

# Story Variation

This is user story variation 1 for Relationship Scoring, focusing on the day-to-day experience of seeing and using relationship scores to prioritize follow-up.

---

# Notes

- Score should feel like a helpful nudge, not a judgment — tier labels should stay encouraging even for cold relationships
- Sorting by score is likely to become one of the most-used contact list views; performance matters
