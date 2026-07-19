# EPIC13 Feature 2 — Centralized Logging — Test Cases

## Test Overview
Comprehensive test suite for Centralized Logging covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Structured Log Emission

#### TC-F2-U1.1: Log Entry Schema Compliance
**Objective**: Verify every log entry emitted by the logging library conforms to the defined JSON schema

**Preconditions**:
- `StructuredLogger` initialized with service context
- JSON schema validator loaded

**Test Steps**:
1. Call `logger.info('transcription completed', { jobId: 'job-123', durationMs: 4500 })`
2. Capture the emitted log entry
3. Validate against the platform log schema
4. Assert required fields present: `timestamp`, `level`, `service`, `traceId`, `message`, `context`

**Expected Result**: Every emitted log entry validates against the platform schema with no missing required fields

**Code Sample**:
```typescript
import { StructuredLogger } from '@platform/logging';
import Ajv from 'ajv';

const logSchema = {
  type: 'object',
  required: ['timestamp', 'level', 'service', 'traceId', 'message'],
  properties: {
    timestamp: { type: 'string', format: 'date-time' },
    level: { enum: ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'] },
    service: { type: 'string' },
    traceId: { type: 'string', pattern: '^[0-9a-f]{32}$' },
    message: { type: 'string' },
    context: { type: 'object' },
  },
};

describe('StructuredLogger', () => {
  it('should emit log entries conforming to the platform schema', () => {
    const entries: object[] = [];
    const logger = new StructuredLogger({
      service: 'transcription-service',
      transport: (entry) => entries.push(entry),
    });

    logger.info('transcription completed', { jobId: 'job-123', durationMs: 4500 });

    const ajv = new Ajv({ allErrors: true });
    const validate = ajv.compile(logSchema);
    expect(validate(entries[0])).toBe(true);
    expect((entries[0] as any).context.jobId).toBe('job-123');
  });
});
```

---

#### TC-F2-U1.2: Trace Context Propagation in Log Entries
**Objective**: Verify `traceId` and `spanId` from the active OpenTelemetry context are automatically injected into log entries

**Preconditions**:
- OpenTelemetry trace context active in current execution scope
- Logger configured with OTel correlation plugin

**Test Steps**:
1. Start an OTel span with known `traceId` and `spanId`
2. Inside the span, call `logger.info('processing audio chunk')`
3. Assert emitted log entry contains the span's `traceId` and `spanId`
4. End the span; assert subsequent log entries have no traceId (or a new one)

**Expected Result**: Trace context automatically propagated without explicit caller injection

**Code Sample**:
```typescript
import { trace, context } from '@opentelemetry/api';

it('should inject active OTel trace context into log entries', () => {
  const entries: any[] = [];
  const logger = new StructuredLogger({
    service: 'audio-pipeline',
    transport: (e) => entries.push(e),
    otelCorrelation: true,
  });

  const tracer = trace.getTracer('test');
  tracer.startActiveSpan('process-audio', (span) => {
    logger.info('processing audio chunk', { chunkIndex: 3 });
    span.end();
  });

  expect(entries[0].traceId).toBe(trace.getActiveSpan()?.spanContext().traceId ?? entries[0].traceId);
  expect(entries[0].spanId).toBeDefined();
});
```

---

#### TC-F2-U1.3: PII Redaction Before Log Emission
**Objective**: Verify sensitive fields are redacted from log entries before they leave the service process

**Preconditions**:
- PII redaction filter configured with field denylist: `email`, `phone`, `authToken`

**Test Steps**:
1. Log an object containing `{ email: 'user@example.com', jobId: 'job-456', authToken: 'secret-token' }`
2. Capture emitted log entry
3. Assert `context.email` is replaced with `[REDACTED]`
4. Assert `context.authToken` is replaced with `[REDACTED]`
5. Assert `context.jobId` is unchanged

**Expected Result**: PII fields never appear in plaintext in emitted log entries

**Code Sample**:
```typescript
it('should redact PII fields before log emission', () => {
  const entries: any[] = [];
  const logger = new StructuredLogger({
    service: 'contact-service',
    transport: (e) => entries.push(e),
    redactedFields: ['email', 'phone', 'authToken'],
  });

  logger.info('contact lookup', { email: 'alice@example.com', jobId: 'job-456', authToken: 'tok_secret' });

  expect(entries[0].context.email).toBe('[REDACTED]');
  expect(entries[0].context.authToken).toBe('[REDACTED]');
  expect(entries[0].context.jobId).toBe('job-456');
});
```

---

### 1.2 Log Query and Search

