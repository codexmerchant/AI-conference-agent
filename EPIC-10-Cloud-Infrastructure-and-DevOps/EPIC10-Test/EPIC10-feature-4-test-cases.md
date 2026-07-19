# EPIC10 Feature 4 — Event Streaming Platform — Test Cases

## Test Overview
Comprehensive test suite for the Event Streaming Platform covering unit tests, integration tests, edge cases, and performance validation. Tests validate Kafka topic creation, consumer group lag monitoring, message ordering guarantees, partition assignment, dead-letter queue handling, and throughput under conference-day event bursts.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Kafka Producer Configuration

#### TC-F4-U1.1: Producer Sends Message to Correct Topic with Partition Key
**Objective**: Verify that the event producer sends messages to the correct Kafka topic and uses the conference session ID as the partition key to guarantee ordering within a session.

**Preconditions**:
- Kafka mock (kafkajs mock) initialized
- Topic `conference.session.events` created with 12 partitions

**Test Steps**:
1. Instantiate `ConferenceEventProducer` with mock Kafka client
2. Call `producer.send({ sessionId: 'sess-001', type: 'TRANSCRIPT_SEGMENT', payload: {...} })`
3. Assert message sent to topic `conference.session.events`
4. Assert `key` field equals `sess-001` (partition key)
5. Assert message value is valid JSON

**Expected Result**: Message routed to correct topic with session-scoped partition key; JSON-serialized payload.

**Code Sample**:
```typescript
describe('ConferenceEventProducer', () => {
  it('should send message to correct topic with session ID as partition key', async () => {
    const mockKafka = createMockKafka();
    const producer = new ConferenceEventProducer({ kafka: mockKafka, topic: 'conference.session.events' });

    await producer.send({
      sessionId: 'sess-001',
      type: 'TRANSCRIPT_SEGMENT',
      payload: { text: 'Hello world', timestamp: 1720000000 },
    });

    const sent = mockKafka.getSentMessages('conference.session.events');
    expect(sent).toHaveLength(1);
    expect(sent[0].key).toBe('sess-001');
    expect(JSON.parse(sent[0].value.toString()).type).toBe('TRANSCRIPT_SEGMENT');
  });
});
```

---

#### TC-F4-U1.2: Producer Retries on Transient Kafka Leader Election
**Objective**: Verify the producer retries message delivery up to 5 times with exponential backoff when the partition leader is temporarily unavailable.

**Test Steps**:
1. Configure producer: `retries: 5, initialRetryTime: 100ms`
2. Mock Kafka to return `LeaderNotAvailable` for first 3 attempts
3. Call `producer.send()`
4. Assert message eventually delivered on 4th attempt
5. Assert retry count recorded in producer metrics

**Expected Result**: Producer retries transparently; message delivered after transient failure; application does not see error.

**Code Sample**:
```typescript
it('should retry on LeaderNotAvailable and eventually deliver message', async () => {
  let attempts = 0;
  mockKafka.onSend(() => {
    attempts++;
    if (attempts < 4) throw new KafkaError('LeaderNotAvailable');
  });

  await expect(producer.send({ sessionId: 'sess-002', type: 'SESSION_START' })).resolves.toBeDefined();
  expect(attempts).toBe(4);
});
```

---

#### TC-F4-U1.3: Idempotent Producer Deduplicates Duplicate Sends
**Objective**: Verify that with `idempotent: true`, sending the same message twice (network retry scenario) results in exactly one message written to the topic.

**Test Steps**:
1. Enable idempotent producer mode
2. Send message with sequence number 42
3. Re-send same message (simulating retry after timeout)
4. Assert Kafka broker receives only one unique sequence entry
5. Assert consumer reads only one message

**Expected Result**: Exactly-once delivery at producer level; no duplicates in topic.

**Code Sample**:
```typescript
it('should deduplicate messages with idempotent producer', async () => {
  const producer = new ConferenceEventProducer({ kafka: mockKafka, idempotent: true });
  const message = { sessionId: 'sess-003', type: 'NOTE_CREATED', sequenceId: 42 };

  await producer.send(message);
  await producer.send(message); // simulated duplicate retry

  const records = mockKafka.getAllMessages('conference.session.events');
  const unique = records.filter((m) => JSON.parse(m.value).sequenceId === 42);
  expect(unique).toHaveLength(1);
});
```

---

