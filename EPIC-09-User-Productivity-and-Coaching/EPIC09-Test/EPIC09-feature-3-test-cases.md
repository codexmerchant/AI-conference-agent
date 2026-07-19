# EPIC09 Feature 3 — Follow-up Completion Tracking — Test Cases

## Test Overview
Comprehensive test suite for Follow-up Completion Tracking covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Follow-up Item Extraction

#### TC-F3-U1.1: Action Item Extraction From Transcript
**Objective**: Verify that follow-up action items (e.g., "I'll send you the whitepaper", "Let's schedule a call next week") are correctly extracted from a conversation transcript.

**Preconditions**:
- Transcript with 3 explicit follow-up commitments
- Action item extractor initialized with commitment pattern models

**Test Steps**:
1. Call `extractFollowUpItems(transcript)` on a transcript containing 3 commitments
2. Assert returned list contains exactly 3 items
3. Assert each item has `owner`, `action`, `dueDate` (estimated), and `confidence` fields

**Expected Result**: Returns 3 `FollowUpItem` objects with all required fields; confidence > 0.75 for explicit commitments.

**Code Sample**:
```typescript
describe('FollowUpItemExtractor', () => {
  it('should extract explicit follow-up commitments from transcript', async () => {
    const extractor = new FollowUpItemExtractor(mockNlpService);
    const transcript = buildTranscript([
      { speaker: 'A', text: "I'll send you our case study by Friday." },
      { speaker: 'B', text: "Let's schedule a 30-minute demo for next Tuesday." },
      { speaker: 'A', text: "Can you introduce me to your VP of Product?" }
    ]);

    const items = await extractor.extractFollowUpItems(transcript);

    expect(items.length).toBe(3);
    items.forEach(item => {
      expect(item.owner).toBeDefined();
      expect(item.action).toBeDefined();
      expect(item.confidence).toBeGreaterThan(0.75);
    });
  });
});
```

---

#### TC-F3-U1.2: Due Date Inference From Relative Time Expressions
**Objective**: Verify that relative time expressions ("next Friday", "in two weeks", "end of month") are correctly resolved to absolute dates.

**Preconditions**:
- Reference date: 2026-07-19 (Sunday)

**Test Steps**:
1. Pass text: "I'll follow up next Friday"
2. Call `inferDueDate(text, referenceDate)`
3. Assert returned date = 2026-07-24

**Expected Result**: Returns ISO date string "2026-07-24"; confidence flag "INFERRED".

**Code Sample**:
```typescript
it('should resolve "next Friday" relative to reference date', () => {
  const inferrer = new DueDateInferrer();
  const result = inferrer.inferDueDate('next Friday', new Date('2026-07-19'));

  expect(result.date).toBe('2026-07-24');
  expect(result.confidence).toBe('INFERRED');
});
```

---

#### TC-F3-U1.3: Follow-up Priority Assignment
**Objective**: Verify that follow-up items are assigned priority levels (HIGH, MEDIUM, LOW) based on commitment strength and contact seniority.

**Test Steps**:
1. Build a follow-up item where contact is a C-level executive and commitment language is strong ("I will definitely...")
2. Call `assignPriority(followUpItem, contactProfile)`
3. Assert priority = 'HIGH'

**Expected Result**: High-seniority contact + strong commitment language → priority HIGH; informal commitments with peers → MEDIUM.

**Code Sample**:
```typescript
it('should assign HIGH priority to C-level commitments with strong language', () => {
  const prioritizer = new FollowUpPrioritizer();
  const priority = prioritizer.assignPriority(
    { action: 'send whitepaper', commitmentStrength: 0.92 },
    { role: 'CEO', seniorityScore: 0.95 }
  );

  expect(priority).toBe('HIGH');
});
```

---

### 1.2 Reminder Trigger Engine

#### TC-F3-U2.1: Reminder Scheduled at Correct Offset
**Objective**: Verify that a reminder is scheduled N hours before the inferred due date based on priority rules.

**Preconditions**:
- HIGH priority: 48h before due date
- MEDIUM priority: 24h before due date

**Test Steps**:
1. Create a HIGH priority follow-up with due date 2026-07-25 09:00
2. Call `scheduleReminder(followUpItem)`
3. Assert reminder trigger time = 2026-07-23 09:00

**Expected Result**: Reminder enqueued at 2026-07-23 09:00; reminder payload contains follow-up action text and contact name.

