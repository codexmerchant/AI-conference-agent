# FEATURE-07 — Follow-Up Management Workspace

## Epic
EPIC-14 — Desktop Analysis Workspace

---

# 1. Objective

Give users a dedicated desktop workspace to triage, edit, schedule, and track AI-drafted follow-ups and action items across all recent conferences, so post-event outreach actually gets sent rather than lost in a mobile notification queue.

---

# 2. Problem Statement

Follow-up drafts are generated per interaction but there is no consolidated place to review them in bulk, edit before sending, schedule sends, or track which have gone out; on mobile, drafts get buried and outreach momentum is lost within days of the conference ending.

---

# 3. Feature Overview

A kanban/list workspace of follow-up items grouped by status (draft, scheduled, sent, done), with inline draft editing, batch scheduling/sending, snooze/reminders, and direct links back to the source contact and interaction.

---

# 4. Key Functionalities

## Status-based board view
Follow-ups organized by draft/scheduled/sent/done status, with drag-and-drop status changes.

## Inline draft editing
Edit follow-up message text directly within the workspace before sending.

## Batch scheduling and sending
Select multiple follow-ups and schedule or send them together, respecting per-contact timing preferences.

## Snooze and reminders
Defer a follow-up to a later date/time with a reminder notification.

## Source linking
Each follow-up links back to its originating contact profile and source interaction/transcript.

---

# 5. Primary Use Cases

## Use Case 1
User returns from a conference with 40 drafted follow-ups, reviews and edits each briefly, then batch-sends them all before end of day.

## Use Case 2
User snoozes a follow-up to a contact who mentioned they'd be traveling for two weeks.

## Use Case 3
User checks the "sent" column to confirm which follow-ups went out successfully and which bounced.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want to review and send my follow-up drafts from a single workspace,
so that I can complete post-conference outreach quickly instead of chasing drafts across the app.

### Acceptance Criteria
- User can view all follow-up drafts for a conference in one board/list.
- User can edit a draft's text inline before sending.
- User can send an individual follow-up or a multi-select batch in one action.

## User Story 2
As a power user,
I want to schedule and snooze follow-ups,
so that outreach goes out at the right time instead of all at once or too late.

### Acceptance Criteria
- User can schedule a follow-up for a specific future date/time.
- User can snooze a follow-up, which removes it from the active queue until the snooze date.
- Scheduled and snoozed follow-ups send automatically at the configured time without further action.

---

# 7. User Workflow

1. User opens Follow-Up Management Workspace from the desktop dashboard.
2. Workspace loads follow-up items grouped by status for the selected conference or date range.
3. User reviews and edits draft text inline as needed.
4. User selects one or more follow-ups to send immediately, schedule, or snooze.
5. System confirms the batch action and shows a progress/result summary.
6. Sent follow-ups move to the "sent" column with delivery status.
7. User can reopen a follow-up from any column to review its linked contact and source interaction.

---

# 8. UI / UX Requirements

- Kanban board with drag-and-drop between status columns, plus an equivalent list view for accessibility/filtering.
- Inline text editor within each follow-up card.
- Multi-select with visible batch-action toolbar.
- Delivery status indicators (sent, delivered, bounced) on sent items.
- Snooze/schedule date picker accessible directly from a card.

---

# 9. Technical Requirements

## Frontend
SwiftUI board/list view with drag-and-drop status transitions and an inline rich-text-lite editor per card, optimized for reviewing dozens of items quickly.

## Backend
Follow-up items are read/written through desktop endpoints backed by the same follow-up drafting and outreach-send services used elsewhere, so status changes here are reflected across devices.

## AI/ML
Consumes AI-drafted follow-up text and suggested send timing from the Follow-Up Agent; this feature does not generate new drafts, only edits and dispatches existing ones.

## Infrastructure
Scheduled/snoozed sends are handled by a server-side scheduler independent of the desktop app being open; batch sends respect outbound rate limits per integrated email/messaging provider.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| `GET /desktop/followups` | List follow-up items with status/filter support |
| `PATCH /desktop/followups/{id}` | Edit draft text, status, or schedule |
| `POST /desktop/followups/batch-send` | Send or schedule multiple follow-ups at once |
| `POST /desktop/followups/{id}/snooze` | Defer a follow-up to a later date |
| Reporting & Output Generation (EPIC-07) | Source of AI-drafted follow-up content |
| Integrations & Sync Platform (EPIC-08) | Gmail/Outlook send channels |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| FollowUpItem | id, contact_id, conference_id, source_interaction_id, draft_text, status, channel, scheduled_at, sent_at, delivery_status |
| FollowUpBoardView | id, user_id, filter_config, sort_order, last_opened_at |
| FollowUpSnooze | id, followup_id, snoozed_until, snoozed_by, reason |

---

# 12. Security & Privacy

- Outbound sends require explicit user confirmation for batch actions; no automatic sending without scheduling consent.
- Contact communication data (email addresses, message content) is encrypted at rest and in transit.
- Delivery/bounce data is only visible to the owning user, not shared across accounts.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Board load (100 follow-ups) | <1.5 sec |
| Inline draft edit save | <500 ms |
| Batch send submission (50 items) | <3 sec |
| Status sync across devices | <5 sec |

---

# 14. Edge Cases

- Batch send partially fails because some contact email addresses are invalid or bounce.
- Follow-up is scheduled for a contact who has already independently replied.
- Duplicate follow-ups generated from two separate interactions with the same contact.
- Scheduled send time falls in a different timezone than the contact's location.
- Contact has unsubscribed or requested no further contact.
- Mobile app changes a follow-up's status concurrently with a desktop edit.

---

# 15. Dependencies

- EPIC-07 Reporting & Output Generation (Follow-Up Agent drafts)
- EPIC-08 Integrations & Sync Platform (Gmail/Outlook send channels)
- EPIC-04 Contact & Relationship Intelligence (contact/channel data)
- Server-side scheduling service

---

# 16. Risks

- Batch-sending without sufficient review risking generic or inaccurate outreach at scale.
- Scheduler reliability directly affecting whether promised follow-ups actually go out on time.
- Duplicate or conflicting follow-ups damaging the user's professional reputation if not deduplicated.

---

# 17. Telemetry & Analytics

Track:
- `followup_board_opened`
- `followup_draft_edited`
- `followup_sent`
- `followup_batch_sent`
- `followup_snoozed`
- `followup_send_failed`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Follow-ups sent within 72 hours of conference end | >60% |
| Batch send success rate | >97% |
| Median edit time per follow-up before send | <1 min |
| Duplicate follow-up rate | <2% |

---

# 19. Future Enhancements

- AI-suggested optimal send time per contact based on past engagement.
- Reply detection that automatically marks a follow-up thread as "responded."
- Follow-up sequencing (multi-touch outreach) beyond a single message.

---

# 20. Open Questions

- Should batch send have a hard cap per action to avoid looking like spam to recipients?
- How should the workspace reconcile a follow-up sent from mobile with its desktop board state?
- Should snoozed follow-ups automatically re-surface with updated context if the contact posts new activity elsewhere?
