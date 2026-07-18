# EPIC05 Feature 7 — Session Search — Test Cases

## Test Overview
Comprehensive test suite for Session Search covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Full-Text Search Index Operations

#### TC-F7-U1.1: Keyword Search Returns Matching Segments
**Objective**: Verify that a keyword query returns all segments containing the keyword within the indexed corpus.

**Preconditions**:
- Search index populated with transcribed session segments
- Session data available with known content

**Test Steps**:
1. Index a session transcript containing "zero trust" in 3 segments
2. Call `search({ query: 'zero trust', sessionId })`
3. Assert all 3 segments returned

**Expected Result**: 3 results returned; each has `segmentId`, `text`, `startMs`, `score`.

**Code Sample**:
```typescript
describe('SessionSearchEngine', () => {
  it('should return all segments containing the search keyword', async () => {
    await indexSession('session-001', zeroTrustTranscript);
    const engine = new SessionSearchEngine(mockSearchService);
    const results = await engine.search({ query: 'zero trust', sessionId: 'session-001' });

    expect(results.hits).toHaveLength(3);
    results.hits.forEach(hit => {
      expect(hit.text.toLowerCase()).toContain('zero trust');
      expect(hit.startMs).toBeGreaterThanOrEqual(0);
    });
  });
});
```

---

#### TC-F7-U1.2: Search Results Sorted by Relevance Score Descending
**Objective**: Verify search results are returned in descending relevance order (BM25 or similar).

**Test Steps**:
1. Index a 30-segment session with varying "machine learning" keyword density
2. Call `search({ query: 'machine learning' })`
3. Assert results are sorted by `score` descending

**Expected Result**: `results.hits[0].score >= results.hits[1].score >= ...`.

**Code Sample**:
```typescript
it('should return results sorted by relevance score in descending order', async () => {
  await indexSession(sessionId, mlDenseTranscript);
  const results = await engine.search({ query: 'machine learning', sessionId });

  for (let i = 0; i < results.hits.length - 1; i++) {
    expect(results.hits[i].score).toBeGreaterThanOrEqual(results.hits[i + 1].score);
  }
});
```

---

#### TC-F7-U1.3: Phrase Search Returns Exact Phrase Matches First
**Objective**: Verify that a quoted phrase search `"data sovereignty"` prioritizes exact matches over partial keyword matches.

**Test Steps**:
1. Index segments: some with "data sovereignty" exact, some with "data" and "sovereignty" in different sentences
2. Call `search({ query: '"data sovereignty"' })`
3. Assert exact-phrase segments rank above partial matches

**Expected Result**: Exact phrase segments appear before partial matches in result list.

**Code Sample**:
```typescript
it('should rank exact phrase matches above partial keyword matches', async () => {
  await indexSession(sessionId, mixedSovereigntyTranscript);
  const results = await engine.search({ query: '"data sovereignty"', sessionId });

  const exactIdx = results.hits.findIndex(h => h.text.includes('data sovereignty'));
  const partialIdx = results.hits.findIndex(h => !h.text.includes('data sovereignty'));
  if (partialIdx !== -1) {
    expect(exactIdx).toBeLessThan(partialIdx);
  }
});
```

---

### 1.2 Semantic/Vector Search

#### TC-F7-U2.1: Semantic Query Finds Conceptually Related Segments
**Objective**: Verify that a semantic query finds relevant segments even when no exact keyword overlap exists.

**Test Steps**:
1. Index segment: "The perimeter-based model has become obsolete in modern distributed architectures."
2. Query: `"zero trust security"`
3. Assert the segment is returned with `semanticScore >= 0.80` despite no literal "zero trust" in text

**Expected Result**: Segment returned; `semanticScore >= 0.80`; `matchType = 'SEMANTIC'`.

