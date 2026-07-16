# EPIC07 Feature 3 User Story 1

## Epic
EPIC-07 — Reporting & Output Generation

## Feature
FEATURE-03 — Daily Summaries

---

# User Story

As a user,
I want an end-of-day digest of my top contacts, key insights, and open action items,
so that I can review my whole conference day without manually piecing together every individual summary.

---

# Business Value

- Consolidates a day's fragmented interactions into a single, reviewable artifact
- Helps the user prioritize which contacts and insights matter most before the next day starts
- Reinforces daily engagement with the app during multi-day conferences
- Surfaces open commitments before they're forgotten overnight

---

# Acceptance Criteria

## Functional Criteria
- Digest is generated automatically at the user's configured delivery time each conference day
- Digest includes top-ranked contacts, clustered key insights, and open action items scoped to that day
- User can trigger an on-demand digest before the scheduled delivery time

## UX Criteria
- Digest is organized into clearly labeled sections with deep links back to source summaries
- Delivery channel and time are configurable in settings
- Digest history is browsable by date for the duration of the conference

## Technical Criteria
- Aggregation correctly scopes data to the user's local day boundary for the active conference
- Partial data (still-processing summaries) is handled gracefully rather than blocking digest delivery
- Digest generation is idempotent per user/day to avoid duplicate deliveries

---

# Preconditions

- User has at least one recorded interaction during the day, or digest gracefully acknowledges zero activity
- Meeting summaries, action items, and opportunities for the day have had time to process
- Notification/delivery channel is configured

---

# Postconditions

- `DailySummary` record is persisted and available in digest history
- User is notified via their configured delivery channel
- Digest remains accurate and browsable for the remainder of the conference

---

# Edge Cases

- Zero interactions recorded for the day
- Timezone shift mid-conference (e.g., user travels between days)
- Digest requested while some summaries for the day are still generating
- User attends two overlapping conferences on the same calendar day
- Late-synced offline captures arrive after the digest has already been delivered

---

# Telemetry

Track:
- `daily_summary_generated`
- `daily_summary_delivered`
- `daily_summary_opened`
- `daily_summary_on_demand_requested`
- `daily_summary_section_expanded`

---

# Dependencies

- FEATURE-01 Meeting Summaries
- FEATURE-05 Opportunity Detection
- FEATURE-06 Action-Item Extraction
- EPIC-05 Session & Conversation Intelligence
- Notification service

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify digest is generated and delivered at the configured local time
2. Verify digest correctly scopes data to the calendar day for the active conference
3. Verify on-demand generation works before the scheduled delivery time
4. Verify digest for a zero-activity day renders a graceful empty state
5. Verify digest history is browsable in chronological order
6. Verify timezone shift mid-conference does not corrupt day boundaries
7. Verify late-synced data does not corrupt an already-delivered digest
8. Verify each digest item deep-links to its correct source summary

---

# Story Variation

This is user story variation 1 for Daily Summaries, focusing on the happy-path user experience of a timely, well-organized end-of-day digest.

---

# Notes

- Daily Summaries are the aggregation layer between per-interaction summaries and the full Conference Report.
- Ranking quality for "top contacts" directly affects whether users trust and open the digest daily.
