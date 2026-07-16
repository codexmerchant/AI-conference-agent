# FEATURE-07 — Session Search

## Epic
EPIC-05 — Session & Conference Intelligence

---

# 1. Objective

Provide fast semantic and keyword search across all captured sessions, transcripts, quotes, insights, and slides for a user and their accessible conferences.

---

# 2. Problem Statement

As users attend more conferences, the volume of transcripts, quotes, and insights makes manual browsing impractical. Users need to quickly answer "where did I hear about X" across a growing personal archive.

---

# 3. Feature Overview

Session Search combines full-text keyword search and vector/semantic search over transcript segments, quotes, insights, and slide OCR text, with faceted filtering by conference, session type, speaker, date, and topic, returning ranked, snippet-highlighted results.

---

# 4. Key Functionalities

## Semantic Query Search
Vector search across transcript, quote, and insight embeddings.

## Keyword/Full-Text Search
Exact phrase and keyword fallback search for precise term matches.

## Faceted Filtering
Filter results by conference, session type, speaker, date range, and topic.

## Result Snippet Highlighting
Show a matched excerpt with surrounding context and a jump-to-timestamp link.

## Cross-Session Result Ranking
Rank results by relevance and recency across all accessible sessions.

---

# 5. Primary Use Cases

## Use Case 1
User searches "pricing strategy" and finds every session where it was discussed.

## Use Case 2
User filters search results to a specific speaker across multiple conferences.

## Use Case 3
User searches for a half-remembered phrase and jumps straight to that transcript moment.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want to search across all my captured sessions for a topic,
so that I can quickly find where something was discussed without remembering which session it was.

### Acceptance Criteria
- Search returns ranked results across sessions within the defined SLA
- Each result shows a snippet, speaker, session, and timestamp
- Both keyword and semantic queries are supported

## User Story 2
As a power user with a large session archive,
I want to filter search results by conference, date, and speaker,
so that I can narrow down results in a large personal archive.

### Acceptance Criteria
- Filters are combinable across conference, date, and speaker
- Filter state persists in the URL/query so results can be shared or bookmarked
- Result count updates live as filters change

---

# 7. User Workflow

1. User enters a search query in the search UI
2. Query is classified as keyword, semantic, or hybrid
3. Query is embedded (for the semantic path) and matched against the transcript/quote/insight vector index
4. The keyword path queries the full-text index in parallel
5. Results are merged, deduplicated, and ranked by relevance and recency
6. Applicable filters (conference/speaker/date/topic) are applied
7. Results are returned with snippet highlighting and jump-to-timestamp/slide links

---

# 8. UI / UX Requirements

- Global search bar accessible from any screen
- Filter chips for conference, speaker, date, and topic
- Snippet preview with highlighted match terms
- Jump-to-timestamp or jump-to-slide control on each result card
- Empty-state guidance for zero-result queries

---

# 9. Technical Requirements

## Frontend
A global search UI, filter chip components, and a result list with snippet highlighting.

## Backend
A search API/service, a query router that chooses between keyword and semantic paths, and a result ranking/merging service.

## AI/ML
An embedding model for semantic search and a hybrid ranking approach combining lexical (BM25-style) and vector similarity signals.

## Infrastructure
A vector database/index, a full-text search index, and an index update pipeline synced to newly available session artifacts.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| GET /search?q= | Execute a search query with optional filters |
| GET /search/suggestions?q= | Autocomplete/typeahead suggestions |
| POST /search/index/rebuild | Rebuild the search index for a session (operator/admin) |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| search_index_entry | id, source_type, source_id, session_id, conference_id, speaker_id, text, embedding_vector, topic_label, indexed_at |

---

# 12. Security & Privacy

- Search results are scoped strictly to sessions/conferences the requesting user can access
- Query terms are not logged with PII beyond what is needed for relevance tuning
- Index updates respect deletion or correction of source content ("right to be forgotten")

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Query latency (p95) | <500 ms |
| Index freshness | New content searchable within 2 min of availability |
| Search relevance (NDCG) | >0.8 on internal evaluation set |

---

# 14. Edge Cases

- Query is in a different language than the underlying transcript
- Session is deleted after being indexed and must be removed from the index
- Ambiguous short queries (e.g., "AI") return too many low-precision results
- Search spans conferences with a mix of restricted and public sessions
- Index lag causes a newly captured session to be temporarily unsearchable
- Duplicate near-identical sessions (recorded twice) clutter results

---

# 15. Dependencies

- EPIC-02 Transcript Segmentation, Media Indexing
- FEATURE-03 Quote Extraction
- FEATURE-06 Key Insight Extraction
- FEATURE-04 Slide-to-Topic Linking

---

# 16. Risks

- A stale index reduces user trust if new sessions don't appear promptly
- Semantic search false positives could surface irrelevant but embedding-similar content

---

# 17. Telemetry & Analytics

Track:
- `session_search_executed`
- `session_search_zero_results`
- `session_search_result_clicked`
- `session_search_filter_applied`
- `session_search_index_updated`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Search success rate (query leads to a click) | >80% |
| p95 query latency | <500 ms |
| Zero-result query rate | <5% |

---

# 19. Future Enhancements

- Natural-language question answering over search results (RAG-based chat)
- Saved searches with alerts for new matching content

---

# 20. Open Questions

- Should search span sessions the user didn't personally attend but has access to via team sharing?
- What is the retention policy for search query logs used in relevance tuning?
