# EPIC09 Feature 7 — Goal Tracking — Test Cases

## Test Overview
Comprehensive test suite for Goal Tracking covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 OKR Goal Definition and Validation

#### TC-F7-U1.1: Conference Goal Creation With OKR Structure
**Objective**: Verify that a conference goal is created with a valid OKR structure (Objective + Key Results) and persisted correctly.

**Preconditions**:
- User authenticated
- Conference exists and is not yet closed

**Test Steps**:
1. Call `createConferenceGoal({ userId, conferenceId, objective, keyResults })`
2. Assert returned goal has valid ID, `status: 'ACTIVE'`, and all key results stored
3. Assert each key result has `metric`, `targetValue`, `unit`, and `currentValue: 0`

**Expected Result**: Goal created with UUID; all key results initialized with currentValue = 0; `createdAt` timestamp set.

**Code Sample**:
```typescript
describe('ConferenceGoalManager', () => {
  it('should create an OKR-structured conference goal with initialized key results', async () => {
    const manager = new ConferenceGoalManager(mockGoalRepo);
    const goal = await manager.createConferenceGoal({
      userId: 'user-42',
      conferenceId: 'conf-2026',
      objective: 'Expand AI/ML network and validate product roadmap ideas',
      keyResults: [
        { metric: 'contacts_made', targetValue: 15, unit: 'contacts' },
        { metric: 'sessions_attended', targetValue: 10, unit: 'sessions' },
        { metric: 'follow_ups_sent', targetValue: 8, unit: 'follow_ups' }
      ]
    });

    expect(goal.id).toBeDefined();
    expect(goal.status).toBe('ACTIVE');
    expect(goal.keyResults.length).toBe(3);
    goal.keyResults.forEach(kr => expect(kr.currentValue).toBe(0));
  });
});
```

---

#### TC-F7-U1.2: Key Result Validation Rules
**Objective**: Verify that key results with invalid configurations (negative target, missing unit) are rejected with descriptive errors.

**Test Steps**:
1. Attempt to create a goal with `targetValue: -5`
2. Assert validation error returned: `INVALID_TARGET_VALUE`
3. Attempt with missing `unit`; assert error: `MISSING_UNIT`

**Expected Result**: Neither invalid key result is persisted; descriptive validation errors returned for each issue.

**Code Sample**:
```typescript
it('should reject key results with negative target values', async () => {
  const manager = new ConferenceGoalManager(mockGoalRepo);
  await expect(manager.createConferenceGoal({
    userId: 'user-42',
    conferenceId: 'conf-2026',
    objective: 'Test objective',
    keyResults: [{ metric: 'contacts', targetValue: -5, unit: 'contacts' }]
  })).rejects.toMatchObject({ code: 'INVALID_TARGET_VALUE' });
});
```

---

#### TC-F7-U1.3: Goal Template Application
**Objective**: Verify that a predefined goal template (e.g., "Standard Networking Goal") correctly populates key results with template defaults.

**Preconditions**:
- Goal template `STANDARD_NETWORKING` exists with 3 preset key results

**Test Steps**:
1. Call `createGoalFromTemplate({ userId, conferenceId, templateId: 'STANDARD_NETWORKING' })`
2. Assert 3 key results created with template-defined metrics and targets

**Expected Result**: Goal created; key results match template definition; user can override any value post-creation.

**Code Sample**:
```typescript
it('should create a goal from a predefined networking template', async () => {
  const manager = new ConferenceGoalManager(mockGoalRepo);
  const goal = await manager.createGoalFromTemplate({
    userId: 'user-42',
    conferenceId: 'conf-2026',
    templateId: 'STANDARD_NETWORKING'
  });

  expect(goal.keyResults.length).toBe(3);
  expect(goal.keyResults[0].metric).toBe('contacts_made');
  expect(goal.keyResults[0].targetValue).toBeGreaterThan(0);
});
```

---

### 1.2 Progress Tracking and Updates

#### TC-F7-U2.1: Key Result Progress Auto-Update From Interaction Data
**Objective**: Verify that adding a new interaction automatically increments the `contacts_made` key result for the active conference goal.

