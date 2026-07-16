# EPIC04 Feature 9 User Story 1

## Epic
EPIC-04 — Contact & Relationship Intelligence

## Feature
FEATURE-09 — Relationship Timeline

---

# User Story

As a user,
I want to see the full history of my interactions with a contact in one place,
so that I can walk into a repeat meeting with complete context.

---

# Business Value

- Delivers the product's core long-term-memory promise: nothing about a relationship gets lost between conferences
- Saves the time and awkwardness of re-asking someone about things already discussed
- Makes repeat encounters feel like a continuation, not a cold restart
- Surfaces the compounding value of consistent conference attendance over time

---

# Acceptance Criteria

## Functional Criteria
- Timeline displays all meeting, follow-up, and introduction events for a contact in chronological order
- Timeline spans all conferences the contact has been met at, not just the current one
- Each entry shows enough detail (date, conference, type, brief summary) to be useful without opening the full source record
- Merged contacts (Feature 3) show a single continuous timeline combining both source histories

## UX Criteria
- Vertical chronological feed, most recent first, grouped by conference
- Type-specific icons/colors distinguish meeting, follow-up, introduction, and discussed-topic events
- Tap-through from any entry navigates to its full source record (transcript, follow-up email, etc.)

## Technical Criteria
- `GET /contacts/{id}/timeline` returns the full ordered event history
- Timeline load latency stays under 500ms for contacts with fewer than 100 events
- Timeline correctly re-indexes after a merge without duplicating or dropping entries

---

# Preconditions

- Contact has at least one recorded interaction event (meeting, follow-up, introduction, or discussed topic)
- Timeline aggregation service has access to Meeting Association, Follow-Up, and Knowledge Graph event sources
- User has navigated to the contact's detail view

---

# Postconditions

- Timeline view accurately reflects the complete, correctly-ordered interaction history
- New interaction events appear on the timeline without requiring a manual refresh
- Timeline remains accurate and continuous after any subsequent merge

---

# Edge Cases

- Contact with events spanning five or more years and multiple conferences
- Two merged contacts both logged an event on the same day, requiring correct chronological interleaving
- Source record (e.g., a transcript) referenced by a timeline entry is later deleted
- Timeline requested for a contact with zero events
- Introduction-chain event referencing a third contact who was later deleted
- Two events with identical timestamps requiring a stable secondary sort order

---

# Telemetry

Track:
- `relationship_timeline_viewed`
- `relationship_timeline_entry_opened`
- `relationship_timeline_filtered`

---

# Dependencies

- Meeting Association (FEATURE-06)
- Duplicate Merging (FEATURE-03)
- Knowledge Graph Engine (PRD §5.6)

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify timeline displays all recorded event types in correct chronological order
2. Verify timeline spans multiple conferences for a repeat contact
3. Verify each entry shows sufficient summary detail without requiring a click-through
4. Verify tapping an entry navigates correctly to its full source record
5. Verify a merged contact's timeline correctly combines both source histories with no duplicates
6. Verify timeline load latency meets the 500ms target for a contact with under 100 events
7. Verify a contact with zero events shows an appropriate empty state
8. Verify two same-day events from a merge are ordered using a stable secondary sort

---

# Story Variation

This is user story variation 1 for Relationship Timeline, focusing on the day-to-day experience of recalling a contact's full interaction history.

---

# Notes

- This feature is the most visible expression of the product's "persistent memory" value proposition described in the PRD
- Summary quality on each entry matters as much as completeness — a wall of raw events is not the goal
