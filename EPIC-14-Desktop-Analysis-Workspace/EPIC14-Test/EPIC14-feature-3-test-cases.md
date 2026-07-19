# EPIC14 Feature 3 — Conference Intelligence Dashboard — Test Cases

## Test Overview
Comprehensive test suite for Conference Intelligence Dashboard covering unit tests, integration tests, edge cases, and performance validation. This feature provides Mac desktop users with a real-time analytics overview of conference activity including topic trends, speaker statistics, sentiment analysis summaries, and actionable follow-up signals.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Metric Computation

#### TC-F3-U1.1: Top Topics Ranking Algorithm
**Objective**: Verify that topic ranking correctly sorts topics by weighted mention score descending.

**Preconditions**:
- `TopicRanker` initialized with session topic data from SQLite

**Test Steps**:
1. Provide 10 topics with varying mention counts and recency weights
2. Call `ranker.getTopTopics(5)`
3. Assert returned array length = 5
4. Confirm descending `score` order

**Expected Result**: Top 5 topics returned sorted by score; no ties broken arbitrarily (stable sort by `name` for equal scores).

**Code Sample**:
```typescript
import { TopicRanker } from '../src/main/analytics/TopicRanker';

describe('TopicRanker', () => {
  it('should return top 5 topics in descending score order', () => {
    const topics = [
      { name: 'AI', mentions: 50, recencyWeight: 0.9 },
      { name: 'Cloud', mentions: 30, recencyWeight: 0.8 },
      { name: 'Security', mentions: 20, recencyWeight: 1.0 },
      { name: 'DevOps', mentions: 45, recencyWeight: 0.7 },
      { name: 'ML', mentions: 60, recencyWeight: 0.6 },
      { name: 'Data', mentions: 15, recencyWeight: 0.95 },
      { name: 'UX', mentions: 10, recencyWeight: 0.5 },
      { name: 'Mobile', mentions: 25, recencyWeight: 0.85 },
      { name: 'API', mentions: 35, recencyWeight: 0.75 },
      { name: 'Infra', mentions: 5, recencyWeight: 0.6 },
    ];
    const ranker = new TopicRanker(topics);
    const top5 = ranker.getTopTopics(5);

    expect(top5).toHaveLength(5);
    for (let i = 1; i < top5.length; i++) {
      expect(top5[i].score).toBeLessThanOrEqual(top5[i - 1].score);
    }
  });
});
```

---

#### TC-F3-U1.2: Sentiment Aggregation Across Sessions
**Objective**: Verify that the sentiment aggregator computes a correct weighted average sentiment score from per-session scores.

**Preconditions**:
- 5 sessions with known sentiment scores and segment counts

**Test Steps**:
1. Pass session array to `SentimentAggregator.aggregate(sessions)`
2. Assert returned `overall` score equals weighted mean
3. Assert `positive`, `neutral`, `negative` proportions sum to 1.0

**Expected Result**: Overall score mathematically correct; proportions sum to 1.0 (± 0.001 for float rounding).

**Code Sample**:
```typescript
import { SentimentAggregator } from '../src/main/analytics/SentimentAggregator';

it('should compute weighted average sentiment', () => {
  const sessions = [
    { sentimentScore: 0.8, segmentCount: 100 },
    { sentimentScore: 0.4, segmentCount: 50 },
    { sentimentScore: 0.6, segmentCount: 150 },
  ];
  const result = SentimentAggregator.aggregate(sessions);

  // Weighted: (0.8*100 + 0.4*50 + 0.6*150) / 300 = (80+20+90)/300 = 0.633...
  expect(result.overall).toBeCloseTo(0.633, 2);
  expect(result.positive + result.neutral + result.negative).toBeCloseTo(1.0, 3);
});
```

---

#### TC-F3-U1.3: Active Session Count Calculation
**Objective**: Verify active session count correctly counts sessions within the active conference window.

**Preconditions**:
- Conference window: `2026-07-15T09:00:00Z` to `2026-07-15T18:00:00Z`
- 8 sessions in DB; 3 overlap the window; 5 are outside

**Test Steps**:
1. Call `DashboardMetrics.activeSessionCount(conferenceWindow)`
2. Assert result = 3

**Expected Result**: Count = 3; only sessions with `start_time` within window counted.

**Code Sample**:
```typescript
it('should count only sessions within conference window', () => {
  const window = { start: new Date('2026-07-15T09:00:00Z'), end: new Date('2026-07-15T18:00:00Z') };
  const count = DashboardMetrics.activeSessionCount(allSessions, window);
  expect(count).toBe(3);
});
```

