# EPIC13 Feature 1 — Monitoring Dashboards — Test Cases

## Test Overview
Comprehensive test suite for Monitoring Dashboards covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Metric Collection and Aggregation

#### TC-F1-U1.1: Prometheus Metric Scrape and Registration
**Objective**: Verify that all core service metrics are correctly registered and scrapeable by Prometheus

**Preconditions**:
- Monitoring service initialized
- Prometheus client library configured
- At least one backend service emitting metrics

**Test Steps**:
1. Initialize `MetricRegistry` with default service labels
2. Register throughput, latency, and error-rate gauges
3. Simulate a scrape request to `/metrics` endpoint
4. Parse returned Prometheus text format
5. Assert all expected metric families are present

**Expected Result**: All registered metrics returned in valid Prometheus exposition format with correct label sets

**Code Sample**:
```typescript
import { Registry, Gauge, Histogram } from 'prom-client';

describe('MetricRegistry', () => {
  let registry: Registry;

  beforeEach(() => {
    registry = new Registry();
  });

  it('should register and expose all core service metrics', async () => {
    const transcriptionLatency = new Histogram({
      name: 'transcription_job_duration_seconds',
      help: 'Duration of transcription jobs in seconds',
      labelNames: ['service', 'model', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [registry],
    });

    const agentQueueDepth = new Gauge({
      name: 'agent_queue_depth',
      help: 'Number of pending tasks in each agent queue',
      labelNames: ['agent_name', 'priority'],
      registers: [registry],
    });

    transcriptionLatency.labels('transcription-service', 'whisper-large', 'success').observe(2.3);
    agentQueueDepth.labels('context-engine', 'high').set(12);

    const metrics = await registry.metrics();
    expect(metrics).toContain('transcription_job_duration_seconds');
    expect(metrics).toContain('agent_queue_depth');
    expect(metrics).toContain('service="transcription-service"');
    expect(metrics).toContain('agent_name="context-engine"');
  });
});
```

---

#### TC-F1-U1.2: Dashboard Widget Data Transformation
**Objective**: Verify raw Prometheus query results are correctly transformed into dashboard widget data structures

**Preconditions**:
- Mock Prometheus query response available
- Dashboard data transformer initialized

**Test Steps**:
1. Supply a mock Prometheus range query result (matrix type)
2. Call `transformToTimeSeriesWidget(queryResult, widgetConfig)`
3. Assert output shape matches `TimeSeriesWidget` interface
4. Assert timestamps are converted to ISO 8601 strings
5. Assert values are rounded to configured precision

**Expected Result**: Transformed widget data structure with correct series labels, timestamps, and numeric values

**Code Sample**:
```typescript
describe('DashboardDataTransformer', () => {
  it('should transform Prometheus matrix result to time-series widget data', () => {
    const mockQueryResult = {
      resultType: 'matrix',
      result: [
        {
          metric: { service: 'transcription-service', status: 'error' },
          values: [
            [1720000000, '0.02'],
            [1720000060, '0.05'],
            [1720000120, '0.03'],
          ],
        },
      ],
    };

    const transformer = new DashboardDataTransformer();
    const widget = transformer.transformToTimeSeriesWidget(mockQueryResult, {
      title: 'Error Rate',
      unit: 'errors/sec',
      precision: 4,
    });

    expect(widget.series).toHaveLength(1);
    expect(widget.series[0].label).toBe('transcription-service / error');
    expect(widget.series[0].dataPoints[0].timestamp).toBe('2024-07-03T10:13:20.000Z');
    expect(widget.series[0].dataPoints[1].value).toBeCloseTo(0.05, 4);
  });
});
```

---

#### TC-F1-U1.3: Service Health Status Computation
**Objective**: Verify service health status is correctly computed from error rate and latency thresholds

**Preconditions**:
- `HealthStatusEvaluator` instantiated with threshold config
- Mock metric snapshots prepared

**Test Steps**:
1. Provide metric snapshot with error_rate = 0.08, p99_latency = 4.2s
2. Call `evaluateServiceHealth(metrics, thresholds)`
3. Assert returned status is `DEGRADED`
4. Repeat with error_rate = 0.25, assert `DOWN`
5. Repeat with error_rate = 0.005, p99 = 0.8s, assert `HEALTHY`

