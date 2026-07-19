# EPIC13 Feature 4 — Usage Analytics — Test Cases

## Test Overview
Comprehensive test suite for Usage Analytics covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 User Activity Metric Computation

#### TC-F4-U1.1: Daily Active User (DAU) Count Calculation
**Objective**: Verify DAU is computed correctly by counting unique authenticated users who performed at least one action in the day

**Preconditions**:
- Event store seeded with user activity events for the target date
- Some users active multiple times (duplicates must be deduplicated)

**Test Steps**:
1. Insert activity events for 1500 unique users on 2026-07-19, with 300 users having multiple events
2. Call `AnalyticsEngine.computeDAU('2026-07-19')`
3. Assert result = 1500 (unique count)
4. Insert events for 10 system/bot users flagged as `is_bot: true`
5. Assert DAU still = 1500 (bots excluded)

**Expected Result**: DAU reflects unique human users; duplicates and bots excluded

**Code Sample**:
```typescript
import { AnalyticsEngine } from '@platform/analytics';

describe('AnalyticsEngine — DAU Computation', () => {
  it('should compute DAU as unique human users with at least one event', async () => {
    const engine = new AnalyticsEngine(mockEventStore);

    // 1500 unique users, 300 with multiple events, 10 bots
    await seedActivityEvents({ uniqueHumans: 1500, repeats: 300, bots: 10, date: '2026-07-19' });

    const dau = await engine.computeDAU('2026-07-19');

    expect(dau).toBe(1500);
  });
});
```

---

#### TC-F4-U1.2: Monthly Active User (MAU) Rolling Window Calculation
**Objective**: Verify MAU uses a rolling 30-day window, not a calendar month, and correctly handles users active across window boundary

**Preconditions**:
- Event store populated with 90 days of user activity data

**Test Steps**:
1. Compute MAU as of 2026-07-19 (rolling 30 days: 2026-06-19 to 2026-07-19)
2. Identify users active only outside the window (before 2026-06-19)
3. Assert those users not included in MAU
4. Identify users active on both 2026-06-18 and 2026-06-20 — assert only counted once
5. Assert MAU is an integer count of unique user IDs in window

**Expected Result**: MAU rolling window logic correctly handles boundary users; no double-counting

**Code Sample**:
```typescript
it('should compute MAU using rolling 30-day window excluding out-of-window users', async () => {
  const engine = new AnalyticsEngine(mockEventStore);
  const asOfDate = new Date('2026-07-19');

  const mau = await engine.computeMAU(asOfDate);
  const windowStart = new Date('2026-06-19');

  // Verify a user only active before window is not counted
  const oldUser = await mockEventStore.getLastActivityDate('user-old-99');
  expect(oldUser < windowStart).toBe(true);

  const userIds = await engine.getMAUUserIds(asOfDate);
  expect(userIds).not.toContain('user-old-99');
  expect(mau).toBe(userIds.length);
});
```

---

#### TC-F4-U1.3: Feature Usage Frequency Ranking
**Objective**: Verify the feature usage ranker correctly orders features by usage frequency for a given time period

**Preconditions**:
- Event store with feature usage events: Transcription=5000, Search=3200, Export=1800, Tagging=900

**Test Steps**:
1. Call `AnalyticsEngine.rankFeaturesByUsage('2026-07-01', '2026-07-19')`
2. Assert returned ranking order: Transcription > Search > Export > Tagging
3. Assert each entry contains feature name, usage count, and percentage of total
4. Assert percentages sum to 100%

**Expected Result**: Feature ranking correctly reflects relative adoption; percentage distribution accurate

**Code Sample**:
```typescript
it('should rank features by usage count in descending order', async () => {
  const engine = new AnalyticsEngine(mockEventStore);
  const ranking = await engine.rankFeaturesByUsage('2026-07-01', '2026-07-19');

  expect(ranking[0].feature).toBe('Transcription');
  expect(ranking[0].count).toBe(5000);
  expect(ranking[0].percentage).toBeCloseTo(45.45, 1);

  const totalPercentage = ranking.reduce((sum, r) => sum + r.percentage, 0);
  expect(totalPercentage).toBeCloseTo(100, 1);
});
```

