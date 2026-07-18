# EPIC04 Feature 4 — Relationship Scoring — Test Cases

## Test Overview
Comprehensive test suite for Relationship Scoring covering unit tests, integration tests, edge cases, and performance validation. Relationship scoring quantifies the strength of a connection between two contacts based on interaction frequency, recency, directionality, meeting co-attendance, and communication patterns. Tests cover score calculation algorithms, temporal decay functions, weighting factor configurations, and score update triggers.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Base Score Calculation

#### TC-F4-U1.1: Score reflects interaction count correctly
**Objective**: Verify that a higher number of shared interactions produces a proportionally higher base score.

**Preconditions**:
- `RelationshipScorer` configured with default weights.
- Two contact pairs: A↔B (3 interactions) and C↔D (12 interactions).

**Test Steps**:
1. Calculate `scorer.calculate(pairAB)`.
2. Calculate `scorer.calculate(pairCD)`.
3. Assert `scoreCD > scoreAB`.

**Expected Result**: Pair with more interactions receives a higher score.

**Code Sample**:
```typescript
import { RelationshipScorer } from '@/services/relationship/relationship-scorer';

it('should score higher for more interactions', () => {
  const scorer = new RelationshipScorer();
  const pairAB = buildInteractionHistory({ count: 3 });
  const pairCD = buildInteractionHistory({ count: 12 });

  expect(scorer.calculate(pairCD)).toBeGreaterThan(scorer.calculate(pairAB));
});
```

---

#### TC-F4-U1.2: Meeting co-attendance contributes more weight than email exchange
**Objective**: Confirm that a single in-person meeting co-attendance carries a higher weight than a single email exchange.

**Preconditions**:
- `RelationshipScorer` configured with `weights: { meeting: 0.5, email: 0.2, calendarEvent: 0.3 }`.

**Test Steps**:
1. Score pair with one meeting, zero emails.
2. Score pair with zero meetings, one email.
3. Assert meeting-only score > email-only score.

**Expected Result**: Meeting weight produces a higher contribution than email weight.

**Code Sample**:
```typescript
it('should weight meeting above email', () => {
  const scorer = new RelationshipScorer({ weights: { meeting: 0.5, email: 0.2 } });
  const meetingOnly = { meetings: 1, emails: 0 };
  const emailOnly = { meetings: 0, emails: 1 };

  expect(scorer.calculate(meetingOnly)).toBeGreaterThan(scorer.calculate(emailOnly));
});
```

---

#### TC-F4-U1.3: Score is bounded between 0.0 and 1.0
**Objective**: Verify that the scorer never returns a value outside the [0, 1] range regardless of input extremes.

**Preconditions**:
- Extreme inputs: 10 000 meetings, 0 interactions.

**Test Steps**:
1. Score a pair with 10 000 meetings.
2. Score a pair with 0 interactions.
3. Assert both scores are in [0.0, 1.0].

**Expected Result**: Scores are always clamped to the unit interval.

**Code Sample**:
```typescript
it.each([
  { meetings: 10_000, emails: 10_000 },
  { meetings: 0, emails: 0 },
])('score should be in [0, 1] for input %o', (input) => {
  const scorer = new RelationshipScorer();
  const score = scorer.calculate(input);
  expect(score).toBeGreaterThanOrEqual(0);
  expect(score).toBeLessThanOrEqual(1);
});
```

---

### 1.2 Temporal Decay

#### TC-F4-U2.1: Score decays over time for inactive relationships
**Objective**: Verify that a relationship with its last interaction 180 days ago has a lower score than one that interacted yesterday.

**Preconditions**:
- Both pairs have identical interaction counts and types.
- `decayHalfLife` set to 90 days.

**Test Steps**:
1. Score pair A: last interaction = today.
2. Score pair B: last interaction = 180 days ago.
3. Assert `scoreA > scoreB`.

**Expected Result**: Score decays with inactivity; more recent relationship scores higher.

**Code Sample**:
```typescript
import { addDays, subDays } from 'date-fns';

it('should return a lower score for an older last interaction', () => {
  const scorer = new RelationshipScorer({ decayHalfLifeDays: 90 });
  const recent = buildHistory({ count: 5, lastInteractionDate: new Date() });
  const stale = buildHistory({ count: 5, lastInteractionDate: subDays(new Date(), 180) });

  expect(scorer.calculate(recent)).toBeGreaterThan(scorer.calculate(stale));
});
```

