# EPIC09 Feature 4 — Behavioral Coaching — Test Cases

## Test Overview
Comprehensive test suite for Behavioral Coaching covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Behavioral Pattern Detection

#### TC-F4-U1.1: Passive Networking Pattern Detection
**Objective**: Verify that the pattern detector correctly identifies a passive networking pattern when the user initiates fewer than 30% of conversations across a conference.

**Preconditions**:
- Interaction records with `initiator` field populated
- Minimum 10 interactions for pattern reliability

**Test Steps**:
1. Seed 10 interactions where user initiated 2 out of 10 (20%)
2. Call `detectBehavioralPatterns({ userId, conferenceId })`
3. Assert `patterns` array contains `PASSIVE_NETWORKING`

**Expected Result**: Returns `{ patterns: ['PASSIVE_NETWORKING'], initiationRate: 0.20, threshold: 0.30 }`.

**Code Sample**:
```typescript
describe('BehavioralPatternDetector', () => {
  it('should detect PASSIVE_NETWORKING when initiation rate is below 30%', async () => {
    const interactions = buildInteractions({ total: 10, userInitiated: 2 });
    const detector = new BehavioralPatternDetector(mockInteractionRepo);
    const result = await detector.detectBehavioralPatterns({
      userId: 'user-42',
      interactions
    });

    expect(result.patterns).toContain('PASSIVE_NETWORKING');
    expect(result.initiationRate).toBeCloseTo(0.20, 2);
  });
});
```

---

#### TC-F4-U1.2: Session Overload Pattern Detection
**Objective**: Verify that attending more than 8 sessions per conference day triggers a SESSION_OVERLOAD pattern flag.

**Preconditions**:
- Session attendance records with timestamps

**Test Steps**:
1. Seed 10 sessions attended on a single conference day
2. Call `detectBehavioralPatterns({ userId, conferenceId })`
3. Assert `SESSION_OVERLOAD` pattern detected for that day

**Expected Result**: Returns pattern `SESSION_OVERLOAD`; `sessionsPerDay` = 10; threshold = 8.

**Code Sample**:
```typescript
it('should detect SESSION_OVERLOAD when user attends more than 8 sessions per day', async () => {
  const sessions = buildDailySessions({ date: '2026-07-15', count: 10 });
  const result = await detector.detectBehavioralPatterns({ userId: 'user-42', sessions });

  expect(result.patterns).toContain('SESSION_OVERLOAD');
  expect(result.sessionsPerDay['2026-07-15']).toBe(10);
});
```

---

#### TC-F4-U1.3: Note-Capture Gap Detection
**Objective**: Verify that sessions attended with no notes or transcript capture are flagged as NOTE_CAPTURE_GAPS.

**Test Steps**:
1. Seed 5 sessions for user; 3 have notes, 2 have neither notes nor transcript
2. Call `detectBehavioralPatterns({ userId, conferenceId })`
3. Assert 2 sessions returned in `noteCaptureGaps`

**Expected Result**: `patterns` includes `NOTE_CAPTURE_GAP`; `noteCaptureGaps` lists 2 session IDs.

**Code Sample**:
```typescript
it('should identify sessions with no notes or transcript as capture gaps', async () => {
  const sessions = [
    { id: 'sess-1', hasNotes: true, hasTranscript: true },
    { id: 'sess-2', hasNotes: false, hasTranscript: false },
    { id: 'sess-3', hasNotes: false, hasTranscript: false }
  ];
  const result = await detector.detectBehavioralPatterns({ userId: 'user-42', sessions });

  expect(result.noteCaptureGaps).toHaveLength(2);
  expect(result.patterns).toContain('NOTE_CAPTURE_GAP');
});
```

---

### 1.2 Coaching Insight Generation

#### TC-F4-U2.1: Coaching Insight From Detected Pattern
**Objective**: Verify that each detected pattern maps to a specific, actionable coaching insight with a recommended action.

**Preconditions**:
- Pattern `PASSIVE_NETWORKING` detected

**Test Steps**:
1. Call `generateCoachingInsights(['PASSIVE_NETWORKING'])`
2. Assert returned insight has `title`, `explanation`, `recommendedAction`, and `priority`

**Expected Result**: Returns insight with recommended action like "Aim to initiate at least 1 conversation per session block."

**Code Sample**:
```typescript
describe('CoachingInsightGenerator', () => {
  it('should generate actionable insight for PASSIVE_NETWORKING pattern', () => {
    const generator = new CoachingInsightGenerator(insightLibrary);
    const insights = generator.generateCoachingInsights(['PASSIVE_NETWORKING']);

    expect(insights.length).toBeGreaterThanOrEqual(1);
    expect(insights[0].title).toBeDefined();
    expect(insights[0].recommendedAction).toBeDefined();
    expect(insights[0].priority).toMatch(/HIGH|MEDIUM|LOW/);
  });
});
```