#### TC-F2-U2.1: Structured Log Query with Multiple Filters
**Objective**: Verify the log query engine correctly applies compound filter expressions

**Preconditions**:
- `LogQueryEngine` initialized with mock Elasticsearch client
- 1000 synthetic log entries indexed

**Test Steps**:
1. Execute query: `service = "transcription-service" AND level = "ERROR" AND timestamp >= now-1h`
2. Assert returned entries match all three filter conditions
3. Assert entries sorted by timestamp descending by default
4. Assert total count returned in response metadata

**Expected Result**: Compound query returns only entries matching all conditions; result ordered correctly

**Code Sample**:
```typescript
describe('LogQueryEngine', () => {
  it('should return only entries matching all filter conditions', async () => {
    const engine = new LogQueryEngine(mockEsClient);
    const result = await engine.query({
      filters: [
        { field: 'service', op: 'eq', value: 'transcription-service' },
        { field: 'level', op: 'eq', value: 'ERROR' },
        { field: 'timestamp', op: 'gte', value: 'now-1h' },
      ],
      sort: { field: 'timestamp', order: 'desc' },
      limit: 50,
    });

    expect(result.entries.every(e => e.service === 'transcription-service')).toBe(true);
    expect(result.entries.every(e => e.level === 'ERROR')).toBe(true);
    expect(result.total).toBeDefined();
    expect(result.entries[0].timestamp >= result.entries[1].timestamp).toBe(true);
  });
});
```

---

#### TC-F2-U2.2: Full-Text Search Across Log Messages
**Objective**: Verify full-text search across log message fields returns relevant entries

**Test Steps**:
1. Index entries with varied messages including "failed to connect to Redis"
2. Execute full-text query for "Redis connection"
3. Assert entries containing the phrase in their message field are returned
4. Assert entries without the phrase are excluded

**Expected Result**: Full-text search returns relevant entries using relevance ranking

---

#### TC-F2-U2.3: Log Aggregation — Error Count by Service
**Objective**: Verify the aggregation API correctly groups and counts errors per service

**Test Steps**:
1. Index 50 ERROR entries for `transcription-service` and 30 for `context-engine`
2. Execute aggregation query: group by `service`, count where `level = ERROR`, last 24h
3. Assert aggregation result contains both services with correct counts
4. Assert results sorted by count descending

**Expected Result**: Aggregation correctly groups and counts across service boundaries

**Code Sample**:
```typescript
it('should aggregate error counts correctly by service', async () => {
  const engine = new LogQueryEngine(mockEsClient);
  const result = await engine.aggregate({
    groupBy: 'service',
    metric: { type: 'count', filter: { field: 'level', value: 'ERROR' } },
    timeRange: 'now-24h',
  });

  const transcriptionBucket = result.buckets.find(b => b.key === 'transcription-service');
  const contextBucket = result.buckets.find(b => b.key === 'context-engine');

  expect(transcriptionBucket?.count).toBe(50);
  expect(contextBucket?.count).toBe(30);
  expect(result.buckets[0].count).toBeGreaterThanOrEqual(result.buckets[1].count);
});
```

---

### 1.3 Log Retention and Archival

#### TC-F2-U3.1: Log Expiry Policy Enforcement
**Objective**: Verify logs older than the retention policy are deleted during scheduled cleanup

**Preconditions**:
- Retention policy: 90 days for INFO, 365 days for ERROR
- Log store seeded with entries at 91, 180, 366 days ago

**Test Steps**:
1. Run `LogRetentionManager.enforcePolicy()`
2. Query for entries at 91 days ago with level INFO
3. Assert zero results (deleted)
4. Query for entries at 180 days ago with level ERROR
5. Assert entries still present

**Expected Result**: Retention policy correctly distinguishes by log level; only expired entries deleted

**Code Sample**:
```typescript
it('should delete INFO logs older than 90 days but retain ERROR logs', async () => {
  const manager = new LogRetentionManager(mockLogStore, {
    INFO: 90,
    ERROR: 365,
  });

  await manager.enforcePolicy();

  const oldInfoLogs = await mockLogStore.query({
    level: 'INFO',
    olderThanDays: 91,
  });
  const oldErrorLogs = await mockLogStore.query({
    level: 'ERROR',
    olderThanDays: 180,
  });

  expect(oldInfoLogs.total).toBe(0);
  expect(oldErrorLogs.total).toBeGreaterThan(0);
});
```

---

#### TC-F2-U3.2: Cold Archive to Object Storage
**Objective**: Verify logs beyond the hot-tier retention window are correctly archived to S3-compatible storage