**Expected Result**: Correct health status enum returned for each threshold boundary scenario

**Code Sample**:
```typescript
describe('HealthStatusEvaluator', () => {
  const thresholds = {
    errorRateWarning: 0.05,
    errorRateCritical: 0.20,
    p99LatencyWarningMs: 3000,
    p99LatencyCriticalMs: 8000,
  };

  const evaluator = new HealthStatusEvaluator(thresholds);

  it('should return DEGRADED when error rate exceeds warning threshold', () => {
    const status = evaluator.evaluateServiceHealth({
      errorRate: 0.08,
      p99LatencyMs: 4200,
    });
    expect(status).toBe('DEGRADED');
  });

  it('should return DOWN when error rate exceeds critical threshold', () => {
    const status = evaluator.evaluateServiceHealth({
      errorRate: 0.25,
      p99LatencyMs: 9000,
    });
    expect(status).toBe('DOWN');
  });

  it('should return HEALTHY within all thresholds', () => {
    const status = evaluator.evaluateServiceHealth({
      errorRate: 0.005,
      p99LatencyMs: 800,
    });
    expect(status).toBe('HEALTHY');
  });
});
```

---

### 1.2 Dashboard Configuration Management

#### TC-F1-U2.1: Dashboard Layout Persistence
**Objective**: Verify dashboard layout configurations are correctly serialized and stored per user

**Preconditions**:
- `DashboardConfigService` initialized with mock storage backend
- User session active

**Test Steps**:
1. Create a dashboard config with three widgets (graph, stat, table)
2. Call `saveLayout(userId, dashboardId, layout)`
3. Retrieve config with `getLayout(userId, dashboardId)`
4. Assert retrieved config matches saved config byte-for-byte

**Expected Result**: Dashboard layout round-trips correctly through persistence layer

**Code Sample**:
```typescript
describe('DashboardConfigService', () => {
  it('should persist and retrieve dashboard layout accurately', async () => {
    const service = new DashboardConfigService(mockStorageAdapter);
    const layout = {
      dashboardId: 'ops-overview',
      widgets: [
        { id: 'w1', type: 'GRAPH', query: 'rate(http_requests_total[5m])', position: { x: 0, y: 0, w: 12, h: 4 } },
        { id: 'w2', type: 'STAT', query: 'up{job="api-gateway"}', position: { x: 0, y: 4, w: 4, h: 2 } },
      ],
      refreshIntervalSeconds: 30,
    };

    await service.saveLayout('user-abc', 'ops-overview', layout);
    const retrieved = await service.getLayout('user-abc', 'ops-overview');

    expect(retrieved).toEqual(layout);
  });
});
```

---

#### TC-F1-U2.2: Default Dashboard Provisioning for New Admin Users
**Objective**: Verify new admin users receive a pre-provisioned default ops dashboard

**Test Steps**:
1. Create new user with role `ADMIN`
2. Trigger `onUserCreated` lifecycle hook
3. Assert `getLayout(newUserId, 'default-ops')` returns a non-empty layout
4. Assert layout contains the required system health widget

**Expected Result**: Default dashboard automatically provisioned with at least the global service health widget

**Code Sample**:
```typescript
it('should provision default ops dashboard for new ADMIN user', async () => {
  const userService = new UserService(mockDashboardConfigService);
  const newUser = await userService.createUser({ email: 'ops@example.com', role: 'ADMIN' });

  const defaultLayout = await mockDashboardConfigService.getLayout(newUser.id, 'default-ops');
  expect(defaultLayout).toBeDefined();
  expect(defaultLayout.widgets.some(w => w.type === 'SERVICE_HEALTH_GRID')).toBe(true);
});
```

---

#### TC-F1-U2.3: Widget Query Validation on Save
**Objective**: Verify invalid PromQL queries are rejected before being persisted

**Test Steps**:
1. Submit dashboard save with widget containing malformed PromQL: `rate(http_requests_total[invalid)`
2. Assert `saveLayout` throws `InvalidQueryError`
3. Assert nothing is written to storage

**Expected Result**: Query validation runs server-side; malformed PromQL triggers a 400-level error with descriptive message

