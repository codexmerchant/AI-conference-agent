# EPIC09 Feature 5 — Missed Opportunity Detection — Test Cases

## Test Overview
Comprehensive test suite for Missed Opportunity Detection covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Opportunity Gap Analysis

#### TC-F5-U1.1: High-Value Speaker Not Met Detection
**Objective**: Verify that the system identifies speakers who match the user's ICP (ideal contact profile) but were not engaged with during the conference.

**Preconditions**:
- Conference speaker list with roles and companies
- User's ICP configured (target roles, industries, company size)
- User's contact list for the conference

**Test Steps**:
1. Instantiate `MissedOpportunityDetector` with speaker list of 20, contacts made = 8
2. Call `detectMissedSpeakers({ speakerList, contactsMade, userIcp })`
3. Assert returned gaps include speakers matching ICP who were not contacted

**Expected Result**: Returns `OpportunityGap[]` of ICP-matching speakers not in contact list; each has `matchScore > 0.7` and `gapReason`.

**Code Sample**:
```typescript
describe('MissedOpportunityDetector', () => {
  it('should identify ICP-matching speakers not met by the user', async () => {
    const detector = new MissedOpportunityDetector(mockIcpService, mockContactRepo);
    const gaps = await detector.detectMissedSpeakers({
      speakerList: conferenceSpeakers, // 20 speakers
      contactsMade: userContactIds,    // 8 contacts
      userIcp: { roles: ['CTO', 'VP Engineering'], industry: 'AI/ML' }
    });

    expect(gaps.length).toBeGreaterThan(0);
    gaps.forEach(gap => {
      expect(gap.matchScore).toBeGreaterThan(0.7);
      expect(gap.gapReason).toBeDefined();
    });
  });
});
```

---

#### TC-F5-U1.2: Session Topic Gap Detection
**Objective**: Verify that sessions aligned with the user's stated interest topics but not attended are flagged as missed content opportunities.

**Preconditions**:
- Conference session catalog with topic tags
- User's interest topics configured
- User's attended session list

**Test Steps**:
1. Provide session catalog of 40 sessions; user attended 12
2. Call `detectMissedSessions({ sessionCatalog, attendedSessions, userInterests })`
3. Assert sessions with topic relevance > 0.8 and not attended are returned

**Expected Result**: Returns list of high-relevance unattended sessions; sorted by relevance score descending.

**Code Sample**:
```typescript
it('should flag high-relevance unattended sessions as missed opportunities', async () => {
  const detector = new MissedOpportunityDetector(mockTopicService, mockSessionRepo);
  const missed = await detector.detectMissedSessions({
    sessionCatalog: allSessions,
    attendedSessions: attendedSessionIds,
    userInterests: ['LLM fine-tuning', 'RAG pipelines', 'AI governance']
  });

  expect(missed.length).toBeGreaterThan(0);
  expect(missed[0].relevanceScore).toBeGreaterThan(0.8);
  expect(missed[0].attended).toBe(false);
});
```

---

#### TC-F5-U1.3: Networking Time Gap Detection
**Objective**: Verify that conference time blocks designated as networking but during which the user had no interactions are detected as missed networking windows.

**Test Steps**:
1. Provide conference schedule with 4 networking blocks
2. Provide user interaction log showing activity in only 2 blocks
3. Call `detectNetworkingGaps({ schedule, interactionLog })`
4. Assert 2 unengaged networking blocks returned

**Expected Result**: Returns 2 `NetworkingGap` objects with block start/end times and `utilization: 0`.

**Code Sample**:
```typescript
it('should detect unused networking time blocks', async () => {
  const detector = new MissedOpportunityDetector(mockScheduleService, mockInteractionRepo);
  const gaps = await detector.detectNetworkingGaps({
    schedule: conferenceScheduleWith4Blocks,
    interactionLog: interactionsInFirstTwoBlocks
  });

  expect(gaps.length).toBe(2);
  gaps.forEach(gap => expect(gap.utilization).toBe(0));
});
```

---

### 1.2 Opportunity Scoring and Ranking

#### TC-F5-U2.1: Missed Opportunity Impact Score
**Objective**: Verify that each missed opportunity is assigned an impact score reflecting potential value lost.

**Preconditions**:
- ICP match score, speaker seniority, and session relevance available

**Test Steps**:
1. Build a missed opportunity for a keynote speaker (CTO, 95% ICP match, high session relevance)
2. Call `scoreOpportunity(opportunity)`
3. Assert impact score > 85

**Expected Result**: High-profile missed opportunity returns `impactScore > 85`; labeled 'CRITICAL'.

