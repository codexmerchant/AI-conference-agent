# EPIC06 Feature 4 — Graph Traversal APIs — Test Cases

## Test Overview
Comprehensive test suite for Graph Traversal APIs covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Breadth-First Traversal

#### TC-F4-U1.1: BFS Returns Correct Nodes at Each Depth Level
**Objective**: Verify that a breadth-first traversal from a given root node returns nodes in the correct order by hop distance.

**Preconditions**:
- Graph fixture: `p-001` met `p-002`, `p-003`; `p-002` met `p-004`; `p-004` met `p-005`

**Test Steps**:
1. Call `traversalApi.bfs({ startNodeId: 'p-001', edgeTypes: ['met_at'], maxDepth: 3 })`
2. Assert depth-1 nodes = `['p-002', 'p-003']`
3. Assert depth-2 nodes = `['p-004']`
4. Assert depth-3 nodes = `['p-005']`

**Expected Result**: Correct BFS ordering by depth; no duplicates; root not included in result.

**Code Sample**:
```typescript
describe('GraphTraversalAPI — BFS', () => {
  it('should return nodes grouped by hop distance in BFS order', async () => {
    const result = await traversalApi.bfs({ startNodeId: 'p-001', edgeTypes: ['met_at'], maxDepth: 3 });

    expect(result.levels[1].map(n => n.id)).toEqual(expect.arrayContaining(['p-002', 'p-003']));
    expect(result.levels[2].map(n => n.id)).toEqual(['p-004']);
    expect(result.levels[3].map(n => n.id)).toEqual(['p-005']);
  });
});
```

---

#### TC-F4-U1.2: BFS Respects `maxDepth` Limit
**Objective**: Verify that BFS traversal stops at `maxDepth` and does not return nodes beyond that hop count.

**Test Steps**:
1. Execute BFS with `maxDepth: 2` on the fixture
2. Assert no nodes from depth 3 or beyond are in the result
3. Assert `result.truncated === true` indicating more nodes exist beyond the limit

**Expected Result**: No depth-3 nodes; `truncated` flag set; depth-1 and depth-2 nodes present.

**Code Sample**:
```typescript
it('should stop BFS at maxDepth and set truncated flag', async () => {
  const result = await traversalApi.bfs({ startNodeId: 'p-001', edgeTypes: ['met_at'], maxDepth: 2 });

  expect(result.levels[3]).toBeUndefined();
  expect(result.truncated).toBe(true);
});
```

---

#### TC-F4-U1.3: BFS with Edge Type Filter Returns Only Matching Edges
**Objective**: Verify that specifying `edgeTypes: ['spoke_at']` excludes `met_at` edges from the traversal.

**Test Steps**:
1. Add `spoke_at` edge from `p-001` to `p-010` in fixture
2. Execute BFS with `edgeTypes: ['spoke_at']` and `maxDepth: 1`
3. Assert only `p-010` appears at depth 1; `p-002` and `p-003` (connected via `met_at`) are excluded

**Expected Result**: Only `spoke_at`-connected nodes returned; `met_at` neighbors excluded.

**Code Sample**:
```typescript
it('should filter BFS traversal to only spoke_at edges', async () => {
  const result = await traversalApi.bfs({ startNodeId: 'p-001', edgeTypes: ['spoke_at'], maxDepth: 1 });
  expect(result.levels[1].map(n => n.id)).toEqual(['p-010']);
  expect(result.levels[1].map(n => n.id)).not.toContain('p-002');
});
```

---

### 1.2 Shortest Path

#### TC-F4-U2.1: Find Shortest Path Between Two Directly Connected Nodes
**Objective**: Verify that shortest path between directly connected nodes returns a 1-hop path.

**Test Steps**:
1. Call `traversalApi.shortestPath({ fromId: 'p-001', toId: 'p-002', edgeTypes: ['met_at'] })`
2. Assert `path.length === 1`
3. Assert `path.nodes[0].id === 'p-001'` and `path.nodes[1].id === 'p-002'`

