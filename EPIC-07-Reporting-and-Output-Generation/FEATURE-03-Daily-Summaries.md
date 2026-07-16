# FEATURE-03 — Daily Summaries

## Epic
EPIC-07 — Reporting & Output Generation

---

# 1. Objective

Aggregate all of a user's meeting summaries, session summaries, action items, and newly formed contacts from a single conference day into one end-of-day digest, delivered automatically at a configurable time.

---

# 2. Problem Statement

At multi-day conferences, interactions and insights accumulate faster than attendees can process them. Without a daily rollup, context from the morning is displaced by the afternoon, and users lose track of which contacts and insights from a given day actually mattered.

---

# 3. Feature Overview

A scheduled aggregation job collects the day's `MeetingSummary`, session summary (EPIC-05), `ActionItem`, and `Opportunity` records scoped to the user's active conference and calendar day, ranks and clusters them, and produces a structured `DailySummary` delivered via push notification and available as an in-app digest.

---

# 4. Key Functionalities

## Scheduled aggregation
Runs automatically at a configurable local time (default end of day) or on-demand when the user requests it early.

## Top-contact ranking
Ranks the day's contacts by relationship signal strength (interaction depth, follow-up potential, opportunity flags) rather than simple recency.

## Insight clustering
Groups related key points/topics across multiple interactions and sessions into a small set of digest-worthy insights instead of a flat list.

## Action item rollup
Surfaces the day's open action items (FEATURE-06) with due dates and owners in one place.

## Delivery and history
Delivers via push/email at the configured time and remains browsable as a dated digest history for the whole conference.

---

# 5. Primary Use Cases

## Use Case 1
User receives a 7pm push notification summarizing the day: top 5 contacts, 3 key insights, and 4 open action items.

## Use Case 2
User manually triggers "summarize today" mid-afternoon before a flight, before the scheduled delivery time.

## Use Case 3
User scrolls back through prior days' digests on day 3 of a conference to recall who they met on day 1.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want an end-of-day digest of my top contacts, insights, and action items,
so that I can review my day without manually piecing it together from individual summaries.

### Acceptance Criteria
- Digest is delivered automatically at the user's configured time each conference day.
- Digest includes top contacts, clustered insights, and open action items for that day only.
- User can trigger an on-demand digest before the scheduled time.

## User Story 2
As a multi-day conference attendee,
I want to browse previous days' digests,
so that I can recall context from earlier in the event without re-reading every summary.

### Acceptance Criteria
- Digest history is available per conference day in chronological order.
- Each historical digest remains accurate even if new interactions are added retroactively (e.g., late-synced offline captures).
- Digest history is scoped correctly when the user attends multiple conferences on overlapping dates.

---

# 7. User Workflow

1. Scheduled job triggers at the user's configured local delivery time (or user requests on-demand generation).
2. Aggregation service queries all `MeetingSummary`, session summaries, `ActionItem`, and `Opportunity` records for the user/conference/day.
3. Ranking and clustering logic produces top contacts and grouped insights.
4. `DailySummary` record is generated and persisted.
5. Push notification / email delivers the digest.
6. User opens the digest, reviews, and can drill into any linked summary or action item.
7. Digest is archived and browsable in digest history for the remainder of the conference.

---

# 8. UI / UX Requirements

- Digest view organized into clear sections: Top Contacts, Key Insights, Action Items, New Contacts.
- Each digest item links directly back to its source summary/interaction.
- Delivery time and channel (push/email) configurable in settings.
- Digest history accessible via a calendar-style date picker.
- Loading/placeholder state shown if digest is requested before all of the day's async summaries have finished generating.

---

# 9. Technical Requirements

## Frontend
Digest view component with expandable sections and deep links into individual summaries; settings screen for delivery time/channel preferences.

## Backend
Scheduled aggregation job (per user, per active conference, per local day boundary) queries downstream summary/action-item/opportunity stores and writes a `DailySummary` record; on-demand generation reuses the same aggregation path synchronously with partial-data handling.

## AI/ML
Ranking model scores contacts by composite relationship signal; clustering step groups semantically similar key points/topics across the day's summaries into digest insights using embeddings from the Context Engine.

## Infrastructure
Job scheduler must be timezone-aware per conference location and handle conferences spanning a timezone change (e.g., user travels mid-event); delivery retried on notification failure.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Meeting Summaries Service (FEATURE-01) | Supplies the day's per-interaction summaries |
| Session Intelligence (EPIC-05) | Supplies the day's session/panel summaries |
| Action-Item Extraction (FEATURE-06) | Supplies the day's open action items |
| Opportunity Detection (FEATURE-05) | Supplies opportunities flagged that day |
| Notification Service | Delivers the digest via push/email at the configured time |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| DailySummary | daily_summary_id, user_id, conference_id, summary_date, top_contacts (array with rank rationale), key_insights (array), action_item_ids (array), new_contact_ids (array), sessions_attended (array), generated_at, delivery_status, delivery_channel, generation_mode (scheduled/on_demand) |

---

# 12. Security & Privacy

- Digest content inherits the same access scoping as its source summaries — visible only to the owning user.
- Digest delivered via email is sent through an encrypted transport and does not embed raw transcript text, only generated summary content.
- Digest history respects the same data retention/deletion policy as the underlying interaction records.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Scheduled digest generation completion | Within 5 min of trigger time |
| On-demand digest generation latency | <20 sec for a typical day (≤40 interactions) |
| Delivery success rate | >99% |

---

# 14. Edge Cases

- Zero interactions recorded that day (digest should acknowledge, not error).
- Timezone change mid-conference shifting the "day" boundary.
- Digest requested while some of the day's summaries are still processing (partial data).
- User attends two overlapping conferences on the same calendar day.
- Late-synced offline captures arrive after the digest has already been delivered.
- Delivery channel (push token / email) invalid or revoked.

---

# 15. Dependencies

- FEATURE-01 Meeting Summaries
- FEATURE-05 Opportunity Detection
- FEATURE-06 Action-Item Extraction
- EPIC-05 Session Intelligence
- Notification service

---

# 16. Risks

- Ranking algorithm surfaces the wrong "top contacts," reducing trust in the digest.
- Digest fatigue if delivered daily across a long multi-day conference with declining engagement.
- Partial data at generation time produces an incomplete or misleading digest.

---

# 17. Telemetry & Analytics

Track:
- `daily_summary_generated`
- `daily_summary_generation_failed`
- `daily_summary_delivered`
- `daily_summary_opened`
- `daily_summary_on_demand_requested`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Digest open rate | >70% |
| Scheduled delivery success rate | >99% |
| Top-contact ranking agreement (user doesn't reorder/dismiss) | >75% |

---

# 19. Future Enhancements

- User-adjustable digest sections (hide/reorder categories).
- Weekly roll-up across conferences attended in the same week.
- Digest delivered as a short audio briefing for hands-free review.

---

# 20. Open Questions

- What is the default delivery time, and should it adapt to observed conference schedule end times?
- Should digests auto-regenerate if new data arrives after initial delivery, or remain a fixed snapshot?
- How many top contacts should be shown by default before requiring a "see all" action?