---

#### TC-F4-U2.2: Positive Reinforcement Insight Generation
**Objective**: Verify that strong performance patterns (high initiation rate, full note capture) generate positive reinforcement messages.

**Test Steps**:
1. Build pattern profile with initiationRate=0.75, noteCaptureRate=1.0, insightDensity=HIGH
2. Call `generateCoachingInsights(patterns)`
3. Assert at least one insight has `type: 'POSITIVE_REINFORCEMENT'`

**Expected Result**: Returns at least 1 positive insight congratulating the user on strong behaviors.

**Code Sample**:
```typescript
it('should generate positive reinforcement for high-performance patterns', () => {
  const generator = new CoachingInsightGenerator(insightLibrary);
  const insights = generator.generateCoachingInsights(['HIGH_INITIATION', 'FULL_CAPTURE']);

  const positive = insights.filter(i => i.type === 'POSITIVE_REINFORCEMENT');
  expect(positive.length).toBeGreaterThanOrEqual(1);
});
```

---

#### TC-F4-U2.3: Insight Deduplication Across Conferences
**Objective**: Verify that the same coaching insight is not surfaced more than once per 7-day period.

**Test Steps**:
1. Trigger insight generation for PASSIVE_NETWORKING today
2. Trigger same pattern detection 2 days later
3. Assert second generation returns `suppressed: true` for the same insight

**Expected Result**: Insight suppressed within 7-day cooldown window; `nextEligibleAt` timestamp returned.

**Code Sample**:
```typescript
it('should suppress duplicate insights within 7-day cooldown', async () => {
  const manager = new CoachingInsightManager(mockInsightRepo);
  await manager.recordInsightDelivery({ userId: 'user-42', insightKey: 'PASSIVE_NETWORKING' });

  const result = await manager.checkInsightEligibility({
    userId: 'user-42',
    insightKey: 'PASSIVE_NETWORKING',
    checkDate: addDays(new Date(), 2)
  });

  expect(result.suppressed).toBe(true);
  expect(result.nextEligibleAt).toBeDefined();
});
```

---

### 1.3 Coaching Plan Management

#### TC-F4-U3.1: Coaching Plan Creation From Pattern Profile
**Objective**: Verify that a coaching plan is generated with ordered action items when multiple patterns are detected.

**Test Steps**:
1. Detect patterns: `['PASSIVE_NETWORKING', 'NOTE_CAPTURE_GAP', 'SESSION_OVERLOAD']`
2. Call `createCoachingPlan({ userId, patterns })`
3. Assert plan has 3 action items sorted by priority

**Expected Result**: Returns `CoachingPlan` with 3 `ActionItem` objects, ordered HIGH → MEDIUM → LOW priority.

**Code Sample**:
```typescript
it('should create coaching plan with actions ordered by priority', async () => {
  const planner = new CoachingPlanBuilder(insightLibrary);
  const plan = await planner.createCoachingPlan({
    userId: 'user-42',
    patterns: ['PASSIVE_NETWORKING', 'NOTE_CAPTURE_GAP', 'SESSION_OVERLOAD']
  });

  expect(plan.actions.length).toBe(3);
  expect(plan.actions[0].priority).toBe('HIGH');
});
```

---

#### TC-F4-U3.2: Coaching Plan Progress Tracking
**Objective**: Verify that completing a coaching action item updates plan progress percentage correctly.

**Test Steps**:
1. Create plan with 3 actions
2. Mark 1 action as DONE
3. Assert plan progress = 33%

**Expected Result**: `plan.progress = 0.33`; completed action has `completedAt` timestamp.

