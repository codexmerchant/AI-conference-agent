# FEATURE-07 — Topic Memory System

## Epic
EPIC-12 — Search, Memory & Retrieval

---

# 1. Objective

Track how topics are discussed across time, people, and conferences to enable topic-based recall and detect emerging or declining trends.

---

# 2. Problem Statement

Individual transcripts capture topics locally, but nothing aggregates them across sessions or conferences, so users can't see how a topic has evolved, who consistently discusses it, or whether interest in it is rising or fading.

---

# 3. Feature Overview

An aggregation layer that clusters topics extracted per-conversation into a persistent, canonical topic taxonomy, links each mention to the entity/conference/time it occurred in, and computes trend signals over time for topic-based recall and analytics.

---

# 4. Key Functionalities

## Topic clustering and canonicalization
Groups near-duplicate topic mentions ("AI safety," "AI alignment") into a single canonical topic entry.

## Topic-entity-conference linking
Links each topic mention to the person, conference, and timestamp it was discussed in.

## Topic trend detection
Computes mention volume and rate-of-change per topic across time windows to surface emerging or declining trends.

## Topic-based recall query
Answers queries like "who have I talked to about generative AI in the last year."

## Taxonomy maintenance and merge
Supports operator-driven merge/split of topics as the taxonomy evolves and drifts.

---

# 5. Primary Use Cases

## Use Case 1
User queries "who have I discussed supply chain resilience with" and gets a ranked list of contacts and conversations.

## Use Case 2
User views a trend chart showing rising interest in a topic across the last four conferences attended.

## Use Case 3
An operator merges two near-duplicate topics that were incorrectly split by the clustering pipeline.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want to recall everyone I've discussed a specific topic with over time,
so that I can identify who to follow up with on that subject.

### Acceptance Criteria
- Topic-based recall queries return a ranked list of relevant conversations, people, and conferences.
- Results correctly link back to canonical topics even when phrased differently across mentions.
- Query results include enough context (date, conference, snippet) to act on immediately.

## User Story 2
As a power user,
I want to see how interest in a topic has trended across the conferences I've attended,
so that I can spot emerging themes before they become mainstream.

### Acceptance Criteria
- Trend view shows mention volume over time per topic, segmented by conference.
- Emerging and declining topics are flagged based on statistically meaningful rate-of-change thresholds.
- Trend data updates as new conference content is captured and processed.

---

# 7. User Workflow

1. Topic extraction (EPIC-03) produces raw topic mentions from a captured conversation.
2. Topic Memory System clusters the mention against the existing canonical topic taxonomy.
3. A new TopicMention record links the canonical topic to the entity, conference, and timestamp.
4. Trend aggregation jobs recompute mention volume and rate-of-change per topic per time window.
5. User issues a topic-based recall query or views a trend dashboard.
6. System returns canonical topic matches with linked conversations, people, and conferences.
7. Operators periodically review and merge/split topics flagged as taxonomy drift.

---

# 8. UI / UX Requirements

- Topic search bar with autocomplete against the canonical taxonomy
- Trend chart per topic showing mention volume over time
- "Emerging" and "declining" badges on topic trend views
- Topic detail view listing linked people, conferences, and conversation snippets
- Operator interface for reviewing and merging candidate duplicate topics

---

# 9. Technical Requirements

## Frontend
Topic search and trend visualization components, plus an operator-facing taxonomy review queue for merge/split actions.

## Backend
Topic Memory service consumes extracted topics from the Context & Intelligence Engine, performs clustering against the canonical taxonomy using semantic similarity, writes mention links, and runs scheduled trend aggregation jobs.

## AI/ML
Topic clustering uses embedding similarity plus a canonicalization threshold; trend detection applies time-series analysis (e.g., moving average rate-of-change) to flag emerging/declining topics with confidence bounds.

## Infrastructure
Trend aggregation runs as a scheduled batch job over the growing mention history; taxonomy storage must support efficient merge operations that re-point historical mentions without data loss.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| GET /topics/{topic_id}/trend | Retrieve trend data (mention volume over time) for a topic |
| GET /topics/search | Search the canonical topic taxonomy |
| POST /topics/merge | Merge two topics into one canonical entry |
| Context & Intelligence Engine (EPIC-03) | Source of extracted per-conversation topics |
| Vector Memory Platform (Feature 2) | Provides embeddings used for topic clustering |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| Topic | topic_id, canonical_name, aliases, embedding_centroid, created_at |
| TopicMention | id, topic_id, source_type, source_id, entity_id, conference_id, mentioned_at, confidence |
| TopicTrend | topic_id, period, mention_count, delta, trend_label |

---

# 12. Security & Privacy

- Topic mentions inherit access controls from their source conversation; users only see topic links to content they own or can access
- Trend aggregates computed per-user (or per-team, with consent) rather than exposing cross-tenant mention data
- Taxonomy merge operations logged for auditability and reversibility
- Topic data deletion honors right-to-be-forgotten requests on the underlying source content

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Topic clustering latency (per mention) | <2 sec |
| Trend aggregation job runtime | Nightly batch, <1 hr |
| Topic-based recall query latency | <1.5 sec |
| Topic canonicalization precision | >85% |

---

# 14. Edge Cases

- Topic drift causes two genuinely distinct topics to be incorrectly merged
- Near-duplicate topics remain uncanonicalized ("AI safety" vs. "AI alignment") and split trend signal
- Sparse-data conferences skew trend calculations with too few mentions to be statistically meaningful
- Topic mention volume artificially inflated by duplicate or spam captures, skewing trend detection
- Taxonomy merge breaks existing recall links if historical mentions aren't correctly re-pointed
- Seasonal or cyclical topics falsely flagged as "declining" outside their natural cadence

---

# 15. Dependencies

- Context & Intelligence Engine (EPIC-03) for topic extraction
- Vector Memory Platform for clustering embeddings
- Knowledge Graph Platform for entity linking
- Scheduled batch processing infrastructure for trend jobs

---

# 16. Risks

- Poor canonicalization fragments topic history and undermines trend accuracy
- Trend detection thresholds tuned incorrectly produce noisy or misleading "emerging" flags
- Taxonomy merges are hard to reverse cleanly once mentions have been re-pointed
- Growing topic taxonomy size may require periodic pruning or archival of rarely-used topics

---

# 17. Telemetry & Analytics

Track:
- `topic_mention_recorded`
- `topic_clustered_new`
- `topic_clustered_existing`
- `topic_merge_performed`
- `topic_trend_flag_emerging`
- `topic_trend_flag_declining`
- `topic_recall_query_executed`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Topic canonicalization precision | >85% |
| Trend flag accuracy (validated by operator review) | >80% |
| Topic-based recall adoption | >40% of active users |
| Taxonomy merge error rate | <5% |

---

# 19. Future Enhancements

- Cross-user aggregate trend signals (industry-wide topic trends, with consent)
- Predictive topic emergence alerts before a topic peaks
- Topic-to-content-recommendation ("read/watch more about this")

---

# 20. Open Questions

- What confidence threshold should trigger automatic merge vs. operator review?
- How far back should trend windows extend by default (quarterly, yearly)?
- Should topic taxonomy be user-specific or shared across a team/organization?
