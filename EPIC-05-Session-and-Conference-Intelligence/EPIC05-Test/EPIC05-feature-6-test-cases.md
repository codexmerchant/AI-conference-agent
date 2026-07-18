# EPIC05 Feature 6 — Key Insight Extraction — Test Cases

## Test Overview
Comprehensive test suite for Key Insight Extraction covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Insight Classification

#### TC-F6-U1.1: Novel Claim Classified as KEY_FINDING
**Objective**: Verify that a speaker's novel declarative assertion is classified with type `KEY_FINDING`.

**Preconditions**:
- Insight classifier model loaded
- Transcript segment with no hedging language available

**Test Steps**:
1. Provide segment: `"Our internal research shows transformer-based models outperform rule-based systems by 3x on this benchmark."`
2. Call `classifyInsight(segment)`
3. Assert `type = 'KEY_FINDING'`; `confidence >= 0.85`

**Expected Result**: `KEY_FINDING` type assigned; confidence above threshold.

**Code Sample**:
```typescript
describe('InsightClassifier', () => {
  it('should classify a research-backed declarative claim as KEY_FINDING', async () => {
    const classifier = new InsightClassifier(mockNlpService);
    const segment = {
      speakerId: 'Speaker_1',
      text: 'Our internal research shows transformer-based models outperform rule-based systems by 3x on this benchmark.',
      startMs: 220000
    };
    const result = await classifier.classifyInsight(segment);

    expect(result.type).toBe('KEY_FINDING');
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
  });
});
```

---

#### TC-F6-U1.2: Recommendation Classified as ACTIONABLE_INSIGHT
**Objective**: Verify that a segment containing "you should", "teams must", or "I recommend" is classified as `ACTIONABLE_INSIGHT`.

**Test Steps**:
1. Provide segment: `"I recommend every engineering team adopt continuous red-teaming as a default practice."`
2. Call `classifyInsight(segment)`
3. Assert `type = 'ACTIONABLE_INSIGHT'`

**Expected Result**: `ACTIONABLE_INSIGHT` assigned; `actionTarget` field identifies "engineering team".

**Code Sample**:
```typescript
it('should classify a recommendation statement as ACTIONABLE_INSIGHT', async () => {
  const segment = {
    speakerId: 'Speaker_0',
    text: 'I recommend every engineering team adopt continuous red-teaming as a default practice.',
    startMs: 455000
  };
  const result = await classifier.classifyInsight(segment);
  expect(result.type).toBe('ACTIONABLE_INSIGHT');
  expect(result.actionTarget).toContain('engineering team');
});
```

---

#### TC-F6-U1.3: Trend Prediction Classified as FORWARD_LOOKING
**Objective**: Verify future-tense predictions about industry trends are classified as `FORWARD_LOOKING`.

**Test Steps**:
1. Provide segment: `"Within five years, every enterprise will have an AI-generated audit trail for compliance."`
2. Call `classifyInsight(segment)`
3. Assert `type = 'FORWARD_LOOKING'`; `timeHorizon` extracted as "five years"

**Expected Result**: `FORWARD_LOOKING` type; `timeHorizon = 'five years'`.

**Code Sample**:
```typescript
it('should classify future-tense trend predictions as FORWARD_LOOKING', async () => {
  const segment = {
    speakerId: 'Speaker_2',
    text: 'Within five years, every enterprise will have an AI-generated audit trail for compliance.',
    startMs: 678000
  };
  const result = await classifier.classifyInsight(segment);
  expect(result.type).toBe('FORWARD_LOOKING');
  expect(result.timeHorizon).toBe('five years');
});
```

---

### 1.2 Relevance Scoring and Ranking

#### TC-F6-U2.1: Insight Relevance Score Incorporates Speaker Prominence
**Objective**: Verify that the same text scores higher when attributed to the moderator or a primary panelist vs. an audience member.

**Test Steps**:
1. Score the same insight text attributed to Speaker_0 (moderator) and Speaker_3 (audience)
2. Compare scores
3. Assert moderator score > audience score

**Expected Result**: Moderator attribution yields higher relevance score due to speaker prominence weighting.

