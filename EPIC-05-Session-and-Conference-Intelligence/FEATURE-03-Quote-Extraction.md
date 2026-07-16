# FEATURE-03 — Quote Extraction

## Epic
EPIC-05 — Session & Conference Intelligence

---

# 1. Objective

Automatically identify and extract notable, quotable statements from session transcripts with accurate speaker attribution and timestamps.

---

# 2. Problem Statement

Manually scanning long transcripts for shareable or notable quotes is slow, and attendees often miss quotable insights buried deep in a session they cannot fully reread.

---

# 3. Feature Overview

An NLP pipeline scores transcript sentences and spans for "quotability" (standalone clarity, novelty, sentiment strength), extracts the top candidates per session, attaches speaker attribution and surrounding context, and makes them available for review, bookmarking, and sharing.

---

# 4. Key Functionalities

## Quotability Scoring
Score sentences/spans on standalone clarity, novelty, and sentiment strength.

## Speaker-Attributed Extraction
Attach the resolved or diarized speaker to each extracted quote.

## Context Window Capture
Store the surrounding sentences before and after the quote for context.

## Shareable Card Generation
Format an extracted quote as a shareable card with speaker and session attribution.

## Manual Quote Bookmarking
Let the user mark their own quote from the live or reviewed transcript.

---

# 5. Primary Use Cases

## Use Case 1
User wants the top quotes from a keynote to share on social media.

## Use Case 2
User skimming a session recap wants standout statements highlighted automatically.

## Use Case 3
User tags a quote live during the talk for later reference.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want the app to surface the most notable quotes from a session automatically,
so that I don't have to reread the full transcript to find them.

### Acceptance Criteria
- Top-ranked quotes are returned with speaker, timestamp, and quote text
- Each quote can be viewed in its original transcript context
- Near-duplicate phrasings of the same point are filtered out

## User Story 2
As a content-sharing user,
I want to export a quote as a shareable card,
so that I can post it on social media with proper attribution.

### Acceptance Criteria
- Export includes speaker name/title, session and conference name, and a timestamp link
- Export supports both image and plain-text formats
- Unresolved speakers export with a neutral placeholder rather than a guessed name

---

# 7. User Workflow

1. `TranscriptSegmented` event received
2. Quote extraction worker scores each segment/sentence for quotability
3. Candidate quotes are ranked and near-duplicates deduplicated via embedding similarity
4. Speaker attribution is attached from `speaker_identity` if resolved, else the diarized label
5. Top-N quotes are persisted with their context window
6. `QuotesExtracted` event emitted
7. User may manually bookmark additional quotes via the live or reviewed transcript

---

# 8. UI / UX Requirements

- Quotes tab per session with card-based layout
- Matching quote text highlighted within the full transcript view
- One-tap share/export control on each quote card
- Manual "bookmark quote" control available during live capture

---

# 9. Technical Requirements

## Frontend
A quotes tab, a quote card component with in-context highlighting, and a share/export flow.

## Backend
A quote extraction worker, a near-duplicate deduplication service, and a manual bookmark API.

## AI/ML
A quotability scoring model built on sentiment, novelty, and standalone-clarity features, plus embedding-based near-duplicate detection.

## Infrastructure
An async worker queue for extraction and an image-generation service for shareable quote cards.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| GET /sessions/{id}/quotes | Retrieve extracted quotes for a session |
| POST /sessions/{id}/quotes | Manually bookmark a quote |
| GET /quotes/{id}/export | Generate a shareable quote card |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| quote | id, session_id, transcript_id, speaker_id, resolved_contact_id, quote_text, start_ts, end_ts, quotability_score, context_before, context_after, source, created_by |

---

# 12. Security & Privacy

- Sharing a quote respects the underlying session/transcript's visibility permissions
- Attribution to a named speaker requires a resolved identity or an explicit "unattributed" disclaimer
- Exported cards never include unresolved-speaker biometric or voiceprint data

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Extraction latency | <45 sec after segmentation (60-min session) |
| Quote relevance (user rating) | >4/5 average |
| Duplicate quote rate | <5% |

---

# 14. Edge Cases

- Quote spans a moment of speaker interruption or cross-talk
- Sarcasm or a quote taken out of context misrepresents the speaker's intent
- Non-English or code-switched speech
- Speaker explicitly says "this is off the record"
- Very short session yields no strong quote candidates
- Manual bookmark timestamp drifts from the actual utterance due to capture lag

---

# 15. Dependencies

- EPIC-02 Transcript Segmentation
- EPIC-02 Speaker Diarization
- FEATURE-02 Speaker Recognition (for named attribution)

---

# 16. Risks

- Misattributed or out-of-context quotes could embarrass a speaker or the platform
- Automated scoring may favor bland, "safe" statements over genuinely notable ones

---

# 17. Telemetry & Analytics

Track:
- `quote_extraction_started`
- `quote_extraction_completed`
- `quote_bookmarked_manually`
- `quote_shared`
- `quote_flagged_incorrect`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Auto-extracted quote acceptance rate | >75% kept or shared vs. discarded |
| Manual bookmark usage | Tracked per active user |
| Share conversion rate | >20% of surfaced quotes shared |

---

# 19. Future Enhancements

- Auto-suggest quote graphics matched to conference branding
- Trending quotes across an entire conference (aggregate popularity)

---

# 20. Open Questions

- Should verbal "off the record" cues be auto-detected and excluded from extraction?
- What is the right default top-N quote count relative to session length?
