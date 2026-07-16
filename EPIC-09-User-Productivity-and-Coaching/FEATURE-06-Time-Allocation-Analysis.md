# FEATURE-06 — Time Allocation Analysis

## Epic
EPIC-09 — User Productivity & Coaching

---

# 1. Objective

Analyze how a user's conference time was actually spent across sessions, networking, meals/breaks, and one-on-one meetings, and compare it against their goals and benchmarks, so users can optimize how they allocate limited conference hours.

---

# 2. Problem Statement

Attendees often lose track of how their conference days actually broke down — too much time in low-value sessions, not enough in networking, or back-to-back meetings with no recovery time — and have no objective record to reflect on or improve against.

---

# 3. Feature Overview

Time Allocation Analysis reconstructs a time-use breakdown per conference from capture timestamps (sessions attended, interactions captured, idle/break periods), categorizes time into activity types, and compares the distribution against the user's goals and peer/role benchmarks.

---

# 4. Key Functionalities

## Activity time reconstruction
Derives time-in-category from capture session timestamps, calendar data, and location/check-in signals where available.

## Categorization
Buckets time into categories: sessions, networking, 1:1 meetings, meals/breaks, travel/idle.

## Goal/benchmark comparison
Compares the user's actual allocation against their stated goals and, where available, aggregate benchmarks for similar roles.

## Allocation efficiency scoring
Feeds a time allocation efficiency score into the composite User Score.

## Daily/multi-day breakdown views
Shows allocation both per-day and rolled up across a multi-day conference.

---

# 5. Primary Use Cases

## Use Case 1
User reviews a post-conference breakdown showing 60% of time in sessions and only 10% in networking, against a stated goal of prioritizing networking.

## Use Case 2
User compares day 1 vs. day 2 time allocation to see if they adjusted behavior after a mid-conference nudge.

## Use Case 3
Manager reviews team time-allocation patterns to inform conference strategy for next year.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want to see how my time was actually distributed across sessions, networking, and meetings,
so that I can tell if it matched my intentions.

### Acceptance Criteria
- Time allocation breakdown is available within 15 minutes of conference end
- Breakdown categorizes time into at least sessions, networking, 1:1 meetings, and breaks
- User can view breakdown per-day and as a multi-day rollup

## User Story 2
As a goal-driven attendee,
I want my time allocation compared against my stated conference goals,
so that I know whether I'm spending time where it matters most to me.

### Acceptance Criteria
- Time allocation view highlights gaps between actual and goal-implied allocation
- Comparison updates as goals are added or changed mid-conference
- User can see the specific interactions/sessions contributing to each category

---

# 7. User Workflow

1. User captures sessions, interactions, and check-ins throughout the conference
2. System timestamps and categorizes each captured activity by type
3. Uncaptured/idle gaps are inferred and categorized as breaks or unaccounted time
4. Time allocation engine aggregates category totals per day and across the conference
5. Allocation is compared against the user's stated goals and available benchmarks
6. User views the breakdown in the dashboard with drill-down into contributing activities
7. Allocation efficiency score feeds into the composite User Score and coaching engine

---

# 8. UI / UX Requirements

- Stacked bar or donut chart of time-by-category, per-day and rolled up
- Goal-gap indicator (e.g., "networking: 10% actual vs. 30% goal")
- Drill-down from a category segment to the underlying sessions/interactions
- Clear labeling of inferred vs. directly-captured time
- Comparison view across multiple conferences

---

# 9. Technical Requirements

## Frontend
Dashboard visualizations (stacked bar, donut, day-by-day timeline) rendering category breakdowns with goal-gap indicators and drill-down navigation.

## Backend
A time allocation service ingests capture timestamps, calendar events, and check-in signals, runs categorization logic, computes gap-to-goal deltas, persists TimeAllocationRecord rows, and computes the allocation efficiency sub-score.

## AI/ML
A classification model assigns activity type to ambiguous or uncaptured time gaps using contextual signals (calendar entries, location, nearby session schedule); goal-gap analysis uses a rules-based comparison against Goal Tracking targets.

## Infrastructure
Timestamp reconciliation across multiple capture sources (mobile app, calendar sync, badge/check-in data where integrated); nightly batch recompute for multi-day conferences.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Session/Interaction Capture (EPIC-01, EPIC-02) | Source activity timestamps for categorization |
| Calendar integration (Google/Outlook) | Source scheduled meeting blocks for categorization |
| Goal Tracking (Feature 7) | Source goal-implied target allocation for comparison |
| GET /users/{id}/time-allocation | Retrieve time allocation breakdown for a conference |
| GET /time-allocation/benchmarks | Retrieve aggregate role/peer benchmarks |
| POST /time-allocation/recompute | Trigger recomputation after new captures/corrections |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| TimeAllocationRecord | allocation_id, user_id, conference_id, category (sessions, networking, one_on_one, meals_breaks, travel_idle, unaccounted), time_spent_minutes, percentage_of_total, benchmark_percentage, period_start, period_end |
| TimeAllocationSource | source_id, allocation_id, source_type (capture_session, calendar_event, check_in, inferred), source_reference_id, start_time, end_time |

---

# 12. Security & Privacy

- Calendar integration uses least-privilege, read-only free/busy or event-metadata scopes where possible
- Location/check-in data used for categorization only with explicit user opt-in
- Benchmark comparisons use anonymized, aggregated peer data with a minimum cohort size to prevent re-identification
- Users can exclude specific time blocks (e.g., personal time) from analysis

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Allocation computation latency post-conference | <15 min |
| Recompute latency | <1 min |
| Categorization accuracy (vs. user correction) | >85% |
| Benchmark data freshness | Updated monthly |

---

# 14. Edge Cases

- Large blocks of uncaptured/unaccounted time with no clear category signal
- Overlapping calendar events and captured sessions causing double counting
- Multi-track conference where session attendance must be inferred from location/topic proximity rather than explicit check-in
- User attends the conference partially remote/virtual, complicating categorization
- Time zone changes mid-conference (travel days)
- Benchmark cohort too small to provide a statistically meaningful comparison

---

# 15. Dependencies

- Mobile Capture Platform (EPIC-01) for session/activity timestamps
- Calendar integration layer
- Goal Tracking (Feature 7, this epic)

---

# 16. Risks

- Inferred categorization for uncaptured time is inaccurate, undermining trust in the breakdown
- Users feel surveilled by granular time tracking
- Benchmarks based on too-small or non-representative cohorts mislead users
- Over-indexing on "efficiency" discourages valuable unstructured/serendipitous time

---

# 17. Telemetry & Analytics

Track:
- `time_allocation_computed`
- `time_allocation_recompute_requested`
- `time_allocation_viewed`
- `time_allocation_category_drilldown`
- `time_allocation_benchmark_viewed`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Allocation computation success rate | >98% |
| Categorization accuracy | >85% |
| Users viewing allocation breakdown post-conference | >50% |
| Correlation between allocation efficiency and Conference Score | tracked quarterly, positive trend |

---

# 19. Future Enhancements

- Real-time in-conference allocation nudges ("you've spent 80% of today in sessions, consider networking time")
- Predictive optimal-allocation suggestions based on agenda before the conference starts
- Integration with venue/badge systems for higher-fidelity session attendance data

---

# 20. Open Questions

- Should unaccounted/idle time be treated neutrally or flagged as a coaching signal?
- How should virtual/hybrid attendance time be categorized differently from in-person?
- What minimum cohort size is required before showing peer benchmarks?
