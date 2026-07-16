# FEATURE-01 — Gmail Integration

## Epic
EPIC-08 — Integrations & Sync Platform

---

# 1. Objective

Connect a user's Gmail account so conference follow-up emails can be drafted, sent, and tracked, and so reply activity can be linked back to conference contacts automatically.

---

# 2. Problem Statement

Conference follow-ups are drafted by the AI agent but currently have no path to actually reach a contact's inbox or to confirm whether a reply arrived, forcing users to manually copy summaries into their own email client and losing the connection between a captured interaction and its outcome.

---

# 3. Feature Overview

A Google OAuth-based connection that lets the app read relevant thread metadata, send AI-drafted follow-up emails on the user's behalf (with explicit send approval), and match inbound replies to existing conference contacts and sessions so follow-up status stays current without manual entry.

---

# 4. Key Functionalities

## OAuth connect/disconnect flow
Google OAuth 2.0 consent screen requesting `gmail.readonly` and `gmail.send` scopes, with a one-click disconnect that revokes the token.

## Follow-up draft creation and send
AI-generated follow-up email is created as a Gmail draft or sent directly after user approval, using the `gmail.send` scope.

## Reply detection and thread matching
Incoming replies in tracked threads are matched to the originating contact and conference session via `Message-ID`/`References` headers.

## Contact email resolution
Sender/recipient addresses on relevant threads are matched against existing contact records, including alias and display-name variants.

## Incremental sync via history API
Gmail `history.list` with a stored `historyId` is used to pull only new/changed messages instead of re-scanning the mailbox.

---

# 5. Primary Use Cases

## Use Case 1
User approves and sends an AI-drafted follow-up email to a contact captured at a conference booth.

## Use Case 2
A contact replies to a follow-up email, and the reply is automatically linked to that contact's timeline in the app.

## Use Case 3
User disconnects Gmail after the conference season ends and all future sync stops immediately.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want to send my AI-drafted follow-up email straight from the app,
so that I do not have to copy-paste content into Gmail manually.

### Acceptance Criteria
- User can review and send a draft without leaving the app.
- Sent message appears in the user's actual Gmail "Sent" folder.
- Send failures are surfaced with a retry option.

## User Story 2
As a power user,
I want the app to detect when a contact replies to my follow-up,
so that I know who I still need to chase.

### Acceptance Criteria
- Replies in a tracked thread update the contact's follow-up status within one sync cycle.
- Reply detection works even if the user replies from a different device.
- No reply content is duplicated or shown to the wrong contact.

---

# 7. User Workflow

1. User taps "Connect Gmail" in Integrations settings.
2. Google OAuth consent screen requests read/send scopes.
3. App stores the token reference and performs an initial lightweight history sync.
4. User reviews an AI-drafted follow-up for a captured contact.
5. User taps Send; app sends via Gmail API and records the message ID.
6. Background sync polls/receives push notifications for replies on tracked threads.
7. Reply is matched to the contact and reflected in the contact's timeline.

---

# 8. UI / UX Requirements

- Clear connect/disconnect toggle with account email shown once connected.
- Scope explanation shown before consent ("read subject/sender of relevant threads, send on your behalf").
- Draft preview screen before any email is sent, with edit-in-place support.
- Visual indicator of sync status (last synced time, syncing, error).
- Reply received badge on the contact card.

---

# 9. Technical Requirements

## Frontend
Integration settings screen with OAuth connect button, draft review/edit modal, and per-contact reply status indicator backed by the sync status API.

## Backend
Gmail API client wrapping OAuth token exchange, `users.history.list` incremental sync, `users.messages.send`, and `users.drafts.create`; a webhook receiver for Gmail push notifications via Google Cloud Pub/Sub.

## AI/ML
Existing follow-up drafting model output is reused; a lightweight classifier flags whether an inbound message is a genuine reply vs. an auto-reply/bounce before updating contact status.

## Infrastructure
Per-user encrypted token storage in the secrets vault, Pub/Sub topic and subscription per environment for push notifications, and a scheduled fallback poller for users without push enabled.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Google OAuth 2.0 | Authorize read/send access to the user's Gmail account |
| Gmail API (`users.messages`, `users.history`, `users.drafts`) | Read thread metadata, send follow-ups, sync incrementally |
| Google Cloud Pub/Sub | Push notifications for new mail on watched mailboxes |
| Contact Service | Resolve sender/recipient addresses to existing contact records |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| GmailIntegration | id, user_id, google_account_email, oauth_token_ref, scopes, history_id_cursor, watch_expiration, sync_status, last_synced_at, connected_at |
| EmailFollowUp | id, contact_id, conference_session_id, gmail_message_id, gmail_thread_id, direction (outbound/inbound), status (draft/sent/failed/replied), sent_at, created_at |
| EmailThreadMatch | id, follow_up_id, matched_contact_id, match_confidence, matched_at |

---

# 12. Security & Privacy

- Request the minimum viable scopes (`gmail.readonly`, `gmail.send`); never request full mailbox modify/delete scopes.
- OAuth tokens stored only as vault references; never logged or returned in API responses.
- Only thread metadata and message bodies relevant to tracked conference contacts are processed and retained; unrelated inbox content is never indexed.
- User can revoke access at any time, which immediately deletes the stored token reference and stops all sync.
- Sent emails are attributed to the user's own Gmail account, not a shared sending domain.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| OAuth connect completion | <10 sec end-to-end |
| Reply detection latency (push enabled) | <2 min |
| Reply detection latency (poll fallback) | <15 min |
| Follow-up send success rate | >99% |

---

# 14. Edge Cases

- OAuth token expires or is revoked mid-sync.
- Google API rate limit (quota units) exceeded during a bulk backfill.
- Contact's email address doesn't match any known contact record (alias or personal address).
- User has multiple Gmail accounts and connects the wrong one.
- Out-of-office autoresponder is misclassified as a genuine reply.
- Pub/Sub watch subscription expires (7-day max) without renewal, silently halting push updates.

---

# 15. Dependencies

- Authentication and identity platform
- Contact data store and matching service
- AI follow-up drafting feature (EPIC-03/EPIC context engine)
- Secrets vault for token storage
- Webhook framework (Pub/Sub notification ingestion)

---

# 16. Risks

- Google API quota limits constraining bulk sync for high-volume users.
- Users perceiving email scope requests as invasive, reducing connect rate.
- Push notification infrastructure outage silently degrading to slow polling without alerting.

---

# 17. Telemetry & Analytics

Track:
- `gmail_connected`
- `gmail_disconnected`
- `gmail_followup_sent`
- `gmail_followup_send_failed`
- `gmail_reply_detected`
- `gmail_sync_error`
- `gmail_token_refresh_failed`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Gmail connect completion rate | >80% of users who start the flow |
| Follow-up send success rate | >99% |
| Reply detection accuracy | >95% |
| Median reply detection latency | <2 min |

---

# 19. Future Enhancements

- Smart send-time optimization based on recipient timezone/open patterns.
- Multi-account Gmail support for users managing multiple inboxes.
- Automatic thread summarization for long back-and-forth reply chains.

---

# 20. Open Questions

- Should sent follow-ups be BCC'd to a shared team inbox for visibility?
- How long should thread metadata be retained after a follow-up is marked closed?
- Should the app support Gmail aliases/delegated mailboxes, and if so how is consent scoped?
