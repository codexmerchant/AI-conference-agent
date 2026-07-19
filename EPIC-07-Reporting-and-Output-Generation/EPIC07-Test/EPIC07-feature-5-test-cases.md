# EPIC07 Feature 5 — Opportunity Detection — Test Cases

## Test Overview
Comprehensive test suite for Opportunity Detection covering unit tests, integration tests, edge cases, and performance validation. Opportunity Detection uses NLP and LLM-based scoring to identify sales opportunities, partnership signals, and high-value leads from meeting transcripts and conversation context, scoring each with a confidence level and recommended next action.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Signal Extraction from Transcripts
#### TC-F5-U1.1: Extract Budget Intent Signals from Transcript
**Objective**: Verify that the signal extractor identifies budget-related phrases and marks them as `BUDGET_SIGNAL` with correct character offsets.
**Preconditions**: Transcript containing `"We have about $200k approved for this quarter"`.
**Test Steps**:
1. Call `extractOpportunitySignals(transcript)`.
2. Assert result contains a signal with `type: 'BUDGET_SIGNAL'`.
3. Assert signal `value` is `'$200k'`.
4. Assert character offset matches the position in transcript.
**Expected Result**: `BUDGET_SIGNAL` extracted with correct value and offset.
**Code Sample**:
```typescript
import { extractOpportunitySignals } from '../src/opportunities/signalExtractor';

it('detects a budget intent signal in the transcript', () => {
  const transcript = 'We have about $200k approved for this quarter and need to spend it.';
  const signals = extractOpportunitySignals(transcript);
  const budget = signals.find(s => s.type === 'BUDGET_SIGNAL');
  expect(budget).toBeDefined();
  expect(budget!.value).toBe('$200k');
});
```

#### TC-F5-U1.2: Extract Decision-Maker Title Signals
**Objective**: Confirm that mentions of decision-maker titles (`CTO`, `VP of Engineering`, `Head of Procurement`) are extracted as `DECISION_MAKER_SIGNAL`.
**Preconditions**: Transcript with `"I'll need to loop in our VP of Engineering before we commit."`.
**Test Steps**:
1. Call `extractOpportunitySignals(transcript)`.
2. Assert a `DECISION_MAKER_SIGNAL` is present.
3. Assert `signal.value` equals `'VP of Engineering'`.
**Expected Result**: Decision-maker signal with correct title extracted.
**Code Sample**:
```typescript
it('extracts a decision-maker title as a DECISION_MAKER_SIGNAL', () => {
  const transcript = "I'll need to loop in our VP of Engineering before we commit.";
  const signals = extractOpportunitySignals(transcript);
  const dm = signals.find(s => s.type === 'DECISION_MAKER_SIGNAL');
  expect(dm).toBeDefined();
  expect(dm!.value).toBe('VP of Engineering');
});
```

#### TC-F5-U1.3: Extract Timeline Urgency Signal
**Objective**: Verify that urgent timeline phrases (`"need this by end of Q3"`, `"deadline is next month"`) are extracted as `TIMELINE_SIGNAL` with `urgencyLevel: 'high'`.
**Preconditions**: Transcript with `"We really need this implemented by end of Q3."`.
**Test Steps**:
1. Extract signals from transcript.
2. Assert `TIMELINE_SIGNAL` is present.
3. Assert `signal.urgencyLevel === 'high'`.
**Expected Result**: Timeline signal with high urgency level.
**Code Sample**:
```typescript
it('extracts a high-urgency timeline signal', () => {
  const transcript = 'We really need this implemented by end of Q3.';
  const signals = extractOpportunitySignals(transcript);
  const timeline = signals.find(s => s.type === 'TIMELINE_SIGNAL');
  expect(timeline).toBeDefined();
  expect(timeline!.urgencyLevel).toBe('high');
});
```

