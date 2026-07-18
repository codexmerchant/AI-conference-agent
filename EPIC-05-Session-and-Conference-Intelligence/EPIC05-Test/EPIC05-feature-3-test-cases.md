# EPIC05 Feature 3 — Quote Extraction — Test Cases

## Test Overview
Comprehensive test suite for Quote Extraction covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Quote Candidate Detection

#### TC-F3-U1.1: High-Impact Statement Identified as Quote
**Objective**: Verify the extractor flags a declarative, confident statement as a quote candidate with high relevance score.

**Preconditions**:
- Quote extraction NLP model loaded
- Transcript segments available with speaker attribution

**Test Steps**:
1. Provide segment: `"The future of AI is not about replacing humans — it's about amplifying human potential."`
2. Call `extractQuoteCandidates(segments)`
3. Assert the segment is in the returned candidates with `relevanceScore >= 0.85`

**Expected Result**: Candidate returned; `relevanceScore >= 0.85`; `type = 'DECLARATIVE'`.

**Code Sample**:
```typescript
describe('QuoteExtractor', () => {
  it('should identify a high-impact declarative statement as a quote candidate', async () => {
    const segments = [
      {
        speakerId: 'Speaker_1',
        text: "The future of AI is not about replacing humans — it's about amplifying human potential.",
        startMs: 124000
      }
    ];
    const extractor = new QuoteExtractor(mockNlpService);
    const candidates = await extractor.extractQuoteCandidates(segments);

    expect(candidates).toHaveLength(1);
    expect(candidates[0].relevanceScore).toBeGreaterThanOrEqual(0.85);
    expect(candidates[0].type).toBe('DECLARATIVE');
  });
});
```

---

#### TC-F3-U1.2: Filler Phrase Excluded from Quote Candidates
**Objective**: Verify that filler or transitional phrases are not returned as quote candidates.

**Test Steps**:
1. Provide segment: `"Um, yeah, so I think, you know, maybe we should uh, look at that."`
2. Call `extractQuoteCandidates(segments)`
3. Assert result is empty or the segment has `relevanceScore < 0.4`

**Expected Result**: No candidate above threshold; filler phrases filtered out.

**Code Sample**:
```typescript
it('should exclude filler utterances from quote candidates', async () => {
  const segments = [
    { speakerId: 'Speaker_0', text: "Um, yeah, so I think, you know, maybe we should uh, look at that.", startMs: 500 }
  ];
  const candidates = await extractor.extractQuoteCandidates(segments);
  const above = candidates.filter(c => c.relevanceScore >= 0.4);
  expect(above).toHaveLength(0);
});
```

---

#### TC-F3-U1.3: Statistical Claim Flagged as Data-Backed Quote
**Objective**: Verify that utterances containing statistics or numerical claims are tagged with `type = 'STATISTIC'`.

**Test Steps**:
1. Provide segment: `"Our platform reduced onboarding time by 43% in just six months."`
2. Call `extractQuoteCandidates(segments)`
3. Assert `type = 'STATISTIC'` and `relevanceScore >= 0.80`

**Expected Result**: Candidate tagged as `STATISTIC`; numeric values extracted in `dataPoints`.

**Code Sample**:
```typescript
it('should tag statistical claims with type STATISTIC and extract numeric data points', async () => {
  const segments = [
    { speakerId: 'Speaker_2', text: 'Our platform reduced onboarding time by 43% in just six months.', startMs: 780000 }
  ];
  const candidates = await extractor.extractQuoteCandidates(segments);
  expect(candidates[0].type).toBe('STATISTIC');
  expect(candidates[0].dataPoints).toContain('43%');
});
```

---

### 1.2 Attribution and Metadata Enrichment

#### TC-F3-U2.1: Quote Attributed to Resolved Speaker Name
**Objective**: Verify that after speaker identity resolution, quote attribution uses the real name instead of `Speaker_N`.

**Test Steps**:
1. Resolve `Speaker_1` → `"Dr. Sarah Chen"` in the identity store
2. Extract quotes from the same session
3. Assert all quotes from `Speaker_1` have `attributedTo: 'Dr. Sarah Chen'`

**Expected Result**: `attributedTo = 'Dr. Sarah Chen'`; no `Speaker_N` strings in final output.

