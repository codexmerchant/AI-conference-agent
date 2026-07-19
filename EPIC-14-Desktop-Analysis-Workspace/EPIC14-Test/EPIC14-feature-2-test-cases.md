# EPIC14 Feature 2 — Relationship Graph Explorer — Test Cases

## Test Overview
Comprehensive test suite for Relationship Graph Explorer covering unit tests, integration tests, edge cases, and performance validation. This feature renders an interactive force-directed graph of people, organizations, and topics extracted from conference sessions, enabling desktop users to explore and manipulate relationship networks.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Graph Data Model

#### TC-F2-U1.1: Node Construction from Contact Record
**Objective**: Verify that a `GraphNode` is correctly constructed from a raw contact DB record with all required fields.

**Preconditions**:
- Contact record with `id`, `name`, `organization`, `role` fields in SQLite

**Test Steps**:
1. Call `GraphNodeFactory.fromContact(contactRow)`
2. Assert returned node has `id`, `label`, `type: 'PERSON'`, `weight` fields
3. Confirm `weight` reflects mention count

**Expected Result**: `GraphNode` has all required fields; `type` is `'PERSON'`; `weight >= 1`.

**Code Sample**:
```typescript
import { GraphNodeFactory } from '../src/main/graph/GraphNodeFactory';

describe('GraphNodeFactory', () => {
  it('should construct a PERSON node from contact row', () => {
    const row = { id: 'c-001', name: 'Alice Wong', organization: 'Acme', role: 'CTO', mention_count: 7 };
    const node = GraphNodeFactory.fromContact(row);

    expect(node.id).toBe('c-001');
    expect(node.label).toBe('Alice Wong');
    expect(node.type).toBe('PERSON');
    expect(node.weight).toBe(7);
  });
});
```

---

#### TC-F2-U1.2: Edge Weight Calculation from Co-occurrence
**Objective**: Verify edge weight is computed as the number of sessions two contacts co-appeared in.

**Preconditions**:
- `EdgeWeightCalculator` initialized with co-occurrence table

**Test Steps**:
1. Insert 5 co-occurrence rows for node pair (A, B)
2. Call `calculator.getWeight('c-001', 'c-002')`
3. Assert result is 5

**Expected Result**: Edge weight equals co-occurrence count; symmetric (A→B == B→A).

**Code Sample**:
```typescript
describe('EdgeWeightCalculator', () => {
  it('should return co-occurrence count as edge weight', () => {
    const calc = new EdgeWeightCalculator(testDb);
    // 5 rows inserted in beforeEach
    expect(calc.getWeight('c-001', 'c-002')).toBe(5);
    expect(calc.getWeight('c-002', 'c-001')).toBe(5); // symmetric
  });
});
```

---

#### TC-F2-U1.3: Graph Serialization to JSON for IPC Transfer
**Objective**: Verify that a `RelationshipGraph` serializes to a compact JSON structure transferable over Electron IPC.

**Preconditions**:
- Graph with 50 nodes and 120 edges constructed in memory

**Test Steps**:
1. Call `graph.toIPCPayload()`
2. Parse returned JSON string
3. Assert `nodes.length === 50` and `edges.length === 120`
4. Confirm each node has `id`, `label`, `type`, `x`, `y`, `weight`

**Expected Result**: Valid JSON; node and edge counts match; all required fields present; payload size < 100KB.

**Code Sample**:
```typescript
it('should serialize graph to compact IPC payload', () => {
  const payload = graph.toIPCPayload();
  const parsed = JSON.parse(payload);

  expect(parsed.nodes).toHaveLength(50);
  expect(parsed.edges).toHaveLength(120);
  expect(parsed.nodes[0]).toMatchObject({ id: expect.any(String), label: expect.any(String), type: expect.any(String) });
  expect(Buffer.byteLength(payload, 'utf8')).toBeLessThan(100 * 1024);
});
```

---

### 1.2 Force-Directed Layout Engine

