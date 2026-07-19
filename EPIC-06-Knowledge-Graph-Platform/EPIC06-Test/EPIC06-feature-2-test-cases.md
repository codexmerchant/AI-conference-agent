# EPIC06 Feature 2 — Entity Linking — Test Cases

## Test Overview
Comprehensive test suite for Entity Linking covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Deterministic Matching

#### TC-F2-U1.1: Email-Based Deterministic Match Returns Existing Node
**Objective**: Verify that an incoming entity mention with a known email address resolves to the existing canonical graph node via deterministic lookup.

**Preconditions**:
- Person node `{ id: 'p-001', name: 'Alice Chen', email: 'alice@example.com' }` exists in the graph
- Entity resolution service initialized with deterministic matcher

**Test Steps**:
1. Build an incoming mention `{ name: 'Alice C.', email: 'alice@example.com', source: 'BADGE_SCAN' }`
2. Call `entityLinker.resolve(mention)`
3. Assert result has `matchType: 'DETERMINISTIC'`
4. Assert `canonicalNodeId === 'p-001'`
5. Assert `confidence >= 0.99`

**Expected Result**: Deterministic match on email; confidence ≥ 0.99; no new node created.

**Code Sample**:
```typescript
describe('EntityLinker — DeterministicMatcher', () => {
  it('should resolve an entity mention to existing node via email match', async () => {
    const mention: EntityMention = { name: 'Alice C.', email: 'alice@example.com', source: 'BADGE_SCAN' };
    const result = await entityLinker.resolve(mention);

    expect(result.matchType).toBe('DETERMINISTIC');
    expect(result.canonicalNodeId).toBe('p-001');
    expect(result.confidence).toBeGreaterThanOrEqual(0.99);
    expect(result.newNodeCreated).toBe(false);
  });
});
```

---

#### TC-F2-U1.2: LinkedIn URL Match Overrides Conflicting Name Similarity
**Objective**: Verify that a LinkedIn URL deterministic match takes precedence even when the name in the mention differs significantly from the stored name.

**Preconditions**:
- Node `{ id: 'p-042', name: 'Jonathan Smith', linkedInUrl: 'https://linkedin.com/in/jsmith42' }` exists

**Test Steps**:
1. Build mention `{ name: 'Jon Smyth', linkedInUrl: 'https://linkedin.com/in/jsmith42', source: 'LINKEDIN_IMPORT' }`
2. Call `entityLinker.resolve(mention)`
3. Assert `matchType === 'DETERMINISTIC'`, `canonicalNodeId === 'p-042'`
4. Assert fuzzy name comparison was not the deciding factor (check `matchedKey === 'linkedInUrl'`)

**Expected Result**: LinkedIn URL wins over name discrepancy; canonical node resolved correctly.

**Code Sample**:
```typescript
it('should prefer LinkedIn URL deterministic match over name-similarity score', async () => {
  const mention: EntityMention = { name: 'Jon Smyth', linkedInUrl: 'https://linkedin.com/in/jsmith42', source: 'LINKEDIN_IMPORT' };
  const result = await entityLinker.resolve(mention);

  expect(result.canonicalNodeId).toBe('p-042');
  expect(result.matchedKey).toBe('linkedInUrl');
  expect(result.matchType).toBe('DETERMINISTIC');
});
```

---

#### TC-F2-U1.3: Phone Number Deterministic Match Works Across Format Variants
**Objective**: Verify that phone numbers in different formats (`+1-415-555-0100`, `4155550100`, `(415) 555-0100`) all resolve to the same canonical node.

**Test Steps**:
1. Store node with `phone: '+14155550100'`
2. Test resolve with `phone: '(415) 555-0100'` and `phone: '4155550100'`
3. Assert both mentions resolve to the same canonical node

**Expected Result**: Phone normalization resolves all format variants to the same node.

**Code Sample**:
```typescript
it('should normalize phone formats before deterministic matching', async () => {
  const variants = ['(415) 555-0100', '4155550100', '+1-415-555-0100'];
  for (const phone of variants) {
    const result = await entityLinker.resolve({ name: 'Test User', phone, source: 'BUSINESS_CARD' });
    expect(result.canonicalNodeId).toBe('p-phone-001');
  }
});
```

---

### 1.2 Probabilistic / Fuzzy Matching

