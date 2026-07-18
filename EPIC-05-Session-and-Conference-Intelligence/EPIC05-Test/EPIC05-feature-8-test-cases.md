# EPIC05 Feature 8 — Topic Clustering — Test Cases

## Test Overview
Comprehensive test suite for Topic Clustering covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Embedding and Vectorization

#### TC-F8-U1.1: Segment Embedding Generated Correctly
**Objective**: Verify that a sentence-level embedding is generated for each transcript segment with the expected vector dimensionality.

**Preconditions**:
- Sentence embedding model loaded (e.g., 768-dim)
- Transcript segments available

**Test Steps**:
1. Call `embedSegment({ text: 'Machine learning is transforming enterprise analytics.' })`
2. Assert returned vector has length 768
3. Assert all values are finite floats

**Expected Result**: Vector of length 768; no NaN or Infinity values.

**Code Sample**:
```typescript
describe('SegmentEmbedder', () => {
  it('should produce a 768-dimensional embedding with valid float values', async () => {
    const embedder = new SegmentEmbedder(mockEmbeddingModel);
    const vector = await embedder.embedSegment({ text: 'Machine learning is transforming enterprise analytics.' });

    expect(vector).toHaveLength(768);
    vector.forEach(v => {
      expect(Number.isFinite(v)).toBe(true);
    });
  });
});
```

---

#### TC-F8-U1.2: Similar Segments Produce Close Embeddings
**Objective**: Verify that two semantically similar segments yield embeddings with cosine similarity >= 0.85.

**Test Steps**:
1. Embed "AI safety is a critical research priority"
2. Embed "Ensuring the safety of artificial intelligence systems is essential"
3. Compute cosine similarity
4. Assert similarity >= 0.85

**Expected Result**: Similarity >= 0.85; semantically close segments clustered together.

**Code Sample**:
```typescript
it('should produce high cosine similarity for semantically similar segments', async () => {
  const v1 = await embedder.embedSegment({ text: 'AI safety is a critical research priority.' });
  const v2 = await embedder.embedSegment({ text: 'Ensuring the safety of artificial intelligence systems is essential.' });

  const similarity = cosineSimilarity(v1, v2);
  expect(similarity).toBeGreaterThanOrEqual(0.85);
});
```

---

#### TC-F8-U1.3: Dissimilar Segments Produce Distant Embeddings
**Objective**: Verify that two topically unrelated segments produce cosine similarity < 0.4.

**Test Steps**:
1. Embed "Quantum cryptography enables post-quantum secure communications"
2. Embed "The catering team arranged lunch for conference attendees"
3. Compute cosine similarity
4. Assert similarity < 0.4

**Expected Result**: Similarity < 0.4; unrelated topics stay separated.

**Code Sample**:
```typescript
it('should produce low cosine similarity for topically unrelated segments', async () => {
  const v1 = await embedder.embedSegment({ text: 'Quantum cryptography enables post-quantum secure communications.' });
  const v2 = await embedder.embedSegment({ text: 'The catering team arranged lunch for conference attendees.' });

  const similarity = cosineSimilarity(v1, v2);
  expect(similarity).toBeLessThan(0.4);
});
```

---

### 1.2 Clustering Algorithm

#### TC-F8-U2.1: K-Means Produces K Non-Empty Clusters
**Objective**: Verify k-means clustering with k=5 produces exactly 5 non-empty clusters.

**Test Steps**:
1. Generate 100 segment embeddings across 5 distinct topic groups
2. Call `kMeansCluster(embeddings, { k: 5, iterations: 50 })`
3. Assert exactly 5 clusters; each has at least 1 member

**Expected Result**: 5 clusters; no empty cluster; each segment assigned to exactly one cluster.

**Code Sample**:
```typescript
describe('KMeansClusterer', () => {
  it('should produce exactly k non-empty clusters', async () => {
    const embeddings = generateTopicEmbeddings(100, 5);
    const clusterer = new KMeansClusterer();
    const result = await clusterer.cluster(embeddings, { k: 5, iterations: 50 });

    expect(result.clusters).toHaveLength(5);
    result.clusters.forEach(c => expect(c.members.length).toBeGreaterThan(0));

    const totalAssigned = result.clusters.reduce((s, c) => s + c.members.length, 0);
    expect(totalAssigned).toBe(100);
  });
});
```

---

