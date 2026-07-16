# EPIC07 Feature 6 User Story 1

## Epic
EPIC-07 — Reporting & Output Generation

## Feature
FEATURE-06 — Action-Item Extraction

---

# User Story

As a user,
I want commitments made during my conversations automatically captured as action items,
so that I don't rely on memory to follow through on what I said I'd do.

---

# Business Value

- Prevents broken promises made in passing conversation from being silently forgotten
- Converts conversational commitments into a trackable, prioritized checklist
- Improves professional reputation through reliable follow-through
- Feeds accurate, evidence-linked action items into Daily Summaries and Conference Reports

---

# Acceptance Criteria

## Functional Criteria
- Action items are extracted automatically from the meeting summary without manual entry
- Each item shows its source interaction/contact and the original commitment language it was derived from
- Items support manual completion and clearly show status (open/in progress/done/dismissed)

## UX Criteria
- Checklist view supports filtering by owner (self/contact/mutual), status, and due date
- Overdue items are visually distinguished from upcoming ones
- Manual "add action item" option exists for anything extraction missed

## Technical Criteria
- Extraction correctly infers owner (self, contact, mutual) in the majority of clear-cut cases
- Due dates are inferred from explicit relative time references when present, resolved against conference-local timezone
- Extraction deduplicates repeated mentions of the same commitment within a conversation

---

# Preconditions

- A `MeetingSummary` exists for the interaction being scanned
- Commitment language is present in the transcript/summary text
- Conference timezone/date context is available for due-date resolution

---

# Postconditions

- `ActionItem` records are created and visible in the checklist
- Items roll up into the day's Daily Summary
- Completed items are marked done and reflected across all views referencing them

---

# Edge Cases

- A vague commitment with no clear owner ("someone should follow up on this")
- A commitment stated and then explicitly retracted later in the same conversation
- A commitment referencing an external tool ("I'll ping you on Slack") that doesn't need in-app tracking
- Duplicate extraction from both the raw transcript and the generated summary
- Non-English commitment phrasing not well covered by the extraction model

---

# Telemetry

Track:
- `action_item_extracted`
- `action_item_completed`
- `action_item_dismissed`
- `action_item_manually_added`
- `action_item_viewed`

---

# Dependencies

- FEATURE-01 Meeting Summaries
- EPIC-05 Session & Conversation Intelligence
- FEATURE-02 Follow-Up Drafts (auto-completion signal)

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify action items are extracted automatically without manual entry
2. Verify each item shows its correct source interaction and original commitment quote
3. Verify owner inference correctly distinguishes self, contact, and mutual in clear-cut cases
4. Verify due-date inference correctly resolves a relative time reference against the conference timezone
5. Verify duplicate extraction within a single conversation is deduplicated
6. Verify manual completion updates status and is reflected in the Daily Summary rollup
7. Verify a retracted commitment is not left as an open action item
8. Verify manual "add action item" works independently of extraction

---

# Story Variation

This is user story variation 1 for Action-Item Extraction, focusing on the happy-path user experience of accurate, low-friction commitment capture.

---

# Notes

- Owner inference accuracy is the single biggest driver of trust in this feature — a misattributed item creates real relational friction if acted on incorrectly.
- This feature and Follow-Up Drafts should stay tightly coupled so sending a follow-up naturally closes out the related action item.
