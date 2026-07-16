# EPIC14 Feature 7 User Story 1

## Epic
EPIC-14 — Desktop Analysis Workspace

## Feature
FEATURE-07 — Follow-Up Management Workspace

---

# User Story

As a user,
I want to review, edit, and send my AI-drafted follow-ups from a single workspace,
so that I can complete post-conference outreach quickly instead of drafts getting lost or stale.

---

# Business Value

- Increases the percentage of drafted follow-ups that actually get sent
- Reduces time spent hunting for scattered drafts across mobile notifications
- Preserves relationship momentum by making prompt outreach easy
- Turns AI-drafted intent into completed action, closing the loop on captured interactions

---

# Acceptance Criteria

## Functional Criteria

- User can view all follow-up drafts for a conference grouped by status (draft/scheduled/sent/done)
- User can edit a draft's text inline before sending
- User can send an individual follow-up or a multi-select batch in one action
- Each follow-up links back to its source contact and originating interaction

## UX Criteria

- Status changes are reflected via drag-and-drop or an equivalent quick action
- Batch actions show a clear scope confirmation before sending
- Sent items display delivery status (sent/delivered/bounced)

## Technical Criteria

- Follow-up data loads via `GET /desktop/followups` with status/filter support
- Edits save via `PATCH /desktop/followups/{id}`
- Batch sends execute via `POST /desktop/followups/batch-send`

---

# Preconditions

- User is authenticated with access to the conference's follow-up drafts
- Follow-Up Agent has generated at least one draft for the session

---

# Postconditions

- Sent follow-ups move to the "sent" column with accurate delivery status
- Edited draft text is persisted before send
- Source interaction/contact links remain accurate after send

---

# Edge Cases

- Batch send partially fails because some contact email addresses are invalid
- Follow-up is scheduled for a contact who has already independently replied
- Duplicate follow-ups exist from two separate interactions with the same contact
- Contact has previously unsubscribed or requested no further contact
- Mobile app changes a follow-up's status concurrently with a desktop edit
- User attempts to send a follow-up with an empty or placeholder-only draft

---

# Telemetry

Track:
- `followup_board_opened`
- `followup_draft_edited`
- `followup_sent`
- `followup_batch_sent`

---

# Dependencies

- EPIC-07 Reporting & Output Generation (Follow-Up Agent drafts)
- EPIC-08 Integrations & Sync Platform (email send channels)
- EPIC-04 Contact & Relationship Intelligence (contact/channel data)

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify follow-up board loads and correctly groups items by status
2. Verify inline draft edits save correctly before send
3. Verify individual send delivers the follow-up and updates status
4. Verify batch send processes multiple follow-ups and reports per-item results
5. Verify a follow-up correctly links to its source contact and interaction
6. Verify sending is blocked or warned for an empty/placeholder draft
7. Verify unsubscribed contacts are excluded from send with a clear warning
8. Verify delivery status (sent/delivered/bounced) updates accurately after send

---

# Story Variation

This is user story variation 1 for Follow-Up Management Workspace, focusing on the happy-path review-and-send experience.

---

# Notes

- Batch send is likely the highest-leverage action in this feature for users returning from large conferences and deserves particular UX polish
- Consider a lightweight quality check (e.g., placeholder-text detection) before allowing send