#### TC-F2-U2.1: High-Confidence Fuzzy Match Auto-Links Without Review
**Objective**: Verify that a mention scoring above the auto-link threshold (0.85) is automatically linked to the best candidate.

**Preconditions**:
- Node `{ id: 'p-007', name: 'Sarah Johnson', company: 'Acme Corp', title: 'CTO' }` exists
- No email or LinkedIn URL available

**Test Steps**:
1. Build mention `{ name: 'Sara Johnson', company: 'Acme Corp', title: 'CTO', source: 'TRANSCRIPT' }`
2. Call `entityLinker.resolve(mention)`
3. Assert `matchType === 'PROBABILISTIC'`, `confidence >= 0.85`
4. Assert `disposition === 'AUTO_LINKED'`, `canonicalNodeId === 'p-007'`

**Expected Result**: Auto-linked; review queue not populated; confidence ≥ 0.85.

**Code Sample**:
```typescript
describe('EntityLinker — ProbabilisticMatcher', () => {
  it('should auto-link a high-confidence fuzzy match without human review', async () => {
    const mention: EntityMention = { name: 'Sara Johnson', company: 'Acme Corp', title: 'CTO', source: 'TRANSCRIPT' };
    const result = await entityLinker.resolve(mention);

    expect(result.matchType).toBe('PROBABILISTIC');
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    expect(result.disposition).toBe('AUTO_LINKED');
    expect(result.canonicalNodeId).toBe('p-007');
  });
});
```

---

#### TC-F2-U2.2: Low-Confidence Fuzzy Match Is Queued for Human Review
**Objective**: Verify that a mention scoring below 0.60 is placed in the review queue rather than auto-linked or auto-created.

**Test Steps**:
1. Build a mention with a name that vaguely matches two nodes with different companies
2. Call `entityLinker.resolve(mention)`
3. Assert `disposition === 'QUEUED_FOR_REVIEW'`
4. Assert `reviewQueue.contains(mention.id)` returns true

**Expected Result**: No auto-link; review queue entry created; `canonicalNodeId` is null.

**Code Sample**:
```typescript
it('should queue low-confidence fuzzy match for human review', async () => {
  const mention: EntityMention = { name: 'Mike Lee', company: 'Unknown Startup', source: 'OCR' };
  const result = await entityLinker.resolve(mention);

  expect(result.disposition).toBe('QUEUED_FOR_REVIEW');
  expect(result.canonicalNodeId).toBeNull();
  expect(await reviewQueue.contains(mention.id)).toBe(true);
});
```

---

#### TC-F2-U2.3: Embedding Similarity Score Combined with Name Score
**Objective**: Verify that the composite scorer correctly weights name similarity (0.4), company overlap (0.3), and embedding similarity (0.3) when computing the final candidate score.

**Test Steps**:
1. Mock name similarity = 0.9, company overlap = 0.8, embedding similarity = 0.7
2. Call `compositeScorer.score(mention, candidate)`
3. Assert returned score ≈ `0.9*0.4 + 0.8*0.3 + 0.7*0.3 = 0.81`

**Expected Result**: Composite score = 0.81 ± 0.01.

**Code Sample**:
```typescript
it('should compute weighted composite score from name, company, and embedding signals', () => {
  const score = compositeScorer.score(
    { nameSimilarity: 0.9, companyOverlap: 0.8, embeddingSimilarity: 0.7 }
  );
  expect(score).toBeCloseTo(0.81, 2);
});
```

---

### 1.3 New Node Creation

#### TC-F2-U3.1: Unmatched Mention Creates New Canonical Node
**Objective**: Verify that a mention with no acceptable match candidate results in the creation of a new Person node with a generated ID.

**Test Steps**:
1. Build a mention for a name and email that do not exist in the graph
2. Call `entityLinker.resolve(mention)`
3. Assert `newNodeCreated === true`
4. Assert returned `canonicalNodeId` is a non-empty UUID

**Expected Result**: New node created; ID is a valid UUID; `disposition === 'NEW_NODE'`.

**Code Sample**:
```typescript
describe('EntityLinker — NewNodeCreation', () => {
  it('should create a new canonical node for an unmatched mention', async () => {
    const mention: EntityMention = { name: 'Zara Novak', email: 'zara.novak@newco.io', source: 'BUSINESS_CARD' };
    const result = await entityLinker.resolve(mention);

    expect(result.newNodeCreated).toBe(true);
    expect(result.canonicalNodeId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.disposition).toBe('NEW_NODE');
  });
});
```

