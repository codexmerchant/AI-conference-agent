# EPIC12 Feature 5 — Hybrid Graph-Vector Retrieval — Test Cases

## Test Overview
Comprehensive test suite for Hybrid Graph-Vector Retrieval covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Graph Traversal Engine

#### TC-F5-U1.1: First-Degree Entity Neighbor Expansion
**Objective**: Verify that the graph traversal engine correctly expands to all first-degree neighbors of a given entity node.

**Preconditions**:
- Knowledge graph loaded with entities: `Person:Alice`, `Company:Vercel`, `Topic:EdgeRuntime`
- Edges: `Alice → WORKS_AT → Vercel`, `Alice → SPOKE_ABOUT → EdgeRuntime`

**Test Steps**:
1. Call `graphEngine.expand({ nodeId: 'Person:Alice', depth: 1 })`
2. Assert returned neighbor set contains `Company:Vercel` and `Topic:EdgeRuntime`
3. Assert no depth-2 nodes included

**Expected Result**: Exactly 2 first-degree neighbors; no transitive nodes.

**Code Sample**:
```typescript
describe('GraphTraversalEngine', () => {
  it('should expand to first-degree neighbors only at depth=1', async () => {
    const engine = new GraphTraversalEngine({ graphClient: testGraph });
    const neighbors = await engine.expand({ nodeId: 'Person:Alice', depth: 1 });

    const ids = neighbors.map(n => n.id);
    expect(ids).toContain('Company:Vercel');
    expect(ids).toContain('Topic:EdgeRuntime');
    expect(ids).toHaveLength(2);
  });
});
```

---

#### TC-F5-U1.2: Relation-Type Filter in Graph Traversal
**Objective**: Verify that specifying a `relationTypes` filter returns only edges of the specified type.

**Test Steps**:
1. From `Person:Alice`, expand with `relationTypes: ['SPOKE_ABOUT']`
2. Assert only `Topic:EdgeRuntime` returned; `Company:Vercel` (via `WORKS_AT`) excluded

**Expected Result**: Only `SPOKE_ABOUT` relations traversed; other relation types ignored.

**Code Sample**:
```typescript
it('should filter traversal to the specified relation types', async () => {
  const neighbors = await engine.expand({
    nodeId: 'Person:Alice',
    depth: 1,
    relationTypes: ['SPOKE_ABOUT'],
  });

  const ids = neighbors.map(n => n.id);
  expect(ids).toContain('Topic:EdgeRuntime');
  expect(ids).not.toContain('Company:Vercel');
});
```

---

#### TC-F5-U1.3: Cycle Detection in Bidirectional Graph Traversal
**Objective**: Verify that the traversal engine does not enter an infinite loop when the graph contains cycles.

**Test Steps**:
1. Create a cyclic graph: `A → B → C → A`
2. Call `graphEngine.expand({ nodeId: 'A', depth: 5 })`
3. Assert the call terminates within 2 seconds
4. Assert no node appears more than once in the result set

**Expected Result**: Traversal terminates; each node appears at most once (cycle deduplication).

**Code Sample**:
```typescript
it('should handle cycles in the graph without infinite recursion', async () => {
  const cyclicGraph = buildCyclicGraph(['A', 'B', 'C']); // A→B→C→A
  const engine = new GraphTraversalEngine({ graphClient: cyclicGraph });

  const result = await Promise.race([
    engine.expand({ nodeId: 'A', depth: 5 }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
  ]);

  const ids = (result as GraphNode[]).map(n => n.id);
  expect(new Set(ids).size).toBe(ids.length); // no duplicates
});
```

---

### 1.2 Vector-Graph Score Fusion

#### TC-F5-U2.1: RRF Fusion Produces Correct Merged Rankings
**Objective**: Verify that Reciprocal Rank Fusion (RRF) correctly merges vector and graph result lists into a unified ranking.

**Test Steps**:
1. Graph results: `[D1 rank1, D2 rank2, D3 rank3]`
2. Vector results: `[D2 rank1, D4 rank2, D1 rank3]`
3. Call `fusionEngine.rrf({ graphRanks, vectorRanks, k: 60 })`
4. Assert D2 is ranked #1 (top in vector, #2 in graph); assert D1 is #2

