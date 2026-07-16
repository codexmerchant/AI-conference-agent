# EPIC06 Feature 5 User Story 1

## Epic
EPIC-06 — Knowledge Graph Platform

## Feature
FEATURE-05 — Temporal Relationship Modeling

---

# User Story

As a user,
I want to see how my relationship with a contact has changed over time — when we met, when I followed up, whether it's gone cold,
so that I know who's worth reconnecting with versus who I'm already actively in touch with.

---

# Business Value

- Helps users prioritize reconnecting with valuable contacts before the relationship fully fades.
- Turns a static contact list into a living record of relationship health.
- Increases follow-up conversion by surfacing timely reconnection prompts.
- Differentiates the product from simple CRM tools that only record the most recent interaction.

---

# Acceptance Criteria

## Functional Criteria
- Each relationship shows a timeline of events (met, followed up, decayed, reactivated).
- Current relationship weight visibly reflects recency and frequency of interaction.
- A dormant relationship that resumes activity is shown as continuous history, not a duplicate.

## UX Criteria
- Relationship timeline is presented in plain language, not raw timestamps and event codes.
- A "reconnect" prompt appears for relationships trending toward cold.

## Technical Criteria
- Decay is computed on a defined schedule and reflected in the current weight without requiring a user action to trigger it.
- Reactivation events correctly link to the existing edge's history rather than creating a new edge.
- As-of queries used for historical views return consistent results across repeated calls for the same timestamp.

---

# Preconditions

- The user has at least one relationship edge with recorded interaction history.
- The temporal modeling decay job has run at least once since the last interaction.
- The user is viewing a contact's detail page.

---

# Postconditions

- The relationship timeline accurately reflects all recorded events for that edge.
- Current weight and "warmth" trend are up to date as of the last scheduled decay run.
- Reconnection prompts, if shown, reflect actual decay state rather than a static rule.

---

# Edge Cases

- A contact met only once a year ago shows fully decayed rather than a false "active" state.
- A relationship reactivates at a new conference after a long dormant period.
- Two interactions with the same contact occur on the same day and must both appear distinctly on the timeline.
- The decay schedule has not yet run since the most recent interaction, producing a temporarily stale weight.

---

# Telemetry

Track:
- `relationship_event_recorded`
- `relationship_decay_applied`
- `relationship_reactivated`
- `reconnect_prompt_shown`

---

# Dependencies

- Relationship storage (base edge data)
- Interaction graph updates (event source)
- Scheduled decay job infrastructure

---

# Priority

Medium

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify a relationship timeline displays all recorded events in chronological order.
2. Verify current weight reflects recency and frequency correctly.
3. Verify a reactivated relationship links to prior history rather than duplicating the edge.
4. Verify a "reconnect" prompt appears appropriately for a decaying relationship.
5. Verify same-day interactions appear as distinct timeline entries.
6. Verify weight staleness is bounded by the decay job's defined schedule.
7. Verify the timeline renders correctly for a relationship with only a single event.

---

# Story Variation

This is user story variation 1 for Temporal Relationship Modeling, focusing on the happy-path experience of understanding relationship history and warmth trends.

---

# Notes

- Plain-language timeline framing ("met 8 months ago, no follow-up since") matters more to user trust than exposing raw decay math.
- Reconnect prompts should be tunable to avoid becoming noisy or ignored over time.
