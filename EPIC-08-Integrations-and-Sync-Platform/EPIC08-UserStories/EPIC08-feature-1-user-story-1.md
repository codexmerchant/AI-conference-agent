# EPIC08 Feature 1 User Story 1

## Epic
EPIC-08 — Integrations & Sync Platform

## Feature
FEATURE-01 — Gmail Integration

---

# User Story

As a user,
I want to send my AI-drafted conference follow-up emails directly from my own Gmail account,
so that I can close the loop with new contacts without copying content into a separate email client.

---

# Business Value

- Removes the manual copy-paste step between the app's AI-drafted follow-up and actually sending it
- Increases follow-up send rate by keeping the action inside the same flow as capture
- Preserves sender authenticity since emails are sent from the user's real Gmail address, not a shared domain
- Enables automatic reply tracking that would be impossible without a connected mailbox

---

# Acceptance Criteria

## Functional Criteria
- User can connect their Gmail account via OAuth with `gmail.readonly` and `gmail.send` scopes
- User can review, edit, and send an AI-drafted follow-up without leaving the app
- Sent messages are recorded with the Gmail message ID and thread ID for later reply matching

## UX Criteria
- Draft preview clearly shows recipient, subject, and body before send is confirmed
- Send confirmation and failure states are visually distinct and immediate
- Connection status (connected account email, last synced time) is always visible in Integrations settings

## Technical Criteria
- OAuth tokens are stored only as vault references (`oauth_token_ref`), never in plaintext
- Send failures return a deterministic error code distinguishing auth failure, rate limit, and malformed message
- Every send attempt is logged with a correlation ID for troubleshooting

---

# Preconditions

- User has an active Google account with Gmail enabled
- User has authenticated with the app and has at least one captured contact
- An AI-drafted follow-up has been generated for the target contact

---

# Postconditions

- Follow-up email exists in the user's actual Gmail "Sent" folder
- EmailFollowUp record is created with status `sent` and the Gmail message ID
- Contact's follow-up status is updated to reflect the send
- `gmail_followup_sent` telemetry event is recorded

---

# Edge Cases

- User attempts to send before completing the OAuth connection flow
- Draft contains an invalid or missing recipient email address
- Gmail API returns a transient 5xx error during send
- User has multiple Google accounts and the wrong one is connected
- Send is attempted while the OAuth token is mid-refresh

---

# Telemetry

Track:
- `gmail_connected`
- `gmail_followup_draft_reviewed`
- `gmail_followup_sent`
- `gmail_followup_send_failed`
- `gmail_followup_edited_before_send`

---

# Dependencies

- Google OAuth 2.0 and Gmail API
- AI follow-up drafting feature (context/intelligence engine)
- Contact data store
- Secrets vault for token storage

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify successful OAuth connection with correct scopes requested
2. Verify draft preview renders recipient, subject, and body accurately
3. Verify successful send updates EmailFollowUp status and contact follow-up state
4. Verify send failure due to invalid recipient shows a clear, actionable error
5. Verify send failure due to Gmail API 5xx triggers a retry option
6. Verify sent message appears in the user's actual Gmail Sent folder
7. Verify edited draft content is sent as edited, not the original AI draft
8. Verify telemetry events fire correctly for both success and failure paths

---

# Story Variation

This is user story variation 1 for Gmail Integration, focusing on the happy-path user experience of reviewing and sending an AI-drafted follow-up email.

---

# Notes

- This story establishes the baseline send flow that reply detection (story 2) and admin scope controls (story 3) build on
- Draft review UX should reuse the same component later parameterized for Outlook (FEATURE-02) to keep behavior consistent across providers
