# EPIC09 Feature 6 User Story 1

## Epic
EPIC-09 — User Productivity & Coaching

## Feature
FEATURE-06 — Time Allocation Analysis

---

# User Story

As a user,
I want to see how my conference time was actually distributed across sessions, networking, and meetings,
so that I can tell if it matched my intentions and adjust next time.

---

# Business Value

- Turns a fuzzy sense of "where did my day go" into a concrete, reviewable breakdown
- Helps users course-correct in real time if their allocation is drifting from their goals
- Provides a comparison point across conferences to identify recurring time-use patterns
- Feeds a concrete allocation-efficiency signal into the User Score and coaching engine

---

# Acceptance Criteria

## Functional Criteria
- Time allocation breakdown is available within 15 minutes of conference end
- Breakdown categorizes time into at minimum: sessions, networking, 1:1 meetings, meals/breaks, and travel/idle
- Breakdown is viewable both per-day and as a multi-day rollup
- Uncaptured time gaps are categorized (inferred) rather than silently dropped from the total

## UX Criteria
- Time-by-category is visualized as a stacked bar or donut chart
- Each category segment is drill-down capable to the underlying sessions/interactions
- Inferred time is visually distinguished from directly-captured time

## Technical Criteria
- `GET /users/{id}/time-allocation` returns deterministic status codes and per-category breakdowns
- Allocation computation completes within the 15-minute post-conference SLA
- Categorization accuracy (vs. user correction) meets or exceeds 85%

---

# Preconditions

- User has captured at least one session or interaction during the conference
- Calendar integration is connected if calendar-based categorization is desired
- Underlying capture timestamps have completed processing

---

# Postconditions

- TimeAllocationRecord entries persisted per category, per day and rolled up
- Breakdown visible in the conference dashboard immediately after computation
- `time_allocation_computed` telemetry event recorded
- Allocation efficiency score available as input to the composite User Score

---

# Edge Cases

- Large blocks of uncaptured/unaccounted time with no clear category signal
- Overlapping calendar events and captured sessions causing potential double counting
- Multi-track conference where attendance must be inferred from location/topic proximity rather than explicit check-in
- User attends the conference partially remote/virtual, complicating categorization
- Time zone changes mid-conference (travel days) skewing daily totals
- User manually recategorizes a block of time that the system inferred incorrectly

---

# Telemetry

Track:
- `time_allocation_computed`
- `time_allocation_viewed`
- `time_allocation_category_drilldown`
- `time_allocation_category_corrected`
- `time_allocation_recompute_requested`

---

# Dependencies

- Mobile Capture Platform (EPIC-01) for session/activity timestamps
- Calendar integration layer
- Goal Tracking (Feature 7, this epic)

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify time allocation breakdown computes correctly within the 15-minute SLA
2. Verify categorization correctly buckets sessions, networking, 1:1s, breaks, and travel/idle
3. Verify per-day and multi-day rollup views display consistent totals
4. Verify overlapping calendar and capture events do not result in double-counted time
5. Verify inferred time blocks are visually distinguished from directly-captured time
6. Verify drill-down from a category segment shows the correct underlying activities
7. Verify user correction of a miscategorized block updates the breakdown and persists the correction
8. Verify categorization accuracy meets the 85% target against a labeled test set

---

# Story Variation

This is user story variation 1 for Time Allocation Analysis, focusing on the happy-path user experience of reviewing a post-conference time breakdown.

---

# Notes

- Users are more forgiving of "unaccounted time" labeled honestly than of a breakdown that silently omits gaps to make the numbers look cleaner
- Multi-day conferences benefit from a day-by-day view since patterns often shift after day one
- Consider surfacing a lightweight allocation summary even mid-conference, not just post-event