**Code Sample**:
```typescript
it('should reject dashboard save with invalid PromQL query', async () => {
  const service = new DashboardConfigService(mockStorageAdapter);
  const badLayout = {
    dashboardId: 'bad-dash',
    widgets: [{ id: 'w1', type: 'GRAPH', query: 'rate(http_requests_total[invalid)' }],
  };

  await expect(service.saveLayout('user-abc', 'bad-dash', badLayout))
    .rejects.toThrow('InvalidQueryError');
  expect(mockStorageAdapter.write).not.toHaveBeenCalled();
});
```

---

### 1.3 Real-Time Update Streaming

#### TC-F1-U3.1: WebSocket Metric Push on Interval
**Objective**: Verify dashboard server pushes metric updates to subscribed clients at configured interval

**Test Steps**:
1. Connect mock WebSocket client to dashboard stream endpoint
2. Subscribe to `ops-overview` dashboard
3. Wait 35 seconds (one 30s interval + buffer)
4. Assert at least one `METRIC_UPDATE` message received
5. Assert message payload contains all subscribed widget data

**Expected Result**: Client receives pushed updates within the configured refresh window

**Code Sample**:
```typescript
it('should push metric updates to WebSocket subscribers', async (done) => {
  const client = new MockWebSocketClient('ws://localhost:4000/dashboard/stream');
  await client.connect();
  client.send(JSON.stringify({ type: 'SUBSCRIBE', dashboardId: 'ops-overview' }));

  client.onMessage((message) => {
    const parsed = JSON.parse(message);
    if (parsed.type === 'METRIC_UPDATE') {
      expect(parsed.dashboardId).toBe('ops-overview');
      expect(parsed.widgets).toBeDefined();
      expect(Array.isArray(parsed.widgets)).toBe(true);
      client.close();
      done();
    }
  });

  jest.advanceTimersByTime(35000);
});
```

---

#### TC-F1-U3.2: Client Unsubscribe Stops Metric Push
**Objective**: Verify metric pushes cease after client sends UNSUBSCRIBE

**Test Steps**:
1. Subscribe client to dashboard stream
2. Receive at least one update
3. Send `UNSUBSCRIBE` message
4. Wait two refresh intervals
5. Assert no further `METRIC_UPDATE` messages received

**Expected Result**: Server respects UNSUBSCRIBE and stops sending updates to that client

**Code Sample**:
```typescript
it('should stop metric pushes after UNSUBSCRIBE', async () => {
  const client = new MockWebSocketClient('ws://localhost:4000/dashboard/stream');
  await client.connect();
  client.send(JSON.stringify({ type: 'SUBSCRIBE', dashboardId: 'ops-overview' }));

  jest.advanceTimersByTime(35000); // receive first update
  const messagesBefore = client.receivedMessages.length;

  client.send(JSON.stringify({ type: 'UNSUBSCRIBE', dashboardId: 'ops-overview' }));
  jest.advanceTimersByTime(65000); // two more intervals

  expect(client.receivedMessages.length).toBe(messagesBefore);
});
```

---

#### TC-F1-U3.3: Stale Data Indicator When Prometheus Unreachable
**Objective**: Verify dashboard marks widget data as stale when upstream Prometheus is unreachable

**Test Steps**:
1. Configure Prometheus client to simulate connection timeout
2. Trigger metric refresh cycle
3. Assert widget response contains `dataQuality: "STALE"` flag
4. Assert last known values are retained in response

**Expected Result**: Dashboard degrades gracefully — stale indicator shown, no data loss

