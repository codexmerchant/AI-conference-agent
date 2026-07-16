# EPIC07 Feature 7 User Story 1

## Epic
EPIC-07 — Reporting & Output Generation

## Feature
FEATURE-07 — Executive Summaries

---

# User Story

As a user,
I want a short, audience-appropriate summary generated from my full conference report,
so that I can share conference outcomes with a manager or leadership without manually rewriting a long report into a digest.

---

# Business Value

- Saves the time otherwise spent manually condensing a long report into an upward-facing update
- Increases the likelihood the user actually reports conference outcomes to stakeholders, reinforcing the conference's perceived ROI
- Produces a consistent, professional format for reporting regardless of the user's own writing skill or time constraints
- Extends the app's value beyond personal use into team/organizational visibility

---

# Acceptance Criteria

## Functional Criteria
- User can select an audience tier (self/manager/leadership) when generating the summary
- Generated content respects the length constraint for the selected tier (bullets/one-pager/slide)
- Summary highlights are drawn from the underlying Conference Report data, not freshly re-derived from raw transcripts

## UX Criteria
- Tier selector shows a live preview of estimated length before generation
- One-tap regeneration for a different tier from the same underlying report
- Slide-ready view option available for direct use in a presentation

## Technical Criteria
- Generation reuses the completed Conference Report as its input rather than reprocessing raw source data
- Each generated summary records its source_report_id, audience_tier, and length_tier
- Generation completes within a latency appropriate for a bounded-input summarization task

---

# Preconditions

- A completed `ConferenceReport` exists for the conference
- User has selected an audience tier and length tier
- User has reviewed what content is included before any sharing action

---

# Postconditions

- `ExecutiveSummary` record is created and linked to the source Conference Report
- Summary is available for review, regeneration, or export
- User can generate multiple tier variants from the same underlying report

---

# Edge Cases

- Conference data is too sparse for a meaningful executive summary
- Executive summary is requested before the source Conference Report has finished generating
- Conflicting emphasis is needed between two audience tiers generated from the same data
- Length constraints force omission of context the user considers genuinely important
- User requests a tier not yet supported by the current template set

---

# Telemetry

Track:
- `executive_summary_generated`
- `executive_summary_tier_selected`
- `executive_summary_regenerated`
- `executive_summary_viewed`
- `executive_summary_length_tier_selected`

---

# Dependencies

- FEATURE-04 Conference Reports
- FEATURE-03 Daily Summaries (supplementary detail)

---

# Priority

Medium

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify generation succeeds for each supported audience tier
2. Verify generated content respects the target length constraint for the selected tier
3. Verify highlights are drawn from the Conference Report rather than raw transcript reprocessing
4. Verify regeneration for a different tier works without regenerating the full Conference Report
5. Verify a sparse-data conference produces a clearly labeled minimal summary rather than an error
6. Verify generation blocked or gracefully deferred if the source report hasn't finished
7. Verify slide-ready view renders correctly for presentation use
8. Verify source_report_id, audience_tier, and length_tier are correctly recorded on the generated summary

---

# Story Variation

This is user story variation 1 for Executive Summaries, focusing on the happy-path user experience of fast, accurately-scoped summary generation for reporting upward.

---

# Notes

- This feature is a compression layer over FEATURE-04, not an independent generation path — keeping it grounded in the finished report avoids inconsistent claims between the two artifacts.
- Length-tier previews before generation help set correct user expectations, especially for the tightest "bullets" tier.