**Code Sample**:
```typescript
describe('SemanticSearchLayer', () => {
  it('should retrieve conceptually related segments without exact keyword overlap', async () => {
    await indexSession(sessionId, [{ text: 'The perimeter-based model has become obsolete in modern distributed architectures.', startMs: 300000 }]);
    const results = await engine.search({ query: 'zero trust security', sessionId, mode: 'SEMANTIC' });

    expect(results.hits.length).toBeGreaterThan(0);
    expect(results.hits[0].semanticScore).toBeGreaterThanOrEqual(0.80);
    expect(results.hits[0].matchType).toBe('SEMANTIC');
  });
});
```

---

#### TC-F7-U2.2: Hybrid Search Combines BM25 and Vector Scores
**Objective**: Verify that hybrid search mode produces a ranked list that improves over pure keyword or pure semantic alone.

**Test Steps**:
1. Run keyword-only, semantic-only, and hybrid searches on the same query
2. Assert the hybrid result set contains items from both keyword and semantic results
3. Assert hybrid `compositeScore` is the weighted combination

**Expected Result**: Hybrid results include items unique to either keyword or semantic; scores are weighted sums.

**Code Sample**:
```typescript
it('should produce hybrid results combining BM25 and semantic scores', async () => {
  const kwResults = await engine.search({ query: 'cloud native', sessionId, mode: 'KEYWORD' });
  const semResults = await engine.search({ query: 'cloud native', sessionId, mode: 'SEMANTIC' });
  const hybridResults = await engine.search({ query: 'cloud native', sessionId, mode: 'HYBRID' });

  const hybridIds = new Set(hybridResults.hits.map(h => h.segmentId));
  const kwIds = new Set(kwResults.hits.map(h => h.segmentId));
  const semIds = new Set(semResults.hits.map(h => h.segmentId));

  expect([...kwIds].some(id => hybridIds.has(id))).toBe(true);
  expect([...semIds].some(id => hybridIds.has(id))).toBe(true);
});
```

---

#### TC-F7-U2.3: Search Filtered by Speaker Returns Only That Speaker's Segments
**Objective**: Verify `speakerId` filter restricts results to the specified speaker.

**Test Steps**:
1. Index a session with segments from Speaker_0 and Speaker_1, both mentioning "AI governance"
2. Call `search({ query: 'AI governance', sessionId, filters: { speakerId: 'Speaker_0' } })`
3. Assert all results are from Speaker_0 only

**Expected Result**: Only Speaker_0 segments returned; no Speaker_1 hits.

**Code Sample**:
```typescript
it('should return only segments from the specified speaker when speaker filter is applied', async () => {
  await indexSession(sessionId, multiSpeakerGovernanceTranscript);
  const results = await engine.search({
    query: 'AI governance',
    sessionId,
    filters: { speakerId: 'Speaker_0' }
  });
  results.hits.forEach(hit => expect(hit.speakerId).toBe('Speaker_0'));
});
```

---

### 1.3 Filter and Facet Operations

#### TC-F7-U3.1: Time-Range Filter Returns Segments Within Specified Window
**Objective**: Verify `filters.timeRange` limits results to segments within the specified ms range.

**Test Steps**:
1. Index session with segments across 60 minutes
2. Query with `filters: { timeRange: { startMs: 1200000, endMs: 1800000 } }` (minutes 20–30)
3. Assert all returned segments have `startMs` in [1200000, 1800000]

**Expected Result**: Only segments in the 20–30 minute window returned.

**Code Sample**:
```typescript
describe('SearchFilters', () => {
  it('should restrict results to the specified time range', async () => {
    const results = await engine.search({
      query: 'innovation',
      sessionId,
      filters: { timeRange: { startMs: 1200000, endMs: 1800000 } }
    });
    results.hits.forEach(hit => {
      expect(hit.startMs).toBeGreaterThanOrEqual(1200000);
      expect(hit.startMs).toBeLessThanOrEqual(1800000);
    });
  });
});
```

---

#### TC-F7-U3.2: Topic Label Facet Filter Returns Only Relevant Topic Segments
**Objective**: Verify `filters.topicLabel` limits results to segments associated with a specific slide-derived topic.

**Test Steps**:
1. Index session with slide-linked topic labels
2. Query with `filters: { topicLabel: 'Data Privacy' }`
3. Assert all returned hits carry `topicLabel = 'Data Privacy'`

