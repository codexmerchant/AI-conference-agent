# EPIC05 Feature 1 — Panel Mode Analysis — Test Cases

## Test Overview
Comprehensive test suite for Panel Mode Analysis covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Panel Role Classification

#### TC-F1-U1.1: Moderator Role Detection from Turn Patterns
**Objective**: Verify the classifier correctly identifies a moderator from conversational turn patterns and phrasing cues.

**Preconditions**:
- Diarized transcript segments available with speaker labels
- Role classification model loaded
- Session contains at least 3 distinct speakers

**Test Steps**:
1. Load a fixture transcript where Speaker_0 issues question-framing utterances ("Let's turn to...", "What's your take on...", "We'll take audience questions now")
2. Call `classifyPanelRoles(segments)` with the fixture
3. Assert Speaker_0 is assigned `role: 'MODERATOR'`
4. Assert remaining speakers are assigned `role: 'PANELIST'`

**Expected Result**: Speaker_0 role = `MODERATOR`; all others = `PANELIST`; confidence score >= 0.85 for moderator assignment.

**Code Sample**:
```typescript
describe('PanelRoleClassifier', () => {
  it('should assign MODERATOR to the speaker with question-framing turn patterns', async () => {
    const classifier = new PanelRoleClassifier(mockNlpService);
    const segments = loadFixture('moderator-led-panel.json');

    const result = await classifier.classifyPanelRoles(segments);

    const moderator = result.roles.find(r => r.speakerId === 'Speaker_0');
    expect(moderator).toBeDefined();
    expect(moderator!.role).toBe('MODERATOR');
    expect(moderator!.confidence).toBeGreaterThanOrEqual(0.85);

    const panelists = result.roles.filter(r => r.speakerId !== 'Speaker_0');
    panelists.forEach(p => expect(p.role).toBe('PANELIST'));
  });
});
```

---

#### TC-F1-U1.2: Audience Questioner Classification
**Objective**: Verify that a speaker who asks a single question in the Q&A segment is classified as `AUDIENCE`.

**Test Steps**:
1. Build a segment list where Speaker_3 speaks only once with an interrogative utterance after the Q&A boundary
2. Call `classifyPanelRoles(segments)`
3. Assert Speaker_3 role = `AUDIENCE`

**Expected Result**: Speaker_3 classified as `AUDIENCE`; role not promoted to `PANELIST`.

**Code Sample**:
```typescript
it('should classify single-utterance late speakers as AUDIENCE', async () => {
  const segments = buildSegments([
    { speakerId: 'Speaker_3', text: 'My question is about the cost model — can you elaborate?', startMs: 3420000 }
  ]);
  const result = await classifier.classifyPanelRoles(segments);
  const audience = result.roles.find(r => r.speakerId === 'Speaker_3');
  expect(audience!.role).toBe('AUDIENCE');
});
```

---

#### TC-F1-U1.3: Talk-Time Analytics Calculation
**Objective**: Verify per-panelist talk-time totals are computed correctly from segment durations.

**Test Steps**:
1. Provide segments with known durations: Speaker_0: 600 s, Speaker_1: 900 s, Speaker_2: 500 s
2. Call `computeTalkTimeAnalytics(segments)`
3. Assert each speaker's `totalSeconds` and `percentageShare` are accurate within ±1 s / ±0.5%

**Expected Result**: Speaker_1 has highest share (~45%); totals sum to session duration.

**Code Sample**:
```typescript
it('should compute accurate per-speaker talk-time percentages', () => {
  const analytics = computeTalkTimeAnalytics(knownDurationFixture);
  const totalSeconds = analytics.speakers.reduce((sum, s) => sum + s.totalSeconds, 0);

  expect(totalSeconds).toBeCloseTo(2000, 0);
  const s1 = analytics.speakers.find(s => s.speakerId === 'Speaker_1')!;
  expect(s1.percentageShare).toBeCloseTo(45, 1);
});
```

---

### 1.2 Q&A Boundary Detection

#### TC-F1-U2.1: Explicit Q&A Cue Detection
**Objective**: Verify the boundary detector fires on moderator utterances containing explicit Q&A opening phrases.

**Test Steps**:
1. Feed transcript containing "We'll now open the floor for questions"
2. Call `detectQaBoundary(segments)`
3. Assert `boundary.detectedAt` is within 5 s of the utterance timestamp