**Code Sample**:
```typescript
it('should update coaching plan progress when action item is completed', async () => {
  const plan = await planner.createCoachingPlan({ userId: 'user-42', patterns: threePatterns });
  await planner.markActionComplete({ planId: plan.id, actionId: plan.actions[0].id });

  const updated = await planner.getCoachingPlan(plan.id);
  expect(updated.progress).toBeCloseTo(0.33, 2);
  expect(updated.actions[0].completedAt).toBeDefined();
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Post-Conference Coaching Trigger

#### TC-F4-I1.1: Coaching Report Generated on Conference Close
**Objective**: Verify that closing a conference triggers behavioral analysis and produces a coaching report stored for the user.

**Preconditions**:
- Conference with 3 days of sessions, interactions, and notes

**Test Steps**:
1. POST `/api/conferences/conf-2026/close`
2. Wait for behavioral analysis pipeline
3. GET `/api/users/user-42/coaching/reports?conferenceId=conf-2026`

**Expected Result**: Report returned with detected patterns, coaching insights, and recommended coaching plan; HTTP 200.

**Code Sample**:
```typescript
it('should generate a coaching report when a conference is closed', async () => {
  await request(app).post('/api/conferences/conf-2026/close').expect(202);
  await waitForCoachingPipeline('user-42', 'conf-2026', 8000);

  const res = await request(app)
    .get('/api/users/user-42/coaching/reports?conferenceId=conf-2026')
    .expect(200);

  expect(res.body.patterns.length).toBeGreaterThan(0);
  expect(res.body.insights.length).toBeGreaterThan(0);
  expect(res.body.plan).toBeDefined();
});
```

---

#### TC-F4-I1.2: In-Conference Behavioral Nudge
**Objective**: Verify that a real-time behavioral nudge is pushed to the user when a pattern is detected during an active conference.

**Test Steps**:
1. During an active conference, simulate 5 consecutive sessions with no interactions
2. Assert a nudge notification is dispatched to the user's device

**Expected Result**: Nudge notification content includes suggestion to start a conversation; `nudgeType: 'INTERACTION_GAP'`.

---

### 2.2 Coaching Insight Delivery

#### TC-F4-I2.1: Coaching Insight Delivered via In-App Notification
**Objective**: Verify that newly generated coaching insights are delivered as in-app notifications.

**Test Steps**:
1. Trigger coaching analysis generating 2 new insights
2. GET `/api/users/user-42/notifications?type=COACHING`
3. Assert 2 unread coaching notifications returned

**Expected Result**: 2 notifications present; each links to the coaching insight detail; status = 'UNREAD'.

---

#### TC-F4-I2.2: Coaching History Preserved Across Conferences
**Objective**: Verify that coaching history from prior conferences is accessible and correctly scoped.

**Test Steps**:
1. Create coaching reports for 3 separate conferences
2. GET `/api/users/user-42/coaching/history`
3. Assert 3 reports returned; each scoped to its conference

**Expected Result**: 3 coaching reports returned; ordered by conference date descending; distinct patterns per conference.

---

### 2.3 Coaching Plan Integration

#### TC-F4-I3.1: Coaching Action Linked to Calendar Block
**Objective**: Verify that a coaching action of type SCHEDULE_FOLLOW_UP creates a calendar placeholder when acknowledged by the user.

**Test Steps**:
1. Retrieve coaching action of type SCHEDULE_FOLLOW_UP
2. POST `/api/coaching/actions/{id}/acknowledge`
3. Assert calendar block created via calendar integration

**Expected Result**: Calendar event created; coaching action status = 'IN_PROGRESS'; `calendarEventId` linked.

---

#### TC-F4-I3.2: Cross-Conference Coaching Trend Report
**Objective**: Verify that the coaching trend endpoint shows improvement or regression in detected patterns across 5 conferences.

**Test Steps**:
1. GET `/api/users/user-42/coaching/trends?limit=5`
2. Assert response shows pattern frequency over time
3. Assert `PASSIVE_NETWORKING` frequency decreasing if user improved

**Expected Result**: Trend data includes per-conference pattern count; direction computed for each pattern.

---

## 3. EDGE CASE VALIDATION

### 3.1 Insufficient Data for Pattern Detection

#### TC-F3-E1.1 [sic TC-F4-E1.1]: Fewer Than 5 Interactions — No Pattern Flagged
**Objective**: Verify that pattern detection requires a minimum of 5 interactions and returns no patterns with fewer.

**Test Steps**:
1. Run pattern detection with only 3 interactions
2. Assert `patterns = []` and `reason: 'INSUFFICIENT_DATA'`

**Expected Result**: No false pattern flags; reason code returned explaining minimum data requirement.

---

#### TC-F4-E1.2: Single-Day Conference Pattern Handling
**Objective**: Verify that single-day conference patterns are not penalized under multi-day thresholds.

**Test Steps**:
1. Run pattern detection for a 1-day conference with 6 sessions
2. Assert SESSION_OVERLOAD not triggered (threshold adjusted to 1-day context)

**Expected Result**: SESSION_OVERLOAD not flagged for 1-day event with 6 sessions; threshold note in response.

---

### 3.2 Conflicting Patterns

#### TC-F4-E2.1: Conflicting Positive and Negative Patterns
**Objective**: Verify that when both a positive and negative pattern exist, insights are presented with balanced framing.

**Test Steps**:
1. Build profile with HIGH_INITIATION and NOTE_CAPTURE_GAP simultaneously
2. Generate coaching insights
3. Assert insights include both positive reinforcement and improvement recommendation

**Expected Result**: Balanced coaching report; positive insight presented first; no suppression of either type.

---

#### TC-F4-E2.2: No Patterns Detected — Affirmation Response
**Objective**: Verify that when no negative patterns are detected, the coaching response returns an affirmation message.

**Test Steps**:
1. Run pattern detection on a conference with no issues
2. Assert response includes `noNegativePatterns: true` and affirmation insight

**Expected Result**: Affirmation message generated; no coaching actions assigned; plan marked 'OPTIMAL'.

---

### 3.3 Coaching Plan Edge Cases

#### TC-F4-E3.1: Coaching Plan With Expired Actions
**Objective**: Verify that coaching actions past their suggested completion window are marked EXPIRED and removed from active plan.

**Test Steps**:
1. Create coaching plan with action due date = 30 days ago
2. Run plan maintenance job
3. Assert action status = 'EXPIRED'; plan progress unchanged

**Expected Result**: Action marked EXPIRED; user notified; plan progress not penalized.

---

#### TC-F4-E3.2: Re-Detection of a Previously Resolved Pattern
**Objective**: Verify that a pattern detected, resolved, and then re-detected generates a new insight with context about the regression.

**Test Steps**:
1. Mark PASSIVE_NETWORKING as resolved after coaching
2. Re-detect the same pattern in next conference
3. Assert new insight includes `isRegression: true` flag

**Expected Result**: New insight generated with regression context; priority escalated to HIGH.

---

## 4. PERFORMANCE VALIDATION

### 4.1 Pattern Detection Speed

#### TC-F4-P1.1: Pattern Detection Latency for Single Conference
**Objective**: Verify behavioral pattern detection for one conference completes within 3 seconds.

**Test Steps**:
1. Run detection on a 3-day conference with 30 sessions and 50 interactions
2. Assert completion < 3000ms

**Expected Result**: All patterns detected and insights generated within 3 seconds.

**Code Sample**:
```typescript
it('should detect all behavioral patterns within 3 seconds', async () => {
  const start = performance.now();
  await detector.detectBehavioralPatterns({ userId: 'user-42', conferenceId: 'conf-large' });
  const elapsed = performance.now() - start;

  expect(elapsed).toBeLessThan(3000);
}, 15000);
```

---

#### TC-F4-P1.2: Batch Pattern Detection for 25 Users
**Objective**: Verify that running behavioral detection for 25 users post-conference completes within 60 seconds.

**Test Steps**:
1. Trigger post-conference analysis for 25 users simultaneously
2. Assert all 25 coaching reports stored within 60 seconds

**Expected Result**: 100% completion rate; all reports stored within SLA.

---

### 4.2 Coaching Report Generation

#### TC-F4-P2.1: Coaching Report Generation Latency
**Objective**: Verify that generating a full coaching report (patterns + insights + plan) completes within 5 seconds.

**Test Steps**:
1. Trigger full coaching pipeline for one user/conference
2. Assert report available within 5 seconds

**Expected Result**: Report fully generated in < 5 seconds; all sections populated.

---

#### TC-F4-P2.2: Coaching Insight Library Lookup Performance
**Objective**: Verify that fetching matching coaching insights from the library for 10 detected patterns completes within 100ms.

**Test Steps**:
1. Build a 10-pattern profile
2. Call `insightLibrary.lookupInsights(patterns)`
3. Assert lookup completes in < 100ms

**Expected Result**: All matching insights returned in < 100ms; no N+1 query issue.

---

### 4.3 Historical Trend Performance

#### TC-F4-P3.1: Coaching Trend Query for 20 Conferences
**Objective**: Verify that computing coaching trends across 20 historical conferences returns within 500ms.

**Test Steps**:
1. Seed 20 conference coaching reports for user-42
2. GET `/api/users/user-42/coaching/trends?limit=20`
3. Assert response time < 500ms

**Expected Result**: Trend data for 20 conferences returned in < 500ms.

---

#### TC-F4-P3.2: Concurrent Coaching Report Reads
**Objective**: Verify that 50 simultaneous requests for coaching reports return within acceptable latency.

**Test Steps**:
1. Fire 50 concurrent GET requests for coaching reports (10 distinct users)
2. Assert p95 response time < 1000ms

**Expected Result**: All 50 requests succeed; p95 < 1 second; no DB connection pool exhaustion.

---

## Test Execution Summary

| Section | Suites | Test Cases |
|---------|--------|------------|
| Unit Tests | 3 | 9 |
| Integration Tests | 3 | 6 |
| Edge Case Validation | 3 | 6 |
| Performance Validation | 3 | 6 |
| **Total** | **12** | **27** |

**Estimated Execution Time**: ~10 minutes (unit: 2m, integration: 3m, edge: 2m, performance: 3m)
