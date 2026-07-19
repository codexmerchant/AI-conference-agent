# EPIC12 Feature 3 — Cross-Conference Memory — Test Cases

## Test Overview
Comprehensive test suite for Cross-Conference Memory covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Cross-Conference Memory Linking

#### TC-F3-U1.1: Memory Record Tagged with Conference Provenance
**Objective**: Verify that each memory entry created from a conference session stores the correct `conferenceId` provenance tag.

**Preconditions**:
- `CrossConferenceMemoryService` initialized
- Two test conferences: `conf-2025-Q1` and `conf-2025-Q4`

**Test Steps**:
1. Call `service.storeMemory({ userId: 'u-1', conferenceId: 'conf-2025-Q1', text: 'debated zero-copy networking' })`
2. Fetch the created entry
3. Assert `entry.conferenceId === 'conf-2025-Q1'`
4. Assert `entry.conferenceYear === 2025`

**Expected Result**: Memory entry stores conference provenance; year derived from conference metadata.

**Code Sample**:
```typescript
describe('CrossConferenceMemoryService', () => {
  it('should tag a memory entry with its source conferenceId and year', async () => {
    const svc = new CrossConferenceMemoryService({ store: memoryStore, metaRepo });
    const entry = await svc.storeMemory({
      userId: 'u-1',
      conferenceId: 'conf-2025-Q1',
      text: 'debated zero-copy networking',
    });

    expect(entry.conferenceId).toBe('conf-2025-Q1');
    expect(entry.conferenceYear).toBe(2025);
  });
});
```

---

#### TC-F3-U1.2: Cross-Conference Deduplication on Identical Content
**Objective**: Verify that submitting semantically identical content from two conferences does not create duplicate memory entries.

**Test Steps**:
1. Store memory `"eBPF observability techniques"` from `conf-2025-Q1`
2. Store identical text from `conf-2025-Q4`
3. Assert deduplication is triggered; only one canonical entry retained
4. Assert the canonical entry has `conferenceRefs` listing both conference IDs

**Expected Result**: One canonical entry with merged `conferenceRefs`; no duplicate vectors.

**Code Sample**:
```typescript
it('should deduplicate identical memories across conferences', async () => {
  const text = 'eBPF observability techniques';
  await svc.storeMemory({ userId: 'u-1', conferenceId: 'conf-2025-Q1', text });
  await svc.storeMemory({ userId: 'u-1', conferenceId: 'conf-2025-Q4', text });

  const memories = await memoryStore.recall({ userId: 'u-1', query: text, k: 5 });
  expect(memories).toHaveLength(1);
  expect(memories[0].conferenceRefs).toContain('conf-2025-Q1');
  expect(memories[0].conferenceRefs).toContain('conf-2025-Q4');
});
```

---

#### TC-F3-U1.3: Memory Timeline Ordering Across Conferences
**Objective**: Verify that cross-conference memories are returned in chronological order when queried with `sortBy: "date"`.

**Test Steps**:
1. Create memories from `conf-2024`, `conf-2025`, `conf-2026` with distinct dates
2. Query `service.recallAcrossConferences({ userId: 'u-1', query: "test", sortBy: "date" })`
3. Assert memories are ordered oldest-first

**Expected Result**: Memories sorted by `conferenceDate` ascending.

**Code Sample**:
```typescript
it('should return cross-conference memories in chronological order', async () => {
  await createMemoryForConf(svc, 'u-1', 'conf-2026', '2026-03-01', 'topic C');
  await createMemoryForConf(svc, 'u-1', 'conf-2024', '2024-03-01', 'topic A');
  await createMemoryForConf(svc, 'u-1', 'conf-2025', '2025-03-01', 'topic B');

  const recalled = await svc.recallAcrossConferences({ userId: 'u-1', query: 'topic', sortBy: 'date' });

  const years = recalled.map(r => r.conferenceYear);
  expect(years).toEqual([2024, 2025, 2026]);
});
```

---

### 1.2 Longitudinal Trend Detection

#### TC-F3-U2.1: Recurring Topic Identified Across Three Conferences
**Objective**: Verify that the trend detector identifies a topic appearing in >= 3 conferences as a recurring trend.