**Code Sample**:
```typescript
it('should schedule HIGH priority reminder 48 hours before due date', async () => {
  const scheduler = new ReminderScheduler(mockQueueService, reminderConfig);
  const followUp = {
    id: 'fu-001',
    priority: 'HIGH',
    dueDate: new Date('2026-07-25T09:00:00Z'),
    action: 'Send case study to Alice'
  };

  const reminder = await scheduler.scheduleReminder(followUp);
  expect(reminder.triggerAt.toISOString()).toBe('2026-07-23T09:00:00.000Z');
});
```

---

#### TC-F3-U2.2: Escalating Reminder on Overdue Item
**Objective**: Verify that an overdue follow-up item triggers an escalating reminder with urgency flag.

**Test Steps**:
1. Set follow-up due date to 3 days in the past
2. Call `checkOverdueItems([followUpItem])`
3. Assert item status = 'OVERDUE' and escalation reminder queued

**Expected Result**: Item marked OVERDUE; escalation reminder fired; `daysOverdue` field = 3.

**Code Sample**:
```typescript
it('should escalate reminders for overdue follow-up items', async () => {
  const checker = new OverdueFollowUpChecker(mockQueueService);
  const item = { id: 'fu-002', dueDate: subDays(new Date(), 3), status: 'PENDING' };

  const result = await checker.checkOverdueItems([item]);
  expect(result[0].status).toBe('OVERDUE');
  expect(result[0].daysOverdue).toBe(3);
});
```

---

#### TC-F3-U2.3: Reminder Suppression on Completion
**Objective**: Verify that marking a follow-up as COMPLETE cancels any pending reminders.

**Test Steps**:
1. Schedule a reminder for follow-up fu-003
2. Mark fu-003 as COMPLETE
3. Assert the queued reminder is cancelled

**Expected Result**: `ReminderScheduler.cancelReminder(fu-003)` called; queue entry removed; no further notifications fired.

**Code Sample**:
```typescript
it('should cancel pending reminders when follow-up is completed', async () => {
  const scheduler = new ReminderScheduler(mockQueueService, reminderConfig);
  await scheduler.scheduleReminder(mockFollowUp);
  await scheduler.cancelReminder('fu-003');

  expect(mockQueueService.cancel).toHaveBeenCalledWith('reminder:fu-003');
  expect(mockQueueService.getPending('fu-003')).toBeNull();
});
```

---

### 1.3 Completion Rate Calculation

#### TC-F3-U3.1: Per-Conference Completion Rate
**Objective**: Verify that the completion rate for a conference is correctly calculated as completed / total follow-ups.

**Test Steps**:
1. Create 10 follow-ups for conf-2026: 7 COMPLETE, 3 PENDING
2. Call `computeCompletionRate({ conferenceId })`
3. Assert rate = 0.70

**Expected Result**: Returns `{ total: 10, completed: 7, rate: 0.70 }`.

**Code Sample**:
```typescript
it('should compute per-conference completion rate correctly', async () => {
  const tracker = new FollowUpTracker(mockFollowUpRepo);
  const rate = await tracker.computeCompletionRate({ conferenceId: 'conf-2026' });

  expect(rate.total).toBe(10);
  expect(rate.completed).toBe(7);
  expect(rate.rate).toBeCloseTo(0.70, 2);
});
```

---

#### TC-F3-U3.2: Rolling 90-Day Completion Trend
**Objective**: Verify that rolling completion rates across the past 90 days are computed correctly.

**Test Steps**:
1. Seed follow-ups across the past 90 days with known completion counts per week
2. Call `computeRollingCompletionTrend({ userId, days: 90 })`
3. Assert 13 weekly data points returned

**Expected Result**: Returns array of 13 `{ weekStartDate, completionRate }` objects ordered chronologically.

