# EPIC07 Feature 1 User Story 1

## Epic
EPIC-07 — Reporting & Output Generation

## Feature
FEATURE-01 — Meeting Summaries

---

# User Story

As a user,
I want a structured summary generated automatically after each conversation I have at a conference,
so that I don't have to take manual notes and can trust I'll remember what was discussed.

---

# Business Value

- Eliminates manual note-taking during time-sensitive networking conversations
- Produces a searchable, structured record of every interaction for later recall
- Improves the quality of downstream follow-ups by grounding them in accurate detail
- Increases the perceived value of the app within the first day of use, driving retention

---

# Acceptance Criteria

## Functional Criteria
- Summary is generated automatically after the interaction ends without manual triggering
- Summary includes key points, sentiment, mentioned topics, and suggested next steps
- Summary is correctly linked to the resolved contact and appears in that contact's timeline
- Low-confidence summaries are visibly flagged rather than shown as equally reliable

## UX Criteria
- Summary card appears in the interaction timeline within the target latency window
- Confidence badge (low/medium/high) is visible at a glance
- One-tap access to edit the summary or generate a follow-up from it

## Technical Criteria
- Generation is idempotent per interaction to avoid duplicate summaries on retry
- Summary generation records model_version and prompt_version for traceability
- Summary content is encrypted at rest and in transit

---

# Preconditions

- Interaction was recorded with explicit consent
- Transcript segment for the interaction has finalized (EPIC-02)
- Contact identity has resolved or is in a resolvable pending state (EPIC-06)

---

# Postconditions

- A `MeetingSummary` record is persisted and linked to the contact and interaction
- User is notified that the summary is ready for review
- Summary is available offline for the most recent session

---

# Edge Cases

- Interaction recorded on a noisy expo floor produces a low-confidence transcript
- Interaction spans more than one language
- Interaction boundary is ambiguous (continuous multi-person conversation)
- Contact identity has not finished resolving when generation triggers
- User manually ends the interaction mid-sentence

---

# Telemetry

Track:
- `meeting_summary_generated`
- `meeting_summary_generation_failed`
- `meeting_summary_low_confidence_flagged`
- `meeting_summary_viewed`
- `meeting_summary_time_to_generate_ms`

---

# Dependencies

- EPIC-02 Transcription & Media Pipeline
- EPIC-03 Context Engine
- EPIC-06 Knowledge Graph Engine (identity resolution)
- LLM inference gateway

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify summary generates within target latency after a normal interaction
2. Verify summary links to the correct resolved contact
3. Verify low-confidence summary is visibly flagged
4. Verify summary generation is idempotent under duplicate trigger events
5. Verify offline availability of the most recent session's summaries
6. Verify summary content includes key points, sentiment, topics, and next steps
7. Verify summary generation handles a multi-language transcript gracefully
8. Verify notification is sent when the summary is ready

---

# Story Variation

This is user story variation 1 for Meeting Summaries, focusing on the happy-path user experience of automatic, trustworthy summary generation.

---

# Notes

- This is the foundational output that Follow-Up Drafts, Daily Summaries, and downstream reports all depend on.
- Confidence flagging is critical to prevent users from acting on inaccurate low-quality summaries.
