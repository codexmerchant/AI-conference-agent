# FEATURE-02 — Outlook Integration

## Epic
EPIC-08 — Integrations & Sync Platform

---

# 1. Objective

Connect a user's Microsoft 365/Outlook mailbox via Microsoft Graph so conference follow-up emails can be sent and reply activity tracked for enterprise users who standardize on Microsoft rather than Google.

---

# 2. Problem Statement

A large share of enterprise attendees use Outlook/Exchange Online rather than Gmail; without a native Outlook connection, those users cannot benefit from AI-drafted follow-up sending and reply tracking, forcing a manual, disconnected workflow identical to having no integration at all.

---

# 3. Feature Overview

A Microsoft identity platform (MSAL/OAuth 2.0) connection using Microsoft Graph to send AI-drafted follow-up emails from the user's mailbox and to detect replies via Graph change notifications (webhooks), mirroring the Gmail integration's behavior for Microsoft-hosted mailboxes.

---

# 4. Key Functionalities

## OAuth connect/disconnect flow
Microsoft identity platform consent screen requesting `Mail.Read` and `Mail.Send` delegated permissions, with disconnect that revokes the refresh token.

## Follow-up draft creation and send
AI-generated follow-up is created as a Graph API draft message or sent directly after user approval via `POST /me/sendMail`.

## Reply detection via Graph subscriptions
Microsoft Graph change notification subscriptions on the mailbox's message resource detect new replies in tracked threads.

## Contact email resolution
Sender/recipient addresses are matched against existing contact records, including Exchange resolved-name and SMTP proxy address variants.

## Subscription renewal management
Graph subscriptions (max ~4230 minutes / ~3 days lifetime) are auto-renewed before expiry to keep push notifications flowing.

---

# 5. Primary Use Cases

## Use Case 1
An enterprise user connects their corporate Outlook mailbox and sends a follow-up to a prospect met at a booth.

## Use Case 2
A contact replies from Outlook, and the app updates that contact's follow-up status automatically.

## Use Case 3
IT-managed conditional access policy blocks the OAuth grant, and the user needs a clear error explaining why.

---

# 6. User Stories

## User Story 1
As a conference attendee using a corporate Outlook account,
I want to send my AI-drafted follow-up email from my Outlook mailbox,
so that recipients see it coming from my verified corporate identity.

### Acceptance Criteria
- User can review and send a draft without leaving the app.
- Sent message appears in the user's actual Outlook "Sent Items" folder.
- Send failures caused by conditional access or admin consent requirements show an actionable error.

## User Story 2
As a power user,
I want the app to detect when a contact replies to my Outlook follow-up,
so that I know who I still need to chase without checking my inbox manually.

### Acceptance Criteria
- Replies in a tracked thread update the contact's follow-up status within one sync cycle.
- Graph subscription renewal happens automatically without user intervention.
- No reply content is duplicated or shown to the wrong contact.

---

# 7. User Workflow

1. User taps "Connect Outlook" in Integrations settings.
2. Microsoft identity platform consent screen requests Mail.Read/Mail.Send permissions.
3. App exchanges the auth code for tokens and stores the token reference.
4. App creates a Graph change notification subscription on the mailbox.
5. User reviews an AI-drafted follow-up for a captured contact.
6. User taps Send; app sends via Graph `sendMail` and records the message ID.
7. Graph notifications (or fallback polling) detect replies and update contact status.

---

# 8. UI / UX Requirements

- Clear connect/disconnect toggle with account UPN (email) shown once connected.
- Scope explanation shown before consent, including note that a tenant admin may need to approve.
- Draft preview screen before any email is sent, with edit-in-place support.
- Explicit error state distinguishing "admin consent required" from "user denied" from "connection lost."
- Reply received badge on the contact card, consistent with the Gmail integration's UI pattern.

---

# 9. Technical Requirements

## Frontend
Integration settings screen reusing the same draft review/edit modal and reply-status indicator components as Gmail, parameterized by provider.

## Backend
Microsoft Graph API client wrapping MSAL OAuth token exchange, `/me/sendMail`, `/me/messages`, and `/subscriptions` for change notifications; a webhook receiver validating Graph's client-state token on each notification.

