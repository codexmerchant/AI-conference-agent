# FEATURE-06 — Key Insight Extraction

## Epic
EPIC-05 — Session & Conference Intelligence

---

# 1. Objective

Extract structured, synthesized insights — claims, predictions, recommendations, data points, and trends — from a session for downstream knowledge graph and reporting use.

---

# 2. Problem Statement

Raw transcripts and even extracted quotes don't surface the synthesized "so what" of a session. Users need distilled, typed takeaways they can act on, save, or reference later, rather than having to infer significance from verbatim text.

---

# 3. Feature Overview

An LLM pipeline classifies and extracts insight-worthy statements or spans into typed categories (claim, prediction, recommendation, data point, trend) with supporting transcript evidence, then feeds these into the Knowledge Graph Engine (PRD 5.6) and reporting features.

---

# 4. Key Functionalities

## Insight Type Classification
Categorize each candidate insight as a claim, prediction, recommendation, data point, or trend.

## Evidence Linking
Attach the supporting transcript span(s) to each insight.

## Deduplication Across Session
Merge near-duplicate insights that are restated multiple times.

## Confidence & Novelty Scoring
Score each insight's importance and novelty for ranking.

## Knowledge Graph Export
Format extracted insights for ingestion into the knowledge graph engine.

---

# 5. Primary Use Cases

## Use Case 1
User wants a bullet list of the 3-5 most important takeaways from a talk.

## Use Case 2
Analyst wants to track predictions made across a conference for future validation.

## Use Case 3
User wants insights auto-tagged into their personal knowledge base.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want the app to extract the key takeaways from a session,
so that I can quickly capture what mattered without manual note-taking.

### Acceptance Criteria
- Insights are returned with a type label and supporting evidence
- Insights are ranked by importance/novelty
- Restated insights within the same session are deduplicated

## User Story 2
As a knowledge-management user,
I want extracted insights exported to my knowledge graph,
so that they're connected to related topics and contacts automatically.

### Acceptance Criteria
- The export payload includes the typed insight, its evidence, and linked entities
- Export triggers a graph ingestion event
- Export failures are retried and logged with a correlation ID

---

# 7. User Workflow

1. `TranscriptSegmented` and `SessionSummaryGenerated` events received
2. Insight extraction worker scans segments for insight-bearing spans
3. LLM classifies each candidate into an insight type with a supporting evidence span
4. A deduplication pass merges restated insights using semantic similarity
5. Novelty/confidence scoring ranks the remaining insights
6. Insights are persisted and linked to the session and speaker
7. `InsightsExtracted` event emitted; insights optionally pushed to the knowledge graph ingestion queue

---

# 8. UI / UX Requirements

- Insights list grouped by type with a distinct icon per type
- Evidence link that jumps to the source transcript timestamp
- "Save to knowledge base" action per insight
- Filter/sort controls by type or confidence

---

# 9. Technical Requirements

## Frontend
An insights list view with type filters, evidence deep-links, and a save-to-knowledge-base action per insight.

## Backend
An insight extraction worker, a deduplication service, and a knowledge graph export adapter.

## AI/ML
An insight classification model/prompt, semantic deduplication via embedding clustering, and a novelty scoring model.

## Infrastructure
An async worker queue for extraction and event bus integration with the Knowledge Graph Engine.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| GET /sessions/{id}/insights | Retrieve extracted insights for a session |
| POST /sessions/{id}/insights/{id}/save | Save an insight to the user's knowledge base |
| POST /sessions/{id}/insights/export | Export insights to the knowledge graph |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| insight | id, session_id, transcript_id, speaker_id, insight_type, insight_text, evidence_segment_ids, confidence, novelty_score, duplicate_of_id, created_at |

---

# 12. Security & Privacy

- Exporting insights to the knowledge graph respects the session's sharing/visibility settings
- Evidence links never expose content outside the requesting user's transcript access
- Claims/predictions attributed to a speaker must trace to a resolved identity or be marked unattributed

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Extraction latency | <60 sec after summary generation (60-min session) |
| Deduplication accuracy | >90% duplicate merge rate |
| Insight relevance rating | >4/5 average |

---

# 14. Edge Cases

- Speaker makes a claim that is later contradicted within the same session
- An insight depends on a data point shown only on a slide, not spoken aloud
- Highly technical session where insight type classification is ambiguous
- Session with no clear insights (purely narrative/anecdotal talk)
- The same insight is restated across multiple sessions at the conference
- Knowledge graph export fails mid-transaction

---

# 15. Dependencies

- EPIC-02 Transcript Segmentation
- FEATURE-05 Session Summarization
- Knowledge Graph Engine (PRD 5.6)

---

# 16. Risks

- Misclassified predictions or claims could misrepresent a speaker's actual intent
- Over-extraction creates noise that buries genuinely important insights

---

# 17. Telemetry & Analytics

Track:
- `insight_extraction_started`
- `insight_extraction_completed`
- `insight_saved_to_kb`
- `insight_exported_to_graph`
- `insight_flagged_incorrect`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Insight extraction success rate | >97% |
| User save rate (insights saved / surfaced) | >25% |
| Duplicate rate post-deduplication | <5% |

---

# 19. Future Enhancements

- Cross-conference insight trend tracking (e.g., recurring predictions year over year)
- Auto-flag contradictions between insights within the same conference

---

# 20. Open Questions

- Should insight types be configurable per conference domain (e.g., academic vs. corporate)?
- How long should an insight remain an "unvalidated prediction" before triggering a follow-up prompt?