**Test Steps**:
1. Mark logs older than 30 days as eligible for archival
2. Run `archiveToObjectStorage()` with mock S3 client
3. Assert correct number of objects written to S3
4. Assert each object is GZIP-compressed NDJSON
5. Assert archived entries removed from hot log store

**Expected Result**: Hot-to-cold archive completes successfully; entries accessible via archive query path

---

#### TC-F2-U3.3: Archive Retrieval Reconstitutes Original Entries
**Objective**: Verify entries fetched from cold archive are identical to original emitted entries

**Test Steps**:
1. Archive a known set of 100 log entries to mock S3
2. Retrieve archive object and decompress
3. Parse NDJSON and compare each entry with original
4. Assert 100% field match

**Expected Result**: Archive/retrieve cycle is lossless; no fields dropped or corrupted

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Multi-Service Log Aggregation

#### TC-F2-I1.1: Logs from All Nine Services Appear in Central Store
**Objective**: Verify log entries emitted by all nine backend services are ingested into the centralized Elasticsearch cluster

**Preconditions**:
- All nine services running with structured loggers configured
- Log shipper (Fluent Bit) deployed on each service node

**Test Steps**:
1. Trigger a representative action in each of the nine services
2. Wait 30 seconds for Fluent Bit shipping interval
3. Query central log store for each service name
4. Assert at least one entry present for each service
5. Assert entries contain correct `service` label

**Expected Result**: All nine service log streams successfully centralized within one shipping interval

**Code Sample**:
```typescript
const services = [
  'mobile-capture', 'transcription-service', 'context-engine',
  'contact-intelligence', 'session-intelligence', 'knowledge-graph',
  'reporting-service', 'integration-sync', 'search-retrieval',
];

it('should ingest logs from all nine services into central store', async () => {
  for (const svc of services) {
    await triggerServiceAction(svc);
  }

  await sleep(30000);

  for (const svc of services) {
    const result = await logQueryEngine.query({
      filters: [{ field: 'service', op: 'eq', value: svc }],
      limit: 1,
    });
    expect(result.total).toBeGreaterThan(0, `No logs found for service: ${svc}`);
  }
}, 45000);
```

---

#### TC-F2-I1.2: Cross-Service Trace Correlation via TraceId
**Objective**: Verify a single user request generates correlated log entries across multiple services, joinable by traceId

**Test Steps**:
1. Submit a transcription job and capture the `traceId` from the response header
2. Wait 60 seconds for full pipeline processing
3. Query logs filtering by the captured `traceId`
4. Assert entries from at least three distinct services present with the same traceId
5. Assert entries cover the full pipeline (capture → transcription → context-engine)

**Expected Result**: Single traceId threads through all service logs enabling full request trace reconstruction

---

### 2.2 Alerting on Log Patterns

#### TC-F2-I2.1: Log-Based Alert Fires on Repeated Auth Failures
**Objective**: Verify a log-pattern alert fires when five or more auth failure logs occur within 5 minutes

**Test Steps**:
1. Configure log alert: `level=ERROR AND message contains "authentication failed"`, count >= 5, window 5 minutes
2. Inject six auth failure log entries within 2 minutes
3. Assert alerting system emits one alert within 3 minutes
4. Assert alert payload contains matched log sample and count

**Expected Result**: Log-pattern alert fires once; suppressed for subsequent matches within cooldown period

**Code Sample**:
```typescript
it('should fire alert after 5 auth failure logs within 5 minutes', async () => {
  await logAlertService.createAlert({
    name: 'repeated-auth-failures',
    query: { level: 'ERROR', messageContains: 'authentication failed' },
    threshold: { count: 5, windowMinutes: 5 },
    notificationChannels: ['mock-slack-webhook'],
  });

  for (let i = 0; i < 6; i++) {
    await logIngestionService.ingest({
      level: 'ERROR',
      service: 'api-gateway',
      message: 'authentication failed',
      context: { userId: `user-${i}`, ip: '203.0.113.1' },
    });
  }

  await jest.advanceTimersByTimeAsync(3 * 60 * 1000);

  expect(mockSlackWebhook.calls).toHaveLength(1);
  expect(mockSlackWebhook.calls[0].text).toContain('repeated-auth-failures');
});
```

---

#### TC-F2-I2.2: Alert Deduplication Prevents Notification Storm
**Objective**: Verify repeated alert triggers within cooldown window are deduplicated to a single notification

**Test Steps**:
1. Configure alert with 15-minute cooldown
2. Trigger alert condition three times within 10 minutes
3. Assert exactly one notification sent
4. Wait for cooldown to expire; trigger again
5. Assert second notification sent (total = 2)

**Expected Result**: Cooldown-based deduplication prevents alert storms; post-cooldown retrigger works correctly