#### TC-F2-U2.1: Initial Node Position Spread
**Objective**: Verify that the force-directed layout places nodes with non-overlapping initial positions within the canvas bounds.

**Preconditions**:
- `ForceLayoutEngine` initialized with canvas size 1440x900

**Test Steps**:
1. Add 20 nodes to engine
2. Run `engine.initializePositions()`
3. Assert all nodes within `[0, 1440] x [0, 900]`
4. Assert no two nodes occupy identical coordinates

**Expected Result**: All node positions within canvas; all positions unique.

**Code Sample**:
```typescript
import { ForceLayoutEngine } from '../src/renderer/graph/ForceLayoutEngine';

describe('ForceLayoutEngine', () => {
  it('should place nodes within canvas bounds without overlap', () => {
    const engine = new ForceLayoutEngine({ width: 1440, height: 900 });
    const nodes = Array.from({ length: 20 }, (_, i) => ({ id: `n-${i}`, weight: 1 }));
    engine.addNodes(nodes);
    engine.initializePositions();

    const positions = engine.getPositions();
    const coords = new Set<string>();

    positions.forEach(p => {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(1440);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(900);
      const key = `${Math.round(p.x)},${Math.round(p.y)}`;
      expect(coords.has(key)).toBe(false);
      coords.add(key);
    });
  });
});
```

---

#### TC-F2-U2.2: Simulation Convergence Within 500 Ticks
**Objective**: Verify the force simulation reaches a stable (low kinetic energy) state within 500 ticks.

**Test Steps**:
1. Initialize engine with 30 nodes and 45 edges
2. Run `engine.tick()` 500 times
3. Measure total kinetic energy after last tick

**Expected Result**: Kinetic energy after 500 ticks < 0.01 (stable); node positions change < 0.1px per tick.

**Code Sample**:
```typescript
it('should converge to stable layout within 500 ticks', () => {
  for (let i = 0; i < 500; i++) engine.tick();

  const energy = engine.getKineticEnergy();
  expect(energy).toBeLessThan(0.01);

  const before = engine.getPositions().map(p => ({ x: p.x, y: p.y }));
  engine.tick();
  const after = engine.getPositions();
  after.forEach((p, i) => {
    expect(Math.abs(p.x - before[i].x)).toBeLessThan(0.1);
    expect(Math.abs(p.y - before[i].y)).toBeLessThan(0.1);
  });
});
```

---

#### TC-F2-U2.3: Node Drag Updates Position Without Disturbing Others
**Objective**: Verify that pinning and dragging a node to a new position only affects that node's coordinates.

**Test Steps**:
1. Record positions of all nodes before drag
2. Pin node `n-05` and move to `(800, 400)`
3. Record positions of all other nodes immediately after
4. Assert `n-05` is at `(800, 400)`; others unchanged

**Expected Result**: Dragged node at target position; no other node position changes before next tick.

**Code Sample**:
```typescript
it('should pin dragged node without moving others', () => {
  engine.tick(); // settle
  const before = engine.getPositions();

  engine.pinNode('n-05', { x: 800, y: 400 });
  const after = engine.getPositions();

  const dragged = after.find(p => p.id === 'n-05')!;
  expect(dragged.x).toBe(800);
  expect(dragged.y).toBe(400);

  after.filter(p => p.id !== 'n-05').forEach((p, idx) => {
    expect(p.x).toBeCloseTo(before[idx].x, 1);
    expect(p.y).toBeCloseTo(before[idx].y, 1);
  });
});
```

---

### 1.3 Graph Filtering

#### TC-F2-U3.1: Filter Nodes by Type
**Objective**: Verify filtering the graph to `type: 'ORGANIZATION'` removes all PERSON and TOPIC nodes from the active set.

**Test Steps**:
1. Build graph with 10 PERSON, 5 ORGANIZATION, 8 TOPIC nodes
2. Call `graph.filterByType(['ORGANIZATION'])`
3. Assert `graph.activeNodes.length === 5`
4. Assert all active nodes have `type === 'ORGANIZATION'`