**Code Sample**:
```typescript
it('should assign high impact score to missed keynote speaker opportunity', () => {
  const scorer = new OpportunityScorer(scoringConfig);
  const score = scorer.scoreOpportunity({
    type: 'SPEAKER_NOT_MET',
    icpMatchScore: 0.95,
    speakerSeniority: 'CTO',
    sessionRelevance: 0.90
  });

  expect(score.impactScore).toBeGreaterThan(85);
  expect(score.label).toBe('CRITICAL');
});
```

---

#### TC-F5-U2.2: Opportunity Ranking by Impact
**Objective**: Verify that a list of missed opportunities is correctly ranked from highest to lowest impact.

**Test Steps**:
1. Build 5 opportunities with impact scores: 92, 55, 78, 65, 88
2. Call `rankOpportunities(opportunities)`
3. Assert order: 92, 88, 78, 65, 55

**Expected Result**: Returns array sorted by impactScore descending.

**Code Sample**:
```typescript
it('should rank missed opportunities by impact score descending', () => {
  const scorer = new OpportunityScorer(scoringConfig);
  const ranked = scorer.rankOpportunities(unorderedOpportunities);

  const scores = ranked.map(o => o.impactScore);
  for (let i = 1; i < scores.length; i++) {
    expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
  }
});
```

---

#### TC-F5-U2.3: Opportunity Deduplication
**Objective**: Verify that the same person appearing in multiple missed opportunity types (speaker + exhibitor) is deduplicated to one entry with combined signals.

**Test Steps**:
1. Build opportunities where contact "Jane Smith" appears as both a speaker and an exhibitor
2. Call `deduplicateOpportunities(opportunities)`
3. Assert only 1 entry for Jane Smith with merged signals

**Expected Result**: Single `MissedOpportunity` for Jane Smith; `sources: ['SPEAKER', 'EXHIBITOR']`; higher combined impact score.

**Code Sample**:
```typescript
it('should merge duplicate opportunities for the same person', () => {
  const detector = new MissedOpportunityDetector(mockIcpService, mockContactRepo);
  const deduped = detector.deduplicateOpportunities(opportunitiesWithDuplicateJane);

  const janeEntries = deduped.filter(o => o.name === 'Jane Smith');
  expect(janeEntries.length).toBe(1);
  expect(janeEntries[0].sources).toContain('SPEAKER');
  expect(janeEntries[0].sources).toContain('EXHIBITOR');
});
```

---

### 1.3 Opportunity Recovery Recommendations

#### TC-F5-U3.1: Recovery Action Generation
**Objective**: Verify that each missed opportunity generates a concrete recovery action (e.g., LinkedIn outreach, email request for recording).

**Test Steps**:
1. Provide a missed speaker opportunity
2. Call `generateRecoveryActions(opportunity)`
3. Assert at least one action with `type`, `actionText`, and `resourceLink`

**Expected Result**: Returns `RecoveryAction[]` with at least one item; LINKEDIN_CONNECT action for speaker opportunities.

**Code Sample**:
```typescript
it('should generate LinkedIn recovery action for missed speaker opportunity', () => {
  const advisor = new RecoveryActionAdvisor();
  const actions = advisor.generateRecoveryActions({
    type: 'SPEAKER_NOT_MET',
    person: { name: 'Dr. Lee', linkedinUrl: 'https://linkedin.com/in/dr-lee' }
  });

  const linkedIn = actions.find(a => a.type === 'LINKEDIN_CONNECT');
  expect(linkedIn).toBeDefined();
  expect(linkedIn!.resourceLink).toContain('linkedin.com/in/dr-lee');
});
```

---

#### TC-F5-U3.2: Session Recording Recovery for Missed Sessions
**Objective**: Verify that missed session opportunities generate a recovery action linking to the session recording if available.

**Test Steps**:
1. Mark session `sess-007` as missed; session has recording URL
2. Call `generateRecoveryActions(missedSessionOpportunity)`
3. Assert action `type: 'WATCH_RECORDING'` with correct URL

**Expected Result**: Returns `WATCH_RECORDING` action with `resourceLink` pointing to the recording.

