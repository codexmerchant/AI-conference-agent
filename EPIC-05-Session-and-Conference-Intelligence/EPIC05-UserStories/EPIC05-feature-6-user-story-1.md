# EPIC05 Feature 6 User Story 1

## Epic
EPIC-05 — Session & Conference Intelligence

## Feature
FEATURE-06 — Key Insight Extraction

---

# User Story

As a user,
I want the app to extract the key takeaways from a session I captured,
so that I can quickly capture what mattered without manual note-taking during the talk.

---

# Business Value

- Reduces the cognitive load of manual note-taking during a live session
- Produces typed, structured takeaways (claims, predictions, recommendations) that are more actionable than raw transcript text
- Feeds a personal knowledge base and knowledge graph, compounding the value of every session captured
- Differentiates captured sessions from a plain recording by adding synthesized understanding, not just a transcript

---

# Acceptance Criteria

## Functional Criteria
- Insights are extracted and typed (claim/prediction/recommendation/data-point/trend) automatically after summarization
- Each insight includes a supporting evidence link back to the transcript
- Restated insights within the same session are deduplicated before being shown

## UX Criteria
- Insights list is grouped by type with a distinct icon per category
- Tapping an insight's evidence link jumps to the corresponding transcript timestamp
- Saving an insight to the user's knowledge base takes a single tap

## Technical Criteria
- Extraction completes within 60 seconds of summary generation for a 60-minute session
- Insight records store `confidence` and `novelty_score` to support ranking
- Save-to-knowledge-base action reliably persists and is retryable on transient failure

---

# Preconditions

- Session transcript segmentation and summarization have completed
- User has access to the session
- Speaker attribution is available where possible

---

# Postconditions

- `insight` records persisted with type, evidence, and scores
- `InsightsExtracted` event emitted for downstream consumers (Search, Knowledge Graph)
- Insights list is populated and ready for user review

---

# Edge Cases

- A speaker makes a claim that is later contradicted within the same session
- An insight depends on a data point shown only on a slide, not spoken aloud
- A highly technical session produces ambiguous insight-type classifications
- A purely narrative/anecdotal session yields no clear insights
- The same insight is restated across multiple sessions at the same conference

---

# Telemetry

Track:
- `insight_extraction_completed`
- `insight_viewed`
- `insight_saved_to_kb`
- `insight_evidence_clicked`
- `insight_flagged_incorrect`

---

# Dependencies

- EPIC-02 Transcript Segmentation
- FEATURE-05 Session Summarization
- Knowledge Graph Engine (PRD 5.6)

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify insights are correctly typed and extracted for a standard session transcript
2. Verify each insight includes a working evidence link to the correct transcript timestamp
3. Verify restated insights within a session are deduplicated before display
4. Verify saving an insight to the knowledge base persists correctly and is retryable on failure
5. Verify a session with no clear insights returns a graceful empty state
6. Verify insight ranking correctly prioritizes higher novelty/confidence items
7. Verify extraction completes within the 60-second SLA after summary generation
8. Verify a contradicted claim within the same session is represented without silently dropping either statement

---

# Story Variation

This is user story variation 1 for Key Insight Extraction, focusing on the happy-path functional experience of capturing structured takeaways from a session.

---

# Notes

- Insight type taxonomy should remain stable, since the Knowledge Graph Engine depends on consistent typing for downstream reasoning
- Consider surfacing contradiction detection explicitly rather than silently listing both conflicting claims
