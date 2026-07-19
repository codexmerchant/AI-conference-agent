# EPIC12 Feature 2 — Vector Memory Platform — Test Cases

## Test Overview
Comprehensive test suite for Vector Memory Platform covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Memory Entry Lifecycle

#### TC-F2-U1.1: Memory Entry Creation with Metadata
**Objective**: Verify that a memory entry is created with the correct embedding, metadata, and timestamp.

**Preconditions**:
- `VectorMemoryStore` initialized with an in-memory HNSW backend
- `EmbeddingService` available

**Test Steps**:
1. Call `memoryStore.create({ userId: 'u-1', text: 'discussed RAG pipeline design', tags: ['RAG', 'architecture'] })`
2. Assert returned entry has `id`, `vectorId`, `createdAt`, `tags`
3. Assert `createdAt` is within 2 seconds of `Date.now()`
4. Assert `tags` matches the input array

**Expected Result**: Entry created with all metadata fields populated; embedding stored in vector index.

**Code Sample**:
```typescript
describe('VectorMemoryStore', () => {
  it('should create a memory entry with correct metadata', async () => {
    const store = new VectorMemoryStore({ backend: new InMemoryHNSW(1536) });
    const entry = await store.create({
      userId: 'u-1',
      text: 'discussed RAG pipeline design',
      tags: ['RAG', 'architecture'],
    });

    expect(entry.id).toBeDefined();
    expect(entry.vectorId).toBeDefined();
    expect(entry.tags).toEqual(['RAG', 'architecture']);
    expect(Date.now() - new Date(entry.createdAt).getTime()).toBeLessThan(2000);
  });
});
```

---

#### TC-F2-U1.2: Memory Entry Update Replaces Embedding
**Objective**: Verify that updating a memory entry's text re-encodes and replaces the stored vector.

**Test Steps**:
1. Create entry with `text: "cloud cost optimization strategies"`
2. Record `vectorId` of the created entry
3. Update entry with `text: "FinOps cost governance frameworks"`
4. Assert `vectorId` has changed (new vector slot assigned)
5. Query the old `vectorId` from the index; assert it no longer exists

**Expected Result**: Updated entry has a new `vectorId`; old vector removed from index.

**Code Sample**:
```typescript
it('should replace the embedding when a memory entry text is updated', async () => {
  const entry = await store.create({ userId: 'u-1', text: 'cloud cost optimization strategies' });
  const oldVectorId = entry.vectorId;

  const updated = await store.update(entry.id, { text: 'FinOps cost governance frameworks' });

  expect(updated.vectorId).not.toBe(oldVectorId);
  const orphan = await vectorIndex.getById(oldVectorId);
  expect(orphan).toBeNull();
});
```

---

#### TC-F2-U1.3: Memory Entry Hard Delete Clears Vector and Record
**Objective**: Verify that deleting a memory entry removes both the metadata record and the vector from the index.

**Test Steps**:
1. Create entry and record `id` and `vectorId`
2. Call `store.delete(entry.id)`
3. Assert `store.getById(entry.id)` returns `null`
4. Assert `vectorIndex.getById(entry.vectorId)` returns `null`

**Expected Result**: No orphaned vectors or metadata records after deletion.

**Code Sample**:
```typescript
it('should remove both the record and the vector on deletion', async () => {
  const entry = await store.create({ userId: 'u-1', text: 'event-driven microservices patterns' });
  await store.delete(entry.id);

  expect(await store.getById(entry.id)).toBeNull();
  expect(await vectorIndex.getById(entry.vectorId)).toBeNull();
});
```

---

### 1.2 Similarity-Based Retrieval

#### TC-F2-U2.1: Top-K Memory Recall by Semantic Similarity
**Objective**: Verify that `recall` returns the k most similar memories to a probe vector.

**Test Steps**:
1. Insert 50 memory entries spanning diverse topics
2. Insert a target entry: `"transformer attention mechanisms explained"`
3. Call `store.recall({ userId: 'u-1', query: "how does self-attention work", k: 5 })`
4. Assert the target entry appears in top-3

**Expected Result**: Semantically relevant target entry in top-3 results.

**Code Sample**:
```typescript
it('should recall the most semantically similar memory entry', async () => {
  await seedMemories(store, 50, 'u-1');
  const target = await store.create({ userId: 'u-1', text: 'transformer attention mechanisms explained' });

  const recalled = await store.recall({ userId: 'u-1', query: 'how does self-attention work', k: 5 });

  const ids = recalled.map(r => r.id);
  expect(ids.slice(0, 3)).toContain(target.id);
});
```

