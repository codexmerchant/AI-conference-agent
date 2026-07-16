# FEATURE-04 — Conference Reports

## Epic
EPIC-07 — Reporting & Output Generation

---

# 1. Objective

Generate a comprehensive end-of-conference report covering trends, opportunities, network insights, and recommendations, aggregating the entire event's captured data into a single structured artifact per PRD §5.8's Conference Report tier.

---

# 2. Problem Statement

Attendees have no way to measure the overall return on a multi-day conference investment or extract strategic patterns (which topics dominated, which relationships mattered, what opportunities emerged) once individual daily digests have scrolled past. Without a whole-event view, the conference's real value is never consolidated or acted on.

---

# 3. Feature Overview

The Conference Report Service aggregates every `MeetingSummary`, session summary (EPIC-05), `Opportunity` (FEATURE-05), `ActionItem` (FEATURE-06), and knowledge-graph delta (EPIC-06) generated during a conference into a multi-section report: topic/trend analysis, opportunity roll-up, network insights (new/strengthened relationships), and generated recommendations for next steps.

---

# 4. Key Functionalities

## Full-conference aggregation
Pulls all data scoped to a `conference_id` across its full date range, not just a single day.

## Trend detection
Identifies recurring/rising topics across sessions and conversations attended, with relative frequency and notable outlier mentions.

## Opportunity roll-up
Consolidates all opportunities detected during the conference into a prioritized summary section.

## Network insights
Summarizes the shape of the relationship graph formed at the conference — new contacts, strengthened existing relationships, and key connector contacts — sourced from EPIC-06.

## On-demand and scheduled generation
Generates automatically at conference close, and supports on-demand regeneration with a custom date range within the conference.

---

# 5. Primary Use Cases

## Use Case 1
User requests a full report the morning after a 3-day conference ends, covering all captured data.

## Use Case 2
User regenerates the report scoped to only days 2-3 after realizing day 1 data was mostly setup/registration noise.

## Use Case 3
User compares this conference's report against a prior conference's report to see if similar topics/opportunities recurred.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want a single comprehensive report covering the whole event,
so that I can review trends, opportunities, and relationships without piecing together individual daily digests.

### Acceptance Criteria
- Report includes all four required sections: trends, opportunities, network insights, recommendations.
- Report generation completes without requiring the user to manually specify every data source.
- Report accurately reflects the full date range of the conference by default.

## User Story 2
As a user preparing to brief a colleague,
I want to regenerate the report for a custom date range or filter,
so that I can produce a report scoped to just the portion of the conference that's relevant.

### Acceptance Criteria
- User can specify a date range subset of the conference when regenerating.
- Regenerated report is versioned separately from the original full-conference report.
- Filtering does not silently drop sections; empty sections are explicitly labeled as such.

---

# 7. User Workflow

1. Conference reaches its scheduled end date, or user manually requests report generation.
2. Conference Report Service queries all summaries, action items, opportunities, and graph deltas for the `conference_id`.
3. Trend-detection step clusters topics/themes across sessions and conversations.
4. Opportunity and network-insight sections are assembled from FEATURE-05 and EPIC-06 data.
5. Recommendation section is generated from the combined findings.
6. `ConferenceReport` record is persisted and the user is notified it's ready.
7. User reviews the report in-app and can export it (FEATURE-08) or regenerate with different scope.

---

# 8. UI / UX Requirements

- Report view organized into the four named sections with clear section navigation/table of contents.
- Each finding links back to its supporting summaries/sessions/contacts.
- Date-range selector for regeneration, defaulting to the full conference span.
- Visual indicator distinguishing the current report version from prior regenerations.
- Empty-state messaging for sections with insufficient data (e.g., "No opportunities detected this conference").

---

# 9. Technical Requirements

## Frontend
Multi-section report viewer (React/SwiftUI) with a table of contents, drill-down links per finding, and a date-range/regeneration control.

## Backend
Conference Report Service performs a scoped aggregation query across the Meeting Summary, Session Intelligence, Opportunity, Action-Item, and Knowledge Graph stores, and writes a versioned `ConferenceReport` record; generation runs as an async job given the potential data volume.

## AI/ML
Trend detection uses topic-embedding clustering over the conference's aggregated topic tags; recommendation generation is a versioned LLM prompt operating over the assembled section data rather than raw transcripts, to keep prompt size bounded.

## Infrastructure
Aggregation queries are paginated/batched to handle conferences with hundreds of interactions; report generation jobs are retried with partial-section fallback if one data source (e.g., knowledge graph) is temporarily unavailable.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Meeting Summaries Service (FEATURE-01) | Supplies per-interaction summary data for aggregation |
| Session Intelligence (EPIC-05) | Supplies session/panel summaries and key insights |
| Opportunity Detection (FEATURE-05) | Supplies the conference's flagged opportunities |
| Action-Item Extraction (FEATURE-06) | Supplies the conference's action items for the recommendations section |
| Knowledge Graph Engine (EPIC-06) | Supplies network insights: new/strengthened relationships, key connectors |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| ConferenceReport | report_id, conference_id, user_id, generated_at, date_range_start, date_range_end, sections (trends, opportunities, network_insights, recommendations), total_contacts, total_sessions, total_interactions, top_topics (array), report_version, status (generating/ready/failed) |

---

# 12. Security & Privacy

- Report content is scoped to the owning user's own captured data; no cross-user aggregation without explicit team-sharing consent.
- Network insight section only surfaces relationship data the user has access to under EPIC-06's sharing rules.
- Report is encrypted at rest; export/sharing actions are separately permissioned (see FEATURE-08).

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Full report generation (typical conference, ≤200 interactions) | <3 min |
| On-demand regeneration with custom date range | <2 min |
| Report generation success rate | >97% |

---

# 14. Edge Cases

- Conference spans more than 5 days with very high data volume.
- User leaves the conference early, leaving a partial data set for the remaining scheduled days.
- Report requested before all async meeting/session summaries have finished generating.
- Extremely sparse conference (fewer than 5 interactions captured) yields a thin report.
- User attended two overlapping conferences and data must not bleed across `conference_id` boundaries.
- Knowledge graph service temporarily unavailable during aggregation.

---

# 15. Dependencies

- FEATURE-01 Meeting Summaries
- FEATURE-05 Opportunity Detection
- FEATURE-06 Action-Item Extraction
- EPIC-05 Session & Conversation Intelligence
- EPIC-06 Knowledge Graph Engine

---

# 16. Risks

- Aggregation over large data volumes causes generation timeouts during peak post-conference load.
- Trend detection surfaces noisy or trivial topics if clustering thresholds are miscalibrated.
- Report feels generic if recommendation generation isn't sufficiently grounded in the user's specific data.

---

# 17. Telemetry & Analytics

Track:
- `conference_report_generated`
- `conference_report_generation_failed`
- `conference_report_regenerated`
- `conference_report_viewed`
- `conference_report_section_expanded`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Report generation success rate | >97% |
| Report viewed within 48h of generation | >80% |
| Recommendation section rated useful (user feedback) | >70% |

---

# 19. Future Enhancements

- Cross-conference comparison view showing trend deltas year over year or event over event.
- Team-level roll-up report aggregating multiple attendees' data for the same conference.
- Automatic slide-deck version of the report for internal presentation.

---

# 20. Open Questions

- Should the report auto-regenerate if late-synced data arrives after initial generation, or remain immutable once issued?
- How should recommendation quality be validated before shipping the generation prompt to production?
- Should team/org-level report roll-ups be in scope for V1 or deferred alongside deep integrations?