#### TC-F8-U2.2: Optimal K Selected by Elbow Method
**Objective**: Verify the auto-k selection algorithm chooses a k within the expected range for a well-separated corpus.

**Test Steps**:
1. Generate embeddings with 4 clearly separated topic groups
2. Call `selectOptimalK(embeddings, { minK: 2, maxK: 10 })`
3. Assert selected k is between 3 and 5

**Expected Result**: `optimalK` in [3, 5]; elbow score is a local minimum.

**Code Sample**:
```typescript
it('should select an optimal k near the true number of topic groups', async () => {
  const embeddings = generateTopicEmbeddings(80, 4); // 4 clear groups
  const result = await kMeansClusterer.selectOptimalK(embeddings, { minK: 2, maxK: 10 });

  expect(result.optimalK).toBeGreaterThanOrEqual(3);
  expect(result.optimalK).toBeLessThanOrEqual(5);
});
```

---

#### TC-F8-U2.3: LDA Topic Model Produces Coherent Word Distributions
**Objective**: Verify LDA produces a topic-word distribution where the top 5 words per topic are thematically coherent.

**Test Steps**:
1. Fit LDA on a 200-segment corpus with known topics (Security, AI, Finance)
2. Extract top-5 words per topic
3. Assert at least one topic's top-5 words relate to each known theme

**Expected Result**: Topic-word distributions coherent with source themes; coherence score >= 0.35.

**Code Sample**:
```typescript
describe('LdaTopicModel', () => {
  it('should produce coherent topic-word distributions matching known themes', async () => {
    const lda = new LdaTopicModel({ numTopics: 3 });
    const model = await lda.fit(twoHundredSegmentCorpus);

    expect(model.topics).toHaveLength(3);
    const coherenceScores = model.topics.map(t => t.coherenceScore);
    const avgCoherence = coherenceScores.reduce((s, c) => s + c, 0) / coherenceScores.length;
    expect(avgCoherence).toBeGreaterThanOrEqual(0.35);
  });
});
```

---

### 1.3 Cluster Labeling

#### TC-F8-U3.1: Cluster Label Derived from Top TF-IDF Terms
**Objective**: Verify that each cluster receives a label derived from the top TF-IDF terms of its member segments.

**Test Steps**:
1. Build a cluster whose member segments all discuss "supply chain optimization"
2. Call `labelCluster(cluster, { method: 'TFIDF' })`
3. Assert label contains "supply chain" or "optimization"

**Expected Result**: Label reflects dominant cluster theme; 1–5 words.

**Code Sample**:
```typescript
describe('ClusterLabeler', () => {
  it('should derive a topic label from top TF-IDF terms in a cluster', () => {
    const label = labelCluster(supplyChainCluster, { method: 'TFIDF' });
    expect(label.toLowerCase()).toMatch(/supply chain|optimization/);
    expect(label.split(' ').length).toBeLessThanOrEqual(5);
  });
});
```

---

#### TC-F8-U3.2: Slide-Derived Label Used When Available
**Objective**: Verify that when a slide-derived topic label (Feature 4) exists for the dominant segment in a cluster, it is used as the cluster label.

**Test Steps**:
1. Seed cluster whose centroid-nearest segment has slide link `topicLabel = 'Zero Trust Architecture'`
2. Call `labelCluster(cluster, { useSlideLabels: true, sessionId })`
3. Assert `cluster.label = 'Zero Trust Architecture'` and `labelSource = 'SLIDE'`

**Expected Result**: Slide label used; `labelSource = 'SLIDE'`.