---

#### TC-F4-U2.2: Decay half-life is configurable and respected
**Objective**: Verify that changing the `decayHalfLifeDays` parameter changes the decay rate accordingly.

**Preconditions**:
- Pair with last interaction 60 days ago.
- Compare scorer with `halfLife = 30` vs `halfLife = 120`.

**Test Steps**:
1. Score with 30-day half-life.
2. Score with 120-day half-life.
3. Assert 120-day scorer produces a higher score (less decay).

**Expected Result**: Longer half-life produces less decay for the same elapsed time.

**Code Sample**:
```typescript
it('longer half-life should produce less decay', () => {
  const history = buildHistory({ count: 5, lastInteractionDate: subDays(new Date(), 60) });
  const aggressive = new RelationshipScorer({ decayHalfLifeDays: 30 });
  const gentle = new RelationshipScorer({ decayHalfLifeDays: 120 });

  expect(gentle.calculate(history)).toBeGreaterThan(aggressive.calculate(history));
});
```

---

#### TC-F4-U2.3: Decay factor does not go below minimum floor
**Objective**: Ensure that even for a relationship with no contact for 5 years, the score does not drop below the configured floor (e.g., 0.05).

**Preconditions**:
- `minimumScoreFloor = 0.05`.
- Last interaction 5 years ago.

**Test Steps**:
1. Score the pair.
2. Assert score >= 0.05.

**Expected Result**: Score never drops below the configured minimum floor.

**Code Sample**:
```typescript
it('score should not drop below minimum floor', () => {
  const scorer = new RelationshipScorer({ decayHalfLifeDays: 90, minimumFloor: 0.05 });
  const ancient = buildHistory({ count: 1, lastInteractionDate: subDays(new Date(), 365 * 5) });
  expect(scorer.calculate(ancient)).toBeGreaterThanOrEqual(0.05);
});
```

---

### 1.3 Directionality and Reciprocity

#### TC-F4-U3.1: Bidirectional communication scores higher than unidirectional
**Objective**: Verify that mutual email exchanges (A sends to B and B replies to A) score higher than one-way communication.

**Preconditions**:
- `RelationshipScorer` includes a reciprocity multiplier.

**Test Steps**:
1. Score pair with 5 emails all from A to B (unidirectional).
2. Score pair with 5 emails — 3 from A to B, 2 from B to A (bidirectional).
3. Assert bidirectional score > unidirectional score.

**Expected Result**: Mutual communication yields a higher score.

**Code Sample**:
```typescript
it('should score bidirectional communication higher', () => {
  const scorer = new RelationshipScorer({ reciprocityMultiplier: 1.3 });
  const uni = { emails: 5, emailDirections: ['A→B', 'A→B', 'A→B', 'A→B', 'A→B'] };
  const bi = { emails: 5, emailDirections: ['A→B', 'A→B', 'A→B', 'B→A', 'B→A'] };

  expect(scorer.calculate(bi)).toBeGreaterThan(scorer.calculate(uni));
});
```

---

#### TC-F4-U3.2: Score is symmetric for equal bidirectional interactions
**Objective**: Confirm that A→B score equals B→A score when interactions are perfectly balanced.

**Preconditions**:
- Equal number of emails in each direction; equal meeting attendance.

**Test Steps**:
1. Calculate A→B score.
2. Calculate B→A score.
3. Assert both scores are equal (within floating-point tolerance).

**Expected Result**: Symmetric interactions produce symmetric scores.

**Code Sample**:
```typescript
it('should be symmetric for balanced interactions', () => {
  const scorer = new RelationshipScorer();
  const ab = buildSymmetricHistory(contactA.id, contactB.id);
  const ba = buildSymmetricHistory(contactB.id, contactA.id);

  expect(scorer.calculate(ab)).toBeCloseTo(scorer.calculate(ba), 5);
});
```

---

#### TC-F4-U3.3: Relationship score increases after new interaction is recorded
**Objective**: Verify that recording a new email exchange causes `updateScore` to return a value higher than the previous score.

**Preconditions**:
- Existing score of 0.55 for A↔B.

**Test Steps**:
1. Record a new email interaction between A and B.
2. Retrieve updated score.
3. Assert new score > 0.55.