---

### 1.2 Retention and Cohort Analysis

#### TC-F4-U2.1: User Retention Cohort Construction
**Objective**: Verify cohort construction correctly groups users by their first-activity week

**Preconditions**:
- Users with first-activity dates spanning four consecutive weeks

**Test Steps**:
1. Call `CohortAnalyzer.buildWeeklyCohorts('2026-06-01', '2026-07-19')`
2. Assert each week's cohort contains only users whose first activity fell in that week
3. Assert no user appears in more than one cohort
4. Assert cohort sizes sum to total unique users in the period

**Expected Result**: Cohort assignment is correct and mutually exclusive; all users assigned exactly once

**Code Sample**:
```typescript
describe('CohortAnalyzer', () => {
  it('should assign each user to exactly one weekly cohort', async () => {
    const analyzer = new CohortAnalyzer(mockEventStore);
    const cohorts = await analyzer.buildWeeklyCohorts('2026-06-01', '2026-07-19');

    const allUserIds = cohorts.flatMap(c => c.userIds);
    const uniqueUserIds = new Set(allUserIds);

    // No duplicates across cohorts
    expect(allUserIds.length).toBe(uniqueUserIds.size);

    // Each cohort's users had first activity in that week
    for (const cohort of cohorts) {
      for (const userId of cohort.userIds) {
        const firstActivity = await mockEventStore.getFirstActivityDate(userId);
        expect(firstActivity >= cohort.weekStart).toBe(true);
        expect(firstActivity < cohort.weekEnd).toBe(true);
      }
    }
  });
});
```

---

#### TC-F4-U2.2: Week-N Retention Rate Calculation
**Objective**: Verify week-N retention rates are computed correctly (users active in week N / cohort size)

**Test Steps**:
1. Create a cohort of 1000 users from week 0
2. Record 350 of them as active in week 4
3. Compute retention for week 4
4. Assert retention rate = 0.35 (35%)
5. Assert users inactive in week 4 but active in week 3 not counted as retained

**Expected Result**: Retention rate uses strict week-N activity window; adjacent-week activity does not substitute

**Code Sample**:
```typescript
it('should compute week-4 retention as exact week-4 activity rate', async () => {
  const analyzer = new CohortAnalyzer(mockEventStore);
  await seedCohortData({ cohortSize: 1000, activeInWeek4: 350, activeInWeek3Only: 120 });

  const retention = await analyzer.getRetentionRate('cohort-2026-W25', 4);

  expect(retention.rate).toBeCloseTo(0.35, 3);
  expect(retention.activeUsers).toBe(350);
  expect(retention.cohortSize).toBe(1000);
});
```

---

#### TC-F4-U2.3: Stickiness Ratio (DAU/MAU) Computation
**Objective**: Verify the DAU/MAU stickiness ratio is correctly computed for a given date

**Test Steps**:
1. DAU for 2026-07-19 = 1200, MAU (rolling) = 8000
2. Call `analytics.getStickiness('2026-07-19')`
3. Assert stickiness = 0.15 (15%)
4. Assert the ratio is expressed as a decimal between 0 and 1

**Expected Result**: Stickiness correctly measures daily engagement relative to monthly active base

---

### 1.3 Analytics Event Tracking

#### TC-F4-U3.1: Event Deduplication Within 1-Second Window
**Objective**: Verify duplicate events (same user, same action, within 1 second) are deduplicated at ingestion

**Preconditions**:
- Event ingestion service with 1-second deduplication window

**Test Steps**:
1. Send three identical `TRANSCRIPTION_STARTED` events for user-123 within 800ms
2. Wait 2 seconds and send one more
3. Query event store for user-123 `TRANSCRIPTION_STARTED` events
4. Assert count = 2 (first burst deduplicated to 1; second after window = 1 more)