**Expected Result**: RRF merges correctly; D2 and D1 ranked ahead of D3 and D4.

**Code Sample**:
```typescript
describe('HybridFusionEngine', () => {
  it('should produce correct RRF merged ranking from graph and vector results', () => {
    const fusionEngine = new HybridFusionEngine();
    const graphRanks  = [{ id: 'D1', rank: 1 }, { id: 'D2', rank: 2 }, { id: 'D3', rank: 3 }];
    const vectorRanks = [{ id: 'D2', rank: 1 }, { id: 'D4', rank: 2 }, { id: 'D1', rank: 3 }];

    const merged = fusionEngine.rrf({ graphRanks, vectorRanks, k: 60 });

    expect(merged[0].id).toBe('D2');
    expect(merged[1].id).toBe('D1');
  });
});
```

---

#### TC-F5-U2.2: Configurable Alpha Weighting Between Graph and Vector Scores
**Objective**: Verify that setting `alpha = 1.0` (pure vector) returns identical ordering to the vector-only result.

**Test Steps**:
1. Compute hybrid score with `alpha = 1.0` (full vector weight, zero graph weight)
2. Assert final ranking matches the vector-only ranking exactly

**Expected Result**: `alpha = 1.0` degenerates to pure vector retrieval.

**Code Sample**:
```typescript
it('should degenerate to pure vector retrieval when alpha = 1.0', () => {
  const vectorOnlyRanks = [{ id: 'D3', score: 0.9 }, { id: 'D1', score: 0.7 }, { id: 'D2', score: 0.5 }];
  const graphRanks      = [{ id: 'D1', score: 0.95 }, { id: 'D2', score: 0.8 }, { id: 'D3', score: 0.3 }];

  const hybrid = fusionEngine.alphaMerge({ vectorRanks: vectorOnlyRanks, graphRanks, alpha: 1.0 });
  expect(hybrid.map(r => r.id)).toEqual(['D3', 'D1', 'D2']);
});
```

---

#### TC-F5-U2.3: Score Normalization Before Fusion
**Objective**: Verify that raw graph degree scores and cosine similarity scores are independently normalized to [0, 1] before fusion.

**Test Steps**:
1. Provide graph scores `[500, 250, 100]` (degree-based) and vector scores `[0.95, 0.82, 0.71]`
2. Call `fusionEngine.normalize({ graphScores, vectorScores })`
3. Assert both normalized arrays have max = 1.0 and min = 0.0

**Expected Result**: Both score arrays normalized to [0, 1] before alpha-weighted combination.

**Code Sample**:
```typescript
it('should min-max normalize graph and vector scores independently', () => {
  const { normGraph, normVector } = fusionEngine.normalize({
    graphScores:  [500, 250, 100],
    vectorScores: [0.95, 0.82, 0.71],
  });

  expect(Math.max(...normGraph)).toBeCloseTo(1.0);
  expect(Math.min(...normGraph)).toBeCloseTo(0.0);
  expect(Math.max(...normVector)).toBeCloseTo(1.0);
  expect(Math.min(...normVector)).toBeCloseTo(0.0);
});
```

---

### 1.3 Entity Extraction for Graph Seeding

#### TC-F5-U3.1: NER Extracts Person, Organization, and Topic Entities
**Objective**: Verify that the NER pipeline extracts `PERSON`, `ORG`, and `TOPIC` entities from a conference note.

**Test Steps**:
1. Run NER on: `"Alice Chen from Vercel spoke about edge runtime and WebAssembly."`
2. Assert entities: `[Person:AliceChen, Org:Vercel, Topic:EdgeRuntime, Topic:WebAssembly]`
3. Assert entity types are correctly labeled

**Expected Result**: 4 entities extracted with correct types and canonical IDs.

