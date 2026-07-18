# EPIC02 Feature 7 — Media Indexing — Test Cases

## Test Overview
Comprehensive test suite for Media Indexing covering unit tests, integration tests, edge cases, and performance validation. This feature indexes all media artifacts (transcripts, slide OCR text, speaker identities, timestamps, audio segments) into a searchable index, enabling full-text and semantic search across conference sessions.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Index Document Construction

#### TC-F7-U1.1: Transcript Segment Converted to Index Document
**Objective**: Verify that a transcript segment object is correctly serialized into an index document with all required fields.

**Preconditions**:
- `MediaIndexer` initialized
- Sample `TranscriptSegment` object available

**Test Steps**:
1. Call `indexer.buildDocument(transcriptSegment)`
2. Assert returned document has fields: `id`, `type`, `sessionId`, `text`, `speakerId`, `startMs`, `endMs`, `confidence`, `language`
3. Assert `type === 'transcript'`
4. Assert no null or undefined values among required fields

**Expected Result**: Index document with all 9 required fields populated; `type === 'transcript'`.

**Code Sample**:
```typescript
describe('MediaIndexer', () => {
  it('should build a complete index document from a transcript segment', () => {
    const indexer = new MediaIndexer(mockSearchClient);
    const segment: TranscriptSegment = {
      id: 'seg-001', sessionId: 'sess-001', text: 'Hello world',
      speakerId: 'SPK-0001', startMs: 1000, endMs: 3000,
      confidence: 0.92, language: 'en'
    };

    const doc = indexer.buildDocument(segment);

    expect(doc.id).toBe('seg-001');
    expect(doc.type).toBe('transcript');
    expect(doc.text).toBe('Hello world');
    expect(doc.speakerId).toBe('SPK-0001');
    expect(doc.confidence).toBe(0.92);
    Object.values(doc).forEach(v => expect(v).not.toBeUndefined());
  });
});
```

---

#### TC-F7-U1.2: Slide OCR Document Construction with Bounding Box Metadata
**Objective**: Verify that a slide OCR result is serialized into an index document including the slide image URL, detected language, and OCR text.

**Test Steps**:
1. Call `indexer.buildDocument(ocrResult)` where `ocrResult` is an `OcrResult` with 3 text blocks
2. Assert `type === 'slide'`
3. Assert `fullText` contains all 3 block texts joined
4. Assert `imageUrl`, `slideId`, `confidence`, `language` all present

**Expected Result**: Slide index document with merged OCR text and all required metadata.

**Code Sample**:
```typescript
it('should build an index document from an OCR result', () => {
  const ocrResult: OcrResult = {
    slideId: 'slide-123', sessionId: 'sess-001',
    blocks: [
      { text: 'Revenue Growth', confidence: 0.95, language: 'en', bbox: { x: 0, y: 0, width: 0.5, height: 0.1 } },
      { text: 'Q1 Results', confidence: 0.93, language: 'en', bbox: { x: 0, y: 0.2, width: 0.5, height: 0.1 } },
      { text: '47% YoY', confidence: 0.97, language: 'en', bbox: { x: 0, y: 0.4, width: 0.5, height: 0.1 } }
    ],
    imageUrl: 'https://cdn.example.com/slides/slide-123.png',
    detectedLanguage: 'en'
  };

  const doc = indexer.buildDocument(ocrResult);

  expect(doc.type).toBe('slide');
  expect(doc.fullText).toContain('Revenue Growth');
  expect(doc.fullText).toContain('47% YoY');
  expect(doc.imageUrl).toBeTruthy();
  expect(doc.language).toBe('en');
});
```

---

#### TC-F7-U1.3: Speaker Profile Document Construction
**Objective**: Verify a speaker profile (with name, voice embedding reference, session count) is correctly built into an index document.

**Test Steps**:
1. Build index document from `SpeakerProfile` with `speakerId`, `displayName`, `totalSessions`, `totalSpeakingTimeMs`
2. Assert `type === 'speaker'`
3. Assert `displayName` and `totalSessions` present

**Expected Result**: Speaker document with correct type and metadata fields.

