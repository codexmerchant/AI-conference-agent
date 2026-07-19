# EPIC06 Feature 1 — Graph Schema Management — Test Cases

## Test Overview
Comprehensive test suite for Graph Schema Management covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Node Type Registry

#### TC-F1-U1.1: Register a New Node Type with Required Properties
**Objective**: Verify that a new node type definition is persisted in the schema registry with all required and optional property declarations intact.

**Preconditions**:
- Schema registry service is running
- No `Topic` node type exists in the active schema version

**Test Steps**:
1. Build a `NodeTypeDefinition` for `Topic` with required fields `id`, `name`, and optional fields `category`, `confidence`
2. Call `schemaRegistry.registerNodeType(definition)`
3. Retrieve the stored definition via `schemaRegistry.getNodeType('Topic')`
4. Assert all required and optional properties are present with correct data types

**Expected Result**: Registry returns a `NodeTypeDefinition` matching the input; `version` is incremented by 1; no validation errors thrown.

**Code Sample**:
```typescript
describe('SchemaRegistry — NodeTypeRegistry', () => {
  it('should persist a new node type with required and optional properties', async () => {
    const registry = new SchemaRegistry(mockGraphDb);
    const definition: NodeTypeDefinition = {
      name: 'Topic',
      requiredProperties: [
        { name: 'id', type: 'string' },
        { name: 'name', type: 'string' },
      ],
      optionalProperties: [
        { name: 'category', type: 'string' },
        { name: 'confidence', type: 'float', min: 0, max: 1 },
      ],
    };

    await registry.registerNodeType(definition);
    const stored = await registry.getNodeType('Topic');

    expect(stored.name).toBe('Topic');
    expect(stored.requiredProperties).toHaveLength(2);
    expect(stored.optionalProperties).toHaveLength(2);
    expect(stored.schemaVersion).toBeGreaterThan(0);
  });
});
```

---

#### TC-F1-U1.2: Reject Duplicate Node Type Registration
**Objective**: Verify that attempting to register a node type that already exists in the active schema version throws a `SchemaDuplicateError`.

**Preconditions**:
- `Person` node type already registered in schema version 3

**Test Steps**:
1. Call `schemaRegistry.registerNodeType({ name: 'Person', requiredProperties: [...] })`
2. Catch thrown exception
3. Assert exception type is `SchemaDuplicateError`
4. Assert error message includes the conflicting type name `'Person'`

**Expected Result**: `SchemaDuplicateError` thrown; existing `Person` definition is not modified; schema version unchanged.

**Code Sample**:
```typescript
it('should throw SchemaDuplicateError when registering an existing node type', async () => {
  await registry.registerNodeType({ name: 'Person', requiredProperties: [{ name: 'id', type: 'string' }] });

  await expect(
    registry.registerNodeType({ name: 'Person', requiredProperties: [{ name: 'id', type: 'string' }] })
  ).rejects.toThrow(SchemaDuplicateError);
});
```

---

#### TC-F1-U1.3: List All Registered Node Types for an Active Schema Version
**Objective**: Verify that `listNodeTypes(version)` returns all node types registered under a specified schema version.

**Preconditions**:
- Schema version 5 contains `Person`, `Company`, `Session`, `Topic`, `Conference`, `Conversation` node types

**Test Steps**:
1. Call `schemaRegistry.listNodeTypes(5)`
2. Assert returned array contains exactly 6 entries
3. Assert each entry has a non-empty `name` and at least one `requiredProperties` entry

**Expected Result**: Array of 6 `NodeTypeDefinition` objects returned; none are undefined; all have at least one required property.

**Code Sample**:
```typescript
it('should return all six canonical node types for schema version 5', async () => {
  const types = await registry.listNodeTypes(5);
  const names = types.map(t => t.name);

  expect(types).toHaveLength(6);
  expect(names).toEqual(expect.arrayContaining(['Person', 'Company', 'Session', 'Topic', 'Conference', 'Conversation']));
  types.forEach(t => expect(t.requiredProperties.length).toBeGreaterThan(0));
});
```

---

### 1.2 Edge Type Registry

#### TC-F1-U2.1: Register Edge Type with Valid Source/Target Pair Constraints
**Objective**: Verify that an edge type definition with source/target type constraints is persisted and enforces the allowed pair list.