**Expected Result**: `detectedAt` matches phrase timestamp ±5 s; `method = 'EXPLICIT_CUE'`.

**Code Sample**:
```typescript
it('should detect Q&A boundary from explicit moderator cue', async () => {
  const segments = [
    { speakerId: 'Speaker_0', text: 'We\'ll now open the floor for questions.', startMs: 2700000 }
  ];
  const boundary = await detectQaBoundary(segments);
  expect(boundary).not.toBeNull();
  expect(boundary!.detectedAtMs).toBeCloseTo(2700000, -3);
  expect(boundary!.method).toBe('EXPLICIT_CUE');
});
```

---

#### TC-F1-U2.2: Structural Pattern Q&A Detection
**Objective**: Verify detection when no explicit cue exists but audience speakers appear after a silence gap.

**Test Steps**:
1. Supply transcript with 4 s silence at 45-min mark followed by new speaker asking a question
2. Call `detectQaBoundary(segments)`
3. Assert boundary detected near the silence gap

**Expected Result**: `method = 'STRUCTURAL_PATTERN'`; boundary within 10 s of silence midpoint.

**Code Sample**:
```typescript
it('should detect Q&A boundary from structural pattern when no explicit cue exists', async () => {
  const boundary = await detectQaBoundary(structuralPatternFixture);
  expect(boundary!.method).toBe('STRUCTURAL_PATTERN');
  expect(boundary!.detectedAtMs).toBeCloseTo(2700000, -4);
});
```

---

#### TC-F1-U2.3: Cross-talk and Interruption Flagging
**Objective**: Verify overlapping speech segments between two speakers are flagged as interruptions.

**Test Steps**:
1. Provide two segments with overlapping time ranges (Speaker_1 starts before Speaker_0 finishes)
2. Call `flagCrosstalk(segments)`
3. Assert the overlap is present in `result.interruptions`

**Expected Result**: One `interruption` event with both speaker IDs and overlapping time range.

**Code Sample**:
```typescript
it('should flag overlapping speech as an interruption event', () => {
  const segments = [
    { speakerId: 'Speaker_0', startMs: 1000, endMs: 5000 },
    { speakerId: 'Speaker_1', startMs: 4200, endMs: 7000 }
  ];
  const result = flagCrosstalk(segments);
  expect(result.interruptions).toHaveLength(1);
  expect(result.interruptions[0].overlapMs).toBe(800);
  expect(result.interruptions[0].speakers).toContain('Speaker_1');
});
```

---

### 1.3 Panel Structure Timeline

#### TC-F1-U3.1: Timeline Segment Grouping by Speaker
**Objective**: Verify that the timeline builder groups consecutive turns by the same speaker into contiguous blocks.

**Test Steps**:
1. Provide 10 segments alternating between 3 speakers with some consecutive repeats
2. Call `buildPanelTimeline(segments)`
3. Assert consecutive same-speaker turns are merged into a single block

**Expected Result**: Merged timeline has fewer entries than raw segments; no two adjacent blocks share the same `speakerId`.

**Code Sample**:
```typescript
it('should merge consecutive same-speaker turns into timeline blocks', () => {
  const timeline = buildPanelTimeline(consecutiveTurnsFixture);
  for (let i = 0; i < timeline.blocks.length - 1; i++) {
    expect(timeline.blocks[i].speakerId).not.toBe(timeline.blocks[i + 1].speakerId);
  }
  expect(timeline.blocks.length).toBeLessThan(consecutiveTurnsFixture.length);
});
```

---

#### TC-F1-U3.2: Timeline Persisted to Database
**Objective**: Verify the panel analysis record is written to the `panel_analysis` table with all required fields.

**Test Steps**:
1. Run `savePanelAnalysis(sessionId, analysisResult)` with a complete analysis object
2. Query the database for the record
3. Assert all required fields are present and non-null

**Expected Result**: Record exists with `session_id`, `roles`, `qa_boundary`, `interruptions`, `talk_time`, `timeline`, `created_at`.