**Code Sample**:
```typescript
it('should build a speaker index document from a speaker profile', () => {
  const profile: SpeakerProfile = {
    speakerId: 'SPK-0001', displayName: 'Dr. Jane Smith',
    totalSessions: 3, totalSpeakingTimeMs: 12600000
  };

  const doc = indexer.buildDocument(profile);

  expect(doc.type).toBe('speaker');
  expect(doc.displayName).toBe('Dr. Jane Smith');
  expect(doc.totalSessions).toBe(3);
});
```

---

### 1.2 Query Processing

#### TC-F7-U2.1: Full-Text Query Tokenization and Stop-Word Removal
**Objective**: Verify the query parser correctly tokenizes a natural language query and removes stop words before passing to the search engine.

**Test Steps**:
1. Call `queryParser.parse("What are the key metrics for revenue growth?")`
2. Assert stop words removed: "What", "are", "the", "for"
3. Assert remaining tokens: `['key', 'metrics', 'revenue', 'growth']`

**Expected Result**: Query tokens = `['key', 'metrics', 'revenue', 'growth']`; stop words absent.

**Code Sample**:
```typescript
describe('QueryParser', () => {
  it('should tokenize and remove stop words', () => {
    const parser = new QueryParser({ language: 'en' });
    const tokens = parser.parse('What are the key metrics for revenue growth?');

    expect(tokens).toContain('revenue');
    expect(tokens).toContain('growth');
    expect(tokens).not.toContain('What');
    expect(tokens).not.toContain('the');
    expect(tokens).not.toContain('for');
  });
});
```

---

#### TC-F7-U2.2: Boolean Filter Application to Query
**Objective**: Verify boolean filters (`sessionId`, `speakerId`, `type`, `language`) are correctly translated to search engine filter clauses.

**Test Steps**:
1. Build query: `{ text: 'revenue', filters: { sessionId: 'sess-001', type: 'transcript', language: 'en' } }`
2. Call `queryParser.buildSearchRequest(query)`
3. Assert resulting filter clauses include `term` filters for each specified field

**Expected Result**: Search request contains `term` filters for `sessionId`, `type`, and `language`.

**Code Sample**:
```typescript
it('should build boolean filter clauses from query filters', () => {
  const query = { text: 'revenue', filters: { sessionId: 'sess-001', type: 'transcript', language: 'en' } };
  const request = queryParser.buildSearchRequest(query);

  expect(request.filters).toContainEqual({ term: { sessionId: 'sess-001' } });
  expect(request.filters).toContainEqual({ term: { type: 'transcript' } });
  expect(request.filters).toContainEqual({ term: { language: 'en' } });
});
```

---

#### TC-F7-U2.3: Semantic Embedding Query Generation
**Objective**: Verify the query processor generates a semantic embedding vector for natural language queries and includes it in the search request for vector similarity search.

**Test Steps**:
1. Call `queryProcessor.buildSemanticQuery('revenue growth strategy')`
2. Assert returned request includes `embedding` field of length 768 (BERT-style)
3. Assert `embedding` is a `Float32Array` with L2 norm ~1.0

**Expected Result**: Semantic query contains 768-dim unit-normalized embedding vector.

**Code Sample**:
```typescript
it('should generate a semantic embedding for natural language queries', async () => {
  const processor = new QueryProcessor(mockEmbeddingModel);
  const request = await processor.buildSemanticQuery('revenue growth strategy');

  expect(request.embedding).toBeInstanceOf(Float32Array);
  expect(request.embedding.length).toBe(768);
  const norm = Math.sqrt(request.embedding.reduce((s, v) => s + v * v, 0));
  expect(norm).toBeCloseTo(1.0, 2);
});
```

---

### 1.3 Result Ranking and Scoring

#### TC-F7-U3.1: BM25 Score Order Matches Relevance
**Objective**: Verify that search results are returned in descending BM25 score order (most relevant first).

**Test Steps**:
1. Index 5 documents with varying keyword frequency for the term "machine learning"
2. Query for "machine learning"
3. Assert results sorted by `score` descending
4. Assert document with highest term frequency ranks first

**Expected Result**: Results in descending score order; most-matching document ranked #1.

**Code Sample**:
```typescript
describe('ResultRanking', () => {
  it('should return results in descending relevance score order', async () => {
    const results = await indexer.search({ text: 'machine learning' });

    for (let i = 1; i < results.length; i++) {
      expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
    }
    expect(results[0].score).toBeGreaterThan(results[results.length - 1].score);
  });
});
```

---