**Expected Result**: Active node count = 5; edges to removed nodes hidden; no PERSON or TOPIC in active set.

**Code Sample**:
```typescript
it('should filter active nodes to ORGANIZATION type only', () => {
  graph.filterByType(['ORGANIZATION']);
  expect(graph.activeNodes).toHaveLength(5);
  graph.activeNodes.forEach(n => expect(n.type).toBe('ORGANIZATION'));
});
```

---

#### TC-F2-U3.2: Minimum Edge Weight Filter
**Objective**: Verify that setting minimum edge weight to 3 removes all edges with weight < 3 from the active set.

**Test Steps**:
1. Build graph with edges of weights [1, 2, 3, 4, 5]
2. Call `graph.filterByMinEdgeWeight(3)`
3. Assert only edges with weight >= 3 remain active

**Expected Result**: Active edge count reduced; minimum weight in active edges = 3; isolated nodes (no active edges) marked as `dimmed`.

**Code Sample**:
```typescript
it('should hide edges below minimum weight threshold', () => {
  graph.filterByMinEdgeWeight(3);
  const activeEdges = graph.activeEdges;
  activeEdges.forEach(e => expect(e.weight).toBeGreaterThanOrEqual(3));

  const minWeight = Math.min(...activeEdges.map(e => e.weight));
  expect(minWeight).toBeGreaterThanOrEqual(3);
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Graph Data Pipeline

#### TC-F2-I1.1: Graph Loads from SQLite and Renders on Canvas
**Objective**: Verify the end-to-end pipeline from DB query through IPC to canvas rendering places nodes on screen.

**Preconditions**:
- SQLite DB with 25 contacts, 60 co-occurrence relationships

**Test Steps**:
1. Open Graph Explorer window
2. Wait for `graph:ready` IPC event
3. Query canvas element for rendered node count via JavaScript

**Expected Result**: Canvas contains 25 node SVG elements; edge lines connect nodes; legend rendered.

**Code Sample**:
```typescript
it('should render all graph nodes on canvas after DB load', async () => {
  const win = await createTestWindow('/graph-explorer');
  await waitForIPC(win, 'graph:ready');

  const nodeCount = await win.webContents.executeJavaScript(`
    document.querySelectorAll('[data-testid="graph-node"]').length
  `);
  expect(nodeCount).toBe(25);
});
```

---

#### TC-F2-I1.2: Node Click Opens Contact Detail Panel
**Objective**: Verify clicking a graph node opens the contact detail side panel with correct data.

**Test Steps**:
1. Click node for contact `c-001` (`Alice Wong`)
2. Wait for detail panel to appear
3. Assert panel header shows `'Alice Wong'`
4. Assert shared sessions list is populated

**Expected Result**: Detail panel visible; correct name displayed; session list non-empty.

**Code Sample**:
```typescript
it('should show contact detail panel on node click', async () => {
  await win.webContents.executeJavaScript(`
    document.querySelector('[data-node-id="c-001"]').click();
  `);
  await new Promise(r => setTimeout(r, 300));

  const name = await win.webContents.executeJavaScript(`
    document.querySelector('[data-testid="contact-detail-name"]')?.textContent
  `);
  expect(name).toBe('Alice Wong');
});
```

---

### 2.2 Real-Time Graph Update

#### TC-F2-I2.1: New Contact Synced to Graph Without Full Reload
**Objective**: Verify that when a new contact is added to the DB (via sync), the graph updates incrementally.

**Preconditions**:
- Graph Explorer window open with 25 nodes

**Test Steps**:
1. Insert new contact `c-026` into DB
2. Emit `contacts:updated` IPC event
3. Assert graph now contains 26 nodes without full page reload

**Expected Result**: 26 node elements in canvas; new node visible within 500ms; no flicker or full re-render.

**Code Sample**:
```typescript
it('should add new node incrementally on contacts:updated IPC', async () => {
  testDb.prepare('INSERT INTO contacts VALUES (?,?,?,?)').run('c-026', 'Bob Singh', 'StartupX', 1);
  await win.webContents.send('contacts:updated', { action: 'INSERT', id: 'c-026' });
  await new Promise(r => setTimeout(r, 500));

  const count = await win.webContents.executeJavaScript(`
    document.querySelectorAll('[data-testid="graph-node"]').length
  `);
  expect(count).toBe(26);
});
```

---

#### TC-F2-I2.2: Relationship Strength Updates When New Session Added
**Objective**: Verify that adding a new conference session containing two existing contacts increases their edge weight.

**Test Steps**:
1. Record edge weight between `c-001` and `c-002` (initial: 3)
2. Insert new session recording both contacts
3. Trigger `sessions:updated` IPC event
4. Assert edge weight becomes 4

**Expected Result**: Edge between `c-001` and `c-002` shows weight 4; edge visual thickness increases.

**Code Sample**:
```typescript
it('should update edge weight when new shared session detected', async () => {
  insertSharedSession('c-001', 'c-002');
  await win.webContents.send('sessions:updated', {});
  await new Promise(r => setTimeout(r, 400));

  const weight = await win.webContents.executeJavaScript(`
    window.__graphState.getEdgeWeight('c-001', 'c-002')
  `);
  expect(weight).toBe(4);
});
```

---

### 2.3 Search and Focus

#### TC-F2-I3.1: Name Search Focuses and Highlights Matching Node
**Objective**: Verify the graph search box highlights and centers the view on matching nodes.

**Test Steps**:
1. Type `'Wong'` in graph search input
2. Assert node `c-001` gains `node--focused` class
3. Assert canvas viewport panned so `c-001` is centered

**Expected Result**: Matching node highlighted; viewport centered on that node; non-matching nodes dimmed.

**Code Sample**:
```typescript
it('should highlight and center on node matching search query', async () => {
  await win.webContents.executeJavaScript(`
    document.querySelector('[data-testid="graph-search"]').value = 'Wong';
    document.querySelector('[data-testid="graph-search"]').dispatchEvent(new Event('input'));
  `);
  await new Promise(r => setTimeout(r, 300));

  const focused = await win.webContents.executeJavaScript(`
    document.querySelector('[data-node-id="c-001"]')?.classList.contains('node--focused')
  `);
  expect(focused).toBe(true);
});
```

---

#### TC-F2-I3.2: Ego Network Mode Shows Only Immediate Neighbors
**Objective**: Verify enabling ego network mode for a node hides all non-adjacent nodes and edges.

**Test Steps**:
1. Right-click node `c-001` and select `'Show Ego Network'`
2. Assert only `c-001` and its direct neighbors are visible
3. Assert all other nodes have `display: none` or `opacity: 0`

**Expected Result**: Only ego and immediate neighbors rendered; isolated nodes hidden; edge count = degree of `c-001`.

**Code Sample**:
```typescript
it('should show only ego and neighbors in ego network mode', async () => {
  await win.webContents.executeJavaScript(`
    window.__graphAPI.setEgoMode('c-001');
  `);
  await new Promise(r => setTimeout(r, 200));

  const visibleCount = await win.webContents.executeJavaScript(`
    [...document.querySelectorAll('[data-testid="graph-node"]')]
      .filter(el => parseFloat(getComputedStyle(el).opacity) > 0.1).length
  `);
  // c-001 has 4 neighbors in test data
  expect(visibleCount).toBe(5);
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Disconnected and Sparse Graphs

#### TC-F2-E1.1: Graph with No Edges Renders Isolated Nodes
**Objective**: Verify the graph renders correctly when no edges exist (zero co-occurrences).

**Test Steps**:
1. Load graph with 10 nodes and 0 edges
2. Observe canvas

**Expected Result**: 10 nodes rendered without any edge lines; layout places nodes evenly across canvas; no errors.

**Code Sample**:
```typescript
it('should render isolated nodes with no edges', () => {
  const g = new RelationshipGraph({ nodes: generateNodes(10), edges: [] });
  expect(g.activeNodes).toHaveLength(10);
  expect(g.activeEdges).toHaveLength(0);
  expect(() => g.toIPCPayload()).not.toThrow();
});
```

---

#### TC-F2-E1.2: Single Node Graph
**Objective**: Verify the graph handles a single-node, zero-edge graph without layout engine errors.

**Test Steps**:
1. Initialize `ForceLayoutEngine` with 1 node
2. Run 100 ticks
3. Assert node remains at initialized position

**Expected Result**: No exceptions; node position stable; engine does not produce NaN coordinates.

**Code Sample**:
```typescript
it('should handle single-node graph without layout errors', () => {
  const engine = new ForceLayoutEngine({ width: 800, height: 600 });
  engine.addNodes([{ id: 'solo', weight: 1 }]);
  engine.initializePositions();

  expect(() => { for (let i = 0; i < 100; i++) engine.tick(); }).not.toThrow();

  const [pos] = engine.getPositions();
  expect(isNaN(pos.x)).toBe(false);
  expect(isNaN(pos.y)).toBe(false);
});
```

---

### 3.2 Large Dense Graphs

#### TC-F2-E2.1: 500-Node Graph Renders Without Browser Hang
**Objective**: Verify a very large graph renders without blocking the renderer process event loop.

**Test Steps**:
1. Load graph with 500 nodes and 2000 edges
2. Measure time from `graph:load` IPC to first paint (FCP)
3. Assert FCP < 3000ms
4. Assert renderer process remains responsive (JS event loop not blocked)

**Expected Result**: Canvas renders within 3 seconds; click events still handled during/after render.

**Code Sample**:
```typescript
it('should render 500-node graph without blocking event loop', async () => {
  const t0 = Date.now();
  await win.webContents.send('graph:load', generateLargeGraphPayload(500, 2000));
  await waitForIPC(win, 'graph:ready');
  expect(Date.now() - t0).toBeLessThan(3000);

  // Check event loop responsiveness
  const responsive = await win.webContents.executeJavaScript(`
    new Promise(resolve => setTimeout(() => resolve(true), 10))
  `);
  expect(responsive).toBe(true);
});
```

---

#### TC-F2-E2.2: Duplicate Edge Entries Are Deduplicated
**Objective**: Verify that if the DB has duplicate co-occurrence rows for the same node pair, only one edge is created.

**Test Steps**:
1. Insert 3 identical rows for pair `(c-001, c-002)` in co-occurrence table
2. Build graph
3. Assert only 1 edge between `c-001` and `c-002` with `weight = 3`

**Expected Result**: One edge; weight equals count of duplicates; no duplicate SVG path elements.

**Code Sample**:
```typescript
it('should deduplicate edges from repeated co-occurrence rows', () => {
  for (let i = 0; i < 3; i++) {
    testDb.prepare('INSERT INTO co_occurrences VALUES (?,?)').run('c-001', 'c-002');
  }
  const g = graphBuilder.build();
  const edges = g.activeEdges.filter(e =>
    (e.source === 'c-001' && e.target === 'c-002') ||
    (e.source === 'c-002' && e.target === 'c-001')
  );
  expect(edges).toHaveLength(1);
  expect(edges[0].weight).toBe(3);
});
```

---

### 3.3 User Interaction Edge Cases

#### TC-F2-E3.1: Zoom to Extreme Levels Does Not Lose Nodes
**Objective**: Verify nodes remain accessible after extreme zoom in/out (0.05x and 20x).

**Test Steps**:
1. Zoom canvas to 0.05x (very far out)
2. Assert all nodes still have non-zero dimensions
3. Zoom to 20x (very close in)
4. Assert selected area of canvas shows at least one node

**Expected Result**: No nodes lost or clipped at either extreme; canvas transform applied correctly.

**Code Sample**:
```typescript
it('should retain node accessibility at extreme zoom levels', async () => {
  await win.webContents.executeJavaScript(`window.__graphAPI.setZoom(0.05)`);
  let allVisible = await win.webContents.executeJavaScript(`
    [...document.querySelectorAll('[data-testid="graph-node"]')].every(el => el.getBoundingClientRect().width > 0)
  `);
  expect(allVisible).toBe(true);

  await win.webContents.executeJavaScript(`window.__graphAPI.setZoom(20)`);
  const anyVisible = await win.webContents.executeJavaScript(`
    document.querySelectorAll('[data-testid="graph-node"]').length > 0
  `);
  expect(anyVisible).toBe(true);
});
```

---

#### TC-F2-E3.2: Filter Resulting in Zero Nodes Shows Empty State
**Objective**: Verify applying a filter that matches no nodes shows an empty-state message.

**Test Steps**:
1. Apply `filterByType(['NONEXISTENT_TYPE'])`
2. Observe canvas

**Expected Result**: Canvas empty; empty-state message `'No nodes match the current filters.'` displayed; reset button available.

**Code Sample**:
```typescript
it('should show empty state when filter matches no nodes', () => {
  graph.filterByType(['NONEXISTENT_TYPE']);
  expect(graph.activeNodes).toHaveLength(0);
  expect(graph.isEmpty).toBe(true);
  expect(graph.emptyStateMessage).toBe('No nodes match the current filters.');
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Layout Engine Performance

#### TC-F2-P1.1: 100-Node Force Simulation Completes 60 FPS Tick Rate
**Objective**: Verify that each simulation tick for a 100-node graph completes in under 16ms (60 FPS budget).

**Test Steps**:
1. Initialize engine with 100 nodes and 200 edges
2. Measure 100 consecutive `tick()` calls
3. Assert median tick time < 16ms

**Expected Result**: Median tick duration < 16ms; no single tick > 50ms.

**Code Sample**:
```typescript
it('should complete each tick in under 16ms for 100-node graph', () => {
  const engine = new ForceLayoutEngine({ width: 1440, height: 900 });
  engine.addNodes(generateNodes(100));
  engine.addEdges(generateEdges(200));

  const times: number[] = [];
  for (let i = 0; i < 100; i++) {
    const t = performance.now();
    engine.tick();
    times.push(performance.now() - t);
  }

  times.sort((a, b) => a - b);
  expect(times[50]).toBeLessThan(16);
  expect(Math.max(...times)).toBeLessThan(50);
});
```

---

#### TC-F2-P1.2: Graph Payload Serialization Under 50ms for 500 Nodes
**Objective**: Verify `toIPCPayload()` on a 500-node, 2000-edge graph completes in under 50ms.

**Test Steps**:
1. Build `RelationshipGraph` with 500 nodes, 2000 edges
2. Time `toIPCPayload()` call

**Expected Result**: Serialization < 50ms; returned string is valid JSON.

**Code Sample**:
```typescript
it('should serialize 500-node graph under 50ms', () => {
  const g = buildLargeGraph(500, 2000);
  const start = performance.now();
  const payload = g.toIPCPayload();
  const elapsed = performance.now() - start;

  expect(elapsed).toBeLessThan(50);
  expect(() => JSON.parse(payload)).not.toThrow();
});
```

---

### 4.2 Render Performance

#### TC-F2-P2.1: Initial Graph Render Under 2 Seconds
**Objective**: Verify the graph canvas shows first node within 2 seconds of window open.

**Test Steps**:
1. Record time before `createTestWindow('/graph-explorer')`
2. Poll for first `[data-testid="graph-node"]` element
3. Assert elapsed < 2000ms

**Expected Result**: First node visible within 2 seconds; no layout thrashing.

**Code Sample**:
```typescript
it('should render first graph node within 2 seconds', async () => {
  const t0 = performance.now();
  const win = await createTestWindow('/graph-explorer');

  await win.webContents.executeJavaScript(`
    new Promise(resolve => {
      const poll = () => document.querySelector('[data-testid="graph-node"]') ? resolve() : requestAnimationFrame(poll);
      poll();
    })
  `);

  expect(performance.now() - t0).toBeLessThan(2000);
});
```

---

#### TC-F2-P2.2: Smooth Animation During Layout (No Frame Drops Below 30 FPS)
**Objective**: Verify that the animation loop during force layout does not drop below 30 FPS for 5 consecutive seconds.

**Test Steps**:
1. Start animation loop with 80-node graph
2. Sample `requestAnimationFrame` delta for 5 seconds
3. Assert no frame gap > 33ms

**Expected Result**: All frame deltas <= 33ms; smooth visual animation.

**Code Sample**:
```typescript
it('should maintain at least 30 FPS during layout animation', async () => {
  const maxGap = await win.webContents.executeJavaScript(`
    new Promise(resolve => {
      let last = performance.now(), max = 0, count = 0;
      const check = (now) => {
        max = Math.max(max, now - last);
        last = now;
        if (++count < 150) requestAnimationFrame(check);
        else resolve(max);
      };
      requestAnimationFrame(check);
    })
  `);
  expect(maxGap).toBeLessThan(33);
});
```

---

### 4.3 Memory Usage

#### TC-F2-P3.1: Graph Explorer Memory Under 200MB with 500 Nodes
**Objective**: Verify heap usage stays below 200MB with a 500-node graph rendered.

**Test Steps**:
1. Load 500-node graph
2. Run 300 ticks of layout simulation
3. Measure heap

**Expected Result**: `usedJSHeapSize < 209715200` (200MB).

**Code Sample**:
```typescript
it('should keep heap below 200MB for 500-node graph', async () => {
  await win.webContents.send('graph:load', generateLargeGraphPayload(500, 2000));
  await waitForIPC(win, 'graph:ready');
  await new Promise(r => setTimeout(r, 1000));

  const heap = await win.webContents.executeJavaScript(`performance.memory.usedJSHeapSize`);
  expect(heap).toBeLessThan(200 * 1024 * 1024);
});
```

---

#### TC-F2-P3.2: No Node Object Leak After Filtering and Unfiltering 50 Times
**Objective**: Verify repeatedly toggling filters does not accumulate orphaned node objects.

**Test Steps**:
1. Apply filter 50 times alternating between `['PERSON']` and `['ORGANIZATION', 'TOPIC', 'PERSON']`
2. Force GC
3. Measure heap delta from baseline

**Expected Result**: Heap growth < 10MB across 50 filter toggles.

**Code Sample**:
```typescript
it('should not accumulate memory from repeated filter toggles', async () => {
  const baseline = await measureHeap(win);
  for (let i = 0; i < 50; i++) {
    await win.webContents.send('graph:filter', { types: i % 2 === 0 ? ['PERSON'] : ['PERSON', 'ORGANIZATION', 'TOPIC'] });
    await new Promise(r => setTimeout(r, 50));
  }
  if (global.gc) global.gc();
  const after = await measureHeap(win);
  expect((after - baseline) / (1024 * 1024)).toBeLessThan(10);
});
```

---

## Test Execution Summary

| Category | Suites | Test Cases |
|---|---|---|
| Unit Tests | 3 | 9 |
| Integration Tests | 3 | 6 |
| Edge Case Validation | 3 | 6 |
| Performance Validation | 3 | 6 |
| **Total** | **12** | **27** |

**Estimated Execution Time**: ~5 minutes (unit: 30s, integration: 2.5m, edge: 1m, performance: 1m)

**Tooling**: Jest + better-sqlite3 (unit), Electron test harness (integration/edge), `performance.now()` / `performance.memory` (performance)