**Expected Result**: Only Data Privacy–labeled segments returned.

**Code Sample**:
```typescript
it('should filter search results by topic label', async () => {
  const results = await engine.search({
    query: 'privacy',
    sessionId,
    filters: { topicLabel: 'Data Privacy' }
  });
  results.hits.forEach(hit => expect(hit.topicLabel).toBe('Data Privacy'));
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Multi-Session Cross-Conference Search

#### TC-F7-I1.1: Global Search Across All Sessions in a Conference
**Objective**: Verify `GET /conferences/{id}/search?q=...` returns results from multiple sessions.

**Preconditions**:
- Conference has 5 indexed sessions; all contain query term

**Test Steps**:
1. Index 5 sessions with segments containing "quantum computing"
2. Call `GET /conferences/{confId}/search?q=quantum+computing`
3. Assert results include hits from at least 3 distinct sessions

**Expected Result**: Results span >= 3 sessions; each hit has `sessionId` and `conferenceId`.

**Code Sample**:
```typescript
it('should return search results from multiple sessions in a conference-wide query', async () => {
  const sessionIds = await indexConferenceSessions(conferenceId, 5, 'quantum computing');
  const res = await apiClient.get(`/conferences/${conferenceId}/search?q=quantum+computing`);

  const uniqueSessions = new Set(res.data.hits.map((h: any) => h.sessionId));
  expect(uniqueSessions.size).toBeGreaterThanOrEqual(3);
});
```

---

#### TC-F7-I1.2: Search Result Deep-Links to Media Player Position
**Objective**: Verify each search result includes a `deepLinkUrl` that navigates the player to the correct timestamp.

**Test Steps**:
1. Search for "trust boundary"
2. Assert each hit has `deepLinkUrl` matching `session://{sessionId}?t={startMs}`

**Expected Result**: All hits have valid deep-link URLs.