**Expected Result**: Deduplication prevents event inflation from client-side retries; post-window events accepted

**Code Sample**:
```typescript
it('should deduplicate rapid identical events within 1-second window', async () => {
  const ingestionService = new EventIngestionService(mockEventStore, {
    deduplicationWindowMs: 1000,
  });

  const eventPayload = { userId: 'user-123', action: 'TRANSCRIPTION_STARTED', sessionId: 'sess-1' };

  // Three rapid duplicates
  await ingestionService.ingest(eventPayload);
  await ingestionService.ingest(eventPayload);
  await ingestionService.ingest(eventPayload);

  await sleep(1200); // outside dedup window

  await ingestionService.ingest(eventPayload); // accepted as new

  const stored = await mockEventStore.getEvents({ userId: 'user-123', action: 'TRANSCRIPTION_STARTED' });
  expect(stored).toHaveLength(2);
});
```

---

#### TC-F4-U3.2: Analytics Event Schema Validation at Ingestion
**Objective**: Verify events missing required fields are rejected at ingestion with a descriptive validation error

**Test Steps**:
1. Attempt to ingest event missing `userId` field
2. Assert `ValidationError` thrown with field name
3. Attempt to ingest event with invalid `timestamp` (future timestamp > 5 minutes)
4. Assert rejection with clock-skew error
5. Assert neither event stored

**Expected Result**: Schema and sanity validation prevents corrupt events from polluting analytics store

---

#### TC-F4-U3.3: Anonymous vs Authenticated Event Attribution
**Objective**: Verify anonymous events are correctly attributed to a user after they authenticate (event stitching)

**Test Steps**:
1. Record three events with anonymous ID `anon-abc`
2. Record an `AUTHENTICATED` event linking `anon-abc` to `user-456`
3. Call `AnalyticsEngine.stitchAnonymousEvents('anon-abc', 'user-456')`
4. Assert all three prior events now attributed to `user-456`
5. Assert `anon-abc` ID no longer appears in event store

**Expected Result**: Pre-authentication activity correctly attributed to user after identity resolution

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Analytics Pipeline End-to-End

#### TC-F4-I1.1: User Action Flows Through Analytics Pipeline to Report
**Objective**: Verify a user action recorded in the mobile app is visible in the analytics report within the reporting SLA

**Preconditions**:
- Mobile capture service running with analytics event emission
- Analytics pipeline (Kafka → Flink → data warehouse) running

**Test Steps**:
1. Record a `CONFERENCE_SESSION_STARTED` event via the mobile capture API
2. Wait 5 minutes (pipeline ingestion SLA)
3. Query analytics report API for today's session start count
4. Assert count includes the just-recorded event

**Expected Result**: Event propagates from mobile API through streaming pipeline to queryable analytics within 5 minutes

**Code Sample**:
```typescript
it('should make mobile event visible in analytics within 5 minutes', async () => {
  const response = await mobileApi.post('/events', {
    userId: 'user-test-integration',
    action: 'CONFERENCE_SESSION_STARTED',
    timestamp: new Date().toISOString(),
    conferenceId: 'conf-int-test',
  });
  expect(response.status).toBe(202);

  await sleep(5 * 60 * 1000);

  const report = await analyticsApi.get('/reports/daily?date=today&metric=session_starts');
  expect(report.data.count).toBeGreaterThanOrEqual(1);
}, 360000);
```

---

#### TC-F4-I1.2: DAU/MAU Metrics Served by Analytics API Match Data Warehouse Values
**Objective**: Verify that DAU/MAU figures returned by the analytics API exactly match what is computed directly from the data warehouse

**Test Steps**:
1. Compute DAU and MAU directly via SQL query against the data warehouse
2. Fetch the same metrics from the analytics API
3. Assert API values match warehouse values exactly (no caching discrepancy)

**Expected Result**: Analytics API is a reliable proxy for the underlying warehouse; no stale cache served during report window

---