**Code Sample**:
```typescript
it('should persist panel analysis record with all required fields', async () => {
  await savePanelAnalysis('session-abc', mockAnalysisResult);
  const record = await db.panelAnalysis.findOne({ where: { sessionId: 'session-abc' } });
  expect(record).not.toBeNull();
  expect(record!.roles).toBeDefined();
  expect(record!.qaBoundary).toBeDefined();
  expect(record!.talkTime).toBeDefined();
  expect(record!.timeline).toBeDefined();
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Diarization-to-Analysis Pipeline

#### TC-F1-I1.1: End-to-End Panel Analysis from Diarized Transcript
**Objective**: Verify the full pipeline from EPIC-02 diarized output to persisted `panel_analysis` record.

**Preconditions**:
- EPIC-02 diarization service running and returning valid segments
- Panel Mode Analysis service connected to NLP and database services

**Test Steps**:
1. POST a 60-minute multi-speaker session to the diarization stub
2. Forward resulting segments to Panel Mode Analysis service
3. Poll `GET /sessions/{id}/panel-analysis` until status = `COMPLETE`
4. Assert response contains roles, Q&A boundary, talk-time, and timeline

**Expected Result**: Full analysis object returned within 30 s; all top-level fields populated.

**Code Sample**:
```typescript
it('should produce a complete panel analysis from diarized segments', async () => {
  const sessionId = await seedDiarizedSession('60min-panel-fixture.json');
  await panelService.analyze(sessionId);

  const analysis = await waitFor(() =>
    apiClient.get(`/sessions/${sessionId}/panel-analysis`),
    { until: r => r.data.status === 'COMPLETE', timeout: 30000 }
  );

  expect(analysis.data.roles.length).toBeGreaterThan(0);
  expect(analysis.data.qaBoundary).not.toBeNull();
  expect(analysis.data.talkTime).toBeDefined();
});
```

---

#### TC-F1-I1.2: Panel Analysis Re-trigger on Transcript Update
**Objective**: Verify that updating a transcript segment (e.g., a correction) triggers re-analysis and overwrites the previous `panel_analysis` record.

**Test Steps**:
1. Seed and analyze a session
2. Patch a segment text via `PUT /sessions/{id}/segments/{segId}`
3. Wait for re-analysis to complete
4. Assert `panel_analysis.updated_at` is newer than the original

**Expected Result**: `updated_at` timestamp advanced; `roles` array reflects updated segment content.

**Code Sample**:
```typescript
it('should re-analyze panel when transcript segment is updated', async () => {
  const { sessionId, originalUpdatedAt } = await seedAndAnalyze();
  await apiClient.put(`/sessions/${sessionId}/segments/seg-001`, { text: 'Updated remark.' });

  const updated = await waitFor(() =>
    apiClient.get(`/sessions/${sessionId}/panel-analysis`),
    { until: r => r.data.updatedAt > originalUpdatedAt, timeout: 15000 }
  );

  expect(new Date(updated.data.updatedAt).getTime()).toBeGreaterThan(
    new Date(originalUpdatedAt).getTime()
  );
});
```

---

### 2.2 UI Navigation Integration

#### TC-F1-I2.1: Panelist Jump Navigation via Timeline
**Objective**: Verify the front-end correctly navigates the media player to a panelist's speaking block when user clicks a timeline entry.

**Test Steps**:
1. Load a session with a complete panel analysis in the app
2. Render the PanelTimeline component
3. Click Speaker_1's first timeline block
4. Assert media player `currentTime` advances to that block's `startMs / 1000`

**Expected Result**: Player seeks to correct position within ±500 ms.

**Code Sample**:
```typescript
it('should seek media player to panelist block on timeline click', async () => {
  render(<PanelTimeline sessionId="session-abc" playerRef={mockPlayerRef} />);
  await screen.findByTestId('timeline-block-Speaker_1-0');

  fireEvent.click(screen.getByTestId('timeline-block-Speaker_1-0'));

  expect(mockPlayerRef.current.currentTime).toBeCloseTo(1800, 0); // 30 min
});
```

---

#### TC-F1-I2.2: Talk-Time Chart Data Binding
**Objective**: Verify the talk-time analytics chart receives correct percentage data from the analysis API.

**Test Steps**:
1. Mock `GET /sessions/{id}/panel-analysis` returning known percentages
2. Render the TalkTimeChart component
3. Assert each chart segment's value matches the mock data

**Expected Result**: Chart segments match API response percentages within ±0.1%.

**Code Sample**:
```typescript
it('should render talk-time chart slices matching API percentages', async () => {
  mockApi.get('/sessions/s1/panel-analysis').reply(200, talkTimeFixture);
  render(<TalkTimeChart sessionId="s1" />);

  const slices = await screen.findAllByTestId(/chart-slice-/);
  expect(slices).toHaveLength(talkTimeFixture.talkTime.speakers.length);
  expect(slices[0]).toHaveAttribute('data-percent', '45.2');
});
```

---

### 2.3 Cross-service Role Resolution

#### TC-F1-I3.1: Role Labels Enriched with Speaker Identities from Feature 2
**Objective**: Verify that once Speaker Recognition (Feature 2) resolves identities, panel role records display real names rather than `Speaker_N` labels.

**Test Steps**:
1. Complete panel analysis (roles use `Speaker_0`, `Speaker_1`)
2. Complete speaker recognition (maps `Speaker_0` to "Jane Doe")
3. Fetch `GET /sessions/{id}/panel-analysis?enriched=true`
4. Assert `roles[0].displayName = 'Jane Doe'`

**Expected Result**: Enriched roles contain `displayName` from speaker identity store.

**Code Sample**:
```typescript
it('should enrich panel roles with resolved speaker names', async () => {
  await seedPanelAnalysis(sessionId);
  await seedSpeakerIdentities(sessionId, { Speaker_0: 'Jane Doe' });

  const res = await apiClient.get(`/sessions/${sessionId}/panel-analysis?enriched=true`);
  const moderator = res.data.roles.find((r: any) => r.role === 'MODERATOR');
  expect(moderator.displayName).toBe('Jane Doe');
});
```

---

#### TC-F1-I3.2: Panel Analysis Included in Session Summary Payload
**Objective**: Verify that Session Summarization (Feature 5) includes panel role and Q&A boundary data in its output.

**Test Steps**:
1. Complete panel analysis for a session
2. Trigger session summarization via `POST /sessions/{id}/summarize`
3. Assert summary payload includes `panelContext.roles` and `panelContext.qaBoundaryMs`

**Expected Result**: Summary includes non-null `panelContext` block.

**Code Sample**:
```typescript
it('should include panel context in session summary payload', async () => {
  await seedPanelAnalysis(sessionId);
  const summary = await summaryService.summarize(sessionId);
  expect(summary.panelContext).toBeDefined();
  expect(summary.panelContext.roles).toHaveLength(3);
  expect(summary.panelContext.qaBoundaryMs).toBeGreaterThan(0);
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Degenerate Speaker Configurations

#### TC-F1-E1.1: Single Speaker — No Panel Structure
**Objective**: Verify graceful handling when diarization returns only one speaker (solo keynote).

**Test Steps**:
1. Provide segments all attributed to `Speaker_0`
2. Call `classifyPanelRoles(segments)`
3. Assert result contains a warning and no `MODERATOR` assignment

**Expected Result**: `roles` array has one entry with `role: 'SOLO'`; `qa_boundary = null`; no exception thrown.

**Code Sample**:
```typescript
it('should return SOLO role and null Q&A boundary for single-speaker session', async () => {
  const result = await classifier.classifyPanelRoles(singleSpeakerFixture);
  expect(result.roles[0].role).toBe('SOLO');
  expect(result.qaBoundary).toBeNull();
  expect(result.warnings).toContain('SINGLE_SPEAKER_NO_PANEL');
});
```

---

#### TC-F1-E1.2: Two Speakers with Equal Turn Frequency
**Objective**: Verify the classifier falls back gracefully when turn-frequency heuristics cannot distinguish a moderator.

**Test Steps**:
1. Provide a transcript where two speakers alternate evenly and neither uses moderator phrasing
2. Call `classifyPanelRoles(segments)`
3. Assert both are classified as `PANELIST` and `moderatorConfidence < 0.5`

**Expected Result**: No `MODERATOR` assignment; `flags: ['AMBIGUOUS_ROLES']` in result.

**Code Sample**:
```typescript
it('should not assign MODERATOR when turn frequency is equal and no cue phrases exist', async () => {
  const result = await classifier.classifyPanelRoles(equalTurnFixture);
  result.roles.forEach(r => expect(r.role).toBe('PANELIST'));
  expect(result.flags).toContain('AMBIGUOUS_ROLES');
});
```

---

### 3.2 Extreme Session Durations

#### TC-F1-E2.1: Very Short Session (Under 5 Minutes)
**Objective**: Verify analysis completes without error on a session too short to have a meaningful Q&A section.

**Test Steps**:
1. Provide a 3-minute 2-speaker transcript
2. Call full analysis pipeline
3. Assert `qa_boundary = null` and `roles` still populated

**Expected Result**: Analysis succeeds; no Q&A boundary detected; roles assigned based on available data.

**Code Sample**:
```typescript
it('should complete analysis on sub-5-minute session without Q&A boundary', async () => {
  const result = await panelAnalyzer.analyze('short-session-fixture');
  expect(result.status).toBe('COMPLETE');
  expect(result.qaBoundary).toBeNull();
  expect(result.roles.length).toBeGreaterThan(0);
});
```

---

#### TC-F1-E2.2: Very Long Session (Over 8 Hours)
**Objective**: Verify analysis does not time out or run out of memory on an 8-hour all-day conference recording.

**Test Steps**:
1. Generate a synthetic 8-hour transcript (28,800 segments at 1 per second)
2. Trigger analysis with a 5-minute timeout
3. Assert analysis completes and timeline has reasonable block count

**Expected Result**: Analysis completes within 300 s; memory usage stays below 512 MB peak.

**Code Sample**:
```typescript
it('should analyze an 8-hour session within timeout and memory limits', async () => {
  const segments = generateSyntheticSegments({ durationHours: 8, speakerCount: 5 });
  const startMemory = process.memoryUsage().heapUsed;

  const result = await panelAnalyzer.analyze({ segments }, { timeoutMs: 300000 });

  const peakMemoryMB = (process.memoryUsage().heapUsed - startMemory) / 1048576;
  expect(result.status).toBe('COMPLETE');
  expect(peakMemoryMB).toBeLessThan(512);
}, 310000);
```

---

### 3.3 Corrupted or Incomplete Input

#### TC-F1-E3.1: Missing Timestamps in Segments
**Objective**: Verify the classifier does not crash when segment objects are missing `startMs`/`endMs`.

**Test Steps**:
1. Provide segments with `startMs = undefined`
2. Call `classifyPanelRoles(segments)`
3. Assert a `ValidationError` is thrown with a descriptive message

**Expected Result**: `ValidationError: segment.startMs is required`; no partial write to database.

**Code Sample**:
```typescript
it('should throw ValidationError when segment timestamps are missing', async () => {
  const badSegments = [{ speakerId: 'Speaker_0', text: 'Hello.' }]; // no startMs
  await expect(classifier.classifyPanelRoles(badSegments as any)).rejects.toThrow(
    ValidationError
  );
});
```

---

#### TC-F1-E3.2: Empty Transcript
**Objective**: Verify the system returns a meaningful empty-state result rather than crashing on a session with zero segments.

**Test Steps**:
1. Call `classifyPanelRoles([])`
2. Assert result contains `roles: []`, `qa_boundary: null`, and status `NO_DATA`

**Expected Result**: No exception; empty result object with `status: 'NO_DATA'`.

**Code Sample**:
```typescript
it('should return NO_DATA status for empty segment array', async () => {
  const result = await classifier.classifyPanelRoles([]);
  expect(result.status).toBe('NO_DATA');
  expect(result.roles).toHaveLength(0);
  expect(result.qaBoundary).toBeNull();
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Analysis Throughput

#### TC-F1-P1.1: Role Classification Latency — 1-Hour Session
**Objective**: Verify role classification completes within 5 seconds for a typical 1-hour, 4-speaker panel.

**Preconditions**:
- Production-equivalent NLP model loaded
- 1-hour fixture with ~7,200 segments

**Test Steps**:
1. Load 1-hour fixture
2. Start timer
3. Call `classifyPanelRoles(segments)`
4. Stop timer

**Expected Result**: Classification completes in <= 5 s; p95 across 10 runs <= 7 s.

**Code Sample**:
```typescript
it('should classify roles for a 1-hour session in under 5 seconds', async () => {
  const segments = loadFixture('1hour-4speaker-panel.json');
  const runs = await benchmark(() => classifier.classifyPanelRoles(segments), { iterations: 10 });

  expect(runs.median).toBeLessThan(5000);
  expect(runs.p95).toBeLessThan(7000);
});
```

---

#### TC-F1-P1.2: Talk-Time Computation at Scale
**Objective**: Verify talk-time analytics completes within 200 ms even for 50,000 segments.

**Test Steps**:
1. Generate 50,000 synthetic segments across 5 speakers
2. Time the `computeTalkTimeAnalytics(segments)` call

**Expected Result**: Completes in <= 200 ms; no O(n²) regression.

**Code Sample**:
```typescript
it('should compute talk-time analytics for 50k segments in under 200ms', () => {
  const segments = generateSyntheticSegments({ count: 50000, speakerCount: 5 });
  const start = performance.now();
  computeTalkTimeAnalytics(segments);
  const elapsed = performance.now() - start;
  expect(elapsed).toBeLessThan(200);
});
```

---

### 4.2 Concurrent Analysis Requests

#### TC-F1-P2.1: Concurrent Analysis — 10 Sessions Simultaneously
**Objective**: Verify the service handles 10 simultaneous panel analysis requests without degradation.

**Test Steps**:
1. Seed 10 different sessions with diarized transcripts
2. Fire 10 concurrent `panelService.analyze(sessionId)` calls
3. Await all and measure individual completion times

**Expected Result**: All 10 complete successfully; no request exceeds 30 s; no database deadlocks.

**Code Sample**:
```typescript
it('should process 10 concurrent panel analyses without errors or deadlocks', async () => {
  const sessionIds = await seedMultipleSessions(10);
  const results = await Promise.allSettled(
    sessionIds.map(id => panelService.analyze(id))
  );

  results.forEach(r => expect(r.status).toBe('fulfilled'));
  const times = (results as PromiseFulfilledResult<any>[]).map(r => r.value.durationMs);
  times.forEach(t => expect(t).toBeLessThan(30000));
});
```

---

#### TC-F1-P2.2: Database Write Performance Under Load
**Objective**: Verify `savePanelAnalysis` maintains <= 100 ms p99 write latency under 50 concurrent inserts.

**Test Steps**:
1. Generate 50 analysis result objects
2. Fire 50 concurrent `savePanelAnalysis` calls
3. Collect latencies

**Expected Result**: p99 write latency <= 100 ms; zero failures.

**Code Sample**:
```typescript
it('should sustain sub-100ms p99 write latency under 50 concurrent inserts', async () => {
  const analyses = Array.from({ length: 50 }, (_, i) => generateAnalysis(`session-${i}`));
  const latencies = await measureConcurrentWrites(analyses, savePanelAnalysis);

  const p99 = percentile(latencies, 99);
  expect(p99).toBeLessThan(100);
  expect(latencies.filter(l => l === null)).toHaveLength(0);
});
```

---

### 4.3 Memory and Resource Usage

#### TC-F1-P3.1: Memory Stability Across Repeated Analyses
**Objective**: Verify no memory leak occurs when analyzing 100 sessions sequentially.

**Test Steps**:
1. Record baseline heap usage
2. Analyze 100 sessions sequentially
3. Force GC and record final heap

**Expected Result**: Heap growth between baseline and final < 20 MB.

**Code Sample**:
```typescript
it('should not leak memory across 100 sequential analyses', async () => {
  const baseline = process.memoryUsage().heapUsed;
  for (let i = 0; i < 100; i++) {
    await panelAnalyzer.analyze(generateSingleSessionFixture(i));
  }
  global.gc?.();
  const after = process.memoryUsage().heapUsed;
  expect((after - baseline) / 1048576).toBeLessThan(20);
});
```

---

#### TC-F1-P3.2: CPU Usage During NLP Role Classification
**Objective**: Verify role classification does not spike CPU above 80% on a single-core equivalent workload.

**Test Steps**:
1. Monitor CPU usage via `pidusage` during a 2-hour fixture classification
2. Collect 1-second CPU samples during execution

**Expected Result**: No CPU sample exceeds 80%; average CPU < 50%.

**Code Sample**:
```typescript
it('should keep CPU usage under 80% during role classification', async () => {
  const samples: number[] = [];
  const monitor = setInterval(async () => {
    const stat = await pidusage(process.pid);
    samples.push(stat.cpu);
  }, 1000);

  await classifier.classifyPanelRoles(twoHourFixture);
  clearInterval(monitor);

  expect(Math.max(...samples)).toBeLessThan(80);
  expect(samples.reduce((a, b) => a + b, 0) / samples.length).toBeLessThan(50);
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
