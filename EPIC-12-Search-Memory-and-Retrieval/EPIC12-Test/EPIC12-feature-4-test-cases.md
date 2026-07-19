# EPIC12 Feature 4 — Conversation Recall Engine — Test Cases

## Test Overview
Comprehensive test suite for Conversation Recall Engine covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Conversation Turn Indexing

#### TC-F4-U1.1: Individual Turn Stored with Speaker and Timestamp
**Objective**: Verify that each conversation turn is stored with correct speaker attribution and timestamp.

**Preconditions**:
- `ConversationRecallEngine` initialized with in-memory vector store
- Active conversation session `sess-001`

**Test Steps**:
1. Call `engine.indexTurn({ sessionId: 'sess-001', speakerId: 'sp-A', text: 'RAG latency is a real challenge', timestampMs: 1720000000000 })`
2. Fetch the stored turn by ID
3. Assert `speakerId === 'sp-A'`, `timestampMs === 1720000000000`, `sessionId === 'sess-001'`

**Expected Result**: Turn stored with all fields intact; vector embedding created.

**Code Sample**:
```typescript
describe('ConversationRecallEngine', () => {
  it('should index a turn with correct speaker and timestamp', async () => {
    const engine = new ConversationRecallEngine({ store: inMemoryStore, embedder });
    const turn = await engine.indexTurn({
      sessionId: 'sess-001',
      speakerId: 'sp-A',
      text: 'RAG latency is a real challenge',
      timestampMs: 1720000000000,
    });

    expect(turn.speakerId).toBe('sp-A');
    expect(turn.timestampMs).toBe(1720000000000);
    expect(turn.sessionId).toBe('sess-001');
    expect(turn.vectorId).toBeDefined();
  });
});
```

---

#### TC-F4-U1.2: Batch Turn Indexing Preserves Ordering
**Objective**: Verify that batch-indexing multiple turns preserves their chronological ordering.

**Test Steps**:
1. Index 5 turns with `timestampMs` values 100, 200, 300, 400, 500
2. Retrieve all turns for the session ordered by `timestampMs`
3. Assert turns are returned in ascending timestamp order

**Expected Result**: 5 turns stored and retrieved in chronological order.

**Code Sample**:
```typescript
it('should preserve chronological ordering of batch-indexed turns', async () => {
  const turns = [100, 200, 300, 400, 500].map((ts, i) => ({
    sessionId: 'sess-order',
    speakerId: `sp-${i}`,
    text: `turn at ${ts}ms`,
    timestampMs: ts,
  }));
  await engine.indexTurnBatch(turns);

  const retrieved = await engine.getTurnsForSession('sess-order');
  const timestamps = retrieved.map(t => t.timestampMs);
  expect(timestamps).toEqual([100, 200, 300, 400, 500]);
});
```

---

#### TC-F4-U1.3: Turn Deletion Removes Vector and Record
**Objective**: Verify that deleting a conversation turn removes both the metadata record and the vector.

**Test Steps**:
1. Index a turn and record its `id` and `vectorId`
2. Call `engine.deleteTurn(turn.id)`
3. Assert `engine.getTurnById(turn.id)` returns `null`
4. Assert `vectorStore.getById(turn.vectorId)` returns `null`

**Expected Result**: No orphaned vector or metadata after deletion.

**Code Sample**:
```typescript
it('should remove both record and vector when a turn is deleted', async () => {
  const turn = await engine.indexTurn({ sessionId: 'sess-del', speakerId: 'sp-A', text: 'ephemeral note', timestampMs: 1000 });
  await engine.deleteTurn(turn.id);

  expect(await engine.getTurnById(turn.id)).toBeNull();
  expect(await vectorStore.getById(turn.vectorId)).toBeNull();
});
```

---

### 1.2 Semantic Turn Recall

#### TC-F4-U2.1: Recall by Topic Returns Most Relevant Turns
**Objective**: Verify that `recallByTopic` returns the most semantically relevant turns for a given topic query.

**Test Steps**:
1. Index 10 turns covering diverse topics; include 2 turns specifically about "async event processing"
2. Call `engine.recallByTopic({ sessionId: 'sess-001', query: 'async event processing', k: 3 })`
3. Assert at least one of the "async event processing" turns appears in the top-3