### 1.2 Consumer Group Lag Monitoring

#### TC-F4-U2.1: Consumer Lag Calculated Correctly from Offset Delta
**Objective**: Verify the lag monitor correctly calculates per-partition consumer lag as the difference between log-end offset and committed offset.

**Preconditions**:
- Topic `conference.session.events` with 4 partitions
- Consumer group `transcription-worker` committed offsets available

**Test Steps**:
1. Mock offset response: partition 0 log-end=1000, committed=950
2. Mock offset response: partition 1 log-end=500, committed=500
3. Call `lagMonitor.getLag('transcription-worker', 'conference.session.events')`
4. Assert partition 0 lag = 50
5. Assert partition 1 lag = 0
6. Assert total group lag = 50

**Expected Result**: Lag calculation accurate per partition and in aggregate.

**Code Sample**:
```typescript
describe('ConsumerLagMonitor', () => {
  it('should calculate consumer lag as offset delta per partition', async () => {
    const monitor = new ConsumerLagMonitor({ kafka: mockKafka });
    mockKafka.setOffsets([
      { partition: 0, logEndOffset: 1000, committedOffset: 950 },
      { partition: 1, logEndOffset: 500, committedOffset: 500 },
    ]);

    const lag = await monitor.getLag('transcription-worker', 'conference.session.events');

    expect(lag.byPartition[0]).toBe(50);
    expect(lag.byPartition[1]).toBe(0);
    expect(lag.total).toBe(50);
  });
});
```

---

#### TC-F4-U2.2: Alert Triggered When Consumer Lag Exceeds 10,000 Messages
**Objective**: Verify the lag alerting system fires an alert when any consumer group's total lag exceeds the 10,000 message threshold.

**Test Steps**:
1. Set consumer group lag to 12,000 messages
2. Run lag evaluation
3. Assert alert fired with severity `WARNING`
4. Assert alert payload includes group name, topic, and lag count

**Expected Result**: Alert fires above threshold; suppressed at or below threshold.

**Code Sample**:
```typescript
it('should alert when consumer lag exceeds 10000 messages', async () => {
  const alerts: LagAlert[] = [];
  const monitor = new ConsumerLagMonitor({ kafka: mockKafka, onAlert: (a) => alerts.push(a) });
  mockKafka.setTotalLag('transcription-worker', 12_000);

  await monitor.evaluate();

  expect(alerts).toHaveLength(1);
  expect(alerts[0].severity).toBe('WARNING');
  expect(alerts[0].group).toBe('transcription-worker');
  expect(alerts[0].lag).toBe(12_000);
});
```

---

#### TC-F4-U2.3: Lag Metric Published to Prometheus on Every Scrape
**Objective**: Verify the Kafka consumer lag exporter publishes a `kafka_consumer_group_lag` gauge metric per partition on every Prometheus scrape.

**Test Steps**:
1. Configure metrics exporter with 3 partitions, known lags
2. Call `metricsExporter.export()`
3. Assert Prometheus output contains `kafka_consumer_group_lag{group="transcription-worker",partition="0"}` entries
4. Assert values match known lag

**Expected Result**: Prometheus scrape receives accurate per-partition lag gauges for dashboards and alerting.

**Code Sample**:
```typescript
it('should export kafka consumer lag as Prometheus gauge', async () => {
  const exporter = new KafkaLagPrometheusExporter({ consumer: mockConsumer });
  const metrics = await exporter.export();

  expect(metrics).toContain('kafka_consumer_group_lag{group="transcription-worker",partition="0"}');
  expect(metrics).toContain('50'); // lag value
});
```

---

### 1.3 Dead Letter Queue Handling

#### TC-F4-U3.1: Message Routed to DLQ After 3 Processing Failures
**Objective**: Verify that a message that fails processing 3 times is moved to the dead-letter topic rather than blocking the partition.

**Test Steps**:
1. Configure consumer: `maxRetries: 3, dlqTopic: 'conference.events.dlq'`
2. Mock message processor to always throw `ProcessingError`
3. Consume message and trigger retries
4. Assert message sent to DLQ topic after 3rd failure
5. Assert original topic consumer offset advanced

**Expected Result**: Failed messages quarantined in DLQ; partition consumer unblocked.