**Code Sample**:
```typescript
describe('InsightScorer', () => {
  it('should score the same insight higher when attributed to a primary speaker', async () => {
    const moderatorScore = await scorer.scoreInsight({ ...insightBase, speakerId: 'Speaker_0', role: 'MODERATOR' });
    const audienceScore = await scorer.scoreInsight({ ...insightBase, speakerId: 'Speaker_3', role: 'AUDIENCE' });
    expect(moderatorScore.relevanceScore).toBeGreaterThan(audienceScore.relevanceScore);
  });
});
```

---

#### TC-F6-U2.2: Uniqueness Penalty Applied to Repeated Insights
**Objective**: Verify that if the same insight concept appears 3 times in a session, only the first occurrence scores at full weight.

**Test Steps**:
1. Classify three semantically identical insights at different timestamps
2. Apply uniqueness scoring
3. Assert first occurrence has highest score; subsequent occurrences penalized

**Expected Result**: `scores[0] > scores[1] >= scores[2]`.

**Code Sample**:
```typescript
it('should apply uniqueness penalty to repeated insight concepts', async () => {
  const insights = await Promise.all(threeRepeatSegments.map(s => classifier.classifyInsight(s)));
  const ranked = scorer.applyUniquenessWeighting(insights);
  expect(ranked[0].compositeScore).toBeGreaterThan(ranked[1].compositeScore);
  expect(ranked[1].compositeScore).toBeGreaterThanOrEqual(ranked[2].compositeScore);
});
```

---

#### TC-F6-U2.3: Top-N Insights Selected by Composite Score
**Objective**: Verify `selectTopInsights(insights, { topN: 5 })` returns exactly 5 insights in descending score order.

**Test Steps**:
1. Generate 20 scored insights with varying composite scores
2. Call `selectTopInsights(insights, { topN: 5 })`
3. Assert exactly 5 returned in descending order

**Expected Result**: 5 insights; sorted correctly; lowest score in result >= all excluded scores.

**Code Sample**:
```typescript
it('should return top 5 insights sorted by composite score', () => {
  const top5 = selectTopInsights(twentyInsights, { topN: 5 });
  expect(top5).toHaveLength(5);
  for (let i = 0; i < top5.length - 1; i++) {
    expect(top5[i].compositeScore).toBeGreaterThanOrEqual(top5[i + 1].compositeScore);
  }
});
```

---

### 1.3 Evidence Linking

#### TC-F6-U3.1: Supporting Quote Linked to Insight
**Objective**: Verify each extracted insight has a reference to the highest-scoring quote supporting it.

**Test Steps**:
1. Extract insights from a session that also has quotes extracted
2. Call `linkEvidenceToInsights(insights, quotes)`
3. Assert each insight with score >= 0.8 has a `supportingQuote`

**Expected Result**: High-score insights include `supportingQuote.text` and `supportingQuote.startMs`.

**Code Sample**:
```typescript
describe('InsightEvidenceLinker', () => {
  it('should link a supporting quote to each high-score insight', async () => {
    const insights = await insightExtractor.extract(sessionId);
    const quotes = await quoteExtractor.extract(sessionId);
    const linked = linkEvidenceToInsights(insights, quotes);

    linked.filter(i => i.compositeScore >= 0.8).forEach(i => {
      expect(i.supportingQuote).toBeDefined();
      expect(i.supportingQuote!.text).toBeDefined();
    });
  });
});
```

---

#### TC-F6-U3.2: Slide Reference Linked to Insight When Available
**Objective**: Verify that when a slide link exists for the segment containing an insight, the insight includes a `relatedSlide` reference.

**Test Steps**:
1. Seed a slide link for `seg-044` (topicLabel = "Zero Trust Architecture")
2. Extract insight from `seg-044`
3. Assert insight has `relatedSlide.slideId` and `relatedSlide.topicLabel`

**Expected Result**: `relatedSlide` populated; `topicLabel = 'Zero Trust Architecture'`.

