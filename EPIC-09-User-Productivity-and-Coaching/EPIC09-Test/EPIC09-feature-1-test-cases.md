# EPIC09 Feature 1 — Conference Scoring — Test Cases

## Test Overview
Comprehensive test suite for Conference Scoring covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Sub-Score Computation

#### TC-F1-U1.1: Content Quality Score Calculation
**Objective**: Verify that content quality sub-score is correctly computed from transcript coverage, note density, and topic relevance signals.

**Preconditions**:
- Conference session records exist with transcripts and notes
- User's stated interest topics are configured

**Test Steps**:
1. Instantiate `ContentQualityScorer` with mock session data
2. Call `computeContentQualityScore({ conferenceId, userId })`
3. Assert returned score is within [0, 100]
4. Assert score components (transcriptCoverage, noteDensity, topicRelevance) are each within [0, 1]

**Expected Result**: Returns a `ContentQualityResult` with a numeric composite score and three normalized component values.

**Code Sample**:
```typescript
describe('ContentQualityScorer', () => {
  it('should compute content quality score from session signals', async () => {
    const scorer = new ContentQualityScorer(mockSessionRepo, mockTopicService);
    const result = await scorer.computeContentQualityScore({
      conferenceId: 'conf-2026-ai-summit',
      userId: 'user-42'
    });

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.components.transcriptCoverage).toBeGreaterThanOrEqual(0);
    expect(result.components.transcriptCoverage).toBeLessThanOrEqual(1);
    expect(result.components.noteDensity).toBeGreaterThanOrEqual(0);
    expect(result.components.topicRelevance).toBeGreaterThanOrEqual(0);
  });
});
```

---

#### TC-F1-U1.2: Network Quality Score Calculation
**Objective**: Verify that network quality sub-score accounts for contact seniority, company fit, and interaction depth.

**Preconditions**:
- At least 3 contacts captured during conference with role metadata
- Company fit weights are configured in scoring profile

**Test Steps**:
1. Call `computeNetworkQualityScore({ conferenceId, userId })`
2. Verify that higher-seniority contacts increase the score
3. Confirm interaction depth weighting is applied

**Expected Result**: Score reflects weighted average of seniority, company fit, and interaction depth; contacts with no role data default to weight 0.5.

**Code Sample**:
```typescript
it('should weight higher-seniority contacts more heavily', async () => {
  const contacts = [
    { role: 'CTO', companyFit: 0.9, interactionDepth: 0.8 },
    { role: 'Intern', companyFit: 0.4, interactionDepth: 0.3 }
  ];
  const scorer = new NetworkQualityScorer(mockContactRepo);
  const result = await scorer.computeNetworkQualityScore('conf-001', contacts);

  expect(result.score).toBeGreaterThan(50);
  expect(result.topContact.role).toBe('CTO');
});
```

---

#### TC-F1-U1.3: Insight Density Score Calculation
**Objective**: Verify insight density is computed as actionable items per attended hour.

**Preconditions**:
- Conference attendance duration tracked (in hours)
- Actionable insights (decisions, ideas, follow-ups) extracted from transcripts

**Test Steps**:
1. Set up mock with 12 actionable insights over 6 attended hours
2. Call `computeInsightDensityScore({ insights, attendedHours })`
3. Assert density = 2.0 insights/hour maps to a score near 70

**Expected Result**: Density of 2 insights/hour maps to a pre-calibrated score in the 65–75 range; density of 0 returns score of 0.

**Code Sample**:
```typescript
it('should compute insight density of 2.0 items/hour correctly', () => {
  const scorer = new InsightDensityScorer(scoringConfig);
  const result = scorer.computeInsightDensityScore({
    insights: mockInsightList(12),
    attendedHours: 6
  });

  expect(result.densityPerHour).toBeCloseTo(2.0);
  expect(result.score).toBeGreaterThanOrEqual(65);
  expect(result.score).toBeLessThanOrEqual(75);
});
```

---

### 1.2 Composite Score Assembly

#### TC-F1-U2.1: Weighted Composite Score Computation
**Objective**: Verify composite Conference Score is the weighted combination of three sub-scores.

**Preconditions**:
- Default weights: content=0.4, network=0.35, insight=0.25

**Test Steps**:
1. Provide sub-scores: content=80, network=60, insight=70
2. Call `computeCompositeScore({ contentScore, networkScore, insightScore, weights })`
3. Assert composite = (80×0.4)+(60×0.35)+(70×0.25) = 71

**Expected Result**: Returns 71 (±0.5 for floating point).