**Code Sample**:
```typescript
describe('DeadLetterQueueRouter', () => {
  it('should route message to DLQ after 3 failed processing attempts', async () => {
    const dlqMessages: KafkaMessage[] = [];
    const consumer = new ConferenceEventConsumer({
      kafka: mockKafka,
      maxRetries: 3,
      dlqTopic: 'conference.events.dlq',
      onDlq: (m) => dlqMessages.push(m),
      processor: async () => { throw new Error('ProcessingError'); },
    });

    await consumer.processMessage(testMessage);

    expect(dlqMessages).toHaveLength(1);
    expect(dlqMessages[0].headers?.['x-retry-count']).toBe('3');
    expect(dlqMessages[0].headers?.['x-original-topic']).toBe('conference.session.events');
  });
});
```

---

#### TC-F4-U3.2: DLQ Message Includes Error Metadata Headers
**Objective**: Verify that messages in the DLQ carry enriched headers: original topic, partition, offset, error message, and retry count.

**Test Steps**:
1. Route a message to DLQ after max retries
2. Inspect DLQ message headers
3. Assert all required metadata headers present

**Expected Result**: DLQ messages fully annotated for debugging and potential reprocessing.

---

#### TC-F4-U3.3: DLQ Replay Re-Submits Message to Original Topic
**Objective**: Verify the DLQ replay tool can read a message from the DLQ and re-submit it to the original topic for reprocessing after the underlying bug is fixed.

**Test Steps**:
1. Place message in DLQ with `x-original-topic: conference.session.events`
2. Run `dlqReplay.replay({ messageId: 'msg-001' })`
3. Assert message appears in `conference.session.events` topic
4. Assert DLQ message marked as replayed

**Expected Result**: Controlled DLQ replay without data loss; original topic receives re-queued message.