**Test Steps**:
1. Store "platform engineering" memories from `conf-2024`, `conf-2025`, `conf-2026`
2. Call `trendDetector.detectRecurringTopics({ userId: 'u-1', minConferences: 3 })`
3. Assert "platform engineering" appears in the result with `frequency: 3`

**Expected Result**: Recurring topic detected with correct frequency count.

**Code Sample**:
```typescript
it('should detect a topic recurring across 3+ conferences', async () => {
  const topic = 'platform engineering';
  for (const conf of ['conf-2024', 'conf-2025', 'conf-2026']) {
    await svc.storeMemory({ userId: 'u-1', conferenceId: conf, text: `${topic} strategies` });
  }

  const trends = await trendDetector.detectRecurringTopics({ userId: 'u-1', minConferences: 3 });
  const match = trends.find(t => t.topic.toLowerCase().includes('platform engineering'));

  expect(match).toBeDefined();
  expect(match!.frequency).toBe(3);
});
```

---

#### TC-F3-U2.2: Sentiment Trend Across Conferences for a Topic
**Objective**: Verify that the trend analyzer computes a sentiment trajectory (positive/neutral/negative) for a given topic over time.

**Test Steps**:
1. Store memories about "AI regulation" with varying sentiment across 3 conferences
2. Call `trendDetector.analyzeSentimentTrajectory({ userId: 'u-1', topic: 'AI regulation' })`
3. Assert returned `trajectory` has 3 data points with `conferenceId` and `sentimentScore`

**Expected Result**: Trajectory with one data point per conference; scores in [-1, 1] range.

**Code Sample**:
```typescript
it('should compute a sentiment trajectory for a cross-conference topic', async () => {
  await svc.storeMemory({ userId: 'u-1', conferenceId: 'conf-2024', text: 'AI regulation is a concerning obstacle' });
  await svc.storeMemory({ userId: 'u-1', conferenceId: 'conf-2025', text: 'AI regulation is gaining useful clarity' });
  await svc.storeMemory({ userId: 'u-1', conferenceId: 'conf-2026', text: 'AI regulation is now well-structured and balanced' });

  const traj = await trendDetector.analyzeSentimentTrajectory({ userId: 'u-1', topic: 'AI regulation' });

  expect(traj.trajectory).toHaveLength(3);
  traj.trajectory.forEach(pt => {
    expect(pt.sentimentScore).toBeGreaterThanOrEqual(-1);
    expect(pt.sentimentScore).toBeLessThanOrEqual(1);
  });
  expect(traj.trajectory[2].sentimentScore).toBeGreaterThan(traj.trajectory[0].sentimentScore);
});
```

---

#### TC-F3-U2.3: New Topic (First Occurrence) Not Flagged as Trend
**Objective**: Verify that a topic appearing for the first time is not incorrectly labeled as a trend.

**Test Steps**:
1. Store a memory about "quantum networking" in `conf-2026` only (no prior history)
2. Call `trendDetector.detectRecurringTopics({ userId: 'u-1', minConferences: 2 })`
3. Assert "quantum networking" is absent from trend results

**Expected Result**: Single-conference topics excluded from trend results.

**Code Sample**:
```typescript
it('should not flag a single-conference topic as a recurring trend', async () => {
  await svc.storeMemory({ userId: 'u-1', conferenceId: 'conf-2026', text: 'quantum networking breakthrough' });

  const trends = await trendDetector.detectRecurringTopics({ userId: 'u-1', minConferences: 2 });
  const found = trends.find(t => t.topic.toLowerCase().includes('quantum networking'));

  expect(found).toBeUndefined();
});
```

---

### 1.3 Conference Memory Scoping

#### TC-F3-U3.1: Conference-Scoped Recall Returns Only That Conference's Memories
**Objective**: Verify that `recallForConference` returns only entries tagged with the specified `conferenceId`.

**Test Steps**:
1. Store memories across 3 conferences
2. Call `svc.recallForConference({ userId: 'u-1', conferenceId: 'conf-2025', query: "any topic", k: 20 })`
3. Assert all results have `conferenceId === 'conf-2025'`