**Code Sample**:
```typescript
it('should generate WATCH_RECORDING action for missed sessions with recordings', () => {
  const advisor = new RecoveryActionAdvisor();
  const actions = advisor.generateRecoveryActions({
    type: 'SESSION_NOT_ATTENDED',
    session: { id: 'sess-007', recordingUrl: 'https://recordings.conf.io/sess-007' }
  });

  const recording = actions.find(a => a.type === 'WATCH_RECORDING');
  expect(recording!.resourceLink).toBe('https://recordings.conf.io/sess-007');
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Post-Conference Opportunity Report

#### TC-F5-I1.1: Missed Opportunity Report on Conference Close
**Objective**: Verify that closing a conference triggers missed opportunity analysis and generates a report accessible via API.

**Preconditions**:
- Conference with 20 speakers, 40 sessions, 4 networking blocks; user attended partially

**Test Steps**:
1. POST `/api/conferences/conf-2026/close`
2. Wait for opportunity analysis pipeline
3. GET `/api/conferences/conf-2026/missed-opportunities?userId=user-42`

**Expected Result**: Report with categorized missed opportunities and recovery actions returned; HTTP 200.

**Code Sample**:
```typescript
it('should generate missed opportunity report on conference close', async () => {
  await request(app).post('/api/conferences/conf-2026/close').expect(202);
  await waitForOpportunityAnalysis('user-42', 'conf-2026', 8000);

  const res = await request(app)
    .get('/api/conferences/conf-2026/missed-opportunities?userId=user-42')
    .expect(200);

  expect(res.body.opportunities.length).toBeGreaterThan(0);
  expect(res.body.totalImpactScore).toBeGreaterThan(0);
  expect(res.body.recoveryActions).toBeDefined();
});
```

---

#### TC-F5-I1.2: Real-Time Mid-Conference Opportunity Alert
**Objective**: Verify that a real-time alert fires when a high-priority opportunity (ICP match > 0.9) starts presenting in a concurrent session.

**Test Steps**:
1. During active conference, trigger session start for ICP-matched speaker
2. Assert push notification dispatched to user within 30 seconds

**Expected Result**: Alert delivered with speaker name, session name, and room location; `alertType: 'HIGH_VALUE_SPEAKER_LIVE'`.

---

### 2.2 ICP Configuration Integration

#### TC-F5-I2.1: ICP Profile Update Re-Scores Existing Opportunities
**Objective**: Verify that updating a user's ICP triggers re-scoring of missed opportunities for the last 3 conferences.

**Test Steps**:
1. PUT `/api/users/user-42/icp` with updated target roles
2. Assert opportunity re-scoring job triggered
3. GET missed opportunities for the last conference and assert updated scores

**Expected Result**: Scores reflect new ICP; timestamp updated; previous score stored in history.

---

#### TC-F5-I2.2: Speaker List Sync From Conference Provider
**Objective**: Verify that syncing the speaker list from an external conference provider populates the opportunity detection dataset.

**Test Steps**:
1. POST `/api/conferences/conf-2026/sync-speakers` with provider integration
2. Assert 30 speaker records imported
3. Run opportunity detection and assert speakers evaluated against ICP

**Expected Result**: Speaker records created; opportunity analysis uses complete speaker list.

---

### 2.3 Recovery Action Tracking

#### TC-F5-I3.1: Recovery Action Completion Tracking
**Objective**: Verify that marking a recovery action as complete updates the missed opportunity status.

**Test Steps**:
1. Retrieve missed opportunity with 2 recovery actions
2. POST `/api/missed-opportunities/{id}/actions/{actionId}/complete`
3. GET opportunity and assert action status = 'DONE'; partial recovery flag set

**Expected Result**: Action marked DONE; `recoveryProgress: 0.5` (1 of 2 actions done); opportunity status = 'PARTIALLY_RECOVERED'.

---

#### TC-F5-I3.2: Full Recovery Closes the Opportunity
**Objective**: Verify that completing all recovery actions closes the missed opportunity record.

**Test Steps**:
1. Complete both recovery actions for an opportunity
2. GET the opportunity
3. Assert status = 'RECOVERED'; no further alerts generated

**Expected Result**: Opportunity closed; `recoveredAt` timestamp set; removed from active missed opportunity list.

---

## 3. EDGE CASE VALIDATION

### 3.1 Complete Conference Attendance

#### TC-F5-E1.1: No Missed Opportunities When Fully Engaged
**Objective**: Verify that the report returns empty when the user attended every ICP-relevant session and met all matching speakers.

**Test Steps**:
1. Configure user to have attended all sessions and met all ICP speakers
2. Run missed opportunity detection
3. Assert `opportunities = []`

**Expected Result**: Empty opportunity list; affirmation message generated; `coverageScore: 1.0`.

---

#### TC-F5-E1.2: No ICP Configured — Graceful Handling
**Objective**: Verify that detection runs with a default ICP when the user has not configured one, rather than failing.

**Test Steps**:
1. Remove user's ICP configuration
2. Trigger opportunity detection
3. Assert detection runs with default ICP weights and returns results flagged as `DEFAULT_ICP_USED`

**Expected Result**: Detection completes; results include `icpUsed: 'DEFAULT'`; user prompted to configure ICP.

---

### 3.2 Sparse Conference Data

#### TC-F5-E2.1: Conference With No Speaker List
**Objective**: Verify that speaker-based opportunity detection is skipped gracefully when no speaker list is available.

**Test Steps**:
1. Run detection for a conference with no imported speakers
2. Assert speaker gaps = []; session and networking gaps still computed

**Expected Result**: Report includes session and networking gaps only; `speakerGaps: []`; `reason: 'NO_SPEAKER_DATA'`.

---

#### TC-F5-E2.2: Duplicate Contact Already Recovered
**Objective**: Verify that if a missed speaker was subsequently connected with via LinkedIn, the opportunity is auto-marked recovered.

**Test Steps**:
1. Create missed opportunity for speaker Dr. Lee
2. Import a LinkedIn connection match for Dr. Lee
3. Assert opportunity auto-closed with `recoveredVia: 'LINKEDIN'`

**Expected Result**: Opportunity marked RECOVERED automatically; no further recovery actions surfaced.

---

### 3.3 Notification Edge Cases

#### TC-F5-E3.1: Alert Rate Limiting
**Objective**: Verify that no more than 3 real-time opportunity alerts are dispatched per conference hour to prevent alert fatigue.

**Test Steps**:
1. Trigger 6 high-value opportunity events within 1 hour
2. Assert only 3 alerts dispatched; remaining 3 queued for next window

**Expected Result**: 3 alerts sent in first window; 3 deferred with `deferredUntil` timestamp.

---

#### TC-F5-E3.2: Alert Suppression After User Dismissal
**Objective**: Verify that dismissing a real-time opportunity alert suppresses all future alerts for the same person for the conference duration.

**Test Steps**:
1. Receive alert for Dr. Lee
2. User dismisses the alert
3. Trigger another opportunity event for Dr. Lee in next session
4. Assert no second alert sent

**Expected Result**: Second alert suppressed; `dismissedAlerts: ['person:dr-lee']` logged.

---

## 4. PERFORMANCE VALIDATION

### 4.1 Detection Latency

#### TC-F5-P1.1: Opportunity Detection Latency for Large Conference
**Objective**: Verify that opportunity detection for a 3-day, 200-session, 100-speaker conference completes within 5 seconds.

**Test Steps**:
1. Load conference data: 200 sessions, 100 speakers, 30 networking blocks
2. Run detection pipeline
3. Assert completion < 5000ms

**Expected Result**: All opportunity types detected in < 5 seconds; results stored.

**Code Sample**:
```typescript
it('should detect opportunities for a large conference within 5 seconds', async () => {
  const start = performance.now();
  await detector.detectAllOpportunities({
    conferenceId: 'conf-large',
    userId: 'user-42'
  });
  const elapsed = performance.now() - start;

  expect(elapsed).toBeLessThan(5000);
}, 20000);
```

---

#### TC-F5-P1.2: ICP Match Scoring for 100 Speakers
**Objective**: Verify that scoring 100 speakers against a user's ICP completes within 500ms.

**Test Steps**:
1. Load ICP profile and 100 speaker records
2. Run ICP match scoring
3. Assert all 100 scores computed in < 500ms

**Expected Result**: 100 match scores returned in < 500ms; no timeout errors.

---

### 4.2 Alert Delivery Speed

#### TC-F5-P2.1: Real-Time Alert Delivery Under 10 Seconds
**Objective**: Verify that a high-value opportunity alert reaches the user's device within 10 seconds of detection.

**Test Steps**:
1. Trigger a high-value event (ICP speaker starts session)
2. Measure time from event to push notification delivery
3. Assert delivery time < 10 seconds

**Expected Result**: Alert delivered in < 10 seconds end-to-end.

---

#### TC-F5-P2.2: Concurrent Alert Processing for 100 Users
**Objective**: Verify that the alert system handles 100 simultaneous opportunity alerts without queue backup.

**Test Steps**:
1. Simulate 100 users each receiving an alert at the same time
2. Assert all 100 delivered within 15 seconds

**Expected Result**: 100% delivery rate; p95 < 15 seconds; no queue saturation.

---

### 4.3 Report Query Performance

#### TC-F5-P3.1: Missed Opportunity Report Query Latency
**Objective**: Verify that fetching a missed opportunity report with 50 items returns within 300ms.

**Test Steps**:
1. Seed 50 missed opportunity records for a conference
2. GET the report
3. Assert response time < 300ms

**Expected Result**: 50-item report returned in < 300ms; sorted by impact score.

---

#### TC-F5-P3.2: Cross-Conference Opportunity History Query
**Objective**: Verify that querying missed opportunity history across 10 conferences returns within 500ms.

**Test Steps**:
1. Seed opportunity records across 10 conferences for user-42
2. GET `/api/users/user-42/missed-opportunities/history`
3. Assert response time < 500ms

**Expected Result**: All conferences included in < 500ms; correct total impact score per conference.

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