**Expected Result**: Single-hop path; correct node sequence.

**Code Sample**:
```typescript
describe('GraphTraversalAPI — ShortestPath', () => {
  it('should return a 1-hop path for directly connected nodes', async () => {
    const path = await traversalApi.shortestPath({ fromId: 'p-001', toId: 'p-002', edgeTypes: ['met_at'] });

    expect(path.hops).toBe(1);
    expect(path.nodes.map(n => n.id)).toEqual(['p-001', 'p-002']);
  });
});
```

---

#### TC-F4-U2.2: Shortest Path Through Multiple Hops
**Objective**: Verify that the algorithm returns the minimum-hop path when multiple routes exist.

**Preconditions**:
- Route A: `p-001 → p-002 → p-005` (2 hops)
- Route B: `p-001 → p-003 → p-004 → p-005` (3 hops)

**Test Steps**:
1. Call `shortestPath({ fromId: 'p-001', toId: 'p-005', edgeTypes: ['met_at'] })`
2. Assert `path.hops === 2`
3. Assert path uses route A

**Expected Result**: 2-hop path via `p-002` returned; 3-hop route not selected.

**Code Sample**:
```typescript
it('should return the minimum-hop path when multiple routes exist', async () => {
  const path = await traversalApi.shortestPath({ fromId: 'p-001', toId: 'p-005', edgeTypes: ['met_at'] });
  expect(path.hops).toBe(2);
  expect(path.nodes[1].id).toBe('p-002');
});
```

---

#### TC-F4-U2.3: No Path Returns Null with Appropriate Message
**Objective**: Verify that `shortestPath` returns `null` when no path exists between two disconnected nodes.

**Test Steps**:
1. Ensure `p-001` and `p-isolated` have no connected path
2. Call `shortestPath({ fromId: 'p-001', toId: 'p-isolated', edgeTypes: ['met_at'] })`
3. Assert return value is `null` and no exception is thrown

**Expected Result**: `null` returned gracefully; no error thrown.

**Code Sample**:
```typescript
it('should return null when no path exists between disconnected nodes', async () => {
  const path = await traversalApi.shortestPath({ fromId: 'p-001', toId: 'p-isolated', edgeTypes: ['met_at'] });
  expect(path).toBeNull();
});
```

---

### 1.3 Neighborhood Expansion

#### TC-F4-U3.1: Neighborhood Query Returns Nodes and Edges Within Radius
**Objective**: Verify that `getNeighborhood(nodeId, radius)` returns all nodes and edges within the specified hop radius.

**Test Steps**:
1. Call `traversalApi.getNeighborhood({ nodeId: 'p-001', radius: 2, edgeTypes: ['met_at', 'spoke_at'] })`
2. Assert returned subgraph contains `p-002`, `p-003`, `p-004`
3. Assert all connecting edges are included in the subgraph

**Expected Result**: Full subgraph returned; nodes and edges both present; no duplicated nodes.

**Code Sample**:
```typescript
describe('GraphTraversalAPI — Neighborhood', () => {
  it('should return all nodes and edges within radius 2', async () => {
    const subgraph = await traversalApi.getNeighborhood({ nodeId: 'p-001', radius: 2, edgeTypes: ['met_at', 'spoke_at'] });

    const nodeIds = subgraph.nodes.map(n => n.id);
    expect(nodeIds).toEqual(expect.arrayContaining(['p-002', 'p-003', 'p-004']));
    expect(subgraph.edges.length).toBeGreaterThan(0);
  });
});
```

---

#### TC-F4-U3.2: Neighborhood Query with Node Type Filter
**Objective**: Verify that `getNeighborhood` with `nodeTypeFilter: ['Company']` only includes Company nodes in the result set.

**Test Steps**:
1. Add Company nodes in the neighborhood of `p-001`
2. Call `getNeighborhood({ nodeId: 'p-001', radius: 2, nodeTypeFilter: ['Company'] })`
3. Assert all returned nodes have `type === 'Company'`