### 1.2 Opportunity Scoring
#### TC-F5-U2.1: Score Opportunity Based on Signal Composite
**Objective**: Confirm the opportunity scorer computes a composite score from budget, decision-maker, timeline, and pain-point signals with weighted contributions.
**Preconditions**: Signal set: `BUDGET_SIGNAL(30pts)`, `DECISION_MAKER_SIGNAL(25pts)`, `TIMELINE_SIGNAL(20pts)` — expected total: 75.
**Test Steps**:
1. Call `scoreOpportunity(signalSet)`.
2. Assert score is `75`.
3. Assert `confidence` is `'high'` (score >= 70).
**Expected Result**: Score of 75 with `confidence: 'high'`.
**Code Sample**:
```typescript
import { scoreOpportunity } from '../src/opportunities/scorer';

it('computes a composite opportunity score from multiple signals', () => {
  const signals = [
    { type: 'BUDGET_SIGNAL', weight: 30 },
    { type: 'DECISION_MAKER_SIGNAL', weight: 25 },
    { type: 'TIMELINE_SIGNAL', weight: 20 }
  ];
  const result = scoreOpportunity(signals);
  expect(result.score).toBe(75);
  expect(result.confidence).toBe('high');
});
```

#### TC-F5-U2.2: Low-Signal Transcript Scores Below Threshold
**Objective**: Ensure that a transcript with no strong opportunity signals produces a score below the detection threshold of 40.
**Preconditions**: Transcript containing only casual small talk; no budget, timeline, or decision-maker signals.
**Test Steps**:
1. Extract signals from small-talk transcript.
2. Score the opportunity.
3. Assert `score < 40`.
4. Assert `confidence === 'low'`.
**Expected Result**: Score below 40; low confidence; no opportunity flagged.
**Code Sample**:
```typescript
it('scores a casual conversation below the opportunity threshold', () => {
  const smallTalk = 'Great weather today! Really enjoyed the keynote this morning.';
  const signals = extractOpportunitySignals(smallTalk);
  const result = scoreOpportunity(signals);
  expect(result.score).toBeLessThan(40);
  expect(result.confidence).toBe('low');
});
```

#### TC-F5-U2.3: Score Adjusted Downward for Negative Sentiment Phrases
**Objective**: Verify that negative sentiment phrases (`"we already have a vendor"`, `"not in budget this year"`) reduce the opportunity score.
**Preconditions**: Transcript with budget signal AND `"not in budget this year"`.
**Test Steps**:
1. Score transcript with both positive and negative signals.
2. Assert score is lower than it would be with only the positive signal.
3. Assert `negativeAdjustment` field shows the applied deduction.
**Expected Result**: Score reduced by negative sentiment; deduction recorded in result.
**Code Sample**:
```typescript
it('reduces opportunity score for negative sentiment phrases', () => {
  const positive = [{ type: 'BUDGET_SIGNAL', weight: 30 }];
  const withNegative = [...positive, { type: 'NEGATIVE_SIGNAL', weight: -20 }];
  const positiveScore = scoreOpportunity(positive).score;
  const adjustedScore = scoreOpportunity(withNegative).score;
  expect(adjustedScore).toBeLessThan(positiveScore);
  expect(scoreOpportunity(withNegative).negativeAdjustment).toBe(20);
});
```

### 1.3 Opportunity Classification
#### TC-F5-U3.1: Classify Opportunity as Sales vs. Partnership
**Objective**: Ensure the classifier correctly distinguishes between sales opportunities (product purchase intent) and partnership opportunities (co-marketing, reseller intent).
**Preconditions**: Two transcripts — one with product purchase intent, one with partnership language.
**Test Steps**:
1. Classify sales transcript → assert `type: 'SALES'`.
2. Classify partnership transcript → assert `type: 'PARTNERSHIP'`.
**Expected Result**: Correct classification for each transcript type.
**Code Sample**:
```typescript
import { classifyOpportunity } from '../src/opportunities/classifier';

it('classifies sales and partnership opportunities correctly', () => {
  const salesSignals = [{ type: 'BUDGET_SIGNAL' }, { type: 'PURCHASE_INTENT' }];
  const partnerSignals = [{ type: 'RESELLER_INTEREST' }, { type: 'CO_MARKETING_INTENT' }];
  expect(classifyOpportunity(salesSignals).type).toBe('SALES');
  expect(classifyOpportunity(partnerSignals).type).toBe('PARTNERSHIP');
});
```

