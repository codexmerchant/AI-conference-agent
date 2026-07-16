# EPIC14 Feature 3 User Story 1

## Epic
EPIC-14 — Desktop Analysis Workspace

## Feature
FEATURE-03 — Conference Intelligence Dashboard

---

# User Story

As a user,
I want a single dashboard summarizing my conference performance — contacts, sessions, insights, and score,
so that I can quickly understand the value I got from a conference without reviewing every record individually.

---

# Business Value

- Gives immediate visibility into conference ROI without manual aggregation
- Encourages continued use of the product by surfacing value same-day
- Helps users decide which conferences are worth attending again
- Turns scattered activity into a digestible performance narrative

---

# Acceptance Criteria

## Functional Criteria

- Dashboard loads KPI tiles (contacts, sessions, follow-ups, insights) for a selected conference
- User can switch between conferences or a custom date range without navigating away
- Score breakdown (content quality, network quality, insight density) is visible and drillable
- Dashboard shows a visible "last updated" timestamp reflecting snapshot freshness

## UX Criteria

- Dashboard loads from cache instantly on reopen, with a background refresh if stale
- Empty/partial-data states are visually distinct from a genuine zero-performance result
- Drilling into a KPI tile or score component navigates to supporting detail

## Technical Criteria

- Dashboard data loads via `GET /desktop/dashboard/{conference_id}`
- Score data loads via `GET /desktop/dashboard/{conference_id}/score`
- Manual refresh triggers via `POST /desktop/dashboard/refresh`

---

# Preconditions

- User is authenticated and owns the selected conference's data
- At least one session or interaction has been processed for the conference

---

# Postconditions

- Dashboard snapshot is cached locally for fast reopen
- User's last-viewed conference/date range is remembered for next session
- Refresh requests trigger snapshot recomputation without blocking the current view

---

# Edge Cases

- Conference is still in progress, so metrics reflect only partial data
- Custom date range spans multiple overlapping conferences
- Score computation fails or is delayed for a subset of sessions
- Very small conference (single session) makes score sub-metrics statistically unstable
- User has no data yet for a newly created conference
- Dashboard is opened immediately after conference creation, before any snapshot exists

---

# Telemetry

Track:
- `dashboard_opened`
- `dashboard_refreshed`
- `score_breakdown_expanded`
- `kpi_tile_drilldown`

---

# Dependencies

- EPIC-05 Session & Conference Intelligence (session/insight data)
- EPIC-07 Reporting & Output Generation (report and score data)
- Desktop authentication and snapshot caching service

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify KPI tiles reflect accurate counts for a known test conference
2. Verify switching conferences updates the dashboard without a full page reload
3. Verify score breakdown displays all three sub-metrics correctly
4. Verify "last updated" timestamp reflects the actual snapshot generation time
5. Verify partial-data state is visually distinct from a genuine zero-performance state
6. Verify manual refresh triggers recomputation and updates the view
7. Verify dashboard for a brand-new conference shows an appropriate empty state
8. Verify cached snapshot loads instantly on reopen before background refresh completes

---

# Story Variation

This is user story variation 1 for Conference Intelligence Dashboard, focusing on the happy-path summary and drill-down experience.

---

# Notes

- Same-day value delivery here is core to the product's "invisible to use, same-day value" success principle from the PRD
- Consider a lightweight "what changed since last visit" indicator to draw attention to new insights