### 2.2 Multi-Tenant Analytics Isolation

#### TC-F4-I2.1: Tenant Usage Data Not Visible Across Tenant Boundary
**Objective**: Verify tenant A's analytics data cannot be retrieved by tenant B's admin user

**Test Steps**:
1. Generate usage events for tenant-A and tenant-B users
2. Authenticate as tenant-B admin
3. Request tenant-A DAU report
4. Assert 403 Forbidden or empty result with no tenant-A data
5. Assert tenant-B admin can retrieve tenant-B data correctly

**Expected Result**: Analytics data fully isolated by tenant; no cross-tenant data leakage

---

#### TC-F4-I2.2: Platform-Wide Aggregate Analytics Available to Super-Admins Only
**Objective**: Verify platform-wide aggregate metrics (total DAU across all tenants) are only accessible to super-admin role

**Test Steps**:
1. Authenticate as tenant-level admin; request platform aggregate
2. Assert 403 Forbidden
3. Authenticate as super-admin; request same endpoint
4. Assert 200 with aggregate data spanning all tenants

**Expected Result**: Platform-wide analytics protected by role gate; tenant admins restricted to own data

---

### 2.3 Reporting Integrations

#### TC-F4-I3.1: Analytics Report Export to CSV Matches API Data
**Objective**: Verify CSV export of a usage report contains the same data as the API JSON response

**Test Steps**:
1. Request JSON report for feature usage July 1–19, 2026
2. Request CSV export for the same period
3. Parse CSV and compare row-by-row with JSON data
4. Assert 100% match on feature names, counts, and percentages

**Expected Result**: Export and API responses share the same data layer; no export-specific rounding or truncation

**Code Sample**:
```typescript
it('should produce CSV export matching JSON API response', async () => {
  const jsonReport = await analyticsApi.get('/reports/feature-usage?from=2026-07-01&to=2026-07-19');
  const csvExport = await analyticsApi.get('/reports/feature-usage/export?format=csv&from=2026-07-01&to=2026-07-19');

  const parsedCsv = parseCSV(csvExport.data);

  for (const jsonRow of jsonReport.data.rows) {
    const csvRow = parsedCsv.find(r => r.feature === jsonRow.feature);
    expect(csvRow).toBeDefined();
    expect(Number(csvRow.count)).toBe(jsonRow.count);
    expect(Number(csvRow.percentage)).toBeCloseTo(jsonRow.percentage, 1);
  }
});
```

---

#### TC-F4-I3.2: Scheduled Weekly Analytics Email Contains Correct Metrics
**Objective**: Verify the weekly analytics digest email is generated with metrics matching the analytics API for the prior week

**Test Steps**:
1. Trigger weekly email digest generation for the week of July 13–19
2. Capture generated email content via mock email service
3. Parse DAU, MAU, and top feature from email body
4. Compare against analytics API for same period
5. Assert all three metrics match

**Expected Result**: Email digest uses same computation as API; no separately-computed figures

---

## 3. EDGE CASE VALIDATION

### 3.1 Timezone and Date Boundary Handling

#### TC-F4-E1.1: DAU Correctly Handles UTC Midnight Boundary
**Objective**: Verify events occurring near midnight UTC are attributed to the correct calendar day

**Test Steps**:
1. Record event for user-A at 23:59:59 UTC on July 18
2. Record event for user-B at 00:00:01 UTC on July 19
3. Compute DAU for July 18 — assert user-A included, user-B excluded
4. Compute DAU for July 19 — assert user-B included, user-A excluded

**Expected Result**: Day boundary attribution is strictly UTC-based; no off-by-one errors