#### TC-F5-U3.2: Assign Recommended Next Action Based on Score and Type
**Objective**: Confirm that the next-action engine assigns the correct recommended action based on opportunity type and score.
**Preconditions**: High-score SALES opportunity (score: 85); low-score PARTNERSHIP (score: 35).
**Test Steps**:
1. Get next action for high-score SALES: assert `'Schedule demo'`.
2. Get next action for low-score PARTNERSHIP: assert `'Send partnership overview'`.
**Expected Result**: Context-appropriate next actions assigned.
**Code Sample**:
```typescript
import { recommendNextAction } from '../src/opportunities/nextActionEngine';

it('assigns context-appropriate next actions based on type and score', () => {
  expect(recommendNextAction({ type: 'SALES', score: 85 })).toBe('Schedule demo');
  expect(recommendNextAction({ type: 'PARTNERSHIP', score: 35 })).toBe('Send partnership overview');
});
```

#### TC-F5-U3.3: Deduplicate Opportunities for the Same Contact Across Meetings
**Objective**: Verify that if the same contact generates opportunity signals in two different meetings, they are merged into one opportunity record.
**Preconditions**: Two opportunity records for `contact-123` from `meeting-A` and `meeting-B`.
**Test Steps**:
1. Call `deduplicateOpportunities([oppFromMeetingA, oppFromMeetingB])`.
2. Assert result has only one opportunity for `contact-123`.
3. Assert merged opportunity has the higher score.
4. Assert `sourcesMeetings` contains both meeting IDs.
**Expected Result**: Single merged opportunity with max score and both source meeting IDs.
**Code Sample**:
```typescript
import { deduplicateOpportunities } from '../src/opportunities/deduplicator';

it('merges duplicate opportunities for the same contact across meetings', () => {
  const opps = [
    { contactId: 'contact-123', score: 60, meetingId: 'meeting-A' },
    { contactId: 'contact-123', score: 80, meetingId: 'meeting-B' }
  ];
  const merged = deduplicateOpportunities(opps);
  expect(merged).toHaveLength(1);
  expect(merged[0].score).toBe(80);
  expect(merged[0].sourceMeetings).toEqual(expect.arrayContaining(['meeting-A', 'meeting-B']));
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Opportunity Detection Pipeline
#### TC-F5-I1.1: Detect Opportunities from a Complete Meeting Transcript
**Objective**: Validate end-to-end opportunity detection from transcript ingestion through opportunity scoring and storage.
**Preconditions**: Meeting `meeting-opp-001` with transcript containing budget and timeline signals.
**Test Steps**:
1. Call `OpportunityDetectionService.detectFromMeeting('meeting-opp-001')`.
2. Assert at least one opportunity is returned.
3. Assert top opportunity score >= 60.
4. Assert opportunity persisted in DB.
**Expected Result**: High-confidence opportunity detected and stored.
**Code Sample**:
```typescript
import { OpportunityDetectionService } from '../src/services/OpportunityDetectionService';