---

### 1.2 Dashboard Widget State Management

#### TC-F3-U2.1: Widget Layout Persistence to SQLite
**Objective**: Verify that saving a widget layout persists positions and sizes to the `dashboard_layouts` table.

**Preconditions**:
- `LayoutManager` initialized with writable DB

**Test Steps**:
1. Set layout with 4 widgets at defined positions
2. Call `layoutManager.save('default')`
3. Query DB directly
4. Assert row exists with correct JSON payload

**Expected Result**: `dashboard_layouts` row exists for key `'default'`; `config` column contains valid JSON with 4 widgets.

**Code Sample**:
```typescript
it('should persist widget layout to SQLite', () => {
  const layout = [
    { id: 'topic-trends', x: 0, y: 0, w: 6, h: 4 },
    { id: 'sentiment', x: 6, y: 0, w: 6, h: 4 },
    { id: 'active-sessions', x: 0, y: 4, w: 4, h: 3 },
    { id: 'follow-ups', x: 4, y: 4, w: 8, h: 3 },
  ];
  layoutManager.save('default', layout);

  const row = testDb.prepare('SELECT config FROM dashboard_layouts WHERE key = ?').get('default');
  expect(row).toBeDefined();
  const parsed = JSON.parse(row.config);
  expect(parsed).toHaveLength(4);
});
```

---

#### TC-F3-U2.2: Widget Refresh Interval Triggers Data Reload
**Objective**: Verify that the refresh ticker calls `fetchMetrics` at the configured interval.

**Test Steps**:
1. Configure `DashboardRefreshController` with 30-second interval
2. Advance fake timers by 90 seconds
3. Assert `fetchMetrics` called exactly 3 times

**Expected Result**: Mock `fetchMetrics` invoked 3 times within 90s.

**Code Sample**:
```typescript
it('should invoke fetchMetrics at configured interval', () => {
  jest.useFakeTimers();
  const fetchMetrics = jest.fn();
  const ctrl = new DashboardRefreshController({ intervalMs: 30000, onRefresh: fetchMetrics });
  ctrl.start();

  jest.advanceTimersByTime(90000);
  expect(fetchMetrics).toHaveBeenCalledTimes(3);
  ctrl.stop();
  jest.useRealTimers();
});
```

---

#### TC-F3-U2.3: Metric Cache Invalidation on New Session
**Objective**: Verify that adding a new session clears the metric cache and forces a re-fetch on next read.

**Test Steps**:
1. Prime cache by calling `metricsCache.get('topTopics')`
2. Emit `session:created` event
3. Call `metricsCache.get('topTopics')` again
4. Assert `fetchMetrics` was called a second time

**Expected Result**: Cache miss after invalidation; `fetchMetrics` called twice total.

**Code Sample**:
```typescript
it('should invalidate cache on session:created event', async () => {
  const spy = jest.spyOn(metricsService, 'fetchMetrics');
  await metricsCache.get('topTopics');
  emitter.emit('session:created', { id: 'ses-new' });
  await metricsCache.get('topTopics');
  expect(spy).toHaveBeenCalledTimes(2);
});
```

---

### 1.3 Chart Data Formatting

#### TC-F3-U3.1: Time-Series Data Formatted for Line Chart
**Objective**: Verify `ChartDataFormatter.toTimeSeries` produces correctly bucketed data points for a 24-hour window.

**Test Steps**:
1. Provide 72 raw events across 24 hours
2. Call `formatter.toTimeSeries(events, { bucketMinutes: 60 })`
3. Assert 24 data points returned
4. Assert each point has `timestamp` and `value` fields

**Expected Result**: Exactly 24 buckets; timestamps 1 hour apart; `value` is sum of events in each bucket.

**Code Sample**:
```typescript
it('should bucket 72 events into 24 hourly data points', () => {
  const formatter = new ChartDataFormatter();
  const points = formatter.toTimeSeries(rawEvents72, { bucketMinutes: 60 });

  expect(points).toHaveLength(24);
  points.forEach(p => {
    expect(p.timestamp).toBeInstanceOf(Date);
    expect(typeof p.value).toBe('number');
    expect(p.value).toBeGreaterThanOrEqual(0);
  });
});
```

---

#### TC-F3-U3.2: Donut Chart Data for Sentiment Proportions
**Objective**: Verify the donut chart data generator produces three correctly-labelled slices summing to 100%.