**Code Sample**:
```typescript
it('should use slide-derived label when available for cluster labeling', async () => {
  await seedSlideLabel(sessionId, centroidSegmentId, 'Zero Trust Architecture');
  const labeled = await labeler.labelCluster(cluster, { useSlideLabels: true, sessionId });
  expect(labeled.label).toBe('Zero Trust Architecture');
  expect(labeled.labelSource).toBe('SLIDE');
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Full Clustering Pipeline

#### TC-F8-I1.1: End-to-End Clustering via API
**Objective**: Verify `POST /sessions/{id}/topics/cluster` triggers the full pipeline and returns a persisted cluster map.

**Preconditions**:
- Session transcribed and embeddings generated

**Test Steps**:
1. POST to `/sessions/{sessionId}/topics/cluster`
2. Poll until `status = 'COMPLETE'`
3. GET `/sessions/{sessionId}/topics`
4. Assert response has array of clusters with `label`, `segmentIds`, `size`, `centroid`

**Expected Result**: Clusters with >= 2 members; labels populated; total segment coverage >= 80%.

**Code Sample**:
```typescript
it('should produce a complete cluster map via the topics API', async () => {
  await apiClient.post(`/sessions/${sessionId}/topics/cluster`);
  await waitFor(
    () => apiClient.get(`/sessions/${sessionId}/topics/status`),
    { until: r => r.data.status === 'COMPLETE', timeout: 30000 }
  );

  const res = await apiClient.get(`/sessions/${sessionId}/topics`);
  expect(res.data.clusters.length).toBeGreaterThanOrEqual(2);
  res.data.clusters.forEach((c: any) => {
    expect(c.label).toBeDefined();
    expect(c.segmentIds.length).toBeGreaterThan(0);
  });
});
```

---

#### TC-F8-I1.2: Cluster Results Feed Session Search Facets
**Objective**: Verify that cluster labels appear as searchable topic facets in Session Search (Feature 7).

**Test Steps**:
1. Run clustering for a session
2. Call `GET /sessions/{id}/search/facets`
3. Assert `topicFacets` includes the generated cluster labels

**Expected Result**: `topicFacets` array populated with cluster labels; count per facet present.

**Code Sample**:
```typescript
it('should expose cluster labels as search topic facets after clustering completes', async () => {
  await clusteringService.cluster(sessionId);
  const facets = await apiClient.get(`/sessions/${sessionId}/search/facets`);

  expect(facets.data.topicFacets).toBeDefined();
  expect(facets.data.topicFacets.length).toBeGreaterThan(0);
  facets.data.topicFacets.forEach((f: any) => {
    expect(f.label).toBeDefined();
    expect(f.count).toBeGreaterThan(0);
  });
});
```

---

### 2.2 Cross-Session Cluster Merging

#### TC-F8-I2.1: Same Topic Clusters from Different Sessions Merged at Conference Level
**Objective**: Verify that clustering two sessions from the same conference and then running conference-level aggregation merges semantically equivalent clusters.

**Test Steps**:
1. Cluster session A and session B; both have a "Data Privacy" cluster
2. Run conference-level aggregation
3. Assert the two Data Privacy clusters are merged into one conference-level cluster

**Expected Result**: Conference cluster for "Data Privacy" references segments from both sessions.

**Code Sample**:
```typescript
it('should merge equivalent topic clusters from multiple sessions at conference level', async () => {
  await clusteringService.cluster(sessionAId);
  await clusteringService.cluster(sessionBId);
  await conferenceClusterer.aggregate(conferenceId);

  const confClusters = await apiClient.get(`/conferences/${conferenceId}/topics`);
  const dataprivacyCluster = confClusters.data.clusters.find((c: any) =>
    c.label.toLowerCase().includes('data privacy')
  );
  expect(dataprivacyCluster).toBeDefined();
  const sessionIds = new Set(dataprivacyCluster.segments.map((s: any) => s.sessionId));
  expect(sessionIds.has(sessionAId)).toBe(true);
  expect(sessionIds.has(sessionBId)).toBe(true);
});
```

---

#### TC-F8-I2.2: Session Summary (Feature 5) Uses Cluster Labels as Section Headers
**Objective**: Verify that when clusters exist, session summarization uses cluster labels as section headers in the detailed summary.

**Test Steps**:
1. Run clustering (clusters: "AI Ethics", "Model Deployment", "Governance")
2. Generate a DETAILED session summary
3. Assert summary sections correspond to cluster labels

**Expected Result**: Summary has sections matching cluster labels; content under each section is relevant.

**Code Sample**:
```typescript
it('should use topic cluster labels as section headers in detailed session summary', async () => {
  await clusteringService.cluster(sessionId);
  const summary = await summaryService.generateAndSave(sessionId, transcript, { mode: 'DETAILED' });

  expect(summary.sections).toBeDefined();
  const clusterLabels = (await apiClient.get(`/sessions/${sessionId}/topics`)).data.clusters.map((c: any) => c.label);
  const matchedSections = summary.sections!.filter(s => clusterLabels.some(l => s.title.includes(l)));
  expect(matchedSections.length).toBeGreaterThan(0);
});
```

---

### 2.3 Manual Cluster Management

#### TC-F8-I3.1: User Renames a Cluster Label
**Objective**: Verify a user can rename a cluster label and the change propagates to search facets and summaries.

**Test Steps**:
1. Cluster a session (cluster-3 label = "Untitled Cluster")
2. PATCH `/sessions/{id}/topics/cluster-3` with `{ label: 'Regulatory Compliance' }`
3. Fetch topics and search facets
4. Assert cluster-3 label = "Regulatory Compliance" in both endpoints

**Expected Result**: Renamed label reflected in topics and search facets.

**Code Sample**:
```typescript
it('should persist cluster rename and reflect it in search facets', async () => {
  await clusteringService.cluster(sessionId);
  await apiClient.patch(`/sessions/${sessionId}/topics/cluster-3`, { label: 'Regulatory Compliance' });

  const topics = await apiClient.get(`/sessions/${sessionId}/topics`);
  const renamed = topics.data.clusters.find((c: any) => c.id === 'cluster-3');
  expect(renamed!.label).toBe('Regulatory Compliance');

  const facets = await apiClient.get(`/sessions/${sessionId}/search/facets`);
  const facet = facets.data.topicFacets.find((f: any) => f.id === 'cluster-3');
  expect(facet!.label).toBe('Regulatory Compliance');
});
```

---

#### TC-F8-I3.2: User Merges Two Clusters into One
**Objective**: Verify merging cluster-1 and cluster-2 combines their segment lists and retains the user-specified label.

**Test Steps**:
1. Run clustering (5 clusters)
2. POST `/sessions/{id}/topics/merge` with `{ clusterIds: ['cluster-1', 'cluster-2'], label: 'AI & ML' }`
3. Assert cluster count decreases to 4; merged cluster contains all segments from both originals

**Expected Result**: 4 clusters; merged cluster has all segments; label = "AI & ML".

**Code Sample**:
```typescript
it('should merge two clusters and combine their segment lists under a new label', async () => {
  await clusteringService.cluster(sessionId);
  const before = await apiClient.get(`/sessions/${sessionId}/topics`);
  const c1Segs = before.data.clusters.find((c: any) => c.id === 'cluster-1')!.segmentIds;
  const c2Segs = before.data.clusters.find((c: any) => c.id === 'cluster-2')!.segmentIds;

  await apiClient.post(`/sessions/${sessionId}/topics/merge`, { clusterIds: ['cluster-1', 'cluster-2'], label: 'AI & ML' });

  const after = await apiClient.get(`/sessions/${sessionId}/topics`);
  expect(after.data.clusters.length).toBe(before.data.clusters.length - 1);
  const merged = after.data.clusters.find((c: any) => c.label === 'AI & ML')!;
  expect(merged.segmentIds).toEqual(expect.arrayContaining([...c1Segs, ...c2Segs]));
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Degenerate Inputs

#### TC-F8-E1.1: Single Segment — No Clustering Possible
**Objective**: Verify the system returns a single-member cluster (not an error) when only one segment exists.

**Test Steps**:
1. Provide a session with exactly 1 segment
2. Run clustering
3. Assert 1 cluster returned with 1 member; status = `COMPLETE`

**Expected Result**: 1 cluster; `status = 'COMPLETE'`; no exception.

**Code Sample**:
```typescript
it('should return a single-member cluster for a one-segment session', async () => {
  const result = await clusteringService.clusterSegments([singleSegment]);
  expect(result.clusters).toHaveLength(1);
  expect(result.clusters[0].members).toHaveLength(1);
  expect(result.status).toBe('COMPLETE');
});
```

---

#### TC-F8-E1.2: All Segments Belong to One Topic — Single Cluster Returned
**Objective**: Verify the algorithm does not force k=5 when all segments are on the same topic.

**Test Steps**:
1. Provide 50 segments all about "cybersecurity"
2. Run auto-k clustering
3. Assert 1 or 2 clusters returned (not artificially inflated to 5)

**Expected Result**: `clusters.length <= 2`; auto-k correctly selects a low value.

**Code Sample**:
```typescript
it('should not artificially inflate cluster count when all segments share one topic', async () => {
  const segments = generateHomogeneousSegments(50, 'cybersecurity');
  const result = await clusteringService.clusterSegments(segments, { autoK: true });
  expect(result.clusters.length).toBeLessThanOrEqual(2);
});
```

---

### 3.2 Outlier Segments

#### TC-F8-E2.1: Off-Topic Segment Assigned to Nearest Cluster or OUTLIER
**Objective**: Verify that a segment completely off-topic (e.g., catering announcement) is either assigned to the nearest cluster with low confidence or flagged as an outlier.

**Test Steps**:
1. Add one "lunch break" segment to a predominantly technical transcript
2. Run clustering
3. Assert the outlier segment has `outlier: true` OR `confidence < 0.3`

**Expected Result**: Outlier detected; not merged into a high-confidence technical cluster.

**Code Sample**:
```typescript
it('should flag or low-confidence-assign off-topic outlier segments', async () => {
  const segments = [...technicalSegments, outlierSegment];
  const result = await clusteringService.clusterSegments(segments);
  const outlierResult = result.assignments.find(a => a.segmentId === outlierSegment.id);
  const isHandled = outlierResult!.outlier === true || outlierResult!.confidence < 0.3;
  expect(isHandled).toBe(true);
});
```

---

#### TC-F8-E2.2: Very Short Segments (Under 5 Words) Excluded from Clustering
**Objective**: Verify that segments too short to produce reliable embeddings are excluded from clustering input.

**Test Steps**:
1. Mix 90 normal segments with 10 very short ones (1–4 words each)
2. Run clustering
3. Assert the 10 short segments are not assigned to any cluster

**Expected Result**: Short segments excluded; `excludedCount = 10`.

**Code Sample**:
```typescript
it('should exclude very short segments from clustering input', async () => {
  const mixed = [...normalSegments, ...shortSegments]; // shortSegments have < 5 words
  const result = await clusteringService.clusterSegments(mixed);
  expect(result.excludedCount).toBe(shortSegments.length);

  const assignedIds = new Set(result.assignments.map(a => a.segmentId));
  shortSegments.forEach(s => expect(assignedIds.has(s.id)).toBe(false));
});
```

---

### 3.3 Algorithm Robustness

#### TC-F8-E3.1: K-Means Convergence Within Max Iterations
**Objective**: Verify k-means always converges (or stops gracefully) within the configured max iterations.

**Test Steps**:
1. Run k-means with `maxIterations: 50` on a 500-segment corpus
2. Assert `result.iterationsRun <= 50`; no infinite loop

**Expected Result**: `iterationsRun <= 50`; converged or stopped gracefully; `status = 'COMPLETE'`.

**Code Sample**:
```typescript
it('should always converge or stop within maxIterations without hanging', async () => {
  const embeddings = generateRandomEmbeddings(500, 768);
  const result = await kMeansClusterer.cluster(embeddings, { k: 7, maxIterations: 50 });
  expect(result.iterationsRun).toBeLessThanOrEqual(50);
  expect(result.status).toBe('COMPLETE');
});
```

---

#### TC-F8-E3.2: Clustering Stable Across Multiple Runs (Deterministic Seed)
**Objective**: Verify that clustering with the same random seed produces identical cluster assignments across runs.

**Test Steps**:
1. Run k-means twice with `seed: 42` on the same embeddings
2. Compare cluster assignments

**Expected Result**: Identical assignments across both runs; clusters in same order.

**Code Sample**:
```typescript
it('should produce identical cluster assignments when the same seed is used', async () => {
  const embeddings = generateTopicEmbeddings(100, 4);
  const run1 = await kMeansClusterer.cluster(embeddings, { k: 4, seed: 42 });
  const run2 = await kMeansClusterer.cluster(embeddings, { k: 4, seed: 42 });

  run1.assignments.forEach((a, i) => {
    expect(a.clusterId).toBe(run2.assignments[i].clusterId);
  });
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Clustering Speed

#### TC-F8-P1.1: K-Means Clustering — 5,000 Segments
**Objective**: Verify k-means with k=10 on 5,000 segment embeddings completes within 10 s.

**Test Steps**:
1. Generate 5,000 embeddings (768-dim)
2. Time `kMeansClusterer.cluster(embeddings, { k: 10 })` across 5 runs

**Expected Result**: p95 <= 10 s.

**Code Sample**:
```typescript
it('should cluster 5,000 segment embeddings into k=10 clusters within 10 seconds', async () => {
  const embeddings = generateRandomEmbeddings(5000, 768);
  const runs = await benchmark(() => kMeansClusterer.cluster(embeddings, { k: 10 }), { iterations: 5 });
  expect(runs.p95).toBeLessThan(10000);
});
```

---

#### TC-F8-P1.2: LDA Topic Modeling — 1,000 Documents
**Objective**: Verify LDA fitting on 1,000 text segments with k=8 topics completes within 30 s.

**Test Steps**:
1. Prepare 1,000 segment texts
2. Time `lda.fit(segments, { numTopics: 8 })`

**Expected Result**: LDA fitting completes <= 30 s.

**Code Sample**:
```typescript
it('should fit LDA topic model on 1,000 segments in under 30 seconds', async () => {
  const segments = generateTextSegments(1000);
  const start = performance.now();
  await lda.fit(segments, { numTopics: 8 });
  expect(performance.now() - start).toBeLessThan(30000);
}, 35000);
```

---

### 4.2 Concurrent Clustering

#### TC-F8-P2.1: 5 Concurrent Clustering Jobs for Different Sessions
**Objective**: Verify 5 simultaneous clustering jobs complete without resource contention or failure.

**Test Steps**:
1. Seed 5 sessions with 500 segments each
2. Fire 5 concurrent clustering requests
3. Assert all succeed within 60 s

**Expected Result**: All 5 complete; no errors.

**Code Sample**:
```typescript
it('should run 5 concurrent clustering jobs without failure', async () => {
  const ids = await seedMultipleSessions(5, 500);
  const results = await Promise.allSettled(ids.map(id => clusteringService.cluster(id)));
  results.forEach(r => expect(r.status).toBe('fulfilled'));
}, 60000);
```

---

#### TC-F8-P2.2: Conference-Level Aggregation Across 30 Sessions
**Objective**: Verify conference-level cluster merging across 30 sessions completes within 20 s.

**Test Steps**:
1. Seed and cluster 30 sessions
2. Time `conferenceClusterer.aggregate(conferenceId)` call

**Expected Result**: Aggregation completes <= 20 s; merged cluster map returned.

**Code Sample**:
```typescript
it('should aggregate topic clusters across 30 sessions within 20 seconds', async () => {
  await seedAndClusterConference(conferenceId, 30);
  const start = performance.now();
  const merged = await conferenceClusterer.aggregate(conferenceId);
  expect(performance.now() - start).toBeLessThan(20000);
  expect(merged.clusters.length).toBeGreaterThan(0);
});
```

---

### 4.3 Embedding Generation at Scale

#### TC-F8-P3.1: Batch Embedding Throughput — 10,000 Segments
**Objective**: Verify batch embedding generation of 10,000 segments completes within 60 s.

**Test Steps**:
1. Prepare 10,000 segment texts
2. Time `embedder.batchEmbed(segments)` call

**Expected Result**: Completes <= 60 s; all 10,000 embeddings returned.

**Code Sample**:
```typescript
it('should generate embeddings for 10,000 segments within 60 seconds', async () => {
  const segments = generateTextSegments(10000);
  const start = performance.now();
  const embeddings = await embedder.batchEmbed(segments);
  expect(performance.now() - start).toBeLessThan(60000);
  expect(embeddings).toHaveLength(10000);
}, 65000);
```

---

#### TC-F8-P3.2: Cluster Map Storage and Retrieval Performance
**Objective**: Verify storing and retrieving a cluster map with 500 segments completes within 200 ms each.

**Test Steps**:
1. Store a cluster map with 500 segment assignments
2. Retrieve it and measure latency

**Expected Result**: Write <= 200 ms; read <= 200 ms.

**Code Sample**:
```typescript
it('should store and retrieve a 500-segment cluster map within 200ms each', async () => {
  const clusterMap = generateClusterMap(sessionId, 500, 8);

  const writeStart = performance.now();
  await clusterRepo.save(clusterMap);
  expect(performance.now() - writeStart).toBeLessThan(200);

  const readStart = performance.now();
  await clusterRepo.findBySession(sessionId);
  expect(performance.now() - readStart).toBeLessThan(200);
});
```

---

## Test Execution Summary

### Test Categories
- **Unit Tests**: 3 suites, ~12 test cases
- **Integration Tests**: 3 suites, 6 test cases
- **Edge Cases**: 3 suites, 6 test cases
- **Performance Tests**: 3 suites, 6 test cases

### Total: ~30 comprehensive test cases