## AI/ML
Same follow-up drafting and auto-reply/bounce classification logic used by the Gmail integration, applied provider-agnostically to normalized message payloads.

## Infrastructure
Per-user encrypted token storage in the secrets vault, a scheduled job renewing Graph subscriptions before their ~3-day expiry, and a fallback delta-query poller for tenants that block webhook subscriptions.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Microsoft identity platform (OAuth 2.0 / MSAL) | Authorize delegated mailbox access |
| Microsoft Graph API (`/me/messages`, `/me/sendMail`, `/subscriptions`) | Read thread metadata, send follow-ups, subscribe to change notifications |
| Microsoft Graph delta query | Fallback incremental sync when push notifications are unavailable |
| Contact Service | Resolve sender/recipient addresses to existing contact records |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| OutlookIntegration | id, user_id, microsoft_account_upn, tenant_id, oauth_token_ref, scopes, delta_link_cursor, subscription_id, subscription_expires_at, sync_status, last_synced_at, connected_at |
| EmailFollowUp | id, contact_id, conference_session_id, graph_message_id, graph_conversation_id, direction (outbound/inbound), status (draft/sent/failed/replied), sent_at, created_at |
| EmailThreadMatch | id, follow_up_id, matched_contact_id, match_confidence, matched_at |

---

# 12. Security & Privacy

- Request only `Mail.Read` and `Mail.Send` delegated permissions; never request application-level or full-mailbox permissions.
- OAuth tokens stored only as vault references; never logged or returned in API responses.
- Graph subscription notifications are validated against the stored `clientState` secret before being trusted.
- Only thread metadata and message bodies relevant to tracked conference contacts are processed and retained.
- User can revoke access at any time, immediately deleting the stored token reference, canceling the Graph subscription, and stopping all sync.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| OAuth connect completion | <10 sec end-to-end |
| Reply detection latency (subscription active) | <2 min |
| Reply detection latency (delta-query fallback) | <15 min |
| Subscription renewal success rate | >99.5% |

---

# 14. Edge Cases

- Tenant admin has not granted consent for the app, blocking connection entirely.
- Conditional access policy (MFA, device compliance) intermittently blocks token refresh.
- Graph subscription expires because the renewal job fails, silently degrading to no updates.
- Hybrid Exchange (on-premises mailbox) not reachable via Graph.
- Shared or delegate mailbox scenarios where "me" does not resolve to the expected mailbox.
- Throttling (`429` with `Retry-After`) during a bulk backfill sync.

---

# 15. Dependencies

- Authentication and identity platform
- Contact data store and matching service
- AI follow-up drafting feature (shared with Gmail integration)
- Secrets vault for token storage
- Webhook framework (Graph notification ingestion)

---

# 16. Risks

- Enterprise tenant admin policies blocking or delaying app approval, reducing adoption among the highest-value users.
- Graph subscription renewal failures causing silent, hard-to-detect sync gaps.
- Divergence between Gmail and Outlook follow-up behavior confusing users who connect both.

---

# 17. Telemetry & Analytics

Track:
- `outlook_connected`
- `outlook_disconnected`
- `outlook_admin_consent_required`
- `outlook_followup_sent`
- `outlook_followup_send_failed`
- `outlook_reply_detected`
- `outlook_subscription_renewal_failed`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Outlook connect completion rate | >75% of users who start the flow |
| Follow-up send success rate | >99% |
| Subscription renewal success rate | >99.5% |
| Reply detection accuracy | >95% |

---

# 19. Future Enhancements

- Support for shared/delegate mailbox sending on behalf of a team account.
- Outlook calendar-aware send-time suggestions using free/busy data.
- Admin-consent self-service flow with pre-filled tenant approval instructions.

---

# 20. Open Questions

- Should the app support application-permission (tenant-wide) mode for enterprise customers who want centralized IT approval instead of per-user consent?
- How should the app behave when a tenant admin revokes consent after users have already connected?
- Should Outlook and Gmail follow-up threads be unified in one timeline view when a user connects both?