#### TC-F7-U3.2: Confidence Score Boost Applied to High-Confidence Transcripts
**Objective**: Verify that transcript segments with confidence >= 0.95 receive a score boost, ranking them above lower-confidence segments with identical text matches.

**Test Steps**:
1. Index two identical segments: one with `confidence: 0.95` and one with `confidence: 0.60`
2. Query for their text
3. Assert high-confidence segment ranks higher

**Expected Result**: High-confidence segment (0.95) ranked above low-confidence segment (0.60) for identical text.

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Pipeline Indexing

#### TC-F7-I1.1: Transcript Segments Auto-Indexed After Transcription Completes
**Objective**: Verify that when transcription completes for a session, all transcript segments are automatically indexed within 10 seconds.

**Preconditions**:
- Indexing service subscribed to `transcription.completed` events
- Elasticsearch running

**Test Steps**:
1. Trigger transcription completion event for `sess-idx-01` with 20 segments
2. Wait up to 10 seconds
3. Query search index for session ID
4. Assert 20 documents indexed

**Expected Result**: 20 transcript documents indexed within 10 seconds of event.

**Code Sample**:
```typescript
it('should auto-index transcript segments within 10 seconds of completion', async () => {
  await eventBus.emit('transcription.completed', { sessionId: 'sess-idx-01', segmentCount: 20 });

  await waitFor(async () => {
    const count = await searchClient.count({ index: 'media', term: { sessionId: 'sess-idx-01' } });
    expect(count).toBe(20);
  }, { timeout: 10000, interval: 500 });
}, 15000);
```

---

#### TC-F7-I1.2: Slide OCR Documents Indexed After OCR Completes
**Objective**: Verify OCR results for a session's slides are indexed and searchable within 10 seconds of OCR completion.

**Test Steps**:
1. Emit `ocr.completed` event for a session with 5 slides
2. Wait up to 10 seconds
3. Query index for OCR text known to be on slide 3
4. Assert hit returns slide 3's `slideId`

**Expected Result**: OCR text searchable within 10 seconds; correct `slideId` returned.

---

### 2.2 Search API Integration

#### TC-F7-I2.1: Full-Text Search Across Mixed Document Types Returns Ranked Results
**Objective**: Verify the search API returns a mixed result set (transcripts, slides, speakers) ordered by relevance when querying across all types.

**Test Steps**:
1. Index transcript segments, slides, and speaker profiles containing "product roadmap"
2. GET `/search?q=product+roadmap&sessionId=sess-001`
3. Assert response has `results` array with items of multiple `type` values
4. Assert overall ranking by `score` descending

**Expected Result**: Mixed `type` results returned; sorted by score; all types represented.

---

#### TC-F7-I2.2: Faceted Search — Filter by Speaker and Time Range
**Objective**: Verify the search API correctly applies compound filters for speaker ID and time range.

**Test Steps**:
1. GET `/search?q=strategy&speakerId=SPK-0001&startMs=300000&endMs=600000`
2. Assert all results have `speakerId === 'SPK-0001'`
3. Assert all results have `startMs >= 300000` and `endMs <= 600000`

**Expected Result**: Only results from SPK-0001 within the specified time window returned.

**Code Sample**:
```typescript
it('should filter search results by speaker and time range', async () => {
  const results = await searchApi.query({
    text: 'strategy',
    filters: { speakerId: 'SPK-0001', startMs: 300000, endMs: 600000 }
  });

  results.forEach(r => {
    expect(r.speakerId).toBe('SPK-0001');
    expect(r.startMs).toBeGreaterThanOrEqual(300000);
    expect(r.endMs).toBeLessThanOrEqual(600000);
  });
});
```

---

### 2.3 Index Maintenance

#### TC-F7-I3.1: Re-Indexing After Transcript Correction
**Objective**: Verify that when a transcript segment is corrected (manual edit), the index document is updated and the old version is no longer searchable.

**Test Steps**:
1. Index segment with text "reveue growth" (typo)
2. Update segment text to "revenue growth"
3. Trigger re-index event
4. Assert search for "reveue" (old typo) returns 0 hits
5. Assert search for "revenue" returns the updated segment

**Expected Result**: Old misspelling no longer searchable; corrected text indexed and findable.

---

#### TC-F7-I3.2: Session Deletion Purges All Associated Index Documents
**Objective**: Verify that deleting a session triggers a cascade deletion of all indexed documents for that session.