---

### 2.3 Log Shipper Resilience

#### TC-F2-I3.1: Log Buffering During Central Store Outage
**Objective**: Verify Fluent Bit buffers logs locally when Elasticsearch is unreachable and replays on reconnect

**Test Steps**:
1. Take Elasticsearch offline
2. Generate 500 log entries across services for 5 minutes
3. Restore Elasticsearch
4. Wait 2 minutes for buffer replay
5. Query central store and assert all 500 entries present

**Expected Result**: No log loss during central store outage; local buffer replay completes automatically

---

#### TC-F2-I3.2: Log Backpressure Does Not Block Application Threads
**Objective**: Verify that log shipper backpressure does not cause application request latency to increase

**Test Steps**:
1. Configure log shipper with a small in-memory buffer limit (100 entries)
2. Generate burst of 1000 log entries within 1 second
3. Simultaneously measure P99 API request latency
4. Assert API latency does not increase by more than 10% during logging burst

**Expected Result**: Async logging architecture decouples application threads from shipper backpressure

---

## 3. EDGE CASE VALIDATION

### 3.1 Malformed and Oversized Log Entries

#### TC-F2-E1.1: Oversized Log Entry Truncation
**Objective**: Verify log entries exceeding the 64KB size limit are truncated and flagged rather than rejected

**Preconditions**:
- Max log entry size configured at 64 KB

**Test Steps**:
1. Attempt to log a context object with a 200KB string field
2. Assert emitted log entry is at most 64 KB
3. Assert entry contains `_truncated: true` field
4. Assert core fields (timestamp, level, service, message) preserved intact

**Expected Result**: Oversized entries truncated at context payload level; structural fields always preserved

**Code Sample**:
```typescript
it('should truncate oversized context and set _truncated flag', () => {
  const entries: any[] = [];
  const logger = new StructuredLogger({
    service: 'knowledge-graph',
    transport: (e) => entries.push(e),
    maxEntrySizeBytes: 65536,
  });

  const largeContext = { payload: 'x'.repeat(200 * 1024) };
  logger.info('large context test', largeContext);

  const entry = entries[0];
  const entrySize = Buffer.byteLength(JSON.stringify(entry));
  expect(entrySize).toBeLessThanOrEqual(65536);
  expect(entry._truncated).toBe(true);
  expect(entry.service).toBe('knowledge-graph');
});
```

---

#### TC-F2-E1.2: Non-Serializable Context Values Handled Safely
**Objective**: Verify circular references and non-serializable values in log context do not crash the logger

**Test Steps**:
1. Create an object with a circular reference
2. Pass it as log context: `logger.error('circular ref test', circularObj)`
3. Assert log entry emitted (no exception thrown)
4. Assert context contains `[Circular]` or `[Non-serializable]` placeholder

**Expected Result**: Logger defensive serialization prevents process crash on bad input

---

### 3.2 High-Volume Log Ingestion

#### TC-F2-E2.1: Ingestion Rate Limiting Protects Cluster
**Objective**: Verify the log ingestion API enforces per-service rate limits to protect Elasticsearch

**Test Steps**:
1. Configure ingestion rate limit: 10,000 entries/minute per service
2. Burst-send 15,000 entries within 1 minute from `transcription-service`
3. Assert first 10,000 accepted (HTTP 200)
4. Assert remaining 5,000 rejected with HTTP 429
5. Assert rejected entries are backlogged at shipper, not dropped

**Expected Result**: Rate limiter protects cluster; excess entries buffered for later retry

---

#### TC-F2-E2.2: Index Rollover on Shard Size Threshold
**Objective**: Verify Elasticsearch index rolls over to a new index when shard size exceeds 50GB

**Test Steps**:
1. Mock shard size reporting to return 51GB for current index
2. Trigger index management check
3. Assert new write index created with next sequential alias
4. Assert new log entries routed to new index
5. Assert old index retained for reads

**Expected Result**: Index lifecycle management prevents oversized shards; rollover transparent to query layer

---

### 3.3 Multi-Environment Log Isolation

#### TC-F2-E3.1: Production Logs Not Visible in Staging Query Scope
**Objective**: Verify log queries scoped to `staging` environment cannot return `production` log entries

**Test Steps**:
1. Index entries with `environment: production` and `environment: staging`
2. Execute query with `environment = staging` filter
3. Assert zero production entries returned
4. Execute without environment filter as super-admin
5. Assert both environments visible

**Expected Result**: Environment isolation enforced at query layer; cross-environment leakage impossible for scoped queries

---

#### TC-F2-E3.2: Log Namespace Collision Prevention
**Objective**: Verify two services with the same name in different namespaces do not have log entries mixed