it('detects and stores an opportunity from a meeting transcript', async () => {
  const opps = await OpportunityDetectionService.detectFromMeeting('meeting-opp-001');
  expect(opps.length).toBeGreaterThanOrEqual(1);
  expect(opps[0].score).toBeGreaterThanOrEqual(60);
  const stored = await opportunityRepo.findByMeetingId('meeting-opp-001');
  expect(stored.length).toBeGreaterThanOrEqual(1);
}, 20000);
```

#### TC-F5-I1.2: LLM-Enhanced Opportunity Scoring Refines Initial Score
**Objective**: Confirm that after initial signal-based scoring, a second LLM-based scoring pass can increase or decrease the initial score based on full context.
**Preconditions**: Initial signal score of 55; LLM assessment upgrades to 75 based on implicit intent.
**Test Steps**:
1. Run initial signal scoring → assert score is ~55.
2. Run LLM refinement pass via `OpportunityDetectionService.refineWithLLM(opp)`.
3. Assert refined score differs from initial (can be higher or lower).
4. Assert `refinementApplied: true` in result.
**Expected Result**: Refined score returned with `refinementApplied: true`.
**Code Sample**:
```typescript
it('refines opportunity score using LLM context analysis', async () => {
  const initial = await OpportunityDetectionService.detectFromMeeting('meeting-subtle');
  const refined = await OpportunityDetectionService.refineWithLLM(initial[0]);
  expect(refined.score).not.toBe(initial[0].score);
  expect(refined.refinementApplied).toBe(true);
}, 15000);
```

### 2.2 CRM Sync Integration
#### TC-F5-I2.1: High-Confidence Opportunity Auto-Synced to Salesforce Pipeline
**Objective**: Verify that opportunities scoring >= 80 are automatically created as Salesforce opportunities via the connector.
**Preconditions**: Mock Salesforce connector; opportunity with score 85 created.
**Test Steps**:
1. Create high-score opportunity for `contact-sf-001`.
2. Assert Salesforce `createOpportunity` mock was called.
3. Assert Salesforce record has `StageName: 'Prospecting'` and correct amount.
**Expected Result**: Salesforce opportunity created automatically for high-score leads.
**Code Sample**:
```typescript
it('auto-syncs high-confidence opportunities to Salesforce', async () => {
  await OpportunityDetectionService.detectFromMeeting('meeting-high-score');
  expect(mockSalesforce.createOpportunity).toHaveBeenCalledWith(
    expect.objectContaining({ StageName: 'Prospecting', Amount: expect.any(Number) })
  );
});
```

#### TC-F5-I2.2: Low-Confidence Opportunity Not Auto-Synced to CRM
**Objective**: Confirm that opportunities scoring below 40 are not automatically synced to the CRM, requiring manual review.
**Preconditions**: Opportunity with score 25 detected.
**Test Steps**:
1. Create low-score opportunity.
2. Assert Salesforce `createOpportunity` was NOT called.
3. Assert opportunity is marked `requiresReview: true`.
**Expected Result**: No CRM sync for low-confidence opportunity; review flag set.
**Code Sample**:
```typescript
it('does not auto-sync low-confidence opportunities to CRM', async () => {
  await OpportunityDetectionService.detectFromMeeting('meeting-low-score');
  expect(mockSalesforce.createOpportunity).not.toHaveBeenCalled();
  const opps = await opportunityRepo.findByMeetingId('meeting-low-score');
  expect(opps[0].requiresReview).toBe(true);
});
```

### 2.3 Real-Time Detection
#### TC-F5-I3.1: Opportunity Signals Detected in Real-Time During Active Meeting
**Objective**: Confirm that the streaming transcript pipeline detects opportunity signals in near-real-time and notifies the user during an active meeting.
**Preconditions**: WebSocket stream of transcript chunks; real-time signal processor active.
**Test Steps**:
1. Stream transcript chunks containing a budget signal at chunk 5.
2. Assert notification event `opportunity.detected` is emitted within 3 seconds of the signal chunk.
3. Assert notification payload includes signal type and confidence.
**Expected Result**: Real-time notification within 3 seconds of signal detection.
**Code Sample**:
```typescript
it('detects opportunity signals in real-time during streaming transcription', async () => {
  const notifications: any[] = [];
  wsClient.on('opportunity.detected', (data) => notifications.push(data));
  await streamTranscriptChunks(chunksWithBudgetSignalAtChunk5);
  await waitFor(() => notifications.length > 0, { timeout: 3000 });
  expect(notifications[0].type).toBe('BUDGET_SIGNAL');
  expect(notifications[0].confidence).toBeTruthy();
});
```

#### TC-F5-I3.2: Opportunity Alert Dismissed by User Prevents Duplicate Alerts
**Objective**: Verify that dismissing a real-time opportunity alert suppresses duplicate alerts for the same signal in the same meeting.
**Preconditions**: Budget signal detected and alert shown; user dismisses the alert.
**Test Steps**:
1. Trigger budget signal → assert one alert emitted.
2. User dismisses alert.
3. Same signal keyword appears again in transcript.
4. Assert no second alert emitted for the same meeting.
**Expected Result**: Dismissed alert not re-triggered for the same signal in the same meeting.
**Code Sample**:
```typescript
it('suppresses duplicate alerts for dismissed opportunity signals', async () => {
  const alerts: any[] = [];
  wsClient.on('opportunity.detected', (d) => alerts.push(d));
  await streamChunk('We have $200k budget.');
  await dismissAlert(alerts[0].id);
  await streamChunk('Our $200k is ready to allocate.');
  expect(alerts).toHaveLength(1); // no second alert
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Ambiguous and Misleading Signals
#### TC-F5-E1.1: Hypothetical Budget Discussion Not Scored as Opportunity
**Objective**: Ensure that hypothetical or past-tense budget mentions (`"We had $200k last year"`, `"If we had budget..."`) are not scored as active opportunities.
**Preconditions**: Transcript with hypothetical budget phrasing.
**Test Steps**:
1. Extract signals from transcript.
2. Assert no `BUDGET_SIGNAL` with `active: true` is returned.
3. Assert overall score remains below threshold.
**Expected Result**: Hypothetical budget phrasing generates no active budget signal.
**Code Sample**:
```typescript
it('does not score hypothetical budget discussions as active opportunities', () => {
  const transcript = 'If we had $500k in budget, we might consider a solution like yours.';
  const signals = extractOpportunitySignals(transcript);
  const activebudget = signals.filter(s => s.type === 'BUDGET_SIGNAL' && s.active);
  expect(activebudget).toHaveLength(0);
});
```

#### TC-F5-E1.2: Competitor Mention Does Not Inflate Score
**Objective**: Confirm that mentioning a competitor's product does not generate a false-positive opportunity signal.
**Preconditions**: Transcript: `"We're currently using CompetitorX and are pretty happy with it."`.
**Test Steps**:
1. Extract signals.
2. Assert no positive opportunity signals generated.
3. Assert a `COMPETITOR_SIGNAL` with `sentiment: 'positive'` is generated instead.
**Expected Result**: No inflated opportunity score; competitor-positive signal flagged separately.
**Code Sample**:
```typescript
it('flags competitor satisfaction without inflating opportunity score', () => {
  const transcript = "We're currently using CompetitorX and are pretty happy with it.";
  const signals = extractOpportunitySignals(transcript);
  const positive = signals.filter(s => ['BUDGET_SIGNAL', 'PURCHASE_INTENT'].includes(s.type));
  const competitor = signals.find(s => s.type === 'COMPETITOR_SIGNAL');
  expect(positive).toHaveLength(0);
  expect(competitor?.sentiment).toBe('positive');
});
```

### 3.2 Missing and Partial Data
#### TC-F5-E2.1: Opportunity Detection Proceeds Without Contact Profile
**Objective**: Confirm that opportunity detection works even when no enriched contact profile is available, scoring based on transcript signals only.
**Preconditions**: Meeting with transcript but contact not yet enriched (no LinkedIn, company size, or industry data).
**Test Steps**:
1. Run opportunity detection for meeting with unenriched contact.
2. Assert opportunity is detected (not skipped).
3. Assert `contactEnrichmentPending: true` flag is set.
**Expected Result**: Opportunity detected from transcript signals alone; enrichment flag set for later scoring.
**Code Sample**:
```typescript
it('detects opportunities without a fully enriched contact profile', async () => {
  const opps = await OpportunityDetectionService.detectFromMeeting('meeting-unenriched-contact');
  expect(opps.length).toBeGreaterThan(0);
  expect(opps[0].contactEnrichmentPending).toBe(true);
});
```

#### TC-F5-E2.2: Zero-Length Transcript Returns Empty Opportunity List
**Objective**: Ensure that an empty transcript returns an empty opportunity list without throwing.
**Preconditions**: Meeting with `transcript: ''`.
**Test Steps**:
1. Call `OpportunityDetectionService.detectFromMeeting('empty-meeting')`.
2. Assert result is `[]`.
3. Assert no exception thrown.
**Expected Result**: Empty array returned; no errors.
**Code Sample**:
```typescript
it('returns an empty opportunity list for a blank transcript', async () => {
  const opps = await OpportunityDetectionService.detectFromMeeting('empty-meeting');
  expect(opps).toEqual([]);
});
```

### 3.3 Score Boundary Conditions
#### TC-F5-E3.1: Score Capped at 100 Even with Many Signals
**Objective**: Verify that the score is capped at 100 even when the sum of all signal weights exceeds 100.
**Preconditions**: 6 signals each worth 25 points (sum: 150).
**Test Steps**:
1. Call `scoreOpportunity(sixHighWeightSignals)`.
2. Assert `result.score === 100`.
**Expected Result**: Score capped at 100.
**Code Sample**:
```typescript
it('caps the opportunity score at 100 regardless of signal weight sum', () => {
  const signals = Array.from({ length: 6 }, () => ({ type: 'BUDGET_SIGNAL', weight: 25 }));
  expect(scoreOpportunity(signals).score).toBe(100);
});
```

#### TC-F5-E3.2: Score Cannot Be Negative After Negative Adjustments
**Objective**: Confirm that negative signal adjustments cannot drive the score below 0.
**Preconditions**: One positive signal (20pts) and three negative signals (-30pts each total: -90), net: -70.
**Test Steps**:
1. Score with high negative adjustments.
2. Assert `result.score === 0`.
**Expected Result**: Score floored at 0, never negative.
**Code Sample**:
```typescript
it('floors the opportunity score at 0 after heavy negative adjustments', () => {
  const signals = [
    { type: 'BUDGET_SIGNAL', weight: 20 },
    { type: 'NEGATIVE_SIGNAL', weight: -30 },
    { type: 'NEGATIVE_SIGNAL', weight: -30 },
    { type: 'NEGATIVE_SIGNAL', weight: -30 }
  ];
  expect(scoreOpportunity(signals).score).toBe(0);
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Signal Extraction Throughput
#### TC-F5-P1.1: Signal Extraction from 10,000-Word Transcript Under 500ms
**Objective**: Validate that the NLP signal extractor processes a 10,000-word transcript in under 500ms.
**Preconditions**: 10,000-word transcript fixture.
**Test Steps**:
1. Measure time for `extractOpportunitySignals(tenKWordTranscript)`.
2. Assert elapsed < 500ms.
**Expected Result**: Signal extraction completes in under 500ms.
**Code Sample**:
```typescript
it('extracts signals from a 10000-word transcript in under 500ms', () => {
  const start = Date.now();
  extractOpportunitySignals(tenKWordTranscript);
  expect(Date.now() - start).toBeLessThan(500);
});
```

#### TC-F5-P1.2: Score 1000 Opportunities per Second
**Objective**: Confirm the scoring engine handles batch scoring of 1,000 opportunity candidates in under 1 second.
**Preconditions**: 1,000 signal sets pre-extracted.
**Test Steps**:
1. Score all 1,000 signal sets in a loop.
2. Assert elapsed < 1,000ms.
**Expected Result**: 1,000+ opportunity scores computed per second.
**Code Sample**:
```typescript
it('scores 1000 opportunity signal sets in under 1 second', () => {
  const start = Date.now();
  signalSets.forEach(ss => scoreOpportunity(ss));
  expect(Date.now() - start).toBeLessThan(1000);
});
```

### 4.2 Real-Time Latency
#### TC-F5-P2.1: Signal Detection Latency from Chunk Receipt to Notification Under 2 Seconds
**Objective**: Verify end-to-end latency from receiving a transcript chunk containing a signal to emitting the opportunity notification is under 2 seconds.
**Preconditions**: Streaming transcript pipeline; notification event subscriber.
**Test Steps**:
1. Record time when signal-bearing chunk is received.
2. Record time when `opportunity.detected` event fires.
3. Assert delta < 2,000ms.
**Expected Result**: Real-time detection latency under 2 seconds.
**Code Sample**:
```typescript
it('detects and notifies opportunity within 2 seconds of chunk receipt', async () => {
  let chunkTime: number;
  let notifyTime: number;
  pipeline.on('chunk', () => { chunkTime = Date.now(); });
  wsClient.on('opportunity.detected', () => { notifyTime = Date.now(); });
  await streamSignalBearingChunk();
  await waitFor(() => notifyTime !== undefined, { timeout: 3000 });
  expect(notifyTime - chunkTime).toBeLessThan(2000);
});
```

#### TC-F5-P2.2: Real-Time Detection Handles 10 Concurrent Meetings
**Objective**: Confirm that the real-time detection pipeline handles 10 simultaneous active meetings without signal cross-contamination or latency spikes.
**Preconditions**: 10 concurrent WebSocket streams; each with distinct signals.
**Test Steps**:
1. Initiate 10 concurrent streaming sessions.
2. Inject signals into each stream.
3. Assert each stream's notifications contain only that stream's signals.
4. Assert p99 notification latency < 3 seconds.
**Expected Result**: No cross-contamination; latency within SLA for all 10 streams.
**Code Sample**:
```typescript
it('handles 10 concurrent streaming meetings without signal cross-contamination', async () => {
  const sessions = await Promise.all(Array.from({ length: 10 }, (_, i) => createStreamSession(`meeting-live-${i}`)));
  // Inject and verify isolated signals per session
  for (const session of sessions) {
    await session.streamSignal();
    expect(session.notifications[0].meetingId).toBe(session.meetingId);
  }
}, 30000);
```

### 4.3 Database Query Performance
#### TC-F5-P3.1: Query Top Opportunities by Score in Under 100ms
**Objective**: Ensure that querying the top 20 opportunities by score for a conference returns in under 100ms.
**Preconditions**: DB with 10,000 opportunity records; index on `score`.
**Test Steps**:
1. Call `opportunityRepo.findTopByConference('conf-001', { limit: 20, orderBy: 'score' })`.
2. Assert elapsed < 100ms.
**Expected Result**: Top-20 query returns in under 100ms.
**Code Sample**:
```typescript
it('retrieves top 20 opportunities by score in under 100ms', async () => {
  const start = Date.now();
  await opportunityRepo.findTopByConference('conf-001', { limit: 20, orderBy: 'score' });
  expect(Date.now() - start).toBeLessThan(100);
});
```

#### TC-F5-P3.2: Bulk Opportunity Insert for 200-Meeting Conference Under 5 Seconds
**Objective**: Confirm bulk insert of all detected opportunities from a 200-meeting conference day completes in under 5 seconds.
**Preconditions**: 200 meetings each generating ~3 opportunities (600 records).
**Test Steps**:
1. Call `opportunityRepo.bulkInsert(sixHundredOpportunities)`.
2. Assert elapsed < 5,000ms.
**Expected Result**: 600 records inserted in under 5 seconds.
**Code Sample**:
```typescript
it('bulk-inserts 600 opportunities in under 5 seconds', async () => {
  const start = Date.now();
  await opportunityRepo.bulkInsert(sixHundredOpportunities);
  expect(Date.now() - start).toBeLessThan(5000);
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

**Estimated execution time**: Unit: ~20s | Integration: ~4min | Edge: ~1min | Performance: ~3min
**Test environment**: Node.js 20+, Jest, TypeScript, PostgreSQL 15, WebSocket test server, mock Salesforce connector
