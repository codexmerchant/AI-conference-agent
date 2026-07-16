# FEATURE-02 — Follow-Up Drafts

## Epic
EPIC-07 — Reporting & Output Generation

---

# 1. Objective

Automatically draft a personalized, channel-appropriate follow-up message (email or LinkedIn) for each interaction, generated from the corresponding Meeting Summary and the contact's relationship history, ready for the user to review and send.

---

# 2. Problem Statement

Attendees intend to follow up with most new contacts but rarely do so within the window where it matters — by the time they sit down to write, days have passed, the details are fuzzy, and the resulting message is generic. Momentum and relationship value are lost between the conversation and the outreach.

---

# 3. Feature Overview

The Follow-Up Agent consumes a `MeetingSummary`, the contact's profile and relationship history from the knowledge graph (EPIC-06), and the interaction's context tags (EPIC-03) to draft a personalized message referencing what was actually discussed. Drafts are channel- and tone-aware, editable, and can be sent directly through a connected email/LinkedIn integration or copied out.

---

# 4. Key Functionalities

## Draft generation from summary
Generates a subject line and body referencing specific discussion points, not generic networking boilerplate.

## Channel and tone selection
User can pick channel (email, LinkedIn message) and tone (formal, casual, concise) per draft or set a default.

## Multi-touch sequencing
Supports a sequence of drafts (e.g., immediate thank-you plus a one-week nudge) tied to the same interaction.

## Send integration
Sends directly via a connected Gmail/Outlook/LinkedIn integration, or falls back to copy-to-clipboard when no integration is connected.

## Edit and regenerate
User can edit inline or request regeneration with different tone/length while the interaction context is preserved.

---

# 5. Primary Use Cases

## Use Case 1
User taps "Generate Follow-up" from a meeting summary and sends a personalized thank-you email within two minutes of finishing a conversation.

## Use Case 2
User schedules a one-week follow-up nudge for a promising contact who didn't respond to the first message.

## Use Case 3
User has no email connected, so the draft is generated for copy-paste into their own mail client instead of one-tap send.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want a personalized follow-up message drafted from my meeting summary,
so that I can send timely, specific outreach without writing it from scratch.

### Acceptance Criteria
- Draft references at least one specific point from the meeting summary, not generic phrasing.
- User can edit the draft before sending or copying it.
- Draft generation completes fast enough to send while the conversation is still fresh.

## User Story 2
As a user managing many new contacts,
I want to queue a second follow-up touch for contacts who haven't responded,
so that I don't let promising relationships go cold.

### Acceptance Criteria
- User can schedule a second-touch draft tied to the same interaction and contact.
- Sequenced drafts are generated with awareness of the first message's content to avoid repetition.
- Sequence is cancelable if the contact has already responded.

---

# 7. User Workflow

1. User opens a generated Meeting Summary or the contact's profile.
2. User taps "Generate Follow-up" (or it is proactively suggested).
3. Follow-Up Agent pulls the summary, contact profile, and relationship history.
4. LLM prompt generates subject line and body for the selected channel/tone.
5. Draft is presented to the user for review.
6. User edits if needed, then sends via connected integration or copies it out.
7. Draft status updates to `sent`, and a second-touch draft can optionally be scheduled.

---

# 8. UI / UX Requirements

- Draft view shows subject, body, channel, and tone selector with live regeneration.
- Clear "not yet sent" vs "sent" status indicator on every draft.
- One-tap send when an integration is connected; one-tap copy when it is not.
- Warning shown before sending a draft that references low-confidence summary content.
- Sequence view showing planned/sent touches per contact.

---

# 9. Technical Requirements

## Frontend
Draft composer view (SwiftUI/React) with channel/tone selectors, inline editor, and a send/copy action bar reflecting current integration connection state.

## Backend
Follow-Up Draft Service reads `MeetingSummary` and knowledge-graph relationship data, applies a versioned prompt template per channel/tone combination, and persists drafts with full generation lineage; send actions proxy through the Plugin/Integration Layer (Gmail, Outlook, LinkedIn) defined in PRD §5.7.

## AI/ML
Prompt template parameterized by `{summary, contact_history, channel, tone}`; a lightweight repetition-check step compares a second-touch draft against the first to avoid restating the same content.

## Infrastructure
Send actions are queued and retried on transient integration failures, with delivery status reconciled back into the draft record; scheduled second-touch drafts run on a delayed job scheduler.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Meeting Summaries Service (FEATURE-01) | Supplies the source summary content for drafting |
| Knowledge Graph (EPIC-06) | Supplies contact relationship history and prior touches |
| Gmail / Outlook API | Sends the drafted email directly on the user's behalf |
| LinkedIn Messaging API | Sends the drafted message where platform permissions allow |
| CRM (Salesforce/HubSpot/Affinity) | Logs sent follow-ups against the CRM contact record |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| FollowUpDraft | draft_id, meeting_summary_id, contact_id, channel (email/linkedin), tone, subject_line, body_text, sequence_step, status (draft/edited/approved/sent/discarded), generated_at, sent_at, send_integration_id, model_version, prompt_version |

---

# 12. Security & Privacy

- Sending requires explicit user confirmation; no draft is auto-sent without an approval action.
- OAuth tokens for email/LinkedIn integrations are stored encrypted and scoped to minimum required permissions.
- Drafts referencing another person's private information are flagged before send.
- Send history is retained for audit but draft body text is deletable by the user at any time.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Draft generation latency (P50) | <10 sec |
| Send confirmation latency | <5 sec after user taps send |
| Draft generation success rate | >97% |

---

# 14. Edge Cases

- Contact has no email or LinkedIn on file to send to.
- User regenerates a draft multiple times, creating conflicting edited versions.
- Contact has opted out of further contact (flagged in the knowledge graph).
- Draft references a company that has since been merged/renamed in the graph.
- Integration token expires mid-send.
- User has already manually followed up outside the app before the draft is generated.

---

# 15. Dependencies

- FEATURE-01 Meeting Summaries
- EPIC-06 Knowledge Graph (relationship history, contact opt-out status)
- Plugin/Integration Layer (Gmail, Outlook, LinkedIn, CRM)
- LLM inference gateway

---

# 16. Risks

- Auto-drafted tone misreads the relationship (too casual/too formal) and damages rapport.
- Send-integration outage blocks time-sensitive outreach.
- Sequenced follow-ups feel automated/spammy if not sufficiently personalized per touch.

---

# 17. Telemetry & Analytics

Track:
- `follow_up_draft_generated`
- `follow_up_draft_edited`
- `follow_up_draft_sent`
- `follow_up_draft_discarded`
- `follow_up_sequence_scheduled`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Draft-to-send conversion rate | >60% |
| Median time from summary to send | <10 min |
| Draft edit rate before send | <30% |

---

# 19. Future Enhancements

- Reply detection to auto-cancel a scheduled second-touch draft.
- A/B tested tone/length variants informed by historical response rates.
- Voice dictation for quick draft edits on mobile.

---

# 20. Open Questions

- Should second-touch drafts be sent automatically after a configurable no-response window, or always require explicit approval?
- How should the system handle contacts who explicitly asked not to be emailed but to be reached on LinkedIn only?
- What is the default tone when no user preference or prior relationship signal exists?