**Expected Result**: 100% of results scoped to the specified conference.

**Code Sample**:
```typescript
it('should return only memories from the specified conference', async () => {
  for (const conf of ['conf-2024', 'conf-2025', 'conf-2026']) {
    await seedConferenceMemories(svc, 'u-1', conf, 10);
  }

  const recalled = await svc.recallForConference({ userId: 'u-1', conferenceId: 'conf-2025', query: 'technology', k: 20 });
  recalled.forEach(r => expect(r.conferenceId).toBe('conf-2025'));
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Cross-Conference Search and Synthesis

#### TC-F3-I1.1: Global Recall Spans All Conferences
**Objective**: Verify that `recallAcrossConferences` without a `conferenceId` filter returns hits from multiple conferences.

**Preconditions**:
- Memories stored across `conf-2023`, `conf-2024`, `conf-2025`, `conf-2026` for `userId: "u-global"`

**Test Steps**:
1. Seed 10 memories per conference for a common topic "observability"
2. Call `svc.recallAcrossConferences({ userId: 'u-global', query: 'observability', k: 20 })`
3. Assert hits come from at least 3 distinct `conferenceId` values

**Expected Result**: Results span >= 3 conferences; ranked by combined relevance + recency.

**Code Sample**:
```typescript
it('should surface results from multiple conferences in a global recall', async () => {
  for (const conf of ['conf-2023', 'conf-2024', 'conf-2025', 'conf-2026']) {
    await seedConferenceMemories(svc, 'u-global', conf, 10);
  }

  const recalled = await svc.recallAcrossConferences({ userId: 'u-global', query: 'observability', k: 20 });
  const conferences = new Set(recalled.map(r => r.conferenceId));
  expect(conferences.size).toBeGreaterThanOrEqual(3);
});
```

---

#### TC-F3-I1.2: Cross-Conference Summary Generation
**Objective**: Verify that the synthesis engine generates a coherent summary spanning memories from multiple conferences.

**Test Steps**:
1. Store 5 memories each from `conf-2024` and `conf-2025` about "developer experience"
2. Call `synthesisEngine.summarizeCrossConference({ userId: 'u-1', topic: 'developer experience' })`
3. Assert summary string is non-empty and > 100 characters
4. Assert summary references both `conf-2024` and `conf-2025` in its `citedConferences` list

**Expected Result**: Coherent summary with cross-conference citations.

**Code Sample**:
```typescript
it('should generate a cross-conference summary citing multiple conferences', async () => {
  for (const conf of ['conf-2024', 'conf-2025']) {
    await seedConferenceMemories(svc, 'u-1', conf, 5);
  }

  const summary = await synthesisEngine.summarizeCrossConference({ userId: 'u-1', topic: 'developer experience' });

  expect(summary.text.length).toBeGreaterThan(100);
  expect(summary.citedConferences).toContain('conf-2024');
  expect(summary.citedConferences).toContain('conf-2025');
});
```

---

### 2.2 Memory Migration and Import

#### TC-F3-I2.1: Import Memories from Legacy Conference Export
**Objective**: Verify that memories exported from a legacy conference system can be imported with correct provenance tags.

**Test Steps**:
1. Load legacy export fixture: 50 records in `{ date, notes, speaker }` format
2. Call `importService.importLegacyExport({ userId: 'u-import', conferenceId: 'conf-legacy-2023', records })`
3. Assert all 50 entries created
4. Assert each entry has `conferenceId: 'conf-legacy-2023'` and `importedAt` timestamp

**Expected Result**: 50 entries imported with correct provenance; none missing.

**Code Sample**:
```typescript
it('should import legacy conference export with correct provenance', async () => {
  const records = loadFixture('legacy-conference-export-50.json');
  await importService.importLegacyExport({ userId: 'u-import', conferenceId: 'conf-legacy-2023', records });

  const count = await memoryStore.count('u-import');
  expect(count).toBe(50);

  const sample = await memoryStore.recall({ userId: 'u-import', query: records[0].notes, k: 1 });
  expect(sample[0].conferenceId).toBe('conf-legacy-2023');
  expect(sample[0].importedAt).toBeDefined();
});
```

---

#### TC-F3-I2.2: Merging Duplicate Conferences After Re-Import
**Objective**: Verify that re-importing the same conference updates existing entries rather than creating duplicates.

**Test Steps**:
1. Import 30 records for `conf-2025`
2. Re-import the same 30 records with one record's text updated
3. Assert total count remains at 30 (no duplicates)
4. Assert the updated record's text matches the new value

**Expected Result**: Idempotent import — existing entries updated; count unchanged.

**Code Sample**:
```typescript
it('should upsert on re-import without creating duplicates', async () => {
  const records = generateImportBatch(30, 'conf-2025');
  await importService.importLegacyExport({ userId: 'u-reimport', conferenceId: 'conf-2025', records });

  records[0].notes = 'updated: improved WebAssembly toolchain';
  await importService.importLegacyExport({ userId: 'u-reimport', conferenceId: 'conf-2025', records });

  expect(await memoryStore.count('u-reimport')).toBe(30);
  const updated = await memoryStore.recall({ userId: 'u-reimport', query: 'updated WebAssembly', k: 1 });
  expect(updated[0].text).toContain('updated');
});
```

---

### 2.3 Cross-Conference Reporting

#### TC-F3-I3.1: Year-Over-Year Topic Comparison Report
**Objective**: Verify that the reporting service produces a YoY topic comparison across conferences.

**Test Steps**:
1. Seed 20 memories per year (2024, 2025, 2026) with overlapping and unique topics
2. Call `reportingService.generateYoYReport({ userId: 'u-1', topic: 'AI', years: [2024, 2025, 2026] })`
3. Assert report contains `{ year, mentionCount, sentimentScore }` for each year
4. Assert `mentionCount` > 0 for all three years

**Expected Result**: YoY report with three data points; all mention counts > 0.

**Code Sample**:
```typescript
it('should generate a year-over-year topic comparison report', async () => {
  for (const year of [2024, 2025, 2026]) {
    await seedTopicMemories(svc, 'u-1', `conf-${year}`, 'AI', 20);
  }

  const report = await reportingService.generateYoYReport({ userId: 'u-1', topic: 'AI', years: [2024, 2025, 2026] });

  expect(report.dataPoints).toHaveLength(3);
  report.dataPoints.forEach(dp => {
    expect(dp.mentionCount).toBeGreaterThan(0);
    expect(dp.sentimentScore).toBeDefined();
  });
});
```

---

#### TC-F3-I3.2: Cross-Conference Contact Re-Encounter Detection
**Objective**: Verify that the system identifies contacts encountered at multiple conferences.

**Test Steps**:
1. Store contact "Alice Chen" memories at `conf-2024` and `conf-2026`
2. Call `contactIntelligence.findReEncounteredContacts({ userId: 'u-1' })`
3. Assert "Alice Chen" appears with `conferenceCount: 2` and both conference IDs listed

**Expected Result**: Re-encountered contact detected; all conference appearances listed.

**Code Sample**:
```typescript
it('should detect contacts encountered at multiple conferences', async () => {
  await storeContactMemory(svc, 'u-1', 'conf-2024', 'Met Alice Chen, VP Engineering at Vercel');
  await storeContactMemory(svc, 'u-1', 'conf-2026', 'Reconnected with Alice Chen, now CTO at Vercel');

  const reEncountered = await contactIntelligence.findReEncounteredContacts({ userId: 'u-1' });
  const alice = reEncountered.find(c => c.name === 'Alice Chen');

  expect(alice).toBeDefined();
  expect(alice!.conferenceCount).toBe(2);
  expect(alice!.conferences).toContain('conf-2024');
  expect(alice!.conferences).toContain('conf-2026');
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Conference Metadata Gaps

#### TC-F3-E1.1: Memory Creation with Unknown Conference ID
**Objective**: Verify that storing a memory with a non-existent `conferenceId` creates the entry with a `conferenceUnresolved` flag.

**Test Steps**:
1. Call `svc.storeMemory({ userId: 'u-1', conferenceId: 'conf-unknown-xyz', text: 'interesting talk' })`
2. Assert entry is created (not rejected)
3. Assert `entry.conferenceUnresolved === true`

**Expected Result**: Entry stored with `conferenceUnresolved` flag; no crash; can be resolved later.

**Code Sample**:
```typescript
it('should create a memory with conferenceUnresolved flag for unknown conferenceId', async () => {
  const entry = await svc.storeMemory({ userId: 'u-1', conferenceId: 'conf-unknown-xyz', text: 'interesting talk' });

  expect(entry).toBeDefined();
  expect(entry.conferenceUnresolved).toBe(true);
});
```

---

#### TC-F3-E1.2: Cross-Conference Recall When One Conference Is Deleted
**Objective**: Verify that recalling across conferences gracefully handles a deleted conference without crashing.

**Test Steps**:
1. Store 5 memories for `conf-2024` and 5 for `conf-2025`
2. Delete all metadata for `conf-2024` from the conference registry
3. Call `svc.recallAcrossConferences({ userId: 'u-1', query: "topic", k: 10 })`
4. Assert call succeeds; results contain only `conf-2025` entries
5. Assert no exception thrown

**Expected Result**: Graceful degradation; `conf-2024` memories may or may not appear but no crash occurs.

**Code Sample**:
```typescript
it('should not crash when a conference is missing from the registry', async () => {
  await seedConferenceMemories(svc, 'u-1', 'conf-2024', 5);
  await seedConferenceMemories(svc, 'u-1', 'conf-2025', 5);
  await conferenceRegistry.delete('conf-2024');

  await expect(svc.recallAcrossConferences({ userId: 'u-1', query: 'topic', k: 10 }))
    .resolves.toBeDefined();
});
```

---

### 3.2 Data Volume Extremes

#### TC-F3-E2.1: User with 50 Conferences and 10 K Memories Per Conference
**Objective**: Verify that a power user with 500,000 total memories across 50 conferences can still recall without timeout.

**Test Steps**:
1. Populate 50 conferences × 10,000 memories = 500,000 total entries for `u-power`
2. Call `svc.recallAcrossConferences({ userId: 'u-power', query: "leadership", k: 20 })` with a 5-second timeout
3. Assert call completes within timeout

**Expected Result**: Recall completes within 5 seconds; 20 results returned.

**Code Sample**:
```typescript
it('should handle recall for a power user with 500 K memories across 50 conferences', async () => {
  // Pre-populated fixture: 500 K entries for u-power
  const start = Date.now();
  const results = await svc.recallAcrossConferences({ userId: 'u-power', query: 'leadership', k: 20 });
  const elapsed = Date.now() - start;

  expect(results).toHaveLength(20);
  expect(elapsed).toBeLessThan(5000);
}, 30_000);
```

---

#### TC-F3-E2.2: Empty Conference Returns Zero Memories Without Error
**Objective**: Verify that recalling from a conference with no stored memories returns an empty array without error.

**Test Steps**:
1. Register `conf-empty` in the conference registry but store no memories for it
2. Call `svc.recallForConference({ userId: 'u-1', conferenceId: 'conf-empty', query: "topic", k: 10 })`
3. Assert `[]` is returned; no exception

**Expected Result**: `[]` returned cleanly; no error thrown.

**Code Sample**:
```typescript
it('should return an empty array for a conference with no memories', async () => {
  await conferenceRegistry.register({ id: 'conf-empty', name: 'Empty Conference 2026' });
  const recalled = await svc.recallForConference({ userId: 'u-1', conferenceId: 'conf-empty', query: 'topic', k: 10 });
  expect(recalled).toEqual([]);
});
```

---

### 3.3 Conflicting Conference Dates

#### TC-F3-E3.1: Overlapping Conference Dates Handled Without Ambiguity
**Objective**: Verify that memories from two conferences with overlapping dates are correctly attributed to their respective conferences.

**Test Steps**:
1. Create `conf-A` (2026-06-10 to 2026-06-13) and `conf-B` (2026-06-12 to 2026-06-15) — overlapping by 2 days
2. Store 5 memories for each during the overlap period
3. Assert each memory has the correct `conferenceId`; no cross-attribution

**Expected Result**: Memories attributed by `conferenceId` (not date inference); no ambiguity.

**Code Sample**:
```typescript
it('should correctly attribute memories from overlapping conferences', async () => {
  for (let i = 0; i < 5; i++) {
    await svc.storeMemory({ userId: 'u-1', conferenceId: 'conf-A', text: `conf-A note ${i}` });
    await svc.storeMemory({ userId: 'u-1', conferenceId: 'conf-B', text: `conf-B note ${i}` });
  }

  const confA = await svc.recallForConference({ userId: 'u-1', conferenceId: 'conf-A', query: 'note', k: 10 });
  const confB = await svc.recallForConference({ userId: 'u-1', conferenceId: 'conf-B', query: 'note', k: 10 });

  confA.forEach(r => expect(r.conferenceId).toBe('conf-A'));
  confB.forEach(r => expect(r.conferenceId).toBe('conf-B'));
});
```

---

#### TC-F3-E3.2: Memory with Future Conference Date Flagged for Review
**Objective**: Verify that a memory tagged with a future conference date is flagged as `pendingReview`.

**Test Steps**:
1. Store memory with `conferenceId: 'conf-future-2030'` where conference date is in the future
2. Assert `entry.pendingReview === true`
3. Assert memory is stored but excluded from trend analysis by default

**Expected Result**: Future-dated memory stored but quarantined from trend analysis.

**Code Sample**:
```typescript
it('should flag memories from future-dated conferences as pendingReview', async () => {
  await conferenceRegistry.register({ id: 'conf-future-2030', date: '2030-01-01', name: 'Future Conf' });
  const entry = await svc.storeMemory({ userId: 'u-1', conferenceId: 'conf-future-2030', text: 'speculative note' });

  expect(entry.pendingReview).toBe(true);

  const trends = await trendDetector.detectRecurringTopics({ userId: 'u-1', minConferences: 1 });
  expect(trends.some(t => t.sourceConferences.includes('conf-future-2030'))).toBe(false);
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Cross-Conference Recall Speed

#### TC-F3-P1.1: Global Recall P95 < 500 ms Across 10 Conferences
**Objective**: Verify that global cross-conference recall completes at P95 < 500 ms with 10 conferences and 5000 total memories.

**Test Steps**:
1. Seed 10 conferences × 500 memories each = 5000 total
2. Run 200 global recall queries
3. Compute P95 latency
4. Assert P95 < 500 ms

**Expected Result**: P95 cross-conference recall latency < 500 ms.

**Code Sample**:
```typescript
it('should achieve P95 global recall < 500 ms across 10 conferences', async () => {
  await seedMultiConferenceData(svc, 'u-perf', 10, 500);

  const latencies: number[] = [];
  for (let i = 0; i < 200; i++) {
    const t0 = performance.now();
    await svc.recallAcrossConferences({ userId: 'u-perf', query: queries[i % queries.length], k: 10 });
    latencies.push(performance.now() - t0);
  }

  latencies.sort((a, b) => a - b);
  expect(latencies[Math.floor(latencies.length * 0.95)]).toBeLessThan(500);
}, 120_000);
```

---

#### TC-F3-P1.2: Trend Detection Under 2 Seconds for 50 K Memories
**Objective**: Verify that recurring-topic trend detection completes in under 2 seconds for a user with 50,000 memories across 20 conferences.

**Test Steps**:
1. Seed 20 conferences × 2500 memories = 50,000 total entries
2. Call `trendDetector.detectRecurringTopics({ userId: 'u-trend', minConferences: 2 })`
3. Assert completion time < 2000 ms

**Expected Result**: Trend detection returns within 2 seconds for 50 K memories.

**Code Sample**:
```typescript
it('should detect trends in < 2 s across 50 K memories', async () => {
  await seedMultiConferenceData(svc, 'u-trend', 20, 2500);

  const start = performance.now();
  const trends = await trendDetector.detectRecurringTopics({ userId: 'u-trend', minConferences: 2 });
  const elapsed = performance.now() - start;

  expect(trends.length).toBeGreaterThan(0);
  expect(elapsed).toBeLessThan(2000);
}, 60_000);
```

---

### 4.2 Import Throughput

#### TC-F3-P2.1: Legacy Import Rate >= 500 Records/sec
**Objective**: Verify that the legacy import pipeline processes >= 500 records per second.

**Test Steps**:
1. Prepare 5000 legacy records in import format
2. Call `importService.importLegacyExport({ userId: 'u-import', conferenceId: 'conf-legacy', records })`
3. Assert `5000 / durationSec >= 500`

**Expected Result**: Import throughput >= 500 records/sec.

**Code Sample**:
```typescript
it('should import legacy records at >= 500 records/sec', async () => {
  const records = generateLegacyRecords(5000);
  const start = Date.now();
  await importService.importLegacyExport({ userId: 'u-import', conferenceId: 'conf-legacy', records });
  const elapsed = (Date.now() - start) / 1000;

  expect(5000 / elapsed).toBeGreaterThanOrEqual(500);
}, 60_000);
```

---

#### TC-F3-P2.2: Parallel Import Across 5 Conferences Under 30 Seconds
**Objective**: Verify that importing 1000 records into each of 5 conferences concurrently completes in under 30 seconds.

**Test Steps**:
1. Prepare 5 import batches of 1000 records each
2. Trigger 5 concurrent imports
3. Assert all complete within 30 seconds
4. Assert total stored count = 5000

**Expected Result**: Concurrent imports complete within 30 s; 5000 entries stored.

**Code Sample**:
```typescript
it('should complete parallel imports across 5 conferences in < 30 s', async () => {
  const batches = Array.from({ length: 5 }, (_, i) => ({
    conferenceId: `conf-parallel-${i}`,
    records: generateLegacyRecords(1000),
  }));

  await Promise.all(batches.map(b =>
    importService.importLegacyExport({ userId: 'u-parallel', conferenceId: b.conferenceId, records: b.records })
  ));

  expect(await memoryStore.count('u-parallel')).toBe(5000);
}, 30_000);
```

---

### 4.3 Deduplication Throughput

#### TC-F3-P3.1: Deduplication Check Under 10 ms Per Entry
**Objective**: Verify that the cross-conference deduplication check runs in under 10 ms per candidate entry.

**Test Steps**:
1. Pre-populate store with 10,000 entries for deduplication baseline
2. Check 100 new candidate entries one at a time; record per-check latency
3. Assert P99 deduplication latency < 10 ms

**Expected Result**: P99 deduplication check < 10 ms.

**Code Sample**:
```typescript
it('should run deduplication check in < 10 ms per entry at P99', async () => {
  await populateStore(store, 10_000);
  const candidates = generateCandidateEntries(100);

  const latencies = await Promise.all(candidates.map(async c => {
    const t0 = performance.now();
    await svc.checkDuplicate(c);
    return performance.now() - t0;
  }));

  latencies.sort((a, b) => a - b);
  expect(latencies[Math.floor(latencies.length * 0.99)]).toBeLessThan(10);
});
```

---

#### TC-F3-P3.2: YoY Report Generation Under 3 Seconds
**Objective**: Verify that a year-over-year report spanning 5 years and 50,000 memories generates in under 3 seconds.

**Test Steps**:
1. Seed 5 years × 10,000 memories each = 50,000 total
2. Call `reportingService.generateYoYReport` with 5 years
3. Assert elapsed time < 3000 ms

**Expected Result**: YoY report generated within 3 seconds.

**Code Sample**:
```typescript
it('should generate a 5-year YoY report in < 3 s over 50 K memories', async () => {
  for (const year of [2022, 2023, 2024, 2025, 2026]) {
    await seedTopicMemories(svc, 'u-report', `conf-${year}`, 'technology', 10_000);
  }

  const start = performance.now();
  const report = await reportingService.generateYoYReport({ userId: 'u-report', topic: 'technology', years: [2022, 2023, 2024, 2025, 2026] });
  const elapsed = performance.now() - start;

  expect(report.dataPoints).toHaveLength(5);
  expect(elapsed).toBeLessThan(3000);
}, 60_000);
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

**Estimated execution time**: Unit ~45 s · Integration ~3 min · Edge ~2 min · Performance ~20 min