**Preconditions**:
- `Person` and `Session` node types exist in the active schema

**Test Steps**:
1. Define a `met_at` edge type with `allowedPairs: [{ source: 'Person', target: 'Person' }]` and required property `occurred_at: datetime`
2. Call `schemaRegistry.registerEdgeType(definition)`
3. Retrieve via `schemaRegistry.getEdgeType('met_at')`
4. Assert `allowedPairs` contains exactly the declared pair

**Expected Result**: Edge type stored with correct pair constraint; `requiredProperties` includes `occurred_at`; schema version bumped.

**Code Sample**:
```typescript
it('should register met_at edge type with Person→Person constraint', async () => {
  const def: EdgeTypeDefinition = {
    name: 'met_at',
    allowedPairs: [{ source: 'Person', target: 'Person' }],
    requiredProperties: [{ name: 'occurred_at', type: 'datetime' }],
    optionalProperties: [{ name: 'weight', type: 'float' }],
  };

  await registry.registerEdgeType(def);
  const stored = await registry.getEdgeType('met_at');

  expect(stored.allowedPairs).toHaveLength(1);
  expect(stored.allowedPairs[0]).toEqual({ source: 'Person', target: 'Person' });
  expect(stored.requiredProperties.map(p => p.name)).toContain('occurred_at');
});
```

---

#### TC-F1-U2.2: Reject Edge Type with Non-Existent Source Node Type
**Objective**: Verify that registering an edge type referencing an unregistered source node type throws `SchemaReferenceError`.

**Test Steps**:
1. Attempt to register a `works_for` edge with `allowedPairs: [{ source: 'UnknownEntity', target: 'Company' }]`
2. Assert `SchemaReferenceError` is thrown

**Expected Result**: Registration fails; no edge type persisted; error message references `'UnknownEntity'`.

**Code Sample**:
```typescript
it('should reject edge type referencing unregistered source node type', async () => {
  await expect(
    registry.registerEdgeType({
      name: 'works_for',
      allowedPairs: [{ source: 'UnknownEntity', target: 'Company' }],
      requiredProperties: [],
    })
  ).rejects.toThrow(SchemaReferenceError);
});
```

---

#### TC-F1-U2.3: Validate Cardinality Rules on Edge Type Definition
**Objective**: Verify that cardinality constraints (`ONE_TO_MANY`, `MANY_TO_MANY`) are stored and retrievable.

**Test Steps**:
1. Register a `spoke_at` edge type with `cardinality: 'MANY_TO_MANY'`
2. Retrieve and assert `cardinality` field matches

**Expected Result**: `getEdgeType('spoke_at').cardinality === 'MANY_TO_MANY'`.

**Code Sample**:
```typescript
it('should persist cardinality constraint on edge type', async () => {
  await registry.registerEdgeType({ name: 'spoke_at', cardinality: 'MANY_TO_MANY', allowedPairs: [{ source: 'Person', target: 'Session' }], requiredProperties: [] });
  const stored = await registry.getEdgeType('spoke_at');
  expect(stored.cardinality).toBe('MANY_TO_MANY');
});
```

---

### 1.3 Write-Time Schema Validation

#### TC-F1-U3.1: Accept a Valid Node Write Against Active Schema
**Objective**: Verify that a write payload conforming to the active schema passes validation without errors.

**Test Steps**:
1. Construct a `Person` node payload with all required fields (`id`, `name`, `email`)
2. Call `schemaValidator.validateNode('Person', payload)`
3. Assert validation result is `{ valid: true, errors: [] }`

**Expected Result**: No validation errors; write proceeds to graph storage.

**Code Sample**:
```typescript
it('should pass a complete Person node through schema validation', async () => {
  const payload = { id: 'p-001', name: 'Alice Chen', email: 'alice@example.com' };
  const result = await validator.validateNode('Person', payload);
  expect(result.valid).toBe(true);
  expect(result.errors).toHaveLength(0);
});
```

---

#### TC-F1-U3.2: Reject Node Write Missing Required Fields
**Objective**: Verify that a `Person` node payload missing `email` is rejected with a descriptive validation error.

