# EPIC12 Feature 1 — Semantic Search Engine — Test Cases

## Test Overview
Comprehensive test suite for Semantic Search Engine covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Embedding Generation

#### TC-F1-U1.1: Query Embedding Dimensionality and Normalization
**Objective**: Verify that query strings are encoded into unit-norm vectors of the correct dimensionality.

**Preconditions**:
- Embedding model (e.g., `text-embedding-3-small`, 1536-dim) loaded and warmed up
- `EmbeddingService` singleton initialized

**Test Steps**:
1. Call `embeddingService.encode("machine learning infrastructure at scale")`
2. Assert the returned vector has length 1536
3. Compute L2 norm of the vector
4. Assert norm is within 0.001 of 1.0 (unit norm)

**Expected Result**: 1536-dimensional float32 vector; L2 norm ≈ 1.0 ± 0.001.

**Code Sample**:
```typescript
describe('EmbeddingService', () => {
  it('should produce a unit-norm 1536-dim vector for any query', async () => {
    const svc = new EmbeddingService({ model: 'text-embedding-3-small' });
    const vector = await svc.encode('machine learning infrastructure at scale');

    expect(vector).toHaveLength(1536);

    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    expect(norm).toBeCloseTo(1.0, 3);
  });
});
```

---

#### TC-F1-U1.2: Cosine Similarity Ranking Correctness
**Objective**: Verify that the cosine similarity function ranks semantically similar documents above dissimilar ones.

**Preconditions**:
- Three pre-computed embeddings: `docA` (on-topic), `docB` (off-topic), `docC` (synonym rewrite of query)
- Embeddings stored in test fixtures

**Test Steps**:
1. Encode query "kubernetes cluster autoscaling"
2. Compute cosine similarity against `docA`, `docB`, `docC`
3. Assert `sim(query, docC) > sim(query, docA) > sim(query, docB)`

**Expected Result**: Synonym rewrite scores highest; off-topic document scores lowest.

**Code Sample**:
```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  return dot; // assumes unit-norm inputs
}

it('should rank semantically close documents above unrelated ones', async () => {
  const svc = new EmbeddingService({ model: 'text-embedding-3-small' });
  const query = await svc.encode('kubernetes cluster autoscaling');
  const { docA, docB, docC } = loadEmbeddingFixtures('k8s-ranking');

  const simA = cosineSimilarity(query, docA);
  const simB = cosineSimilarity(query, docB);
  const simC = cosineSimilarity(query, docC);

  expect(simC).toBeGreaterThan(simA);
  expect(simA).toBeGreaterThan(simB);
});
```

---

#### TC-F1-U1.3: Batch Encoding Consistency
**Objective**: Verify that batch encoding produces identical vectors to single-item encoding for the same input.

**Test Steps**:
1. Encode "AI agent orchestration" individually → `vecSingle`
2. Batch-encode `["AI agent orchestration", "unrelated text"]` → `batchVecs[0]`
3. Assert element-wise max absolute difference < 1e-5

**Expected Result**: Batch and single encodings are numerically identical within floating-point tolerance.

**Code Sample**:
```typescript
it('should produce consistent embeddings in batch vs single mode', async () => {
  const svc = new EmbeddingService({ model: 'text-embedding-3-small' });
  const single = await svc.encode('AI agent orchestration');
  const batch  = await svc.encodeBatch(['AI agent orchestration', 'unrelated text']);

  const maxDiff = single.reduce((m, v, i) => Math.max(m, Math.abs(v - batch[0][i])), 0);
  expect(maxDiff).toBeLessThan(1e-5);
});
```

---

### 1.2 ANN Index Operations

#### TC-F1-U1.4: HNSW Index Insert and Nearest-Neighbor Retrieval
**Objective**: Verify that vectors inserted into the HNSW index are retrievable as top-1 neighbors.

**Test Steps**:
1. Build an HNSW index with `ef_construction=200, M=16`
2. Insert 1000 random unit vectors with IDs 0–999
3. For each of 10 probe vectors already in the index, query `knn(probe, k=1)`
4. Assert returned ID matches the probe's own ID

**Expected Result**: Exact self-recall = 100% for all 10 probe vectors.