**Code Sample**:
```typescript
it('should mark data as stale when Prometheus is unreachable', async () => {
  mockPrometheusClient.query.mockRejectedValue(new Error('ECONNREFUSED'));
  const dashboard = new DashboardService(mockPrometheusClient, cacheService);

  const result = await dashboard.refreshWidgets('ops-overview');

  expect(result.widgets[0].dataQuality).toBe('STALE');
  expect(result.widgets[0].lastKnownValue).toBeDefined();
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 End-to-End Metric Pipeline

#### TC-F1-I1.1: Metric Flows from Service to Dashboard Widget
**Objective**: Verify a metric emitted by a backend service appears correctly on the dashboard within one refresh cycle

**Preconditions**:
- Transcription service running with Prometheus exporter
- Prometheus scrape configured with 15s interval
- Dashboard refresh set to 30s

**Test Steps**:
1. Trigger five transcription jobs through the API
2. Wait 45 seconds (scrape + dashboard refresh)
3. Fetch dashboard state via `GET /api/dashboards/ops-overview/state`
4. Assert `transcription_jobs_completed_total` widget shows count >= 5
5. Assert latency histogram widget shows p50 and p99 values

**Expected Result**: Real job metrics propagate from service exporter through Prometheus to dashboard within expected time window

**Code Sample**:
```typescript
it('should display transcription metrics on dashboard within refresh window', async () => {
  for (let i = 0; i < 5; i++) {
    await apiClient.post('/api/transcription/jobs', { audioUrl: `s3://bucket/audio-${i}.mp3` });
  }

  await sleep(45000);

  const dashboardState = await apiClient.get('/api/dashboards/ops-overview/state');
  const transcriptionWidget = dashboardState.data.widgets.find(w => w.id === 'transcription-throughput');

  expect(transcriptionWidget.value).toBeGreaterThanOrEqual(5);
  expect(dashboardState.data.widgets.find(w => w.id === 'transcription-latency-p99')).toBeDefined();
}, 60000);
```

---

#### TC-F1-I1.2: Service Status Grid Reflects Real Deployment State
**Objective**: Verify the global service health grid correctly shows DOWN for a stopped service

**Test Steps**:
1. Record baseline health grid — all services HEALTHY
2. Stop the `contact-intelligence` service container
3. Wait for Prometheus scrape to detect absence (up metric = 0)
4. Refresh dashboard health grid
5. Assert `contact-intelligence` shows `DOWN`
6. Restart service; assert returns to `HEALTHY` within 60 seconds

**Expected Result**: Health grid reflects actual container state changes within two scrape intervals

---

### 2.2 Dashboard Auth and Multi-Tenancy

#### TC-F1-I2.1: Admin Role Required to View All Services
**Objective**: Verify non-admin users can only view dashboards for their own tenant's services

**Test Steps**:
1. Create tenant-A admin and tenant-B standard user
2. Authenticate as tenant-B user
3. Request `GET /api/dashboards/ops-overview/state`
4. Assert response only contains tenant-B service metrics
5. Assert no tenant-A metrics or service labels visible in response

**Expected Result**: Dashboard data is tenant-scoped for non-admin users; super-admins see all tenants

---

#### TC-F1-I2.2: Read-Only vs. Edit Permission Enforcement
**Objective**: Verify users with `DASHBOARD_VIEW` role cannot save layout changes

**Test Steps**:
1. Authenticate as user with `DASHBOARD_VIEW` role
2. Attempt `PUT /api/dashboards/ops-overview/layout` with modified widget list
3. Assert 403 Forbidden response
4. Assert dashboard layout unchanged in storage

**Expected Result**: Layout modification blocked for view-only role; error message includes required permission name

---

### 2.3 Alerting Integration

#### TC-F1-I3.1: Threshold Breach Triggers Alert from Dashboard
**Objective**: Verify crossing a dashboard-defined alert threshold triggers a PagerDuty event

**Test Steps**:
1. Configure a dashboard alert: `error_rate > 0.10` for `api-gateway` for 2 minutes
2. Simulate error rate spike to 0.15 for 3 minutes via metric injection
3. Assert PagerDuty mock receives one `trigger` event within 4 minutes
4. Assert event payload contains service name, current value, and threshold

**Expected Result**: Alert fires exactly once; deduplication key prevents duplicate pages for same condition

**Code Sample**:
```typescript
it('should trigger PagerDuty alert when error rate exceeds threshold', async () => {
  await dashboardAlertService.setAlert({
    dashboardId: 'ops-overview',
    widgetId: 'api-gateway-errors',
    condition: { metric: 'http_error_rate', operator: 'gt', threshold: 0.10 },
    durationMinutes: 2,
    integrationKey: 'mock-pagerduty-key',
  });

  mockMetricSource.setMetricValue('http_error_rate', { service: 'api-gateway' }, 0.15);
  await jest.advanceTimersByTimeAsync(4 * 60 * 1000);

  expect(mockPagerDutyClient.trigger).toHaveBeenCalledTimes(1);
  expect(mockPagerDutyClient.trigger.mock.calls[0][0]).toMatchObject({
    severity: 'critical',
    summary: expect.stringContaining('api-gateway'),
    custom_details: { current_value: 0.15, threshold: 0.10 },
  });
});
```

---

#### TC-F1-I3.2: Alert Auto-Resolves When Metric Returns to Normal
**Objective**: Verify PagerDuty incident is resolved automatically when metric drops below threshold

**Test Steps**:
1. Trigger an alert as in TC-F1-I3.1
2. Return metric to 0.02 (below threshold)
3. Wait two evaluation cycles
4. Assert PagerDuty mock receives a `resolve` event with matching deduplication key

**Expected Result**: Alert lifecycle managed end-to-end; no manual intervention required for auto-resolution

---

## 3. EDGE CASE VALIDATION

### 3.1 High Metric Cardinality

#### TC-F1-E1.1: Cardinality Explosion Prevention
**Objective**: Verify the system rejects metric registrations that would create excessive label cardinality

**Preconditions**:
- Cardinality limit set to 10,000 unique time series per metric family

**Test Steps**:
1. Attempt to register a metric with a user_id label (unbounded)
2. Assert registration fails with `CardinalityLimitError`
3. Assert no metric family created in registry
4. Verify error message recommends label alternatives

**Expected Result**: System enforces cardinality guardrails before metrics reach Prometheus

**Code Sample**:
```typescript
it('should reject metric registration with unbounded label dimensions', () => {
  const registry = new CardinalityGuardedRegistry({ maxSeriesPerFamily: 10000 });

  expect(() => {
    registry.registerHistogram({
      name: 'api_requests',
      labelNames: ['method', 'path', 'user_id'], // user_id is unbounded
    });
  }).toThrow('CardinalityLimitError: label "user_id" is on the denylist for unbounded cardinality');
});
```

---

#### TC-F1-E1.2: Dashboard Renders Gracefully with 500+ Widgets
**Objective**: Verify dashboard API returns within SLA when a layout contains an unusually large number of widgets

**Test Steps**:
1. Create a dashboard with 500 widgets, each with a distinct PromQL query
2. Request dashboard state via API
3. Assert response time under 3 seconds
4. Assert all 500 widgets present in response

**Expected Result**: Parallel query execution prevents linear degradation with widget count

---

### 3.2 Data Gap Handling

#### TC-F1-E2.1: Dashboard Handles Missing Metric Data for New Services
**Objective**: Verify newly deployed services with no historical data do not crash dashboard widgets

**Test Steps**:
1. Add a new service `knowledge-graph-v2` to the health grid config
2. Request dashboard state before any metrics have been scraped
3. Assert `knowledge-graph-v2` widget shows `NO_DATA` state rather than error
4. Assert other widgets unaffected

**Expected Result**: No data and error states are differentiated; dashboard remains usable during service rollout

---

#### TC-F1-E2.2: Time Range with Zero Data Points Returns Empty Series
**Objective**: Verify a historical time range query with no data returns empty series rather than null

**Test Steps**:
1. Query dashboard for a time range 2 years in the past (no data exists)
2. Assert response contains widget objects with empty `dataPoints: []` arrays
3. Assert HTTP 200 (not 404 or 500)
4. Assert empty-state indicator flag is set

**Expected Result**: Empty series handled explicitly; clients can render "no data in range" message

---

### 3.3 Concurrent Dashboard Access

#### TC-F1-E3.1: Concurrent Layout Save from Two Sessions
**Objective**: Verify optimistic locking prevents one admin's layout save from silently overwriting another's

**Test Steps**:
1. Two admins fetch the same dashboard layout (both receive version = 5)
2. Admin A saves a modified layout (version increments to 6)
3. Admin B attempts to save a different modification with version = 5
4. Assert Admin B receives 409 Conflict with `currentVersion: 6`

**Expected Result**: Concurrent write conflict detected and returned; no silent data loss

---

#### TC-F1-E3.2: 100 Concurrent WebSocket Subscribers
**Objective**: Verify the dashboard stream server handles 100 simultaneous subscribers without message loss

**Test Steps**:
1. Open 100 WebSocket connections, each subscribing to `ops-overview`
2. Trigger one metric refresh cycle
3. Assert all 100 connections receive the `METRIC_UPDATE` message
4. Assert message content identical across all connections

**Expected Result**: Broadcast fan-out works correctly at target concurrency; no dropped messages

---

## 4. PERFORMANCE VALIDATION

### 4.1 Query Response Times

#### TC-F1-P1.1: Dashboard State API P99 Latency Under Load
**Objective**: Verify `GET /api/dashboards/{id}/state` meets P99 < 500ms under 200 concurrent users

**Preconditions**:
- Prometheus populated with 30 days of metric data
- Dashboard with 20 widgets
- 200 virtual users sending requests concurrently

**Test Steps**:
1. Run k6 load test with 200 VUs for 5 minutes against dashboard state endpoint
2. Collect P50, P95, P99 latency percentiles
3. Assert P99 < 500ms
4. Assert error rate < 0.1%

**Expected Result**: Dashboard remains responsive under typical admin-team concurrency

**Code Sample**:
```typescript
// k6 load test script
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 200,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(99)<500'],
    http_req_failed: ['rate<0.001'],
  },
};

