# Slice 1 Acceptance Standard

**Status:** Accepted on July 30, 2026

**Slice:** Conversation to Reviewed Action

**Acceptance owner:** Product stakeholder

## Outcome under test

A user provides a recording they are permitted to process and receives an editable interaction containing:

- a usable transcript;
- the primary contact and contact details supported by the recording;
- grounded topics and summary;
- complete commitments with correct ownership and supported dates;
- a follow-up draft from the app user's perspective;
- source audio and provenance;
- save, reopen, correction, and retry behavior.

Slice 1 is accepted only when the controlled fixture passes every critical gate, the weighted score is at least 85/100, the required automated and browser checks pass, and the evidence is recorded in `LOCAL-AI-VALIDATION.md`. The score measures overall completeness and usefulness; critical gates prevent serious correctness or safety errors from being averaged away by strong performance elsewhere.

## Weighted scorecard

| Area | Weight | Passing expectation |
|---|---:|---|
| Transcription | 20 | At least 90% normalized word accuracy on clear controlled audio; business-critical names, organizations, dates, and commitments remain recoverable |
| Contact extraction | 15 | Primary contact identity is correct; fields are supported or explicitly unknown; spoken email is normalized and flagged for review |
| Topics and summary | 20 | Material themes are covered; statements are factual; commitments are attributed correctly; no unsupported claims |
| Actions and ownership | 25 | Material commitments are present, use the correct owner, remain usefully separated, and retain supporting evidence |
| Date handling | 10 | Absolute dates are preserved; relative dates use an explicit interaction-date anchor; unsupported dates remain absent |
| Follow-up draft | 10 | Correct sender and recipient perspective; promised actions and requested next steps are accurate; no false claim that an action or attachment has already occurred |

## Critical failure gates

The fixture fails regardless of aggregate score if any of the following occur:

1. A material commitment is assigned to the wrong participant.
2. A deadline is invented or a relative date is resolved without a valid interaction-date anchor.
3. The follow-up draft uses the wrong sender or recipient perspective.
4. The primary contact is materially misidentified.
5. Generated text claims an action, message, introduction, meeting, or attachment occurred when the transcript only proposed or promised it.
6. Unsupported information is presented as certain rather than unknown or requiring review.
7. Audio is durably stored or processed without the required permission confirmation.
8. A provider failure silently falls back to a paid or unintended provider.
9. Saving or retrying duplicates the interaction or source media.

## Controlled fixture contract

The canonical fixture files are:

- `../output/audio/simulated-conference-conversation.m4a`
- `../output/audio/simulated-conference-reference.md`
- `../output/audio/simulated-conference-expected.json`

Fixture context:

- App user: Maya Chen
- Primary contact: Daniel Ruiz
- Interaction date: August 2, 2026
- Timezone: America/Los_Angeles
- Conference: HealthTech Futures 2026
- Interaction: Networking area after a responsible-clinical-AI panel

The machine-readable expected file is authoritative for automated scoring. The reference Markdown provides the human-readable scenario and script.

## Required test checkpoints

### A. Deterministic contract and validation

- Required interaction metadata reaches both local and explicitly selected cloud analysis providers.
- Unknown owners and dates are valid outputs.
- Every action retains transcript evidence or an evidence reference.
- Unsupported deadlines are rejected or removed before display.
- Spoken email normalization is deterministic and validated.
- Displayed confidence is derived from validated fields and uncertainty, not accepted as a single unverified model claim.

### B. Controlled end-to-end fixture

- MLX Whisper transcribes the synthetic audio at or above the transcription threshold.
- Contact, topics, summary, commitments, owners, supported dates, and follow-up perspective match the fixture contract.
- Every critical gate passes.
- Overall weighted score is at least 85/100.

### C. Variation and ambiguity

At minimum, privacy-safe fixtures cover:

- missing email and missing deadline;
- ambiguous commitment owner;
- relative date with a known anchor;
- relative date without an anchor;
- contact-only commitment and user-only commitment;
- unclear or low-quality entity spelling;
- irrelevant or non-conversation audio;
- provider unavailable or malformed provider output.

Unclear inputs must produce reviewable uncertainty rather than fabricated certainty.

### D. Review workflow

- User can see and correct contact, summary, actions, dates, owners, follow-up, and transcript.
- Uncertain fields are visibly distinguished from verified or strongly supported fields.
- Corrections mark the interaction as changed and survive save/reopen.
- Copying the draft does not send it.
- Source audio remains playable after save/reopen.

### E. Failure, privacy, and persistence

- Permission confirmation is required for real audio processing.
- Unsupported type, empty file, oversized file, unavailable local provider, provider error, and invalid structured output produce understandable errors.
- Retry is safe and does not duplicate saved records or media.
- Local processing remains local under default settings.
- OpenAI is used only through explicit provider configuration.

## Acceptance evidence

The final validation record must include:

- code and fixture revision;
- provider and model versions;
- automated-test results;
- controlled-fixture category scores and total;
- critical-gate results;
- browser and failure-path results;
- known limitations and explicit exclusions;
- stakeholder acceptance or rejection.

## Current baseline

The July 29 controlled run is a failing baseline. Its provisional end-to-end score is 62/100. It fails commitment ownership, date grounding, and follow-up-perspective gates. See `LOCAL-AI-VALIDATION.md` for evidence.

The earlier July 30 prompt-attribution run failed the ownership gate and is superseded by the final FluidAudio-diarized run below.

## Final acceptance result — July 30, 2026

| Area | Score | Evidence |
|---|---:|---|
| Transcription | 19/20 | 95.89% normalized word accuracy; critical names, dates, and commitments recoverable |
| Contact extraction | 15/15 | Daniel Ruiz, role, ClearPath Labs, and normalized email correct and grounded |
| Topics and summary | 20/20 | Material themes and commitment perspectives correct; no unsupported completion claims |
| Actions and ownership | 22/25 | Maya preparation tasks, Daniel introduction, and mutual call correctly owned; one overview action remains visibly review-flagged because its cited evidence says “materials” |
| Date handling | 10/10 | August 3 and August 4 grounded; `later that week` remains undated |
| Follow-up draft | 8/10 | Correct sender and future perspective; materials and Thursday/Friday availability included; introduction wording is implicit rather than explicit |
| **Total** | **94/100** | Exceeds the approved 85-point threshold |

All nine critical failure gates pass on the accepted Apple-silicon Mac environment. The original automated suite passed 27/27. The final browser run verified local service readiness, controlled audio upload, permission, speaker-labelled transcript, correct editable owners and dates, visible uncertainty, save, list, and reopen. FluidAudio 0.7.12 performed within-recording diarization in approximately 1.5–2.0 seconds on the controlled 2:12 fixture. Slice 1 is accepted on Mac with human review retained for low-confidence evidence and exceptional speaker mappings. The expanded Linux and Windows requirement remains pending platform-specific controlled-fixture and critical-gate acceptance; provider-adapter unit tests alone do not satisfy that requirement.