**Test Steps**:
1. Pass `{ positive: 0.55, neutral: 0.30, negative: 0.15 }` to `toDonutData()`
2. Assert 3 slices with correct labels and values
3. Assert sum of `value` fields = 100

**Expected Result**: Slices labelled `'Positive'`, `'Neutral'`, `'Negative'`; values 55, 30, 15; sum = 100.

**Code Sample**:
```typescript
it('should generate three sentiment slices summing to 100', () => {
  const slices = ChartDataFormatter.toDonutData({ positive: 0.55, neutral: 0.30, negative: 0.15 });
  expect(slices).toHaveLength(3);
  expect(slices.find(s => s.label === 'Positive')!.value).toBe(55);
  expect(slices.reduce((sum, s) => sum + s.value, 0)).toBe(100);
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Dashboard Data Pipeline

#### TC-F3-I1.1: Dashboard Widgets Populate with Live DB Data on Open
**Objective**: Verify all dashboard widgets display non-zero data within 3 seconds of window open.

**Preconditions**:
- SQLite DB has 5 sessions, 200 segments, 20 topics

**Test Steps**:
1. Open `DashboardWindow`
2. Wait 3 seconds
3. Assert topic trends widget shows at least 1 topic bar
4. Assert sentiment widget shows donut chart with data
5. Assert session count badge shows > 0

**Expected Result**: All widgets populated; no `—` or `N/A` placeholder values; no loading spinners after 3s.

**Code Sample**:
```typescript
it('should populate all dashboard widgets with real data', async () => {
  const win = await createTestWindow('/dashboard');
  await new Promise(r => setTimeout(r, 3000));

  const topicCount = await win.webContents.executeJavaScript(`
    document.querySelectorAll('[data-testid="topic-bar"]').length
  `);
  expect(topicCount).toBeGreaterThan(0);

  const sessionCount = await win.webContents.executeJavaScript(`
    +document.querySelector('[data-testid="session-count"]')?.textContent
  `);
  expect(sessionCount).toBeGreaterThan(0);
});
```

---

#### TC-F3-I1.2: Dashboard Reflects New Session Added in Real Time
**Objective**: Verify that inserting a new session into DB triggers a dashboard refresh without user action.

**Test Steps**:
1. Note current session count on dashboard
2. Insert new session into `sessions` table
3. Emit `session:created` IPC event
4. Wait 2 seconds
5. Assert session count incremented by 1

**Expected Result**: Session count widget updates within 2 seconds; no manual refresh required.

**Code Sample**:
```typescript
it('should auto-refresh session count on new session', async () => {
  const before = await getSessionCountFromDashboard(win);
  insertSession('ses-new');
  await win.webContents.send('session:created', { id: 'ses-new' });
  await new Promise(r => setTimeout(r, 2000));
  const after = await getSessionCountFromDashboard(win);
  expect(after).toBe(before + 1);
});
```

---

### 2.2 Widget Interaction

#### TC-F3-I2.1: Topic Bar Click Navigates to Transcript Search
**Objective**: Verify clicking a topic bar in the trends widget opens the Search Workspace pre-populated with that topic.

**Test Steps**:
1. Click the `'AI'` topic bar in the trends widget
2. Assert a new `SearchWorkspace` window opens
3. Assert search input is pre-filled with `'AI'`

**Expected Result**: Search window opens; input field contains `'AI'`; results start loading.

**Code Sample**:
```typescript
it('should open search workspace pre-filled on topic click', async () => {
  await win.webContents.executeJavaScript(`
    document.querySelector('[data-topic="AI"]').click();
  `);
  await new Promise(r => setTimeout(r, 500));

  const searchQuery = await win.webContents.executeJavaScript(`
    document.querySelector('[data-testid="search-input"]')?.value
  `);
  expect(searchQuery).toBe('AI');
});
```

---

#### TC-F3-I2.2: Date Range Picker Filters All Widgets Simultaneously
**Objective**: Verify changing the global date range filter updates all widgets to reflect only data within the new range.

**Test Steps**:
1. Set date range to `2026-07-15` (single day)
2. Assert topic trends widget shows only topics from that day
3. Assert sentiment widget score changes to reflect that day's data

**Expected Result**: All widgets reflect filtered date range; no cross-range data leaks.

**Code Sample**:
```typescript
it('should filter all widgets when date range changes', async () => {
  await win.webContents.send('dashboard:setDateRange', { start: '2026-07-15', end: '2026-07-15' });
  await new Promise(r => setTimeout(r, 1000));

  const topicDates = await win.webContents.executeJavaScript(`
    window.__dashboardState.topTopics.map(t => t.date)
  `);
  topicDates.forEach((d: string) => expect(d.startsWith('2026-07-15')).toBe(true));
});
```

---

### 2.3 Layout Persistence

#### TC-F3-I3.1: Drag-and-Drop Widget Reorder Persists Across Restart
**Objective**: Verify that a widget position change is saved and restored after the app restarts.

**Test Steps**:
1. Drag `sentiment` widget from position 2 to position 1
2. Close and reopen the dashboard
3. Assert `sentiment` widget is now at position 1

**Expected Result**: Widget order in DOM matches post-drag order after restart.

**Code Sample**:
```typescript
it('should restore widget order after app restart', async () => {
  await win.webContents.executeJavaScript(`
    window.__dashboardAPI.moveWidget('sentiment', 0);
  `);
  await win.close();

  win = await createTestWindow('/dashboard');
  const firstWidget = await win.webContents.executeJavaScript(`
    document.querySelectorAll('[data-testid="dashboard-widget"]')[0]?.dataset.widgetId
  `);
  expect(firstWidget).toBe('sentiment');
});
```

---

#### TC-F3-I3.2: Widget Resize Saved and Restored
**Objective**: Verify that resizing a widget persists its new dimensions to DB and restores on next open.

**Test Steps**:
1. Resize `topic-trends` widget to `w:8, h:6`
2. Close and reopen dashboard
3. Assert widget has dimensions `w:8, h:6`

**Expected Result**: Widget dimensions match the saved values after restart.

**Code Sample**:
```typescript
it('should restore widget dimensions after restart', async () => {
  await win.webContents.send('dashboard:resizeWidget', { id: 'topic-trends', w: 8, h: 6 });
  await win.close();
  win = await createTestWindow('/dashboard');

  const dims = await win.webContents.executeJavaScript(`
    window.__dashboardState.getWidgetDimensions('topic-trends')
  `);
  expect(dims).toEqual({ w: 8, h: 6 });
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Empty Conference Data

#### TC-F3-E1.1: Dashboard with No Sessions Shows Zero-State
**Objective**: Verify the dashboard renders gracefully when no sessions exist in the DB.

**Test Steps**:
1. Open dashboard with empty sessions table
2. Observe all widgets

**Expected Result**: All widgets show zero-state UI (e.g., `'No sessions recorded'`, `'—'`); no NaN values; no JavaScript errors.

**Code Sample**:
```typescript
it('should render zero-state dashboard when no sessions exist', async () => {
  testDb.exec('DELETE FROM sessions');
  const win = await createTestWindow('/dashboard');
  await new Promise(r => setTimeout(r, 2000));

  const errors = await win.webContents.executeJavaScript(`
    window.__testErrors || []
  `);
  expect(errors).toHaveLength(0);

  const sessionBadge = await win.webContents.executeJavaScript(`
    document.querySelector('[data-testid="session-count"]')?.textContent
  `);
  expect(sessionBadge).toBe('0');
});
```

---

#### TC-F3-E1.2: All Sentiment Scores Neutral Renders Valid Donut
**Objective**: Verify the sentiment donut chart handles a 100% neutral scenario without rendering errors.

**Test Steps**:
1. Set all session sentiment scores to 0.5 (neutral)
2. Refresh dashboard
3. Observe sentiment donut

**Expected Result**: Donut renders single `Neutral` slice at 100%; no division-by-zero errors.

**Code Sample**:
```typescript
it('should render 100% neutral donut without errors', () => {
  const slices = ChartDataFormatter.toDonutData({ positive: 0, neutral: 1.0, negative: 0 });
  expect(slices.find(s => s.label === 'Neutral')!.value).toBe(100);
  expect(slices.find(s => s.label === 'Positive')!.value).toBe(0);
  expect(() => ChartDataFormatter.toDonutData({ positive: 0, neutral: 1.0, negative: 0 })).not.toThrow();
});
```

---

### 3.2 Rapid Data Updates

#### TC-F3-E2.1: 10 Rapid Session Inserts Without Widget Flicker
**Objective**: Verify 10 sessions inserted within 1 second do not cause widget flickering or duplicate renders.

**Test Steps**:
1. Insert 10 sessions in rapid succession with 100ms gaps
2. Assert session count widget shows final count (not intermediate counts)
3. Assert no loading spinner remains after 3 seconds

**Expected Result**: Session count correct after 3 seconds; no observable flicker in DOM.

**Code Sample**:
```typescript
it('should debounce rapid session inserts and show final count', async () => {
  for (let i = 0; i < 10; i++) {
    insertSession(`ses-rapid-${i}`);
    await win.webContents.send('session:created', { id: `ses-rapid-${i}` });
    await new Promise(r => setTimeout(r, 100));
  }
  await new Promise(r => setTimeout(r, 3000));

  const count = await getSessionCountFromDashboard(win);
  expect(count).toBeGreaterThanOrEqual(10);

  const spinner = await win.webContents.executeJavaScript(`
    document.querySelector('[data-testid="loading-spinner"]') !== null
  `);
  expect(spinner).toBe(false);
});
```

---

#### TC-F3-E2.2: Date Range with No Data in Range Shows Empty State
**Objective**: Verify setting a date range with no matching sessions shows proper empty state for each widget.

**Test Steps**:
1. Set date range to `2020-01-01` to `2020-01-02` (no data)
2. Assert each widget shows empty state

**Expected Result**: Topic widget shows `'No topics in this range'`; sentiment shows `'—'`; session count = 0.

**Code Sample**:
```typescript
it('should show empty state for date range with no data', async () => {
  await win.webContents.send('dashboard:setDateRange', { start: '2020-01-01', end: '2020-01-02' });
  await new Promise(r => setTimeout(r, 1000));

  const sessionCount = await win.webContents.executeJavaScript(`
    document.querySelector('[data-testid="session-count"]')?.textContent
  `);
  expect(sessionCount).toBe('0');
});
```

---

### 3.3 Large Data Sets

#### TC-F3-E3.1: Dashboard with 10,000 Sessions Loads Without Timeout
**Objective**: Verify the dashboard metrics computation does not time out with very large session counts.

**Test Steps**:
1. Seed DB with 10,000 sessions
2. Open dashboard
3. Assert all widgets populated within 5 seconds

**Expected Result**: Dashboard fully rendered within 5 seconds; no widget stuck in loading state.

**Code Sample**:
```typescript
it('should load dashboard with 10k sessions within 5 seconds', async () => {
  // Seed done in beforeAll
  const win = await createTestWindow('/dashboard');
  const t0 = Date.now();

  await waitForDashboardReady(win);
  expect(Date.now() - t0).toBeLessThan(5000);
});
```

---

#### TC-F3-E3.2: Topic Ranker Handles 1000 Unique Topics
**Objective**: Verify `TopicRanker.getTopTopics(10)` handles 1000 unique topics without memory or sorting errors.

**Test Steps**:
1. Generate 1000 topic objects with random mention counts
2. Call `getTopTopics(10)`
3. Assert result has exactly 10 items in correct descending order

**Expected Result**: 10 topics returned; scores strictly descending or non-increasing; no sorting artifacts.

**Code Sample**:
```typescript
it('should rank top 10 from 1000 topics correctly', () => {
  const topics = Array.from({ length: 1000 }, (_, i) => ({
    name: `topic-${i}`, mentions: Math.floor(Math.random() * 1000), recencyWeight: Math.random()
  }));
  const ranker = new TopicRanker(topics);
  const top10 = ranker.getTopTopics(10);

  expect(top10).toHaveLength(10);
  for (let i = 1; i < top10.length; i++) {
    expect(top10[i].score).toBeLessThanOrEqual(top10[i - 1].score);
  }
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Data Fetch Performance

#### TC-F3-P1.1: Dashboard Metrics Fetch Under 500ms from SQLite
**Objective**: Verify all dashboard metrics can be computed and returned from SQLite in under 500ms.

**Preconditions**:
- SQLite with 1000 sessions, 50,000 segments, 500 topics

**Test Steps**:
1. Call `DashboardMetricsService.fetchAll()` and time it
2. Assert duration < 500ms
3. Assert result includes all required metric keys

**Expected Result**: Fetch completes < 500ms; result includes `topTopics`, `sentiment`, `sessionCount`, `followUpSignals`.

**Code Sample**:
```typescript
it('should compute all dashboard metrics in under 500ms', async () => {
  const svc = new DashboardMetricsService(testDb);
  const start = performance.now();
  const metrics = await svc.fetchAll();
  const elapsed = performance.now() - start;

  expect(elapsed).toBeLessThan(500);
  expect(metrics).toHaveProperty('topTopics');
  expect(metrics).toHaveProperty('sentiment');
  expect(metrics).toHaveProperty('sessionCount');
});
```

---

#### TC-F3-P1.2: Time-Series Bucketing Under 100ms for 30 Days of Data
**Objective**: Verify bucketing 30 days of event data into hourly buckets completes in under 100ms.

**Test Steps**:
1. Generate 21,600 event rows (30 days × 24 hours × 30 events/hour)
2. Time `formatter.toTimeSeries(events, { bucketMinutes: 60 })`

**Expected Result**: Execution < 100ms; exactly 720 buckets (30 days × 24h).

**Code Sample**:
```typescript
it('should bucket 30 days of events in under 100ms', () => {
  const events = generate30DaysEvents(); // 21,600 items
  const start = performance.now();
  const points = formatter.toTimeSeries(events, { bucketMinutes: 60 });
  expect(performance.now() - start).toBeLessThan(100);
  expect(points).toHaveLength(720);
});
```

---

### 4.2 Render Performance

#### TC-F3-P2.1: Dashboard Initial Render Under 2 Seconds
**Objective**: Verify the dashboard window shows all widgets within 2 seconds of open.

**Test Steps**:
1. Time from `createTestWindow` to all 4 widgets visible in DOM

**Expected Result**: All widgets rendered within 2 seconds; no widget in loading state.

**Code Sample**:
```typescript
it('should render all dashboard widgets within 2 seconds', async () => {
  const t0 = performance.now();
  const win = await createTestWindow('/dashboard');
  await waitForAllWidgets(win, 4);
  expect(performance.now() - t0).toBeLessThan(2000);
});
```

---

#### TC-F3-P2.2: Auto-Refresh Does Not Degrade Render Performance Over Time
**Objective**: Verify that after 10 auto-refresh cycles, widget render time has not increased by more than 20%.

**Test Steps**:
1. Measure baseline render time for first refresh
2. Allow 10 refresh cycles (30s each in test mode using fake timers)
3. Measure render time for 11th refresh
4. Assert delta < 20%

**Expected Result**: Render time stable across refresh cycles; no performance degradation pattern.

**Code Sample**:
```typescript
it('should not degrade render time across 10 refresh cycles', async () => {
  const baseline = await measureWidgetRenderTime(win);
  for (let i = 0; i < 10; i++) {
    await win.webContents.send('dashboard:refresh', {});
    await new Promise(r => setTimeout(r, 500));
  }
  const latest = await measureWidgetRenderTime(win);
  expect(latest / baseline).toBeLessThan(1.20);
});
```

---

### 4.3 Memory Performance

#### TC-F3-P3.1: Dashboard Heap Under 100MB After 1 Hour of Refreshes
**Objective**: Verify continuous dashboard refreshes for 1 simulated hour do not accumulate heap memory.

**Test Steps**:
1. Simulate 120 refresh cycles (every 30s) using fake timers
2. Force GC
3. Assert heap < 100MB

**Expected Result**: Heap stable below 100MB; no chart data accumulating in detached closures.

**Code Sample**:
```typescript
it('should maintain heap under 100MB after 120 refresh cycles', async () => {
  jest.useFakeTimers();
  jest.advanceTimersByTime(120 * 30 * 1000);
  jest.useRealTimers();
  await new Promise(r => setTimeout(r, 200));
  if (global.gc) global.gc();

  const heap = await win.webContents.executeJavaScript(`performance.memory.usedJSHeapSize`);
  expect(heap).toBeLessThan(100 * 1024 * 1024);
});
```

---

#### TC-F3-P3.2: Widget Layout Save/Restore Adds Negligible DB Overhead
**Objective**: Verify layout persistence adds < 5ms overhead to each save operation.

**Test Steps**:
1. Measure time for 100 consecutive layout saves
2. Assert median < 5ms

**Expected Result**: Median save < 5ms; DB file size grows by < 100KB per 100 saves.

**Code Sample**:
```typescript
it('should save widget layout in under 5ms', () => {
  const times: number[] = [];
  for (let i = 0; i < 100; i++) {
    const start = performance.now();
    layoutManager.save(`layout-${i}`, defaultLayout);
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  expect(times[50]).toBeLessThan(5);
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

**Estimated Execution Time**: ~4 minutes (unit: 30s, integration: 2m, edge: 45s, performance: 45s)

**Tooling**: Jest + better-sqlite3 (unit/performance), Electron test harness (integration/edge), fake timers for refresh cycle tests