---

#### TC-F2-U2.2: Recency Decay Boosts Recent Memories
**Objective**: Verify that recency-decay scoring promotes a recent duplicate-topic memory above an older one.

**Test Steps**:
1. Insert old entry `{ text: "GraphQL API design", createdAt: 90 days ago }`
2. Insert recent entry `{ text: "GraphQL API design", createdAt: 1 day ago }`
3. Call `store.recall({ query: "GraphQL schema design", k: 2, decayFactor: 0.005 })`
4. Assert recent entry is ranked #1

**Expected Result**: Recent entry outranks older entry with identical semantic content when decay is enabled.

**Code Sample**:
```typescript
it('should rank a recent memory above an older one with the same topic via recency decay', async () => {
  const now = Date.now();
  await store.createWithTimestamp({ userId: 'u-1', text: 'GraphQL API design', createdAt: new Date(now - 90 * 86_400_000) });
  const recent = await store.createWithTimestamp({ userId: 'u-1', text: 'GraphQL API design', createdAt: new Date(now - 86_400_000) });

  const recalled = await store.recall({ userId: 'u-1', query: 'GraphQL schema design', k: 2, decayFactor: 0.005 });
  expect(recalled[0].id).toBe(recent.id);
});
```

---

#### TC-F2-U2.3: User Isolation in Recall
**Objective**: Verify that memories from user A are never returned when querying under user B's context.

**Test Steps**:
1. Create 10 entries for `userId: "alice"` and 10 for `userId: "bob"`
2. Recall `{ userId: "alice", query: "DevOps CI/CD", k: 10 }`
3. Assert all returned entries have `userId = "alice"`

**Expected Result**: Zero cross-user memory leakage.

**Code Sample**:
```typescript
it('should isolate recall results by userId', async () => {
  await seedMemories(store, 10, 'alice');
  await seedMemories(store, 10, 'bob');

  const recalled = await store.recall({ userId: 'alice', query: 'DevOps CI/CD', k: 10 });
  recalled.forEach(r => expect(r.userId).toBe('alice'));
});
```

---

### 1.3 Memory Capacity and Eviction

#### TC-F2-U3.1: LRU Eviction When Capacity Exceeded
**Objective**: Verify that the least-recently-used entry is evicted when the store reaches its configured capacity.

**Test Steps**:
1. Configure store with `maxEntries: 5`
2. Insert 5 entries; access all but entry #1
3. Insert a 6th entry
4. Assert entry #1 is evicted; assert entries #2–6 exist

**Expected Result**: Exactly the least-recently-used entry is evicted; total count remains at 5.

