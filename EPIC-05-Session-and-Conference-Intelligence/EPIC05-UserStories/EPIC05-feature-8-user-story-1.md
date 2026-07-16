# EPIC05 Feature 8 User Story 1

## Epic
EPIC-05 — Session & Conference Intelligence

## Feature
FEATURE-08 — Topic Clustering

---

# User Story

As a user,
I want to see the main topics discussed across a conference I attended,
so that I can understand the overall themes without reviewing every session individually.

---

# Business Value

- Gives users a conference-wide understanding that individual session summaries can't provide on their own
- Helps users decide which sessions are worth a deeper read based on topic prevalence
- Supports trip-report and retrospective writing with ready-made thematic groupings
- Adds a layer of analytical value that differentiates the product from a simple session archive

---

# Acceptance Criteria

## Functional Criteria
- Topic clusters are generated for a conference based on transcript, quote, and insight embeddings
- Each cluster includes a human-readable label, session count, and a representative excerpt
- Clusters update incrementally as new sessions are captured during a live conference

## UX Criteria
- Topic explorer view presents clusters as scannable cards
- Clicking a cluster drills down into its constituent sessions and segments
- Cluster labels are clear and specific enough to be useful without opening the cluster

## Technical Criteria
- Clustering job completes within 10 minutes for a conference with 200 sessions
- Cluster labeling achieves a human-rated quality score above 4/5
- Incremental reclustering on new session ingestion completes within 5 minutes

---

# Preconditions

- At least a minimum threshold of sessions has been captured for the conference
- Transcript segmentation, quotes, and insights are available for clustering input
- User has access to the conference

---

# Postconditions

- `topic_cluster` and `topic_cluster_member` records persisted for the conference
- `TopicClustersUpdated` event emitted
- Topic explorer view reflects the latest clustering state

---

# Edge Cases

- A very small conference has too few sessions to form meaningful clusters
- A single session spans many unrelated topics and splits across multiple clusters
- Near-duplicate clusters form due to embedding drift between clustering runs
- Sparse insight/quote data for a niche session skews cluster sizing
- Clustering is requested mid-conference before enough sessions have been captured to be representative

---

# Telemetry

Track:
- `topic_clustering_job_completed`
- `topic_cluster_viewed`
- `topic_cluster_drilldown_clicked`
- `topic_cluster_label_quality_rated`
- `topic_clustering_insufficient_data`

---

# Dependencies

- FEATURE-07 Session Search (shared embedding infrastructure)
- FEATURE-06 Key Insight Extraction
- FEATURE-03 Quote Extraction

---

# Priority

Medium-High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify clusters are generated correctly for a conference with a typical session count
2. Verify cluster labels are coherent and specific for a manually reviewed sample
3. Verify drill-down from a cluster correctly lists its constituent sessions
4. Verify incremental reclustering correctly incorporates a newly captured session within the SLA
5. Verify a very small conference gracefully reports insufficient data rather than producing meaningless clusters
6. Verify a topic-spanning session appears appropriately across multiple relevant clusters
7. Verify clustering job completes within the 10-minute SLA for a 200-session conference
8. Verify cluster cards render correctly with label, size, and representative excerpt

---

# Story Variation

This is user story variation 1 for Topic Clustering, focusing on the happy-path functional experience of exploring conference-wide themes.

---

# Notes

- Cluster label quality is highly visible and directly shapes user trust in the feature; invest in labeling prompt quality
- Consider a minimum-session threshold before surfacing clusters to avoid presenting noisy, low-confidence groupings early in a conference