**Expected Result**: On-topic turns ranked in top-3; off-topic turns ranked lower.

**Code Sample**:
```typescript
it('should return the most semantically relevant turns for a topic query', async () => {
  await seedDiverseTurns(engine, 'sess-topic', 10);
  const targetA = await engine.indexTurn({ sessionId: 'sess-topic', speakerId: 'sp-A', text: 'async event processing with Kafka Streams', timestampMs: 9000 });
  const targetB = await engine.indexTurn({ sessionId: 'sess-topic', speakerId: 'sp-B', text: 'event-driven async pipelines at scale', timestampMs: 9100 });

  const recalled = await engine.recallByTopic({ sessionId: 'sess-topic', query: 'async event processing', k: 3 });
  const ids = recalled.map(r => r.id);

  expect(ids).toEqual(expect.arrayContaining([targetA.id, targetB.id]));
});
```

---

#### TC-F4-U2.2: Precision@K Metric Calculation
**Objective**: Verify that the engine's built-in `precision@k` evaluator returns accurate scores against a labeled ground truth.

**Test Steps**:
1. Load labeled evaluation set: 20 queries each with ground-truth relevant turn IDs
2. For each query, run `recallByTopic` with `k=5`
3. Compute precision@5 per query using `engine.evaluatePrecision`
4. Assert mean precision@5 >= 0.75

**Expected Result**: Mean precision@5 >= 0.75 on labeled eval set.

**Code Sample**:
```typescript
it('should achieve mean precision@5 >= 0.75 on the labeled evaluation set', async () => {
  const evalSet = loadEvalSet('conversation-recall-eval-20.json');
  const precisions = await Promise.all(evalSet.map(async ({ query, relevantIds }) => {
    const hits = await engine.recallByTopic({ sessionId: 'sess-eval', query, k: 5 });
    const relevant = hits.filter(h => relevantIds.includes(h.id));
    return relevant.length / 5;
  }));

  const meanPrecision = precisions.reduce((s, p) => s + p, 0) / precisions.length;
  expect(meanPrecision).toBeGreaterThanOrEqual(0.75);
});
```

---

#### TC-F4-U2.3: Speaker-Filtered Recall Returns Only Specified Speaker
**Objective**: Verify that `speakerId` filter in `recallByTopic` restricts results to turns by that speaker.

**Test Steps**:
1. Index 10 turns alternating between `sp-A` and `sp-B`
2. Call `engine.recallByTopic({ sessionId: 'sess-speaker', query: 'infrastructure', speakerId: 'sp-A', k: 10 })`
3. Assert all returned turns have `speakerId === 'sp-A'`

**Expected Result**: Zero turns from `sp-B` returned when `speakerId: 'sp-A'` filter applied.

**Code Sample**:
```typescript
it('should restrict recall to the specified speaker', async () => {
  for (let i = 0; i < 10; i++) {
    await engine.indexTurn({ sessionId: 'sess-speaker', speakerId: i % 2 === 0 ? 'sp-A' : 'sp-B', text: `infrastructure note ${i}`, timestampMs: i * 100 });
  }

  const recalled = await engine.recallByTopic({ sessionId: 'sess-speaker', query: 'infrastructure', speakerId: 'sp-A', k: 10 });
  recalled.forEach(r => expect(r.speakerId).toBe('sp-A'));
});
```

---

### 1.3 Context Window Management

#### TC-F4-U3.1: Context Window Retrieves N Turns Around a Pivot
**Objective**: Verify that `getContextWindow` returns `n` turns before and after a specified pivot turn.

**Test Steps**:
1. Index 20 turns with sequential timestamps
2. Pick turn #10 as pivot
3. Call `engine.getContextWindow({ turnId: turn10.id, windowSize: 3 })`
4. Assert returned context contains turns #7, #8, #9 (before) and #11, #12, #13 (after)

**Expected Result**: 7-turn window centered on pivot (3 before + pivot + 3 after).

