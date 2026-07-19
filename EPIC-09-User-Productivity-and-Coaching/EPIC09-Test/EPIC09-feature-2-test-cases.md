# EPIC09 Feature 2 — Interaction Quality Analysis — Test Cases

## Test Overview
Comprehensive test suite for Interaction Quality Analysis covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 NLP Signal Extraction

#### TC-F2-U1.1: Mutual Engagement Signal Detection
**Objective**: Verify that the NLP pipeline correctly identifies mutual engagement signals (e.g., back-and-forth questioning, affirmations, topic continuations) in a conversation transcript.

**Preconditions**:
- Raw transcript text available with speaker diarization labels
- NLP model loaded and initialized

**Test Steps**:
1. Instantiate `InteractionQualityAnalyzer` with mock NLP service
2. Call `extractEngagementSignals(transcript)` on a transcript with 3 back-and-forth exchanges
3. Assert returned signal list contains at least 3 `MUTUAL_ENGAGEMENT` events

**Expected Result**: Returns `EngagementSignalResult` with at least 3 `MUTUAL_ENGAGEMENT` items and signal confidence > 0.7 for each.

**Code Sample**:
```typescript
describe('InteractionQualityAnalyzer', () => {
  it('should detect mutual engagement signals in diarized transcript', async () => {
    const analyzer = new InteractionQualityAnalyzer(mockNlpService);
    const transcript = buildDiarizedTranscript([
      { speaker: 'A', text: 'What frameworks does your team use for ML pipelines?' },
      { speaker: 'B', text: 'Mostly Kubeflow. Do you use Airflow on your end?' },
      { speaker: 'A', text: 'We do — actually, we just migrated last quarter.' }
    ]);

    const signals = await analyzer.extractEngagementSignals(transcript);
    const mutual = signals.filter(s => s.type === 'MUTUAL_ENGAGEMENT');

    expect(mutual.length).toBeGreaterThanOrEqual(3);
    mutual.forEach(s => expect(s.confidence).toBeGreaterThan(0.7));
  });
});
```

---

#### TC-F2-U1.2: Depth-of-Conversation Scoring
**Objective**: Verify that conversations with substantive technical exchange score higher on depth than small-talk exchanges.

**Preconditions**:
- Two transcripts: one technical discussion, one greeting-only exchange

**Test Steps**:
1. Call `scoreConversationDepth(technicalTranscript)` and `scoreConversationDepth(smallTalkTranscript)`
2. Assert technical score is significantly higher (> 20 points difference)

**Expected Result**: Technical transcript depth score > 70; small-talk depth score < 30.

**Code Sample**:
```typescript
it('should score technical conversations higher than small talk', async () => {
  const analyzer = new InteractionQualityAnalyzer(mockNlpService);
  const techScore = await analyzer.scoreConversationDepth(deepTechTranscript);
  const smallTalkScore = await analyzer.scoreConversationDepth(smallTalkTranscript);

  expect(techScore).toBeGreaterThan(70);
  expect(smallTalkScore).toBeLessThan(30);
  expect(techScore - smallTalkScore).toBeGreaterThan(20);
});
```

---

#### TC-F2-U1.3: Sentiment Arc Analysis
**Objective**: Verify that the sentiment arc over a conversation is correctly segmented into early, mid, and late-stage sentiment bands.

**Preconditions**:
- Transcript with at least 10 utterances spanning a full conversation

**Test Steps**:
1. Call `analyzeSentimentArc(transcript)`
2. Assert result contains three segments: `early`, `mid`, `late`
3. Assert each segment has an avgSentiment in [-1, 1]

**Expected Result**: Returns `SentimentArc` with three labeled segments and aggregate trend direction.

**Code Sample**:
```typescript
it('should segment sentiment arc into three conversation phases', async () => {
  const analyzer = new InteractionQualityAnalyzer(mockNlpService);
  const arc = await analyzer.analyzeSentimentArc(longTranscript);

  expect(arc.early.avgSentiment).toBeGreaterThanOrEqual(-1);
  expect(arc.early.avgSentiment).toBeLessThanOrEqual(1);
  expect(arc.mid).toBeDefined();
  expect(arc.late).toBeDefined();
  expect(['IMPROVING', 'DECLINING', 'STABLE']).toContain(arc.overallTrend);
});
```

---

### 1.2 Quality Score Computation

#### TC-F2-U2.1: Composite Interaction Quality Score
**Objective**: Verify that the interaction quality score is a weighted composite of depth, engagement, and sentiment signals.

