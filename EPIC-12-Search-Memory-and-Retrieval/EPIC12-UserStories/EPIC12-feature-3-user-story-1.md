# EPIC12 Feature 3 User Story 1

## Epic
EPIC-12 — Search, Memory & Retrieval

## Feature
FEATURE-03 — Cross-Conference Memory

---

# User Story

As a user,
I want to see my history with someone I'm meeting again at a new conference,
so that I can pick up the relationship with full context instead of starting over.

---

# Business Value

- Compounds the value of every conference attended instead of resetting context each time
- Strengthens relationship-building by surfacing history the user might have forgotten
- Differentiates the product from single-event note-taking tools
- Increases long-term retention as the product's memory becomes more valuable each year

---

# Acceptance Criteria

## Functional Criteria

- When a known entity is re-encountered, the system surfaces a summary of prior interactions across all past conferences
- Historical summaries include conference name, date, and key topics discussed
- Users can drill from the summary into the full historical interaction record
- Cross-conference linking works correctly even when the entity's name or company has minor variations

## UX Criteria

- Historical context appears within the current session without requiring a manual search
- Summary is concise enough to read in a few seconds during a live conversation
- Users can dismiss or expand the historical context card as needed

## Technical Criteria

- Entity resolution correctly links the same person across conference boundaries using identity resolution signals
- Cross-conference lookup completes within the performance target during a live re-encounter
- Summary generation is grounded in actual historical interaction data, not fabricated

---

# Preconditions

- User has attended at least one prior conference with a captured interaction involving this entity
- Entity resolution has successfully linked the current encounter to the historical record
- Cross-conference memory index is up to date

---

# Postconditions

- Historical context surfaced and logged as viewed
- New interaction from the current conference appended to the entity's timeline
- Entity timeline updated for future cross-conference queries

---

# Edge Cases

- Cross-conference recall returns stale contact info after a job change or company merger
- Same person attends under a different name spelling or email address
- Entity mistakenly linked to the wrong historical record
- User meets someone with the same name as a different previously-met contact
- Historical summary references a conference that has since been deleted per retention policy
- Re-encounter happens moments after the original interaction was captured, before indexing completes

---

# Telemetry

Track:
- `cross_conference_match_found`
- `historical_context_surfaced`
- `historical_context_expanded`
- `entity_timeline_updated`
- `cross_conference_match_corrected`

---

# Dependencies

- Identity resolution service (EPIC-04)
- Knowledge Graph Platform (EPIC-06)
- Vector Memory Platform for summarization retrieval

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify historical context surfaces correctly on re-encountering a known entity
2. Verify summary includes correct conference, date, and topic information
3. Verify drill-down from summary shows the full historical interaction record
4. Verify cross-conference linking handles minor name/email variations correctly
5. Verify no historical context is surfaced for a genuinely new contact
6. Verify entity timeline updates correctly after the new interaction is captured
7. Verify stale contact info is flagged or updated appropriately

---

# Story Variation

This is user story variation 1 for Cross-Conference Memory, focusing on the happy-path experience of recalling relationship history on re-encounter.

---

# Notes

- This feature is central to the product's "compounding memory" value proposition described in the PRD
- Accuracy of entity linking is critical — an incorrect match is worse than no match at all
- Summary generation should clearly distinguish confirmed history from inferred/uncertain matches
