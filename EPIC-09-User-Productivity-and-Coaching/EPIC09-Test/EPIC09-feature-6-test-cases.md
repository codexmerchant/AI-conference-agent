# EPIC09 Feature 6 — Time Allocation Analysis — Test Cases

## Test Overview
Comprehensive test suite for Time Allocation Analysis covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Time Block Classification

#### TC-F6-U1.1: Conference Time Block Categorization
**Objective**: Verify that all conference time is correctly categorized into blocks: SESSION_ATTENDANCE, NETWORKING, TRAVEL_TRANSIT, DOWNTIME, and UNTRACKED.

**Preconditions**:
- Conference schedule with session times and networking blocks
- User location/beacon data for transit detection
- Interaction log timestamps

**Test Steps**:
1. Load a 9-hour conference day with 4 sessions (5h), 2 networking blocks (1.5h), and gaps
2. Call `classifyTimeBlocks({ schedule, interactionLog, beaconEvents })`
3. Assert total allocated time sums to 9 hours

**Expected Result**: All time classified into categories; durations sum to 9 hours; no minute unaccounted.

**Code Sample**:
```typescript
describe('TimeBlockClassifier', () => {
  it('should classify all conference time into mutually exclusive blocks', async () => {
    const classifier = new TimeBlockClassifier(mockScheduleService, mockLocationService);
    const blocks = await classifier.classifyTimeBlocks({
      date: '2026-07-15',
      conferenceId: 'conf-2026',
      userId: 'user-42'
    });

    const totalMinutes = blocks.reduce((sum, b) => sum + b.durationMinutes, 0);
    expect(totalMinutes).toBe(540); // 9 hours
    const categories = blocks.map(b => b.category);
    expect(new Set(categories).size).toBeGreaterThan(1);
  });
});
```

---

#### TC-F6-U1.2: Session Attendance Duration Computation
**Objective**: Verify that the actual session attendance duration is computed from check-in/check-out signals, not the scheduled duration.

**Preconditions**:
- Session scheduled 09:00–10:00 (60 min)
- User checked in at 09:07 and left at 09:48

**Test Steps**:
1. Call `computeAttendanceDuration({ checkIn: '09:07', checkOut: '09:48', scheduledStart: '09:00', scheduledEnd: '10:00' })`
2. Assert actualDuration = 41 minutes
3. Assert attendanceRate = 41/60 = 0.683

**Expected Result**: Returns `{ actualDuration: 41, scheduledDuration: 60, attendanceRate: 0.683 }`.

**Code Sample**:
```typescript
it('should compute actual session attendance from check-in/out signals', () => {
  const analyzer = new AttendanceDurationAnalyzer();
  const result = analyzer.computeAttendanceDuration({
    checkIn: new Date('2026-07-15T09:07:00Z'),
    checkOut: new Date('2026-07-15T09:48:00Z'),
    scheduledStart: new Date('2026-07-15T09:00:00Z'),
    scheduledEnd: new Date('2026-07-15T10:00:00Z')
  });

  expect(result.actualDuration).toBe(41);
  expect(result.attendanceRate).toBeCloseTo(0.683, 2);
});
```

---

#### TC-F6-U1.3: Networking Block Utilization Scoring
**Objective**: Verify that networking block utilization is scored based on the number and quality of interactions during the block.

**Preconditions**:
- 30-minute networking block
- 3 interactions with quality scores 80, 65, 72

**Test Steps**:
1. Call `scoreNetworkingBlockUtilization({ blockDurationMinutes: 30, interactions })`
2. Assert utilization score considers both count and quality
3. Assert score reflects 3 interactions at high quality (score > 70)

**Expected Result**: Utilization score > 70; `interactionsPerHour` = 6.0; `avgInteractionQuality` ≈ 72.3.