**Preconditions**:
- Active goal with `contacts_made` key result; currentValue = 7

**Test Steps**:
1. Create a new interaction (new contact) for the conference
2. Assert `contacts_made.currentValue` incremented to 8

**Expected Result**: Key result auto-updated; `lastUpdated` timestamp refreshed; goal progress percentage recomputed.

**Code Sample**:
```typescript
describe('GoalProgressTracker', () => {
  it('should auto-increment contacts_made when a new interaction is added', async () => {
    const tracker = new GoalProgressTracker(mockGoalRepo, mockEventBus);
    // Set up: goal with contacts_made currentValue = 7
    await tracker.handleInteractionCreated({ conferenceId: 'conf-2026', userId: 'user-42' });

    const goal = await mockGoalRepo.findActiveGoal('user-42', 'conf-2026');
    const contactsKR = goal.keyResults.find(kr => kr.metric === 'contacts_made');
    expect(contactsKR!.currentValue).toBe(8);
  });
});
```

---

#### TC-F7-U2.2: Goal Progress Percentage Computation
**Objective**: Verify that overall goal progress percentage is the average completion across all key results.

**Preconditions**:
- 3 key results: contacts_made=10/15 (67%), sessions=8/10 (80%), follow_ups=4/8 (50%)

**Test Steps**:
1. Call `computeGoalProgress(goal)`
2. Assert overall progress = (67+80+50)/3 = 65.7%

**Expected Result**: Returns `{ overallProgress: 0.657, keyResultProgress: [0.667, 0.80, 0.50] }`.

**Code Sample**:
```typescript
it('should compute overall goal progress as average of key result completions', () => {
  const tracker = new GoalProgressTracker(mockGoalRepo, mockEventBus);
  const progress = tracker.computeGoalProgress({
    keyResults: [
      { metric: 'contacts_made', currentValue: 10, targetValue: 15 },
      { metric: 'sessions_attended', currentValue: 8, targetValue: 10 },
      { metric: 'follow_ups_sent', currentValue: 4, targetValue: 8 }
    ]
  });

  expect(progress.overallProgress).toBeCloseTo(0.657, 2);
});
```

---

#### TC-F7-U2.3: Key Result Milestone Notification Trigger
**Objective**: Verify that reaching 50% and 100% of a key result target triggers a milestone notification.

**Test Steps**:
1. Update `contacts_made` from 7 to 8 (reaching 50% of target 15 — actually: update 7 to 8 on a target of 15 = 53%)
2. Simulate update from 0 to 8 on a target of 15 → 53% → triggers 50% milestone
3. Assert milestone notification queued with `milestone: '50_PERCENT'`

**Expected Result**: Notification queued at 50% and 100% thresholds; no duplicate notifications for the same milestone.

**Code Sample**:
```typescript
it('should trigger 50% milestone notification when key result reaches half target', async () => {
  const tracker = new GoalProgressTracker(mockGoalRepo, mockEventBus);
  await tracker.updateKeyResult({
    goalId: 'goal-001',
    metric: 'contacts_made',
    newValue: 8, // 8/15 = 53% → crosses 50% threshold
    previousValue: 6
  });

  expect(mockEventBus.emit).toHaveBeenCalledWith('GOAL_MILESTONE', expect.objectContaining({
    milestone: '50_PERCENT',
    metric: 'contacts_made'
  }));
});
```

---

### 1.3 Goal Completion and Assessment

#### TC-F7-U3.1: Goal Auto-Completion on 100% Achievement
**Objective**: Verify that a goal is automatically marked ACHIEVED when all key results reach 100% of their targets.

**Test Steps**:
1. Update all 3 key results to reach their targets
2. Assert goal status transitions to 'ACHIEVED'
3. Assert `achievedAt` timestamp set

**Expected Result**: `goal.status = 'ACHIEVED'`; `achievedAt` present; congratulatory event emitted.