---

#### TC-F2-U3.2: New Node Is Stored with Correct Source Provenance
**Objective**: Verify that a newly created node includes a `provenance` field recording the originating source system.

**Test Steps**:
1. Resolve unmatched mention from `source: 'BADGE_SCAN'`
2. Retrieve created node from graph
3. Assert `node.provenance[0].source === 'BADGE_SCAN'` and `node.provenance[0].timestamp` is within 5 seconds

**Expected Result**: Provenance attached; source is `BADGE_SCAN`; timestamp is recent.

**Code Sample**:
```typescript
it('should attach provenance to a newly created node', async () => {
  const mention: EntityMention = { name: 'Leo Brand', email: 'leo@brandnew.io', source: 'BADGE_SCAN' };
  const result = await entityLinker.resolve(mention);
  const node = await graphDb.getNode(result.canonicalNodeId);

  expect(node.provenance[0].source).toBe('BADGE_SCAN');
  expect(new Date(node.provenance[0].timestamp).getTime()).toBeCloseTo(Date.now(), -4);
});
```

---

#### TC-F2-U3.3: Company Node Created When Employer is Unknown
**Objective**: Verify that an unmatched company name in a mention triggers creation of a new Company node in addition to the Person node.

**Test Steps**:
1. Resolve mention `{ name: 'Nina Osei', email: 'nina@newcorp.ai', company: 'NewCorp AI', source: 'LINKEDIN_IMPORT' }`
2. Assert two new nodes are created: one Person, one Company
3. Assert a `works_for` edge connects them

**Expected Result**: Person node and Company node created; `works_for` edge present.

