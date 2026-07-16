# FEATURE-08 — Topic Clustering

## Epic
EPIC-05 — Session & Conference Intelligence

---

# 1. Objective

Automatically group transcript segments, quotes, and insights across sessions — within and across conferences — into coherent topic clusters to reveal thematic trends.

---

# 2. Problem Statement

Individually summarized sessions don't reveal conference-wide or cross-conference patterns: which topics dominated, which are emerging, and how coverage compares across events over time.

---

# 3. Feature Overview

An unsupervised clustering pipeline groups transcript segment, insight, and quote embeddings into named topic clusters with representative sessions, trend metrics, and drill-down navigation, reusing the embedding infrastructure shared with Session Search.

---

# 4. Key Functionalities

## Embedding-Based Clustering
Cluster transcript/insight/quote embeddings into topic groups.

## Cluster Labeling
Auto-generate a human-readable topic label and description per cluster.

## Cross-Session/Conference Rollup
Aggregate cluster membership across multiple sessions and conferences.

## Trend Detection
Track cluster prevalence over time and across conferences.

## Cluster Drill-Down
Link each cluster back to its constituent sessions and transcript segments.

---

# 5. Primary Use Cases

## Use Case 1
User wants to see the top themes discussed across a conference they attended.

## Use Case 2
User compares how a topic's prominence changed between this year's and last year's conference.

## Use Case 3
User drills into a topic cluster to find every session touching on it.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want to see the main topics discussed across the conference I attended,
so that I can understand the overall themes without reviewing every session individually.

### Acceptance Criteria
- A cluster list is generated for the conference, updated incrementally as sessions are captured
- Each cluster shows a label, session count, and a representative excerpt
- Clicking a cluster lists its constituent sessions

## User Story 2
As a returning user,
I want to compare topic trends across multiple conferences I've attended,
so that I can track how themes evolve year over year.

### Acceptance Criteria
- The trend view supports multi-conference comparison
- Cluster prevalence is shown as a trend line or percentage over time
- Clusters are matched across conferences via semantic similarity, not just exact label match

---

# 7. User Workflow

1. A scheduled or triggered job collects transcript segment, quote, and insight embeddings for a conference (or a recluster window)
2. A clustering algorithm groups items into topic clusters based on embedding similarity
3. A cluster labeling model generates a short name and description per cluster
4. Cluster membership and representative excerpts are persisted
5. Trend aggregation computes cluster prevalence over time and across conferences
6. `TopicClustersUpdated` event emitted
7. Reclustering is triggered on new session ingestion or a manual refresh request

---

# 8. UI / UX Requirements

- Topic explorer view with cluster cards (label, size, trend indicator)
- Drill-down list of sessions/segments within a selected cluster
- Cross-conference trend chart
- Manual cluster rename/merge control for curatorial correction

---

# 9. Technical Requirements

## Frontend
A topic explorer UI, a trend chart component, and a cluster drill-down list view.

## Backend
A clustering orchestration job, a trend aggregation service, and a manual override API for renaming/merging clusters.

## AI/ML
Shared embedding generation (with Session Search), a clustering algorithm (e.g., density-based clustering), and an LLM-based cluster labeling prompt.

## Infrastructure
Scheduled/batch compute for clustering jobs and a vector store shared with FEATURE-07 Session Search.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| GET /conferences/{id}/topic-clusters | Retrieve topic clusters for a conference |
| GET /topic-clusters/{id}/sessions | Retrieve sessions/segments within a cluster |
| POST /topic-clusters/recompute | Trigger a reclustering job |
| PATCH /topic-clusters/{id} | Manually rename or merge clusters |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| topic_cluster | id, conference_id, label, description, item_count, representative_excerpt, created_at, updated_at |
| topic_cluster_member | id, topic_cluster_id, source_type, source_id, session_id, similarity_score |

---

# 12. Security & Privacy

- Clusters only include content from sessions the requesting user can access
- Cross-conference trend comparisons respect each conference's individual visibility settings
- Manual cluster edits are audit logged with the editing user's identity

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Clustering job latency | <10 min for a conference with 200 sessions |
| Cluster label quality (human eval) | >4/5 average |
| Recluster-on-new-session latency | <5 min incremental update |

---

# 14. Edge Cases

- Very small conference with too few sessions to form meaningful clusters
- A single session spans many unrelated topics and splits across multiple clusters
- Near-duplicate clusters form due to embedding drift between runs
- Cross-conference comparison where conferences use different terminology for the same topic
- A manual merge conflicts with the next scheduled recluster job
- Sparse insight/quote data for niche sessions skews cluster sizes

---

# 15. Dependencies

- FEATURE-07 Session Search (shared embedding infrastructure)
- FEATURE-06 Key Insight Extraction
- FEATURE-03 Quote Extraction
- EPIC-02 Transcript Segmentation

---

# 16. Risks

- Poor cluster labels reduce the perceived intelligence of the feature
- Clustering instability (groupings/labels changing significantly between runs) confuses users

---

# 17. Telemetry & Analytics

Track:
- `topic_clustering_job_started`
- `topic_clustering_job_completed`
- `topic_cluster_viewed`
- `topic_cluster_manually_merged`
- `topic_cluster_drilldown_clicked`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Cluster coherence score | >0.7 (silhouette or equivalent) |
| User-reported cluster usefulness | >4/5 |
| Recluster job success rate | >98% |

---

# 19. Future Enhancements

- Industry-wide topic benchmarking across all platform users (opt-in aggregate)
- Predictive topic trend forecasting for next year's conference

---

# 20. Open Questions

- Should clusters be recomputed in real time during a live conference or only post-event?
- How should manual cluster merges be preserved across scheduled reclustering runs?