**Code Sample**:
```typescript
it('should score networking block utilization from interaction count and quality', () => {
  const scorer = new NetworkingBlockScorer();
  const result = scorer.scoreNetworkingBlockUtilization({
    blockDurationMinutes: 30,
    interactions: [
      { qualityScore: 80 },
      { qualityScore: 65 },
      { qualityScore: 72 }
    ]
  });

  expect(result.score).toBeGreaterThan(70);
  expect(result.interactionsPerHour).toBeCloseTo(6.0, 1);
  expect(result.avgInteractionQuality).toBeCloseTo(72.3, 1);
});
```

---

### 1.2 Time Allocation Ratio Analysis

#### TC-F6-U2.1: Time Allocation Ratio Computation
**Objective**: Verify that the breakdown of conference time into allocation ratios is correctly computed and sums to 1.0.

**Test Steps**:
1. Provide time blocks: sessions=5h, networking=1.5h, travel=0.5h, downtime=2h
2. Call `computeAllocationRatios(timeBlocks)`
3. Assert ratios: sessions=0.556, networking=0.167, travel=0.056, downtime=0.222

**Expected Result**: All ratios in [0, 1]; sum = 1.0; each category present.

**Code Sample**:
```typescript
it('should compute time allocation ratios that sum to 1.0', () => {
  const analyzer = new TimeAllocationAnalyzer();
  const ratios = analyzer.computeAllocationRatios({
    SESSION_ATTENDANCE: 300,
    NETWORKING: 90,
    TRAVEL_TRANSIT: 30,
    DOWNTIME: 120
  });

  const total = Object.values(ratios).reduce((s, v) => s + v, 0);
  expect(total).toBeCloseTo(1.0, 3);
  expect(ratios.SESSION_ATTENDANCE).toBeCloseTo(0.556, 2);
});
```

---

#### TC-F6-U2.2: Target vs. Actual Time Allocation Comparison
**Objective**: Verify that deviation between target and actual time allocation is computed for each category.

**Preconditions**:
- User target: sessions=60%, networking=30%, downtime=10%
- Actual: sessions=70%, networking=15%, downtime=15%

**Test Steps**:
1. Call `compareAllocationToTarget({ actual, target })`
2. Assert deviation: sessions=+10%, networking=-15%, downtime=+5%

**Expected Result**: Returns `AllocationDeviationReport` with signed deviation per category; overallDeviation computed as RMSE.

**Code Sample**:
```typescript
it('should compute signed deviation between target and actual time allocation', () => {
  const analyzer = new TimeAllocationAnalyzer();
  const report = analyzer.compareAllocationToTarget({
    actual: { sessions: 0.70, networking: 0.15, downtime: 0.15 },
    target: { sessions: 0.60, networking: 0.30, downtime: 0.10 }
  });

  expect(report.deviations.sessions).toBeCloseTo(0.10, 2);
  expect(report.deviations.networking).toBeCloseTo(-0.15, 2);
  expect(report.deviations.downtime).toBeCloseTo(0.05, 2);
});
```

---

#### TC-F6-U2.3: Optimal Time Allocation Recommendation
**Objective**: Verify that the system generates a recommended time allocation adjustment based on the user's historical performance data.

**Test Steps**:
1. Provide 5 historical conferences with allocation ratios and resulting conference scores
2. Call `recommendOptimalAllocation({ history })`
3. Assert recommendation suggests the allocation pattern correlated with highest scores

**Expected Result**: Returns recommended ratios per category; correlation data included; confidence level stated.

**Code Sample**:
```typescript
it('should recommend time allocation based on historically high-scoring patterns', async () => {
  const advisor = new TimeAllocationAdvisor(mockHistoryRepo);
  const recommendation = await advisor.recommendOptimalAllocation({
    userId: 'user-42',
    history: conferenceHistoryWith5Records
  });

  expect(recommendation.ratios.networking).toBeGreaterThan(0);
  expect(recommendation.correlationScore).toBeGreaterThan(0.6);
  expect(recommendation.confidence).toMatch(/HIGH|MEDIUM|LOW/);
});
```