**Test Steps**:
1. Build payload `{ id: 'p-002', name: 'Bob Lee' }` (missing `email`)
2. Call `schemaValidator.validateNode('Person', payload)`
3. Assert `valid === false` and errors array contains a missing-field error for `email`

**Expected Result**: Validation fails; error specifies field `email` is required.

**Code Sample**:
```typescript
it('should reject a Person node missing required email field', async () => {
  const payload = { id: 'p-002', name: 'Bob Lee' };
  const result = await validator.validateNode('Person', payload);
  expect(result.valid).toBe(false);
  expect(result.errors.some(e => e.field === 'email' && e.code === 'REQUIRED_FIELD_MISSING')).toBe(true);
});
```

---

#### TC-F1-U3.3: Reject Edge Write with Invalid Source/Target Type Pair
**Objective**: Verify that writing a `discussed` edge from `Company` to `Company` is rejected because only `Person→Topic` and `Session→Topic` pairs are allowed.

**Test Steps**:
1. Build an edge payload `{ type: 'discussed', source: { type: 'Company', id: 'c-001' }, target: { type: 'Company', id: 'c-002' } }`
2. Call `schemaValidator.validateEdge(payload)`
3. Assert `valid === false`; error code `INVALID_PAIR`

**Expected Result**: Write blocked; caller receives `INVALID_PAIR` error with allowed pairs listed.

