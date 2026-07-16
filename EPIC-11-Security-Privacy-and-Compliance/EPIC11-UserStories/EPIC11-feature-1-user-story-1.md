# EPIC11 Feature 1 User Story 1

## Epic
EPIC-11 — Security, Privacy & Compliance

## Feature
FEATURE-01 — Recording Consent Management

---

# User Story

As a user,
I want to quickly capture consent from someone I'm meeting before I keep recording our conversation,
so that I can stay compliant without breaking the natural flow of a networking conversation.

---

# Business Value

- Reduces legal risk from recording third parties without documented consent
- Keeps networking conversations natural instead of legally awkward
- Builds trust with contacts who see their consent is explicitly respected
- Creates a defensible, timestamped record for every recorded interaction

---

# Acceptance Criteria

## Functional Criteria
- Consent capture action is reachable within one tap from the active session screen
- Verbal, tap, and QR consent methods are all supported and produce an equivalent `ConsentRecord`
- Declining consent immediately stops durable retention of that person's audio going forward

## UX Criteria
- Consent capture completes in under 5 seconds for the verbal method
- A visible confirmation chip appears once consent is successfully logged
- The recording indicator updates immediately to reflect the new participant's consent state

## Technical Criteria
- Consent capture works offline and syncs the record once connectivity returns
- Each `ConsentRecord` includes subject_id (or a placeholder for unidentified third parties), consent_method, and captured_by_user_id
- Consent state is available to the audio pipeline before the next buffer flush

---

# Preconditions

- Conference session is active and recording is buffering
- A new participant has joined the conversation
- A localized consent script is available for the detected language

---

# Postconditions

- A `ConsentRecord` is persisted and linked to the session and subject
- The recording indicator reflects the current consent state for all present parties
- Downstream transcription and storage services are notified of the updated consent state

---

# Edge Cases

- Person declines partway through the consent explanation
- Person walks away before confirming, leaving consent status unresolved
- Multiple new participants join the conversation simultaneously
- Consent script is unavailable in the participant's spoken language
- Ambient noise at a busy conference booth garbles a verbal consent confirmation
- User forgets to capture consent until partway through the conversation

---

# Telemetry

Track:
- `consent_prompt_shown`
- `consent_granted`
- `consent_declined`
- `third_party_consent_captured`
- `consent_capture_abandoned`

---

# Dependencies

- Audio Ingestion Service (EPIC-02)
- Regional Compliance Engine (Feature 6)
- Real-Time Capture Indicator (EPIC-01)

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify one-tap consent capture flow completes and logs a ConsentRecord
2. Verify declining consent stops durable retention for that participant
3. Verify verbal, tap, and QR consent methods each produce a valid record
4. Verify offline consent capture syncs correctly once connectivity returns
5. Verify recording indicator updates immediately after consent is granted or declined
6. Verify consent capture works correctly when multiple participants join at once
7. Verify unresolved consent (person walks away) leaves recording state unchanged, not silently granted
8. Verify localized consent script displays correctly for supported languages

---

# Story Variation

This is user story variation 1 for Recording Consent Management, focusing on the everyday user experience of capturing consent quickly during live conversations.

---

# Notes

- Consent UX must not add meaningful friction to the networking flow or users will skip it.
- Verbal consent capture should be paired with a lightweight speech-cue check to help flag likely-missed confirmations for later review.