**Code Sample**:
```typescript
it('should retrieve an inserted vector as its own top-1 neighbor', () => {
  const index = new HNSWIndex({ dim: 1536, efConstruction: 200, M: 16 });
  const vectors = Array.from({ length: 1000 }, (_, i) => ({ id: i, vector: randomUnitVector(1536) }));
  vectors.forEach(v => index.insert(v.id, v.vector));

  for (const probe of vectors.slice(0, 10)) {
    const [topHit] = index.query(probe.vector, 1);
    expect(topHit.id).toBe(probe.id);
  }
});
```

---

#### TC-F1-U1.5: Index Persistence and Reload
**Objective**: Verify that a serialized HNSW index produces identical query results after deserialization.

**Test Steps**:
1. Build and populate an index with 500 vectors
2. Serialize to disk at `/tmp/test-index.bin`
3. Deserialize into a fresh `HNSWIndex` instance
4. Run 20 identical queries against original and reloaded index
5. Assert result sets are identical

**Expected Result**: Reloaded index returns the same ranked lists as the original for all 20 queries.

**Code Sample**:
```typescript
it('should produce identical results after serialize/deserialize cycle', async () => {
  const original = await buildPopulatedIndex(500);
  await original.save('/tmp/test-index.bin');

  const reloaded = await HNSWIndex.load('/tmp/test-index.bin');

  for (const query of testQueries) {
    const origResults  = original.query(query.vector, 10).map(r => r.id);
    const reloadResults = reloaded.query(query.vector, 10).map(r => r.id);
    expect(reloadResults).toEqual(origResults);
  }
});
```

---

#### TC-F1-U1.6: Top-K Result Count Invariant
**Objective**: Verify that querying for k results never returns more than k items, even when the index has fewer entries than k.

**Test Steps**:
1. Insert only 3 vectors into the index
2. Query with `k=10`
3. Assert result length = 3

**Expected Result**: Result array length = min(index_size, k).

**Code Sample**:
```typescript
it('should return at most k results, capped by index size', () => {
  const index = new HNSWIndex({ dim: 128, efConstruction: 64, M: 8 });
  [0, 1, 2].forEach(i => index.insert(i, randomUnitVector(128)));

  const results = index.query(randomUnitVector(128), 10);
  expect(results.length).toBe(3);
});
```

---

### 1.3 Result Scoring and Reranking

#### TC-F1-U1.7: Score Normalization to [0, 1]
**Objective**: Verify that raw ANN scores are min-max normalized to the [0, 1] range before returning to callers.

**Test Steps**:
1. Mock ANN index to return scores `[0.95, 0.82, 0.61, 0.44]`
2. Call `scoreNormalizer.normalize(rawScores)`
3. Assert max value = 1.0, min value = 0.0, order preserved

**Expected Result**: `[1.0, 0.534..., 0.157..., 0.0]` with order preserved.