**Code Sample**:
```typescript
it('should reject a discussed edge between two Company nodes', async () => {
  const edge = { type: 'discussed', source: { type: 'Company', id: 'c-001' }, target: { type: 'Company', id: 'c-002' } };
  const result = await validator.validateEdge(edge);
  expect(result.valid).toBe(false);
  expect(result.errors[0].code).toBe('INVALID_PAIR');
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Schema Registry ↔ Graph Database

#### TC-F1-I1.1: Schema Version Persisted to Graph Database on Registration
**Objective**: Verify that registering a new node type creates a `:SchemaVersion` node in the graph database with the correct version number and timestamp.

**Preconditions**:
- Neo4j test instance running with empty schema namespace
- Schema registry connected to test graph

**Test Steps**:
1. Register `Conference` node type
2. Query graph: `MATCH (s:SchemaVersion) RETURN s ORDER BY s.version DESC LIMIT 1`
3. Assert `s.version` equals expected version and `s.createdAt` is within 5 seconds of now

**Expected Result**: `:SchemaVersion` node exists; `version` is incremented; `createdAt` is fresh.

**Code Sample**:
```typescript
it('should write a SchemaVersion node to Neo4j on node type registration', async () => {
  await registry.registerNodeType({ name: 'Conference', requiredProperties: [{ name: 'id', type: 'string' }] });

  const result = await neo4j.run('MATCH (s:SchemaVersion) RETURN s ORDER BY s.version DESC LIMIT 1');
  const node = result.records[0].get('s').properties;

  expect(node.version).toBeGreaterThan(0);
  expect(new Date(node.createdAt).getTime()).toBeCloseTo(Date.now(), -4);
});
```

---

#### TC-F1-I1.2: Schema Change Notification Delivered to Subscriber Services
**Objective**: Verify that publishing a new schema version triggers a notification event consumed by the Graph Agent subscriber.

**Test Steps**:
1. Subscribe a mock Graph Agent to the schema change event bus
2. Register a new edge type `introduced_by`
3. Assert mock subscriber receives a `SCHEMA_CHANGED` event within 2 seconds containing the new version number

**Expected Result**: Event received; payload includes `eventType: 'SCHEMA_CHANGED'`, `newVersion`, `changedTypes`.

**Code Sample**:
```typescript
it('should publish SCHEMA_CHANGED event when a new edge type is registered', async () => {
  const received: SchemaChangeEvent[] = [];
  eventBus.subscribe('SCHEMA_CHANGED', e => received.push(e));

  await registry.registerEdgeType({ name: 'introduced_by', allowedPairs: [{ source: 'Person', target: 'Person' }], requiredProperties: [] });

  await waitFor(() => received.length > 0, { timeout: 2000 });
  expect(received[0].eventType).toBe('SCHEMA_CHANGED');
  expect(received[0].changedTypes).toContain('introduced_by');
});
```

---

### 2.2 Schema Versioning & Migration Engine

#### TC-F1-I2.1: Forward Migration Backfills Required Property on Existing Edges
**Objective**: Verify that a migration adding a required `confidence_score` to `met_at` edges backfills all existing edges with the specified default value.

**Preconditions**:
- 500 `met_at` edges exist without `confidence_score`
- Migration script `M004_add_confidence_score.ts` defined

**Test Steps**:
1. Execute migration via `migrationEngine.run('M004_add_confidence_score')`
2. Query all `met_at` edges: `MATCH ()-[r:met_at]->() WHERE r.confidence_score IS NULL RETURN count(r)`
3. Assert count = 0
4. Assert random sample of 10 edges have `confidence_score = 0.5` (the default)

**Expected Result**: All `met_at` edges have `confidence_score`; migration status recorded as `COMPLETE`.

**Code Sample**:
```typescript
it('should backfill confidence_score on all existing met_at edges', async () => {
  await migrationEngine.run('M004_add_confidence_score');

  const nullCount = await neo4j.run(
    'MATCH ()-[r:met_at]->() WHERE r.confidence_score IS NULL RETURN count(r) AS n'
  );
  expect(nullCount.records[0].get('n').toInt()).toBe(0);

  const sample = await neo4j.run('MATCH ()-[r:met_at]->() RETURN r.confidence_score LIMIT 10');
  sample.records.forEach(rec => expect(rec.get('r.confidence_score')).toBe(0.5));
});
```

---

#### TC-F1-I2.2: Rollback Reverts Schema to Previous Version Without Data Loss
**Objective**: Verify that rolling back from schema version 6 to version 5 removes the newly added property from the registry and leaves existing graph data intact.

**Test Steps**:
1. Confirm current version is 6 with `Topic.category` property
2. Execute `migrationEngine.rollback(6)`
3. Assert schema version is now 5
4. Assert `Topic` node type no longer lists `category` in optional properties
5. Assert existing `Topic` nodes in graph still have `category` data (data not deleted on rollback)

**Expected Result**: Schema version = 5; `category` removed from registry definition; graph data preserved.

**Code Sample**:
```typescript
it('should rollback schema to version 5 without deleting existing node data', async () => {
  await migrationEngine.rollback(6);

  const version = await registry.getActiveVersion();
  expect(version).toBe(5);

  const topicDef = await registry.getNodeType('Topic');
  expect(topicDef.optionalProperties.map(p => p.name)).not.toContain('category');

  const topicData = await neo4j.run('MATCH (t:Topic) WHERE t.category IS NOT NULL RETURN count(t) AS n');
  expect(topicData.records[0].get('n').toInt()).toBeGreaterThan(0);
});
```

---

### 2.3 Write-Time Validation Pipeline

#### TC-F1-I3.1: End-to-End Valid Write Flows Through to Graph Storage
**Objective**: Verify that a valid `Person` node write passes schema validation and is committed to the graph database.

**Test Steps**:
1. Submit a fully valid `Person` payload via `graphWriteService.writeNode(payload)`
2. Assert service returns `{ committed: true, nodeId: '...' }`
3. Query Neo4j: `MATCH (p:Person { id: 'p-e2e-001' }) RETURN p`
4. Assert node exists with all submitted properties

**Expected Result**: Node committed; retrievable from graph; no quarantine record created.

**Code Sample**:
```typescript
it('should commit a valid Person node to Neo4j', async () => {
  const result = await graphWriteService.writeNode({ type: 'Person', id: 'p-e2e-001', name: 'Carol Wu', email: 'carol@example.com' });
  expect(result.committed).toBe(true);

  const query = await neo4j.run('MATCH (p:Person { id: $id }) RETURN p', { id: 'p-e2e-001' });
  expect(query.records).toHaveLength(1);
  expect(query.records[0].get('p').properties.name).toBe('Carol Wu');
});
```

---

#### TC-F1-I3.2: Invalid Write Is Quarantined and Not Committed
**Objective**: Verify that a node write failing schema validation is placed in the quarantine store and not committed to the graph.

**Test Steps**:
1. Submit a `Session` node payload missing required `startTime` field
2. Assert `graphWriteService.writeNode(payload)` returns `{ committed: false, quarantined: true, errors: [...] }`
3. Assert no `Session` node with submitted `id` exists in Neo4j
4. Assert quarantine store contains the rejected payload

**Expected Result**: Node not in graph; quarantine entry exists; error lists missing `startTime`.

**Code Sample**:
```typescript
it('should quarantine an invalid Session node and not write it to Neo4j', async () => {
  const result = await graphWriteService.writeNode({ type: 'Session', id: 's-bad-001', title: 'Keynote' });
  expect(result.committed).toBe(false);
  expect(result.quarantined).toBe(true);

  const query = await neo4j.run('MATCH (s:Session { id: $id }) RETURN s', { id: 's-bad-001' });
  expect(query.records).toHaveLength(0);

  const quarantine = await quarantineStore.get('s-bad-001');
  expect(quarantine).toBeDefined();
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Schema Version Boundary Conditions

#### TC-F1-E1.1: Read Schema at Version 1 (Initial State)
**Objective**: Verify that querying schema version 1 returns only the seed node types and no edge types.

**Test Steps**:
1. Call `schemaRegistry.listNodeTypes(1)` and `schemaRegistry.listEdgeTypes(1)`
2. Assert node types = seed set (`Person`, `Company`); edge types = empty

**Expected Result**: 2 node types; 0 edge types at version 1.

**Code Sample**:
```typescript
it('should return only seed node types at schema version 1', async () => {
  const nodes = await registry.listNodeTypes(1);
  const edges = await registry.listEdgeTypes(1);
  expect(nodes.map(n => n.name)).toEqual(expect.arrayContaining(['Person', 'Company']));
  expect(edges).toHaveLength(0);
});
```

---

#### TC-F1-E1.2: Request Non-Existent Schema Version Returns SchemaVersionNotFoundError
**Objective**: Verify that requesting schema version 9999 throws `SchemaVersionNotFoundError`.

**Test Steps**:
1. Call `schemaRegistry.listNodeTypes(9999)`
2. Assert `SchemaVersionNotFoundError` thrown with version number in message

**Expected Result**: Error thrown; no partial data returned.

**Code Sample**:
```typescript
it('should throw SchemaVersionNotFoundError for version 9999', async () => {
  await expect(registry.listNodeTypes(9999)).rejects.toThrow(SchemaVersionNotFoundError);
});
```

---

### 3.2 Property Type Coercion and Constraint Violations

#### TC-F1-E2.1: Float Property Outside Declared Range Is Rejected
**Objective**: Verify that writing a `confidence` value of `1.5` to a `Person` node (max 1.0) fails validation.

**Test Steps**:
1. Submit `{ id: 'p-003', name: 'Dan Kim', email: 'dan@example.com', confidence: 1.5 }`
2. Call `validator.validateNode('Person', payload)`
3. Assert error with code `RANGE_VIOLATION` for `confidence` field

**Expected Result**: Validation fails; error specifies `confidence` must be ≤ 1.0.

**Code Sample**:
```typescript
it('should reject confidence value exceeding max range', async () => {
  const result = await validator.validateNode('Person', { id: 'p-003', name: 'Dan Kim', email: 'dan@example.com', confidence: 1.5 });
  expect(result.valid).toBe(false);
  expect(result.errors.find(e => e.code === 'RANGE_VIOLATION')?.field).toBe('confidence');
});
```

---

#### TC-F1-E2.2: Unknown Property on Strict Node Type Is Rejected
**Objective**: Verify that submitting an undeclared property `nickname` on a `Person` node is rejected when the schema is in strict mode.

**Test Steps**:
1. Enable strict mode on validator
2. Submit `{ id: 'p-004', name: 'Eve Park', email: 'eve@example.com', nickname: 'Evie' }`
3. Assert error with code `UNKNOWN_PROPERTY`

**Expected Result**: Validation fails in strict mode; `nickname` flagged as unknown.

**Code Sample**:
```typescript
it('should reject unknown properties in strict schema mode', async () => {
  validator.setMode('strict');
  const result = await validator.validateNode('Person', { id: 'p-004', name: 'Eve Park', email: 'eve@example.com', nickname: 'Evie' });
  expect(result.valid).toBe(false);
  expect(result.errors.some(e => e.code === 'UNKNOWN_PROPERTY' && e.field === 'nickname')).toBe(true);
});
```

---

### 3.3 Concurrent Schema Updates

#### TC-F1-E3.1: Concurrent Registration of the Same Node Type Resolves Without Corruption
**Objective**: Verify that two simultaneous calls to register the same `Venue` node type result in exactly one registration and one `SchemaDuplicateError`.

**Test Steps**:
1. Fire `Promise.all([registry.registerNodeType({ name: 'Venue', ... }), registry.registerNodeType({ name: 'Venue', ... })])`
2. Assert one resolves successfully and one rejects with `SchemaDuplicateError`
3. Assert `listNodeTypes()` returns exactly one `Venue` entry

**Expected Result**: Exactly one registration; schema not corrupted; no partial writes.

**Code Sample**:
```typescript
it('should handle concurrent registration of the same node type safely', async () => {
  const results = await Promise.allSettled([
    registry.registerNodeType({ name: 'Venue', requiredProperties: [{ name: 'id', type: 'string' }] }),
    registry.registerNodeType({ name: 'Venue', requiredProperties: [{ name: 'id', type: 'string' }] }),
  ]);

  const fulfilled = results.filter(r => r.status === 'fulfilled');
  const rejected = results.filter(r => r.status === 'rejected');
  expect(fulfilled).toHaveLength(1);
  expect(rejected).toHaveLength(1);

  const types = await registry.listNodeTypes();
  expect(types.filter(t => t.name === 'Venue')).toHaveLength(1);
});
```

---

#### TC-F1-E3.2: Schema Version Counter Is Monotonically Increasing Under Concurrent Writes
**Objective**: Verify that 10 concurrent node type registrations produce 10 distinct, monotonically increasing schema version numbers.

**Test Steps**:
1. Register 10 distinct node types concurrently
2. Collect all returned version numbers
3. Assert all 10 are unique and form an increasing sequence

**Expected Result**: Versions are unique and monotonically increasing; no version collisions.

**Code Sample**:
```typescript
it('should issue monotonically increasing version numbers under concurrent writes', async () => {
  const names = Array.from({ length: 10 }, (_, i) => `NodeType${i}`);
  const versions = await Promise.all(
    names.map(name => registry.registerNodeType({ name, requiredProperties: [] }).then(r => r.schemaVersion))
  );
  const sorted = [...versions].sort((a, b) => a - b);
  expect(versions.every((v, i) => v === sorted[i])).toBe(true);
  expect(new Set(versions).size).toBe(10);
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Schema Lookup Throughput

#### TC-F1-P1.1: `getNodeType` Latency Under Sustained Load
**Objective**: Verify that `getNodeType` completes within 10 ms at the 99th percentile under 500 concurrent requests.

**Preconditions**:
- Schema registry warmed with 6 node types; registry cache enabled

**Test Steps**:
1. Fire 500 concurrent calls to `registry.getNodeType('Person')`
2. Record response times for each call
3. Compute p99 latency
4. Assert p99 ≤ 10 ms

**Expected Result**: p99 latency ≤ 10 ms; no errors; cache hit rate ≥ 95%.

**Code Sample**:
```typescript
it('should resolve getNodeType within 10 ms at p99 under 500 concurrent calls', async () => {
  const calls = Array.from({ length: 500 }, () =>
    performance.timerify(() => registry.getNodeType('Person'))()
  );
  const times = await Promise.all(calls);
  const p99 = percentile(99, times);
  expect(p99).toBeLessThanOrEqual(10);
});
```

---

#### TC-F1-P1.2: Schema Validation Throughput for High-Volume Write Stream
**Objective**: Verify that the schema validator processes 1,000 node validation requests per second.

**Test Steps**:
1. Generate 5,000 valid `Person` node payloads
2. Start timer; validate all 5,000 sequentially with batched parallelism (50 concurrent)
3. Assert total time ≤ 5 seconds (≥ 1,000 validations/sec)

**Expected Result**: 5,000 validations complete within 5 seconds; no memory leaks detected.

**Code Sample**:
```typescript
it('should validate 1000 Person nodes per second', async () => {
  const payloads = Array.from({ length: 5000 }, (_, i) => ({ id: `p-${i}`, name: `User ${i}`, email: `user${i}@example.com` }));
  const start = Date.now();
  await Promise.all(chunk(payloads, 50).map(batch => Promise.all(batch.map(p => validator.validateNode('Person', p)))));
  expect(Date.now() - start).toBeLessThanOrEqual(5000);
});
```

---

### 4.2 Migration Engine Performance

#### TC-F1-P2.1: Backfill Migration Completes Within SLA for 100k Edges
**Objective**: Verify that a property backfill migration on 100,000 `met_at` edges completes within 60 seconds.

**Test Steps**:
1. Seed 100,000 `met_at` edges without `confidence_score`
2. Start timer; execute `migrationEngine.run('M004_add_confidence_score')`
3. Assert total elapsed time ≤ 60 seconds

**Expected Result**: Migration completes in ≤ 60 s; all 100k edges updated; migration log shows `COMPLETE`.

**Code Sample**:
```typescript
it('should backfill 100k met_at edges within 60 seconds', async () => {
  await seedEdges('met_at', 100_000);
  const start = Date.now();
  await migrationEngine.run('M004_add_confidence_score');
  expect(Date.now() - start).toBeLessThanOrEqual(60_000);

  const nulls = await neo4j.run('MATCH ()-[r:met_at]->() WHERE r.confidence_score IS NULL RETURN count(r) AS n');
  expect(nulls.records[0].get('n').toInt()).toBe(0);
});
```

---

#### TC-F1-P2.2: Rollback Completes Within 10 Seconds for Single-Version Revert
**Objective**: Verify that rolling back one schema version takes no longer than 10 seconds regardless of graph size.

**Test Steps**:
1. Apply schema version 6 migration
2. Start timer; call `migrationEngine.rollback(6)`
3. Assert elapsed time ≤ 10 seconds
4. Assert active schema version is 5

**Expected Result**: Rollback completes within 10 s; version confirmed as 5.

**Code Sample**:
```typescript
it('should complete single-version rollback within 10 seconds', async () => {
  await migrationEngine.applyVersion(6);
  const start = Date.now();
  await migrationEngine.rollback(6);
  expect(Date.now() - start).toBeLessThanOrEqual(10_000);
  expect(await registry.getActiveVersion()).toBe(5);
});
```

---

### 4.3 Notification Fan-Out Performance

#### TC-F1-P3.1: Schema Change Event Delivered to All Subscribers Within 500 ms
**Objective**: Verify that a single schema change event is delivered to 20 subscriber services within 500 ms.

**Test Steps**:
1. Register 20 mock subscribers to `SCHEMA_CHANGED` event
2. Register a new node type to trigger the event
3. Record delivery timestamps per subscriber
4. Assert all 20 deliveries occur within 500 ms of event publish

**Expected Result**: All 20 subscribers receive event within 500 ms; no dropped events.

**Code Sample**:
```typescript
it('should deliver schema change event to 20 subscribers within 500 ms', async () => {
  const deliveries: number[] = [];
  Array.from({ length: 20 }).forEach(() =>
    eventBus.subscribe('SCHEMA_CHANGED', () => deliveries.push(Date.now()))
  );

  const publishedAt = Date.now();
  await registry.registerNodeType({ name: 'Venue', requiredProperties: [] });

  await waitFor(() => deliveries.length === 20, { timeout: 600 });
  deliveries.forEach(t => expect(t - publishedAt).toBeLessThanOrEqual(500));
});
```

---

#### TC-F1-P3.2: No Duplicate Notifications Delivered on Single Schema Change
**Objective**: Verify that a single schema registration triggers exactly one `SCHEMA_CHANGED` event per subscriber.

**Test Steps**:
1. Register one subscriber
2. Register one node type
3. Wait 1 second for any potential duplicate delivery
4. Assert subscriber received exactly 1 event

**Expected Result**: Exactly 1 event delivered; no duplicates within the 1-second observation window.

**Code Sample**:
```typescript
it('should deliver exactly one SCHEMA_CHANGED event per schema registration', async () => {
  let count = 0;
  eventBus.subscribe('SCHEMA_CHANGED', () => count++);
  await registry.registerNodeType({ name: 'Badge', requiredProperties: [] });
  await new Promise(r => setTimeout(r, 1000));
  expect(count).toBe(1);
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

**Approximate total**: ~27 test cases covering schema registry CRUD, write-time validation, migration engine, concurrent access safety, and performance SLAs.