**Code Sample**:
```typescript
it('should return 13 weekly completion rate data points for 90-day window', async () => {
  const trend = await tracker.computeRollingCompletionTrend({ userId: 'user-42', days: 90 });

  expect(trend.length).toBe(13);
  trend.forEach(point => {
    expect(point.completionRate).toBeGreaterThanOrEqual(0);
    expect(point.completionRate).toBeLessThanOrEqual(1);
  });
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Follow-up Creation and Tracking

#### TC-F3-I1.1: Automatic Follow-up Creation on Interaction Record
**Objective**: Verify that completing an interaction analysis automatically creates follow-up items from extracted commitments.

**Preconditions**:
- Interaction record with transcript containing 2 explicit commitments

**Test Steps**:
1. POST `/api/interactions` to create interaction with transcript
2. Wait for analysis pipeline
3. GET `/api/interactions/{id}/follow-ups`

**Expected Result**: 2 follow-up items created automatically; each linked to interaction ID; status = 'PENDING'.

**Code Sample**:
```typescript
it('should auto-create follow-ups from analyzed interaction', async () => {
  const interactionRes = await request(app)
    .post('/api/interactions')
    .send({ transcriptId: 'tx-commitment-2', contactId: 'ct-01', conferenceId: 'conf-2026' })
    .expect(201);

  await waitForAnalysis(interactionRes.body.id, 5000);

  const followUps = await request(app)
    .get(`/api/interactions/${interactionRes.body.id}/follow-ups`)
    .expect(200);

  expect(followUps.body.length).toBe(2);
  followUps.body.forEach((fu: any) => expect(fu.status).toBe('PENDING'));
});
```

---

#### TC-F3-I1.2: Follow-up Completion via External Calendar Event
**Objective**: Verify that a calendar event matching a follow-up action (e.g., demo meeting) automatically marks the follow-up as COMPLETE.

**Test Steps**:
1. Create follow-up: "Schedule demo with Alice"
2. POST a calendar event via `/api/calendar/sync` for a meeting titled "Demo with Alice" on the expected date
3. Assert follow-up status = 'COMPLETE'

**Expected Result**: Follow-up auto-completed; `completedAt` timestamp set; notification triggered.

---

### 2.2 Reminder Delivery

#### TC-F3-I2.1: Push Notification Delivered for High-Priority Reminder
**Objective**: Verify that a HIGH priority follow-up reminder triggers a push notification 48 hours before due date.

**Test Steps**:
1. Create HIGH priority follow-up with due date = now + 48h
2. Trigger reminder scheduler
3. Assert push notification service called with correct payload

**Expected Result**: Notification sent with follow-up action text, contact name, and due date; delivery receipt recorded.

---

#### TC-F3-I2.2: Email Digest Includes Overdue Follow-ups
**Objective**: Verify that the weekly email digest includes all OVERDUE follow-up items for the user.

**Test Steps**:
1. Create 3 overdue follow-ups for user-42
2. Trigger weekly digest job
3. Assert email contains all 3 overdue items with action text and days overdue

**Expected Result**: Digest email generated with OVERDUE section listing all 3 items; email queued to user's address.

---

### 2.3 Analytics and Reporting

#### TC-F3-I3.1: Follow-up Completion Dashboard Data
**Objective**: Verify that the dashboard data endpoint returns completion metrics grouped by conference and time period.

**Test Steps**:
1. GET `/api/users/user-42/follow-ups/analytics?period=last30days`
2. Assert response includes `totalItems`, `completedItems`, `overdueItems`, and `completionRate`

**Expected Result**: Correct counts returned; completionRate = completedItems/totalItems; HTTP 200.

---

#### TC-F3-I3.2: Exportable Follow-up Report
**Objective**: Verify that requesting a CSV export of follow-up items produces a correctly formatted file.

**Test Steps**:
1. GET `/api/users/user-42/follow-ups/export?format=csv&conferenceId=conf-2026`
2. Assert Content-Type = `text/csv`
3. Assert CSV contains headers: Item, Contact, DueDate, Status, Priority

**Expected Result**: CSV file with correct headers and one row per follow-up; HTTP 200 with Content-Disposition header.

---

## 3. EDGE CASE VALIDATION

### 3.1 Ambiguous Commitments

#### TC-F3-E1.1: Soft Commitment Not Extracted as Follow-up
**Objective**: Verify that vague statements like "maybe we can chat sometime" are not extracted as follow-up items.

**Test Steps**:
1. Submit transcript containing only non-committal phrases
2. Call `extractFollowUpItems(transcript)`
3. Assert returned list is empty

**Expected Result**: Empty list returned; no spurious PENDING items created.

---

#### TC-F3-E1.2: Duplicate Follow-up Deduplication
**Objective**: Verify that if the same commitment is mentioned twice in a transcript, only one follow-up item is created.

**Test Steps**:
1. Build transcript where the same follow-up action is stated twice (beginning and end of conversation)
2. Assert only 1 follow-up item created

**Expected Result**: Deduplication applied; exactly 1 item; confidence averaged across both mentions.

---

### 3.2 Missing Context

#### TC-F3-E2.1: Follow-up With No Contact Linked
**Objective**: Verify that a follow-up created without a linked contact is still tracked but flagged as UNLINKED.

**Test Steps**:
1. Extract follow-up from unidentified speaker transcript
2. Assert item is stored with `contactId: null` and `flags: ['UNLINKED']`

**Expected Result**: Item stored; `UNLINKED` flag present; user prompted to link contact manually.

---

#### TC-F3-E2.2: No Due Date Inferrable
**Objective**: Verify that if no due date can be inferred, the follow-up is created with `dueDate: null` and a default reminder at 7 days.

**Test Steps**:
1. Extract follow-up with commitment: "I'll send this over at some point"
2. Assert `dueDate = null`
3. Assert default reminder scheduled for 7 days from extraction

**Expected Result**: Item created; dueDate null; 7-day default reminder enqueued.

---

### 3.3 Completion Edge Cases

#### TC-F3-E3.1: Completing an Already-Completed Follow-up
**Objective**: Verify that attempting to mark an already-COMPLETE follow-up as complete is idempotent.

**Test Steps**:
1. Mark follow-up fu-010 as COMPLETE
2. Mark fu-010 as COMPLETE again
3. Assert only one `completedAt` timestamp; HTTP 200 (not 409)

**Expected Result**: Second completion request is idempotent; no duplicate history record created.

---

#### TC-F3-E3.2: Completion Rate With Zero Follow-ups
**Objective**: Verify completion rate calculation does not divide by zero when no follow-ups exist.

**Test Steps**:
1. Query completion rate for a conference with 0 follow-ups
2. Assert rate = null (not NaN or error)

**Expected Result**: Returns `{ total: 0, completed: 0, rate: null, reason: 'NO_FOLLOW_UPS' }`.

---

## 4. PERFORMANCE VALIDATION

### 4.1 Extraction Throughput

#### TC-F3-P1.1: Follow-up Extraction Latency
**Objective**: Verify that extracting follow-ups from a 15-minute transcript completes within 2 seconds.

**Test Steps**:
1. Load 15-minute transcript (~2200 words)
2. Call `extractFollowUpItems(transcript)`
3. Assert completion < 2000ms

**Expected Result**: Items extracted in < 2000ms; all explicit commitments captured.

**Code Sample**:
```typescript
it('should extract follow-ups from a 15-minute transcript within 2 seconds', async () => {
  const transcript = generateTranscript({ durationMinutes: 15 });
  const start = performance.now();
  await extractor.extractFollowUpItems(transcript);
  const elapsed = performance.now() - start;

  expect(elapsed).toBeLessThan(2000);
}, 10000);
```

---

#### TC-F3-P1.2: Batch Follow-up Extraction for 50 Interactions
**Objective**: Verify batch extraction across 50 interactions completes within 30 seconds.

**Test Steps**:
1. Queue 50 transcripts for batch extraction
2. Assert all follow-up lists returned within 30 seconds
3. Assert extraction failure rate < 1%

**Expected Result**: 50 extractions complete in < 30s; >= 49 successful; total follow-up items stored.

---

### 4.2 Reminder Scheduler Performance

#### TC-F3-P2.1: Scheduling 1000 Reminders
**Objective**: Verify that enqueuing 1000 follow-up reminders completes within 5 seconds.

**Test Steps**:
1. Generate 1000 follow-up items with due dates spread across the next 30 days
2. Call batch scheduler
3. Assert all 1000 reminders enqueued within 5 seconds

**Expected Result**: 1000 reminders queued in < 5 seconds; no queue overflow errors.

---

#### TC-F3-P2.2: Overdue Check Job Performance
**Objective**: Verify that the daily overdue check job processes 10,000 follow-up items within 10 seconds.

**Test Steps**:
1. Seed 10,000 PENDING follow-up records with mixed due dates
2. Run overdue check job
3. Assert all records evaluated and OVERDUE items flagged within 10 seconds

**Expected Result**: Job completes in < 10 seconds; correct OVERDUE count matches seeded data.

---

### 4.3 Query and Reporting Performance

#### TC-F3-P3.1: Follow-up List Query Latency
**Objective**: Verify that listing a user's follow-ups with pagination returns within 200ms.

**Test Steps**:
1. Seed 500 follow-up items for user-42
2. GET `/api/users/user-42/follow-ups?page=1&limit=50`
3. Assert response time < 200ms

**Expected Result**: 50 records returned in < 200ms; correct pagination metadata.

---

#### TC-F3-P3.2: Completion Rate Aggregation at Scale
**Objective**: Verify that computing completion rate across 5000 follow-up items for a user returns within 500ms.

**Test Steps**:
1. Seed 5000 follow-up records for user-42 across 50 conferences
2. Query rolling 90-day completion trend
3. Assert response time < 500ms

**Expected Result**: Trend computed in < 500ms; 13 weekly data points returned correctly.

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
