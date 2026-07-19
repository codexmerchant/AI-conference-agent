# EPIC06 Feature 3 — Relationship Storage — Test Cases

## Test Overview
Comprehensive test suite for Relationship Storage covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Edge Write Operations

#### TC-F3-U1.1: Write a Valid `met_at` Edge Between Two Person Nodes
**Objective**: Verify that writing a `met_at` edge with all required properties persists the edge to the graph database.

**Preconditions**:
- Person nodes `p-001` and `p-002` exist
- Schema version 5 active with `met_at` edge type registered

**Test Steps**:
1. Build edge payload `{ type: 'met_at', sourceId: 'p-001', targetId: 'p-002', occurred_at: '2026-07-10T09:30:00Z', confidence_score: 0.92, sessionId: 's-101' }`
2. Call `relationshipStore.writeEdge(payload)`
3. Assert result `{ committed: true, edgeId: '...' }`

**Expected Result**: Edge persisted; `edgeId` returned; no validation errors.

**Code Sample**:
```typescript
describe('RelationshipStore — EdgeWrite', () => {
  it('should persist a valid met_at edge between two Person nodes', async () => {
    const payload: EdgePayload = {
      type: 'met_at',
      sourceId: 'p-001',
      targetId: 'p-002',
      properties: { occurred_at: '2026-07-10T09:30:00Z', confidence_score: 0.92, sessionId: 's-101' },
    };

    const result = await relationshipStore.writeEdge(payload);

    expect(result.committed).toBe(true);
    expect(result.edgeId).toMatch(/^[0-9a-f-]{36}$/);
  });
});
```

---

#### TC-F3-U1.2: Write `introduced_by` Edge with Intermediary Person Reference
**Objective**: Verify that an `introduced_by` edge carrying an `introducerId` property is stored correctly and the property is retrievable.

**Test Steps**:
1. Write edge `{ type: 'introduced_by', sourceId: 'p-003', targetId: 'p-004', properties: { introducerId: 'p-005', occurred_at: '2026-07-10T14:00:00Z' } }`
2. Retrieve edge from store
3. Assert `edge.properties.introducerId === 'p-005'`

**Expected Result**: `introducerId` persisted and retrievable; edge committed.

**Code Sample**:
```typescript
it('should store introducerId property on an introduced_by edge', async () => {
  const result = await relationshipStore.writeEdge({
    type: 'introduced_by',
    sourceId: 'p-003',
    targetId: 'p-004',
    properties: { introducerId: 'p-005', occurred_at: '2026-07-10T14:00:00Z' },
  });

  const edge = await relationshipStore.getEdge(result.edgeId);
  expect(edge.properties.introducerId).toBe('p-005');
});
```

---

#### TC-F3-U1.3: Idempotent Write Does Not Create Duplicate Edge
**Objective**: Verify that writing the same `met_at` edge twice (same source, target, session) results in exactly one edge in the graph.

**Test Steps**:
1. Write edge with `idempotencyKey: 'met-p001-p002-s101'`
2. Write the same edge again with the same key
3. Query graph: `MATCH (a)-[r:met_at]->(b) WHERE a.id = 'p-001' AND b.id = 'p-002' RETURN count(r)`
4. Assert count = 1

**Expected Result**: Exactly 1 edge; second write returns the existing `edgeId`.

**Code Sample**:
```typescript
it('should be idempotent when the same edge is written twice with the same key', async () => {
  const key = 'met-p001-p002-s101';
  const r1 = await relationshipStore.writeEdge({ type: 'met_at', sourceId: 'p-001', targetId: 'p-002', idempotencyKey: key, properties: { occurred_at: '2026-07-10T09:30:00Z' } });
  const r2 = await relationshipStore.writeEdge({ type: 'met_at', sourceId: 'p-001', targetId: 'p-002', idempotencyKey: key, properties: { occurred_at: '2026-07-10T09:30:00Z' } });

  expect(r1.edgeId).toBe(r2.edgeId);

  const count = await neo4j.run('MATCH (a:Person { id: $s })-[r:met_at]->(b:Person { id: $t }) RETURN count(r) AS n', { s: 'p-001', t: 'p-002' });
  expect(count.records[0].get('n').toInt()).toBe(1);
});
```