**Code Sample**:
```typescript
it('should attach a related slide reference to insights from slide-linked segments', async () => {
  await seedSlideLink(sessionId, { segmentId: 'seg-044', slideId: 'slide-7', topicLabel: 'Zero Trust Architecture' });
  const insights = await insightExtractor.extract(sessionId);
  const insight = insights.find(i => i.segmentId === 'seg-044');
  expect(insight!.relatedSlide!.slideId).toBe('slide-7');
  expect(insight!.relatedSlide!.topicLabel).toBe('Zero Trust Architecture');
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Full Insight Extraction Pipeline

#### TC-F6-I1.1: End-to-End Insight Extraction via API
**Objective**: Verify `POST /sessions/{id}/insights/extract` produces persisted, ranked insights accessible via GET.

**Preconditions**:
- Session transcribed; panel analysis and quotes optionally available

**Test Steps**:
1. POST to `/sessions/{sessionId}/insights/extract`
2. Poll status until `COMPLETE`
3. GET `/sessions/{sessionId}/insights`
4. Assert at least 3 insights returned with required fields

**Expected Result**: >= 3 insights; each has `type`, `text`, `compositeScore`, `attributedTo`, `startMs`.

**Code Sample**:
```typescript
it('should extract and persist ranked insights via the API', async () => {
  await apiClient.post(`/sessions/${sessionId}/insights/extract`);
  await waitFor(
    () => apiClient.get(`/sessions/${sessionId}/insights/status`),
    { until: r => r.data.status === 'COMPLETE', timeout: 30000 }
  );

  const res = await apiClient.get(`/sessions/${sessionId}/insights`);
  expect(res.data.insights.length).toBeGreaterThanOrEqual(3);
  res.data.insights.forEach((i: any) => {
    expect(i.type).toBeDefined();
    expect(i.compositeScore).toBeGreaterThan(0);
    expect(i.attributedTo).toBeDefined();
  });
});
```

---

#### TC-F6-I1.2: Insights Included in Session Summary Output
**Objective**: Verify that Session Summarization (Feature 5) embeds top insights in its output.

**Test Steps**:
1. Extract insights for a session
2. Generate session summary
3. Assert `summary.keyInsights` is an array of at least 3 entries from the insight extraction output

**Expected Result**: `keyInsights` in summary matches top-ranked insights from extraction.

**Code Sample**:
```typescript
it('should embed top key insights from extraction into the session summary', async () => {
  await insightExtractor.extract(sessionId);
  const summary = await summaryService.generateAndSave(sessionId, transcript, { mode: 'DETAILED' });

  expect(summary.keyInsights).toBeDefined();
  expect(summary.keyInsights!.length).toBeGreaterThanOrEqual(3);
});
```

---

### 2.2 Cross-Session Insight Aggregation

#### TC-F6-I2.1: Repeated Insight Across Sessions Flagged as TRENDING
**Objective**: Verify that an insight concept appearing in 3+ sessions within a conference is tagged as `TRENDING`.

**Test Steps**:
1. Seed the same insight concept extracted from 3 different sessions at the same conference
2. Run cross-session aggregation
3. Assert the concept is tagged `trending: true`

**Expected Result**: `trending = true`; `sessionsCount >= 3`.

**Code Sample**:
```typescript
it('should flag an insight as TRENDING when it appears in 3+ sessions at the same conference', async () => {
  await seedInsightAcrossSessions(conferenceId, 'Zero Trust is the new perimeter', 3);
  const trending = await insightAggregator.findTrending(conferenceId);
  const found = trending.find(t => t.text.toLowerCase().includes('zero trust'));
  expect(found).toBeDefined();
  expect(found!.trending).toBe(true);
  expect(found!.sessionsCount).toBeGreaterThanOrEqual(3);
});
```

---

#### TC-F6-I2.2: Contradicting Insights from Different Speakers Flagged
**Objective**: Verify that when two speakers express semantically opposite views on the same topic in the same session, both insights are flagged with `contradiction: true`.

**Test Steps**:
1. Seed two insights with opposing sentiment vectors on the same topic
2. Run contradiction detection
3. Assert both insights have `contradiction: true` and reference each other

**Expected Result**: Both insights flagged; `contradictedBy` field points to the other insight's ID.

**Code Sample**:
```typescript
it('should flag contradicting insights from different speakers', async () => {
  const [i1, i2] = await seedContradictingInsights(sessionId);
  await insightAnalyzer.detectContradictions(sessionId);

  const updated1 = await insightRepo.findById(i1.id);
  const updated2 = await insightRepo.findById(i2.id);

  expect(updated1!.contradiction).toBe(true);
  expect(updated1!.contradictedBy).toBe(i2.id);
  expect(updated2!.contradiction).toBe(true);
});
```

---

### 2.3 User Feedback Loop

#### TC-F6-I3.1: User Dismissal of Insight Lowers Score and Removes from Default View
**Objective**: Verify that a user dismissing an insight persists that preference and hides it from the default `GET /sessions/{id}/insights` response.

**Test Steps**:
1. Fetch insights (insight-007 visible)
2. POST `/sessions/{id}/insights/insight-007/dismiss`
3. Fetch insights again (default view)
4. Assert insight-007 no longer present in default list

**Expected Result**: Dismissed insight excluded from default view; accessible with `?includeDismissed=true`.

**Code Sample**:
```typescript
it('should hide a dismissed insight from the default insights view', async () => {
  await seedInsights(sessionId);
  await apiClient.post(`/sessions/${sessionId}/insights/insight-007/dismiss`);

  const defaults = await apiClient.get(`/sessions/${sessionId}/insights`);
  const dismissed = await apiClient.get(`/sessions/${sessionId}/insights?includeDismissed=true`);

  expect(defaults.data.insights.find((i: any) => i.id === 'insight-007')).toBeUndefined();
  expect(dismissed.data.insights.find((i: any) => i.id === 'insight-007')).toBeDefined();
});
```

---

#### TC-F6-I3.2: User Upvote Boosts Composite Score and Promotes Insight
**Objective**: Verify that upvoting an insight increases its `compositeScore` and bubbles it higher in ranked output.

**Test Steps**:
1. Seed insights where insight-003 has score 0.65 (rank 5 initially)
2. Upvote insight-003
3. Fetch ranked insights
4. Assert insight-003 rank improved

**Expected Result**: insight-003 rank <= 3 after upvote; `userBoostApplied: true`.

**Code Sample**:
```typescript
it('should promote an insight after user upvote', async () => {
  await seedRankedInsights(sessionId); // insight-003 starts at rank 5
  await apiClient.post(`/sessions/${sessionId}/insights/insight-003/upvote`);

  const ranked = await apiClient.get(`/sessions/${sessionId}/insights`);
  const idx = ranked.data.insights.findIndex((i: any) => i.id === 'insight-003');
  expect(idx).toBeLessThan(3); // promoted to top 3 (0-indexed)
  expect(ranked.data.insights[idx].userBoostApplied).toBe(true);
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Ambiguous or Low-Confidence Insights

#### TC-F6-E1.1: Hedged Statement Not Promoted to KEY_FINDING
**Objective**: Verify that heavily hedged statements are not classified as `KEY_FINDING`.

**Test Steps**:
1. Provide segment: `"It might, possibly, in some cases, suggest that there could be a correlation, perhaps."`
2. Call `classifyInsight(segment)`
3. Assert `type != 'KEY_FINDING'`; confidence < 0.5

**Expected Result**: Hedged statement classified as `LOW_CONFIDENCE` or excluded; not elevated to `KEY_FINDING`.

**Code Sample**:
```typescript
it('should not classify a heavily hedged statement as KEY_FINDING', async () => {
  const segment = {
    speakerId: 'Speaker_0',
    text: "It might, possibly, in some cases, suggest that there could be a correlation, perhaps.",
    startMs: 100000
  };
  const result = await classifier.classifyInsight(segment);
  expect(result.type).not.toBe('KEY_FINDING');
  expect(result.confidence).toBeLessThan(0.5);
});
```

---

#### TC-F6-E1.2: No Insights Found in Pure Q&A Session
**Objective**: Verify the extractor returns an empty list (not an error) when all segments are audience questions with no substantive panelist responses.

**Test Steps**:
1. Provide a transcript containing only audience questions
2. Run insight extraction
3. Assert `insights = []`; no exception

**Expected Result**: Empty array; `status = 'COMPLETE'`; no exception.

**Code Sample**:
```typescript
it('should return an empty insight list for a Q&A-only transcript without errors', async () => {
  const result = await insightExtractor.extractFromTranscript(qaOnlyTranscript);
  expect(result.insights).toHaveLength(0);
  expect(result.status).toBe('COMPLETE');
});
```

---

### 3.2 High-Volume Sessions

#### TC-F6-E2.1: All-Day Summit — 500+ Potential Insight Candidates
**Objective**: Verify the system correctly deduplicates and limits output to top insights when faced with 500+ raw candidates.

**Test Steps**:
1. Generate a 500-candidate fixture
2. Run ranking and deduplication
3. Assert final output <= 50 insights

**Expected Result**: Output capped at a reasonable maximum; no duplicates in final set.

**Code Sample**:
```typescript
it('should deduplicate and cap insights at 50 for a high-volume session', async () => {
  const candidates = generateInsightCandidates(500);
  const final = await insightExtractor.rankAndDeduplicate(candidates, { maxInsights: 50 });
  expect(final).toHaveLength(50);
  const ids = new Set(final.map(i => i.id));
  expect(ids.size).toBe(50); // no duplicates
});
```

---

#### TC-F6-E2.2: Insight Extraction on Transcript with All Speakers Unresolved
**Objective**: Verify the extractor produces valid insights even when no speaker identities have been resolved.

**Test Steps**:
1. Provide transcript with all segments attributed to `Speaker_0`, `Speaker_1` (unresolved)
2. Run extraction
3. Assert insights have `attributedTo: 'Speaker_N'` format; no null attribution errors

**Expected Result**: Insights produced; `attributedTo` uses diarization label; no null reference exception.

**Code Sample**:
```typescript
it('should produce insights with diarization labels when speaker identities are unresolved', async () => {
  const result = await insightExtractor.extractFromTranscript(unresolvedSpkTranscript);
  expect(result.insights.length).toBeGreaterThan(0);
  result.insights.forEach(i => {
    expect(i.attributedTo).toMatch(/^Speaker_\d+$/);
  });
});
```

---

### 3.3 Contradictory and Sensitive Content

#### TC-F6-E3.1: Politically Sensitive Statement Not Auto-Promoted
**Objective**: Verify that statements flagged by the content safety filter are not surfaced as top insights without a review step.

**Test Steps**:
1. Provide a segment flagged by the content safety service as politically sensitive
2. Run insight extraction
3. Assert the segment's insight has `requiresReview = true` and `compositeScore` capped at 0.3

**Expected Result**: Sensitive insight gated behind review; not surfaced by default.

**Code Sample**:
```typescript
it('should gate sensitive insights behind a review flag and cap their score', async () => {
  mockContentSafety.flag('seg-sensitive', { political: true });
  const result = await insightExtractor.extractFromTranscript(sensitiveTranscript);
  const sensitive = result.insights.find(i => i.segmentId === 'seg-sensitive');
  expect(sensitive!.requiresReview).toBe(true);
  expect(sensitive!.compositeScore).toBeLessThanOrEqual(0.3);
});
```

---

#### TC-F6-E3.2: Insight from Redacted Segment Returns Placeholder
**Objective**: Verify that if a transcript segment is later redacted (privacy compliance), the associated insight is replaced with a placeholder.

**Test Steps**:
1. Extract insight from seg-010
2. Redact seg-010 via privacy compliance API
3. Fetch insight for seg-010
4. Assert `text = '[REDACTED]'` and `type = 'REDACTED'`

**Expected Result**: Insight text replaced; type set to `REDACTED`; no original content exposed.

**Code Sample**:
```typescript
it('should replace insight text with [REDACTED] when source segment is redacted', async () => {
  await seedInsightForSegment(sessionId, 'seg-010');
  await privacyService.redactSegment(sessionId, 'seg-010');

  const insight = await insightRepo.findBySegment('seg-010');
  expect(insight!.text).toBe('[REDACTED]');
  expect(insight!.type).toBe('REDACTED');
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Extraction Throughput

#### TC-F6-P1.1: Insight Extraction Latency — 1-Hour Session
**Objective**: Verify key insight extraction from a 1-hour session completes in <= 8 s.

**Test Steps**:
1. Load a 1-hour transcript
2. Time `insightExtractor.extractFromTranscript(transcript)` across 5 iterations

**Expected Result**: p95 <= 8 s.

**Code Sample**:
```typescript
it('should extract key insights from a 1-hour session within 8 seconds p95', async () => {
  const runs = await benchmark(() => insightExtractor.extractFromTranscript(oneHourTranscript), { iterations: 5 });
  expect(runs.p95).toBeLessThan(8000);
});
```

---

#### TC-F6-P1.2: Ranking and Deduplication Speed — 200 Candidates
**Objective**: Verify ranking and deduplication of 200 candidates completes within 300 ms.

**Test Steps**:
1. Generate 200 classified insights
2. Time the `rankAndDeduplicate` call

**Expected Result**: Completes <= 300 ms.

**Code Sample**:
```typescript
it('should rank and deduplicate 200 insight candidates within 300ms', () => {
  const candidates = generateInsightCandidates(200);
  const start = performance.now();
  insightExtractor.rankAndDeduplicate(candidates, { maxInsights: 20 });
  expect(performance.now() - start).toBeLessThan(300);
});
```

---

### 4.2 Concurrent Processing

#### TC-F6-P2.1: 10 Concurrent Insight Extraction Jobs
**Objective**: Verify the service handles 10 simultaneous insight extraction jobs without failures.

**Test Steps**:
1. Seed 10 sessions
2. Fire 10 concurrent extraction requests
3. Assert all complete successfully

**Expected Result**: All 10 succeed within 60 s.

**Code Sample**:
```typescript
it('should process 10 concurrent insight extraction jobs without errors', async () => {
  const ids = await seedMultipleSessions(10);
  const results = await Promise.allSettled(ids.map(id => insightExtractor.extract(id)));
  results.forEach(r => expect(r.status).toBe('fulfilled'));
}, 60000);
```

---

#### TC-F6-P2.2: Cross-Session Aggregation for 50-Session Conference
**Objective**: Verify trending insight aggregation across 50 sessions completes within 10 s.

**Test Steps**:
1. Seed 50 sessions with extracted insights
2. Time `insightAggregator.findTrending(conferenceId)` call

**Expected Result**: Completes <= 10 s; trending list returned.

**Code Sample**:
```typescript
it('should aggregate trending insights across 50 sessions within 10 seconds', async () => {
  await seedConferenceWithInsights(conferenceId, 50);
  const start = performance.now();
  const trending = await insightAggregator.findTrending(conferenceId);
  expect(performance.now() - start).toBeLessThan(10000);
  expect(trending.length).toBeGreaterThan(0);
});
```

---

### 4.3 API and Storage Performance

#### TC-F6-P3.1: GET /insights Response Time Under Load
**Objective**: Verify the insights endpoint responds within 150 ms under 50 concurrent reads.

**Test Steps**:
1. Pre-seed 20 insights for a session
2. Fire 50 concurrent GET requests
3. Collect response times

**Expected Result**: p99 response time <= 150 ms.

**Code Sample**:
```typescript
it('should serve GET /insights with p99 latency under 150ms under 50 concurrent reads', async () => {
  await seedInsights(sessionId, 20);
  const latencies = await measureConcurrentGets(
    () => apiClient.get(`/sessions/${sessionId}/insights`),
    { concurrency: 50 }
  );
  expect(percentile(latencies, 99)).toBeLessThan(150);
});
```

---

#### TC-F6-P3.2: Insight Store Write Batch Performance
**Objective**: Verify writing 100 insight records in a batch completes within 500 ms.

**Test Steps**:
1. Generate 100 insight records
2. Time `insightRepo.batchInsert(insights)` call

**Expected Result**: Batch insert completes <= 500 ms; all 100 records written.

**Code Sample**:
```typescript
it('should batch-insert 100 insight records within 500ms', async () => {
  const insights = generateInsightRecords(100, sessionId);
  const start = performance.now();
  await insightRepo.batchInsert(insights);
  expect(performance.now() - start).toBeLessThan(500);

  const count = await insightRepo.countForSession(sessionId);
  expect(count).toBe(100);
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