**Preconditions**:
- Default weights: depth=0.4, engagement=0.4, sentiment=0.2

**Test Steps**:
1. Provide component scores: depth=80, engagement=70, sentiment=60
2. Call `computeInteractionQualityScore({ depth, engagement, sentiment, weights })`
3. Assert composite = (80×0.4)+(70×0.4)+(60×0.2) = 72

**Expected Result**: Returns 72 (±0.5).

**Code Sample**:
```typescript
it('should compute composite interaction quality score correctly', () => {
  const scorer = new InteractionQualityScorer();
  const score = scorer.computeInteractionQualityScore({
    depth: 80,
    engagement: 70,
    sentiment: 60,
    weights: { depth: 0.4, engagement: 0.4, sentiment: 0.2 }
  });

  expect(score).toBeCloseTo(72, 1);
});
```

---

#### TC-F2-U2.2: High-Value Interaction Classification
**Objective**: Verify that interactions scoring above 75 are classified as HIGH_VALUE.

**Test Steps**:
1. Compute score for a strong interaction transcript (score = 82)
2. Assert classification label = 'HIGH_VALUE'

**Expected Result**: Returns `InteractionClassification.HIGH_VALUE` for scores >= 75.

**Code Sample**:
```typescript
it('should classify interactions above 75 as HIGH_VALUE', () => {
  const scorer = new InteractionQualityScorer();
  const classification = scorer.classifyInteraction(82);

  expect(classification).toBe('HIGH_VALUE');
});
```

---

#### TC-F2-U2.3: Interaction Quality Badge Assignment
**Objective**: Verify that quality badges (CONNECTOR, DEEP_DIVER, QUICK_WIN) are assigned based on signal profiles.

**Test Steps**:
1. Build profile with high engagement, low depth → expect CONNECTOR
2. Build profile with high depth, low engagement → expect DEEP_DIVER
3. Build profile with high score but short duration → expect QUICK_WIN

**Expected Result**: Each profile maps to the correct badge; at most one badge per interaction.

**Code Sample**:
```typescript
it('should assign CONNECTOR badge to high-engagement, low-depth interactions', () => {
  const badger = new InteractionBadgeAssigner();
  const badge = badger.assignBadge({ engagement: 90, depth: 35, durationMinutes: 8 });

  expect(badge).toBe('CONNECTOR');
});
```

---

### 1.3 Speaker Role Detection

#### TC-F2-U3.1: Dominant Speaker Detection
**Objective**: Verify that the analyzer correctly identifies which speaker dominated the conversation.

**Test Steps**:
1. Provide transcript where speaker A spoke 75% of the time
2. Call `detectSpeakerBalance(transcript)`
3. Assert dominant speaker = 'A', ratio = 0.75

**Expected Result**: Returns `{ dominantSpeaker: 'A', ratio: 0.75, balanced: false }`.

**Code Sample**:
```typescript
it('should detect dominant speaker from word count ratio', async () => {
  const transcript = buildTranscriptWithRatio('A', 0.75);
  const balance = await analyzer.detectSpeakerBalance(transcript);

  expect(balance.dominantSpeaker).toBe('A');
  expect(balance.ratio).toBeCloseTo(0.75, 2);
  expect(balance.balanced).toBe(false);
});
```

---

#### TC-F2-U3.2: Balanced Exchange Detection
**Objective**: Verify that interactions with a 45–55% speaker split are flagged as balanced.

**Test Steps**:
1. Construct transcript with 50/50 word distribution
2. Call `detectSpeakerBalance(transcript)`
3. Assert `balanced = true`

**Expected Result**: Returns `{ balanced: true }` for ratio in [0.45, 0.55].