**Test Steps**:
1. Index 50 documents for `sess-del-01`
2. Call `DELETE /sessions/sess-del-01`
3. Query index for `sessionId: 'sess-del-01'`
4. Assert 0 documents found

**Expected Result**: All 50 documents for the deleted session removed from index.

---

## 3. EDGE CASE VALIDATION

### 3.1 Special Query Patterns

#### TC-F7-E1.1: Fuzzy Search Matches Misspelled Query Terms
**Objective**: Verify fuzzy search matches documents containing "machine learning" when user queries "machne lerning" (typos).

**Test Steps**:
1. Index a document containing "machine learning applications"
2. Search with `{ text: 'machne lerning', fuzzy: true }`
3. Assert document is returned in results

**Expected Result**: Fuzzy match returns the document despite 2-character query errors.

**Code Sample**:
```typescript
it('should match documents via fuzzy search despite typos', async () => {
  await indexer.index(buildDocument({ text: 'machine learning applications', id: 'doc-ml' }));

  const results = await indexer.search({ text: 'machne lerning', fuzzy: true });
  expect(results.some(r => r.id === 'doc-ml')).toBe(true);
});
```

---

#### TC-F7-E1.2: Empty Query Returns Zero Results (No All-Match Behavior)
**Objective**: Verify an empty query string returns 0 results rather than all documents in the index.

**Test Steps**:
1. Call `indexer.search({ text: '' })`
2. Assert `results` array is empty

**Expected Result**: 0 results returned for empty query.

---

### 3.2 Index Corruption and Recovery

#### TC-F7-E2.1: Partial Index Failure — Remaining Documents Still Indexed
**Objective**: Verify that if 2 of 20 documents fail to index (simulated with mock throwing on those IDs), the remaining 18 are successfully indexed.

**Test Steps**:
1. Configure mock to fail on documents with IDs `doc-05` and `doc-10`
2. Submit batch of 20 documents
3. Assert `result.indexed === 18` and `result.failed === 2`
4. Assert 18 documents searchable in index

**Expected Result**: 18 documents indexed; 2 failures reported; no complete abort.

**Code Sample**:
```typescript
it('should index remaining documents despite partial failures', async () => {
  mockSearchClient.failOnIds(['doc-05', 'doc-10']);
  const docs = Array.from({ length: 20 }, (_, i) => buildDoc(`doc-${String(i + 1).padStart(2, '0')}`));

  const result = await indexer.batchIndex(docs);

  expect(result.indexed).toBe(18);
  expect(result.failed).toBe(2);
  expect(result.failedIds).toEqual(['doc-05', 'doc-10']);
});
```

---

#### TC-F7-E2.2: Duplicate Document ID Update (Upsert Semantics)
**Objective**: Verify that indexing a document with an existing ID updates the document rather than creating a duplicate.

**Test Steps**:
1. Index document with `id: 'doc-001'` and `text: 'original text'`
2. Index another document with same `id: 'doc-001'` and `text: 'updated text'`
3. Search for "updated text"
4. Assert exactly 1 result with `text: 'updated text'`

**Expected Result**: Upsert semantics; no duplicate; only updated version searchable.

---

### 3.3 Volume and Scale

#### TC-F7-E3.1: Index Contains 1 Million Documents — Search Still Fast
**Objective**: Verify search remains performant (< 500ms) when the index contains 1 million documents.

**Test Steps**:
1. Populate index with 1M mock documents
2. Run 50 search queries
3. Assert P95 query latency < 500ms

**Expected Result**: P95 search latency < 500ms at 1M document scale.

**Code Sample**:
```typescript
it('should maintain P95 < 500ms query latency at 1M documents', async () => {
  await populateIndex(1_000_000);

  const latencies: number[] = [];
  for (const query of benchmarkQueries) {
    const start = performance.now();
    await indexer.search(query);
    latencies.push(performance.now() - start);
  }

  latencies.sort((a, b) => a - b);
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  expect(p95).toBeLessThan(500);
}, 600000);
```

---

#### TC-F7-E3.2: Unicode and CJK Character Search
**Objective**: Verify the indexer correctly indexes and searches Japanese (CJK) text from transcripts.

**Test Steps**:
1. Index a document with Japanese text: `'製品ロードマップについて'` (product roadmap)
2. Search for `'製品'` (product)
3. Assert the document is returned