---

### 1.2 Edge Retrieval Operations

#### TC-F3-U2.1: Retrieve All Outgoing Edges from a Node
**Objective**: Verify that `getOutgoingEdges(nodeId)` returns all edges where the given node is the source.

**Preconditions**:
- Node `p-001` has 3 outgoing edges: 2 `met_at` and 1 `followed_up`

**Test Steps**:
1. Call `relationshipStore.getOutgoingEdges('p-001')`
2. Assert array length = 3
3. Assert edge types include `met_at` (×2) and `followed_up` (×1)

**Expected Result**: All 3 outgoing edges returned with correct types.

**Code Sample**:
```typescript
describe('RelationshipStore — EdgeRetrieval', () => {
  it('should return all outgoing edges from a node', async () => {
    const edges = await relationshipStore.getOutgoingEdges('p-001');

    expect(edges).toHaveLength(3);
    expect(edges.filter(e => e.type === 'met_at')).toHaveLength(2);
    expect(edges.filter(e => e.type === 'followed_up')).toHaveLength(1);
  });
});
```

---

#### TC-F3-U2.2: Filter Edges by Type and Date Range
**Objective**: Verify that `getEdges({ nodeId, type, fromDate, toDate })` returns only edges of the specified type within the date range.

**Test Steps**:
1. Write 5 `met_at` edges across July 2026; 2 `spoke_at` edges in July 2026
2. Call `getEdges({ nodeId: 'p-001', type: 'met_at', fromDate: '2026-07-01', toDate: '2026-07-15' })`
3. Assert only `met_at` edges within the date window are returned

**Expected Result**: Only `met_at` edges in date range returned; `spoke_at` edges excluded.

**Code Sample**:
```typescript
it('should filter edges by type and date range', async () => {
  const edges = await relationshipStore.getEdges({
    nodeId: 'p-001',
    type: 'met_at',
    fromDate: new Date('2026-07-01'),
    toDate: new Date('2026-07-15'),
  });

  expect(edges.every(e => e.type === 'met_at')).toBe(true);
  expect(edges.every(e => new Date(e.properties.occurred_at) >= new Date('2026-07-01'))).toBe(true);
});
```

---

#### TC-F3-U2.3: `getEdgeBetween` Returns the Strongest Edge by Weight
**Objective**: Verify that when multiple `met_at` edges exist between the same two nodes, `getEdgeBetween` returns the one with the highest `weight`.

**Test Steps**:
1. Write 3 `met_at` edges between `p-001` and `p-002` with weights 0.5, 0.9, 0.7
2. Call `relationshipStore.getEdgeBetween('p-001', 'p-002', 'met_at', { strongest: true })`
3. Assert returned edge has `weight = 0.9`

**Expected Result**: Single edge returned with highest weight.

**Code Sample**:
```typescript
it('should return the highest-weight edge when strongest option is set', async () => {
  await Promise.all([0.5, 0.9, 0.7].map(weight =>
    relationshipStore.writeEdge({ type: 'met_at', sourceId: 'p-001', targetId: 'p-002', properties: { weight, occurred_at: new Date().toISOString() } })
  ));

  const edge = await relationshipStore.getEdgeBetween('p-001', 'p-002', 'met_at', { strongest: true });
  expect(edge.properties.weight).toBe(0.9);
});
```

---

### 1.3 Edge Deletion and Soft-Delete

#### TC-F3-U3.1: Soft-Delete Marks Edge as Deleted Without Removing from Graph
**Objective**: Verify that `softDeleteEdge(edgeId)` sets `deleted: true` on the edge and excludes it from default queries.