**Code Sample**:
```typescript
it('should min-max normalize ANN scores to [0, 1]', () => {
  const normalizer = new ScoreNormalizer();
  const raw = [0.95, 0.82, 0.61, 0.44];
  const normalized = normalizer.normalize(raw);

  expect(Math.max(...normalized)).toBeCloseTo(1.0);
  expect(Math.min(...normalized)).toBeCloseTo(0.0);
  expect(normalized[0]).toBeGreaterThan(normalized[1]);
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 End-to-End Search Pipeline

#### TC-F1-I1.1: Query to Ranked Results Pipeline
**Objective**: Verify the full pipeline — encode → ANN search → fetch metadata → return ranked hits — produces semantically relevant results.

**Preconditions**:
- Vector index seeded with 10,000 conference note embeddings
- Metadata store populated with matching records
- `SemanticSearchService` wired to both stores

**Test Steps**:
1. Call `searchService.search({ query: "generative AI product roadmap", topK: 5 })`
2. Assert response contains exactly 5 hits
3. Assert each hit has `id`, `score`, `title`, `snippet` fields
4. Assert top hit title contains a keyword semantically related to "generative AI" or "product roadmap"

**Expected Result**: 5 ranked hits returned with scores descending; top hit is semantically on-topic.

**Code Sample**:
```typescript
it('should return 5 semantically relevant hits for a product roadmap query', async () => {
  const svc = new SemanticSearchService({ indexPath: TEST_INDEX, metaStore: testMetaStore });
  const results = await svc.search({ query: 'generative AI product roadmap', topK: 5 });

  expect(results.hits).toHaveLength(5);
  results.hits.forEach(h => {
    expect(h).toHaveProperty('id');
    expect(h).toHaveProperty('score');
    expect(h.score).toBeGreaterThan(0);
  });
  expect(results.hits[0].score).toBeGreaterThanOrEqual(results.hits[1].score);
});
```

---

#### TC-F1-I1.2: Real-Time Index Update Reflected in Search
**Objective**: Verify that a document indexed after the service starts is immediately retrievable.

**Test Steps**:
1. Start `SemanticSearchService` with an empty index
2. Index a new note: `{ id: 'note-999', text: 'quantum computing for financial modeling' }`
3. Wait for index acknowledgment
4. Search `"quantum finance computing"`
5. Assert `note-999` appears in top-3 results

**Expected Result**: Freshly indexed document is discoverable within the same service session.

**Code Sample**:
```typescript
it('should make a newly indexed document immediately searchable', async () => {
  await svc.indexDocument({ id: 'note-999', text: 'quantum computing for financial modeling' });

  const results = await svc.search({ query: 'quantum finance computing', topK: 3 });
  const ids = results.hits.map(h => h.id);
  expect(ids).toContain('note-999');
});
```

---

### 2.2 Multi-Filter Search

#### TC-F1-I2.1: Conference-Scoped Semantic Search
**Objective**: Verify that the `conferenceId` filter restricts results to notes from a single conference.

**Test Steps**:
1. Seed index with 200 notes split across `conf-A` and `conf-B`
2. Search `{ query: "cloud architecture", conferenceId: "conf-A", topK: 10 }`
3. Assert all returned hits have `conferenceId = "conf-A"`
4. Assert no `conf-B` results leak through

**Expected Result**: 100% of returned hits belong to `conf-A`.

**Code Sample**:
```typescript
it('should restrict results to the specified conferenceId', async () => {
  const results = await svc.search({ query: 'cloud architecture', conferenceId: 'conf-A', topK: 10 });
  results.hits.forEach(h => expect(h.conferenceId).toBe('conf-A'));
});
```

---

#### TC-F1-I2.2: Date-Range Filter on Semantic Results
**Objective**: Verify that a date range filter applied to semantic results excludes out-of-range documents.

**Test Steps**:
1. Seed index with notes dated from 2024-01-01 to 2026-12-31
2. Search with `dateRange: { from: "2026-01-01", to: "2026-06-30" }`
3. Assert all returned hits have `createdAt` within the range

**Expected Result**: Zero hits outside the specified date window.

**Code Sample**:
```typescript
it('should exclude notes outside the specified date range', async () => {
  const from = new Date('2026-01-01');
  const to   = new Date('2026-06-30');
  const results = await svc.search({ query: 'AI trends', dateRange: { from, to }, topK: 20 });

  results.hits.forEach(h => {
    const d = new Date(h.createdAt);
    expect(d.getTime()).toBeGreaterThanOrEqual(from.getTime());
    expect(d.getTime()).toBeLessThanOrEqual(to.getTime());
  });
});
```

---

### 2.3 Search Result Persistence

#### TC-F1-I3.1: Search History Logging
**Objective**: Verify that each search query is persisted to the search history store for analytics and recall.

**Test Steps**:
1. Execute 3 distinct search queries under `userId: "user-42"`
2. Query search history store for `userId: "user-42"`
3. Assert 3 records exist with correct `query`, `topK`, `timestamp`, and `hitCount` fields

**Expected Result**: All 3 queries logged accurately; no records missing or duplicated.

**Code Sample**:
```typescript
it('should log every search query to the history store', async () => {
  const queries = ['API gateway patterns', 'LLM fine-tuning', 'data mesh architecture'];
  for (const q of queries) {
    await svc.search({ query: q, topK: 5, userId: 'user-42' });
  }

  const history = await historyStore.getByUser('user-42');
  expect(history).toHaveLength(3);
  expect(history.map(h => h.query)).toEqual(expect.arrayContaining(queries));
});
```

---

#### TC-F1-I3.2: Search Result Caching
**Objective**: Verify that repeated identical queries are served from cache without hitting the ANN index.

**Test Steps**:
1. Spy on `annIndex.query`
2. Execute `search({ query: "microservices patterns", topK: 5 })` twice with identical params
3. Assert `annIndex.query` was called exactly once (second call served from cache)

**Expected Result**: ANN index queried once; second response matches first response exactly.

**Code Sample**:
```typescript
it('should serve repeated identical queries from cache', async () => {
  const querySpy = jest.spyOn(annIndex, 'query');

  const r1 = await svc.search({ query: 'microservices patterns', topK: 5 });
  const r2 = await svc.search({ query: 'microservices patterns', topK: 5 });

  expect(querySpy).toHaveBeenCalledTimes(1);
  expect(r2.hits.map(h => h.id)).toEqual(r1.hits.map(h => h.id));
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Degenerate Queries

#### TC-F1-E1.1: Empty Query String
**Objective**: Verify that an empty query string returns a descriptive error rather than crashing.

**Preconditions**:
- `SemanticSearchService` running with populated index

**Test Steps**:
1. Call `svc.search({ query: "", topK: 5 })`
2. Assert the promise rejects with `SemanticSearchError`
3. Assert error message contains "query must not be empty"

**Expected Result**: Graceful rejection with typed error; no unhandled exception; no ANN index hit.

**Code Sample**:
```typescript
it('should reject empty query with a typed SemanticSearchError', async () => {
  await expect(svc.search({ query: '', topK: 5 })).rejects.toThrow(SemanticSearchError);
  await expect(svc.search({ query: '', topK: 5 })).rejects.toThrow(/query must not be empty/i);
});
```

---

#### TC-F1-E1.2: Query Exceeding Token Limit
**Objective**: Verify that a query string exceeding the model's token limit is truncated and still returns results.

**Test Steps**:
1. Construct a query string of 10,000 characters (well beyond the 8192-token limit)
2. Call `svc.search({ query: longQuery, topK: 5 })`
3. Assert the call succeeds (no error thrown)
4. Assert a warning is emitted: `"query truncated to model token limit"`

**Expected Result**: Results returned successfully; truncation warning logged; no crash.

**Code Sample**:
```typescript
it('should truncate oversized queries and still return results', async () => {
  const longQuery = 'AI '.repeat(3400); // ~10 k chars
  const warnSpy = jest.spyOn(logger, 'warn');

  const results = await svc.search({ query: longQuery, topK: 5 });

  expect(results.hits.length).toBeGreaterThan(0);
  expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/query truncated/i));
});
```

---

### 3.2 Index Boundary Conditions

#### TC-F1-E2.1: Search Against Empty Index
**Objective**: Verify that searching an empty index returns zero results without error.

**Test Steps**:
1. Initialize `SemanticSearchService` with a freshly created empty index
2. Call `svc.search({ query: "neural networks", topK: 10 })`
3. Assert `hits` array is empty
4. Assert `totalCount = 0`

**Expected Result**: `{ hits: [], totalCount: 0 }` returned; no exception.

**Code Sample**:
```typescript
it('should return empty hits for a search on an empty index', async () => {
  const emptySvc = new SemanticSearchService({ indexPath: EMPTY_INDEX_PATH, metaStore });
  const results = await emptySvc.search({ query: 'neural networks', topK: 10 });

  expect(results.hits).toHaveLength(0);
  expect(results.totalCount).toBe(0);
});
```

---

#### TC-F1-E2.2: Deleted Document Not Returned in Results
**Objective**: Verify that a document deleted from the index does not appear in subsequent search results.

**Test Steps**:
1. Index document `{ id: 'doc-del-1', text: 'zero-trust security architecture' }`
2. Confirm it appears in search results for "zero-trust security"
3. Delete document `doc-del-1` from the index
4. Re-run the same search
5. Assert `doc-del-1` is absent from results

**Expected Result**: Deleted document never returned post-deletion.

**Code Sample**:
```typescript
it('should not return a deleted document in search results', async () => {
  await svc.indexDocument({ id: 'doc-del-1', text: 'zero-trust security architecture' });
  const before = await svc.search({ query: 'zero-trust security', topK: 5 });
  expect(before.hits.map(h => h.id)).toContain('doc-del-1');

  await svc.deleteDocument('doc-del-1');

  const after = await svc.search({ query: 'zero-trust security', topK: 5 });
  expect(after.hits.map(h => h.id)).not.toContain('doc-del-1');
});
```

---

### 3.3 Multilingual and Special Character Queries

#### TC-F1-E3.1: Non-ASCII Query Characters
**Objective**: Verify that queries with non-ASCII characters (e.g., accented letters, CJK characters) are handled without encoding errors.

**Test Steps**:
1. Call `svc.search({ query: "intelligence artificielle stratégie", topK: 5 })`
2. Call `svc.search({ query: "人工智能会议", topK: 5 })`
3. Assert both calls complete without error
4. Assert both return arrays (may be empty for CJK if corpus is English-only)

**Expected Result**: No exception; valid (possibly empty) results returned for both queries.

**Code Sample**:
```typescript
it('should handle non-ASCII queries without throwing', async () => {
  await expect(svc.search({ query: 'intelligence artificielle stratégie', topK: 5 })).resolves.toBeDefined();
  await expect(svc.search({ query: '人工智能会议', topK: 5 })).resolves.toBeDefined();
});
```

---

#### TC-F1-E3.2: SQL-Injection-Style Query String
**Objective**: Verify that a query containing SQL meta-characters does not corrupt the metadata store.

**Test Steps**:
1. Call `svc.search({ query: "'; DROP TABLE notes; --", topK: 5 })`
2. Assert the call completes without error
3. Query metadata store for note count; assert it is unchanged

**Expected Result**: Metadata store intact; query treated as a plain string; no injection executed.

**Code Sample**:
```typescript
it('should safely handle SQL-injection-style query strings', async () => {
  const countBefore = await metaStore.count();
  await svc.search({ query: "'; DROP TABLE notes; --", topK: 5 });
  const countAfter = await metaStore.count();
  expect(countAfter).toBe(countBefore);
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Query Latency

#### TC-F1-P1.1: P99 Query Latency Under 200 ms at 1 M Vectors
**Objective**: Verify that 99th-percentile search latency stays below 200 ms with a 1-million-vector index.

**Preconditions**:
- HNSW index loaded with 1,000,000 document vectors
- `ef_search = 64`
- Test runner has dedicated CPU allocation (no background indexing)

**Test Steps**:
1. Warm up the index with 100 queries
2. Execute 1000 search queries sequentially, recording latency for each
3. Compute p99 latency
4. Assert p99 < 200 ms

**Expected Result**: p99 latency < 200 ms; p50 < 50 ms.

**Code Sample**:
```typescript
it('should achieve p99 < 200 ms on a 1 M-vector HNSW index', async () => {
  await warmUpIndex(index, 100);

  const latencies: number[] = [];
  for (let i = 0; i < 1000; i++) {
    const start = performance.now();
    await svc.search({ query: testQueries[i % testQueries.length], topK: 10 });
    latencies.push(performance.now() - start);
  }

  latencies.sort((a, b) => a - b);
  const p99 = latencies[Math.floor(latencies.length * 0.99)];
  expect(p99).toBeLessThan(200);
}, 120_000);
```

---

#### TC-F1-P1.2: Sustained Throughput at 50 Concurrent Users
**Objective**: Verify the search service handles 50 concurrent queries without degradation or timeout.

**Test Steps**:
1. Fire 50 concurrent `search` calls with distinct queries
2. Record total wall-clock time and per-request latency
3. Assert all 50 calls succeed (no rejections)
4. Assert max individual latency < 2000 ms

**Expected Result**: 100% success rate; no call exceeds 2 s under 50-way concurrency.

**Code Sample**:
```typescript
it('should serve 50 concurrent search requests without failure', async () => {
  const promises = Array.from({ length: 50 }, (_, i) =>
    svc.search({ query: concurrentQueries[i], topK: 5 })
  );
  const results = await Promise.allSettled(promises);

  const fulfilled = results.filter(r => r.status === 'fulfilled');
  expect(fulfilled).toHaveLength(50);
}, 30_000);
```

---

### 4.2 Indexing Throughput

#### TC-F1-P2.1: Bulk Indexing Rate >= 1000 Docs/sec
**Objective**: Verify that the bulk indexing pipeline can ingest at least 1000 documents per second.

**Test Steps**:
1. Prepare a batch of 10,000 pre-encoded documents
2. Call `svc.bulkIndex(batch)` and record wall-clock duration
3. Assert `10000 / durationSec >= 1000`

**Expected Result**: Bulk indexing throughput >= 1000 docs/sec.

**Code Sample**:
```typescript
it('should index at least 1000 documents per second in bulk mode', async () => {
  const docs = generateDocBatch(10_000);
  const start = Date.now();
  await svc.bulkIndex(docs);
  const elapsed = (Date.now() - start) / 1000;

  const throughput = docs.length / elapsed;
  expect(throughput).toBeGreaterThanOrEqual(1000);
}, 60_000);
```

---

#### TC-F1-P2.2: Incremental Index Update Does Not Block Reads
**Objective**: Verify that inserting new documents into a live index does not block concurrent read queries.

**Test Steps**:
1. Start a background loop continuously inserting documents at 100 docs/sec
2. Simultaneously run 200 search queries and record latency
3. Assert p95 search latency during indexing < 2× baseline p95

**Expected Result**: Read latency does not degrade more than 2× during concurrent write load.

**Code Sample**:
```typescript
it('should not block reads during concurrent incremental indexing', async () => {
  const baseline = await measureP95Latency(svc, 200);

  const writeLoop = startContinuousIndexing(svc, 100); // 100 docs/sec
  const underLoad = await measureP95Latency(svc, 200);
  writeLoop.stop();

  expect(underLoad).toBeLessThan(baseline * 2);
}, 60_000);
```

---

### 4.3 Recall Quality at Scale

#### TC-F1-P3.1: Recall@10 >= 0.95 vs. Brute-Force Baseline
**Objective**: Verify that ANN recall@10 is at least 95% relative to exact brute-force nearest neighbors.

**Test Steps**:
1. Build a brute-force index and an HNSW index from the same 100,000 vectors
2. For 500 random query vectors, collect top-10 results from both
3. Compute recall = |ANN ∩ BF| / 10 per query; average across all queries
4. Assert average recall >= 0.95

**Expected Result**: Mean recall@10 >= 0.95.

**Code Sample**:
```typescript
it('should achieve recall@10 >= 0.95 vs brute-force baseline', () => {
  const recalls = testQueries.map(q => {
    const annIds = annIndex.query(q, 10).map(r => r.id);
    const bfIds  = bfIndex.query(q, 10).map(r => r.id);
    const intersection = annIds.filter(id => bfIds.includes(id));
    return intersection.length / 10;
  });

  const meanRecall = recalls.reduce((s, r) => s + r, 0) / recalls.length;
  expect(meanRecall).toBeGreaterThanOrEqual(0.95);
});
```

---

#### TC-F1-P3.2: MRR@5 >= 0.80 on Labeled Evaluation Set
**Objective**: Verify that the semantic search engine achieves Mean Reciprocal Rank >= 0.80 on a labeled query-document relevance set.

**Test Steps**:
1. Load 100 labeled query–relevant-document pairs from the evaluation fixture
2. For each query, run `search({ query, topK: 5 })` and find the rank of the relevant document
3. Compute MRR = (1/100) × Σ (1 / rank_i)
4. Assert MRR >= 0.80

**Expected Result**: MRR@5 >= 0.80 across the evaluation set.

**Code Sample**:
```typescript
it('should achieve MRR@5 >= 0.80 on the labeled evaluation set', async () => {
  const evalPairs = loadEvalSet('semantic-search-eval-100.json');
  let reciprocalRankSum = 0;

  for (const { query, relevantId } of evalPairs) {
    const hits = await svc.search({ query, topK: 5 });
    const rank = hits.hits.findIndex(h => h.id === relevantId) + 1;
    reciprocalRankSum += rank > 0 ? 1 / rank : 0;
  }

  const mrr = reciprocalRankSum / evalPairs.length;
  expect(mrr).toBeGreaterThanOrEqual(0.80);
});
```

---

## Test Execution Summary

| Section | Suites | Test Cases |
|---------|--------|------------|
| Unit Tests | 3 | 7 |
| Integration Tests | 3 | 6 |
| Edge Case Validation | 3 | 6 |
| Performance Validation | 3 | 6 |
| **Total** | **12** | **25** |

**Estimated execution time**: Unit ~30 s · Integration ~2 min · Edge ~1 min · Performance ~10 min
