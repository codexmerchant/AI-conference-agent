# EPIC05 Feature 2 User Story 1

## Epic
EPIC-05 — Session & Conference Intelligence

## Feature
FEATURE-02 — Speaker Recognition

---

# User Story

As a user,
I want speaker turns in my session transcripts labeled with real names instead of "Speaker 1" / "Speaker 2",
so that my notes, quotes, and summaries are properly attributed to the people who actually said them.

---

# Business Value

- Makes captured transcripts immediately useful for follow-up and note-taking without manual relabeling
- Increases the value of quotes and insights by giving them credible, named attribution
- Builds a growing personal directory of recognized voices that improves over time
- Differentiates the product from plain transcription tools that leave speakers anonymous

---

# Acceptance Criteria

## Functional Criteria
- Speakers who state their name are auto-resolved with a visible confidence score
- Speakers matched via a published agenda/roster are labeled accordingly
- Unresolved speakers show a clear, non-misleading placeholder rather than a guessed name

## UX Criteria
- Resolved names appear inline in the transcript within the session review flow
- Low-confidence matches are visually distinguished from high-confidence matches
- User can tap any speaker label to confirm or correct the identity in under two taps

## Technical Criteria
- Identity resolution completes within 30 seconds of diarization completion
- Resolution results are stored with `resolution_method` and `confidence` for later auditing
- Manual corrections immediately propagate to all quotes/insights already attributed to that `speaker_id`

---

# Preconditions

- Session diarization has completed and produced distinct `speaker_id`s
- User is authenticated and owns or has access to the session
- Consented voiceprints (if any) exist for the user's known contacts

---

# Postconditions

- `speaker_identity` records persisted for each resolved or attempted-resolution speaker
- `SpeakerIdentityResolved` event emitted to unblock downstream attribution-dependent features
- Transcript view reflects resolved names for the user's next visit

---

# Edge Cases

- Speaker never states their name and no roster/voiceprint match exists
- Two panelists have very similar first names, causing ambiguous suggestions
- Published agenda lists a speaker who was replaced by a last-minute substitute
- User declines a suggested voiceprint match, requiring the system to keep the speaker unresolved
- A previously resolved contact's voice sounds different due to illness or poor audio quality

---

# Telemetry

Track:
- `speaker_identity_resolved`
- `speaker_identity_suggestion_shown`
- `speaker_identity_suggestion_accepted`
- `speaker_identity_suggestion_rejected`
- `speaker_identity_manually_corrected`

---

# Dependencies

- EPIC-02 Speaker Diarization
- Contact Intelligence System (PRD 5.3)
- Conference agenda/roster ingestion

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify a speaker who introduces themselves by name is correctly auto-resolved
2. Verify roster matching correctly labels panelists in the published agenda order
3. Verify voiceprint matching surfaces a suggestion requiring explicit user confirmation
4. Verify an unresolved speaker displays a neutral placeholder, never a fabricated name
5. Verify manual correction of a speaker label propagates to all associated quotes and insights
6. Verify confidence indicators render correctly for high vs. low confidence resolutions
7. Verify resolution completes within the 30-second SLA for a typical session
8. Verify rejecting a suggested voiceprint match keeps the speaker unresolved rather than falling back to a guess

---

# Story Variation

This is user story variation 1 for Speaker Recognition, focusing on the happy-path functional experience of an attendee getting speakers auto-labeled.

---

# Notes

- Resolution quality directly gates the credibility of Quote Extraction and Key Insight Extraction downstream
- Consider surfacing why a suggestion was made (self-intro vs. roster vs. voiceprint) so users can judge trust level