**Code Sample**:
```typescript
it('should return a symmetric context window around a pivot turn', async () => {
  const turns = await indexSequentialTurns(engine, 'sess-ctx', 20);
  const pivot = turns[9]; // turn #10 (0-indexed 9)

  const window = await engine.getContextWindow({ turnId: pivot.id, windowSize: 3 });

  const windowIds = window.map(t => t.id);
  expect(windowIds).toContain(turns[6].id); // #7
  expect(windowIds).toContain(turns[12].id); // #13
  expect(windowIds).toContain(pivot.id);
  expect(windowIds).toHaveLength(7);
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Real-Time Recall During Live Session

#### TC-F4-I1.1: Recall Available Within 1 Second of Turn Indexing
**Objective**: Verify that a turn indexed during a live session is recallable within 1 second.

**Preconditions**:
- Engine running in real-time streaming mode
- WebSocket connected for session `sess-live`

**Test Steps**:
1. Index a turn via WebSocket: `"discussed gRPC bidirectional streaming"`
2. Poll `engine.recallByTopic({ query: "gRPC streaming", k: 3 })` every 100 ms for up to 1 second
3. Assert the new turn appears in results within 1 second of indexing

**Expected Result**: New turn recallable within 1 second; real-time recall confirmed.

**Code Sample**:
```typescript
it('should make a new turn recallable within 1 second of indexing', async () => {
  const turn = await engine.indexTurn({
    sessionId: 'sess-live',
    speakerId: 'sp-A',
    text: 'discussed gRPC bidirectional streaming',
    timestampMs: Date.now(),
  });

  await waitFor(1000, async () => {
    const hits = await engine.recallByTopic({ sessionId: 'sess-live', query: 'gRPC streaming', k: 3 });
    return hits.some(h => h.id === turn.id);
  });
}, 5000);
```

---

#### TC-F4-I1.2: Incremental Session Recall Across Multiple Turns
**Objective**: Verify that recall after each of 20 incremental turns returns increasingly relevant results.

**Test Steps**:
1. Index 20 turns sequentially about "feature flags and gradual rollouts"
2. After every 5th turn, call `recallByTopic({ query: "feature flag rollout", k: 5 })`
3. Assert precision@5 improves (or stays constant) as more turns are indexed

**Expected Result**: Recall precision non-decreasing as more relevant turns are indexed.

**Code Sample**:
```typescript
it('should improve recall precision as more turns are indexed', async () => {
  const precisions: number[] = [];
  for (let i = 0; i < 20; i++) {
    await engine.indexTurn({ sessionId: 'sess-inc', speakerId: 'sp-A', text: `feature flag rollout strategy part ${i}`, timestampMs: i * 500 });
    if ((i + 1) % 5 === 0) {
      const hits = await engine.recallByTopic({ sessionId: 'sess-inc', query: 'feature flag rollout', k: 5 });
      const relevant = hits.filter(h => h.text.includes('feature flag'));
      precisions.push(relevant.length / 5);
    }
  }

  for (let i = 1; i < precisions.length; i++) {
    expect(precisions[i]).toBeGreaterThanOrEqual(precisions[i - 1]);
  }
});
```

---

### 2.2 Cross-Session Recall

#### TC-F4-I2.1: Recall Across Multiple Sessions for a User
**Objective**: Verify that `recallAcrossSessions` returns relevant turns from multiple sessions for the same user.

**Test Steps**:
1. Index 10 turns in `sess-A` and 10 in `sess-B` for `userId: "u-cross"`, both about "data lineage"
2. Call `engine.recallAcrossSessions({ userId: 'u-cross', query: 'data lineage tracking', k: 10 })`
3. Assert results contain turns from both sessions

**Expected Result**: Hits drawn from >= 2 distinct sessions.

**Code Sample**:
```typescript
it('should retrieve relevant turns from multiple sessions', async () => {
  await seedSessionTurns(engine, 'u-cross', 'sess-A', 10, 'data lineage');
  await seedSessionTurns(engine, 'u-cross', 'sess-B', 10, 'data lineage');

  const recalled = await engine.recallAcrossSessions({ userId: 'u-cross', query: 'data lineage tracking', k: 10 });
  const sessions = new Set(recalled.map(r => r.sessionId));
  expect(sessions.size).toBeGreaterThanOrEqual(2);
});
```

---

#### TC-F4-I2.2: Session Isolation — No Cross-User Turn Leakage
**Objective**: Verify that cross-session recall never surfaces turns belonging to a different user.

**Test Steps**:
1. Index 5 turns for `userId: "alice"` in `sess-A`
2. Index 5 turns for `userId: "bob"` in `sess-B`
3. Call `engine.recallAcrossSessions({ userId: 'alice', query: 'platform engineering', k: 10 })`
4. Assert all returned turns have `userId === 'alice'`

**Expected Result**: Zero bob's turns returned in alice's recall.

**Code Sample**:
```typescript
it('should never leak turns from another user in cross-session recall', async () => {
  await seedSessionTurns(engine, 'alice', 'sess-A', 5, 'platform engineering');
  await seedSessionTurns(engine, 'bob',   'sess-B', 5, 'platform engineering');

  const recalled = await engine.recallAcrossSessions({ userId: 'alice', query: 'platform engineering', k: 10 });
  recalled.forEach(r => expect(r.userId).toBe('alice'));
});
```

---

### 2.3 Recall Quality Integration

#### TC-F4-I3.1: Recall Integrated with Conversation Context Injector
**Objective**: Verify that recalled turns are correctly injected into the LLM context window by the context injector.

**Test Steps**:
1. Index 5 semantically relevant turns for query "service mesh observability"
2. Call `contextInjector.buildPromptContext({ userId: 'u-1', query: 'service mesh observability', maxTokens: 2000 })`
3. Assert the context contains at least 3 recalled turns formatted as conversation history
4. Assert total token count <= 2000

**Expected Result**: Context injector uses recall engine output; token budget respected.

**Code Sample**:
```typescript
it('should inject recalled turns into the LLM context within token budget', async () => {
  await seedSessionTurns(engine, 'u-1', 'sess-svc', 5, 'service mesh observability');

  const ctx = await contextInjector.buildPromptContext({ userId: 'u-1', query: 'service mesh observability', maxTokens: 2000 });

  expect(ctx.turns.length).toBeGreaterThanOrEqual(3);
  expect(ctx.estimatedTokens).toBeLessThanOrEqual(2000);
});
```

---

#### TC-F4-I3.2: Recall Precision@5 >= 0.80 on Realistic Conference Transcript
**Objective**: Verify that recall precision@5 meets the 0.80 threshold on a real conference transcript fixture.

**Test Steps**:
1. Index the 200-turn "KubeCon-2025-day1" fixture transcript
2. Run the 15 labeled evaluation queries from `kubecon-eval-queries.json`
3. Compute precision@5 per query; average across all
4. Assert mean precision@5 >= 0.80

**Expected Result**: Mean precision@5 >= 0.80 on a realistic transcript.

**Code Sample**:
```typescript
it('should achieve mean precision@5 >= 0.80 on the KubeCon 2025 transcript fixture', async () => {
  await indexTranscriptFixture(engine, 'kubecon-2025-day1.json', 'sess-kubecon');
  const evalQueries = loadEvalSet('kubecon-eval-queries.json');

  const precisions = await Promise.all(evalQueries.map(async ({ query, relevantIds }) => {
    const hits = await engine.recallByTopic({ sessionId: 'sess-kubecon', query, k: 5 });
    return hits.filter(h => relevantIds.includes(h.id)).length / 5;
  }));

  const mean = precisions.reduce((s, p) => s + p, 0) / precisions.length;
  expect(mean).toBeGreaterThanOrEqual(0.80);
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Degenerate Conversations

#### TC-F4-E1.1: Single-Turn Session Recall Returns That Turn
**Objective**: Verify that a session with only one indexed turn returns that turn as the top result for any relevant query.

**Test Steps**:
1. Index one turn: `"eBPF for kernel-level tracing without overhead"`
2. Call `engine.recallByTopic({ sessionId: 'sess-single', query: 'eBPF kernel tracing', k: 5 })`
3. Assert the single turn is returned as the only result

**Expected Result**: `[turn]` returned; `hits.length === 1`.

**Code Sample**:
```typescript
it('should return the only turn for a single-turn session', async () => {
  const turn = await engine.indexTurn({ sessionId: 'sess-single', speakerId: 'sp-A', text: 'eBPF for kernel-level tracing without overhead', timestampMs: 1000 });

  const recalled = await engine.recallByTopic({ sessionId: 'sess-single', query: 'eBPF kernel tracing', k: 5 });
  expect(recalled).toHaveLength(1);
  expect(recalled[0].id).toBe(turn.id);
});
```

---

#### TC-F4-E1.2: All Turns from Same Speaker Returns Correct Speaker Filter
**Objective**: Verify that filtering by a speaker who authored all turns returns all turns (no under-filtering).

**Test Steps**:
1. Index 5 turns, all by `sp-mono`
2. Recall with `speakerId: 'sp-mono', k: 10`
3. Assert all 5 turns are returned

**Expected Result**: All 5 turns returned; no accidental filtering.

**Code Sample**:
```typescript
it('should return all turns when the filter matches the only speaker', async () => {
  for (let i = 0; i < 5; i++) {
    await engine.indexTurn({ sessionId: 'sess-mono', speakerId: 'sp-mono', text: `note ${i}`, timestampMs: i * 100 });
  }

  const recalled = await engine.recallByTopic({ sessionId: 'sess-mono', query: 'note', speakerId: 'sp-mono', k: 10 });
  expect(recalled).toHaveLength(5);
});
```

---

### 3.2 High-Volume Session Edge Cases

#### TC-F4-E2.1: Session with 10,000 Turns Does Not OOM
**Objective**: Verify that indexing a 10,000-turn session and performing recall does not exhaust memory.

**Test Steps**:
1. Index 10,000 turns in a single session
2. Perform 10 recall queries
3. Assert process memory stays below 2 GB during the test
4. Assert recalls succeed and return valid results

**Expected Result**: No OOM; recall succeeds for a 10 K-turn session.

**Code Sample**:
```typescript
it('should handle a 10 K-turn session without memory exhaustion', async () => {
  await indexTurnsInBatches(engine, 'sess-huge', 10_000, 500);

  const memBefore = process.memoryUsage().heapUsed;
  const results = await Promise.all(Array.from({ length: 10 }, (_, i) =>
    engine.recallByTopic({ sessionId: 'sess-huge', query: recallQueries[i], k: 5 })
  ));
  const memAfter = process.memoryUsage().heapUsed;

  results.forEach(r => expect(Array.isArray(r)).toBe(true));
  expect(memAfter - memBefore).toBeLessThan(500 * 1024 * 1024); // < 500 MB delta
}, 120_000);
```

---

#### TC-F4-E2.2: Recall from an Empty Session Returns Empty Array
**Objective**: Verify that querying a session with no indexed turns returns `[]` without error.

**Test Steps**:
1. Do not index any turns for `sess-empty`
2. Call `engine.recallByTopic({ sessionId: 'sess-empty', query: 'any topic', k: 5 })`
3. Assert `[]` returned; no exception

**Expected Result**: Empty array returned; no throw.

**Code Sample**:
```typescript
it('should return empty array for recall on a session with no turns', async () => {
  const recalled = await engine.recallByTopic({ sessionId: 'sess-empty', query: 'any topic', k: 5 });
  expect(recalled).toEqual([]);
});
```

---

### 3.3 Timestamp and Ordering Edge Cases

#### TC-F4-E3.1: Turns with Identical Timestamps Ordered by Insertion Order
**Objective**: Verify that turns sharing the same `timestampMs` are returned in stable insertion order.

**Test Steps**:
1. Index 3 turns all with `timestampMs: 5000`
2. Retrieve session turns ordered by timestamp
3. Assert turns are ordered by insertion sequence (stable sort)

**Expected Result**: Stable sort preserves insertion order for ties.

**Code Sample**:
```typescript
it('should use stable sort for turns with identical timestamps', async () => {
  const a = await engine.indexTurn({ sessionId: 'sess-stable', speakerId: 'sp-A', text: 'first', timestampMs: 5000 });
  const b = await engine.indexTurn({ sessionId: 'sess-stable', speakerId: 'sp-B', text: 'second', timestampMs: 5000 });
  const c = await engine.indexTurn({ sessionId: 'sess-stable', speakerId: 'sp-C', text: 'third', timestampMs: 5000 });

  const turns = await engine.getTurnsForSession('sess-stable');
  expect(turns.map(t => t.id)).toEqual([a.id, b.id, c.id]);
});
```

---

#### TC-F4-E3.2: Out-of-Order Turn Ingestion Still Returns Correct Chronology
**Objective**: Verify that turns indexed out of timestamp order are returned in correct chronological sequence.

**Test Steps**:
1. Index turns with timestamps: 3000, 1000, 2000 (out of order)
2. Retrieve `getTurnsForSession` ordered by timestamp
3. Assert order: 1000, 2000, 3000

**Expected Result**: Correct chronological order regardless of indexing sequence.

**Code Sample**:
```typescript
it('should sort out-of-order turns chronologically on retrieval', async () => {
  await engine.indexTurn({ sessionId: 'sess-ooo', speakerId: 'sp-A', text: 'third turn', timestampMs: 3000 });
  await engine.indexTurn({ sessionId: 'sess-ooo', speakerId: 'sp-B', text: 'first turn', timestampMs: 1000 });
  await engine.indexTurn({ sessionId: 'sess-ooo', speakerId: 'sp-C', text: 'second turn', timestampMs: 2000 });

  const turns = await engine.getTurnsForSession('sess-ooo');
  expect(turns.map(t => t.timestampMs)).toEqual([1000, 2000, 3000]);
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Indexing Latency

#### TC-F4-P1.1: Single Turn Indexing P99 < 50 ms
**Objective**: Verify that single-turn indexing (encode + insert) completes at P99 < 50 ms.

**Test Steps**:
1. Execute 500 individual `indexTurn` calls sequentially
2. Record per-call latency
3. Compute P99 latency
4. Assert P99 < 50 ms

**Expected Result**: P99 single-turn indexing latency < 50 ms.

**Code Sample**:
```typescript
it('should index single turns at P99 < 50 ms', async () => {
  const latencies: number[] = [];
  for (let i = 0; i < 500; i++) {
    const t0 = performance.now();
    await engine.indexTurn({ sessionId: 'sess-latency', speakerId: 'sp-A', text: `turn content ${i}`, timestampMs: i * 100 });
    latencies.push(performance.now() - t0);
  }
  latencies.sort((a, b) => a - b);
  expect(latencies[Math.floor(latencies.length * 0.99)]).toBeLessThan(50);
}, 60_000);
```

---

#### TC-F4-P1.2: Batch Turn Indexing >= 2000 Turns/sec
**Objective**: Verify that batch turn indexing achieves >= 2000 turns per second.

**Test Steps**:
1. Prepare 20,000 pre-encoded turn payloads
2. Call `engine.indexTurnBatch(batch)`
3. Assert `20000 / durationSec >= 2000`

**Expected Result**: Batch indexing throughput >= 2000 turns/sec.

**Code Sample**:
```typescript
it('should index turns at >= 2000 turns/sec in batch mode', async () => {
  const batch = generatePreEncodedTurns(20_000, 'sess-batch');
  const start = Date.now();
  await engine.indexTurnBatch(batch);
  const elapsed = (Date.now() - start) / 1000;

  expect(20_000 / elapsed).toBeGreaterThanOrEqual(2000);
}, 60_000);
```

---

### 4.2 Recall Latency

#### TC-F4-P2.1: Recall P95 < 100 ms for 50 K Turns
**Objective**: Verify that topic recall completes at P95 < 100 ms with 50,000 turns in the session.

**Test Steps**:
1. Index 50,000 turns into a single session
2. Run 200 recall queries
3. Compute P95 latency
4. Assert P95 < 100 ms

**Expected Result**: P95 recall latency < 100 ms at 50 K turns.

**Code Sample**:
```typescript
it('should achieve P95 recall latency < 100 ms at 50 K turns', async () => {
  await indexTurnsInBatches(engine, 'sess-large', 50_000, 1000);

  const latencies: number[] = [];
  for (let i = 0; i < 200; i++) {
    const t0 = performance.now();
    await engine.recallByTopic({ sessionId: 'sess-large', query: queries[i % queries.length], k: 10 });
    latencies.push(performance.now() - t0);
  }

  latencies.sort((a, b) => a - b);
  expect(latencies[Math.floor(latencies.length * 0.95)]).toBeLessThan(100);
}, 300_000);
```

---

#### TC-F4-P2.2: Cross-Session Recall P95 < 300 ms Across 100 Sessions
**Objective**: Verify that cross-session recall completes at P95 < 300 ms searching across 100 sessions.

**Test Steps**:
1. Create 100 sessions, each with 200 turns = 20,000 total turns
2. Run 100 cross-session recall queries
3. Assert P95 < 300 ms

**Expected Result**: P95 cross-session recall < 300 ms.

**Code Sample**:
```typescript
it('should achieve P95 cross-session recall < 300 ms across 100 sessions', async () => {
  await Promise.all(Array.from({ length: 100 }, (_, i) =>
    indexTurnsInBatches(engine, `sess-${i}`, 200, 200, 'u-cross-perf')
  ));

  const latencies: number[] = [];
  for (let i = 0; i < 100; i++) {
    const t0 = performance.now();
    await engine.recallAcrossSessions({ userId: 'u-cross-perf', query: queries[i % queries.length], k: 10 });
    latencies.push(performance.now() - t0);
  }

  latencies.sort((a, b) => a - b);
  expect(latencies[Math.floor(latencies.length * 0.95)]).toBeLessThan(300);
}, 120_000);
```

---

### 4.3 Context Window Performance

#### TC-F4-P3.1: Context Window Retrieval < 20 ms
**Objective**: Verify that `getContextWindow` completes in < 20 ms regardless of session size.

**Test Steps**:
1. Index 5000 turns into a session
2. Pick a pivot turn in the middle
3. Call `getContextWindow({ turnId, windowSize: 10 })` 100 times
4. Assert P99 < 20 ms

**Expected Result**: Context window retrieval P99 < 20 ms.

**Code Sample**:
```typescript
it('should retrieve a context window at P99 < 20 ms', async () => {
  await indexTurnsInBatches(engine, 'sess-window', 5000, 1000);
  const turns = await engine.getTurnsForSession('sess-window');
  const pivot = turns[2500];

  const latencies: number[] = [];
  for (let i = 0; i < 100; i++) {
    const t0 = performance.now();
    await engine.getContextWindow({ turnId: pivot.id, windowSize: 10 });
    latencies.push(performance.now() - t0);
  }

  latencies.sort((a, b) => a - b);
  expect(latencies[Math.floor(latencies.length * 0.99)]).toBeLessThan(20);
}, 60_000);
```

---

#### TC-F4-P3.2: Recall Quality Maintained Under 50 Concurrent Users
**Objective**: Verify that recall precision@5 stays >= 0.75 under 50 concurrent recall requests.

**Test Steps**:
1. Index a shared session with 2000 turns
2. Fire 50 concurrent `recallByTopic` calls with labeled queries
3. Compute precision@5 per result
4. Assert mean precision@5 >= 0.75

**Expected Result**: Recall quality maintained under concurrency load.

**Code Sample**:
```typescript
it('should maintain precision@5 >= 0.75 under 50 concurrent recall requests', async () => {
  await indexTranscriptFixture(engine, 'conference-2025-large.json', 'sess-concurrent');
  const evalSet = loadEvalSet('concurrent-eval-50.json');

  const results = await Promise.all(evalSet.map(({ query, relevantIds }) =>
    engine.recallByTopic({ sessionId: 'sess-concurrent', query, k: 5 }).then(hits => ({
      precision: hits.filter(h => relevantIds.includes(h.id)).length / 5,
    }))
  ));

  const mean = results.reduce((s, r) => s + r.precision, 0) / results.length;
  expect(mean).toBeGreaterThanOrEqual(0.75);
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

**Estimated execution time**: Unit ~45 s · Integration ~3 min · Edge ~2 min · Performance ~25 min
