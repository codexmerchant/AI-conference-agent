# EPIC06 Feature 5 — Temporal Relationship Modeling — Test Cases

## Test Overview
Comprehensive test suite for Temporal Relationship Modeling covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Temporal Edge Creation

#### TC-F5-U1.1: Write a Temporally-Bounded Edge with Valid Start and End Times
**Objective**: Verify that a `met_at` edge with `validFrom` and `validTo` timestamps is correctly persisted with temporal metadata.

**Preconditions**:
- Person nodes `p-001` and `p-002` exist
- Schema version supports temporal properties on `met_at` edges

**Test Steps**:
1. Build edge payload with `validFrom: '2026-07-10T09:00:00Z'` and `validTo: '2026-07-10T09:30:00Z'`
2. Call `temporalStore.writeTemporalEdge(payload)`
3. Retrieve edge; assert `validFrom`, `validTo`, and `duration` are stored correctly

**Expected Result**: Edge stored with correct temporal bounds; `duration === 1800` seconds.

**Code Sample**:
```typescript
describe('TemporalRelationshipStore — EdgeCreation', () => {
  it('should persist a temporally-bounded met_at edge', async () => {
    const payload: TemporalEdgePayload = {
      type: 'met_at',
      sourceId: 'p-001',
      targetId: 'p-002',
      validFrom: new Date('2026-07-10T09:00:00Z'),
      validTo: new Date('2026-07-10T09:30:00Z'),
      properties: { conference: 'NeurIPS 2026' },
    };

    const result = await temporalStore.writeTemporalEdge(payload);
    const edge = await temporalStore.getEdge(result.edgeId);

    expect(edge.validFrom.toISOString()).toBe('2026-07-10T09:00:00.000Z');
    expect(edge.validTo.toISOString()).toBe('2026-07-10T09:30:00.000Z');
    expect(edge.durationSeconds).toBe(1800);
  });
});
```

---

#### TC-F5-U1.2: Open-Ended Temporal Edge Has Null `validTo`
**Objective**: Verify that an ongoing relationship (e.g., current employment) stored with `validTo: null` is handled correctly.

**Test Steps**:
1. Write a `works_for` edge with `validFrom: '2023-01-15'` and no `validTo`
2. Retrieve edge; assert `validTo === null`
3. Assert edge is returned by `getActiveAt(new Date())` query

**Expected Result**: Open-ended edge persisted; `validTo` is null; active at current time.

**Code Sample**:
```typescript
it('should handle open-ended temporal edges with null validTo', async () => {
  const result = await temporalStore.writeTemporalEdge({
    type: 'works_for',
    sourceId: 'p-001',
    targetId: 'c-001',
    validFrom: new Date('2023-01-15'),
    validTo: null,
  });

  const edge = await temporalStore.getEdge(result.edgeId);
  expect(edge.validTo).toBeNull();

  const active = await temporalStore.getActiveAt('p-001', new Date());
  expect(active.some(e => e.id === result.edgeId)).toBe(true);
});
```

---

#### TC-F5-U1.3: Reject Edge with `validTo` Before `validFrom`
**Objective**: Verify that a temporal edge where `validTo` precedes `validFrom` throws `TemporalBoundsError`.

**Test Steps**:
1. Build edge with `validFrom: '2026-07-10T10:00:00Z'` and `validTo: '2026-07-10T09:00:00Z'`
2. Call `temporalStore.writeTemporalEdge(payload)`
3. Assert `TemporalBoundsError` is thrown

**Expected Result**: Write rejected; error message specifies invalid time range.

**Code Sample**:
```typescript
it('should reject an edge where validTo precedes validFrom', async () => {
  await expect(
    temporalStore.writeTemporalEdge({
      type: 'met_at',
      sourceId: 'p-001',
      targetId: 'p-002',
      validFrom: new Date('2026-07-10T10:00:00Z'),
      validTo: new Date('2026-07-10T09:00:00Z'),
    })
  ).rejects.toThrow(TemporalBoundsError);
});
```

---

### 1.2 Point-in-Time Query

#### TC-F5-U2.1: `getActiveAt` Returns Only Edges Valid at the Specified Timestamp
**Objective**: Verify that `getActiveAt(nodeId, timestamp)` returns only edges whose temporal bounds include the given timestamp.

**Preconditions**:
- `p-001` has 3 edges: one valid July 10, one valid July 12, one open-ended from July 5