**Code Sample**:
```typescript
it('should auto-complete a goal when all key results reach 100%', async () => {
  const tracker = new GoalProgressTracker(mockGoalRepo, mockEventBus);
  await tracker.updateKeyResult({ goalId: 'goal-001', metric: 'contacts_made', newValue: 15, previousValue: 14 });
  await tracker.updateKeyResult({ goalId: 'goal-001', metric: 'sessions_attended', newValue: 10, previousValue: 9 });
  await tracker.updateKeyResult({ goalId: 'goal-001', metric: 'follow_ups_sent', newValue: 8, previousValue: 7 });

  const goal = await mockGoalRepo.findById('goal-001');
  expect(goal.status).toBe('ACHIEVED');
  expect(goal.achievedAt).toBeDefined();
});
```

---

#### TC-F7-U3.2: Goal Assessment Report on Conference Close
**Objective**: Verify that closing a conference generates a goal assessment report with final progress for all key results.

**Test Steps**:
1. Close conference with partial goal completion (65% overall)
2. Call `assessGoalAtConferenceEnd({ goalId, conferenceId })`
3. Assert report includes final progress, unmet key results, and recommendations

**Expected Result**: Assessment report with `finalProgress: 0.65`; unmet key results listed; improvement suggestions provided.

**Code Sample**:
```typescript
it('should generate goal assessment report with partial completion details', async () => {
  const assessor = new GoalAssessor(mockGoalRepo);
  const report = await assessor.assessGoalAtConferenceEnd({
    goalId: 'goal-001',
    conferenceId: 'conf-2026'
  });

  expect(report.finalProgress).toBeCloseTo(0.65, 2);
  expect(report.unmetKeyResults.length).toBeGreaterThan(0);
  expect(report.suggestions.length).toBeGreaterThan(0);
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Goal Lifecycle Integration

#### TC-F7-I1.1: Full Goal Lifecycle From Creation to Assessment
**Objective**: Verify the complete goal lifecycle: create, auto-update during conference, and assess on close.

**Preconditions**:
- Conference active; user authenticated

**Test Steps**:
1. POST `/api/goals` to create goal
2. Simulate 5 interactions, 6 sessions, and 4 follow-ups during conference
3. POST `/api/conferences/conf-2026/close`
4. GET `/api/goals/{goalId}/assessment`

**Expected Result**: Goal assessment reflects actual activity counts; partial completion correctly calculated; suggestions present.

**Code Sample**:
```typescript
it('should track goal progress end-to-end through conference lifecycle', async () => {
  const goalRes = await request(app).post('/api/goals').send(goalPayload).expect(201);
  const goalId = goalRes.body.id;

  await simulateConferenceActivity({ interactions: 5, sessions: 6, followUps: 4 });
  await request(app).post('/api/conferences/conf-2026/close').expect(202);
  await waitForGoalAssessment(goalId, 5000);

  const assessment = await request(app).get(`/api/goals/${goalId}/assessment`).expect(200);
  expect(assessment.body.finalProgress).toBeGreaterThan(0);
  expect(assessment.body.unmetKeyResults).toBeDefined();
});
```

---

#### TC-F7-I1.2: Real-Time Goal Progress Widget Data
**Objective**: Verify that the in-app goal progress widget reflects real-time key result updates within 5 seconds of a triggering event.

**Test Steps**:
1. Create active goal with contacts_made KR at 6/15
2. Add a new interaction (triggering auto-increment)
3. Poll GET `/api/goals/{goalId}/progress` within 5 seconds
4. Assert contacts_made = 7

**Expected Result**: Progress endpoint shows 7/15 within 5 seconds; overall progress recalculated.

---

### 2.2 Multi-Conference Goal Tracking

#### TC-F7-I2.1: Annual Goal Spanning Multiple Conferences
**Objective**: Verify that an annual-level goal accumulates progress from multiple conferences throughout the year.

**Test Steps**:
1. Create annual goal: "Meet 100 AI engineers this year" across 5 planned conferences
2. Close 2 conferences with 25 and 30 relevant contacts respectively
3. GET annual goal progress
4. Assert `contacts_made.currentValue = 55`

**Expected Result**: Annual goal progress = 55/100 = 55%; conferences contributing listed; `contributingConferences` array present.

---

#### TC-F7-I2.2: Goal Carryover to Next Conference
**Objective**: Verify that an unfinished goal can be carried over and extended to the next conference with adjusted targets.

**Test Steps**:
1. Mark goal as `CARRIED_OVER` with new conference linked
2. Assert remaining targets adjusted (e.g., 8 contacts still needed)
3. Assert original goal status = 'CARRIED_OVER'

**Expected Result**: Carryover goal created with remaining targets; linked to new conference; original closed as CARRIED_OVER.

---

### 2.3 Goal Analytics

#### TC-F7-I3.1: Goal Achievement Rate Across All Conferences
**Objective**: Verify that the user's overall goal achievement rate is correctly computed across all historical goals.

**Test Steps**:
1. GET `/api/users/user-42/goals/analytics`
2. Assert response includes `totalGoals`, `achievedGoals`, `achievementRate`, `avgFinalProgress`

**Expected Result**: Achievement rate = achieved/total; avgFinalProgress computed across all goals including partial completions.

---

#### TC-F7-I3.2: Goal vs. Outcome Correlation
**Objective**: Verify that the analytics endpoint shows correlation between goal achievement rate and conference score for historical data.

**Test Steps**:
1. GET `/api/users/user-42/goals/analytics?includeOutcomeCorrelation=true`
2. Assert `outcomeCorrelation.goalAchievementVsScore` returned with correlation coefficient

**Expected Result**: Correlation coefficient in [-1, 1]; data points include both goal progress and conference score per event.

---

## 3. EDGE CASE VALIDATION

### 3.1 Zero-Progress Goals

#### TC-F7-E1.1: Conference With No Activity Against Goal
**Objective**: Verify that a goal where all key results remain at 0 produces an assessment without errors and includes a motivation insight.

**Test Steps**:
1. Close a conference where the user did not engage at all
2. Run goal assessment
3. Assert all KRs = 0; assessment status = 'NOT_STARTED'; suggestion generated

**Expected Result**: No division by zero; assessment returned with `finalProgress: 0`; actionable suggestion to pre-plan next conference.

---

#### TC-F7-E1.2: Goal Created After Conference Already Closed
**Objective**: Verify that attempting to create a goal for an already-closed conference is rejected with a clear error.

**Test Steps**:
1. Close conference conf-past
2. Attempt to POST a new goal for conf-past
3. Assert error `CONFERENCE_ALREADY_CLOSED`

**Expected Result**: Goal creation rejected; HTTP 422; error code `CONFERENCE_ALREADY_CLOSED`.

---

### 3.2 Target Exceeded

#### TC-F7-E2.1: Key Result Exceeding Target — Graceful Handling
**Objective**: Verify that a key result that exceeds its target (e.g., 20 contacts vs. target of 15) is capped at 100% for progress computation without error.

**Test Steps**:
1. Set contacts_made to 20 when target = 15
2. Compute goal progress
3. Assert KR progress capped at 1.0; no score above 100%

**Expected Result**: `contacts_made progress = 1.0`; surplus noted in `overachievement: 5`; overall progress capped at 1.0.

---

#### TC-F7-E2.2: Goal Achieved But Additional Events Keep Firing
**Objective**: Verify that further activity events after a goal is marked ACHIEVED do not re-open the goal or emit duplicate milestone notifications.

**Test Steps**:
1. Achieve all key results → goal ACHIEVED
2. Add another interaction (would increment contacts_made beyond target)
3. Assert goal remains ACHIEVED; no new milestone notifications

**Expected Result**: Goal status unchanged after achievement; activity still counted in raw metrics; no duplicate notifications.

---

### 3.3 Goal Conflicts and Overlaps

#### TC-F7-E3.1: Duplicate Goal for Same Conference
**Objective**: Verify that creating a second ACTIVE goal for the same conference (same userId + conferenceId) is rejected.

**Test Steps**:
1. Create goal G1 for conf-2026 (user-42)
2. Attempt to create goal G2 for the same conference
3. Assert error `DUPLICATE_ACTIVE_GOAL`

**Expected Result**: G2 rejected; HTTP 409; user prompted to edit G1 or deactivate it first.

---

#### TC-F7-E3.2: Key Result Metric Collision
**Objective**: Verify that a goal cannot have two key results with the same metric name.

**Test Steps**:
1. Attempt to create goal with two `contacts_made` key results
2. Assert validation error `DUPLICATE_METRIC`

**Expected Result**: Goal not created; HTTP 400; error lists duplicate metric name.

---

## 4. PERFORMANCE VALIDATION

### 4.1 Goal Update Speed

#### TC-F7-P1.1: Key Result Auto-Update Latency
**Objective**: Verify that an event-driven key result auto-update completes within 500ms of the triggering event.

**Test Steps**:
1. Add a new interaction for an active conference goal
2. Measure time from event publish to key result update
3. Assert < 500ms

**Expected Result**: Key result updated in < 500ms; event-to-update pipeline latency within SLA.

**Code Sample**:
```typescript
it('should auto-update key result within 500ms of triggering event', async () => {
  const start = performance.now();
  await eventBus.publish('INTERACTION_CREATED', { userId: 'user-42', conferenceId: 'conf-2026' });
  await waitForKeyResultUpdate('goal-001', 'contacts_made', 500);
  const elapsed = performance.now() - start;

  expect(elapsed).toBeLessThan(500);
}, 5000);
```

---

#### TC-F7-P1.2: Concurrent Key Result Updates — No Race Conditions
**Objective**: Verify that 10 concurrent interaction events update the contacts_made key result correctly without double-counting.

**Test Steps**:
1. Fire 10 concurrent INTERACTION_CREATED events
2. Assert contacts_made incremented by exactly 10

**Expected Result**: currentValue increases by exactly 10; no lost updates; no double increments (atomic update).

---

### 4.2 Progress Query Performance

#### TC-F7-P2.1: Goal Progress Endpoint Latency
**Objective**: Verify that the goal progress endpoint returns within 200ms including KR computation.

**Test Steps**:
1. GET `/api/goals/{goalId}/progress`
2. Assert response time < 200ms

**Expected Result**: Progress with all key results returned in < 200ms.

---

#### TC-F7-P2.2: Annual Goal Aggregation Performance
**Objective**: Verify that aggregating progress for an annual goal spanning 10 conferences returns within 500ms.

**Test Steps**:
1. Seed annual goal with activity across 10 conferences
2. GET annual goal progress
3. Assert response time < 500ms

**Expected Result**: Aggregated progress computed in < 500ms; all contributing conferences included.

---

### 4.3 Historical Analytics Performance

#### TC-F7-P3.1: Goal Analytics Query for 50 Historical Goals
**Objective**: Verify that the goal analytics endpoint processes 50 historical goals and returns metrics within 500ms.

**Test Steps**:
1. Seed 50 goal records (mix of ACHIEVED, PARTIAL, NOT_STARTED) for user-42
2. GET analytics endpoint
3. Assert response time < 500ms

**Expected Result**: achievementRate, avgFinalProgress, and count breakdown returned in < 500ms.

---

#### TC-F7-P3.2: Concurrent Goal Progress Reads for 100 Users
**Objective**: Verify that 100 simultaneous goal progress requests return within acceptable latency.

**Test Steps**:
1. Fire 100 concurrent GET goal progress requests (10 distinct users)
2. Assert p95 response time < 500ms

**Expected Result**: All 100 requests succeed; p95 < 500ms; no DB connection pool exhaustion.

---

## Test Execution Summary

| Section | Suites | Test Cases |
|---------|--------|------------|
| Unit Tests | 3 | 9 |
| Integration Tests | 3 | 6 |
| Edge Case Validation | 3 | 6 |
| Performance Validation | 3 | 6 |
| **Total** | **12** | **27** |

**Estimated Execution Time**: ~9 minutes (unit: 2m, integration: 3m, edge: 2m, performance: 2m)