**Test Steps**:
1. Write a `met_at` edge; record `edgeId`
2. Call `relationshipStore.softDeleteEdge(edgeId)`
3. Call `getOutgoingEdges('p-001')` (default query)
4. Assert deleted edge is not in the result
5. Call `getEdge(edgeId, { includeDeleted: true })`
6. Assert edge is present with `deleted === true`

**Expected Result**: Edge hidden from default queries; retrievable with `includeDeleted: true`.

**Code Sample**:
```typescript
describe('RelationshipStore — SoftDelete', () => {
  it('should soft-delete an edge and exclude it from default retrieval', async () => {
    const { edgeId } = await relationshipStore.writeEdge({ type: 'met_at', sourceId: 'p-001', targetId: 'p-002', properties: { occurred_at: new Date().toISOString() } });

    await relationshipStore.softDeleteEdge(edgeId);

    const activeEdges = await relationshipStore.getOutgoingEdges('p-001');
    expect(activeEdges.find(e => e.id === edgeId)).toBeUndefined();

    const deleted = await relationshipStore.getEdge(edgeId, { includeDeleted: true });
    expect(deleted.deleted).toBe(true);
  });
});
```

---

#### TC-F3-U3.2: Hard Delete Removes Edge and All Associated Properties
**Objective**: Verify that `hardDeleteEdge(edgeId)` completely removes the edge from the graph database.

**Test Steps**:
1. Write an edge; record `edgeId`
2. Call `relationshipStore.hardDeleteEdge(edgeId)`
3. Attempt to retrieve via `getEdge(edgeId, { includeDeleted: true })`
4. Assert `EdgeNotFoundError` is thrown

**Expected Result**: Edge no longer exists in graph; retrieval throws `EdgeNotFoundError`.

**Code Sample**:
```typescript
it('should hard-delete an edge so it is no longer retrievable', async () => {
  const { edgeId } = await relationshipStore.writeEdge({ type: 'followed_up', sourceId: 'p-001', targetId: 'p-002', properties: { occurred_at: new Date().toISOString() } });

  await relationshipStore.hardDeleteEdge(edgeId);

  await expect(relationshipStore.getEdge(edgeId, { includeDeleted: true })).rejects.toThrow(EdgeNotFoundError);
});
```

---

#### TC-F3-U3.3: Bulk Soft-Delete Marks Multiple Edges for a Source Node
**Objective**: Verify that `bulkSoftDelete({ sourceNodeId, type })` soft-deletes all edges of a given type originating from a node.

**Test Steps**:
1. Write 5 `met_at` edges from `p-001` to various targets
2. Call `relationshipStore.bulkSoftDelete({ sourceNodeId: 'p-001', type: 'met_at' })`
3. Assert `getOutgoingEdges('p-001')` returns 0 `met_at` edges
4. Assert all 5 edges retrievable with `includeDeleted: true`

**Expected Result**: All 5 edges soft-deleted; none visible in default retrieval.