**Test Steps**:
1. Query `temporalStore.getActiveAt('p-001', new Date('2026-07-10T12:00:00Z'))`
2. Assert edge valid July 10 is returned
3. Assert edge starting July 12 is NOT returned
4. Assert open-ended edge (from July 5) IS returned

**Expected Result**: 2 active edges returned; July 12 edge excluded; open-ended edge included.

**Code Sample**:
```typescript
describe('TemporalRelationshipStore — PointInTime', () => {
  it('should return only edges valid at the specified timestamp', async () => {
    const queryTime = new Date('2026-07-10T12:00:00Z');
    const edges = await temporalStore.getActiveAt('p-001', queryTime);

    const ids = edges.map(e => e.id);
    expect(ids).toContain('edge-july10');
    expect(ids).not.toContain('edge-july12');
    expect(ids).toContain('edge-open-ended');
  });
});
```

---

#### TC-F5-U2.2: `getActiveAt` with Edge Type Filter
**Objective**: Verify that `getActiveAt` with `edgeType: 'works_for'` returns only employment edges active at the query time.

**Test Steps**:
1. `p-001` has active `met_at` and `works_for` edges at query time
2. Call `getActiveAt('p-001', queryTime, { edgeType: 'works_for' })`
3. Assert only `works_for` edges are returned

**Expected Result**: Only `works_for` edges returned; `met_at` edges excluded.

**Code Sample**:
```typescript
it('should filter getActiveAt results by edge type', async () => {
  const edges = await temporalStore.getActiveAt('p-001', new Date('2026-07-10T12:00:00Z'), { edgeType: 'works_for' });
  expect(edges.every(e => e.type === 'works_for')).toBe(true);
});
```

---

#### TC-F5-U2.3: `getActiveAt` with Future Timestamp Returns Empty for Non-Open-Ended Edges
**Objective**: Verify that a far-future timestamp query returns only open-ended edges and no closed-bound edges.

**Test Steps**:
1. Query `getActiveAt('p-001', new Date('2099-01-01'))` where all edges except open-ended ones have expired
2. Assert only open-ended (`validTo: null`) edges are returned

**Expected Result**: Only open-ended edges returned for far-future query.

**Code Sample**:
```typescript
it('should return only open-ended edges for a far-future timestamp', async () => {
  const edges = await temporalStore.getActiveAt('p-001', new Date('2099-01-01'));
  expect(edges.every(e => e.validTo === null)).toBe(true);
});
```

---

### 1.3 Temporal Range Query

#### TC-F5-U3.1: `getEdgesInRange` Returns All Edges Overlapping with a Date Window
**Objective**: Verify that `getEdgesInRange(nodeId, fromDate, toDate)` returns any edge whose validity period overlaps with the query window.

**Test Steps**:
1. Create edges: A (July 5–July 15), B (July 12–July 20), C (July 18–July 25)
2. Query window: July 10–July 14
3. Call `getEdgesInRange('p-001', new Date('2026-07-10'), new Date('2026-07-14'))`
4. Assert edges A and B are returned (overlap); edge C is not (starts after window)

**Expected Result**: Edges A and B returned; edge C excluded.

**Code Sample**:
```typescript
describe('TemporalRelationshipStore — RangeQuery', () => {
  it('should return edges overlapping with the query window', async () => {
    const edges = await temporalStore.getEdgesInRange('p-001', new Date('2026-07-10'), new Date('2026-07-14'));
    const ids = edges.map(e => e.id);

    expect(ids).toContain('edge-A');
    expect(ids).toContain('edge-B');
    expect(ids).not.toContain('edge-C');
  });
});
```

---

#### TC-F5-U3.2: Temporal Range Query for a Conference Day
**Objective**: Verify that querying a single calendar day returns all `met_at` edges active during that day for a given node.

**Test Steps**:
1. Call `getEdgesInRange('p-001', new Date('2026-07-10T00:00:00Z'), new Date('2026-07-10T23:59:59Z'), { edgeType: 'met_at' })`
2. Assert all returned edges have `validFrom` on July 10 or earlier AND `validTo` on July 10 or later (or null)

**Expected Result**: Only July 10 day-overlapping `met_at` edges returned.

