# FEATURE-02 — Speaker Recognition

## Epic
EPIC-05 — Session & Conference Intelligence

---

# 1. Objective

Resolve anonymous diarized speaker labels ("Speaker 1", "Speaker 2") to real-world identities using self-introductions, conference agenda data, and consented voiceprint matching.

---

# 2. Problem Statement

Diarization separates audio into speaker turns but does not know who each speaker is. Without identity resolution, quotes, insights, and summaries cannot be attributed to a real name, which sharply limits their usefulness for notes and follow-up.

---

# 3. Feature Overview

Speaker Recognition matches each diarized `speaker_id` to a known identity using multiple signals: NLP detection of self-introductions near the start of a session, matching against a published speaker/agenda roster, consented voiceprint similarity matching against previously captured contacts, and manual user confirmation. Results are stored with a resolution method and confidence score.

---

# 4. Key Functionalities

## Self-Introduction Detection
NLP model detects name-stating utterances (e.g., "Hi, I'm...") near the start of a session.

## Agenda/Roster Matching
Cross-references a session's published speaker list against detected speaker count and order.

## Voiceprint Matching
Compares speaker embeddings to prior, consented voice profiles of known contacts.

## Manual Speaker Tagging
Lets the user confirm or correct an identity suggestion.

## Confidence-Scored Identity Assignment
Attaches a confidence score and resolution method to every resolved identity.

---

# 5. Primary Use Cases

## Use Case 1
Attendee wants quotes attributed to the speaker's actual name instead of "Speaker 2".

## Use Case 2
User wants the app to recognize a contact's voice from a session they attended before.

## Use Case 3
Organizer wants a panel transcript auto-labeled using the conference's published agenda.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want speaker turns labeled with the actual speaker's name,
so that my notes and quotes are properly attributed.

### Acceptance Criteria
- Resolved names are shown inline in the transcript
- Unresolved speakers display a clear placeholder, not a guessed name
- A confidence indicator is shown next to each resolved name

## User Story 2
As a frequent user,
I want the app to recognize a contact I've heard speak before,
so that I don't have to manually tag them again.

### Acceptance Criteria
- Voiceprint matching only runs against contacts who consented to voice storage
- A match surfaces as a suggested identity requiring user confirmation, never auto-published
- Accepted matches are stored so future sessions recognize the same contact

---

# 7. User Workflow

1. `DiarizationCompleted` event received for the session
2. Self-introduction detector scans the first few minutes of transcript for name-stating cues
3. Published agenda/roster (if available) is matched against detected speaker order and count
4. Voiceprint matcher compares speaker embeddings against consented contact voice profiles
5. Candidate identities are scored and ranked by resolution method and confidence
6. Low-confidence matches are surfaced to the user for manual confirmation
7. `SpeakerIdentityResolved` event emitted; `resolved_contact_id` attached to the speaker record

---

# 8. UI / UX Requirements

- Inline "Who is this speaker?" prompt with a suggested name
- Confidence badge next to each resolved speaker name
- Tap-to-confirm or tap-to-correct identity control
- Speaker roster panel listing all resolved and unresolved speakers for a session

---

# 9. Technical Requirements

## Frontend
An identity confirmation UI shown inline in the transcript, plus a session-level speaker roster panel showing resolution status per speaker.

## Backend
An identity resolution worker triggered on diarization completion, a roster ingestion service for conference agenda data, and a correction API for manual overrides.

## AI/ML
A self-introduction NLP extractor, a voiceprint embedding and similarity-search model, and an agenda-matching heuristic that reconciles detected speaker count/order with a published roster.

## Infrastructure
A consent-gated voiceprint store and a vector similarity index for embedding comparisons.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| GET /sessions/{id}/speakers | Retrieve resolved and unresolved speaker list |
| PATCH /sessions/{id}/speakers/{speaker_id} | Manually confirm or correct an identity |
| POST /sessions/{id}/speakers/resolve | Trigger identity resolution |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| speaker_identity | id, session_id, speaker_id, resolved_contact_id, resolution_method, confidence, confirmed_by_user |
| voiceprint | id, contact_id, embedding_vector, consent_status, created_at |

---

# 12. Security & Privacy

- Voiceprint storage requires explicit opt-in consent and is treated as biometric-adjacent data
- Users can delete their stored voiceprint at any time
- Identity suggestions are never auto-published to shared or public-facing content without user confirmation

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Identity resolution latency | <30 sec after diarization completes |
| Self-introduction detection recall | >80% when an introduction is present |
| Voiceprint match precision | >90% |

---

# 14. Edge Cases

- Speaker never states their name during the session
- Two speakers have very similar voices or share the same name
- Agenda roster is missing, outdated, or lists a substitute speaker
- User revokes voiceprint consent mid-session
- Speaker is a walk-on/unlisted panelist not on the published agenda
- Same speaker's voice varies significantly (illness, poor mic quality)

---

# 15. Dependencies

- EPIC-02 Speaker Diarization
- Contact Intelligence System (PRD 5.3) for known contacts and consented voiceprints
- Conference agenda/session metadata ingestion

---

# 16. Risks

- Misattribution can misquote a speaker and damage user trust
- Biometric voiceprint handling carries regulatory/compliance risk (e.g., GDPR, BIPA)

---

# 17. Telemetry & Analytics

Track:
- `speaker_identity_resolution_started`
- `speaker_identity_resolved`
- `speaker_identity_low_confidence`
- `speaker_identity_manually_corrected`
- `voiceprint_match_attempted`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Auto-resolution rate | >70% of speakers resolved without manual input |
| Manual correction rate | <15% |
| User trust rating on attribution | >4.2/5 |

---

# 19. Future Enhancements

- Cross-conference speaker recognition network effects across a user's full history
- Opt-in public speaker directory for well-known industry figures

---

# 20. Open Questions

- Should voiceprint matching be enabled by default or require explicit opt-in?
- How should speaker recognition handle anonymous, unlisted audience questioners?