**Expected Result**: Score increases after recording a new interaction.

**Code Sample**:
```typescript
it('should increase score after a new interaction', async () => {
  await scorer.setBaseScore(contactA.id, contactB.id, 0.55);
  await interactionStore.recordEmail({ from: contactA.id, to: contactB.id, date: new Date() });

  const updated = await scorer.updateScore(contactA.id, contactB.id);
  expect(updated).toBeGreaterThan(0.55);
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Score Triggers

#### TC-F4-I1.1: Score is updated when a new meeting is logged
**Objective**: Verify that the relationship score between all attendees of a new meeting is recalculated when the meeting is saved.

**Preconditions**:
- Contacts A, B, and C have existing relationship scores.
- A new meeting with all three as attendees is created.

**Test Steps**:
1. Record existing baseline scores for A↔B, A↔C, B↔C.
2. Log a new meeting with attendees A, B, C.
3. Assert all three pair scores have increased.

**Expected Result**: All pairwise scores among meeting attendees are updated upward.

**Code Sample**:
```typescript
it('should recalculate pairwise scores when a meeting is logged', async () => {
  const [scoreAB, scoreAC, scoreBC] = await getBaselineScores([contactA, contactB, contactC]);
  await meetingService.createMeeting({ attendeeIds: [contactA.id, contactB.id, contactC.id] });

  expect(await scorer.getScore(contactA.id, contactB.id)).toBeGreaterThan(scoreAB);
  expect(await scorer.getScore(contactA.id, contactC.id)).toBeGreaterThan(scoreAC);
  expect(await scorer.getScore(contactB.id, contactC.id)).toBeGreaterThan(scoreBC);
});
```

---

#### TC-F4-I1.2: Daily decay job reduces scores for dormant relationships
**Objective**: Verify that the scheduled daily decay job reduces scores for contacts who have had no interactions in the past 90 days.

**Preconditions**:
- A↔B last interaction: 100 days ago.
- Score before decay job: 0.75.

**Test Steps**:
1. Record baseline score = 0.75 with last interaction 100 days ago.
2. Run `decayJob.run()`.
3. Assert score after job is < 0.75.

**Expected Result**: Score decreases after decay job runs.

**Code Sample**:
```typescript
it('should decrease score for dormant relationship after decay job', async () => {
  await scorer.setScoreWithHistory(contactA.id, contactB.id, {
    score: 0.75,
    lastInteractionDate: subDays(new Date(), 100),
  });

  await decayJob.run();

  const newScore = await scorer.getScore(contactA.id, contactB.id);
  expect(newScore).toBeLessThan(0.75);
});
```

---

### 2.2 Graph Propagation

#### TC-F4-I2.1: Scores are stored and retrievable from the relationship graph
**Objective**: Verify that calculated scores are persisted in the relationship graph store and can be queried by contact pair.

**Preconditions**:
- Relationship graph store is connected.

**Test Steps**:
1. Calculate and persist score for A↔B.
2. Query the graph for the edge between A and B.
3. Assert the edge weight equals the calculated score.

**Expected Result**: Persisted score matches the calculated value.

**Code Sample**:
```typescript
it('should persist and retrieve relationship score from graph', async () => {
  const score = await scorer.calculateAndPersist(contactA.id, contactB.id, history);
  const edge = await relationshipGraph.getEdge(contactA.id, contactB.id);

  expect(edge.weight).toBeCloseTo(score, 4);
});
```

---

#### TC-F4-I2.2: Top-N strongest relationships are retrievable by contact
**Objective**: Verify that the top 5 strongest relationships for a given contact are returned in descending score order.

**Preconditions**:
- Contact A has 10 scored relationships with varying strengths.

**Test Steps**:
1. Store 10 relationship scores for contact A.
2. Call `scorer.getTopRelationships(contactA.id, { limit: 5 })`.
3. Assert result has exactly 5 entries.
4. Assert entries are in descending score order.

**Expected Result**: Top 5 relationships returned in descending order.

**Code Sample**:
```typescript
it('should return top 5 relationships in descending score order', async () => {
  await seedRelationships(contactA.id, 10);
  const top5 = await scorer.getTopRelationships(contactA.id, { limit: 5 });

  expect(top5).toHaveLength(5);
  for (let i = 1; i < top5.length; i++) {
    expect(top5[i - 1].score).toBeGreaterThanOrEqual(top5[i].score);
  }
});
```

---

### 2.3 Score History and Audit

#### TC-F4-I3.1: Score history is appended on each recalculation
**Objective**: Verify that each score recalculation appends a new entry to the relationship's score history log.

**Preconditions**:
- A↔B has an existing score history with 2 entries.

**Test Steps**:
1. Trigger a recalculation event (log a new interaction).
2. Query score history for A↔B.
3. Assert history now has 3 entries.
4. Assert the newest entry's `calculatedAt` is recent.

**Expected Result**: History grows by one entry per recalculation.

**Code Sample**:
```typescript
it('should append to score history on recalculation', async () => {
  await seedScoreHistory(contactA.id, contactB.id, 2);
  await interactionStore.recordEmail({ from: contactA.id, to: contactB.id, date: new Date() });
  await scorer.updateScore(contactA.id, contactB.id);

  const history = await scoreHistoryStore.getHistory(contactA.id, contactB.id);
  expect(history).toHaveLength(3);
  expect(new Date(history[2].calculatedAt).getTime()).toBeCloseTo(Date.now(), -3);
});
```

---

#### TC-F4-I3.2: Score history enables trend detection (rising vs declining)
**Objective**: Confirm that the history analysis utility correctly classifies a relationship as 'rising' when the last 3 scores are monotonically increasing.

**Preconditions**:
- Score history: [0.40, 0.52, 0.67] (ascending over last 30 days).

**Test Steps**:
1. Store the history.
2. Call `scoreAnalyser.getTrend(contactA.id, contactB.id, { window: 3 })`.
3. Assert result is `'rising'`.

**Expected Result**: Trend correctly identified as `'rising'`.

**Code Sample**:
```typescript
it('should classify ascending score history as rising', async () => {
  await seedScoreHistory(contactA.id, contactB.id, [0.40, 0.52, 0.67]);
  const trend = await scoreAnalyser.getTrend(contactA.id, contactB.id, { window: 3 });
  expect(trend).toBe('rising');
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Zero-Interaction Baseline

#### TC-F4-E1.1: Two contacts with no interactions have a score of 0
**Objective**: Verify that a pair with no recorded interactions returns a score of exactly 0.

**Preconditions**:
- No interaction history for A↔B.

**Test Steps**:
1. Call `scorer.calculate({ meetings: 0, emails: 0, calls: 0 })`.
2. Assert result === 0.

**Expected Result**: Score is 0 for pairs with no interactions.

**Code Sample**:
```typescript
it('should return 0 for contacts with no interactions', () => {
  const scorer = new RelationshipScorer();
  expect(scorer.calculate({ meetings: 0, emails: 0, calls: 0 })).toBe(0);
});
```

---

#### TC-F4-E1.2: Score for a newly introduced pair starts at 0, not undefined
**Objective**: Ensure that querying the score for a brand-new contact pair that has never been scored returns 0, not `null` or `undefined`.

**Preconditions**:
- No relationship record exists between A and newly created contact Z.

**Test Steps**:
1. Create contact Z.
2. Query `scorer.getScore(contactA.id, contactZ.id)`.
3. Assert result === 0.

**Expected Result**: Default score of 0 returned for unknown pairs.

**Code Sample**:
```typescript
it('should return 0 (not null) for a new contact pair', async () => {
  const z = await svc.createContact({ firstName: 'Zara', email: 'z@new.com' });
  const score = await scorer.getScore(contactA.id, z.id);
  expect(score).toBe(0);
});
```

---

### 3.2 Extreme Inputs

#### TC-F4-E2.1: Score does not overflow for extremely high interaction counts
**Objective**: Verify that 100 000 logged interactions produce a valid score of 1.0, not Infinity or NaN.

**Preconditions**:
- Scorer uses a logarithmic scaling function.

**Test Steps**:
1. Build history with 100 000 email interactions.
2. Assert score is a finite number in [0, 1].

**Expected Result**: Score is clamped to 1.0 — no overflow or NaN.

**Code Sample**:
```typescript
it('should not overflow for 100k interactions', () => {
  const scorer = new RelationshipScorer();
  const massive = buildHistory({ count: 100_000 });
  const score = scorer.calculate(massive);

  expect(Number.isFinite(score)).toBe(true);
  expect(score).toBeLessThanOrEqual(1.0);
});
```

---

#### TC-F4-E2.2: Negative interaction count input is rejected gracefully
**Objective**: Confirm that passing a negative meeting count throws a `ValidationError` rather than producing a nonsensical score.

**Preconditions**:
- `RelationshipScorer` validates inputs.

**Test Steps**:
1. Call `scorer.calculate({ meetings: -1, emails: 5 })`.
2. Assert `ValidationError` is thrown.

**Expected Result**: `ValidationError` with clear message about non-negative constraints.

**Code Sample**:
```typescript
it('should reject negative interaction count', () => {
  const scorer = new RelationshipScorer();
  expect(() => scorer.calculate({ meetings: -1, emails: 5 })).toThrow(ValidationError);
});
```

---

### 3.3 Weight Configuration Edge Cases

#### TC-F4-E3.1: All weights set to zero produces a score of 0
**Objective**: Verify that configuring all interaction weights to zero always produces a score of 0.

**Preconditions**:
- `RelationshipScorer` configured with `weights: { meeting: 0, email: 0, call: 0 }`.

**Test Steps**:
1. Score a pair with 10 meetings and 50 emails.
2. Assert score === 0.

**Expected Result**: Zero weights produce zero score regardless of interaction count.

**Code Sample**:
```typescript
it('should return 0 when all weights are zero', () => {
  const scorer = new RelationshipScorer({ weights: { meeting: 0, email: 0, call: 0 } });
  expect(scorer.calculate({ meetings: 10, emails: 50 })).toBe(0);
});
```

---

#### TC-F4-E3.2: Weights that do not sum to 1.0 are normalised automatically
**Objective**: Confirm that weights `{ meeting: 2, email: 1, call: 1 }` are normalised to `{ meeting: 0.5, email: 0.25, call: 0.25 }` internally.

**Preconditions**:
- Scorer auto-normalises weights on construction.

**Test Steps**:
1. Construct scorer with raw weights summing to 4.
2. Verify internal `normalizedWeights` sum to 1.0.
3. Score should be identical to a scorer constructed with the normalised fractions directly.

**Expected Result**: Weights are normalised; scores are consistent.

**Code Sample**:
```typescript
it('should normalise weights that do not sum to 1', () => {
  const raw = new RelationshipScorer({ weights: { meeting: 2, email: 1, call: 1 } });
  const normalised = new RelationshipScorer({ weights: { meeting: 0.5, email: 0.25, call: 0.25 } });

  const history = { meetings: 3, emails: 5, calls: 2 };
  expect(raw.calculate(history)).toBeCloseTo(normalised.calculate(history), 5);
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Score Calculation Throughput

#### TC-F4-P1.1: Calculate 100 000 scores per second (in-memory)
**Objective**: Validate that the scoring algorithm is fast enough for batch processing without I/O.

**Preconditions**:
- In-memory history objects, no database calls.

**Test Steps**:
1. Generate 100 000 history objects.
2. Time `histories.map(scorer.calculate)`.
3. Assert throughput >= 100 000 calculations/second.

**Expected Result**: >= 100 k scores/second in-process.

**Code Sample**:
```typescript
it('should calculate 100k scores per second in-memory', () => {
  const scorer = new RelationshipScorer();
  const histories = Array.from({ length: 100_000 }, () => buildRandomHistory());

  const t0 = performance.now();
  histories.forEach((h) => scorer.calculate(h));
  const elapsed = performance.now() - t0;

  const throughput = (100_000 / elapsed) * 1000;
  expect(throughput).toBeGreaterThanOrEqual(100_000);
});
```

---

#### TC-F4-P1.2: Bulk score refresh for 10 000 relationships completes in under 30 seconds
**Objective**: Validate the batch score refresh job processes 10 000 relationships within 30 seconds including DB reads and writes.

**Preconditions**:
- 10 000 relationship records in the DB with interaction histories.

**Test Steps**:
1. Seed 10 000 relationships.
2. Start timer; run `scoreRefreshJob.run()`.
3. Assert elapsed <= 30 000 ms.

**Expected Result**: Batch refresh completes within 30 s.

**Code Sample**:
```typescript
it('score refresh job processes 10k relationships under 30s', async () => {
  await seedRelationships(relationshipStore, 10_000);
  const t0 = performance.now();
  await scoreRefreshJob.run();
  expect(performance.now() - t0).toBeLessThan(30_000);
});
```

---

### 4.2 Real-Time Update Latency

#### TC-F4-P2.1: Score update triggered by a new meeting completes within 500 ms
**Objective**: Validate that when a meeting is saved, all pairwise score updates complete within 500 ms.

**Preconditions**:
- Meeting with 5 attendees.

**Test Steps**:
1. Save a meeting with 5 attendees.
2. Poll for score updates until all 10 pairwise scores are updated.
3. Assert total elapsed time <= 500 ms.

**Expected Result**: All 10 pairwise score updates complete in <= 500 ms.

**Code Sample**:
```typescript
it('pairwise score updates from a 5-person meeting complete under 500ms', async () => {
  const attendees = await createContacts(5);
  const t0 = performance.now();
  await meetingService.createMeeting({ attendeeIds: attendees.map((c) => c.id) });
  await waitForScoreUpdates(attendees);
  expect(performance.now() - t0).toBeLessThan(500);
});
```

---

#### TC-F4-P2.2: Decay job processes 1 million relationships in under 5 minutes
**Objective**: Validate the nightly decay job can handle a dataset of 1 million relationship pairs within the maintenance window.

**Preconditions**:
- 1 000 000 relationship records seeded.

**Test Steps**:
1. Seed 1 million relationships.
2. Start timer; run `decayJob.run()`.
3. Assert elapsed <= 300 000 ms (5 minutes).

**Expected Result**: Decay job completes within 5 minutes for 1 M relationships.

**Code Sample**:
```typescript
it('decay job handles 1M relationships under 5 minutes', async () => {
  await seedRelationships(relationshipStore, 1_000_000);
  const t0 = performance.now();
  await decayJob.run();
  expect(performance.now() - t0).toBeLessThan(300_000);
}, 360_000);
```

---

### 4.3 Query Performance

#### TC-F4-P3.1: Top-10 relationships query returns in under 50 ms for contacts with 10 000 relationships
**Objective**: Validate the top-N query is index-backed and fast.

**Preconditions**:
- Contact A has 10 000 scored relationships.
- Index exists on `(contactId, score DESC)`.

**Test Steps**:
1. Seed 10 000 relationships for contact A.
2. Time `scorer.getTopRelationships(contactA.id, { limit: 10 })`.
3. Assert elapsed <= 50 ms.

**Expected Result**: Top-10 query <= 50 ms even with 10 000 relationships.

**Code Sample**:
```typescript
it('top-10 query should return under 50ms', async () => {
  await seedRelationships(contactA.id, 10_000);
  const t0 = performance.now();
  await scorer.getTopRelationships(contactA.id, { limit: 10 });
  expect(performance.now() - t0).toBeLessThan(50);
});
```

---

#### TC-F4-P3.2: Relationship graph traversal (2 hops) completes in under 200 ms for dense nodes
**Objective**: Confirm that a 2-hop graph traversal starting from a highly connected node (1 000 direct relationships) completes within 200 ms.

**Preconditions**:
- Contact A has 1 000 direct relationships; each 1-hop contact has ~100 further relationships.

**Test Steps**:
1. Seed the dense graph.
2. Time `relationshipGraph.traverse(contactA.id, { maxHops: 2, minScore: 0.5 })`.
3. Assert elapsed <= 200 ms.

**Expected Result**: 2-hop traversal on a dense graph completes in under 200 ms.

**Code Sample**:
```typescript
it('2-hop graph traversal under 200ms for dense node', async () => {
  await seedDenseGraph(contactA.id, { directRelationships: 1000, secondHopPerNode: 100 });
  const t0 = performance.now();
  await relationshipGraph.traverse(contactA.id, { maxHops: 2, minScore: 0.5 });
  expect(performance.now() - t0).toBeLessThan(200);
});
```

---

## Test Execution Summary

### Test Categories
- **Unit Tests**: 3 suites, 9 test cases
- **Integration Tests**: 3 suites, 6 test cases
- **Edge Cases**: 3 suites, 6 test cases
- **Performance Tests**: 3 suites, 6 test cases

### Total: 27 comprehensive test cases