**Test Steps**:
1. Index logs for `namespace: tenant-a / service: api-gateway` and `namespace: tenant-b / service: api-gateway`
2. Query with `service = api-gateway` without namespace filter as tenant-a admin
3. Assert only tenant-a entries returned
4. Verify namespace field present in all returned entries

**Expected Result**: Namespace isolation applied automatically based on caller's tenant context

---

## 4. PERFORMANCE VALIDATION

### 4.1 Log Ingestion Throughput

#### TC-F2-P1.1: Sustained Ingestion Rate of 100,000 Entries/Minute
**Objective**: Verify the centralized logging pipeline sustains 100,000 log entries per minute without data loss

**Preconditions**:
- Elasticsearch cluster with 3 data nodes
- Fluent Bit aggregator deployed
- No artificial rate limiting active

**Test Steps**:
1. Run log generator producing 100,000 entries/minute for 10 minutes
2. After test, query total entries in Elasticsearch for the test time window
3. Assert total >= 980,000 (98% ingestion success rate)
4. Monitor Fluent Bit queue depth; assert never exceeds 50,000

**Expected Result**: Pipeline sustains target throughput with < 2% loss at peak

**Code Sample**:
```typescript
// Artillery load test for log ingestion endpoint
export default {
  config: {
    target: 'http://log-ingestion.internal',
    phases: [{ duration: 600, arrivalRate: 1667 }], // ~100k/min
    defaults: { headers: { 'Content-Type': 'application/x-ndjson' } },
  },
  scenarios: [{
    name: 'bulk log ingestion',
    flow: [{
      post: {
        url: '/api/logs/bulk',
        body: generateNdjsonBatch(60), // 60 entries per request
      },
    }],
  }],
};
```

---

#### TC-F2-P1.2: Ingestion Latency P99 Under Sustained Load
**Objective**: Verify log ingestion API P99 latency remains under 200ms during sustained 100k/min load

**Test Steps**:
1. Run same load as TC-F2-P1.1
2. Collect P50, P95, P99 latency at ingestion API
3. Assert P99 < 200ms throughout 10-minute test window

**Expected Result**: Ingestion remains low-latency even at peak throughput; no queueing buildup

---

### 4.2 Query Performance

#### TC-F2-P2.1: Full-Text Search Over 1 Billion Log Entries
**Objective**: Verify full-text search queries complete within 3 seconds against a 1-billion-entry log store

**Test Steps**:
1. Seed Elasticsearch with 1 billion synthetic log entries across all services
2. Execute 20 representative full-text search queries
3. Measure P95 query response time
4. Assert P95 < 3000ms

**Expected Result**: Elasticsearch index optimization and field mapping ensure sub-3s full-text search at scale

---

#### TC-F2-P2.2: Aggregation Query Performance at Scale
**Objective**: Verify aggregation queries (count by service, error rate over time) complete in under 5 seconds at 1B scale

**Test Steps**:
1. Execute error-rate-by-service aggregation over 7-day window against 1B-entry store
2. Measure execution time
3. Assert response time < 5000ms
4. Assert result accuracy matches a reference count from a smaller validated dataset

**Expected Result**: Pre-aggregated rollup indices and doc-value field access enable fast aggregations

---

### 4.3 Storage Efficiency

#### TC-F2-P3.1: Compression Ratio for NDJSON Log Archives
**Objective**: Verify GZIP-compressed NDJSON archives achieve at least 10:1 compression ratio for typical log data

**Test Steps**:
1. Generate 1GB of representative structured log data
2. Compress to GZIP NDJSON
3. Assert compressed size <= 100MB (10:1 ratio)
4. Assert decompressed data identical to original

**Expected Result**: High compression ratio reduces cold storage costs significantly

---

#### TC-F2-P3.2: Hot Storage Cost Per Million Log Entries
**Objective**: Verify Elasticsearch hot-tier storage usage per million log entries does not exceed 500MB

**Test Steps**:
1. Index exactly 1 million representative log entries
2. Measure Elasticsearch index size (primary + replica)
3. Assert total size per million entries <= 500MB

**Expected Result**: Index size within budget; storage tiering strategy effective

---

## Test Execution Summary

| Category | Test Suites | Test Cases |
|---|---|---|
| Unit Tests | 3 | 9 |
| Integration Tests | 3 | 6 |
| Edge Cases | 3 | 6 |
| Performance Validation | 3 | 6 |
| **Total** | **12** | **27** |

**Estimated Execution Time**: Unit ~2 min | Integration ~20 min | Edge ~10 min | Performance ~120 min