---

### 1.3 Daily Time Block Reporting

#### TC-F6-U3.1: Per-Day Time Block Summary
**Objective**: Verify that the per-day summary correctly aggregates time allocation for each conference day.

**Test Steps**:
1. Process a 3-day conference schedule
2. Call `getDailyTimeSummary({ conferenceId, userId })`
3. Assert 3 daily summaries returned, each with category breakdowns

**Expected Result**: Array of 3 `DayAllocationSummary` objects; each has total minutes and per-category breakdown.

**Code Sample**:
```typescript
it('should return per-day time allocation summaries for a 3-day conference', async () => {
  const analyzer = new TimeAllocationAnalyzer(mockScheduleRepo);
  const summaries = await analyzer.getDailyTimeSummary({
    conferenceId: 'conf-2026',
    userId: 'user-42'
  });

  expect(summaries.length).toBe(3);
  summaries.forEach(day => {
    expect(day.date).toBeDefined();
    expect(day.categories).toBeDefined();
    expect(Object.values(day.categories).reduce((s, v) => s + v, 0)).toBeGreaterThan(0);
  });
});
```

---

#### TC-F6-U3.2: Best-Day Identification
**Objective**: Verify that the day with the highest value allocation (session + networking time, excluding downtime) is correctly identified.

**Test Steps**:
1. Provide summaries for 3 days with different value allocations
2. Call `identifyBestDay(dailySummaries)`
3. Assert day 2 (highest value allocation) is returned

**Expected Result**: Returns `{ bestDay: 'day-2', valuableTimeMinutes: 420, reason: 'HIGH_NETWORKING_AND_SESSION' }`.