**Code Sample**:
```typescript
it('should attribute midnight boundary events to correct UTC day', async () => {
  const engine = new AnalyticsEngine(mockEventStore);

  await mockEventStore.insert({ userId: 'user-a', timestamp: '2026-07-18T23:59:59.999Z', action: 'SEARCH' });
  await mockEventStore.insert({ userId: 'user-b', timestamp: '2026-07-19T00:00:00.001Z', action: 'SEARCH' });

  const dau18 = await engine.getDAUUserIds('2026-07-18');
  const dau19 = await engine.getDAUUserIds('2026-07-19');

  expect(dau18).toContain('user-a');
  expect(dau18).not.toContain('user-b');
  expect(dau19).toContain('user-b');
  expect(dau19).not.toContain('user-a');
});
```

---

#### TC-F4-E1.2: Analytics Handles Leap Year February Correctly
**Objective**: Verify MAU rolling window calculations correctly handle February 29 in leap years

**Test Steps**:
1. Compute MAU as of 2028-02-29 (2028 is a leap year)
2. Assert rolling window start = 2028-01-30 (30 days prior)
3. Assert users active between 2028-01-30 and 2028-02-29 included
4. Assert users active on 2028-01-29 excluded

**Expected Result**: Date arithmetic handles leap-year boundaries without off-by-one errors

---

### 3.2 Data Freshness and Staleness

#### TC-F4-E2.1: Analytics Report Indicates Data Staleness When Pipeline Delayed
**Objective**: Verify analytics reports include a `dataFreshness` field indicating when the underlying data was last updated

**Test Steps**:
1. Inject a 30-minute pipeline delay (simulate Kafka lag)
2. Request a DAU report
3. Assert response includes `dataFreshness.lastUpdatedAt` timestamp
4. Assert `dataFreshness.isStale: true` when lag exceeds 15 minutes
5. Assert a staleness warning is present in response metadata

**Expected Result**: Consumers of analytics API are informed of data freshness; no silent stale data served

---

#### TC-F4-E2.2: Backfill Does Not Double-Count Historical Metrics
**Objective**: Verify running a historical data backfill does not inflate past DAU/MAU figures

**Test Steps**:
1. Record baseline DAU for July 15 = 1000
2. Run a backfill job for July 15 to re-process raw events
3. Re-query DAU for July 15
4. Assert DAU still = 1000 (backfill is idempotent)

**Expected Result**: Backfill processing is idempotent; deduplication prevents metric inflation

---

### 3.3 Large Tenant Analytics

#### TC-F4-E3.1: Analytics for Tenant with 1 Million Users Completes Within SLA
**Objective**: Verify DAU computation for a tenant with 1 million registered users completes within 10 seconds

**Test Steps**:
1. Seed event store with 1 million unique users, 600,000 active on target date
2. Execute DAU computation
3. Assert result = 600,000
4. Assert computation time < 10 seconds

**Expected Result**: Analytics engine scales to enterprise tenants; no timeout on large user bases

---

#### TC-F4-E3.2: Feature Usage Report for 100+ Features Returns Complete Data
**Objective**: Verify feature usage ranking works correctly when more than 100 distinct feature types are tracked

**Test Steps**:
1. Seed usage events for 120 distinct feature keys
2. Request feature usage report
3. Assert all 120 features present in response
4. Assert ranking is correct (sorted by count descending)
5. Assert pagination metadata present (if paginated)

**Expected Result**: No feature usage data truncated; pagination handles large feature taxonomies

---

## 4. PERFORMANCE VALIDATION

### 4.1 Real-Time Analytics Query Performance

#### TC-F4-P1.1: DAU Query Response Time at 10M Events Per Day
**Objective**: Verify DAU computation API responds within 500ms when the event store contains 10 million events for the query date

**Preconditions**:
- Event store populated with 10 million activity events for target date
- Pre-aggregated DAU cache primed

**Test Steps**:
1. Send 50 concurrent DAU requests for the same date
2. Measure P99 response time
3. Assert P99 < 500ms
4. Assert all responses return consistent DAU value

**Expected Result**: Pre-aggregation ensures DAU queries are constant-time regardless of event volume