**Code Sample**:
```typescript
it('should replay DLQ message back to original topic', async () => {
  const replay = new DlqReplayTool({ kafka: mockKafka });
  await replay.replay({ messageId: 'msg-001', dlqTopic: 'conference.events.dlq' });

  const replayed = mockKafka.getSentMessages('conference.session.events');
  expect(replayed).toHaveLength(1);
  expect(replayed[0].headers?.['x-replayed']).toBe('true');
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 End-to-End Message Flow

#### TC-F4-I1.1: Session Start Event Consumed by All Downstream Consumers
**Objective**: Verify that when a `SESSION_START` event is produced, all three registered consumer groups (transcription, analytics, notification) receive and process it.

**Preconditions**:
- Kafka running in Docker Compose test environment
- Three consumer groups running: `transcription-worker`, `analytics-consumer`, `notification-service`
- Topic with replication factor 1 for test

**Test Steps**:
1. Produce one `SESSION_START` event to `conference.session.events`
2. Wait up to 10 seconds for all three consumers to process
3. Assert each consumer's acknowledgment recorded
4. Assert all consumer group offsets advanced by 1

**Expected Result**: Fan-out delivery confirmed; all consumers receive the event.

**Code Sample**:
```typescript
describe('Kafka fan-out integration', () => {
  it('should deliver SESSION_START to all consumer groups', async () => {
    const producer = createProducer(kafkaConfig);
    await producer.send({ topic: 'conference.session.events', messages: [{ key: 'sess-100', value: JSON.stringify({ type: 'SESSION_START' }) }] });

    await waitForConsumers(['transcription-worker', 'analytics-consumer', 'notification-service'], 10_000);

    for (const group of ['transcription-worker', 'analytics-consumer', 'notification-service']) {
      const lag = await getLag(group, 'conference.session.events');
      expect(lag.total).toBe(0);
    }
  });
});
```

---

#### TC-F4-I1.2: Message Ordering Preserved Within Session Partition
**Objective**: Verify that 100 events produced for the same session arrive at the consumer in the exact order they were produced.

**Test Steps**:
1. Produce 100 events for `sess-200` with sequence numbers 0–99
2. Consume all 100 events from `transcription-worker`
3. Assert sequence numbers arrive in order 0, 1, 2, ..., 99

**Expected Result**: Ordering preserved within partition; no reordering due to retries or network effects.

**Code Sample**:
```typescript
it('should preserve message order within a session partition', async () => {
  const messages = Array.from({ length: 100 }, (_, i) => ({
    key: 'sess-200',
    value: JSON.stringify({ seq: i }),
  }));

  await producer.sendBatch({ topic: 'conference.session.events', messages });

  const received: number[] = [];
  await consumer.run({ eachMessage: async ({ message }) => {
    received.push(JSON.parse(message.value!.toString()).seq);
  }});

  await waitForMessages(received, 100);
  expect(received).toEqual(Array.from({ length: 100 }, (_, i) => i));
});
```

---

### 2.2 Consumer Group Rebalancing

#### TC-F4-I2.1: New Consumer Instance Triggers Rebalance and Receives Assigned Partitions
**Objective**: Verify that adding a new consumer to an existing group triggers a rebalance that assigns partitions to the new instance within 10 seconds.

**Test Steps**:
1. Start consumer group with 2 consumers (6 partitions each)
2. Add a 3rd consumer instance
3. Assert rebalance event occurs within 5 seconds
4. Assert partitions redistributed to 3 consumers (4 each)

**Expected Result**: Rebalance automatic and fast; new consumer receives partition assignments within 10 seconds.

---

#### TC-F4-I2.2: No Messages Lost During Consumer Group Rebalance
**Objective**: Verify that during a rebalance triggered by a consumer crash, no messages are lost or duplicated; at-least-once delivery maintained.

**Test Steps**:
1. Start 3 consumer instances processing events
2. Kill consumer instance 2 mid-processing
3. Assert rebalance occurs; partitions reassigned to instances 1 and 3
4. Assert all messages processed (compare to produced count)

**Expected Result**: At-least-once delivery during rebalance; no message gaps.

---

### 2.3 Schema Registry Enforcement

#### TC-F4-I3.1: Invalid Event Schema Rejected by Producer
**Objective**: Verify that a producer attempting to send an event that violates the Avro schema registered for the topic receives an error before the message is written.

**Test Steps**:
1. Register schema for `conference.session.events` in Schema Registry
2. Attempt to send event missing required `sessionId` field
3. Assert producer throws `SchemaValidationError`
4. Assert no message written to topic

**Expected Result**: Schema enforcement at producer prevents malformed events from entering the stream.

**Code Sample**:
```typescript
it('should reject message missing required sessionId field', async () => {
  const producer = new SchemaAwareProducer({ schemaRegistry: 'http://schema-registry:8081' });

  await expect(producer.send({
    topic: 'conference.session.events',
    message: { type: 'SESSION_START' }, // missing sessionId
  })).rejects.toThrow('SchemaValidationError: required field "sessionId" missing');
});
```

---

#### TC-F4-I3.2: Schema Evolution Allows Backward-Compatible Field Addition
**Objective**: Verify that adding a new optional field to the event schema (backward-compatible evolution) does not break existing consumers reading old-format messages.

**Test Steps**:
1. Register schema v1 (without `deviceType` field)
2. Produce v1 messages
3. Register schema v2 (adds optional `deviceType` field)
4. Configure consumer to use v2 schema
5. Assert consumer can read v1 messages with `deviceType` defaulting to null

**Expected Result**: Backward-compatible schema evolution; existing consumers unaffected.

---

## 3. EDGE CASE VALIDATION

### 3.1 High Partition Count Topics

#### TC-F4-E1.1: 1000 Sessions Routed Across 100 Partitions Without Hot Spots
**Objective**: Verify that hashing 1000 distinct session IDs across 100 partitions produces a balanced distribution (no partition handling more than 15 sessions).

**Test Steps**:
1. Hash 1000 session IDs using partition key algorithm
2. Count assignments per partition
3. Assert max partition load <= 15 (expected ~10 per partition)

**Expected Result**: Balanced partition assignment; no hot-spot partitions.

**Code Sample**:
```typescript
it('should evenly distribute 1000 sessions across 100 partitions', () => {
  const partitionCount = 100;
  const sessionIds = Array.from({ length: 1000 }, (_, i) => `sess-${i}`);
  const distribution = new Map<number, number>();

  for (const id of sessionIds) {
    const partition = murmur2(id) % partitionCount;
    distribution.set(partition, (distribution.get(partition) ?? 0) + 1);
  }

  const maxLoad = Math.max(...distribution.values());
  expect(maxLoad).toBeLessThanOrEqual(15);
});
```

---

#### TC-F4-E1.2: Consumer Handles Partition Reassignment During Active Processing Without Duplicate Commits
**Objective**: Verify that when a partition is reassigned during processing, the consumer does not commit the offset of a message it did not finish processing.

**Test Steps**:
1. Consumer begins processing message at offset 100
2. Trigger rebalance mid-processing
3. Assert offset 100 not committed until processing completes
4. Assert reassigned consumer picks up from offset 100

**Expected Result**: Offset commit integrity maintained across rebalances; no skipped or double-processed messages.

---

### 3.2 Broker Failure Scenarios

#### TC-F4-E2.1: Producer Continues Writing When One of Three Brokers Fails
**Objective**: Verify that with replication factor 3 and min-ISR 2, losing one broker does not interrupt producers.

**Test Steps**:
1. Start Kafka cluster with 3 brokers
2. Kill broker 2
3. Produce 100 messages
4. Assert all 100 messages written successfully
5. Assert ISR for affected partitions shrinks to 2

**Expected Result**: Broker failure transparent to producers; messages written to remaining ISR members.

---

#### TC-F4-E2.2: Consumer Reconnects After Broker Restart Within 30 Seconds
**Objective**: Verify that after a Kafka broker restart, consumers automatically reconnect and resume consuming without manual intervention within 30 seconds.

**Test Steps**:
1. Restart the broker hosting the consumer's assigned partitions
2. Monitor consumer reconnection
3. Assert consumer resumes consuming within 30 seconds
4. Assert no messages missed (lag returns to pre-restart level)

**Expected Result**: Auto-reconnect within 30-second SLA; consumer group continues processing.

---

### 3.3 Message Size and Rate Limits

#### TC-F4-E3.1: Oversized Message (> 1MB) Rejected by Broker
**Objective**: Verify the Kafka broker rejects messages exceeding the configured `message.max.bytes` (1 MB) and the producer receives a clear error.

**Test Steps**:
1. Configure broker: `message.max.bytes=1048576`
2. Send a message with a 1.5 MB payload
3. Assert producer receives `MessageSizeTooLarge` error
4. Assert no partial write to topic

**Expected Result**: Oversized message rejected at broker; application handles error gracefully.

**Code Sample**:
```typescript
it('should reject messages exceeding 1MB with MessageSizeTooLarge', async () => {
  const largePayload = Buffer.alloc(1.5 * 1024 * 1024, 'x').toString();
  await expect(producer.send({ sessionId: 'sess-big', type: 'LARGE_EVENT', payload: largePayload }))
    .rejects.toThrow('MessageSizeTooLarge');
});
```

---

#### TC-F4-E3.2: Rate-Limited Producer Backs Off When Broker Quota Exceeded
**Objective**: Verify that when the producer exceeds the configured broker-side quota (50 MB/s), it receives throttle responses and backs off rather than crashing.

**Test Steps**:
1. Configure broker quota: 50 MB/s for producer client
2. Burst-produce at 200 MB/s
3. Assert producer receives `ThrottlingException` responses
4. Assert producer applies backoff and eventually completes within 2x the unthrottled time
5. Assert all messages delivered (just slower)

**Expected Result**: Graceful throttle backoff; all messages eventually delivered; no data loss.

---

## 4. PERFORMANCE VALIDATION

### 4.1 Producer Throughput

#### TC-F4-P1.1: Single Producer Achieves 50,000 Messages/Second
**Objective**: Verify that a single Kafka producer with batching and compression can achieve at least 50,000 messages per second on the conference event topic.

**Preconditions**:
- Kafka cluster: 3 brokers
- Producer config: `batchSize: 65536`, `linger.ms: 5`, `compression: snappy`
- Message size: 512 bytes average

**Test Steps**:
1. Run producer for 60 seconds, measuring messages sent per second
2. Assert sustained throughput >= 50,000 msg/s
3. Assert p99 send latency < 20 ms

**Expected Result**: Producer throughput sufficient for peak conference load; latency acceptable.

**Code Sample**:
```shell
# Kafka performance test for producer throughput
kafka-producer-perf-test.sh \
  --topic conference.session.events \
  --num-records 3000000 \
  --record-size 512 \
  --throughput -1 \
  --producer-props \
    bootstrap.servers=kafka:9092 \
    compression.type=snappy \
    batch.size=65536 \
    linger.ms=5