**Expected Result**: Only Company nodes returned; Person nodes excluded.

**Code Sample**:
```typescript
it('should filter neighborhood nodes by type', async () => {
  const subgraph = await traversalApi.getNeighborhood({ nodeId: 'p-001', radius: 2, nodeTypeFilter: ['Company'] });
  expect(subgraph.nodes.every(n => n.type === 'Company')).toBe(true);
});
```

---

#### TC-F4-U3.3: Neighborhood Returns Empty Subgraph for Isolated Node
**Objective**: Verify that calling `getNeighborhood` on a node with no edges returns an empty subgraph.

**Test Steps**:
1. Call `getNeighborhood({ nodeId: 'p-isolated', radius: 2 })`
2. Assert `subgraph.nodes` is empty and `subgraph.edges` is empty

**Expected Result**: Empty subgraph returned; no errors.

**Code Sample**:
```typescript
it('should return empty subgraph for an isolated node', async () => {
  const subgraph = await traversalApi.getNeighborhood({ nodeId: 'p-isolated', radius: 2 });
  expect(subgraph.nodes).toHaveLength(0);
  expect(subgraph.edges).toHaveLength(0);
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Traversal API ↔ Neo4j Graph Database

#### TC-F4-I1.1: BFS Traversal Executes as Cypher and Returns Consistent Results
**Objective**: Verify that BFS results match a directly executed Cypher query for the same depth and edge types.

**Preconditions**:
- Seeded graph with 50 nodes and 200 edges in Neo4j test instance

**Test Steps**:
1. Execute `traversalApi.bfs({ startNodeId: 'p-001', edgeTypes: ['met_at'], maxDepth: 2 })`
2. Run equivalent Cypher: `MATCH path = (start:Person { id: 'p-001' })-[:met_at*1..2]->(end:Person) RETURN DISTINCT end`
3. Compare node ID sets; assert they are identical

**Expected Result**: API result and raw Cypher result are identical; no discrepancies.

**Code Sample**:
```typescript
it('should return results consistent with equivalent Cypher query', async () => {
  const apiResult = await traversalApi.bfs({ startNodeId: 'p-001', edgeTypes: ['met_at'], maxDepth: 2 });
  const apiIds = new Set(Object.values(apiResult.levels).flat().map(n => n.id));

  const cypherResult = await neo4j.run("MATCH path = (s:Person { id: 'p-001' })-[:met_at*1..2]->(e:Person) RETURN DISTINCT e.id AS id");
  const cypherIds = new Set(cypherResult.records.map(r => r.get('id')));

  expect(apiIds).toEqual(cypherIds);
});
```

---

#### TC-F4-I1.2: Traversal API Uses Read Replica for Query Routing
**Objective**: Verify that traversal queries are routed to the Neo4j read replica, not the primary write node.

**Test Steps**:
1. Enable query routing instrumentation
2. Execute a BFS traversal
3. Assert the query was sent to the `READ_REPLICA` endpoint

**Expected Result**: BFS query routes to read replica; primary write node not queried.

**Code Sample**:
```typescript
it('should route BFS query to Neo4j read replica', async () => {
  const routeSpy = jest.spyOn(neo4jRouter, 'routeQuery');
  await traversalApi.bfs({ startNodeId: 'p-001', edgeTypes: ['met_at'], maxDepth: 2 });
  expect(routeSpy).toHaveBeenCalledWith(expect.objectContaining({ targetRole: 'READ_REPLICA' }));
});
```

---

### 2.2 Traversal API ↔ Caching Layer

#### TC-F4-I2.1: Repeated Identical Traversal Query Is Served from Cache
**Objective**: Verify that a second identical BFS request is served from the traversal cache without hitting the database.

**Test Steps**:
1. Execute BFS traversal; record response
2. Spy on `neo4jClient.run`
3. Execute identical BFS traversal again
4. Assert `neo4jClient.run` was not called on the second request
5. Assert second response matches first

**Expected Result**: Cache hit on second request; Neo4j not queried; identical response returned.

**Code Sample**:
```typescript
it('should serve the second identical BFS request from cache', async () => {
  const params = { startNodeId: 'p-001', edgeTypes: ['met_at'], maxDepth: 2 };
  const first = await traversalApi.bfs(params);
  const neo4jSpy = jest.spyOn(neo4jClient, 'run');

  const second = await traversalApi.bfs(params);

  expect(neo4jSpy).not.toHaveBeenCalled();
  expect(second).toEqual(first);
});
```

---

#### TC-F4-I2.2: Cache Is Invalidated When a New Edge Is Written in the Traversal Scope
**Objective**: Verify that writing a new edge that falls within a cached traversal scope invalidates the cache entry.

**Test Steps**:
1. Execute and cache a BFS traversal from `p-001` at depth 2
2. Write a new `met_at` edge from `p-002` (within scope) to a new node `p-new`
3. Re-execute the same BFS traversal
4. Assert `neo4jClient.run` was called (cache miss)
5. Assert `p-new` appears in the new result

**Expected Result**: Cache invalidated on edge write; fresh result includes `p-new`.

**Code Sample**:
```typescript
it('should invalidate traversal cache when an edge within scope is written', async () => {
  await traversalApi.bfs({ startNodeId: 'p-001', edgeTypes: ['met_at'], maxDepth: 2 });
  await relationshipStore.writeEdge({ type: 'met_at', sourceId: 'p-002', targetId: 'p-new', properties: { occurred_at: new Date().toISOString() } });

  const neo4jSpy = jest.spyOn(neo4jClient, 'run');
  const result = await traversalApi.bfs({ startNodeId: 'p-001', edgeTypes: ['met_at'], maxDepth: 2 });

  expect(neo4jSpy).toHaveBeenCalled();
  expect(result.levels[2].map(n => n.id)).toContain('p-new');
});
```

---

### 2.3 Traversal API ↔ REST Interface

#### TC-F4-I3.1: REST GET /traverse/bfs Returns 200 with Correct Payload
**Objective**: Verify that the REST API endpoint for BFS traversal returns HTTP 200 with a valid JSON payload.

**Test Steps**:
1. Send `GET /api/v1/graph/traverse/bfs?startNodeId=p-001&edgeTypes=met_at&maxDepth=2`
2. Assert HTTP 200 response
3. Assert response body contains `levels`, `truncated`, `totalNodeCount` fields

**Expected Result**: 200 OK; JSON body well-formed; `levels` keyed by depth number.

**Code Sample**:
```typescript
it('should return 200 with BFS payload from REST endpoint', async () => {
  const res = await request(app).get('/api/v1/graph/traverse/bfs').query({ startNodeId: 'p-001', edgeTypes: 'met_at', maxDepth: 2 });

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('levels');
  expect(res.body).toHaveProperty('truncated');
  expect(res.body).toHaveProperty('totalNodeCount');
});
```

---

#### TC-F4-I3.2: REST POST /traverse/shortest-path Returns 404 When No Path Exists
**Objective**: Verify that the shortest-path endpoint returns HTTP 404 when no path exists between specified nodes.

**Test Steps**:
1. Send `POST /api/v1/graph/traverse/shortest-path` with `{ fromId: 'p-001', toId: 'p-isolated' }`
2. Assert HTTP 404 response
3. Assert body contains `{ error: 'NO_PATH_FOUND', fromId: 'p-001', toId: 'p-isolated' }`

**Expected Result**: 404 returned; error payload includes node IDs.

**Code Sample**:
```typescript
it('should return 404 when no path exists between specified nodes', async () => {
  const res = await request(app).post('/api/v1/graph/traverse/shortest-path').send({ fromId: 'p-001', toId: 'p-isolated' });

  expect(res.status).toBe(404);
  expect(res.body.error).toBe('NO_PATH_FOUND');
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Cyclic Graph Handling

#### TC-F4-E1.1: BFS on Cyclic Graph Terminates Without Infinite Loop
**Objective**: Verify that BFS on a graph containing cycles (`p-001 → p-002 → p-003 → p-001`) terminates and returns each node once.

**Test Steps**:
1. Create a 3-node cycle in the graph
2. Call `bfs({ startNodeId: 'p-001', edgeTypes: ['met_at'], maxDepth: 10 })`
3. Assert traversal completes without hanging
4. Assert each of `p-002`, `p-003` appears exactly once in results

**Expected Result**: Traversal terminates; each node returned at most once; no infinite loop.

**Code Sample**:
```typescript
it('should terminate BFS traversal on a cyclic graph', async () => {
  await createCycle(['p-001', 'p-002', 'p-003']);

  const result = await traversalApi.bfs({ startNodeId: 'p-001', edgeTypes: ['met_at'], maxDepth: 10 });
  const allNodes = Object.values(result.levels).flat();

  expect(allNodes.filter(n => n.id === 'p-002')).toHaveLength(1);
  expect(allNodes.filter(n => n.id === 'p-003')).toHaveLength(1);
});
```

---

#### TC-F4-E1.2: Shortest Path on Cyclic Graph Returns Minimum-Hop Path Not a Cycle
**Objective**: Verify that shortest-path on a graph with multiple cyclic routes still returns the minimum-hop path.

**Test Steps**:
1. Graph has direct `p-001 → p-003` edge (1 hop) and cycle path `p-001 → p-002 → p-003` (2 hops)
2. Call `shortestPath({ fromId: 'p-001', toId: 'p-003' })`
3. Assert returned path has `hops === 1`

**Expected Result**: Direct 1-hop path returned; cycle path not selected.

**Code Sample**:
```typescript
it('should return direct 1-hop path even when a cyclic 2-hop path exists', async () => {
  const path = await traversalApi.shortestPath({ fromId: 'p-001', toId: 'p-003', edgeTypes: ['met_at'] });
  expect(path!.hops).toBe(1);
});
```

---

### 3.2 Very Deep Graph Traversal

#### TC-F4-E2.1: BFS on Chain of 1,000 Nodes Respects maxDepth Cutoff
**Objective**: Verify that BFS on a 1,000-node linear chain with `maxDepth: 5` returns only 5 depth levels.

**Test Steps**:
1. Create a linear chain of 1,000 Person nodes
2. Call `bfs({ startNodeId: 'chain-0', edgeTypes: ['met_at'], maxDepth: 5 })`
3. Assert `Object.keys(result.levels).length === 5`
4. Assert `result.truncated === true`

**Expected Result**: Exactly 5 levels returned; truncation flag set.

**Code Sample**:
```typescript
it('should respect maxDepth on a 1000-node linear chain', async () => {
  const result = await traversalApi.bfs({ startNodeId: 'chain-0', edgeTypes: ['met_at'], maxDepth: 5 });
  expect(Object.keys(result.levels)).toHaveLength(5);
  expect(result.truncated).toBe(true);
});
```

---

#### TC-F4-E2.2: Shortest Path on Chain of 100 Nodes Between Endpoints
**Objective**: Verify that shortest path across a 100-node linear chain returns a 99-hop path.

**Test Steps**:
1. Create a 100-node chain
2. Call `shortestPath({ fromId: 'chain-0', toId: 'chain-99' })`
3. Assert `path.hops === 99`

**Expected Result**: Correct 99-hop path; no shortcuts invented.

**Code Sample**:
```typescript
it('should find the 99-hop path in a 100-node chain', async () => {
  const path = await traversalApi.shortestPath({ fromId: 'chain-0', toId: 'chain-99', edgeTypes: ['met_at'] });
  expect(path!.hops).toBe(99);
});
```

---

### 3.3 Edge Type Combinations

#### TC-F4-E3.1: Multi-Edge-Type BFS Returns Nodes Connected by Any Specified Type
**Objective**: Verify that specifying multiple edge types in BFS includes nodes reachable via any of those types.

**Test Steps**:
1. `p-001` has a `met_at` edge to `p-010` and a `spoke_at` edge to `p-020`
2. Call `bfs({ startNodeId: 'p-001', edgeTypes: ['met_at', 'spoke_at'], maxDepth: 1 })`
3. Assert both `p-010` and `p-020` appear at depth 1

**Expected Result**: Both edge-type neighbors included; not filtered to one type.

**Code Sample**:
```typescript
it('should include nodes reachable by any specified edge type in multi-type BFS', async () => {
  const result = await traversalApi.bfs({ startNodeId: 'p-001', edgeTypes: ['met_at', 'spoke_at'], maxDepth: 1 });
  const depth1 = result.levels[1].map(n => n.id);
  expect(depth1).toContain('p-010');
  expect(depth1).toContain('p-020');
});
```

---

#### TC-F4-E3.2: Traversal with Empty Edge Type Array Returns Only the Root Node
**Objective**: Verify that passing an empty `edgeTypes` array results in no traversal — only the root node information is returned.

**Test Steps**:
1. Call `bfs({ startNodeId: 'p-001', edgeTypes: [], maxDepth: 3 })`
2. Assert `result.levels` is empty (or contains only depth 0)
3. Assert `result.totalNodeCount === 0` (excluding root)

**Expected Result**: No neighbors traversed; empty levels returned.

**Code Sample**:
```typescript
it('should traverse no edges when edgeTypes array is empty', async () => {
  const result = await traversalApi.bfs({ startNodeId: 'p-001', edgeTypes: [], maxDepth: 3 });
  expect(Object.keys(result.levels)).toHaveLength(0);
  expect(result.totalNodeCount).toBe(0);
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 BFS Throughput

#### TC-F4-P1.1: BFS at Depth 2 Completes in Under 50 ms on a 10k-Node Graph
**Objective**: Verify that BFS to depth 2 from any node in a 10,000-node graph completes within 50 ms.

**Preconditions**:
- 10,000 Person nodes with average degree 15 seeded in Neo4j

**Test Steps**:
1. Select 100 random root nodes
2. Execute BFS (`maxDepth: 2`) for each and record latency
3. Assert p95 ≤ 50 ms

**Expected Result**: p95 ≤ 50 ms; no timeout errors.

**Code Sample**:
```typescript
it('should complete depth-2 BFS within 50 ms at p95 on a 10k node graph', async () => {
  const latencies = await Promise.all(
    sampleNodeIds.map(async id => {
      const t = Date.now();
      await traversalApi.bfs({ startNodeId: id, edgeTypes: ['met_at'], maxDepth: 2 });
      return Date.now() - t;
    })
  );
  expect(percentile(95, latencies)).toBeLessThanOrEqual(50);
});
```

---

#### TC-F4-P1.2: 500 Concurrent BFS Requests Handled Without Degradation
**Objective**: Verify that 500 simultaneous BFS requests complete without error and p99 remains under 200 ms.

**Test Steps**:
1. Fire 500 concurrent BFS calls with random root nodes
2. Record per-call latency
3. Assert all return successfully; p99 ≤ 200 ms

**Expected Result**: 0 failures; p99 ≤ 200 ms under 500 concurrent requests.

**Code Sample**:
```typescript
it('should handle 500 concurrent BFS requests within 200 ms p99', async () => {
  const latencies = await Promise.all(
    Array.from({ length: 500 }, async (_, i) => {
      const t = Date.now();
      await traversalApi.bfs({ startNodeId: sampleNodeIds[i % sampleNodeIds.length], edgeTypes: ['met_at'], maxDepth: 2 });
      return Date.now() - t;
    })
  );
  expect(percentile(99, latencies)).toBeLessThanOrEqual(200);
});
```

---

### 4.2 Shortest Path Performance

#### TC-F4-P2.1: Shortest Path on 50k-Node Graph Resolves in Under 100 ms
**Objective**: Verify that the shortest-path query between two random nodes in a 50,000-node graph completes within 100 ms at p95.

**Test Steps**:
1. Seed 50,000 nodes with random edges
2. Run 100 random source-to-target shortest path queries
3. Assert p95 ≤ 100 ms

**Expected Result**: p95 ≤ 100 ms; no queries time out.

**Code Sample**:
```typescript
it('should find shortest path within 100 ms p95 on a 50k-node graph', async () => {
  const pairs = randomNodePairs(100);
  const latencies = await Promise.all(pairs.map(async ({ from, to }) => {
    const t = Date.now();
    await traversalApi.shortestPath({ fromId: from, toId: to, edgeTypes: ['met_at'] });
    return Date.now() - t;
  }));
  expect(percentile(95, latencies)).toBeLessThanOrEqual(100);
});
```

---

#### TC-F4-P2.2: Cache Hit Reduces Shortest Path Latency by 80%
**Objective**: Verify that a cached shortest-path result is served at least 80% faster than the initial uncached query.

**Test Steps**:
1. Execute `shortestPath` and record `uncachedMs`
2. Execute same query again; record `cachedMs`
3. Assert `cachedMs <= uncachedMs * 0.20` (80% faster)

**Expected Result**: Cache hit reduces latency by ≥ 80%.

**Code Sample**:
```typescript
it('should serve cached shortest path 80% faster than uncached', async () => {
  const params = { fromId: 'p-001', toId: 'p-005', edgeTypes: ['met_at'] as const };

  let t = Date.now();
  await traversalApi.shortestPath(params);
  const uncachedMs = Date.now() - t;

  t = Date.now();
  await traversalApi.shortestPath(params);
  const cachedMs = Date.now() - t;

  expect(cachedMs).toBeLessThanOrEqual(uncachedMs * 0.2);
});
```

---

### 4.3 Neighborhood Expansion Performance

#### TC-F4-P3.1: Neighborhood at Radius 3 Returns Within 200 ms for Average Degree 15
**Objective**: Verify that neighborhood expansion at radius 3 for a node with average degree 15 completes within 200 ms.

**Test Steps**:
1. Seed nodes with average degree 15
2. Execute `getNeighborhood({ nodeId: 'p-001', radius: 3 })`
3. Assert elapsed time ≤ 200 ms

**Expected Result**: Neighborhood at radius 3 returned in ≤ 200 ms.

**Code Sample**:
```typescript
it('should return neighborhood at radius 3 within 200 ms', async () => {
  const start = Date.now();
  const subgraph = await traversalApi.getNeighborhood({ nodeId: 'p-001', radius: 3, edgeTypes: ['met_at'] });
  expect(Date.now() - start).toBeLessThanOrEqual(200);
  expect(subgraph.nodes.length).toBeGreaterThan(0);
});
```

---

#### TC-F4-P3.2: Neighborhood Response Is Paginated When Node Count Exceeds 500
**Objective**: Verify that when a neighborhood contains more than 500 nodes, the API returns a paginated response rather than a single oversized payload.

**Test Steps**:
1. Build a high-density neighborhood with 600+ nodes within radius 2
2. Call `getNeighborhood({ nodeId: 'p-dense', radius: 2, pageSize: 100 })`
3. Assert `result.nodes.length === 100`
4. Assert `result.pagination.hasNextPage === true`

**Expected Result**: Paginated response; 100 nodes per page; `hasNextPage` flag set.

**Code Sample**:
```typescript
it('should paginate neighborhood response when node count exceeds 500', async () => {
  const result = await traversalApi.getNeighborhood({ nodeId: 'p-dense', radius: 2, edgeTypes: ['met_at'], pageSize: 100 });

  expect(result.nodes).toHaveLength(100);
  expect(result.pagination.hasNextPage).toBe(true);
  expect(result.pagination.totalCount).toBeGreaterThan(500);
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

**Approximate total**: ~27 test cases covering BFS, shortest path, neighborhood expansion, cyclic graph safety, cache invalidation, REST API contract, and performance SLAs.