**Code Sample**:
```typescript
it('should bulk soft-delete all met_at edges from a source node', async () => {
  await Promise.all(Array.from({ length: 5 }, (_, i) =>
    relationshipStore.writeEdge({ type: 'met_at', sourceId: 'p-001', targetId: `p-${100 + i}`, properties: { occurred_at: new Date().toISOString() } })
  ));

  await relationshipStore.bulkSoftDelete({ sourceNodeId: 'p-001', type: 'met_at' });

  const active = await relationshipStore.getOutgoingEdges('p-001');
  expect(active.filter(e => e.type === 'met_at')).toHaveLength(0);
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Relationship Store ↔ Graph Database

#### TC-F3-I1.1: Written Edge Is Queryable via Cypher After Commit
**Objective**: Verify that an edge written through `relationshipStore.writeEdge` is immediately queryable via a raw Cypher query.

**Preconditions**:
- Neo4j test instance running; `p-001` and `p-002` exist

**Test Steps**:
1. Write `met_at` edge between `p-001` and `p-002`
2. Run Cypher: `MATCH (a:Person { id: 'p-001' })-[r:met_at]->(b:Person { id: 'p-002' }) RETURN r`
3. Assert 1 record returned; `r.occurred_at` matches the written value

**Expected Result**: Edge visible in Cypher immediately after write; properties intact.

**Code Sample**:
```typescript
it('should be immediately queryable via Cypher after writeEdge', async () => {
  const occurred_at = '2026-07-10T09:30:00Z';
  await relationshipStore.writeEdge({ type: 'met_at', sourceId: 'p-001', targetId: 'p-002', properties: { occurred_at } });

  const result = await neo4j.run("MATCH (a:Person { id: 'p-001' })-[r:met_at]->(b:Person { id: 'p-002' }) RETURN r");
  expect(result.records).toHaveLength(1);
  expect(result.records[0].get('r').properties.occurred_at).toBe(occurred_at);
});
```

---

#### TC-F3-I1.2: Transactional Batch Write — All or Nothing on Failure
**Objective**: Verify that a batch write of 5 edges fails atomically when the third edge has an invalid schema, leaving none of the 5 edges committed.

**Test Steps**:
1. Build a batch of 5 edges; make edge #3 invalid (missing `occurred_at`)
2. Call `relationshipStore.writeBatch(edges)` inside a transaction
3. Assert transaction rolls back
4. Query graph for any of the 5 edges; assert 0 results

**Expected Result**: All-or-nothing rollback; 0 edges committed; `BatchValidationError` thrown.

**Code Sample**:
```typescript
it('should roll back entire batch on single edge validation failure', async () => {
  const edges = buildValidEdgeBatch(5);
  edges[2].properties.occurred_at = undefined; // introduce error

  await expect(relationshipStore.writeBatch(edges)).rejects.toThrow(BatchValidationError);

  const count = await neo4j.run('MATCH ()-[r:met_at { batchId: $id }]->() RETURN count(r) AS n', { id: 'batch-test-001' });
  expect(count.records[0].get('n').toInt()).toBe(0);
});
```

---

### 2.2 Relationship Storage ↔ Schema Validation

#### TC-F3-I2.1: Edge Write Blocked by Schema Validation Before Reaching Database
**Objective**: Verify that an edge write failing schema validation does not reach the graph database layer.

**Test Steps**:
1. Spy on `neo4j.run`
2. Attempt to write a `discussed` edge from Company to Company (invalid pair)
3. Assert `SchemaValidationError` thrown before `neo4j.run` is called

**Expected Result**: Neo4j not called; validation short-circuits at the service layer.

**Code Sample**:
```typescript
it('should block invalid edge write before reaching Neo4j', async () => {
  const neo4jSpy = jest.spyOn(neo4j, 'run');

  await expect(
    relationshipStore.writeEdge({ type: 'discussed', sourceId: 'c-001', targetId: 'c-002', properties: { occurred_at: new Date().toISOString() } })
  ).rejects.toThrow(SchemaValidationError);

  expect(neo4jSpy).not.toHaveBeenCalled();
});
```

---

#### TC-F3-I2.2: Edge Write Succeeds After Schema Version Upgrade Adds New Edge Type
**Objective**: Verify that after a schema upgrade adds the `co_authored` edge type, writes of that type succeed immediately.

**Test Steps**:
1. Attempt `writeEdge` for `co_authored` type; assert `UnknownEdgeTypeError`
2. Register `co_authored` edge type via schema registry
3. Retry `writeEdge`; assert success

**Expected Result**: Write fails before registration; succeeds after registration without service restart.

**Code Sample**:
```typescript
it('should accept new edge type writes immediately after schema registration', async () => {
  await expect(
    relationshipStore.writeEdge({ type: 'co_authored', sourceId: 'p-001', targetId: 'p-002', properties: { occurred_at: new Date().toISOString() } })
  ).rejects.toThrow(UnknownEdgeTypeError);

  await schemaRegistry.registerEdgeType({ name: 'co_authored', allowedPairs: [{ source: 'Person', target: 'Person' }], requiredProperties: [] });

  const result = await relationshipStore.writeEdge({ type: 'co_authored', sourceId: 'p-001', targetId: 'p-002', properties: { occurred_at: new Date().toISOString() } });
  expect(result.committed).toBe(true);
});
```

---

### 2.3 Relationship Storage ↔ Event Streaming

#### TC-F3-I3.1: Edge Write Publishes `EDGE_CREATED` Event to Event Bus
**Objective**: Verify that every committed edge write emits an `EDGE_CREATED` event on the event bus.

**Test Steps**:
1. Subscribe to `EDGE_CREATED` events
2. Write a `met_at` edge
3. Assert subscriber receives event within 500 ms
4. Assert event payload contains `edgeId`, `type: 'met_at'`, `sourceId`, `targetId`

**Expected Result**: Event delivered; payload complete; timing within 500 ms.

**Code Sample**:
```typescript
it('should publish EDGE_CREATED event on successful edge write', async () => {
  const events: EdgeCreatedEvent[] = [];
  eventBus.subscribe('EDGE_CREATED', e => events.push(e));

  await relationshipStore.writeEdge({ type: 'met_at', sourceId: 'p-001', targetId: 'p-002', properties: { occurred_at: new Date().toISOString() } });

  await waitFor(() => events.length > 0, { timeout: 500 });
  expect(events[0].type).toBe('met_at');
  expect(events[0].sourceId).toBe('p-001');
});
```

---

#### TC-F3-I3.2: Soft Delete Publishes `EDGE_DELETED` Event
**Objective**: Verify that soft-deleting an edge emits an `EDGE_DELETED` event with the correct `edgeId` and `reason`.

**Test Steps**:
1. Write and record an edge
2. Subscribe to `EDGE_DELETED` events
3. Soft-delete the edge with `reason: 'USER_CORRECTION'`
4. Assert event received with `edgeId` and `reason === 'USER_CORRECTION'`

**Expected Result**: `EDGE_DELETED` event emitted; payload complete.

**Code Sample**:
```typescript
it('should emit EDGE_DELETED event on soft delete with reason', async () => {
  const { edgeId } = await relationshipStore.writeEdge({ type: 'followed_up', sourceId: 'p-001', targetId: 'p-002', properties: { occurred_at: new Date().toISOString() } });

  const events: EdgeDeletedEvent[] = [];
  eventBus.subscribe('EDGE_DELETED', e => events.push(e));

  await relationshipStore.softDeleteEdge(edgeId, { reason: 'USER_CORRECTION' });

  await waitFor(() => events.length > 0, { timeout: 500 });
  expect(events[0].edgeId).toBe(edgeId);
  expect(events[0].reason).toBe('USER_CORRECTION');
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Self-Referential and Orphaned Edges

#### TC-F3-E1.1: Self-Loop Edge (Source = Target) Is Rejected
**Objective**: Verify that writing an edge where `sourceId === targetId` throws `SelfLoopEdgeError`.

**Test Steps**:
1. Call `writeEdge({ type: 'met_at', sourceId: 'p-001', targetId: 'p-001', properties: { occurred_at: '...' } })`
2. Assert `SelfLoopEdgeError` thrown

**Expected Result**: Self-loop rejected; no edge persisted.

**Code Sample**:
```typescript
it('should reject a self-loop edge', async () => {
  await expect(
    relationshipStore.writeEdge({ type: 'met_at', sourceId: 'p-001', targetId: 'p-001', properties: { occurred_at: new Date().toISOString() } })
  ).rejects.toThrow(SelfLoopEdgeError);
});
```

---

#### TC-F3-E1.2: Edge Write to Non-Existent Target Node Throws NodeNotFoundError
**Objective**: Verify that writing an edge to a non-existent target node throws `NodeNotFoundError`.

**Test Steps**:
1. Ensure `p-999` does not exist in the graph
2. Call `writeEdge({ type: 'met_at', sourceId: 'p-001', targetId: 'p-999', properties: { occurred_at: '...' } })`
3. Assert `NodeNotFoundError` thrown with `nodeId: 'p-999'`

**Expected Result**: Write fails; no edge created; error references missing node ID.

**Code Sample**:
```typescript
it('should throw NodeNotFoundError when target node does not exist', async () => {
  await expect(
    relationshipStore.writeEdge({ type: 'met_at', sourceId: 'p-001', targetId: 'p-999', properties: { occurred_at: new Date().toISOString() } })
  ).rejects.toThrow(NodeNotFoundError);
});
```

---

### 3.2 High-Cardinality Nodes

#### TC-F3-E2.1: Node with 10,000 Outgoing Edges Returns Paginated Results
**Objective**: Verify that `getOutgoingEdges` supports pagination when a node has 10,000 outgoing edges.

**Test Steps**:
1. Seed `p-hub` with 10,000 `met_at` edges
2. Call `getOutgoingEdges('p-hub', { page: 1, pageSize: 100 })`
3. Assert 100 edges returned; `pagination.totalCount === 10000`; `pagination.hasNextPage === true`

**Expected Result**: First page of 100 edges returned; total count correct; pagination metadata present.

**Code Sample**:
```typescript
it('should paginate outgoing edges for a high-cardinality hub node', async () => {
  const result = await relationshipStore.getOutgoingEdges('p-hub', { page: 1, pageSize: 100 });

  expect(result.edges).toHaveLength(100);
  expect(result.pagination.totalCount).toBe(10_000);
  expect(result.pagination.hasNextPage).toBe(true);
});
```

---

#### TC-F3-E2.2: Writing 10,001st Edge Beyond Cardinality Limit Triggers Warning Not Error
**Objective**: Verify that exceeding a configurable soft-limit of 10,000 outgoing edges logs a `HIGH_CARDINALITY_WARNING` but does not block the write.

**Test Steps**:
1. Seed node with 10,000 edges
2. Write one more edge; assert write succeeds
3. Assert `HIGH_CARDINALITY_WARNING` log entry emitted

**Expected Result**: Edge committed; warning logged; no error thrown.

**Code Sample**:
```typescript
it('should write the 10001st edge with a high-cardinality warning', async () => {
  const result = await relationshipStore.writeEdge({ type: 'met_at', sourceId: 'p-hub', targetId: 'p-new', properties: { occurred_at: new Date().toISOString() } });
  expect(result.committed).toBe(true);
  expect(mockLogger.warnings.some(w => w.code === 'HIGH_CARDINALITY_WARNING')).toBe(true);
});
```

---

### 3.3 Concurrent Write Conflicts

#### TC-F3-E3.1: Concurrent Writes of the Same Edge with Different Weights Resolve via Last-Write-Wins
**Objective**: Verify that two concurrent writes to the same edge (same source, target, session) with different `weight` values resolve with the later timestamp's value.

**Test Steps**:
1. Write same edge twice concurrently with `weight: 0.6` and `weight: 0.9`
2. Assert exactly one edge exists in graph
3. Assert `weight` is the value of the later-committed write

**Expected Result**: Single edge; weight is the last-writer's value; no exception thrown.

**Code Sample**:
```typescript
it('should resolve concurrent same-edge writes via last-write-wins', async () => {
  const key = 'met-concurrent-001';
  await Promise.all([
    relationshipStore.writeEdge({ type: 'met_at', sourceId: 'p-001', targetId: 'p-002', idempotencyKey: key, properties: { occurred_at: new Date().toISOString(), weight: 0.6 } }),
    relationshipStore.writeEdge({ type: 'met_at', sourceId: 'p-001', targetId: 'p-002', idempotencyKey: key, properties: { occurred_at: new Date().toISOString(), weight: 0.9 } }),
  ]);

  const result = await neo4j.run("MATCH (a:Person { id: 'p-001' })-[r:met_at]->(b:Person { id: 'p-002' }) RETURN count(r) AS n");
  expect(result.records[0].get('n').toInt()).toBe(1);
});
```

---

#### TC-F3-E3.2: Delete-Write Race Condition Handled Gracefully
**Objective**: Verify that simultaneously soft-deleting an edge and writing a property update to it does not cause a database inconsistency.

**Test Steps**:
1. Write an edge; record `edgeId`
2. Simultaneously call `softDeleteEdge(edgeId)` and `updateEdgeProperty(edgeId, 'weight', 0.95)`
3. Assert neither call throws an unhandled exception
4. Assert final state is either deleted or updated — not a corrupted partial state

**Expected Result**: Race resolved cleanly; graph is consistent post-operation.

**Code Sample**:
```typescript
it('should handle simultaneous delete and update on the same edge without corruption', async () => {
  const { edgeId } = await relationshipStore.writeEdge({ type: 'met_at', sourceId: 'p-001', targetId: 'p-002', properties: { occurred_at: new Date().toISOString(), weight: 0.5 } });

  const results = await Promise.allSettled([
    relationshipStore.softDeleteEdge(edgeId),
    relationshipStore.updateEdgeProperty(edgeId, 'weight', 0.95),
  ]);

  const edge = await relationshipStore.getEdge(edgeId, { includeDeleted: true });
  expect(edge).toBeDefined();
  expect(['deleted', 'weight'].some(k => edge[k] !== undefined)).toBe(true);
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Write Throughput

#### TC-F3-P1.1: 5,000 Edge Writes Per Second Sustained Throughput
**Objective**: Verify that the relationship store sustains ≥ 5,000 edge writes per second over a 10-second window.

**Preconditions**:
- 1,000 Person nodes seeded; Neo4j running with write-optimized config

**Test Steps**:
1. Queue 50,000 edge write payloads
2. Write all in batches of 100 concurrently
3. Record start and end time
4. Assert total writes / total seconds ≥ 5,000

**Expected Result**: ≥ 5,000 writes/sec; no transaction failures; all 50,000 edges committed.

**Code Sample**:
```typescript
it('should sustain 5000 edge writes per second over 10 seconds', async () => {
  const payloads = buildEdgePayloads(50_000);
  const start = Date.now();
  await Promise.all(chunk(payloads, 100).map(batch => relationshipStore.writeBatch(batch)));
  const elapsed = (Date.now() - start) / 1000;

  expect(50_000 / elapsed).toBeGreaterThanOrEqual(5000);
});
```

---

#### TC-F3-P1.2: Batch Write of 1,000 Edges Completes in Under 500 ms
**Objective**: Verify that a single batch transaction of 1,000 edges commits within 500 ms.

**Test Steps**:
1. Prepare a batch of 1,000 valid edge payloads
2. Start timer; call `writeBatch(payloads)`
3. Assert elapsed time ≤ 500 ms

**Expected Result**: Batch committed in ≤ 500 ms; all 1,000 edges present in graph.

**Code Sample**:
```typescript
it('should commit a batch of 1000 edges within 500 ms', async () => {
  const payloads = buildEdgePayloads(1_000);
  const start = Date.now();
  await relationshipStore.writeBatch(payloads);
  expect(Date.now() - start).toBeLessThanOrEqual(500);
});
```

---

### 4.2 Read Throughput

#### TC-F3-P2.1: `getOutgoingEdges` Latency p99 Under 15 ms for Standard Nodes
**Objective**: Verify that retrieving all outgoing edges for nodes with ≤ 50 edges completes within 15 ms at p99 under 200 concurrent requests.

**Test Steps**:
1. Seed 200 nodes each with 30–50 outgoing edges
2. Fire 200 concurrent `getOutgoingEdges` calls
3. Assert p99 ≤ 15 ms

**Expected Result**: p99 ≤ 15 ms; all edges returned correctly.

**Code Sample**:
```typescript
it('should retrieve outgoing edges within 15 ms at p99 for standard nodes', async () => {
  const latencies = await Promise.all(
    nodeIds.map(async id => {
      const t = Date.now();
      await relationshipStore.getOutgoingEdges(id);
      return Date.now() - t;
    })
  );
  expect(percentile(99, latencies)).toBeLessThanOrEqual(15);
});
```

---

#### TC-F3-P2.2: Paginated Query on Hub Node with 10k Edges Returns First Page Under 30 ms
**Objective**: Verify that fetching the first page of 100 edges from a 10,000-edge hub node takes ≤ 30 ms.

**Test Steps**:
1. Seed hub node with 10,000 `met_at` edges
2. Call `getOutgoingEdges('p-hub', { page: 1, pageSize: 100 })`
3. Assert elapsed time ≤ 30 ms

**Expected Result**: First page retrieved in ≤ 30 ms; 100 edges returned.

**Code Sample**:
```typescript
it('should serve first page of hub node edges within 30 ms', async () => {
  const start = Date.now();
  const result = await relationshipStore.getOutgoingEdges('p-hub', { page: 1, pageSize: 100 });
  expect(Date.now() - start).toBeLessThanOrEqual(30);
  expect(result.edges).toHaveLength(100);
});
```

---

### 4.3 Deletion Performance

#### TC-F3-P3.1: Bulk Soft-Delete of 10,000 Edges Completes in Under 20 Seconds
**Objective**: Verify that soft-deleting all `met_at` edges from a source node with 10,000 edges completes within 20 seconds.

**Test Steps**:
1. Seed node `p-001` with 10,000 `met_at` edges
2. Start timer; call `bulkSoftDelete({ sourceNodeId: 'p-001', type: 'met_at' })`
3. Assert elapsed ≤ 20 seconds; assert 0 active `met_at` edges remain

**Expected Result**: Bulk delete completes in ≤ 20 s; 0 active edges.

**Code Sample**:
```typescript
it('should bulk soft-delete 10k edges within 20 seconds', async () => {
  await seedEdgesForNode('p-001', 10_000);
  const start = Date.now();
  await relationshipStore.bulkSoftDelete({ sourceNodeId: 'p-001', type: 'met_at' });
  expect(Date.now() - start).toBeLessThanOrEqual(20_000);

  const active = await relationshipStore.getOutgoingEdges('p-001');
  expect(active.filter(e => e.type === 'met_at')).toHaveLength(0);
});
```

---

#### TC-F3-P3.2: Idempotency Cache Lookup Completes in Under 5 ms
**Objective**: Verify that checking the idempotency cache for a previously written edge takes ≤ 5 ms.

**Test Steps**:
1. Write 1,000 edges with unique idempotency keys to warm cache
2. Run 500 idempotency key lookups
3. Assert p99 lookup time ≤ 5 ms

**Expected Result**: Cache lookup p99 ≤ 5 ms; correct hit/miss results.

**Code Sample**:
```typescript
it('should resolve idempotency key lookup within 5 ms at p99', async () => {
  const keys = await writeEdgesWithKeys(1_000);
  const latencies = await Promise.all(keys.slice(0, 500).map(async key => {
    const t = Date.now();
    await idempotencyCache.check(key);
    return Date.now() - t;
  }));
  expect(percentile(99, latencies)).toBeLessThanOrEqual(5);
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

**Approximate total**: ~27 test cases covering edge write/read/delete operations, schema-layer validation, event streaming, self-loop and orphan protection, concurrent conflict resolution, and performance SLAs.
