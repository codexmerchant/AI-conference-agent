# FEATURE-03 — Conference Intelligence Dashboard

## Epic
EPIC-14 — Desktop Analysis Workspace

---

# 1. Objective

Give users a single-pane, at-a-glance view of how a conference (or date range) went — contacts made, sessions attended, insight density, and the conference/user performance scores — so they can quickly gauge ROI without digging through individual records.

---

# 2. Problem Statement

Conference outcomes are scattered across contacts, sessions, transcripts, and follow-ups with no consolidated view, so users cannot quickly answer "how did this conference go" or compare performance across events.

---

# 3. Feature Overview

A dashboard of KPI tiles, a conference/user score breakdown (content quality, network quality, insight density per PRD §5.9), an activity timeline, a top-contacts widget, and a rolling insight feed, scoped to a selected conference or custom date range.

---

# 4. Key Functionalities

## KPI summary tiles
At-a-glance counts for contacts made, sessions attended, follow-ups drafted/sent, and insights captured.

## Conference and user score breakdown
Visualized scoring across content quality, network quality, and insight density, with drill-down into contributing factors.

## Activity timeline
Chronological view of captured interactions, sessions, and follow-ups across the conference.

## Top contacts widget
Ranked list of the most significant contacts made, by relationship score or interaction depth.

## Rolling insight feed
Surfaces AI-generated key insights and coaching observations as they become available.

---

# 5. Primary Use Cases

## Use Case 1
User returns from a 3-day conference and opens the dashboard to see a same-day summary of who they met and what stood out.

## Use Case 2
User compares their performance score across two conferences to decide which event type is worth attending again.

## Use Case 3
User checks the dashboard mid-conference to see whether their morning sessions produced any high-value insights before deciding where to spend the afternoon.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want a single dashboard summarizing my conference performance,
so that I can quickly understand the value I got without reviewing every record individually.

### Acceptance Criteria
- Dashboard loads KPI tiles, score breakdown, and top contacts for a selected conference.
- User can switch between conferences or a custom date range without leaving the view.
- Dashboard data reflects the latest processed intelligence, with a visible "last updated" timestamp.

## User Story 2
As a power user,
I want to compare my conference score across multiple events,
so that I can identify which conferences deliver the best ROI for my time.

### Acceptance Criteria
- User can select two or more conferences to view side-by-side score comparisons.
- Score breakdown shows the same sub-metrics (content, network, insight density) for each conference.
- Comparison view highlights the largest deltas between selected conferences.

---

# 7. User Workflow

1. User opens the Conference Intelligence Dashboard from the desktop home screen.
2. User selects a conference or custom date range to view.
3. Dashboard loads KPI tiles, score breakdown, timeline, and insight feed.
4. User drills into a KPI tile or score component for supporting detail.
5. User optionally adds a second conference for side-by-side comparison.
6. User navigates from a top contact or insight directly into that entity's detail view.
7. User can refresh the dashboard to pull in newly processed intelligence.

---

# 8. UI / UX Requirements

- Card/tile-based layout with clear visual hierarchy for primary KPIs.
- Score breakdown rendered as a labeled radial or bar chart with drill-down affordance.
- Conference/date-range selector prominent at the top of the view.
- Empty and partial-data states clearly distinguished from zero-performance states.
- Comparison mode presented as a side-by-side or overlay view, not a separate page.

---

# 9. Technical Requirements

## Frontend
SwiftUI dashboard composed of independently loading/refreshing widget components so a slow score computation doesn't block the rest of the view from rendering.

## Backend
Dashboard data is served from precomputed snapshot endpoints rather than aggregating live at request time, to keep load times predictable for conferences with large data volumes.

## AI/ML
Consumes conference/user scoring and insight outputs already produced by session intelligence and the coaching/performance system; this feature does not compute scores itself, only renders them.

## Infrastructure
Dashboard snapshots are recomputed on a schedule and on-demand refresh, with the desktop client caching the last snapshot for instant load on reopen.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| `GET /desktop/dashboard/{conference_id}` | Fetch KPI tiles, timeline, and insight feed |
| `GET /desktop/dashboard/{conference_id}/score` | Fetch conference/user score breakdown |
| `POST /desktop/dashboard/refresh` | Trigger on-demand snapshot recomputation |
| `GET /desktop/dashboard/compare?ids=` | Fetch side-by-side comparison data |
| Session & Conference Intelligence (EPIC-05) | Source of session/insight counts |
| Reporting & Output Generation (EPIC-07) | Source of conference report and score data |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| DashboardSnapshot | id, user_id, conference_id, generated_at, metrics_json, is_stale |
| ConferenceScoreCard | conference_id, content_quality_score, network_quality_score, insight_density_score, overall_score, computed_at |
| DashboardWidgetPreference | id, user_id, widget_id, position, visible |

---

# 12. Security & Privacy

- Dashboard data is scoped strictly to conferences and interactions owned by the requesting user.
- Comparison views never expose another user's aggregate or score data.
- Snapshot cache on disk is encrypted at rest and purged on logout.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Dashboard initial load (cached snapshot) | <1 sec |
| Dashboard load (fresh snapshot generation) | <4 sec |
| Score breakdown drill-down | <500 ms |
| Comparison view load (2 conferences) | <2 sec |

---

# 14. Edge Cases

- Conference is still in progress, so metrics reflect only partial data.
- Custom date range spans multiple conferences with overlapping sessions.
- Score computation is delayed or fails for a subset of sessions.
- Very small conference (single session) makes score components statistically unstable.
- Comparing conferences of very different scale (2 days vs. 2 weeks) skews raw counts.
- User has no data yet for a newly created conference.

---

# 15. Dependencies

- EPIC-05 Session & Conference Intelligence (session/insight data)
- EPIC-07 Reporting & Output Generation (conference reports, scoring)
- EPIC-09 performance/coaching system outputs (score computation)
- Desktop authentication and snapshot caching service

---

# 16. Risks

- Users over-indexing on a single score number without understanding its components.
- Stale snapshots misleading users mid-conference if refresh cadence is too slow.
- Score comparability breaking down across conferences of very different formats.

---

# 17. Telemetry & Analytics

Track:
- `dashboard_opened`
- `dashboard_refreshed`
- `score_breakdown_expanded`
- `comparison_view_opened`
- `kpi_tile_drilldown`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Dashboard opened within 24h of conference end | >60% |
| Median dashboard load time | <1.5 sec |
| Users who use comparison view at least once | >25% |
| Snapshot staleness at load time | <15 min |

---

# 19. Future Enhancements

- Benchmarking against anonymized peer/industry averages.
- Predictive "expected ROI" scoring before a conference even starts, based on agenda.
- Exportable one-page conference performance summary.

---

# 20. Open Questions

- How frequently should snapshots recompute automatically during a live, multi-day conference?
- Should score comparison normalize for conference length/session count, and if so how?
- What is the minimum data threshold before showing a score at all, to avoid misleading users on sparse data?