**Code Sample**:
```typescript
it('should flag 50/50 speaker ratio as balanced', async () => {
  const transcript = buildTranscriptWithRatio('A', 0.50);
  const balance = await analyzer.detectSpeakerBalance(transcript);

  expect(balance.balanced).toBe(true);
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Real-Time Interaction Scoring

#### TC-F2-I1.1: Interaction Quality Computed on Contact Link
**Objective**: Verify that linking a transcript to a contact record triggers quality analysis and stores the result.

**Preconditions**:
- Transcript exists for a session; contact record exists

**Test Steps**:
1. POST `/api/interactions` with `{ transcriptId, contactId, conferenceId }`
2. Wait for async analysis to complete
3. GET `/api/interactions/{id}/quality`

**Expected Result**: Quality score, badge, and signal breakdown returned; HTTP 200; stored in DB.

**Code Sample**:
```typescript
it('should compute and store interaction quality on contact link', async () => {
  const res = await request(app)
    .post('/api/interactions')
    .send({ transcriptId: 'tx-001', contactId: 'ct-042', conferenceId: 'conf-2026' })
    .expect(201);

  await waitForAnalysis(res.body.interactionId, 3000);

  const quality = await request(app)
    .get(`/api/interactions/${res.body.interactionId}/quality`)
    .expect(200);

  expect(quality.body.compositeScore).toBeGreaterThan(0);
  expect(quality.body.badge).toBeDefined();
});
```

---

#### TC-F2-I1.2: Interaction Quality Surfaces in Contact Profile
**Objective**: Verify that contact profile endpoint includes aggregated interaction quality when multiple interactions exist.

**Test Steps**:
1. Create 3 interactions linked to contact ct-042 with scores 65, 80, 72
2. GET `/api/contacts/ct-042`
3. Assert `interactionQuality.avgScore ≈ 72.3`

**Expected Result**: Contact profile includes `interactionQuality` block with avgScore, highestQuality interaction, and count.

---

### 2.2 Conference-Level Interaction Analytics

#### TC-F2-I2.1: Top Interactions Across a Conference
**Objective**: Verify that the conference analytics endpoint returns the top 5 interactions by quality score.

**Test Steps**:
1. Create 20 interactions across a conference
2. GET `/api/conferences/conf-2026/interactions?sort=quality&limit=5`
3. Assert 5 results returned, sorted by compositeScore descending

**Expected Result**: Returns 5 interactions; scores in descending order; all belong to conf-2026.

---

#### TC-F2-I2.2: Interaction Quality Heatmap Data
**Objective**: Verify that time-of-day interaction quality data is correctly aggregated for heatmap rendering.

**Test Steps**:
1. Create interactions at 09:00, 12:00, 15:00, 18:00 with scores 60, 85, 78, 55
2. GET `/api/conferences/conf-2026/interactions/heatmap`
3. Assert midday slot (11–13h) has highest average quality

**Expected Result**: Heatmap data returned as hourly buckets; midday bucket avgScore highest.

---

### 2.3 NLP Model Integration

#### TC-F2-I3.1: NLP Service Fallback on Timeout
**Objective**: Verify that if the NLP service times out, the system falls back to keyword-based scoring and records a degraded quality flag.

**Test Steps**:
1. Configure NLP service mock to timeout after 500ms
2. Trigger interaction analysis
3. Assert response includes `qualityMode: 'DEGRADED'` and a keyword-based score

**Expected Result**: Score returned with `qualityMode: 'DEGRADED'`; interaction flagged for re-analysis when NLP service recovers.

---

#### TC-F2-I3.2: Multi-Language Transcript Analysis
**Objective**: Verify that transcripts in Spanish are routed to the multilingual NLP pipeline and scored correctly.

**Test Steps**:
1. Submit a Spanish-language transcript
2. Assert NLP service called with `language: 'es'`
3. Assert quality score returned (not null)

**Expected Result**: Multilingual pipeline invoked; score computed; no "unsupported language" error.

---

## 3. EDGE CASE VALIDATION

### 3.1 Minimal Transcript Conditions

#### TC-F2-E1.1: Single-Utterance Transcript
**Objective**: Verify quality analysis handles a transcript with only one utterance (e.g., a business card exchange with no spoken content).

**Test Steps**:
1. Provide transcript with one utterance: "Nice to meet you."
2. Call `analyzeInteractionQuality(transcript)`
3. Assert score = 0 or minimum score with reason = 'INSUFFICIENT_CONTENT'

**Expected Result**: Returns minimal score and `reason: 'INSUFFICIENT_CONTENT'`; no exception thrown.

---

#### TC-F2-E1.2: Transcript With Only Filler Words
**Objective**: Verify that transcripts consisting entirely of filler words (uh, um, yeah, like) score near zero on depth.

**Test Steps**:
1. Build transcript of 20 utterances containing only fillers
2. Assert depth score < 10

**Expected Result**: Depth score < 10; quality classification = 'LOW_VALUE'.

---

### 3.2 Ambiguous Speaker Labels

#### TC-F2-E2.1: Missing Speaker Diarization
**Objective**: Verify the analyzer gracefully handles transcripts without speaker labels.

**Test Steps**:
1. Submit transcript with all utterances attributed to 'UNKNOWN'
2. Assert analysis completes with a note that speaker balance is unavailable

**Expected Result**: `speakerBalance: null`; rest of quality signals still computed; no crash.

---

#### TC-F2-E2.2: More Than Two Speakers
**Objective**: Verify quality analysis correctly handles group conversations with 3+ speakers.

**Test Steps**:
1. Submit transcript with speakers A, B, C
2. Assert each speaker's contribution ratio is computed
3. Assert overall engagement score reflects multi-party dynamic

**Expected Result**: Returns speaker ratios for all 3; `isGroupInteraction: true` flag set; no exception.

---

### 3.3 Scoring Stability

#### TC-F2-E3.1: Idempotent Re-Analysis
**Objective**: Verify that analyzing the same transcript twice produces the same score.

**Test Steps**:
1. Analyze transcript `tx-001` → record score
2. Analyze `tx-001` again
3. Assert scores match exactly

**Expected Result**: Score identical on both runs (deterministic pipeline).

---

#### TC-F2-E3.2: Score Not Inflated by Long Monologues
**Objective**: Verify that a long single-speaker monologue does not falsely inflate engagement scores.

**Test Steps**:
1. Submit transcript where speaker A talks for 10 minutes continuously
2. Assert engagement score < 40 despite high word count

**Expected Result**: Engagement score reflects lack of back-and-forth; word count alone does not boost score.

---

## 4. PERFORMANCE VALIDATION

### 4.1 Analysis Latency

#### TC-F2-P1.1: Single Interaction Analysis Under 3 Seconds
**Objective**: Verify that analyzing a 10-minute conversation transcript completes within 3 seconds.

**Test Steps**:
1. Load a 10-minute transcript (~1500 words)
2. Trigger full quality analysis pipeline
3. Assert completion time < 3000ms

**Expected Result**: p95 latency < 3000ms; quality score and all signal components returned.

**Code Sample**:
```typescript
it('should analyze a 10-minute transcript within 3 seconds', async () => {
  const transcript = generateTranscript({ durationMinutes: 10 });
  const start = performance.now();
  await analyzer.analyzeInteractionQuality(transcript);
  const elapsed = performance.now() - start;

  expect(elapsed).toBeLessThan(3000);
}, 15000);
```

---

#### TC-F2-P1.2: Batch Analysis of 100 Interactions
**Objective**: Verify batch analysis of 100 interaction transcripts completes within 30 seconds.

**Test Steps**:
1. Queue 100 transcripts for batch analysis
2. Start batch job
3. Assert all 100 scores stored within 30 seconds

**Expected Result**: 100% completion rate; zero failures; total time < 30 seconds.

---

### 4.2 NLP Throughput

#### TC-F2-P2.1: NLP Signal Extraction Throughput
**Objective**: Verify NLP signal extraction processes at least 50 transcripts per minute.

**Test Steps**:
1. Submit 50 transcripts to the NLP pipeline in parallel
2. Assert all 50 complete within 60 seconds

**Expected Result**: Throughput >= 50 transcripts/min; no queue saturation errors.

---

#### TC-F2-P2.2: Concurrent Analysis Without Degradation
**Objective**: Verify that 20 simultaneous analysis requests do not increase per-request latency by more than 50%.

**Test Steps**:
1. Measure baseline latency for 1 request
2. Fire 20 concurrent requests
3. Assert p50 concurrent latency < 1.5× baseline

**Expected Result**: Latency within 150% of baseline; no timeout errors.

---

### 4.3 Storage and Retrieval

#### TC-F2-P3.1: Quality Score Read Latency
**Objective**: Verify that reading a stored interaction quality record from the DB returns within 100ms.

**Test Steps**:
1. Seed 10,000 interaction quality records
2. Query by interactionId for 50 random records
3. Assert all queries return in < 100ms

**Expected Result**: p99 read latency < 100ms; correct records returned.

---

#### TC-F2-P3.2: Conference-Level Aggregation Query Performance
**Objective**: Verify that aggregating quality scores across 500 interactions for one conference returns within 500ms.

**Test Steps**:
1. Seed 500 interaction quality records for conf-2026
2. Query aggregation endpoint
3. Assert response time < 500ms

**Expected Result**: Aggregation returns in < 500ms; avgScore, topInteraction, and distribution returned.

---

## Test Execution Summary

| Section | Suites | Test Cases |
|---------|--------|------------|
| Unit Tests | 3 | 9 |
| Integration Tests | 3 | 6 |
| Edge Case Validation | 3 | 6 |
| Performance Validation | 3 | 6 |
| **Total** | **12** | **27** |

**Estimated Execution Time**: ~10 minutes (unit: 2m, integration: 3m, edge: 2m, performance: 3m)