**Code Sample**:
```typescript
it('should compute weighted composite score correctly', () => {
  const engine = new CompositeScoreEngine();
  const composite = engine.computeCompositeScore({
    contentScore: 80,
    networkScore: 60,
    insightScore: 70,
    weights: { content: 0.4, network: 0.35, insight: 0.25 }
  });

  expect(composite).toBeCloseTo(71, 1);
});
```

---

#### TC-F1-U2.2: Custom Weight Normalization
**Objective**: Verify that custom weights that do not sum to 1.0 are automatically normalized.

**Test Steps**:
1. Supply weights: content=2, network=1, insight=1
2. Call `normalizeWeights(weights)`
3. Assert normalized: content=0.5, network=0.25, insight=0.25

**Expected Result**: Weights sum to exactly 1.0 after normalization; original proportions preserved.

**Code Sample**:
```typescript
it('should normalize weights that do not sum to 1', () => {
  const engine = new CompositeScoreEngine();
  const normalized = engine.normalizeWeights({ content: 2, network: 1, insight: 1 });

  expect(normalized.content).toBeCloseTo(0.5);
  expect(normalized.network).toBeCloseTo(0.25);
  expect(normalized.insight).toBeCloseTo(0.25);
  expect(normalized.content + normalized.network + normalized.insight).toBeCloseTo(1.0);
});
```

---

#### TC-F1-U2.3: Score Snapshot Persistence
**Objective**: Verify each score computation creates a persisted snapshot with timestamp.

**Test Steps**:
1. Trigger composite score computation for a conference
2. Query `ScoreSnapshotRepository.findByConferenceId(conferenceId)`
3. Assert at least one snapshot exists with current date

**Expected Result**: Snapshot record stored with conferenceId, userId, score value, and ISO timestamp.

**Code Sample**:
```typescript
it('should persist a score snapshot after computation', async () => {
  const service = new ConferenceScoringService(mockRepos);
  await service.scoreConference('conf-2026', 'user-42');

  const snapshots = await mockSnapshotRepo.findByConferenceId('conf-2026');
  expect(snapshots.length).toBeGreaterThanOrEqual(1);
  expect(snapshots[0].userId).toBe('user-42');
  expect(snapshots[0].computedAt).toBeDefined();
});
```

---

### 1.3 Score History & Trend

#### TC-F1-U3.1: Historical Score Retrieval
**Objective**: Verify score history is returned in chronological order for trend display.

**Test Steps**:
1. Insert 5 score snapshots spanning 3 conferences
2. Call `getScoreHistory({ userId, limit: 5 })`
3. Assert results ordered by computedAt ascending

**Expected Result**: Returns array of 5 snapshots sorted oldest-first with correct conferenceId references.

**Code Sample**:
```typescript
it('should return score history in chronological order', async () => {
  const repo = new ScoreSnapshotRepository(mockDb);
  const history = await repo.getScoreHistory({ userId: 'user-42', limit: 5 });

  expect(history.length).toBe(5);
  for (let i = 1; i < history.length; i++) {
    expect(new Date(history[i].computedAt).getTime())
      .toBeGreaterThanOrEqual(new Date(history[i - 1].computedAt).getTime());
  }
});
```

---

#### TC-F1-U3.2: Trend Direction Calculation
**Objective**: Verify system correctly identifies whether scores are trending up, down, or flat.

**Test Steps**:
1. Provide score sequence: [55, 62, 70, 74]
2. Call `computeScoreTrend(scores)`
3. Assert trend direction is "IMPROVING"

**Expected Result**: Returns `{ direction: 'IMPROVING', deltaAvg: 6.3, confidence: 'HIGH' }`.

