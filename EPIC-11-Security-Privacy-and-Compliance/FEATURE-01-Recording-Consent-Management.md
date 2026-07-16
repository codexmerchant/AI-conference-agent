# FEATURE-01 — Recording Consent Management

## Epic
EPIC-11 — Security, Privacy & Compliance

---

# 1. Objective

Ensure every audio or video recording captured by the platform has explicit, verifiable, and revocable consent from all recorded parties — including third parties who never opened the app — before that recording is persisted or processed beyond a short local buffer.

---

# 2. Problem Statement

Conference conversations routinely involve people who are not app users: booth staff, panelists, strangers met in hallways. Recording them without a documented consent event exposes the user and the company to wiretapping and eavesdropping liability, GDPR/CCPA violations, and destroys user trust if there is no visible signal that recording is happening. Today the product has no formal mechanism to capture, store, or enforce consent.

---

# 3. Feature Overview

A consent capture and enforcement layer sitting in front of the audio pipeline (EPIC-02). It requires an explicit consent event before raw audio is retained beyond a rolling local buffer window, supports multiple consent-capture methods (verbal announcement with logged confirmation, tap-to-consent on a shared screen, QR/badge scan), stores consent as a first-class auditable record tied to the session and subject, and propagates grant/revoke state to downstream services in near real time.

---

# 4. Key Functionalities

## Pre-recording consent prompt
Presents a consent confirmation to the primary user before any recording is retained past the local rolling buffer.

## Third-party consent capture
Lets the user capture consent from non-app-user participants via tap, logged verbal confirmation, or QR/badge scan.

## Consent state propagation
Broadcasts grant/revoke events to transcription, storage, and retention services in near real time.

## Jurisdiction-aware consent rules
Applies one-party vs. two-party/all-party consent requirements based on the region detected by the Regional Compliance Engine.

## Consent revocation and redaction
Lets any recorded party revoke consent at any time, triggering deletion or redaction of the associated media and transcript segment.

---

# 5. Primary Use Cases

## Use Case 1
User starts Conference Mode and confirms their own recording consent before the session begins.

## Use Case 2
User sits down for a 1:1 meeting and captures verbal consent from the other person before continuing to record.

## Use Case 3
A third party asks the user to stop recording mid-conversation and the affected segment is redacted.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want to confirm my own recording consent with one tap when I start capture,
so that I can begin capturing without legal ambiguity about my own participation.

### Acceptance Criteria
- Consent prompt is shown before the first byte of audio is persisted beyond the local buffer.
- User can accept or decline in a single tap; declining disables durable audio retention but still allows manual notes.
- The resulting consent decision is stored as a `ConsentRecord` with `subject_type = self`.

## User Story 2
As a user meeting a new contact,
I want to capture that person's verbal consent as a logged, timestamped event,
so that I have a defensible record if they later question whether the conversation was recorded.

### Acceptance Criteria
- Verbal consent capture creates a `ConsentRecord` linked to the subject and session within 2 seconds of confirmation.
- The UI shows a confirmation chip once the consent event is successfully logged.
- The record includes `consent_method = verbal` and `captured_by_user_id` for accountability.

---

# 7. User Workflow

1. User taps Start Conference Mode.
2. App shows a self-consent prompt; user accepts.
3. Recording begins buffering locally, no durable persistence yet.
4. When a new participant joins the conversation, the app surfaces a "capture consent" quick action.
5. User taps the action, states the localized consent script aloud, and confirms it was acknowledged, or the subject scans a QR code / taps a shared screen.
6. Consent event is logged; recording continues persisting past the local buffer.
7. If a participant revokes consent, the user taps "stop recording for this person," triggering redaction of that portion of the session.

---

# 8. UI / UX Requirements

- Persistent, always-visible recording indicator whenever active consent exists.
- Distinct visual state for "buffering only — no durable consent captured yet."
- One-tap third-party consent capture reachable from the active session screen.
- Consent scripts localized to the subject's detected or selected language.
- Revoke-consent control always reachable within two taps from any screen.

---

# 9. Technical Requirements

## Frontend
SwiftUI consent modal and a persistent recording-indicator overlay; local consent cache so capture works offline and syncs when connectivity returns.

## Backend
A consent service exposing grant/revoke endpoints and publishing consent-state changes onto an event bus consumed by the transcription and storage services.

## AI/ML
Lightweight speech-cue detection flags likely verbal consent phrases for QA review; this assists auditing but never substitutes for the logged consent event.

## Infrastructure
A durable, low-latency consent event log, replicated across regions so the audio pipeline can check active consent state before persisting any segment.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| POST /consent/grant | Record a consent grant for self or a third party |
| POST /consent/revoke | Revoke a previously granted consent |
| GET /consent/session/{session_id} | Fetch all consent records for a session |
| POST /consent/third-party/capture | Capture consent from a non-app-user participant |
| GET /consent/status/{session_id} | Real-time check of active consent state before persisting audio |
| Regional Compliance Engine | Determine required consent type (one-party vs. all-party) for the session's jurisdiction |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| ConsentRecord | consent_id, session_id, subject_id, subject_type (self\|third_party\|bystander), consent_method (verbal\|tap\|qr\|badge_scan), consent_type (recording\|transcription\|storage\|sharing), granted_at, revoked_at, jurisdiction, language, recording_indicator_shown, captured_by_user_id |
| ConsentScript | script_id, jurisdiction, language, script_text, version |

---

# 12. Security & Privacy

- No audio is persisted beyond the rolling local buffer without an active `ConsentRecord`.
- Revocation triggers the redaction pipeline within a bounded SLA, not merely a block on future use.
- Third-party consent records store the minimum identifying data required; no biometric capture without a separate, explicit consent step.
- Consent scripts are jurisdiction-verified and version-controlled before use.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Consent state propagation latency | <500ms |
| Consent prompt render time | <1 sec |
| Revocation-to-redaction trigger | <5 sec |

---

# 14. Edge Cases

- Recording started before consent is captured from a third party at the table.
- Group setting (panel, booth) where not every attendee can individually consent.
- Consent revoked mid-recording after the content has already been transcribed and indexed downstream.
- Consent script unavailable in the subject's spoken language.
- User is in a two-party consent jurisdiction but on-device region detection is wrong or stale.
- Subject later disputes having given verbal consent, with no independently verifiable evidence beyond the logged event.

---

# 15. Dependencies

- Audio Ingestion Service (EPIC-02)
- Regional Compliance Engine (Feature 6)
- Access Control Framework (Feature 4)
- Session and device permission system (EPIC-01)

---

# 16. Risks

- Verbal consent capture is not independently verifiable and could be contested.
- Jurisdiction misdetection could invalidate the legal basis for an entire session's recording.
- Consent fatigue in fast-paced networking settings could lead users to skip proper capture.

---

# 17. Telemetry & Analytics

Track:
- `consent_prompt_shown`
- `consent_granted`
- `consent_declined`
- `third_party_consent_captured`
- `consent_revoked`
- `redaction_triggered`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Sessions with valid self-consent | 100% |
| Third-party consent capture rate for 1:1 meetings | >80% |
| Revocation-to-redaction completion time | <5 sec p95 |

---

# 19. Future Enhancements

- Passive voice-print cues to proactively suggest third-party consent capture.
- Shared consent kiosk mode for booths and panel recordings.

---

# 20. Open Questions

- Should declining self-consent block audio capture entirely, or allow a local-only recording that is never uploaded?
- What retention period applies to the consent records themselves?
- How should group panel recordings handle consent when individual capture from every attendee is impractical?