export default function () {
  const res = http.get('https://api.example.com/api/dashboards/ops-overview/state', {
    headers: { Authorization: `Bearer ${__ENV.ADMIN_TOKEN}` },
  });
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

---

#### TC-F1-P1.2: PromQL Query Execution Time for Complex Queries
**Objective**: Verify complex multi-join PromQL queries used by AI agent health widgets complete within 2 seconds

**Test Steps**:
1. Execute the agent health composite query against Prometheus with 90 days of data
2. Measure wall-clock query execution time
3. Assert execution time < 2000ms
4. Assert result set is non-empty

**Expected Result**: Recording rules pre-aggregate complex queries to meet latency requirements

---

### 4.2 Real-Time Streaming Performance

#### TC-F1-P2.1: WebSocket Broadcast Latency for 500 Subscribers
**Objective**: Verify metric update broadcast reaches all 500 subscribers within 1 second

**Test Steps**:
1. Establish 500 WebSocket connections subscribing to same dashboard
2. Trigger a metric update event
3. Record timestamp when each client receives the update
4. Assert last delivery timestamp - trigger timestamp < 1000ms

**Expected Result**: Broadcast completes within 1 second for 500 concurrent subscribers

---

#### TC-F1-P2.2: Dashboard Server Memory Under Sustained WebSocket Load
**Objective**: Verify memory consumption does not grow unboundedly with 500 long-lived WebSocket connections over 1 hour

**Test Steps**:
1. Establish 500 WebSocket connections
2. Record heap usage baseline
3. Run for 60 minutes with continuous metric pushes
4. Record heap usage after 60 minutes
5. Assert heap growth < 200MB from baseline

**Expected Result**: No memory leak in subscriber registry or message buffer handling

---

### 4.3 Dashboard Caching Performance

#### TC-F1-P3.1: Cache Hit Rate for Repeated Dashboard Loads
**Objective**: Verify query result cache achieves > 80% hit rate for repeated dashboard state requests within the refresh interval

**Test Steps**:
1. Send 1000 requests for the same dashboard state within a 30-second window
2. Measure cache hit/miss counters
3. Assert hit rate > 80%
4. Assert cached responses returned in < 20ms

**Expected Result**: Cache layer absorbs the majority of repeated reads; upstream Prometheus protected from redundant queries

---

#### TC-F1-P3.2: Cold Start Time After Cache Invalidation
**Objective**: Verify dashboard state is fully rebuilt within 3 seconds after cache flush

**Test Steps**:
1. Flush the dashboard state cache
2. Immediately request dashboard state
3. Measure time to first complete response
4. Assert cold-start latency < 3000ms

**Expected Result**: Cold start remains within acceptable SLA; parallel query batching prevents sequential bottleneck

---

## Test Execution Summary

| Category | Test Suites | Test Cases |
|---|---|---|
| Unit Tests | 3 | 9 |
| Integration Tests | 3 | 6 |
| Edge Cases | 3 | 6 |
| Performance Validation | 3 | 6 |
| **Total** | **12** | **27** |

**Estimated Execution Time**: Unit ~2 min | Integration ~15 min | Edge ~10 min | Performance ~90 min
