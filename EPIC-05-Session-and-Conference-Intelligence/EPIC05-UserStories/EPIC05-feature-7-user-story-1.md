# EPIC05 Feature 7 User Story 1

## Epic
EPIC-05 — Session & Conference Intelligence

## Feature
FEATURE-07 — Session Search

---

# User Story

As a user,
I want to search across all my captured sessions for a topic,
so that I can quickly find where something was discussed without remembering which specific session it was in.

---

# Business Value

- Turns a growing personal archive of transcripts, quotes, and insights into something actually navigable
- Reduces reliance on memory to locate previously captured information
- Increases long-term product engagement by making past captures continuously useful, not just archived
- Differentiates the product from a static recording/note archive by making content proactively findable

---

# Acceptance Criteria

## Functional Criteria
- Search returns ranked results across all sessions the user can access
- Both keyword and semantic queries are supported and merged into a single ranked result set
- Results include a snippet, speaker, session, and timestamp for each match

## UX Criteria
- Global search bar is accessible from any screen in the app
- Filter chips for conference, speaker, date, and topic are available and combinable
- Zero-result queries show helpful guidance rather than a blank state

## Technical Criteria
- Query latency is under 500ms at the 95th percentile
- Newly captured content is searchable within 2 minutes of becoming available
- Search results are deduplicated across overlapping source types (transcript segment, quote, insight)

---

# Preconditions

- User is authenticated
- At least one session has been indexed
- User has access permissions to the sessions being searched

---

# Postconditions

- Search results are returned and rendered to the user
- `session_search_executed` telemetry recorded for relevance tuning
- Clicked results navigate the user to the correct in-context location

---

# Edge Cases

- Query is in a different language than the underlying transcript
- An ambiguous short query (e.g., "AI") returns an overwhelming number of low-precision results
- A newly captured session isn't yet searchable due to index lag
- Two near-identical sessions (recorded twice) clutter the result list
- Search spans conferences with mixed public and restricted sessions

---

# Telemetry

Track:
- `session_search_executed`
- `session_search_zero_results`
- `session_search_result_clicked`
- `session_search_filter_applied`
- `session_search_query_latency`

---

# Dependencies

- EPIC-02 Transcript Segmentation, Media Indexing
- FEATURE-03 Quote Extraction
- FEATURE-06 Key Insight Extraction
- FEATURE-04 Slide-to-Topic Linking

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify a keyword query returns correctly ranked results across multiple sessions
2. Verify a semantic query returns relevant results even without an exact keyword match
3. Verify filter chips correctly narrow results when combined (e.g., conference + speaker)
4. Verify a zero-result query displays helpful guidance rather than a blank screen
5. Verify newly captured content becomes searchable within the 2-minute freshness SLA
6. Verify clicking a result correctly navigates to the in-context transcript/quote/insight location
7. Verify query latency remains under 500ms at p95 under typical load
8. Verify near-duplicate sessions are deduplicated or clearly distinguished in the result list

---

# Story Variation

This is user story variation 1 for Session Search, focusing on the happy-path functional experience of finding previously captured content.

---

# Notes

- Hybrid ranking (keyword + semantic) should be tuned iteratively using click-through telemetry, not fixed once and left static
- Consider surfacing which source type (transcript/quote/insight/slide) each result came from to help users judge relevance quickly