**Code Sample**:
```typescript
it('should create both a Person and a Company node when the company is unknown', async () => {
  const result = await entityLinker.resolve({ name: 'Nina Osei', email: 'nina@newcorp.ai', company: 'NewCorp AI', source: 'LINKEDIN_IMPORT' });

  expect(result.newNodeCreated).toBe(true);
  const edges = await graphDb.getEdges(result.canonicalNodeId, 'works_for');
  expect(edges).toHaveLength(1);
  expect(edges[0].target.type).toBe('Company');
  expect(edges[0].target.properties.name).toBe('NewCorp AI');
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Entity Linker ↔ Graph Database

#### TC-F2-I1.1: Deterministic Match Triggers Graph Merge Not Duplicate Insert
**Objective**: Verify that resolving a mention that matches an existing node updates the existing node's provenance rather than creating a duplicate.

**Preconditions**:
- `Person` node `p-001` exists with one provenance entry from `BADGE_SCAN`

**Test Steps**:
1. Resolve mention `{ email: 'alice@example.com', source: 'LINKEDIN_IMPORT' }`
2. Query graph for Person nodes with `email = 'alice@example.com'`
3. Assert exactly 1 node exists (no duplicate)
4. Assert `node.provenance` has 2 entries (original + new import)

**Expected Result**: No duplicate; provenance array grows by 1; node `id` unchanged.

**Code Sample**:
```typescript
it('should merge provenance on deterministic match without creating a duplicate node', async () => {
  await entityLinker.resolve({ email: 'alice@example.com', name: 'Alice Chen', source: 'LINKEDIN_IMPORT' });

  const result = await neo4j.run('MATCH (p:Person { email: $email }) RETURN p', { email: 'alice@example.com' });
  expect(result.records).toHaveLength(1);

  const node = result.records[0].get('p').properties;
  expect(node.provenance).toHaveLength(2);
});
```

---

#### TC-F2-I1.2: Review Queue Entry Surfaces in Review API
**Objective**: Verify that a queued-for-review mention is retrievable via the `reviewQueueService.list()` API with correct mention details.

**Test Steps**:
1. Resolve a low-confidence mention that is queued for review
2. Call `reviewQueueService.list({ status: 'PENDING' })`
3. Assert the queued mention appears in the list with correct `name`, `source`, and `candidateIds`

**Expected Result**: Review queue item present; candidate IDs populated; status is `PENDING`.

**Code Sample**:
```typescript
it('should surface queued mention in the review API', async () => {
  await entityLinker.resolve({ name: 'Mike Lee', company: 'Unknown Co', source: 'OCR' });

  const queue = await reviewQueueService.list({ status: 'PENDING' });
  const item = queue.items.find(i => i.mention.name === 'Mike Lee');

  expect(item).toBeDefined();
  expect(item!.candidateIds.length).toBeGreaterThan(0);
  expect(item!.status).toBe('PENDING');
});
```

---

### 2.2 Merge / Unmerge Review Workflow

#### TC-F2-I2.1: Human Approval of Review Queue Item Links Nodes and Closes Queue Entry
**Objective**: Verify that approving a merge in the review queue creates the canonical link in the graph and marks the queue item as `RESOLVED`.

**Test Steps**:
1. Insert a queued mention pointing at candidate `p-007`
2. Call `reviewQueueService.approve(queueItemId, { canonicalNodeId: 'p-007' })`
3. Assert mention is linked to `p-007` in the graph
4. Assert queue item status = `RESOLVED`

**Expected Result**: Graph updated; queue item closed; no duplicate node created.

**Code Sample**:
```typescript
it('should link mention to canonical node on review approval', async () => {
  const itemId = await insertQueueItem({ mentionId: 'm-001', candidateIds: ['p-007'] });
  await reviewQueueService.approve(itemId, { canonicalNodeId: 'p-007' });

  const link = await graphDb.getMentionLink('m-001');
  expect(link.canonicalNodeId).toBe('p-007');

  const item = await reviewQueueService.get(itemId);
  expect(item.status).toBe('RESOLVED');
});
```

---

#### TC-F2-I2.2: Unmerge Reverts Incorrect Link and Re-Creates Original Node
**Objective**: Verify that calling unmerge on an incorrectly linked mention disconnects it from the wrong canonical node and creates a fresh node.

**Test Steps**:
1. Link mention `m-bad` to canonical node `p-007` (incorrect merge)
2. Call `entityLinker.unmerge('m-bad')`
3. Assert `m-bad` is no longer linked to `p-007`
4. Assert a new Person node is created with provenance from original mention
5. Assert `p-007` node properties are unchanged

**Expected Result**: Incorrect link severed; new node exists; `p-007` is intact.

**Code Sample**:
```typescript
it('should unmerge an incorrect link and restore the original mention as a new node', async () => {
  await graphDb.linkMention('m-bad', 'p-007');
  const result = await entityLinker.unmerge('m-bad');

  expect(result.newCanonicalNodeId).not.toBe('p-007');
  const oldLink = await graphDb.getMentionLink('m-bad');
  expect(oldLink.canonicalNodeId).toBe(result.newCanonicalNodeId);
  const p007 = await graphDb.getNode('p-007');
  expect(p007).toBeDefined();
});
```

---

### 2.3 Cross-Source Provenance Tracking

#### TC-F2-I3.1: Provenance Tracks All Contributing Sources on a Merged Node
**Objective**: Verify that a node resolved from three different sources (`BADGE_SCAN`, `TRANSCRIPT`, `LINKEDIN_IMPORT`) carries all three provenance entries.

**Test Steps**:
1. Resolve three mentions for the same email from different sources
2. Retrieve the canonical node from the graph
3. Assert `node.provenance` has 3 entries with distinct `source` values

**Expected Result**: 3 provenance entries; no duplicate sources; each entry has a `timestamp`.

**Code Sample**:
```typescript
it('should accumulate provenance across three distinct sources', async () => {
  const email = 'multi@source.io';
  for (const source of ['BADGE_SCAN', 'TRANSCRIPT', 'LINKEDIN_IMPORT'] as const) {
    await entityLinker.resolve({ name: 'Multi Source', email, source });
  }

  const node = await graphDb.getNodeByEmail(email);
  const sources = node.provenance.map((p: Provenance) => p.source);

  expect(sources).toEqual(expect.arrayContaining(['BADGE_SCAN', 'TRANSCRIPT', 'LINKEDIN_IMPORT']));
  node.provenance.forEach((p: Provenance) => expect(p.timestamp).toBeDefined());
});
```

---

#### TC-F2-I3.2: Provenance Survives Schema Migration
**Objective**: Verify that provenance entries on existing Person nodes are preserved and queryable after a schema version upgrade.

**Test Steps**:
1. Create a Person node with 2 provenance entries at schema version 5
2. Run schema migration to version 6
3. Retrieve the node; assert provenance entries are still present and intact

**Expected Result**: Provenance preserved post-migration; no data loss.

**Code Sample**:
```typescript
it('should preserve node provenance across schema migration', async () => {
  const nodeId = await createPersonWithProvenance(['BADGE_SCAN', 'OCR']);
  await migrationEngine.applyVersion(6);

  const node = await graphDb.getNode(nodeId);
  expect(node.provenance).toHaveLength(2);
  expect(node.provenance.map((p: Provenance) => p.source)).toEqual(expect.arrayContaining(['BADGE_SCAN', 'OCR']));
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Ambiguous and Near-Duplicate Mentions

#### TC-F2-E1.1: Two Candidates with Equal Confidence Are Both Queued for Review
**Objective**: Verify that when two candidate nodes tie on composite score, the mention is queued for human review rather than arbitrarily auto-linked.

**Test Steps**:
1. Mock composite scorer to return 0.80 for both `p-010` and `p-011` for the same mention
2. Call `entityLinker.resolve(mention)`
3. Assert `disposition === 'QUEUED_FOR_REVIEW'`
4. Assert `reviewItem.candidateIds` contains both `p-010` and `p-011`

**Expected Result**: Ambiguous tie routes to review; no arbitrary auto-link.

**Code Sample**:
```typescript
it('should queue mention for review when two candidates tie on composite score', async () => {
  compositeScorerMock.setScores({ 'p-010': 0.80, 'p-011': 0.80 });
  const result = await entityLinker.resolve({ name: 'Tied Name', source: 'OCR' });

  expect(result.disposition).toBe('QUEUED_FOR_REVIEW');
  expect(result.reviewItem!.candidateIds).toEqual(expect.arrayContaining(['p-010', 'p-011']));
});
```

---

#### TC-F2-E1.2: Empty Mention (No Name, No Email, No Phone) Is Rejected
**Objective**: Verify that a mention with no identifying fields throws a `MentionValidationError` before resolution is attempted.

**Test Steps**:
1. Call `entityLinker.resolve({ source: 'OCR' })` with no name, email, or phone
2. Assert `MentionValidationError` is thrown with message referencing missing identifiers

**Expected Result**: Resolution not attempted; error thrown immediately.

**Code Sample**:
```typescript
it('should throw MentionValidationError for a mention with no identifying fields', async () => {
  await expect(entityLinker.resolve({ source: 'OCR' })).rejects.toThrow(MentionValidationError);
});
```

---

### 3.2 Conflicting Deterministic Keys

#### TC-F2-E2.1: Mention with Email Matching Node A and LinkedIn Matching Node B Is Escalated
**Objective**: Verify that conflicting deterministic keys (email → `p-001`, LinkedIn URL → `p-002`) do not cause an auto-link and are escalated to review.

**Test Steps**:
1. Build mention `{ email: 'alice@example.com', linkedInUrl: 'https://linkedin.com/in/differentperson' }`
2. Resolve; assert `disposition === 'QUEUED_FOR_REVIEW'`
3. Assert `reviewItem.conflictReason === 'CONFLICTING_DETERMINISTIC_KEYS'`

**Expected Result**: Conflict detected; queued for review; not linked to either node.

**Code Sample**:
```typescript
it('should escalate to review when deterministic keys point to different nodes', async () => {
  const result = await entityLinker.resolve({
    email: 'alice@example.com',
    linkedInUrl: 'https://linkedin.com/in/differentperson',
    source: 'MANUAL',
  });

  expect(result.disposition).toBe('QUEUED_FOR_REVIEW');
  expect(result.reviewItem!.conflictReason).toBe('CONFLICTING_DETERMINISTIC_KEYS');
});
```

---

#### TC-F2-E2.2: OCR Noise in Email Address Falls Back to Fuzzy Matching
**Objective**: Verify that an OCR-corrupted email (`alice@examp1e.com`) does not yield a deterministic match and falls back to probabilistic matching using name and company.

**Test Steps**:
1. Build mention `{ name: 'Alice Chen', email: 'alice@examp1e.com', company: 'TechCorp', source: 'OCR' }`
2. Resolve; assert `matchType !== 'DETERMINISTIC'`
3. Assert fallback to probabilistic scoring is logged

**Expected Result**: No deterministic match on corrupted email; probabilistic fallback invoked.

**Code Sample**:
```typescript
it('should fall back to probabilistic matching when OCR corrupts the email field', async () => {
  const result = await entityLinker.resolve({ name: 'Alice Chen', email: 'alice@examp1e.com', company: 'TechCorp', source: 'OCR' });
  expect(result.matchType).not.toBe('DETERMINISTIC');
  expect(mockLogger.entries.some(e => e.includes('probabilistic_fallback'))).toBe(true);
});
```

---

### 3.3 High-Volume Duplicate Ingestion

#### TC-F2-E3.1: 100 Identical Mentions for the Same Person Result in One Node
**Objective**: Verify that ingesting 100 identical badge-scan mentions for the same person creates exactly one canonical node.

**Test Steps**:
1. Sequentially resolve 100 identical mentions for `{ email: 'stress@test.io', name: 'Stress Test' }`
2. Query graph for nodes with `email = 'stress@test.io'`
3. Assert exactly 1 node exists; `provenance` has 100 entries

**Expected Result**: Single canonical node; 100 provenance entries; no duplicates.

**Code Sample**:
```typescript
it('should deduplicate 100 identical mentions to one canonical node', async () => {
  for (let i = 0; i < 100; i++) {
    await entityLinker.resolve({ name: 'Stress Test', email: 'stress@test.io', source: 'BADGE_SCAN' });
  }

  const result = await neo4j.run('MATCH (p:Person { email: $email }) RETURN p', { email: 'stress@test.io' });
  expect(result.records).toHaveLength(1);
  expect(result.records[0].get('p').properties.provenance).toHaveLength(100);
});
```

---

#### TC-F2-E3.2: Mention with Only Whitespace Name Treated as Empty
**Objective**: Verify that a mention with `name: '   '` is treated as an empty identifier and triggers `MentionValidationError`.

**Test Steps**:
1. Resolve `{ name: '   ', source: 'OCR' }`
2. Assert `MentionValidationError` thrown with code `EMPTY_IDENTIFIERS`

**Expected Result**: Whitespace-only name treated as absent; error thrown.

**Code Sample**:
```typescript
it('should treat whitespace-only name as empty and throw MentionValidationError', async () => {
  await expect(entityLinker.resolve({ name: '   ', source: 'OCR' })).rejects.toThrow(MentionValidationError);
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Resolution Throughput

#### TC-F2-P1.1: 1,000 Deterministic Resolutions Per Second
**Objective**: Verify that the entity linker achieves ≥ 1,000 deterministic resolutions per second with a warm candidate index.

**Preconditions**:
- 10,000 Person nodes in graph; candidate index warmed
- All mentions have matching emails

**Test Steps**:
1. Generate 5,000 mentions with emails matching existing nodes
2. Start timer; resolve all 5,000 concurrently (batch size 100)
3. Assert total time ≤ 5 seconds

**Expected Result**: ≥ 1,000 resolutions/sec; no errors; no false new-node creations.

**Code Sample**:
```typescript
it('should resolve 5000 deterministic mentions within 5 seconds', async () => {
  const mentions = existingEmails.slice(0, 5000).map(email => ({ name: 'Test', email, source: 'BADGE_SCAN' as const }));
  const start = Date.now();
  await Promise.all(chunk(mentions, 100).map(batch => Promise.all(batch.map(m => entityLinker.resolve(m)))));
  expect(Date.now() - start).toBeLessThanOrEqual(5000);
});
```

---

#### TC-F2-P1.2: Probabilistic Resolution p99 Latency Under 200 ms
**Objective**: Verify that a single probabilistic resolution (with embedding lookup) completes within 200 ms at the 99th percentile.

**Test Steps**:
1. Run 200 probabilistic resolutions with no deterministic keys
2. Record latency per call
3. Assert p99 ≤ 200 ms

**Expected Result**: p99 latency ≤ 200 ms; embedding service not a bottleneck at this scale.

**Code Sample**:
```typescript
it('should complete probabilistic resolution within 200 ms at p99', async () => {
  const latencies: number[] = [];
  for (let i = 0; i < 200; i++) {
    const t = Date.now();
    await entityLinker.resolve({ name: `User ${i}`, company: `Corp ${i % 10}`, source: 'TRANSCRIPT' });
    latencies.push(Date.now() - t);
  }
  expect(percentile(99, latencies)).toBeLessThanOrEqual(200);
});
```

---

### 4.2 Candidate Index Performance

#### TC-F2-P2.1: Candidate Index Lookup Returns Top-10 Candidates Under 20 ms
**Objective**: Verify that the candidate retrieval step for a probabilistic match returns up to 10 candidates within 20 ms on a graph with 50,000 Person nodes.

**Test Steps**:
1. Index 50,000 Person nodes
2. Run 100 candidate lookups
3. Assert p95 ≤ 20 ms; all return ≤ 10 candidates

**Expected Result**: Fast ANN index lookup; p95 ≤ 20 ms; no more than 10 candidates per query.

**Code Sample**:
```typescript
it('should return up to 10 candidates in under 20 ms from a 50k-node index', async () => {
  await seedPersonNodes(50_000);
  const latencies: number[] = [];

  for (let i = 0; i < 100; i++) {
    const t = Date.now();
    const candidates = await candidateIndex.query({ nameEmbedding: randomEmbedding(), topK: 10 });
    latencies.push(Date.now() - t);
    expect(candidates.length).toBeLessThanOrEqual(10);
  }
  expect(percentile(95, latencies)).toBeLessThanOrEqual(20);
});
```

---

#### TC-F2-P2.2: Index Rebuild After Bulk Import Completes Within 30 Seconds
**Objective**: Verify that the candidate index can be rebuilt after importing 10,000 new Person nodes within 30 seconds.

**Test Steps**:
1. Import 10,000 Person nodes
2. Trigger `candidateIndex.rebuild()`
3. Assert rebuild completes in ≤ 30 seconds
4. Assert index size equals 10,000 + baseline count

**Expected Result**: Rebuild completes in ≤ 30 s; full index available; no queries blocked during rebuild.

**Code Sample**:
```typescript
it('should rebuild candidate index within 30 seconds after 10k node import', async () => {
  await bulkImport(10_000);
  const start = Date.now();
  await candidateIndex.rebuild();
  expect(Date.now() - start).toBeLessThanOrEqual(30_000);
  expect(await candidateIndex.size()).toBe(10_000 + BASELINE_COUNT);
});
```

---

### 4.3 Review Queue Throughput

#### TC-F2-P3.1: Review Queue Handles 500 Concurrent Inserts Without Data Loss
**Objective**: Verify that 500 simultaneous queue insertions all persist correctly without lost entries.

**Test Steps**:
1. Fire 500 concurrent `reviewQueue.insert(item)` calls
2. Assert `reviewQueue.count({ status: 'PENDING' })` equals 500

**Expected Result**: All 500 entries persisted; no duplicates; no lost writes.

**Code Sample**:
```typescript
it('should persist all 500 concurrent review queue inserts', async () => {
  const items = Array.from({ length: 500 }, (_, i) => buildQueueItem(`mention-${i}`));
  await Promise.all(items.map(item => reviewQueue.insert(item)));
  expect(await reviewQueue.count({ status: 'PENDING' })).toBe(500);
});
```

---

#### TC-F2-P3.2: Bulk Approval Processes 100 Review Items Within 10 Seconds
**Objective**: Verify that approving 100 review queue items in bulk completes within 10 seconds.

**Test Steps**:
1. Insert 100 pending review items
2. Call `reviewQueueService.bulkApprove(itemIds, resolutions)`
3. Assert all 100 are marked `RESOLVED` within 10 seconds

**Expected Result**: Bulk approval completes ≤ 10 s; all items resolved; graph updated.

**Code Sample**:
```typescript
it('should bulk-approve 100 review items within 10 seconds', async () => {
  const itemIds = await insertManyQueueItems(100);
  const resolutions = itemIds.map(id => ({ itemId: id, canonicalNodeId: 'p-bulk-target' }));

  const start = Date.now();
  await reviewQueueService.bulkApprove(resolutions);
  expect(Date.now() - start).toBeLessThanOrEqual(10_000);

  const pending = await reviewQueue.count({ status: 'PENDING' });
  expect(pending).toBe(0);
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

**Approximate total**: ~27 test cases covering deterministic matching, probabilistic/fuzzy resolution, new node creation, merge/unmerge workflows, provenance tracking, and performance SLAs.