```

---

#### TC-F4-P1.2: Consumer Processes 30,000 Messages/Second Without Lag Growth
**Objective**: Verify the transcription-worker consumer group processes 30,000 messages per second without consumer lag growing over time.

**Test Steps**:
1. Produce messages at 30,000 msg/s sustained for 5 minutes
2. Monitor consumer group lag every 10 seconds
3. Assert lag does not increase over the 5-minute window
4. Assert consumer throughput >= production rate

**Expected Result**: Consumer keeps pace with producer; lag stable; no backlog build-up.

---

### 4.2 End-to-End Event Latency

#### TC-F4-P2.1: Event Produced to Consumed in Under 100ms p99
**Objective**: Measure the end-to-end latency from `producer.send()` completion to consumer's `eachMessage` callback for conference events.

**Test Steps**:
1. Embed timestamp in message at produce time
2. Record timestamp in consumer callback
3. Calculate delta for 10,000 messages
4. Assert p50 < 20 ms, p99 < 100 ms

**Expected Result**: Low-latency event streaming supports real-time transcription pipeline.

**Code Sample**:
```typescript
it('should deliver messages from producer to consumer within 100ms p99', async () => {
  const latencies: number[] = [];

  await consumer.run({
    eachMessage: async ({ message }) => {
      const sent = Number(message.headers?.['x-send-time']);
      latencies.push(Date.now() - sent);
    },
  });

  for (let i = 0; i < 10_000; i++) {
    await producer.send({
      topic: 'conference.session.events',
      messages: [{ key: 'sess-lat', value: '{}', headers: { 'x-send-time': String(Date.now()) } }],
    });
  }

  await waitForMessages(latencies, 10_000);
  const p99 = percentile(99, latencies);
  expect(p99).toBeLessThan(100);
});
```

---

#### TC-F4-P2.2: Consumer Lag Recovers to Zero Within 5 Minutes After Burst
**Objective**: Verify that after a sudden burst creates a 100,000-message lag, the consumer group recovers and processes the backlog within 5 minutes.

**Test Steps**:
1. Produce 100,000 messages at maximum rate (burst)
2. Verify consumer lag spikes to ~100,000
3. Allow consumer group to process at sustained rate
4. Assert lag reaches 0 within 5 minutes

**Expected Result**: Consumer backlog recovery within 5-minute SLA; event pipeline self-healing.

---

### 4.3 Kafka Cluster Stability

#### TC-F4-P3.1: Kafka Cluster Handles 1 Million Messages Per Day Without Disk Pressure
**Objective**: Verify that with the configured log retention (7 days) and segment size (1 GB), disk usage stays within 80% of allocated storage at peak conference load (1M events/day).

**Test Steps**:
1. Calculate expected storage: 1M events × 512 bytes × 7 days = ~3.6 GB
2. Run 24-hour simulation at 1M events/day
3. Monitor disk usage
4. Assert disk stays below 80% of allocated 10 GB volume

**Expected Result**: Storage projection accurate; disk pressure managed by retention policy.

---

#### TC-F4-P3.2: Replication Lag Stays Below 500ms Under Full Conference Load
**Objective**: Verify that under full production load, follower replicas stay within 500 ms of the leader (replication lag) ensuring data durability and fast failover.

**Test Steps**:
1. Drive 50,000 msg/s load on the cluster
2. Monitor `kafka.server:type=ReplicaManager,name=ReplicaMaxLagTimeMs` metric
3. Assert maximum replication lag < 500 ms across all partitions

**Expected Result**: Replication lag bounded under load; failover RPO within SLA.

**Code Sample**:
```shell
# Monitor Kafka replication lag via JMX
kafka-run-class.sh kafka.tools.JmxTool \
  --jmx-url service:jmx:rmi:///jndi/rmi://kafka-broker-1:9999/jmxrmi \
  --object-name 'kafka.server:type=ReplicaManager,name=ReplicaMaxLagTimeMs' \
  --attributes Value \
  --reporting-interval 1000
```

---

## Test Execution Summary

| Category | Suites | Test Cases |
|---|---|---|
| Unit Tests | 3 | 9 |
| Integration Tests | 3 | 6 |
| Edge Case Validation | 3 | 6 |
| Performance Validation | 3 | 6 |
| **Total** | **12** | **~27** |

**Coverage**: Kafka producer routing, idempotent delivery, consumer lag monitoring, DLQ routing, fan-out delivery, message ordering, schema validation, partition distribution, broker failure, oversized messages, producer/consumer throughput, end-to-end latency, replication lag, disk capacity.