**Expected Result**: CJK text correctly indexed and searchable by partial CJK query.

---

## 4. PERFORMANCE VALIDATION

### 4.1 Indexing Throughput

#### TC-F7-P1.1: Batch Indexing Throughput — 10,000 Documents per Minute
**Objective**: Verify the indexing service can process and commit 10,000 documents per minute in batch mode.

**Test Steps**:
1. Submit 10,000 documents to batch indexer
2. Measure time to completion
3. Assert all committed within 60 seconds

**Expected Result**: 10,000 documents indexed in < 60 seconds; throughput >= 167 docs/sec.

**Code Sample**:
```typescript
it('should index 10,000 documents within 60 seconds', async () => {
  const docs = Array.from({ length: 10_000 }, (_, i) => buildMockDocument(i));
  const start = performance.now();

  await indexer.batchIndex(docs, { batchSize: 500 });

  const elapsed = performance.now() - start;
  expect(elapsed).toBeLessThan(60_000);

  const count = await searchClient.count({ index: 'media' });
  expect(count).toBe(10_000);
}, 120000);
```

---

#### TC-F7-P1.2: Real-Time Indexing Latency < 2 Seconds (Single Document)
**Objective**: Verify a single document is indexed and searchable within 2 seconds of the indexing call.

**Test Steps**:
1. Index 1 document
2. Immediately poll search until document appears or timeout
3. Assert document searchable within 2 seconds

**Expected Result**: Single document searchable within 2 seconds of indexing call.

---

### 4.2 Query Performance

#### TC-F7-P2.1: P95 Full-Text Search Latency < 200ms
**Objective**: Verify full-text search queries against 500,000 indexed documents respond within 200ms at P95.

**Test Steps**:
1. Populate index with 500,000 documents
2. Run 100 representative full-text queries
3. Assert P95 latency < 200ms

**Expected Result**: P95 full-text search latency < 200ms.

**Code Sample**:
```typescript
it('should achieve P95 < 200ms for full-text queries', async () => {
  await populateIndex(500_000);
  const latencies: number[] = [];

  for (const q of representativeQueries) {
    const start = performance.now();
    await indexer.search(q);
    latencies.push(performance.now() - start);
  }

  latencies.sort((a, b) => a - b);
  expect(latencies[Math.floor(latencies.length * 0.95)]).toBeLessThan(200);
}, 300000);
```

---

#### TC-F7-P2.2: Semantic Vector Search Latency < 500ms at P95
**Objective**: Verify vector similarity search (ANN) completes within 500ms at P95 against a 500,000-document index.

**Test Steps**:
1. Populate vector index with 500,000 embeddings
2. Run 50 vector queries
3. Assert P95 latency < 500ms

**Expected Result**: P95 ANN query latency < 500ms.

---

### 4.3 Resource Efficiency

#### TC-F7-P3.1: Index Storage Efficiency — Compression Ratio > 2:1
**Objective**: Verify Elasticsearch index uses compression achieving a storage ratio > 2:1 relative to raw document size.

**Test Steps**:
1. Index 10,000 documents with known raw byte size
2. Query Elasticsearch `_stats` for `store.size_in_bytes`
3. Assert raw size / index size > 2.0

**Expected Result**: Index compression ratio > 2:1.

---

#### TC-F7-P3.2: Memory Usage of Indexing Worker < 1GB under 1000 rps
**Objective**: Verify the indexing worker process stays within 1GB RSS memory when processing 1000 indexing requests per second.

**Test Steps**:
1. Run indexing at 1000 docs/second for 60 seconds
2. Sample process RSS every 5 seconds
3. Assert peak RSS < 1024 MB

**Expected Result**: Peak RSS < 1GB throughout 60-second sustained load.

---

## Test Execution Summary

### Test Categories
- **Unit Tests**: 3 suites, 9 test cases
- **Integration Tests**: 3 suites, 6 test cases
- **Edge Cases**: 3 suites, 6 test cases
- **Performance Tests**: 3 suites, 6 test cases

### Total: 27 comprehensive test cases

### Key Performance Targets
| Metric | Target |
|---|---|
| Batch indexing throughput | 10,000 docs/minute |
| Full-text query latency (P95) | < 200ms |
| Vector search latency (P95) | < 500ms |
| Real-time index lag | < 2 seconds |