**Code Sample**:
```typescript
it('should identify the conference day with the highest value allocation', () => {
  const analyzer = new TimeAllocationAnalyzer(mockScheduleRepo);
  const best = analyzer.identifyBestDay([day1Summary, day2Summary, day3Summary]);

  expect(best.date).toBe('2026-07-16'); // day 2
  expect(best.valuableTimeMinutes).toBeGreaterThan(300);
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Time Analysis Pipeline

#### TC-F6-I1.1: Full Time Analysis on Conference Close
**Objective**: Verify that closing a conference triggers the time allocation analysis pipeline and produces a report.

**Preconditions**:
- 3-day conference with session check-in data, interaction log, and beacon events

**Test Steps**:
1. POST `/api/conferences/conf-2026/close`
2. Wait for time analysis pipeline
3. GET `/api/conferences/conf-2026/time-analysis?userId=user-42`

**Expected Result**: Time analysis report with daily summaries, overall ratios, target comparison, and recommendations; HTTP 200.

**Code Sample**:
```typescript
it('should produce time analysis report on conference close', async () => {
  await request(app).post('/api/conferences/conf-2026/close').expect(202);
  await waitForTimeAnalysis('user-42', 'conf-2026', 6000);

  const res = await request(app)
    .get('/api/conferences/conf-2026/time-analysis?userId=user-42')
    .expect(200);

  expect(res.body.dailySummaries.length).toBeGreaterThan(0);
  expect(res.body.overallRatios).toBeDefined();
  expect(res.body.targetComparison).toBeDefined();
});
```

---

#### TC-F6-I1.2: Calendar Integration Populates Time Blocks
**Objective**: Verify that syncing the user's calendar pre-populates session and networking time blocks automatically.

**Test Steps**:
1. Sync user calendar with 8 conference appointments
2. GET time block classification for the conference day
3. Assert 8 calendar-sourced blocks present

**Expected Result**: 8 time blocks imported from calendar; each tagged with `source: 'CALENDAR'`.

---

### 2.2 Real-Time Time Tracking

#### TC-F6-I2.1: Live Session Check-In Updates Time Block
**Objective**: Verify that a user checking into a session via the app updates the active time block classification in real time.

**Test Steps**:
1. POST `/api/sessions/sess-010/checkin` for user-42
2. GET `/api/users/user-42/time-blocks/active`
3. Assert active block = `{ category: 'SESSION_ATTENDANCE', sessionId: 'sess-010' }`

**Expected Result**: Active block updated immediately; previous block closed with correct duration.

---

#### TC-F6-I2.2: Downtime Detection From Beacon Inactivity
**Objective**: Verify that 15+ minutes of beacon inactivity (no session, no interaction) is classified as DOWNTIME.

**Test Steps**:
1. Simulate 20 minutes with no session check-in and no interactions
2. Query time block classifier
3. Assert 20-minute block classified as DOWNTIME

**Expected Result**: `{ category: 'DOWNTIME', durationMinutes: 20 }` in time block log.

---

### 2.3 Reporting and Recommendations

#### TC-F6-I3.1: Time Efficiency Score in Conference Report
**Objective**: Verify that the time efficiency score appears correctly in the overall conference productivity report.

**Test Steps**:
1. GET `/api/conferences/conf-2026/productivity-report?userId=user-42`
2. Assert report includes `timeEfficiencyScore` field
3. Assert score reflects ratio of high-value time to total conference time

**Expected Result**: `timeEfficiencyScore` in [0, 100]; reflects actual high-value allocation ratio.

---

#### TC-F6-I3.2: Target Allocation Configuration Persistence
**Objective**: Verify that a user's custom target time allocation is persisted and applied to all subsequent conference analyses.

**Test Steps**:
1. PUT `/api/users/user-42/time-allocation-targets` with { sessions: 0.55, networking: 0.35, downtime: 0.10 }
2. Trigger analysis for a new conference
3. Assert analysis uses saved targets for deviation computation

**Expected Result**: Custom targets applied; deviation computed against user-defined ratios; targets persisted in DB.

---

## 3. EDGE CASE VALIDATION

### 3.1 Missing Tracking Data

#### TC-F6-E1.1: Conference Day With No Check-in Data
**Objective**: Verify that a conference day with no session check-ins is classified entirely as UNTRACKED.

**Test Steps**:
1. Run time analysis for a day with no beacon events, no check-ins, no interactions
2. Assert entire day classified as UNTRACKED

**Expected Result**: Returns single UNTRACKED block for full day; user prompted to enable check-in tracking.

---

#### TC-F6-E1.2: Overlapping Session Blocks
**Objective**: Verify that if two sessions overlap in the schedule (scheduling error), the longer session takes precedence without crashing.

**Test Steps**:
1. Load schedule with sess-A (09:00–10:30) and sess-B (10:00–11:00) overlapping by 30 minutes
2. Run time block classifier
3. Assert blocks don't sum to more than actual elapsed time

**Expected Result**: Overlap detected; priority given to first session; overlap flagged in report; total minutes bounded by wall time.

---

### 3.2 Extreme Allocations

#### TC-F6-E2.1: 100% Session Attendance — No Networking Time
**Objective**: Verify the analysis handles a user who spent 100% of conference time in sessions with zero networking.

**Test Steps**:
1. Seed 9 hours of SESSION_ATTENDANCE, 0 minutes networking
2. Run allocation ratio computation
3. Assert networking ratio = 0; recommendation generated to rebalance

**Expected Result**: Ratios correct (sessions=1.0); recommendation generated: "Allocate time for networking"; no division by zero.

---

#### TC-F6-E2.2: Conference Shorter Than 1 Hour
**Objective**: Verify time analysis handles a conference that lasted less than 1 hour (e.g., a short workshop).

**Test Steps**:
1. Process a 45-minute conference
2. Assert per-category durations sum to 45 minutes
3. Assert time efficiency score computed correctly for short duration

**Expected Result**: All computations succeed for 45-minute window; efficiency score not penalized purely for brevity.

---

### 3.3 Timezone Edge Cases

#### TC-F6-E3.1: Multi-Timezone Conference Day
**Objective**: Verify that time blocks are correctly computed when the conference spans a timezone boundary (e.g., traveling attendee).

**Test Steps**:
1. Conference in EST (UTC-5); sessions start at 09:00 EST
2. User device in PST (UTC-8)
3. Assert time blocks use conference local time (EST) for classification

**Expected Result**: All blocks computed in conference timezone; display converted to user timezone; duration unaffected.

---

#### TC-F6-E3.2: Daylight Saving Time Transition During Conference
**Objective**: Verify that a conference day during DST transition does not produce a 23-hour or 25-hour day classification error.

**Test Steps**:
1. Process a conference day during DST spring-forward (clocks advance 1 hour at 02:00)
2. Assert total time blocks = 23 hours (actual elapsed)

**Expected Result**: Total = 23 hours; no negative-duration blocks; DST noted in metadata.

---

## 4. PERFORMANCE VALIDATION

### 4.1 Classification Speed

#### TC-F6-P1.1: Time Block Classification for 3-Day Conference
**Objective**: Verify that classifying time blocks for a full 3-day conference completes within 2 seconds.

**Test Steps**:
1. Load 3 days of schedule, check-in, beacon, and interaction data
2. Run classification
3. Assert completion < 2000ms

**Expected Result**: All time blocks classified in < 2 seconds; no unclassified gaps.

**Code Sample**:
```typescript
it('should classify 3-day conference time blocks within 2 seconds', async () => {
  const start = performance.now();
  await classifier.classifyAllTimeBlocks({
    conferenceId: 'conf-large',
    userId: 'user-42'
  });
  const elapsed = performance.now() - start;

  expect(elapsed).toBeLessThan(2000);
}, 10000);
```

---

#### TC-F6-P1.2: Batch Analysis for 50 Users
**Objective**: Verify that running time allocation analysis for 50 users concurrently completes within 30 seconds.

**Test Steps**:
1. Trigger post-conference time analysis for 50 users
2. Assert all 50 reports available within 30 seconds

**Expected Result**: 100% completion; all reports stored; no timeouts.

---

### 4.2 Aggregation Performance

#### TC-F6-P2.1: Allocation Ratio Computation Performance
**Objective**: Verify that computing allocation ratios from 1000 time block records completes within 100ms.

**Test Steps**:
1. Seed 1000 time block records for a conference
2. Call allocation ratio computation
3. Assert completion < 100ms

**Expected Result**: Ratios computed in < 100ms; accuracy verified against expected values.

---

#### TC-F6-P2.2: Historical Trend Aggregation for 20 Conferences
**Objective**: Verify that aggregating time allocation trends across 20 conferences completes within 500ms.

**Test Steps**:
1. Seed 20 conference time analysis records for user-42
2. GET `/api/users/user-42/time-allocation/trends`
3. Assert response time < 500ms

**Expected Result**: 20 trend data points returned in < 500ms; per-category trend direction computed.

---

### 4.3 Real-Time Tracking Performance

#### TC-F6-P3.1: Check-in Update Latency
**Objective**: Verify that processing a session check-in and updating the active time block completes within 500ms.

**Test Steps**:
1. POST a check-in event
2. Measure time until active block is updated
3. Assert < 500ms

**Expected Result**: Active block updated in < 500ms; previous block closed correctly.

---

#### TC-F6-P3.2: Concurrent Check-in Events From 100 Users
**Objective**: Verify the system handles 100 simultaneous check-in events at a conference keynote start without data corruption.

**Test Steps**:
1. Fire 100 concurrent check-in events for sess-keynote
2. Assert all 100 processed correctly; each user's block updated independently
3. Assert p99 processing time < 2000ms

**Expected Result**: All 100 check-ins processed; no cross-user data leakage; p99 < 2 seconds.

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