**Code Sample**:
```typescript
it('should identify improving score trend', () => {
  const analyzer = new ScoreTrendAnalyzer();
  const trend = analyzer.computeScoreTrend([55, 62, 70, 74]);

  expect(trend.direction).toBe('IMPROVING');
  expect(trend.deltaAvg).toBeCloseTo(6.3, 1);
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 End-to-End Scoring Pipeline

#### TC-F1-I1.1: Full Scoring Pipeline on Conference Close
**Objective**: Verify that closing a conference triggers the full scoring pipeline and stores results.

**Preconditions**:
- Conference with 3 sessions, 8 contacts, and 15 captured insights

**Test Steps**:
1. POST `/api/conferences/conf-2026/close`
2. Wait for async scoring pipeline completion (max 5s)
3. GET `/api/conferences/conf-2026/score`

**Expected Result**: Score endpoint returns composite score, three sub-scores, and snapshot timestamp; HTTP 200.

**Code Sample**:
```typescript
it('should produce a full score on conference close', async () => {
  await request(app).post('/api/conferences/conf-2026/close').expect(202);
  await waitForScoreCompletion('conf-2026', 5000);

  const res = await request(app).get('/api/conferences/conf-2026/score').expect(200);
  expect(res.body.compositeScore).toBeGreaterThan(0);
  expect(res.body.subScores.content).toBeDefined();
  expect(res.body.subScores.network).toBeDefined();
  expect(res.body.subScores.insight).toBeDefined();
});
```

---

#### TC-F1-I1.2: Score Refresh When New Data Arrives
**Objective**: Verify that adding a new contact post-conference triggers a score recalculation.

**Test Steps**:
1. Record initial score for a closed conference
2. POST a new contact via `/api/contacts` linked to the conference
3. GET the conference score again

**Expected Result**: Network quality sub-score increases; composite score is updated; new snapshot created.

**Code Sample**:
```typescript
it('should refresh score when new contact is added', async () => {
  const initial = await getConferenceScore('conf-2026');
  await addContact({ conferenceId: 'conf-2026', role: 'VP Engineering', companyFit: 0.85 });

  await waitForScoreRefresh('conf-2026', 3000);
  const updated = await getConferenceScore('conf-2026');
  expect(updated.subScores.network).toBeGreaterThan(initial.subScores.network);
});
```

---

### 2.2 Cross-Conference Comparison

#### TC-F1-I2.1: Conference Score Comparison Endpoint
**Objective**: Verify that the comparison API returns scores for multiple conferences with ranking.

**Test Steps**:
1. GET `/api/users/user-42/conferences/scores?conferenceIds=conf-A,conf-B,conf-C`
2. Assert response includes all 3 conferences
3. Assert `rank` field is present and 1-indexed

**Expected Result**: Array of scored conferences sorted by composite score descending; ranks assigned correctly.

---

#### TC-F1-I2.2: Team Aggregate Score Report
**Objective**: Verify team-level aggregation of conference scores for budget justification.

**Test Steps**:
1. POST `/api/teams/team-01/score-report` with { conferenceId, userIds: [...] }
2. Assert response contains avgTeamScore, topPerformer, and breakdown per user

**Expected Result**: Returns aggregate report with per-user scores and team composite; HTTP 200.

---

### 2.3 Scoring Configuration

#### TC-F1-I3.1: Custom Weight Configuration Persistence
**Objective**: Verify that user-supplied weight preferences are stored and applied on next scoring run.

**Test Steps**:
1. PUT `/api/users/user-42/scoring-config` with custom weights
2. Trigger a new conference scoring run
3. Assert the composite score reflects the new weights

**Expected Result**: Score differs from default-weight result; configuration record updated in DB.

---

#### TC-F1-I3.2: Restore Default Weights
**Objective**: Verify that resetting weights to defaults produces the standard composite score.

**Test Steps**:
1. DELETE `/api/users/user-42/scoring-config`
2. Re-run scoring
3. Assert weights applied match system defaults

**Expected Result**: Composite score matches the expected value using default weights (content=0.4, network=0.35, insight=0.25).

---

## 3. EDGE CASE VALIDATION

### 3.1 Sparse Data Conditions

#### TC-F1-E1.1: Scoring a Conference With Zero Sessions
**Objective**: Verify the system handles a conference with no sessions without crashing.

**Preconditions**:
- Conference exists with 0 sessions, 0 contacts, 0 insights

**Test Steps**:
1. Trigger scoring for an empty conference
2. Assert score = 0 for all sub-scores
3. Assert no exception thrown

**Expected Result**: Returns `{ compositeScore: 0, subScores: { content: 0, network: 0, insight: 0 }, reason: 'NO_DATA' }`.

---

#### TC-F1-E1.2: Scoring With Only Contacts (No Transcripts)
**Objective**: Verify content and insight sub-scores default to 0 when no transcripts exist, while network score is still computed.

**Test Steps**:
1. Trigger scoring for conference with 5 contacts but 0 session transcripts
2. Assert contentScore = 0, insightScore = 0
3. Assert networkScore > 0

**Expected Result**: Partial score computed; system flags the conference as "INCOMPLETE_DATA" in metadata.

---

### 3.2 Score Boundary Conditions

#### TC-F1-E2.1: Maximum Score Cap Enforcement
**Objective**: Verify composite score cannot exceed 100 regardless of inputs.

**Test Steps**:
1. Inject artificially inflated sub-scores: content=120, network=110, insight=115
2. Call composite computation
3. Assert output capped at 100

**Expected Result**: Returns 100; logs a warning about input values exceeding expected range.

---

#### TC-F1-E2.2: Negative Sub-Score Handling
**Objective**: Verify that negative sub-score inputs are clamped to 0.

**Test Steps**:
1. Pass sub-score of -10 for content
2. Assert content contribution to composite treated as 0

**Expected Result**: Composite score computed with content=0; no exception thrown.

---

### 3.3 Concurrent Scoring Requests

#### TC-F1-E3.1: Duplicate Scoring Request Deduplication
**Objective**: Verify that two simultaneous scoring requests for the same conference produce one result, not two snapshots.

**Test Steps**:
1. Fire two concurrent POST requests to trigger scoring
2. Wait for both to complete
3. Assert only one snapshot exists with the same timestamp bucket

**Expected Result**: Second request returns cached in-progress result; exactly one new snapshot stored.

---

#### TC-F1-E3.2: Stale Score Detection
**Objective**: Verify that a score older than 24 hours is flagged as stale when new data was added after it was computed.

**Test Steps**:
1. Insert a snapshot timestamped 25 hours ago
2. Add a new insight captured today
3. GET the conference score

**Expected Result**: Response includes `isStale: true` and `staleSince` timestamp; prompts recalculation.

---

## 4. PERFORMANCE VALIDATION

### 4.1 Scoring Throughput

#### TC-F1-P1.1: Single Conference Scoring Latency
**Objective**: Verify that scoring a single conference completes within 2 seconds under normal load.

**Preconditions**:
- Conference with 10 sessions, 50 contacts, 100 insights

**Test Steps**:
1. Start timer
2. Trigger full scoring pipeline
3. Record completion time

**Expected Result**: Pipeline completes in < 2000ms; p95 latency < 2500ms over 20 runs.

**Code Sample**:
```typescript
it('should score a single conference within 2 seconds', async () => {
  const start = performance.now();
  await scoringService.scoreConference('conf-large', 'user-42');
  const elapsed = performance.now() - start;

  expect(elapsed).toBeLessThan(2000);
}, 10000);
```

---

#### TC-F1-P1.2: Batch Scoring for Post-Conference Processing
**Objective**: Verify that scoring 20 conferences concurrently completes within 15 seconds.

**Test Steps**:
1. Create 20 closed conferences each with 10 sessions
2. Trigger batch score job
3. Assert all 20 scores are stored within 15 seconds

**Expected Result**: Batch completes within SLA; no scoring failures; all 20 snapshot records created.

---

### 4.2 History Query Performance

#### TC-F1-P2.1: Score History Query for 100 Conferences
**Objective**: Verify that retrieving score history for a user with 100 conferences returns within 500ms.

**Test Steps**:
1. Seed database with 100 conference score snapshots for user-42
2. GET `/api/users/user-42/conferences/scores?limit=100`
3. Assert response time < 500ms

**Expected Result**: Returns all 100 records in < 500ms; response payload < 50KB.

---

#### TC-F1-P2.2: Score Trend Computation at Scale
**Objective**: Verify trend analysis over 50 historical scores completes synchronously within 100ms.

**Test Steps**:
1. Generate array of 50 historical scores
2. Call `computeScoreTrend(scores)`
3. Assert computation time < 100ms

**Expected Result**: Trend result returned synchronously in < 100ms; direction and deltaAvg correct.

---

### 4.3 Concurrent User Load

#### TC-F1-P3.1: 50 Concurrent Scoring Requests
**Objective**: Verify scoring service handles 50 concurrent users triggering scoring simultaneously.

**Test Steps**:
1. Simulate 50 concurrent POST scoring requests with distinct user/conference pairs
2. Assert all 50 complete without error
3. Assert p99 latency < 5000ms

**Expected Result**: Zero failures; all scores stored; system memory stable throughout.

---

#### TC-F1-P3.2: Score Cache Hit Rate Under Load
**Objective**: Verify that repeated score reads use cache and do not re-query the database.

**Test Steps**:
1. Pre-warm cache with 10 conference scores
2. Fire 200 GET requests for the same 10 conferences
3. Assert DB query count < 15 (initial misses only)

**Expected Result**: Cache hit rate > 92%; DB query count bounded regardless of request volume.

---

## Test Execution Summary

| Section | Suites | Test Cases |
|---------|--------|------------|
| Unit Tests | 3 | 9 |
| Integration Tests | 3 | 6 |
| Edge Case Validation | 3 | 6 |
| Performance Validation | 3 | 6 |
| **Total** | **12** | **27** |

**Estimated Execution Time**: ~8 minutes (unit: 1m, integration: 3m, edge: 2m, performance: 2m)