**Code Sample**:
```typescript
describe('QuoteAttributionEnricher', () => {
  it('should enrich quote attribution with resolved speaker name', async () => {
    await seedIdentityResolution(sessionId, { Speaker_1: 'Dr. Sarah Chen' });
    const quotes = await quoteExtractor.extract(sessionId);
    const speakerQuotes = quotes.filter(q => q.rawSpeakerId === 'Speaker_1');
    speakerQuotes.forEach(q => expect(q.attributedTo).toBe('Dr. Sarah Chen'));
  });
});
```

---

#### TC-F3-U2.2: Timestamp and Media Link Attached to Quote
**Objective**: Verify each extracted quote has a `startMs` timestamp and a playback deep-link URL.

**Test Steps**:
1. Extract quotes from a session with known timestamps
2. For each quote, assert `startMs` is present and `deepLinkUrl` matches the expected format

**Expected Result**: All quotes have valid `startMs` and `deepLinkUrl` like `session://{id}?t={startMs}`.

**Code Sample**:
```typescript
it('should attach timestamp and deep-link URL to every extracted quote', async () => {
  const quotes = await quoteExtractor.extract(sessionId);
  quotes.forEach(q => {
    expect(q.startMs).toBeGreaterThanOrEqual(0);
    expect(q.deepLinkUrl).toMatch(new RegExp(`session://${sessionId}\\?t=\\d+`));
  });
});
```

---

#### TC-F3-U2.3: Quote Context Window Included
**Objective**: Verify each quote includes a `context` field with the preceding and following 1–2 sentences.

**Test Steps**:
1. Extract quotes from a multi-sentence segment transcript
2. Assert `context.before` and `context.after` are populated for each quote

**Expected Result**: `context.before` and `context.after` non-empty strings for all quotes with neighbors.

**Code Sample**:
```typescript
it('should include preceding and following sentences as context for each quote', async () => {
  const quotes = await quoteExtractor.extract(sessionId);
  quotes.forEach(q => {
    expect(q.context.before).toBeDefined();
    expect(q.context.after).toBeDefined();
  });
});
```

---

### 1.3 Deduplication and Ranking

#### TC-F3-U3.1: Near-Duplicate Quotes Collapsed to Single Entry
**Objective**: Verify that when the same statement is repeated verbatim (or near-verbatim), only one quote is returned.

**Test Steps**:
1. Provide two segments with identical text from the same speaker 30 s apart
2. Call `extractQuoteCandidates(segments)` and `deduplicateQuotes(candidates)`
3. Assert only one quote entry remains

**Expected Result**: Single quote retained; `occurrenceCount = 2`; earlier timestamp kept.

**Code Sample**:
```typescript
describe('QuoteDeduplicator', () => {
  it('should collapse near-duplicate quotes into a single entry with occurrence count', async () => {
    const candidates = await extractor.extractQuoteCandidates(duplicateSegments);
    const deduped = deduplicateQuotes(candidates, { similarityThreshold: 0.95 });

    expect(deduped).toHaveLength(1);
    expect(deduped[0].occurrenceCount).toBe(2);
  });
});
```

---

#### TC-F3-U3.2: Quotes Ranked by Composite Relevance Score
**Objective**: Verify quotes are returned in descending order of composite score (relevance × speaker prominence × uniqueness).

**Test Steps**:
1. Extract 10 quote candidates with varying relevance scores
2. Call `rankQuotes(candidates)`
3. Assert output is sorted in descending order of `compositeScore`

**Expected Result**: `compositeScore[0] >= compositeScore[1] >= ... >= compositeScore[9]`.

**Code Sample**:
```typescript
it('should return quotes sorted by descending composite relevance score', () => {
  const ranked = rankQuotes(tenCandidates);
  for (let i = 0; i < ranked.length - 1; i++) {
    expect(ranked[i].compositeScore).toBeGreaterThanOrEqual(ranked[i + 1].compositeScore);
  }
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Full Extraction Pipeline

#### TC-F3-I1.1: End-to-End Quote Extraction from Session Transcript
**Objective**: Verify the pipeline processes a full session transcript and returns persisted quotes via the API.

**Preconditions**:
- Session diarized and transcript available
- Speaker identities resolved

**Test Steps**:
1. Trigger `POST /sessions/{id}/quotes/extract`
2. Poll until `status = 'COMPLETE'`
3. Fetch `GET /sessions/{id}/quotes`
4. Assert response contains array of quotes with `text`, `attributedTo`, `startMs`, `relevanceScore`

**Expected Result**: At least 5 quotes returned for a 1-hour session; all required fields present.

**Code Sample**:
```typescript
it('should extract and persist quotes for a full 1-hour session', async () => {
  await apiClient.post(`/sessions/${sessionId}/quotes/extract`);
  await waitFor(
    () => apiClient.get(`/sessions/${sessionId}/quotes/status`),
    { until: r => r.data.status === 'COMPLETE', timeout: 30000 }
  );

  const res = await apiClient.get(`/sessions/${sessionId}/quotes`);
  expect(res.data.quotes.length).toBeGreaterThanOrEqual(5);
  res.data.quotes.forEach((q: any) => {
    expect(q.text).toBeDefined();
    expect(q.attributedTo).toBeDefined();
    expect(q.startMs).toBeGreaterThanOrEqual(0);
  });
});
```

---

#### TC-F3-I1.2: Quote Export to Markdown Format
**Objective**: Verify `GET /sessions/{id}/quotes/export?format=markdown` returns correctly formatted Markdown with attribution and timestamps.

**Test Steps**:
1. Seed a session with 3 known quotes
2. Call the export endpoint
3. Assert Markdown contains speaker names, quoted text in `> blockquote`, and timestamps

**Expected Result**: Valid Markdown; each quote block contains attribution line and blockquote syntax.

**Code Sample**:
```typescript
it('should export quotes as correctly formatted Markdown', async () => {
  await seedQuotes(sessionId, sampleQuotes);
  const res = await apiClient.get(`/sessions/${sessionId}/quotes/export?format=markdown`);

  expect(res.headers['content-type']).toContain('text/markdown');
  expect(res.data).toContain('> ');
  expect(res.data).toContain('— Dr. Sarah Chen');
});
```

---

### 2.2 Topic-Linked Quote Retrieval

#### TC-F3-I2.1: Quotes Filtered by Topic Tag
**Objective**: Verify that after Slide-to-Topic Linking (Feature 4) tags segments, quotes can be retrieved by topic.

**Test Steps**:
1. Extract quotes and tag segments with topic "AI Ethics"
2. Call `GET /sessions/{id}/quotes?topic=AI+Ethics`
3. Assert all returned quotes belong to segments tagged with that topic

**Expected Result**: Only quotes from AI Ethics–tagged segments returned.

**Code Sample**:
```typescript
it('should return only quotes belonging to the requested topic', async () => {
  await seedTopicTags(sessionId, { 'seg-007': 'AI Ethics' });
  const res = await apiClient.get(`/sessions/${sessionId}/quotes?topic=AI+Ethics`);
  res.data.quotes.forEach((q: any) => expect(q.topic).toBe('AI Ethics'));
});
```

---

#### TC-F3-I2.2: Quote Included in Key Insight Output
**Objective**: Verify Key Insight Extraction (Feature 6) includes top-ranked quotes as supporting evidence.

**Test Steps**:
1. Extract quotes for a session with high-scoring candidates
2. Run key insight extraction
3. Assert at least one insight has a `supportingQuote` reference

**Expected Result**: At least one insight contains `supportingQuote.text` and `supportingQuote.attributedTo`.

**Code Sample**:
```typescript
it('should include top quotes as supporting evidence in key insights', async () => {
  await quoteExtractor.extract(sessionId);
  const insights = await insightExtractor.extract(sessionId);
  const withQuotes = insights.filter(i => i.supportingQuote != null);
  expect(withQuotes.length).toBeGreaterThan(0);
  withQuotes.forEach(i => {
    expect(i.supportingQuote!.text).toBeDefined();
    expect(i.supportingQuote!.attributedTo).toBeDefined();
  });
});
```

---

### 2.3 Real-Time Extraction During Live Session

#### TC-F3-I3.1: Quote Candidate Surfaced Within 3 Seconds of Utterance
**Objective**: Verify the real-time quote detection pipeline surfaces a candidate within 3 seconds of the segment being finalized.

**Test Steps**:
1. Start a live session with streaming transcript
2. Inject a high-relevance segment via the streaming API
3. Assert a `quote.candidate` WebSocket event arrives within 3 s

**Expected Result**: Event received within 3 s; `relevanceScore >= 0.80`.

**Code Sample**:
```typescript
it('should surface quote candidate via WebSocket within 3 seconds of utterance', async () => {
  const ws = connectSessionWebSocket(sessionId);
  const eventPromise = waitForWsEvent(ws, 'quote.candidate', { timeout: 3000 });

  await streamingApi.injectSegment(sessionId, highRelevanceSegment);

  const event = await eventPromise;
  expect(event.data.relevanceScore).toBeGreaterThanOrEqual(0.80);
});
```

---

#### TC-F3-I3.2: Real-Time Candidate Confirmed and Persisted After Session End
**Objective**: Verify that candidates surfaced during a live session are finalized and persisted when the session ends.

**Test Steps**:
1. Accumulate real-time candidates during a mock live session
2. End the session
3. Fetch `GET /sessions/{id}/quotes`
4. Assert all real-time candidates with score >= threshold appear in the final list

**Expected Result**: All high-score real-time candidates present in persisted quotes.

**Code Sample**:
```typescript
it('should persist all high-confidence real-time quote candidates after session end', async () => {
  const candidates = await runMockLiveSession(sessionId, 20); // 20 segments
  await sessionService.end(sessionId);

  const persisted = await apiClient.get(`/sessions/${sessionId}/quotes`);
  const highScore = candidates.filter(c => c.relevanceScore >= 0.7);
  highScore.forEach(c => {
    const match = persisted.data.quotes.find((q: any) => q.text === c.text);
    expect(match).toBeDefined();
  });
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Short and Fragmented Utterances

#### TC-F3-E1.1: One-Word Utterances Not Extracted as Quotes
**Objective**: Verify that utterances shorter than a minimum word threshold (e.g., 8 words) are excluded.

**Test Steps**:
1. Provide segments with 1–4 word utterances
2. Call `extractQuoteCandidates(segments)`
3. Assert no candidates returned

**Expected Result**: Empty candidate array; minimum length filter enforced.

**Code Sample**:
```typescript
it('should reject utterances below the minimum word threshold', async () => {
  const shortSegments = [
    { speakerId: 'Speaker_0', text: 'Exactly.', startMs: 1000 },
    { speakerId: 'Speaker_1', text: 'Yes, I agree.', startMs: 2000 }
  ];
  const candidates = await extractor.extractQuoteCandidates(shortSegments);
  expect(candidates).toHaveLength(0);
});
```

---

#### TC-F3-E1.2: Partial Sentence at Session End Handled Gracefully
**Objective**: Verify the extractor handles a mid-sentence cutoff at the end of the recording without crashing.

**Test Steps**:
1. Provide a segment ending with incomplete text: `"The most important thing to remember is that we should always consider the"`
2. Call `extractQuoteCandidates(segments)`
3. Assert partial sentence is not extracted or is flagged `complete: false`

**Expected Result**: Partial sentence either excluded or flagged `complete: false`; no exception.

**Code Sample**:
```typescript
it('should gracefully handle incomplete sentence at end of recording', async () => {
  const segments = [
    { speakerId: 'Speaker_0', text: 'The most important thing to remember is that we should always consider the', startMs: 3590000 }
  ];
  const candidates = await extractor.extractQuoteCandidates(segments);
  if (candidates.length > 0) {
    expect(candidates[0].complete).toBe(false);
  }
});
```

---

### 3.2 Multi-Language Input

#### TC-F3-E2.1: Quote Extraction from French Transcript
**Objective**: Verify the extractor correctly identifies and attributes a high-impact quote from a French-language transcript.

**Test Steps**:
1. Provide French segment: `"L'innovation n'est pas une option, c'est une nécessité absolue pour survivre."`
2. Call `extractQuoteCandidates(segments, { language: 'fr' })`
3. Assert quote is extracted with `relevanceScore >= 0.80` and `language: 'fr'`

**Expected Result**: French quote extracted with language tag; attribution correct.

**Code Sample**:
```typescript
it('should extract high-impact quotes from French-language transcript', async () => {
  const segments = [
    { speakerId: 'Speaker_0', text: "L'innovation n'est pas une option, c'est une nécessité absolue pour survivre.", startMs: 250000 }
  ];
  const candidates = await extractor.extractQuoteCandidates(segments, { language: 'fr' });
  expect(candidates).toHaveLength(1);
  expect(candidates[0].language).toBe('fr');
  expect(candidates[0].relevanceScore).toBeGreaterThanOrEqual(0.80);
});
```

---

#### TC-F3-E2.2: Mixed-Language Session Quote Extraction
**Objective**: Verify the extractor handles a session where speakers switch between English and Spanish without misattributing quotes.

**Test Steps**:
1. Provide alternating English/Spanish segments from two speakers
2. Run extraction
3. Assert each quote has the correct `language` tag and `attributedTo` matches the right speaker

**Expected Result**: Language tags consistent with actual segment language; no cross-speaker misattribution.

**Code Sample**:
```typescript
it('should correctly tag and attribute quotes in a mixed-language session', async () => {
  const quotes = await extractor.extractQuoteCandidates(mixedLanguageFixture);
  const enQuotes = quotes.filter(q => q.language === 'en');
  const esQuotes = quotes.filter(q => q.language === 'es');
  expect(enQuotes.length).toBeGreaterThan(0);
  expect(esQuotes.length).toBeGreaterThan(0);
  quotes.forEach(q => expect(q.attributedTo).not.toBeNull());
});
```

---

### 3.3 Overlapping and Corrected Statements

#### TC-F3-E3.1: Self-Correction Prevents Earlier Version from Being Quoted
**Objective**: Verify that if a speaker immediately corrects a statement, the corrected version is quoted rather than the initial one.

**Test Steps**:
1. Provide segments: `"Revenue grew by 40%... actually, I need to correct that, it was 24%."` from Speaker_0
2. Call extraction
3. Assert `24%` version is the quote; `40%` is not present in candidates

**Expected Result**: Corrected figure quoted; uncorrected version excluded or marked `superseded: true`.

**Code Sample**:
```typescript
it('should prefer the corrected version of a self-corrected statement', async () => {
  const candidates = await extractor.extractQuoteCandidates(selfCorrectionFixture);
  const withError = candidates.find(c => c.text.includes('40%'));
  const corrected = candidates.find(c => c.text.includes('24%'));
  if (withError) {
    expect(withError.superseded).toBe(true);
  }
  expect(corrected).toBeDefined();
});
```

---

#### TC-F3-E3.2: Quote Not Extracted from Audience Questioner
**Objective**: Verify that audience questions (classified as `AUDIENCE` role by Feature 1) are excluded from quote candidates by default.

**Test Steps**:
1. Mark a segment from Speaker_3 as `role: 'AUDIENCE'`
2. Run extraction with default settings
3. Assert no candidate from Speaker_3

**Expected Result**: Audience segments excluded unless `includeAudience: true` option is set.

**Code Sample**:
```typescript
it('should exclude AUDIENCE-role speakers from default quote extraction', async () => {
  await seedPanelRole(sessionId, { Speaker_3: 'AUDIENCE' });
  const candidates = await extractor.extractQuoteCandidates(segments); // default options
  const audienceQuotes = candidates.filter(c => c.rawSpeakerId === 'Speaker_3');
  expect(audienceQuotes).toHaveLength(0);
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Extraction Speed

#### TC-F3-P1.1: Quote Extraction Latency — 1-Hour Transcript
**Objective**: Verify quote extraction for a 1-hour session completes in <= 10 s.

**Test Steps**:
1. Load a 1-hour fixture transcript
2. Time `extractQuoteCandidates(segments)` across 5 iterations

**Expected Result**: p95 <= 10 s; p50 <= 7 s.

**Code Sample**:
```typescript
it('should extract quotes from a 1-hour session in under 10 seconds p95', async () => {
  const segments = loadFixture('1hour-session.json');
  const runs = await benchmark(() => extractor.extractQuoteCandidates(segments), { iterations: 5 });
  expect(runs.p95).toBeLessThan(10000);
  expect(runs.p50).toBeLessThan(7000);
});
```

---

#### TC-F3-P1.2: Real-Time Candidate Detection Latency
**Objective**: Verify that in streaming mode, a quote candidate is detected and surfaced within 500 ms of segment finalization.

**Test Steps**:
1. Push a high-relevance segment to the streaming processor
2. Measure time from segment ingestion to `quote.candidate` event emission

**Expected Result**: Latency <= 500 ms for 19 out of 20 test pushes.

**Code Sample**:
```typescript
it('should surface real-time quote candidate within 500ms in 19/20 pushes', async () => {
  const latencies: number[] = [];
  for (let i = 0; i < 20; i++) {
    const start = performance.now();
    await streamProcessor.push(highRelevanceSegment);
    await waitForEvent('quote.candidate');
    latencies.push(performance.now() - start);
  }
  const within500 = latencies.filter(l => l <= 500).length;
  expect(within500).toBeGreaterThanOrEqual(19);
});
```

---

### 4.2 Bulk Processing

#### TC-F3-P2.1: Batch Export of 500 Quotes
**Objective**: Verify the export endpoint can return 500 quotes in a single response within 2 s.

**Test Steps**:
1. Seed 500 quotes for a session
2. Call `GET /sessions/{id}/quotes?limit=500`
3. Measure response time

**Expected Result**: Response received within 2 s; all 500 quotes present.

**Code Sample**:
```typescript
it('should return 500 quotes in a single API response within 2 seconds', async () => {
  await seedQuotes(sessionId, 500);
  const start = performance.now();
  const res = await apiClient.get(`/sessions/${sessionId}/quotes?limit=500`);
  expect(performance.now() - start).toBeLessThan(2000);
  expect(res.data.quotes).toHaveLength(500);
});
```

---

#### TC-F3-P2.2: Deduplication at Scale — 10,000 Candidates
**Objective**: Verify deduplication of 10,000 quote candidates completes within 1 s.

**Test Steps**:
1. Generate 10,000 candidates with 30% near-duplicates
2. Time `deduplicateQuotes(candidates)` call

**Expected Result**: Completes <= 1 s; output contains fewer than 7,000 unique quotes.

**Code Sample**:
```typescript
it('should deduplicate 10,000 quote candidates within 1 second', () => {
  const candidates = generateCandidatesWithDuplicates(10000, 0.3);
  const start = performance.now();
  const deduped = deduplicateQuotes(candidates, { similarityThreshold: 0.95 });
  expect(performance.now() - start).toBeLessThan(1000);
  expect(deduped.length).toBeLessThan(7000);
});
```

---

### 4.3 Memory and Throughput

#### TC-F3-P3.1: Memory Usage During Large Session Extraction
**Objective**: Verify extraction from a 4-hour session stays under 256 MB peak heap usage.

**Test Steps**:
1. Load a 4-hour session fixture
2. Monitor heap usage during extraction

**Expected Result**: Peak heap usage < 256 MB.

**Code Sample**:
```typescript
it('should stay under 256MB heap during 4-hour session quote extraction', async () => {
  const segments = loadFixture('4hour-session.json');
  const baseline = process.memoryUsage().heapUsed;
  await extractor.extractQuoteCandidates(segments);
  const peak = process.memoryUsage().heapUsed;
  expect((peak - baseline) / 1048576).toBeLessThan(256);
});
```

---

#### TC-F3-P3.2: Concurrent Extraction for 15 Sessions
**Objective**: Verify 15 simultaneous quote extraction jobs complete without failure.

**Test Steps**:
1. Seed 15 sessions with 1-hour transcripts
2. Fire 15 concurrent extraction requests
3. Assert all succeed within 60 s

**Expected Result**: All 15 extractions succeed; no timeout.

**Code Sample**:
```typescript
it('should handle 15 concurrent quote extraction jobs without failure', async () => {
  const ids = await seedMultipleSessions(15);
  const results = await Promise.allSettled(ids.map(id => extractor.extract(id)));
  results.forEach(r => expect(r.status).toBe('fulfilled'));
}, 60000);
```

---

## Test Execution Summary

### Test Categories
- **Unit Tests**: 3 suites, ~12 test cases
- **Integration Tests**: 3 suites, 6 test cases
- **Edge Cases**: 3 suites, 6 test cases
- **Performance Tests**: 3 suites, 6 test cases

### Total: ~30 comprehensive test cases