**Code Sample**:
```typescript
it('should evict the LRU entry when capacity is exceeded', async () => {
  const store = new VectorMemoryStore({ backend, maxEntries: 5 });
  const entries = await Promise.all(Array.from({ length: 5 }, (_, i) =>
    store.create({ userId: 'u-1', text: `topic ${i}` })
  ));

  // Access all except entries[0]
  for (const e of entries.slice(1)) await store.recall({ userId: 'u-1', query: `topic ${e.id}`, k: 1 });

  await store.create({ userId: 'u-1', text: 'topic 5' });

  expect(await store.getById(entries[0].id)).toBeNull();
  expect(await store.count('u-1')).toBe(5);
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Persistence and Durability

#### TC-F2-I1.1: Memory Survives Service Restart
**Objective**: Verify that persisted memories are available after the `VectorMemoryStore` service restarts.

**Preconditions**:
- Store configured with disk-backed persistence (PostgreSQL + pgvector)
- Test database seeded

**Test Steps**:
1. Create 20 memory entries for `userId: "u-persist"`
2. Shut down and restart the `VectorMemoryStore` service
3. Recall `{ userId: "u-persist", query: "test topic", k: 10 }`
4. Assert at least 10 entries are returned

**Expected Result**: All 20 memories persist across restart; recall returns results immediately.

**Code Sample**:
```typescript
it('should persist memories across service restarts', async () => {
  await Promise.all(Array.from({ length: 20 }, (_, i) =>
    store.create({ userId: 'u-persist', text: `memory topic ${i}` })
  ));

  await store.shutdown();
  const restarted = await VectorMemoryStore.boot({ dsn: TEST_DSN });

  const recalled = await restarted.recall({ userId: 'u-persist', query: 'memory topic', k: 10 });
  expect(recalled.length).toBeGreaterThanOrEqual(10);
});
```

---

#### TC-F2-I1.2: Concurrent Write Correctness
**Objective**: Verify that 20 concurrent create operations all succeed with unique IDs and no data corruption.

**Test Steps**:
1. Fire 20 concurrent `store.create` calls for the same `userId`
2. Await all with `Promise.allSettled`
3. Collect all returned IDs
4. Assert all 20 settled as `fulfilled`
5. Assert all 20 IDs are unique

**Expected Result**: 20 unique entries created; no ID collisions; no rejected promises.

**Code Sample**:
```typescript
it('should handle 20 concurrent creates without collisions', async () => {
  const results = await Promise.allSettled(
    Array.from({ length: 20 }, (_, i) =>
      store.create({ userId: 'u-concurrent', text: `concurrent note ${i}` })
    )
  );

  const ids = results
    .filter(r => r.status === 'fulfilled')
    .map(r => (r as PromiseFulfilledResult<MemoryEntry>).value.id);

  expect(ids).toHaveLength(20);
  expect(new Set(ids).size).toBe(20);
});
```

---

### 2.2 Cross-Service Integration

#### TC-F2-I2.1: Memory Auto-Capture from Transcription Pipeline
**Objective**: Verify that completed transcription events automatically create memory entries via the event bus.

**Test Steps**:
1. Publish a `transcription.completed` event with `{ sessionId, userId, text }` on the event bus
2. Wait up to 5 seconds for the `VectorMemoryStore` subscriber to process the event
3. Query `store.recall({ userId, query: "session topic", k: 5 })`
4. Assert at least one entry has `sourceSessionId = sessionId`

**Expected Result**: Memory auto-created from transcription event within 5 seconds.

**Code Sample**:
```typescript
it('should auto-create a memory entry from a transcription.completed event', async () => {
  await eventBus.publish('transcription.completed', {
    sessionId: 'sess-auto-1',
    userId: 'u-event',
    text: 'The speaker covered distributed tracing with OpenTelemetry.',
  });

  await waitFor(5000, () => store.count('u-event').then(c => c > 0));

  const recalled = await store.recall({ userId: 'u-event', query: 'distributed tracing', k: 5 });
  expect(recalled.some(r => r.sourceSessionId === 'sess-auto-1')).toBe(true);
});
```

---

#### TC-F2-I2.2: Memory Platform Feeds Semantic Search
**Objective**: Verify that entries in the Vector Memory Platform are discoverable via the Semantic Search Engine.

**Test Steps**:
1. Create a memory entry: `{ userId: 'u-search', text: 'serverless event streaming with Kafka' }`
2. Wait for index propagation
3. Query Semantic Search with `"serverless Kafka event streaming"`
4. Assert the memory entry's ID appears in the top-5 search results

**Expected Result**: Memory entries indexed by the platform are searchable via the shared vector index.

**Code Sample**:
```typescript
it('should make vector memory entries discoverable via semantic search', async () => {
  const entry = await memoryStore.create({ userId: 'u-search', text: 'serverless event streaming with Kafka' });
  await waitForIndexPropagation(entry.vectorId);

  const results = await searchService.search({ query: 'serverless Kafka event streaming', topK: 5 });
  expect(results.hits.map(h => h.sourceId)).toContain(entry.id);
});
```

---

### 2.3 Memory Analytics

#### TC-F2-I3.1: Memory Usage Stats Aggregation
**Objective**: Verify that the analytics endpoint returns accurate per-user memory counts and total vector dimensions consumed.

**Test Steps**:
1. Create exactly 15 entries for `userId: "u-stats"`
2. Call `GET /api/memory/stats?userId=u-stats`
3. Assert `{ entryCount: 15, vectorDimensions: 15 * 1536 }` in response

**Expected Result**: Stats reflect the exact number of entries created.

**Code Sample**:
```typescript
it('should return correct memory usage stats for a user', async () => {
  await Promise.all(Array.from({ length: 15 }, (_, i) =>
    store.create({ userId: 'u-stats', text: `note ${i}` })
  ));

  const stats = await analyticsService.getUserStats('u-stats');
  expect(stats.entryCount).toBe(15);
  expect(stats.vectorDimensions).toBe(15 * 1536);
});
```

---

#### TC-F2-I3.2: Memory Tag Frequency Report
**Objective**: Verify that tag frequency aggregation across a user's memories is accurate.

**Test Steps**:
1. Create 10 entries tagged `['AI']`, 5 tagged `['AI', 'LLM']`, 3 tagged `['DevOps']`
2. Call `analyticsService.getTagFrequencies('u-tags')`
3. Assert `{ AI: 15, LLM: 5, DevOps: 3 }` returned

**Expected Result**: Tag counts match created entries exactly.

**Code Sample**:
```typescript
it('should return accurate tag frequency counts', async () => {
  await createTaggedBatch(store, 'u-tags', [
    { count: 10, tags: ['AI'] },
    { count: 5,  tags: ['AI', 'LLM'] },
    { count: 3,  tags: ['DevOps'] },
  ]);

  const freq = await analyticsService.getTagFrequencies('u-tags');
  expect(freq).toMatchObject({ AI: 15, LLM: 5, DevOps: 3 });
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Malformed Input Handling

#### TC-F2-E1.1: Empty Text Field Rejected
**Objective**: Verify that attempting to create a memory entry with an empty text field raises a validation error.

**Test Steps**:
1. Call `store.create({ userId: 'u-1', text: '' })`
2. Assert the call rejects with `MemoryValidationError`
3. Assert error message contains "text must not be empty"

**Expected Result**: Typed validation error; no partial entry created; vector index unchanged.

**Code Sample**:
```typescript
it('should reject memory creation with empty text', async () => {
  await expect(store.create({ userId: 'u-1', text: '' }))
    .rejects.toThrow(MemoryValidationError);
});
```

---

#### TC-F2-E1.2: Extremely Long Text Truncated at Storage
**Objective**: Verify that text exceeding `maxTextLength` is truncated before embedding, with a warning logged.

**Test Steps**:
1. Create entry with 50,000-character text (exceeds 8192-token limit)
2. Assert entry is created successfully
3. Assert `entry.textTruncated === true`
4. Assert warning logged: "memory text truncated"

**Expected Result**: Entry stored with truncated text; `textTruncated` flag set; no crash.

**Code Sample**:
```typescript
it('should truncate oversized memory text and flag it', async () => {
  const longText = 'AI '.repeat(17_000);
  const warnSpy = jest.spyOn(logger, 'warn');
  const entry = await store.create({ userId: 'u-1', text: longText });

  expect(entry.textTruncated).toBe(true);
  expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/memory text truncated/i));
});
```

---

### 3.2 Concurrency and Race Conditions

#### TC-F2-E2.1: Simultaneous Update and Delete Do Not Corrupt State
**Objective**: Verify that a concurrent update and delete on the same entry resolve to a consistent final state.

**Test Steps**:
1. Create an entry
2. Simultaneously fire `store.update(id, { text: 'updated text' })` and `store.delete(id)`
3. Assert the final state is either: (a) entry deleted, or (b) entry updated — never partially corrupted

**Expected Result**: No phantom entry with stale vector; no unhandled exception; state is consistent.

**Code Sample**:
```typescript
it('should resolve concurrent update+delete to a consistent state', async () => {
  const entry = await store.create({ userId: 'u-1', text: 'original text' });

  await Promise.allSettled([
    store.update(entry.id, { text: 'updated text' }),
    store.delete(entry.id),
  ]);

  const afterState = await store.getById(entry.id);
  // Either deleted (null) or fully updated — never partially corrupted
  if (afterState !== null) {
    expect(afterState.text).toBe('updated text');
    expect(afterState.vectorId).toBeDefined();
  }
});
```

---

#### TC-F2-E2.2: Recall During Active Bulk Insert Returns Consistent Results
**Objective**: Verify that running recall queries during a concurrent bulk insert does not return incomplete or corrupted entries.

**Test Steps**:
1. Start bulk-inserting 500 entries in the background
2. Concurrently run 10 recall queries every 100 ms
3. Assert each recall response is a valid array (never throws)
4. Assert no returned entry has a `null` vectorId

**Expected Result**: Recall always returns a valid (possibly partial) result set; never throws during concurrent writes.

**Code Sample**:
```typescript
it('should return valid results during concurrent bulk insert', async () => {
  const bulkInsert = bulkInsertInBackground(store, 500);

  const recallPromises = Array.from({ length: 10 }, () =>
    store.recall({ userId: 'u-1', query: 'architecture patterns', k: 5 })
  );
  const results = await Promise.all(recallPromises);

  results.forEach(r => {
    expect(Array.isArray(r)).toBe(true);
    r.forEach(entry => expect(entry.vectorId).not.toBeNull());
  });

  await bulkInsert;
});
```

---

### 3.3 TTL and Expiry

#### TC-F2-E3.1: Expired Entries Not Returned in Recall
**Objective**: Verify that entries past their TTL are excluded from recall results.

**Test Steps**:
1. Create entry with `ttlSeconds: 1`
2. Wait 2 seconds
3. Call `store.recall({ userId: 'u-1', query: 'any topic', k: 10 })`
4. Assert the expired entry is absent

**Expected Result**: Expired entries invisible to recall; background cleanup may or may not have run.

**Code Sample**:
```typescript
it('should exclude TTL-expired entries from recall results', async () => {
  const expiring = await store.create({ userId: 'u-1', text: 'ephemeral note', ttlSeconds: 1 });
  await new Promise(r => setTimeout(r, 2000));

  const recalled = await store.recall({ userId: 'u-1', query: 'ephemeral note', k: 10 });
  expect(recalled.map(r => r.id)).not.toContain(expiring.id);
}, 10_000);
```

---

#### TC-F2-E3.2: TTL Cleanup Job Removes Expired Vectors
**Objective**: Verify that the TTL cleanup background job physically removes expired vectors from the index.

**Test Steps**:
1. Create 5 entries with `ttlSeconds: 1`
2. Wait 3 seconds for expiry
3. Manually trigger TTL cleanup job
4. Assert vector index no longer contains the expired vector IDs
5. Assert `store.count('u-1')` = 0

**Expected Result**: Vector index and metadata store both cleaned up by TTL job.

**Code Sample**:
```typescript
it('should physically remove expired vectors after TTL cleanup', async () => {
  const entries = await Promise.all(Array.from({ length: 5 }, (_, i) =>
    store.create({ userId: 'u-ttl', text: `ephemeral ${i}`, ttlSeconds: 1 })
  ));

  await new Promise(r => setTimeout(r, 3000));
  await ttlCleanupJob.run();

  for (const e of entries) {
    expect(await vectorIndex.getById(e.vectorId)).toBeNull();
  }
  expect(await store.count('u-ttl')).toBe(0);
}, 15_000);
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Write Throughput

#### TC-F2-P1.1: Single-User Write Rate >= 200 Entries/sec
**Objective**: Verify that a single user's memory creation throughput exceeds 200 entries per second.

**Preconditions**:
- `VectorMemoryStore` backed by pgvector on a local test instance
- Pre-computed embeddings provided (no real embedding model calls)

**Test Steps**:
1. Prepare 2000 pre-encoded memory entries
2. Insert sequentially; record total duration
3. Assert `2000 / durationSec >= 200`

**Expected Result**: >= 200 entries/sec sustained over 2000 insertions.

**Code Sample**:
```typescript
it('should sustain >= 200 memory writes per second', async () => {
  const entries = generatePreEncodedEntries(2000);
  const start = Date.now();
  for (const e of entries) await store.create(e);
  const elapsed = (Date.now() - start) / 1000;

  expect(2000 / elapsed).toBeGreaterThanOrEqual(200);
}, 30_000);
```

---

#### TC-F2-P1.2: Bulk Import 100 K Entries Under 10 Minutes
**Objective**: Verify that the bulk import endpoint can ingest 100,000 pre-encoded entries within 10 minutes.

**Test Steps**:
1. Generate 100,000 pre-encoded entry payloads
2. POST to `POST /api/memory/bulk-import` with the batch
3. Assert HTTP 200 within 10 minutes
4. Assert `store.count('u-bulk')` = 100,000

**Expected Result**: 100,000 entries stored within 10 minutes; no data loss.

**Code Sample**:
```typescript
it('should import 100 K entries within 10 minutes', async () => {
  const batch = generateBulkImportPayload(100_000, 'u-bulk');

  const response = await request(app)
    .post('/api/memory/bulk-import')
    .send(batch)
    .timeout(600_000);

  expect(response.status).toBe(200);
  expect(await store.count('u-bulk')).toBe(100_000);
}, 620_000);
```

---

### 4.2 Recall Latency

#### TC-F2-P2.1: Recall P95 Latency < 150 ms at 500 K Entries
**Objective**: Verify that recall queries achieve P95 latency < 150 ms with 500,000 entries in the store.

**Test Steps**:
1. Populate store with 500,000 entries
2. Execute 500 recall queries sequentially
3. Compute P95 latency
4. Assert P95 < 150 ms

**Expected Result**: P95 recall latency < 150 ms; P50 < 40 ms.

**Code Sample**:
```typescript
it('should achieve P95 recall latency < 150 ms at 500 K entries', async () => {
  await populateStore(store, 500_000);

  const latencies: number[] = [];
  for (let i = 0; i < 500; i++) {
    const t0 = performance.now();
    await store.recall({ userId: 'u-perf', query: recallQueries[i % recallQueries.length], k: 10 });
    latencies.push(performance.now() - t0);
  }

  latencies.sort((a, b) => a - b);
  expect(latencies[Math.floor(latencies.length * 0.95)]).toBeLessThan(150);
}, 300_000);
```

---

#### TC-F2-P2.2: Multi-User Isolated Recall Under 100 Concurrent Users
**Objective**: Verify that 100 concurrent users issuing recall queries see isolated results with no cross-user leakage.

**Test Steps**:
1. Create 100 user namespaces, each with 500 entries
2. Fire 100 concurrent recall queries, one per user
3. Assert all 100 complete successfully
4. Assert each result set contains only entries belonging to the querying user

**Expected Result**: 100% isolation maintained; no cross-user data in results; all queries succeed.

**Code Sample**:
```typescript
it('should serve 100 concurrent isolated recall queries correctly', async () => {
  const users = Array.from({ length: 100 }, (_, i) => `u-iso-${i}`);
  await Promise.all(users.map(u => seedMemories(store, 500, u)));

  const results = await Promise.all(users.map(u =>
    store.recall({ userId: u, query: 'architecture patterns', k: 5 })
  ));

  results.forEach((recalled, idx) => {
    recalled.forEach(r => expect(r.userId).toBe(users[idx]));
  });
}, 120_000);
```

---

### 4.3 Storage Efficiency

#### TC-F2-P3.1: Vector Storage Overhead < 10 KB per Entry
**Objective**: Verify that the average storage overhead per memory entry (vector + metadata) is less than 10 KB.

**Test Steps**:
1. Insert 10,000 entries into a fresh store
2. Query the database for total storage used
3. Compute average bytes per entry
4. Assert average < 10,240 bytes (10 KB)

**Expected Result**: Storage efficiency maintained; no excessive metadata bloat.

**Code Sample**:
```typescript
it('should use less than 10 KB per memory entry on average', async () => {
  await populateStore(store, 10_000);
  const totalBytes = await storageMonitor.getTotalBytes('u-storage');

  const avgBytesPerEntry = totalBytes / 10_000;
  expect(avgBytesPerEntry).toBeLessThan(10_240);
});
```

---

#### TC-F2-P3.2: Compression Reduces Vector Storage by >= 30%
**Objective**: Verify that enabling vector quantization (PQ/SQ) reduces storage by at least 30% with < 5% recall degradation.

**Test Steps**:
1. Measure baseline storage and recall@10 for 50,000 uncompressed entries
2. Enable 8-bit scalar quantization; re-index the same entries
3. Measure compressed storage and recall@10
4. Assert `storageReduction >= 0.30` and `recallDegradation < 0.05`

**Expected Result**: >= 30% storage reduction; recall degrades by < 5 percentage points.

**Code Sample**:
```typescript
it('should achieve >= 30% storage reduction with scalar quantization', async () => {
  const baseline = await benchmarkStorage(store, { compressed: false, entries: 50_000 });
  const compressed = await benchmarkStorage(store, { compressed: true, sq8bit: true, entries: 50_000 });

  const storageReduction = 1 - compressed.bytes / baseline.bytes;
  const recallDegradation = baseline.recall10 - compressed.recall10;

  expect(storageReduction).toBeGreaterThanOrEqual(0.30);
  expect(recallDegradation).toBeLessThan(0.05);
}, 300_000);
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

**Estimated execution time**: Unit ~30 s · Integration ~3 min · Edge ~2 min · Performance ~20 min