**Code Sample**:
```typescript
it('should include media player deep-link URLs in each search result', async () => {
  const results = await engine.search({ query: 'trust boundary', sessionId });
  results.hits.forEach(hit => {
    expect(hit.deepLinkUrl).toMatch(new RegExp(`session://${sessionId}\\?t=\\d+`));
  });
});
```

---

### 2.2 Search Index Lifecycle

#### TC-F7-I2.1: Index Updated After Transcript Correction
**Objective**: Verify that editing a segment text re-indexes that segment so the corrected text is searchable.

**Test Steps**:
1. Index a session; search for "old phrase" (appears in seg-010) → 1 hit
2. Edit seg-010 text to remove "old phrase"
3. Wait for re-index
4. Search again → assert 0 hits for "old phrase"

**Expected Result**: Old phrase no longer searchable; index reflects corrected text.

**Code Sample**:
```typescript
it('should reflect transcript corrections in the search index', async () => {
  await indexSession(sessionId, transcriptWithOldPhrase);
  const before = await engine.search({ query: 'old phrase', sessionId });
  expect(before.hits.length).toBeGreaterThan(0);

  await transcriptRepo.updateSegment('seg-010', { text: 'Updated segment text.' });
  await waitForReindex(sessionId, { timeout: 5000 });

  const after = await engine.search({ query: 'old phrase', sessionId });
  expect(after.hits).toHaveLength(0);
});
```

---

#### TC-F7-I2.2: Session Deleted — Index Entries Removed
**Objective**: Verify that deleting a session removes all its index entries and search returns no results for that session.

**Test Steps**:
1. Index a session and verify search returns results
2. Delete the session via `DELETE /sessions/{id}`
3. Search again for the session's content
4. Assert no results

**Expected Result**: Zero results from deleted session; no orphaned index entries.

**Code Sample**:
```typescript
it('should remove all index entries when a session is deleted', async () => {
  await indexSession(sessionId, transcript);
  const before = await engine.search({ query: 'test content', sessionId });
  expect(before.hits.length).toBeGreaterThan(0);

  await apiClient.delete(`/sessions/${sessionId}`);
  await waitForIndexCleanup(sessionId, { timeout: 5000 });

  const after = await engine.search({ query: 'test content', sessionId });
  expect(after.hits).toHaveLength(0);
});
```

---

### 2.3 Search API Integration

#### TC-F7-I3.1: Pagination Returns Correct Pages
**Objective**: Verify `GET /sessions/{id}/search?q=...&page=2&pageSize=10` returns the correct page of results.

**Test Steps**:
1. Index session with 25 segments matching the query
2. Fetch page 1 (results 1–10) and page 2 (results 11–20)
3. Assert no overlap between pages; correct total count returned

**Expected Result**: Pages are distinct; `totalHits = 25`; each page has correct count.

**Code Sample**:
```typescript
it('should paginate search results correctly with no page overlap', async () => {
  await indexSession(sessionId, twentyFiveMatchTranscript);
  const page1 = await apiClient.get(`/sessions/${sessionId}/search?q=target&page=1&pageSize=10`);
  const page2 = await apiClient.get(`/sessions/${sessionId}/search?q=target&page=2&pageSize=10`);

  expect(page1.data.totalHits).toBe(25);
  const page1Ids = new Set(page1.data.hits.map((h: any) => h.segmentId));
  page2.data.hits.forEach((h: any) => expect(page1Ids.has(h.segmentId)).toBe(false));
});
```

---

#### TC-F7-I3.2: Search Query Logged for Analytics
**Objective**: Verify each search query is logged to the analytics store for product usage analysis.

**Test Steps**:
1. Perform 3 searches
2. Query the analytics log for the session
3. Assert 3 query log entries with correct `query` and `userId` fields

**Expected Result**: 3 log entries; each has `query`, `userId`, `sessionId`, `timestamp`, `resultCount`.

**Code Sample**:
```typescript
it('should log each search query to the analytics store', async () => {
  await engine.search({ query: 'cloud security', sessionId, userId: 'user-001' });
  await engine.search({ query: 'compliance framework', sessionId, userId: 'user-001' });
  await engine.search({ query: 'audit trail', sessionId, userId: 'user-001' });

  const logs = await analyticsRepo.getSearchLogs({ sessionId, userId: 'user-001' });
  expect(logs).toHaveLength(3);
  logs.forEach(l => {
    expect(l.query).toBeDefined();
    expect(l.resultCount).toBeGreaterThanOrEqual(0);
  });
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Empty and Invalid Queries

#### TC-F7-E1.1: Empty Query String Returns Error
**Objective**: Verify the search endpoint returns a 400 Bad Request when an empty query string is submitted.

**Test Steps**:
1. Call `GET /sessions/{id}/search?q=`
2. Assert HTTP 400 response with descriptive error message

**Expected Result**: `400 Bad Request`; `error.code = 'EMPTY_QUERY'`.

**Code Sample**:
```typescript
it('should return 400 Bad Request for an empty search query', async () => {
  const res = await apiClient.get(`/sessions/${sessionId}/search?q=`, { validateStatus: () => true });
  expect(res.status).toBe(400);
  expect(res.data.error.code).toBe('EMPTY_QUERY');
});
```

---

#### TC-F7-E1.2: Query with Special Characters Handled Safely
**Objective**: Verify special characters in the query (e.g., `<script>`, `OR 1=1`) do not cause errors or injection.

**Test Steps**:
1. Send query `<script>alert('xss')</script>`
2. Assert HTTP 200 with sanitized query processed; 0 results; no HTML in response body

**Expected Result**: Query sanitized; response safe; no XSS or injection executed.

**Code Sample**:
```typescript
it('should sanitize special characters in search query without injection', async () => {
  const res = await apiClient.get(`/sessions/${sessionId}/search?q=${encodeURIComponent("<script>alert('xss')</script>")}`);
  expect(res.status).toBe(200);
  expect(JSON.stringify(res.data)).not.toContain('<script>');
  expect(res.data.hits).toHaveLength(0);
});
```

---

### 3.2 No Results and Sparse Index

#### TC-F7-E2.1: Query with No Matches Returns Empty Array
**Objective**: Verify a query with no matches returns an empty hits array, not a 404 or error.

**Test Steps**:
1. Search for a nonsensical term guaranteed not to be in the index
2. Assert HTTP 200; `hits = []`; `totalHits = 0`

**Expected Result**: `200 OK`; `hits: []`; `totalHits: 0`.

**Code Sample**:
```typescript
it('should return an empty hits array for a query with no matches', async () => {
  const res = await apiClient.get(`/sessions/${sessionId}/search?q=xyzzy1234nosuchterm`);
  expect(res.status).toBe(200);
  expect(res.data.hits).toHaveLength(0);
  expect(res.data.totalHits).toBe(0);
});
```

---

#### TC-F7-E2.2: Search on Unindexed Session Returns Error
**Objective**: Verify searching a session whose index has not yet been built returns a meaningful error.

**Test Steps**:
1. Create a session but do not index it
2. Call search on that session
3. Assert `404 Not Found` or `409 Conflict` with `error.code = 'SESSION_NOT_INDEXED'`

**Expected Result**: Appropriate error code; not a 500 Internal Server Error.

**Code Sample**:
```typescript
it('should return SESSION_NOT_INDEXED error for a session without a search index', async () => {
  const unindexedId = await createSessionWithoutIndex();
  const res = await apiClient.get(`/sessions/${unindexedId}/search?q=test`, { validateStatus: () => true });
  expect([404, 409]).toContain(res.status);
  expect(res.data.error.code).toBe('SESSION_NOT_INDEXED');
});
```

---

### 3.3 Multi-Language Search

#### TC-F7-E3.1: Keyword Search in Japanese Returns Correct Segments
**Objective**: Verify the search engine correctly indexes and retrieves Japanese-language segments.

**Test Steps**:
1. Index a Japanese transcript segment
2. Query with a Japanese keyword
3. Assert the segment is returned

**Expected Result**: Japanese segment retrieved; `language = 'ja'` on result.

**Code Sample**:
```typescript
it('should index and retrieve Japanese-language segments correctly', async () => {
  await indexSession(sessionId, japaneseTranscript);
  const results = await engine.search({ query: 'セキュリティ', sessionId });
  expect(results.hits.length).toBeGreaterThan(0);
  expect(results.hits[0].language).toBe('ja');
});
```

---

#### TC-F7-E3.2: Cross-Language Semantic Search
**Objective**: Verify that semantic search finds a Spanish segment when queried in English (cross-lingual embedding).

**Test Steps**:
1. Index Spanish segment discussing "privacidad de datos"
2. Query semantically in English: "data privacy"
3. Assert Spanish segment is in top results

**Expected Result**: Spanish segment returned; `language = 'es'`; `semanticScore >= 0.75`.

**Code Sample**:
```typescript
it('should find Spanish segments when queried semantically in English', async () => {
  await indexSession(sessionId, spanishTranscript);
  const results = await engine.search({ query: 'data privacy', sessionId, mode: 'SEMANTIC' });
  const spanishHit = results.hits.find(h => h.language === 'es');
  expect(spanishHit).toBeDefined();
  expect(spanishHit!.semanticScore).toBeGreaterThanOrEqual(0.75);
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Search Latency

#### TC-F7-P1.1: Keyword Search Latency — Index with 100K Segments
**Objective**: Verify keyword search over a 100K-segment index returns results within 200 ms.

**Test Steps**:
1. Seed search index with 100,000 segments
2. Time `engine.search({ query: 'security framework' })` across 20 iterations

**Expected Result**: p50 <= 100 ms; p99 <= 200 ms.

**Code Sample**:
```typescript
it('should return keyword search results within 200ms p99 over a 100k segment index', async () => {
  await seedIndex(100000);
  const runs = await benchmark(() => engine.search({ query: 'security framework', sessionId }), { iterations: 20 });
  expect(runs.p50).toBeLessThan(100);
  expect(runs.p99).toBeLessThan(200);
});
```

---

#### TC-F7-P1.2: Semantic Search Latency — 100K Segment Index
**Objective**: Verify semantic (vector) search returns results within 500 ms over a 100K-segment index.

**Test Steps**:
1. Seed vector index with 100,000 embeddings
2. Time semantic search across 10 iterations

**Expected Result**: p95 <= 500 ms.

**Code Sample**:
```typescript
it('should return semantic search results within 500ms p95 over 100k embeddings', async () => {
  await seedVectorIndex(100000);
  const runs = await benchmark(() => engine.search({ query: 'cloud resilience', sessionId, mode: 'SEMANTIC' }), { iterations: 10 });
  expect(runs.p95).toBeLessThan(500);
});
```

---

### 4.2 Concurrent Search Load

#### TC-F7-P2.1: 100 Concurrent Search Requests
**Objective**: Verify the search API handles 100 simultaneous queries without degradation.

**Test Steps**:
1. Fire 100 concurrent `GET /sessions/{id}/search?q=governance` requests
2. Assert all return HTTP 200; collect latencies

**Expected Result**: All 100 succeed; p99 <= 300 ms.

**Code Sample**:
```typescript
it('should handle 100 concurrent search requests with p99 under 300ms', async () => {
  const latencies = await measureConcurrentGets(
    () => apiClient.get(`/sessions/${sessionId}/search?q=governance`),
    { concurrency: 100 }
  );
  expect(latencies.filter(l => l === null)).toHaveLength(0);
  expect(percentile(latencies, 99)).toBeLessThan(300);
});
```

---

#### TC-F7-P2.2: Indexing Throughput — 1,000 Segments Per Second
**Objective**: Verify the indexing pipeline can ingest 1,000 segments per second during bulk ingestion.

**Test Steps**:
1. Push 10,000 segments to the indexing queue
2. Measure time to completion

**Expected Result**: Ingestion completes in <= 10 s; throughput >= 1,000 segments/s.

**Code Sample**:
```typescript
it('should index 10,000 segments at 1,000+ segments per second', async () => {
  const segments = generateSegments(10000);
  const start = performance.now();
  await indexingPipeline.bulkIndex(segments, sessionId);
  const elapsed = (performance.now() - start) / 1000;

  expect(elapsed).toBeLessThanOrEqual(10);
  const throughput = 10000 / elapsed;
  expect(throughput).toBeGreaterThanOrEqual(1000);
});
```

---

### 4.3 Index Storage and Scaling

#### TC-F7-P3.1: Index Storage Size Per Session
**Objective**: Verify the search index for a 1-hour session (approx. 7,200 segments) does not exceed 100 MB.

**Test Steps**:
1. Index a 1-hour session
2. Query index storage size

**Expected Result**: Index size <= 100 MB.

**Code Sample**:
```typescript
it('should keep search index under 100MB for a 1-hour session', async () => {
  await indexSession(sessionId, oneHourTranscript);
  const sizeMB = await indexService.getIndexSizeMB(sessionId);
  expect(sizeMB).toBeLessThan(100);
});
```

---

#### TC-F7-P3.2: Search Remains Fast After Index Growth to 1M Segments
**Objective**: Verify search latency does not degrade when the global index grows to 1 million segments.

**Test Steps**:
1. Seed 1 million segments across 100 sessions
2. Run 20 timed keyword searches

**Expected Result**: p95 latency <= 500 ms even at 1M segments.

**Code Sample**:
```typescript
it('should maintain sub-500ms p95 keyword search latency at 1M segments', async () => {
  await seedGlobalIndex(1000000);
  const runs = await benchmark(() => engine.globalSearch({ query: 'digital transformation' }), { iterations: 20 });
  expect(runs.p95).toBeLessThan(500);
}, 120000);
```

---

## Test Execution Summary

### Test Categories
- **Unit Tests**: 3 suites, ~12 test cases
- **Integration Tests**: 3 suites, 6 test cases
- **Edge Cases**: 3 suites, 6 test cases
- **Performance Tests**: 3 suites, 6 test cases

### Total: ~30 comprehensive test cases
