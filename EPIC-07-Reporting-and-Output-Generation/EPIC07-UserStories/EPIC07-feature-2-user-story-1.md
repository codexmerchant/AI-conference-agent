# EPIC07 Feature 2 User Story 1

## Epic
EPIC-07 — Reporting & Output Generation

## Feature
FEATURE-02 — Follow-Up Drafts

---

# User Story

As a user,
I want a personalized follow-up message drafted automatically from my meeting summary,
so that I can send timely, specific outreach without writing it from scratch.

---

# Business Value

- Increases the rate of timely, specific follow-ups instead of generic or delayed outreach
- Converts captured meeting context directly into relationship-building action
- Reduces the time and friction between "had a good conversation" and "sent a good message"
- Improves professional reputation through consistently thoughtful, specific communication

---

# Acceptance Criteria

## Functional Criteria
- Draft is generated from the corresponding meeting summary and references at least one specific discussed point
- User can select channel (email/LinkedIn) and tone (formal/casual/concise) before or after generation
- Draft can be sent directly via a connected integration or copied for manual sending

## UX Criteria
- Draft is accessible with one tap directly from the meeting summary view
- Send and copy actions are clearly distinguished based on whether an integration is connected
- Edited drafts show clear diff from the originally generated version

## Technical Criteria
- Draft generation reuses the meeting summary's source data without re-processing raw transcript
- Draft records model_version and prompt_version for traceability
- Send action only fires on explicit user confirmation, never automatically

---

# Preconditions

- A `MeetingSummary` exists for the interaction
- Contact has at least one reachable channel on file, or user accepts a copy-only draft
- User has reviewed the draft before any send action

---

# Postconditions

- `FollowUpDraft` record is created and linked to the meeting summary and contact
- Draft status reflects its lifecycle (draft/edited/approved/sent/discarded)
- Sent drafts are timestamped and logged against the contact's relationship history

---

# Edge Cases

- Contact has no email or LinkedIn on file
- Draft references a company that has since been renamed or merged in the knowledge graph
- User has already manually followed up outside the app
- Draft generated for a low-confidence meeting summary
- User regenerates the draft multiple times before settling on a version

---

# Telemetry

Track:
- `follow_up_draft_generated`
- `follow_up_draft_edited`
- `follow_up_draft_sent`
- `follow_up_draft_copied`
- `follow_up_draft_discarded`

---

# Dependencies

- FEATURE-01 Meeting Summaries
- EPIC-06 Knowledge Graph (contact channel data)
- Plugin/Integration Layer (Gmail, Outlook, LinkedIn)

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify draft references specific content from the source meeting summary
2. Verify channel/tone selection changes the generated draft appropriately
3. Verify send action requires explicit user confirmation
4. Verify copy-to-clipboard fallback works when no integration is connected
5. Verify draft correctly links to the contact and source meeting summary
6. Verify regeneration preserves the ability to compare against the previous version
7. Verify draft generated for a low-confidence summary carries a visible warning
8. Verify sent status and timestamp are recorded accurately

---

# Story Variation

This is user story variation 1 for Follow-Up Drafts, focusing on the happy-path user experience of fast, personalized outreach generation.

---

# Notes

- This is the feature most directly tied to conference ROI — a summary with no resulting follow-up delivers little value.
- Tone/channel defaults should ideally be inferred over time from the user's own editing patterns.
