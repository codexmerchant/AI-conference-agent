# FEATURE-02 — Interaction Quality Analysis

## Epic
EPIC-09 — User Productivity & Coaching

---

# 1. Objective

Automatically assess the quality of each individual interaction (conversation, meeting, Q&A exchange) a user has at a conference, so users understand which conversations were substantive versus superficial.

---

# 2. Problem Statement

Users capture dozens of interactions per conference but have no way to distinguish a deep, high-value conversation from a 30-second badge-scan hallway greeting. Without quality signals, follow-up prioritization and coaching feedback are guesswork.

---

# 3. Feature Overview

Interaction Quality Analysis scores each captured interaction along dimensions like conversational depth, reciprocity (balance of talk time), topic relevance, and sentiment, using transcript and metadata analysis, and rolls these into an interaction-level quality score that feeds the User Score.

---

# 4. Key Functionalities

## Depth scoring
Measures substantive content exchanged (questions asked, topics covered, specificity) versus small talk.

## Reciprocity scoring
Measures talk-time balance and turn-taking between the user and the other party.

## Sentiment & rapport scoring
Detects positive/neutral/negative tone and engagement signals from transcript and vocal cues.

## Topic relevance scoring
Compares interaction topics against the user's stated goals/interests for the conference.

## Quality trend rollup
Aggregates interaction-level scores into per-conference and per-contact quality trends.

---

# 5. Primary Use Cases

## Use Case 1
User reviews their captured interactions list sorted by quality score to prioritize follow-ups.

## Use Case 2
User sees that a recurring contact's interaction quality has declined over multiple conferences.

## Use Case 3
System flags a low-quality interaction with a high-value prospect as worth a second follow-up attempt.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want each captured interaction scored for quality,
so that I know which conversations deserve prioritized follow-up.

### Acceptance Criteria
- Every interaction with a transcript of sufficient length receives a quality score within 5 minutes of capture
- Score breakdown shows depth, reciprocity, sentiment, and relevance components
- Interactions list can be sorted/filtered by quality score

## User Story 2
As a sales professional,
I want to see interaction quality trends with a specific recurring contact,
so that I can tell if the relationship is strengthening or cooling.

### Acceptance Criteria
- Per-contact interaction quality history is viewable across conferences
- Trend view highlights significant score changes (>15 points) between interactions
- User can annotate an interaction to correct a misjudged score

---

# 7. User Workflow

1. Interaction is captured (audio/transcript/notes) and tagged to a contact
2. Transcript segmentation and diarization complete (EPIC-02 dependency)
3. Quality analysis engine scores depth, reciprocity, sentiment, relevance
4. Composite interaction quality score is computed and persisted
5. Score appears in the interaction detail view and contact timeline
6. User can review, confirm, or flag the score as inaccurate
7. Score feeds into the User Score and coaching recommendation pipeline

---

# 8. UI / UX Requirements

- Quality badge (score + label, e.g., "High depth") on each interaction card
- Expandable breakdown showing the four component scores with plain-language explanations
- Sort/filter interactions list by quality score
- Per-contact quality trend sparkline
- Feedback control ("this score looks wrong") to flag for review

---

# 9. Technical Requirements

## Frontend
Interaction list and detail views render quality badges and breakdowns, with sort/filter controls and a lightweight feedback affordance wired to the scoring API.

## Backend
An analysis service subscribes to transcript-ready events, invokes the scoring pipeline per interaction, persists InteractionQualityRecord rows, and republishes a quality-scored event for downstream consumers (User Score, coaching).

## AI/ML
An LLM-based conversational analysis model extracts depth and relevance signals from transcript text; a lightweight acoustic/turn-taking model (from diarization output) computes reciprocity; a sentiment classifier scores tone; component scores are combined via a calibrated weighting model.

## Infrastructure
Event-driven processing keyed off transcript completion; per-interaction results cached; reprocessing supported when transcript corrections occur.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Transcription & Diarization Service (EPIC-02) | Source transcript text and speaker turn-taking data |
| Contact & Relationship Intelligence (EPIC-04) | Attach quality scores to contact interaction history |
| GET /interactions/{id}/quality | Retrieve quality score and breakdown for an interaction |
| POST /interactions/{id}/quality/recompute | Recompute score after transcript correction |
| GET /users/{id}/interaction-quality-summary | Retrieve aggregated quality stats for a user |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| InteractionQualityRecord | interaction_id, user_id, conference_id, contact_id, quality_score, depth_score, reciprocity_score, sentiment_score, relevance_score, talk_time_ratio, evaluated_at, model_version |
| InteractionFeedback | feedback_id, interaction_id, user_id, feedback_type (score_inaccurate, score_confirmed), comment, submitted_at |

---

# 12. Security & Privacy

- Quality analysis processes transcript content only for interactions the user has permission to view
- Sentiment/tone analysis does not infer or store protected-class attributes
- Interaction quality data is not shared with the other party in the conversation
- Feedback flags are retained for model improvement but anonymized in aggregate reporting

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Scoring latency after transcript ready | <5 min |
| Recompute latency | <2 min |
| Scoring success rate | >98% |
| P99 scoring pipeline latency | <10 min |

---

# 14. Edge Cases

- Interaction with no transcript (photo/note-only capture)
- Very short interaction (<30 seconds) with insufficient signal
- Multi-party group conversation with unclear turn attribution
- Transcript in a non-primary or code-switched language
- Diarization misattributes speaker turns, skewing reciprocity score
- User manually overrides a score that conflicts with the model's confidence

---

# 15. Dependencies

- Streaming Transcription & Speaker Diarization (EPIC-02, Features 2-3)
- Contact & Relationship Intelligence (EPIC-04)
- Conference Scoring (Feature 1, this epic) as a downstream consumer

---

# 16. Risks

- Reciprocity scoring penalizes legitimate listening-heavy interactions (e.g., keynote Q&A)
- Sentiment model misreads cultural/communication-style differences as negative
- Users game the score by padding transcripts with filler talk
- Over-reliance on quality scores discourages spontaneous, low-stakes networking

---

# 17. Telemetry & Analytics

Track:
- `interaction_quality_scored`
- `interaction_quality_recompute_requested`
- `interaction_quality_feedback_submitted`
- `interaction_quality_score_viewed`
- `interaction_list_sorted_by_quality`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Interactions scored within SLA | >98% |
| User feedback rate flagging inaccurate scores | <5% |
| Correlation between quality score and follow-up completion | positive, tracked quarterly |
| User satisfaction with score usefulness (survey) | >4.0/5.0 |

---

# 19. Future Enhancements

- Real-time in-conversation quality nudges (e.g., "ask a follow-up question")
- Cross-conference relationship quality trajectory modeling
- Benchmark quality scores against role/industry norms

---

# 20. Open Questions

- Should low-quality interactions be hidden from the primary interactions list by default?
- How should the model handle interactions conducted in a language other than the user's primary language?
- Should users be able to fully suppress quality scoring for privacy-sensitive conversations?