**Code Sample**:
```typescript
it('should return DAU within 500ms P99 for 10M event day', async () => {
  const results = await Promise.all(
    Array.from({ length: 50 }, () =>
      timedFetch(() => analyticsApi.get('/metrics/dau?date=2026-07-19'))
    )
  );

  const latencies = results.map(r => r.latencyMs);
  const p99 = percentile(latencies, 99);

  expect(p99).toBeLessThan(500);
  const uniqueValues = new Set(results.map(r => r.data.dau));
  expect(uniqueValues.size).toBe(1); // Consistent results
});
```

---

#### TC-F4-P1.2: Feature Usage Ranking for 90-Day Period at Scale
**Objective**: Verify feature usage ranking for a 90-day window returns within 3 seconds with 500M events in store

**Test Steps**:
1. Populate event store with 500M events spanning 90 days
2. Execute feature usage ranking for the full 90-day window
3. Assert response time < 3000ms
4. Assert result accuracy matches sampled validation set

**Expected Result**: Rollup materialized views make 90-day aggregations fast at scale

---

### 4.2 Cohort Analysis Performance

#### TC-F4-P2.1: Cohort Retention Matrix for 52 Weeks
**Objective**: Verify generating a full 52-week retention cohort matrix completes within 30 seconds

**Test Steps**:
1. Seed 1 year of user activity data (100k users, daily events)
2. Request full 52-week retention matrix
3. Measure generation time
4. Assert generation time < 30 seconds
5. Assert matrix contains 52 x 52 entries

**Expected Result**: Cohort matrix pre-computation strategy enables fast on-demand generation

**Code Sample**:
```typescript
it('should generate 52-week retention matrix within 30 seconds', async () => {
  const start = Date.now();
  const matrix = await cohortAnalyzer.buildRetentionMatrix({
    from: '2025-07-19',
    to: '2026-07-19',
    granularity: 'week',
  });
  const elapsed = Date.now() - start;

  expect(elapsed).toBeLessThan(30000);
  expect(matrix.rows).toHaveLength(52);
  expect(matrix.rows[0].retentionByWeek).toHaveLength(52);
}, 35000);
```

---

#### TC-F4-P2.2: Concurrent Cohort Queries from 20 Admin Users
**Objective**: Verify 20 concurrent cohort analysis requests are all satisfied within 10 seconds

**Test Steps**:
1. Simulate 20 admins sending distinct cohort analysis requests simultaneously
2. Measure time until all 20 responses received
3. Assert all complete within 10 seconds
4. Assert no 5xx errors

**Expected Result**: Concurrency-safe cohort computation; query parallelism isolated per request

---

### 4.3 Analytics Pipeline Throughput

#### TC-F4-P3.1: Event Ingestion Throughput — 1 Million Events Per Minute
**Objective**: Verify the analytics event ingestion pipeline sustains 1 million events per minute

**Test Steps**:
1. Run event generator at 1M events/minute for 5 minutes
2. After test, verify total events in store = 5M (± 1% loss tolerance)
3. Monitor Kafka consumer lag; assert stays below 30-second lag threshold

**Expected Result**: Analytics pipeline scales to support 50k DAU generating 20 events/user/day at peak

---

#### TC-F4-P3.2: Analytics Report Pre-Computation Job Completion Time
**Objective**: Verify the nightly pre-computation job for all standard analytics reports completes within 2 hours

**Test Steps**:
1. Trigger nightly pre-computation job with 90 days of data across 500 tenants
2. Monitor job completion
3. Assert all pre-computed report caches populated within 2 hours
4. Assert individual report queries now return from cache within 100ms

**Expected Result**: Pre-computation job fits within overnight maintenance window; morning analytics queries served instantly from cache

---

## Test Execution Summary

| Category | Test Suites | Test Cases |
|---|---|---|
| Unit Tests | 3 | 9 |
| Integration Tests | 3 | 6 |
| Edge Cases | 3 | 6 |
| Performance Validation | 3 | 6 |
| **Total** | **12** | **27** |

**Estimated Execution Time**: Unit ~2 min | Integration ~15 min | Edge ~8 min | Performance ~90 min