**Code Sample**:
```typescript
it('should return all met_at edges active on a specific conference day', async () => {
  const dayStart = new Date('2026-07-10T00:00:00Z');
  const dayEnd = new Date('2026-07-10T23:59:59Z');

  const edges = await temporalStore.getEdgesInRange('p-001', dayStart, dayEnd, { edgeType: 'met_at' });
  edges.forEach(e => {
    expect(e.validFrom.getTime()).toBeLessThanOrEqual(dayEnd.getTime());
    if (e.validTo) expect(e.validTo.getTime()).toBeGreaterThanOrEqual(dayStart.getTime());
  });
});
```

---

#### TC-F5-U3.3: Chronological Ordering of Temporal Edges
**Objective**: Verify that `getEdgesInRange` returns edges in ascending order of `validFrom` when `orderBy: 'validFrom'` is specified.

**Test Steps**:
1. Seed 5 edges with shuffled `validFrom` timestamps
2. Call `getEdgesInRange` with `orderBy: 'validFrom', order: 'ASC'`
3. Assert returned edges are sorted by `validFrom` ascending

**Expected Result**: Edges in ascending `validFrom` order.

**Code Sample**:
```typescript
it('should return temporal edges in ascending validFrom order', async () => {
  const edges = await temporalStore.getEdgesInRange('p-001', startOfYear, endOfYear, { orderBy: 'validFrom', order: 'ASC' });
  for (let i = 1; i < edges.length; i++) {
    expect(edges[i].validFrom.getTime()).toBeGreaterThanOrEqual(edges[i - 1].validFrom.getTime());
  }
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Temporal Storage ↔ Graph Database

#### TC-F5-I1.1: Temporal Edge Stored as Neo4j Relationship with Temporal Properties
**Objective**: Verify that a temporal edge is stored in Neo4j with `validFrom`, `validTo`, and `durationSeconds` as relationship properties.

**Preconditions**:
- Neo4j test instance with temporal index on `met_at.validFrom`

**Test Steps**:
1. Write a temporal `met_at` edge
2. Run Cypher: `MATCH ()-[r:met_at { id: $id }]->() RETURN r.validFrom, r.validTo, r.durationSeconds`
3. Assert all three properties are present with correct values

**Expected Result**: Temporal properties persisted as relationship properties; values match input.

**Code Sample**:
```typescript
it('should store temporal properties on Neo4j relationship', async () => {
  const { edgeId } = await temporalStore.writeTemporalEdge({
    type: 'met_at', sourceId: 'p-001', targetId: 'p-002',
    validFrom: new Date('2026-07-10T09:00:00Z'), validTo: new Date('2026-07-10T09:30:00Z'),
  });

  const result = await neo4j.run('MATCH ()-[r:met_at { id: $id }]->() RETURN r', { id: edgeId });
  const props = result.records[0].get('r').properties;

  expect(props.validFrom).toBeDefined();
  expect(props.validTo).toBeDefined();
  expect(props.durationSeconds).toBe(1800);
});
```

---

#### TC-F5-I1.2: Temporal Index Enables Fast Point-in-Time Query
**Objective**: Verify that a point-in-time query uses the temporal index (no full scan) by examining the query execution plan.

**Test Steps**:
1. Execute `getActiveAt` query
2. Run `EXPLAIN` on the equivalent Cypher query
3. Assert execution plan shows `NodeIndexSeek` or `RelationshipIndexSeek`, not `AllRelationshipsScan`

**Expected Result**: Query plan uses temporal index; no full scan.

**Code Sample**:
```typescript
it('should use temporal index for getActiveAt queries', async () => {
  const plan = await neo4j.run('EXPLAIN MATCH ()-[r:met_at]->() WHERE r.validFrom <= $t AND (r.validTo IS NULL OR r.validTo >= $t) RETURN r', { t: new Date().toISOString() });
  const planText = JSON.stringify(plan.summary.plan);
  expect(planText).toMatch(/RelationshipIndexSeek|NodeIndexSeek/);
  expect(planText).not.toMatch(/AllRelationshipsScan/);
});
```

---

### 2.2 Temporal Modeling ↔ Event Streaming

#### TC-F5-I2.1: Temporal Edge Write Emits Event with Temporal Metadata
**Objective**: Verify that writing a temporal edge emits an `EDGE_CREATED` event containing `validFrom`, `validTo`, and `durationSeconds`.

**Test Steps**:
1. Subscribe to `EDGE_CREATED` events
2. Write a temporal edge
3. Assert event payload includes `validFrom`, `validTo`, `durationSeconds`

**Expected Result**: Event emitted with complete temporal metadata.

**Code Sample**:
```typescript
it('should emit EDGE_CREATED event with temporal metadata', async () => {
  const events: TemporalEdgeCreatedEvent[] = [];
  eventBus.subscribe('EDGE_CREATED', e => events.push(e));

  await temporalStore.writeTemporalEdge({ type: 'met_at', sourceId: 'p-001', targetId: 'p-002', validFrom: new Date('2026-07-10T09:00:00Z'), validTo: new Date('2026-07-10T09:30:00Z') });

  await waitFor(() => events.length > 0, { timeout: 500 });
  expect(events[0].validFrom).toBeDefined();
  expect(events[0].durationSeconds).toBe(1800);
});
```

---

#### TC-F5-I2.2: Edge Expiry at `validTo` Emits `EDGE_EXPIRED` Event
**Objective**: Verify that when a temporal edge's `validTo` timestamp passes, an `EDGE_EXPIRED` event is emitted by the temporal monitor service.

**Test Steps**:
1. Write a temporal edge expiring 2 seconds from now
2. Subscribe to `EDGE_EXPIRED` events
3. Wait 3 seconds
4. Assert `EDGE_EXPIRED` event received with correct `edgeId`

**Expected Result**: `EDGE_EXPIRED` event fired within 1 second of `validTo`; `edgeId` matches.

**Code Sample**:
```typescript
it('should emit EDGE_EXPIRED event when validTo timestamp passes', async () => {
  const expiresAt = new Date(Date.now() + 2000);
  const { edgeId } = await temporalStore.writeTemporalEdge({ type: 'met_at', sourceId: 'p-001', targetId: 'p-002', validFrom: new Date(), validTo: expiresAt });

  const events: EdgeExpiredEvent[] = [];
  eventBus.subscribe('EDGE_EXPIRED', e => events.push(e));

  await new Promise(r => setTimeout(r, 3000));
  expect(events.some(e => e.edgeId === edgeId)).toBe(true);
});
```

---

### 2.3 Temporal Modeling ↔ Traversal API

#### TC-F5-I3.1: Temporal BFS Returns Only Edges Valid at the Specified Time
**Objective**: Verify that the BFS traversal API supports a `asOf` parameter that restricts traversal to edges valid at that time.

**Test Steps**:
1. Create edges: `p-001 → p-002` valid July 10; `p-001 → p-003` valid July 12
2. Call `traversalApi.bfs({ startNodeId: 'p-001', edgeTypes: ['met_at'], maxDepth: 1, asOf: new Date('2026-07-10') })`
3. Assert only `p-002` returned; `p-003` excluded

**Expected Result**: Temporally-filtered BFS; only July 10 active edges traversed.

**Code Sample**:
```typescript
it('should filter BFS traversal edges by asOf timestamp', async () => {
  const result = await traversalApi.bfs({ startNodeId: 'p-001', edgeTypes: ['met_at'], maxDepth: 1, asOf: new Date('2026-07-10T12:00:00Z') });
  const depth1 = result.levels[1].map(n => n.id);

  expect(depth1).toContain('p-002');
  expect(depth1).not.toContain('p-003');
});
```

---

#### TC-F5-I3.2: Temporal Shortest Path Uses `asOf` to Filter Edges
**Objective**: Verify that a shortest-path query with `asOf` only traverses edges valid at that point in time.

**Test Steps**:
1. Direct path `p-001 → p-005` exists only after July 12 (not before)
2. Query `shortestPath({ fromId: 'p-001', toId: 'p-005', asOf: new Date('2026-07-10') })`
3. Assert path is null or longer (no direct July 10 edge)
4. Query with `asOf: '2026-07-13'`; assert direct 1-hop path is returned

**Expected Result**: `asOf` correctly restricts which edges can be used in path-finding.

**Code Sample**:
```typescript
it('should restrict shortest path to edges valid at the asOf timestamp', async () => {
  const pathBefore = await traversalApi.shortestPath({ fromId: 'p-001', toId: 'p-005', edgeTypes: ['met_at'], asOf: new Date('2026-07-10') });
  const pathAfter = await traversalApi.shortestPath({ fromId: 'p-001', toId: 'p-005', edgeTypes: ['met_at'], asOf: new Date('2026-07-13') });

  expect(pathBefore?.hops ?? Infinity).toBeGreaterThan(1);
  expect(pathAfter!.hops).toBe(1);
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Overlapping Temporal Edges

#### TC-F5-E1.1: Two Overlapping Temporal Edges Between Same Nodes Are Both Stored
**Objective**: Verify that two `met_at` edges between `p-001` and `p-002` with overlapping time windows are both persisted as separate edges.

**Test Steps**:
1. Write edge A: July 10 09:00–09:30; edge B: July 10 09:15–09:45
2. Assert both edges are stored with unique IDs
3. Query `getActiveAt('p-001', new Date('2026-07-10T09:20:00Z'))` and assert both edges are returned

**Expected Result**: Both edges persist as separate records; both active at 09:20.

**Code Sample**:
```typescript
it('should store two overlapping temporal edges as separate records', async () => {
  const edgeA = await temporalStore.writeTemporalEdge({ type: 'met_at', sourceId: 'p-001', targetId: 'p-002', validFrom: new Date('2026-07-10T09:00:00Z'), validTo: new Date('2026-07-10T09:30:00Z') });
  const edgeB = await temporalStore.writeTemporalEdge({ type: 'met_at', sourceId: 'p-001', targetId: 'p-002', validFrom: new Date('2026-07-10T09:15:00Z'), validTo: new Date('2026-07-10T09:45:00Z') });

  expect(edgeA.edgeId).not.toBe(edgeB.edgeId);

  const active = await temporalStore.getActiveAt('p-001', new Date('2026-07-10T09:20:00Z'));
  expect(active.filter(e => [edgeA.edgeId, edgeB.edgeId].includes(e.id))).toHaveLength(2);
});
```

---

#### TC-F5-E1.2: Zero-Duration Edge (validFrom === validTo) Is Accepted as a Point-in-Time Event
**Objective**: Verify that a temporal edge where `validFrom === validTo` (an instantaneous event) is stored and queryable.

**Test Steps**:
1. Write edge with `validFrom: validTo: '2026-07-10T09:30:00Z'`
2. Assert `durationSeconds === 0`
3. Assert `getActiveAt('p-001', new Date('2026-07-10T09:30:00Z'))` returns the edge

**Expected Result**: Zero-duration event stored; returned for exact-timestamp query.

**Code Sample**:
```typescript
it('should accept and store a zero-duration temporal event', async () => {
  const t = new Date('2026-07-10T09:30:00Z');
  const { edgeId } = await temporalStore.writeTemporalEdge({ type: 'met_at', sourceId: 'p-001', targetId: 'p-002', validFrom: t, validTo: t });

  const edge = await temporalStore.getEdge(edgeId);
  expect(edge.durationSeconds).toBe(0);

  const active = await temporalStore.getActiveAt('p-001', t);
  expect(active.some(e => e.id === edgeId)).toBe(true);
});
```

---

### 3.2 Timezone and Timestamp Precision

#### TC-F5-E2.1: Timestamps Are Stored and Retrieved in UTC Regardless of Input Timezone
**Objective**: Verify that a timestamp passed in a non-UTC timezone offset is normalized to UTC in storage.

**Test Steps**:
1. Write edge with `validFrom: '2026-07-10T11:00:00+02:00'` (9:00 UTC)
2. Retrieve edge; assert `validFrom.toISOString() === '2026-07-10T09:00:00.000Z'`

**Expected Result**: Timezone offset normalized to UTC on storage.

**Code Sample**:
```typescript
it('should normalize non-UTC timestamps to UTC on write', async () => {
  const { edgeId } = await temporalStore.writeTemporalEdge({
    type: 'met_at', sourceId: 'p-001', targetId: 'p-002',
    validFrom: new Date('2026-07-10T11:00:00+02:00'),
    validTo: new Date('2026-07-10T11:30:00+02:00'),
  });

  const edge = await temporalStore.getEdge(edgeId);
  expect(edge.validFrom.toISOString()).toBe('2026-07-10T09:00:00.000Z');
});
```

---

#### TC-F5-E2.2: Millisecond Precision Timestamps Are Preserved
**Objective**: Verify that timestamps with millisecond precision (`2026-07-10T09:30:00.456Z`) are stored and retrieved without rounding.

**Test Steps**:
1. Write edge with `validFrom: '2026-07-10T09:30:00.456Z'`
2. Retrieve edge; assert `validFrom.getMilliseconds() === 456`

**Expected Result**: Millisecond precision preserved in storage and retrieval.

**Code Sample**:
```typescript
it('should preserve millisecond precision on temporal timestamps', async () => {
  const { edgeId } = await temporalStore.writeTemporalEdge({ type: 'met_at', sourceId: 'p-001', targetId: 'p-002', validFrom: new Date('2026-07-10T09:30:00.456Z'), validTo: null });
  const edge = await temporalStore.getEdge(edgeId);
  expect(edge.validFrom.getMilliseconds()).toBe(456);
});
```

---

### 3.3 Historical Data Scenarios

#### TC-F5-E3.1: Point-in-Time Query for a Date 5 Years in the Past Returns Correct Historical State
**Objective**: Verify that the knowledge graph can accurately reconstruct the state of a person's relationships as of 5 years ago.

**Test Steps**:
1. Seed historical edges with `validFrom` in 2021
2. Call `getActiveAt('p-001', new Date('2021-06-15'))`
3. Assert only edges valid in 2021 are returned; 2026 edges are excluded

**Expected Result**: Historical state correctly reconstructed; no future edges bleed into historical query.

**Code Sample**:
```typescript
it('should reconstruct historical relationship state as of 5 years ago', async () => {
  const historicalQuery = new Date('2021-06-15');
  const edges = await temporalStore.getActiveAt('p-001', historicalQuery);

  edges.forEach(e => {
    expect(e.validFrom.getFullYear()).toBeLessThanOrEqual(2021);
    if (e.validTo) expect(e.validTo.getFullYear()).toBeGreaterThanOrEqual(2021);
  });
});
```

---

#### TC-F5-E3.2: `getEdgesInRange` Correctly Handles a Range Spanning Multiple Years
**Objective**: Verify that a multi-year range query returns all edges with any overlap in that span.

**Test Steps**:
1. Seed edges from 2020 to 2026
2. Call `getEdgesInRange('p-001', new Date('2022-01-01'), new Date('2024-12-31'))`
3. Assert only edges overlapping with 2022–2024 are returned

**Expected Result**: Edges from 2020–2021 (expired before range) excluded; edges from 2025–2026 (starting after range) excluded.

**Code Sample**:
```typescript
it('should filter edges to only those overlapping a multi-year range', async () => {
  const edges = await temporalStore.getEdgesInRange('p-001', new Date('2022-01-01'), new Date('2024-12-31'));
  edges.forEach(e => {
    expect(e.validFrom.getTime()).toBeLessThanOrEqual(new Date('2024-12-31').getTime());
    if (e.validTo) expect(e.validTo.getTime()).toBeGreaterThanOrEqual(new Date('2022-01-01').getTime());
  });
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Point-in-Time Query Performance

#### TC-F5-P1.1: `getActiveAt` Latency Under 20 ms for a 100k-Edge Graph
**Objective**: Verify that `getActiveAt` completes within 20 ms at p95 on a graph with 100,000 temporal edges.

**Preconditions**:
- 100,000 temporal `met_at` edges seeded with varied time windows
- Temporal index on `validFrom` and `validTo` active

**Test Steps**:
1. Run 200 `getActiveAt` queries with random nodes and timestamps
2. Assert p95 latency ≤ 20 ms

**Expected Result**: p95 ≤ 20 ms; temporal index utilized.

**Code Sample**:
```typescript
it('should resolve getActiveAt within 20 ms at p95 on 100k edges', async () => {
  const queries = nodeIds.slice(0, 200).map(id => ({ id, time: randomPastTime() }));
  const latencies = await Promise.all(queries.map(async ({ id, time }) => {
    const t = Date.now();
    await temporalStore.getActiveAt(id, time);
    return Date.now() - t;
  }));
  expect(percentile(95, latencies)).toBeLessThanOrEqual(20);
});
```

---

#### TC-F5-P1.2: 1,000 Concurrent `getActiveAt` Calls Complete Without Degradation
**Objective**: Verify that 1,000 simultaneous `getActiveAt` queries complete within 5 seconds with p99 ≤ 50 ms.

**Test Steps**:
1. Fire 1,000 concurrent `getActiveAt` calls
2. Assert all complete within 5 seconds total
3. Assert p99 ≤ 50 ms

**Expected Result**: All queries complete; p99 ≤ 50 ms; no query failures.

**Code Sample**:
```typescript
it('should handle 1000 concurrent getActiveAt calls within 50 ms p99', async () => {
  const latencies = await Promise.all(
    Array.from({ length: 1000 }, async (_, i) => {
      const t = Date.now();
      await temporalStore.getActiveAt(nodeIds[i % nodeIds.length], new Date());
      return Date.now() - t;
    })
  );
  expect(percentile(99, latencies)).toBeLessThanOrEqual(50);
});
```

---

### 4.2 Temporal Range Query Performance

#### TC-F5-P2.1: `getEdgesInRange` for a 7-Day Window Returns Within 30 ms
**Objective**: Verify that querying edges over a 7-day conference window completes within 30 ms at p90.

**Test Steps**:
1. Seed 10,000 edges in the conference week
2. Run 100 `getEdgesInRange` calls for the full week
3. Assert p90 ≤ 30 ms

**Expected Result**: p90 ≤ 30 ms; all edges in window returned.

**Code Sample**:
```typescript
it('should retrieve edges for a 7-day range within 30 ms at p90', async () => {
  const weekStart = new Date('2026-07-07');
  const weekEnd = new Date('2026-07-13');
  const latencies = await Promise.all(nodeIds.slice(0, 100).map(async id => {
    const t = Date.now();
    await temporalStore.getEdgesInRange(id, weekStart, weekEnd);
    return Date.now() - t;
  }));
  expect(percentile(90, latencies)).toBeLessThanOrEqual(30);
});
```

---

#### TC-F5-P2.2: Temporal BFS at Depth 2 with `asOf` Filter Completes Within 80 ms
**Objective**: Verify that a temporally-filtered BFS traversal completes within 80 ms on a 10,000-node graph.

**Test Steps**:
1. Execute 50 temporal BFS queries with `asOf` set to a past conference date
2. Assert p95 ≤ 80 ms

**Expected Result**: Temporal filter does not degrade BFS performance beyond 80 ms p95.

**Code Sample**:
```typescript
it('should complete temporal BFS within 80 ms at p95', async () => {
  const asOf = new Date('2026-07-10');
  const latencies = await Promise.all(nodeIds.slice(0, 50).map(async id => {
    const t = Date.now();
    await traversalApi.bfs({ startNodeId: id, edgeTypes: ['met_at'], maxDepth: 2, asOf });
    return Date.now() - t;
  }));
  expect(percentile(95, latencies)).toBeLessThanOrEqual(80);
});
```

---

### 4.3 Write Performance Under Temporal Load

#### TC-F5-P3.1: 2,000 Temporal Edge Writes Per Second Under Ingestion Load
**Objective**: Verify that the temporal store sustains ≥ 2,000 temporal edge writes per second.

**Test Steps**:
1. Generate 20,000 temporal edge payloads
2. Write in batches of 100 concurrently
3. Assert throughput ≥ 2,000 writes/sec

**Expected Result**: ≥ 2,000 writes/sec; all edges committed with correct temporal properties.

**Code Sample**:
```typescript
it('should sustain 2000 temporal edge writes per second', async () => {
  const payloads = buildTemporalEdgePayloads(20_000);
  const start = Date.now();
  await Promise.all(chunk(payloads, 100).map(batch => temporalStore.writeBatch(batch)));
  const elapsed = (Date.now() - start) / 1000;
  expect(20_000 / elapsed).toBeGreaterThanOrEqual(2000);
});
```

---

#### TC-F5-P3.2: Temporal Index Rebuild Completes Within 45 Seconds After 50k Edge Import
**Objective**: Verify that rebuilding the temporal index after importing 50,000 edges completes within 45 seconds.

**Test Steps**:
1. Import 50,000 temporal edges
2. Trigger `temporalIndex.rebuild()`
3. Assert rebuild completes within 45 seconds

**Expected Result**: Index rebuild in ≤ 45 s; all queries use new index immediately after rebuild.

**Code Sample**:
```typescript
it('should rebuild temporal index within 45 seconds after 50k edge import', async () => {
  await bulkImportTemporalEdges(50_000);
  const start = Date.now();
  await temporalIndex.rebuild();
  expect(Date.now() - start).toBeLessThanOrEqual(45_000);
});
```

---

## Test Execution Summary

| Section | Suites | Test Cases |
|---|---|---|
| Unit Tests | 3 | 9 |
| Integration Tests | 3 | 6 |
| Edge Case Validation | 3 | 6 |
| Performance Validation | 3 | 6 |
| **Total** | **12** | **27** |

**Approximate total**: ~27 test cases covering temporal edge creation, point-in-time and range queries, temporal BFS filtering, overlapping intervals, UTC normalization, historical state reconstruction, and performance SLAs.