**Code Sample**:
```typescript
it('should extract PERSON, ORG, and TOPIC entities from conference notes', async () => {
  const ner = new ConferenceNERPipeline();
  const entities = await ner.extract('Alice Chen from Vercel spoke about edge runtime and WebAssembly.');

  expect(entities.find(e => e.type === 'PERSON' && e.name === 'Alice Chen')).toBeDefined();
  expect(entities.find(e => e.type === 'ORG'    && e.name === 'Vercel')).toBeDefined();
  expect(entities.find(e => e.type === 'TOPIC'  && e.name.toLowerCase().includes('edge runtime'))).toBeDefined();
  expect(entities.find(e => e.type === 'TOPIC'  && e.name === 'WebAssembly')).toBeDefined();
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Full Hybrid Retrieval Pipeline

#### TC-F5-I1.1: Hybrid Query Returns Results From Both Graph and Vector Paths
**Objective**: Verify that the hybrid retrieval pipeline draws results from both graph traversal and vector ANN, combining them in the fused result.

**Preconditions**:
- Knowledge graph populated with 500 entities and 1000 edges
- Vector index populated with 5000 document embeddings

**Test Steps**:
1. Identify a query `"distributed tracing with OpenTelemetry"` that has both graph-adjacent documents and semantically similar documents
2. Call `hybridEngine.query({ query: "distributed tracing OpenTelemetry", topK: 10 })`
3. Assert `result.graphHits > 0` and `result.vectorHits > 0`
4. Assert final merged list has <= 10 items

**Expected Result**: Both retrieval paths contribute; merged list contains items from each source.

**Code Sample**:
```typescript
it('should return hits from both graph and vector retrieval paths', async () => {
  const engine = new HybridGraphVectorEngine({ graphClient, vectorIndex, fusionStrategy: 'rrf' });
  const result = await engine.query({ query: 'distributed tracing OpenTelemetry', topK: 10 });

  expect(result.graphHits).toBeGreaterThan(0);
  expect(result.vectorHits).toBeGreaterThan(0);
  expect(result.mergedHits.length).toBeLessThanOrEqual(10);
});
```

---

#### TC-F5-I1.2: Graph-Only Entities Surfaced via Hybrid Query
**Objective**: Verify that documents linked in the graph but not semantically similar to the query are still surfaced via hybrid retrieval.

**Test Steps**:
1. Index a document `D-graph-only` with unrelated text but link it in the graph to the query entity `Topic:Tracing` via `RELATES_TO`
2. Ensure `D-graph-only`'s cosine similarity to the query is < 0.5
3. Run hybrid query for "distributed tracing"
4. Assert `D-graph-only` appears in top-15 results (graph path rescue)

**Expected Result**: Graph-adjacent document surfaced even though it would not appear in pure vector search.

**Code Sample**:
```typescript
it('should surface graph-linked documents not reachable via vector search alone', async () => {
  await vectorIndex.insert('doc-graph-only', embeddingFor('completely unrelated content about finance'));
  await graphClient.addEdge('Topic:Tracing', 'RELATES_TO', 'doc-graph-only');

  const result = await engine.query({ query: 'distributed tracing', topK: 15 });
  expect(result.mergedHits.map(h => h.id)).toContain('doc-graph-only');
});
```

---

### 2.2 Graph + Vector Index Sync

#### TC-F5-I2.1: New Document Indexed in Both Graph and Vector Simultaneously
**Objective**: Verify that indexing a new document atomically updates both the knowledge graph and the vector index.

**Test Steps**:
1. Index `{ id: 'note-new', text: 'WebAssembly WASI interface types', entities: ['Topic:WebAssembly', 'Topic:WASI'] }`
2. Assert `vectorIndex.contains('note-new')` = true
3. Assert `graphClient.nodeExists('note-new')` = true
4. Assert edges `note-new → RELATED_TO → Topic:WebAssembly` and `note-new → RELATED_TO → Topic:WASI` exist

**Expected Result**: Both graph and vector index updated atomically; no partial state.

**Code Sample**:
```typescript
it('should atomically index a document in both graph and vector store', async () => {
  await hybridIndexer.index({
    id: 'note-new',
    text: 'WebAssembly WASI interface types',
    entities: ['Topic:WebAssembly', 'Topic:WASI'],
  });

  expect(await vectorIndex.contains('note-new')).toBe(true);
  expect(await graphClient.nodeExists('note-new')).toBe(true);
  expect(await graphClient.edgeExists('note-new', 'RELATED_TO', 'Topic:WebAssembly')).toBe(true);
});
```

---

#### TC-F5-I2.2: Deletion Removes Document from Both Graph and Vector
**Objective**: Verify that deleting a document removes it from both the graph and the vector index.

**Test Steps**:
1. Index a document with entities
2. Delete it via `hybridIndexer.delete(id)`
3. Assert `vectorIndex.contains(id)` = false
4. Assert `graphClient.nodeExists(id)` = false

**Expected Result**: Both stores cleaned up; no orphaned graph node or vector.

**Code Sample**:
```typescript
it('should remove a document from both graph and vector index on deletion', async () => {
  const doc = await hybridIndexer.index({ id: 'note-del', text: 'ephemeral content', entities: ['Topic:Test'] });
  await hybridIndexer.delete(doc.id);

  expect(await vectorIndex.contains(doc.id)).toBe(false);
  expect(await graphClient.nodeExists(doc.id)).toBe(false);
});
```

---

### 2.3 Hybrid Retrieval Quality Benchmarks

#### TC-F5-I3.1: nDCG@10 Hybrid >= nDCG@10 Vector-Only
**Objective**: Verify that hybrid retrieval achieves equal or better nDCG@10 than vector-only on a labeled conference dataset.

**Test Steps**:
1. Load 30 labeled queries from `hybrid-eval-30.json` with graded relevance labels
2. Run vector-only and hybrid retrieval for each query; collect top-10 results
3. Compute nDCG@10 for each method
4. Assert `nDCG_hybrid >= nDCG_vector`

**Expected Result**: Hybrid nDCG@10 >= vector-only nDCG@10.

**Code Sample**:
```typescript
it('should achieve nDCG@10 >= vector-only baseline on labeled eval set', async () => {
  const evalSet = loadEvalSet('hybrid-eval-30.json');

  let sumVec = 0, sumHybrid = 0;
  for (const { query, relevanceLabels } of evalSet) {
    const vecHits     = await vectorEngine.query({ query, topK: 10 });
    const hybridHits  = await engine.query({ query, topK: 10 });

    sumVec    += computeNDCG(vecHits.mergedHits,    relevanceLabels, 10);
    sumHybrid += computeNDCG(hybridHits.mergedHits, relevanceLabels, 10);
  }

  expect(sumHybrid / evalSet.length).toBeGreaterThanOrEqual(sumVec / evalSet.length);
});
```

---

#### TC-F5-I3.2: Entity-Centric Query Recall@10 >= 0.90
**Objective**: Verify that recall@10 for entity-centric queries (e.g., "what did Alice Chen say about WASM?") is >= 0.90.

**Test Steps**:
1. Load 20 entity-centric labeled queries from `entity-centric-eval-20.json`
2. Run hybrid retrieval for each; collect top-10 results
3. Assert mean recall@10 >= 0.90

**Expected Result**: Entity-centric recall@10 >= 0.90 thanks to graph path.

**Code Sample**:
```typescript
it('should achieve recall@10 >= 0.90 for entity-centric queries', async () => {
  const evalSet = loadEvalSet('entity-centric-eval-20.json');
  const recalls = await Promise.all(evalSet.map(async ({ query, relevantIds }) => {
    const hits = await engine.query({ query, topK: 10 });
    const found = hits.mergedHits.filter(h => relevantIds.includes(h.id));
    return found.length / relevantIds.length;
  }));

  const mean = recalls.reduce((s, r) => s + r, 0) / recalls.length;
  expect(mean).toBeGreaterThanOrEqual(0.90);
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Graph Isolation and Disconnected Components

#### TC-F5-E1.1: Query Entity Not in Graph Falls Back to Vector-Only
**Objective**: Verify that when the query entity has no graph nodes, retrieval gracefully falls back to vector-only results.

**Test Steps**:
1. Submit query `"neuromorphic computing architectures"` — no nodes exist in the graph for this topic
2. Call `engine.query({ query: "neuromorphic computing", topK: 5 })`
3. Assert results are returned (from vector path)
4. Assert `result.graphHits === 0` and `result.vectorHits > 0`

**Expected Result**: Graceful vector-only fallback; no error; useful results returned.

**Code Sample**:
```typescript
it('should fall back to vector-only when query entity has no graph nodes', async () => {
  const result = await engine.query({ query: 'neuromorphic computing architectures', topK: 5 });

  expect(result.graphHits).toBe(0);
  expect(result.vectorHits).toBeGreaterThan(0);
  expect(result.mergedHits.length).toBeGreaterThan(0);
});
```

---

#### TC-F5-E1.2: Isolated Graph Node Returns No Graph Hits
**Objective**: Verify that a node with no edges contributes zero graph hits while vector results are still returned.

**Test Steps**:
1. Add an isolated node `Topic:Orphan` with no edges
2. Query `"orphan topic"` where `Topic:Orphan` is the only matching entity
3. Assert `graphHits === 0`; vector results still returned

**Expected Result**: Isolated node yields no graph traversal hits; pipeline does not crash.

**Code Sample**:
```typescript
it('should not produce graph hits for an isolated node with no edges', async () => {
  await graphClient.addNode({ id: 'Topic:Orphan', label: 'orphan topic' });
  const result = await engine.query({ query: 'orphan topic test', topK: 5 });

  expect(result.graphHits).toBe(0);
  expect(result.mergedHits).toBeDefined();
});
```

---

### 3.2 Fusion Extremes

#### TC-F5-E2.1: All Hits Unique to One Source Produces Valid Merged List
**Objective**: Verify that when graph and vector results share no documents in common, RRF still produces a valid merged ranking.

**Test Steps**:
1. Mock graph to return `[G1, G2, G3]` and vector to return `[V1, V2, V3]` with zero overlap
2. Call `fusionEngine.rrf({ graphRanks, vectorRanks, k: 60 })`
3. Assert merged list contains all 6 documents in valid RRF order

**Expected Result**: All 6 unique documents in merged list; valid RRF scores assigned to all.

**Code Sample**:
```typescript
it('should merge non-overlapping graph and vector results into a valid ranking', () => {
  const graphRanks  = [{ id: 'G1', rank: 1 }, { id: 'G2', rank: 2 }, { id: 'G3', rank: 3 }];
  const vectorRanks = [{ id: 'V1', rank: 1 }, { id: 'V2', rank: 2 }, { id: 'V3', rank: 3 }];

  const merged = fusionEngine.rrf({ graphRanks, vectorRanks, k: 60 });

  expect(merged).toHaveLength(6);
  const ids = new Set(merged.map(r => r.id));
  expect(ids.size).toBe(6);
});
```

---

#### TC-F5-E2.2: alpha = 0.0 Degenerates to Graph-Only Retrieval
**Objective**: Verify that `alpha = 0.0` (zero vector weight) produces rankings identical to graph-only retrieval.

**Test Steps**:
1. Set `alpha = 0.0`; run hybrid retrieval
2. Run graph-only retrieval for the same query
3. Assert rankings are identical

**Expected Result**: `alpha = 0.0` == graph-only ranking.

**Code Sample**:
```typescript
it('should degenerate to graph-only ordering when alpha = 0.0', async () => {
  const graphOnlyResult = await graphEngine.query({ query: 'microservices patterns', topK: 5 });
  const hybridResult    = await engine.query({ query: 'microservices patterns', topK: 5, alpha: 0.0 });

  expect(hybridResult.mergedHits.map(h => h.id)).toEqual(graphOnlyResult.hits.map(h => h.id));
});
```

---

### 3.3 Large Graph Traversal

#### TC-F5-E3.1: Depth-3 Traversal on Dense Graph Respects Node Limit
**Objective**: Verify that depth-3 traversal on a dense graph (1000+ neighbors per node) respects the configured `maxNodes` limit.

**Test Steps**:
1. Build a dense graph where each node has 50 neighbors
2. Traverse from a root node with `depth: 3, maxNodes: 200`
3. Assert returned node count <= 200

**Expected Result**: Node limit enforced; traversal terminates at `maxNodes`.

**Code Sample**:
```typescript
it('should respect maxNodes limit on deep traversal of a dense graph', async () => {
  const denseGraph = buildDenseGraph({ nodes: 1000, edgesPerNode: 50 });
  const engine = new GraphTraversalEngine({ graphClient: denseGraph });

  const result = await engine.expand({ nodeId: 'root', depth: 3, maxNodes: 200 });
  expect(result.length).toBeLessThanOrEqual(200);
});
```

---

#### TC-F5-E3.2: Graph Traversal Timeout Causes Partial-Result Fallback
**Objective**: Verify that if graph traversal exceeds its timeout, the system falls back to vector-only results.

**Test Steps**:
1. Configure graph traversal with `timeoutMs: 50`
2. Inject a slow graph client that delays 500 ms
3. Call `engine.query(...)` and assert it resolves (no rejection)
4. Assert `result.graphHits === 0` and `result.fallbackMode === 'vector-only'`

**Expected Result**: Timeout handled gracefully; vector-only fallback activated.

**Code Sample**:
```typescript
it('should fall back to vector-only when graph traversal times out', async () => {
  const slowGraph = new SlowGraphClient({ delayMs: 500 });
  const engine = new HybridGraphVectorEngine({ graphClient: slowGraph, vectorIndex, graphTimeoutMs: 50 });

  const result = await engine.query({ query: 'cloud native patterns', topK: 5 });

  expect(result.fallbackMode).toBe('vector-only');
  expect(result.graphHits).toBe(0);
  expect(result.vectorHits).toBeGreaterThan(0);
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 End-to-End Hybrid Query Latency

#### TC-F5-P1.1: Hybrid Query P95 < 300 ms (Graph + Vector Combined)
**Objective**: Verify that the end-to-end hybrid query (parallel graph + vector + fusion) completes at P95 < 300 ms.

**Preconditions**:
- Knowledge graph: 100,000 nodes, 500,000 edges
- Vector index: 50,000 documents

**Test Steps**:
1. Execute 200 hybrid queries sequentially
2. Record per-query latency
3. Assert P95 < 300 ms

**Expected Result**: P95 hybrid query latency < 300 ms.

**Code Sample**:
```typescript
it('should achieve P95 hybrid query latency < 300 ms', async () => {
  const latencies: number[] = [];
  for (let i = 0; i < 200; i++) {
    const t0 = performance.now();
    await engine.query({ query: queries[i % queries.length], topK: 10 });
    latencies.push(performance.now() - t0);
  }

  latencies.sort((a, b) => a - b);
  expect(latencies[Math.floor(latencies.length * 0.95)]).toBeLessThan(300);
}, 120_000);
```

---

#### TC-F5-P1.2: Parallel Graph and Vector Sub-Queries Execute Concurrently
**Objective**: Verify that graph traversal and vector ANN run in parallel, reducing total latency vs. sequential execution.

**Test Steps**:
1. Measure sequential execution time: graph query then vector query
2. Measure parallel execution time: both in `Promise.all`
3. Assert parallel time < sequential time * 0.7 (at least 30% speedup)

**Expected Result**: Parallel execution at least 30% faster than sequential.

**Code Sample**:
```typescript
it('should be faster when graph and vector queries run in parallel', async () => {
  const query = 'service mesh configuration management';

  const seqStart = performance.now();
  await graphEngine.query({ query, topK: 10 });
  await vectorEngine.query({ query, topK: 10 });
  const seqTime = performance.now() - seqStart;

  const parStart = performance.now();
  await Promise.all([graphEngine.query({ query, topK: 10 }), vectorEngine.query({ query, topK: 10 })]);
  const parTime = performance.now() - parStart;

  expect(parTime).toBeLessThan(seqTime * 0.70);
});
```

---

### 4.2 Graph Traversal Throughput

#### TC-F5-P2.1: Depth-2 Traversal P99 < 100 ms on 100 K Node Graph
**Objective**: Verify that depth-2 graph traversal completes at P99 < 100 ms on a 100,000-node graph.

**Test Steps**:
1. Build or load a 100,000-node graph
2. Execute 100 depth-2 traversals from random nodes
3. Compute P99 latency
4. Assert P99 < 100 ms

**Expected Result**: P99 depth-2 traversal < 100 ms.

**Code Sample**:
```typescript
it('should complete depth-2 traversal at P99 < 100 ms on 100 K nodes', async () => {
  const latencies: number[] = [];
  const rootNodes = sampleRandomNodes(graph, 100);

  for (const node of rootNodes) {
    const t0 = performance.now();
    await graphEngine.expand({ nodeId: node.id, depth: 2 });
    latencies.push(performance.now() - t0);
  }

  latencies.sort((a, b) => a - b);
  expect(latencies[Math.floor(latencies.length * 0.99)]).toBeLessThan(100);
}, 60_000);
```

---

#### TC-F5-P2.2: Graph Indexing Throughput >= 1000 Edges/sec
**Objective**: Verify that the graph indexing pipeline can ingest >= 1000 edges per second.

**Test Steps**:
1. Prepare 10,000 edge objects
2. Call `graphClient.bulkInsertEdges(edges)` and record duration
3. Assert `10000 / durationSec >= 1000`

**Expected Result**: Edge ingestion throughput >= 1000 edges/sec.

**Code Sample**:
```typescript
it('should ingest >= 1000 graph edges per second in bulk mode', async () => {
  const edges = generateEdgeBatch(10_000);
  const start = Date.now();
  await graphClient.bulkInsertEdges(edges);
  const elapsed = (Date.now() - start) / 1000;

  expect(10_000 / elapsed).toBeGreaterThanOrEqual(1000);
}, 30_000);
```

---

### 4.3 Fusion Performance

#### TC-F5-P3.1: RRF Fusion of 1000 Candidates < 5 ms
**Objective**: Verify that fusing 1000 candidate documents (500 from graph + 500 from vector) completes in under 5 ms.

**Test Steps**:
1. Generate 500 graph result objects and 500 vector result objects
2. Time 100 RRF fusion calls over the same inputs
3. Assert P99 fusion time < 5 ms

**Expected Result**: RRF fusion of 1000 candidates completes in < 5 ms at P99.

**Code Sample**:
```typescript
it('should fuse 1000 candidates in < 5 ms at P99', () => {
  const graphRanks  = Array.from({ length: 500 }, (_, i) => ({ id: `G${i}`, rank: i + 1 }));
  const vectorRanks = Array.from({ length: 500 }, (_, i) => ({ id: `V${i}`, rank: i + 1 }));

  const latencies: number[] = [];
  for (let i = 0; i < 100; i++) {
    const t0 = performance.now();
    fusionEngine.rrf({ graphRanks, vectorRanks, k: 60 });
    latencies.push(performance.now() - t0);
  }

  latencies.sort((a, b) => a - b);
  expect(latencies[Math.floor(latencies.length * 0.99)]).toBeLessThan(5);
});
```

---

#### TC-F5-P3.2: Hybrid System Maintains Throughput Under 30 Concurrent Queries
**Objective**: Verify that 30 concurrent hybrid queries all complete within 5 seconds with 100% success rate.

**Test Steps**:
1. Fire 30 concurrent `engine.query` calls with distinct queries
2. Assert all 30 resolve (no rejections)
3. Assert total wall time < 5000 ms

**Expected Result**: 30 concurrent hybrid queries complete within 5 seconds; zero failures.

**Code Sample**:
```typescript
it('should handle 30 concurrent hybrid queries within 5 seconds', async () => {
  const start = Date.now();
  const results = await Promise.allSettled(
    Array.from({ length: 30 }, (_, i) =>
      engine.query({ query: concurrentQueries[i], topK: 10 })
    )
  );
  const elapsed = Date.now() - start;

  const fulfilled = results.filter(r => r.status === 'fulfilled');
  expect(fulfilled).toHaveLength(30);
  expect(elapsed).toBeLessThan(5000);
}, 15_000);
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
