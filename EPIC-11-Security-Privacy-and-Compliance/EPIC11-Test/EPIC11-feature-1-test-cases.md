# EPIC11 Feature 1 — Recording Consent Management — Test Cases

## Test Overview
Comprehensive test suite for Recording Consent Management covering unit tests, integration tests, edge cases, and performance validation. These tests validate that consent tokens are correctly generated and enforced before audio is persisted, that revocation triggers redaction downstream, and that jurisdiction-aware consent rules are applied accurately across regions.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Consent Token Validation

#### TC-F1-U1.1: Valid self-consent token is issued on grant
**Objective**: Verify that granting self-consent produces a signed `ConsentRecord` with correct fields.

**Preconditions**:
- `ConsentService` is initialised with an in-memory event log.
- A valid session ID and user ID are available.

**Test Steps**:
1. Call `consentService.grant({ sessionId: 'sess-001', subjectId: 'user-42', subjectType: 'self', consentMethod: 'tap', jurisdiction: 'US-CA' })`.
2. Assert the returned record contains a UUID `consentId`.
3. Assert `grantedAt` is within 1 second of `Date.now()`.
4. Assert `subjectType === 'self'` and `consentMethod === 'tap'`.
5. Assert `revokedAt` is `null`.

**Expected Result**: A `ConsentRecord` is returned with all required fields populated and no revocation timestamp set.

**Code Sample**:
```typescript
import { ConsentService } from '@/services/consent-service';
import { InMemoryConsentLog } from '@/test-utils/in-memory-consent-log';

describe('TC-F1-U1.1 — Self-consent token issuance', () => {
  it('should issue a signed ConsentRecord on self-grant', async () => {
    const svc = new ConsentService({ log: new InMemoryConsentLog() });
    const record = await svc.grant({
      sessionId: 'sess-001',
      subjectId: 'user-42',
      subjectType: 'self',
      consentMethod: 'tap',
      jurisdiction: 'US-CA',
    });

    expect(record.consentId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(new Date(record.grantedAt).getTime()).toBeCloseTo(Date.now(), -3);
    expect(record.subjectType).toBe('self');
    expect(record.consentMethod).toBe('tap');
    expect(record.revokedAt).toBeNull();
  });
});
```

---

#### TC-F1-U1.2: Consent grant rejected when jurisdiction requires all-party and not all parties have consented
**Objective**: Ensure the consent service enforces all-party rules before allowing durable audio persistence.

**Preconditions**:
- Session is in jurisdiction `US-CA` (all-party consent state).
- Self-consent has been granted; third-party consent has not been captured.

**Test Steps**:
1. Call `consentService.canPersistAudio({ sessionId: 'sess-002', jurisdiction: 'US-CA' })`.
2. Assert the result is `{ allowed: false, reason: 'ALL_PARTY_CONSENT_INCOMPLETE' }`.

**Expected Result**: Persistence is blocked with a clear reason code indicating incomplete all-party consent.

**Code Sample**:
```typescript
it('should block persistence when all-party consent is incomplete', async () => {
  const svc = new ConsentService({ log: new InMemoryConsentLog() });
  await svc.grant({ sessionId: 'sess-002', subjectId: 'user-42', subjectType: 'self', consentMethod: 'tap', jurisdiction: 'US-CA' });

  const result = await svc.canPersistAudio({ sessionId: 'sess-002', jurisdiction: 'US-CA' });
  expect(result.allowed).toBe(false);
  expect(result.reason).toBe('ALL_PARTY_CONSENT_INCOMPLETE');
});
```

---

#### TC-F1-U1.3: Consent token signature verification fails on tampered record
**Objective**: Confirm that a `ConsentRecord` with a modified `grantedAt` field fails cryptographic verification.

**Preconditions**:
- A valid `ConsentRecord` was issued and signed by the service.

**Test Steps**:
1. Retrieve the signed record.
2. Mutate `record.grantedAt` to an arbitrary different timestamp.
3. Call `consentService.verifyRecord(record)`.
4. Assert the result is `false`.

**Expected Result**: Tampered record fails verification, preventing spoofed consent from being accepted.

**Code Sample**:
```typescript
it('should reject a tampered ConsentRecord', async () => {
  const svc = new ConsentService({ log: new InMemoryConsentLog(), signingKey: TEST_SIGNING_KEY });
  const record = await svc.grant({ sessionId: 'sess-003', subjectId: 'user-42', subjectType: 'self', consentMethod: 'tap', jurisdiction: 'US-WA' });
  const tampered = { ...record, grantedAt: new Date(0).toISOString() };

  expect(await svc.verifyRecord(tampered)).toBe(false);
});
```

---

### 1.2 Revocation and Redaction Triggering

#### TC-F1-U2.1: Revoking consent sets revokedAt and emits revocation event
**Objective**: Verify that a revocation call timestamps the record and publishes a `consent.revoked` event.

**Preconditions**:
- A granted `ConsentRecord` with `consentId = 'cr-999'` exists.
- Event bus mock is wired to the service.

**Test Steps**:
1. Call `consentService.revoke({ consentId: 'cr-999', reason: 'subject_request' })`.
2. Assert the persisted record has `revokedAt` set within 1 second.
3. Assert the event bus received exactly one `consent.revoked` event with `consentId = 'cr-999'`.

**Expected Result**: Record is updated and a downstream redaction event is fired.

**Code Sample**:
```typescript
it('should set revokedAt and emit consent.revoked event', async () => {
  const bus = new MockEventBus();
  const svc = new ConsentService({ log: new InMemoryConsentLog(), eventBus: bus });
  const record = await svc.grant({ sessionId: 'sess-004', subjectId: 'user-10', subjectType: 'third_party', consentMethod: 'verbal', jurisdiction: 'US-FL' });

  await svc.revoke({ consentId: record.consentId, reason: 'subject_request' });

  const updated = await svc.getRecord(record.consentId);
  expect(updated.revokedAt).not.toBeNull();
  expect(bus.published).toContainEqual(
    expect.objectContaining({ type: 'consent.revoked', consentId: record.consentId })
  );
});
```

---

#### TC-F1-U2.2: Double-revocation is idempotent
**Objective**: Ensure revoking an already-revoked consent record does not throw or corrupt state.

**Preconditions**:
- A `ConsentRecord` has already been revoked.

**Test Steps**:
1. Call `consentService.revoke({ consentId: 'cr-999' })` a second time.
2. Assert no error is thrown.
3. Assert `revokedAt` is unchanged from the first revocation.

**Expected Result**: Second revocation is a no-op with the original `revokedAt` preserved.

**Code Sample**:
```typescript
it('should be idempotent on double-revocation', async () => {
  const svc = new ConsentService({ log: new InMemoryConsentLog() });
  const record = await svc.grant({ sessionId: 'sess-005', subjectId: 'user-11', subjectType: 'self', consentMethod: 'tap', jurisdiction: 'US-NY' });
  await svc.revoke({ consentId: record.consentId });
  const firstRevoke = (await svc.getRecord(record.consentId)).revokedAt;

  await svc.revoke({ consentId: record.consentId });
  const secondRevoke = (await svc.getRecord(record.consentId)).revokedAt;

  expect(secondRevoke).toBe(firstRevoke);
});
```

---

#### TC-F1-U2.3: Revocation of unknown consent ID returns structured error
**Objective**: Confirm that revoking a non-existent `consentId` returns a typed `NotFoundError`, not an unhandled exception.

**Preconditions**:
- Consent log is empty.

**Test Steps**:
1. Call `consentService.revoke({ consentId: 'non-existent-id' })`.
2. Expect the promise to reject with `ConsentNotFoundError`.

**Expected Result**: `ConsentNotFoundError` is thrown with the unknown ID in its message.

**Code Sample**:
```typescript
it('should throw ConsentNotFoundError for unknown consentId', async () => {
  const svc = new ConsentService({ log: new InMemoryConsentLog() });
  await expect(svc.revoke({ consentId: 'ghost-id' })).rejects.toThrow(ConsentNotFoundError);
});
```

---

### 1.3 Third-Party Consent Capture Methods

#### TC-F1-U3.1: QR-scan consent method logs correct method type
**Objective**: Verify that consent captured via QR scan is recorded with `consentMethod = 'qr'`.

**Preconditions**:
- A QR code payload containing `sessionId` and `subjectId` has been decoded from a scan event.

**Test Steps**:
1. Call `consentService.captureThirdPartyConsent({ sessionId: 'sess-006', subjectId: 'visitor-55', captureMethod: 'qr', capturedByUserId: 'user-42' })`.
2. Assert `record.consentMethod === 'qr'`.
3. Assert `record.capturedByUserId === 'user-42'`.

**Expected Result**: Record accurately reflects QR as the capture method and attributes the capturing user.

**Code Sample**:
```typescript
it('should record QR consent method correctly', async () => {
  const svc = new ConsentService({ log: new InMemoryConsentLog() });
  const record = await svc.captureThirdPartyConsent({
    sessionId: 'sess-006',
    subjectId: 'visitor-55',
    captureMethod: 'qr',
    capturedByUserId: 'user-42',
    jurisdiction: 'US-CA',
  });

  expect(record.consentMethod).toBe('qr');
  expect(record.capturedByUserId).toBe('user-42');
});
```

---

#### TC-F1-U3.2: Verbal consent capture stores minimum identifying data
**Objective**: Ensure verbal consent records do not persist any biometric or excessive PII beyond what is required.

**Preconditions**:
- Third-party verbal consent is being captured.

**Test Steps**:
1. Call `consentService.captureThirdPartyConsent({ sessionId: 'sess-007', captureMethod: 'verbal', subjectDisplayName: 'Conference Attendee', jurisdiction: 'EU-DE' })`.
2. Assert the stored record does not contain `voicePrint`, `faceId`, or raw audio reference.
3. Assert `subjectId` is a system-generated anonymous ID, not a PII value.

**Expected Result**: Record contains only minimal identifying data as required by GDPR data minimisation principle.

**Code Sample**:
```typescript
it('should not store biometric data in verbal consent record', async () => {
  const svc = new ConsentService({ log: new InMemoryConsentLog() });
  const record = await svc.captureThirdPartyConsent({
    sessionId: 'sess-007',
    captureMethod: 'verbal',
    subjectDisplayName: 'Conference Attendee',
    jurisdiction: 'EU-DE',
    capturedByUserId: 'user-42',
  });

  expect(record).not.toHaveProperty('voicePrint');
  expect(record).not.toHaveProperty('faceId');
  expect(record.subjectId).toMatch(/^anon-[0-9a-f]{12}$/);
});
```

---

#### TC-F1-U3.3: Badge-scan consent links consentId to badge identifier
**Objective**: Confirm that badge-scan consent correctly stores the badge token and links it to the consent record.

**Preconditions**:
- A conference badge NFC/barcode token `'badge-abc123'` has been scanned.

**Test Steps**:
1. Call `consentService.captureThirdPartyConsent({ sessionId: 'sess-008', captureMethod: 'badge_scan', badgeToken: 'badge-abc123', jurisdiction: 'US-NY' })`.
2. Assert `record.consentMethod === 'badge_scan'`.
3. Assert `record.badgeToken === 'badge-abc123'`.

**Expected Result**: Consent record is traceable to the physical badge token for audit purposes.

**Code Sample**:
```typescript
it('should link badge token to consent record', async () => {
  const svc = new ConsentService({ log: new InMemoryConsentLog() });
  const record = await svc.captureThirdPartyConsent({
    sessionId: 'sess-008',
    captureMethod: 'badge_scan',
    badgeToken: 'badge-abc123',
    jurisdiction: 'US-NY',
    capturedByUserId: 'user-42',
  });

  expect(record.consentMethod).toBe('badge_scan');
  expect(record.badgeToken).toBe('badge-abc123');
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Consent Service ↔ Audio Pipeline Integration

#### TC-F1-I1.1: Audio pipeline blocks persistence until consent grant is received
**Objective**: Verify the audio ingestion service checks consent state before writing segments to durable storage.

**Preconditions**:
- Audio pipeline and consent service are running against a shared test event bus.
- No consent has been granted for session `sess-int-001`.

**Test Steps**:
1. Push an audio segment for `sess-int-001` into the ingestion pipeline.
2. Assert the segment is held in the rolling local buffer and not written to object storage.
3. Grant consent for `sess-int-001`.
4. Assert the buffered segment is flushed to durable storage within 2 seconds.

**Expected Result**: Audio is held in buffer until consent state becomes active, then flushed automatically.

**Code Sample**:
```typescript
it('should flush buffered audio after consent grant', async () => {
  const bus = new TestEventBus();
  const pipeline = new AudioIngestionService({ eventBus: bus, storage: mockStorage });
  const consentSvc = new ConsentService({ log: new InMemoryConsentLog(), eventBus: bus });

  pipeline.pushSegment({ sessionId: 'sess-int-001', data: SAMPLE_AUDIO_BUFFER });
  await delay(200);
  expect(mockStorage.writes).toHaveLength(0);

  await consentSvc.grant({ sessionId: 'sess-int-001', subjectId: 'user-42', subjectType: 'self', consentMethod: 'tap', jurisdiction: 'US-TX' });
  await delay(2100);
  expect(mockStorage.writes).toHaveLength(1);
});
```

---

#### TC-F1-I1.2: Revocation mid-session triggers redaction job for prior segments
**Objective**: Confirm that revoking consent for an active session enqueues a redaction job for all segments captured under that consent.

**Preconditions**:
- Three audio segments have been durably stored under `consentId = 'cr-int-01'`.
- Redaction queue is connected to the consent service's event bus.

**Test Steps**:
1. Call `consentService.revoke({ consentId: 'cr-int-01' })`.
2. Assert a `redaction.job.created` event is published with `consentId = 'cr-int-01'`.
3. Assert the redaction job references all three segment IDs.

**Expected Result**: All affected segments are queued for redaction immediately on revocation.

**Code Sample**:
```typescript
it('should enqueue redaction for all segments on revocation', async () => {
  const bus = new TestEventBus();
  const consentSvc = new ConsentService({ log: populatedLog, eventBus: bus });

  await consentSvc.revoke({ consentId: 'cr-int-01', reason: 'subject_request' });

  const redactionEvents = bus.published.filter(e => e.type === 'redaction.job.created');
  expect(redactionEvents).toHaveLength(1);
  expect(redactionEvents[0].segmentIds).toEqual(expect.arrayContaining(['seg-a', 'seg-b', 'seg-c']));
});
```

---

### 2.2 Consent Service ↔ Regional Compliance Engine Integration

#### TC-F1-I2.1: One-party jurisdiction allows persistence with only self-consent
**Objective**: Verify that in a one-party consent jurisdiction, self-consent alone is sufficient to allow audio persistence.

**Preconditions**:
- Session jurisdiction is `US-NY` (one-party consent state).
- Self-consent has been granted.

**Test Steps**:
1. Call `consentService.canPersistAudio({ sessionId: 'sess-int-003', jurisdiction: 'US-NY' })`.
2. Assert the result is `{ allowed: true }`.

**Expected Result**: Pipeline is permitted to persist audio without additional third-party consent.

**Code Sample**:
```typescript
it('should allow persistence with self-consent in one-party jurisdiction', async () => {
  const svc = new ConsentService({ log: selfConsentLog, complianceEngine: mockComplianceEngine });
  mockComplianceEngine.setJurisdiction('US-NY', { consentType: 'one-party' });

  const result = await svc.canPersistAudio({ sessionId: 'sess-int-003', jurisdiction: 'US-NY' });
  expect(result.allowed).toBe(true);
});
```

---

#### TC-F1-I2.2: Jurisdiction change mid-session re-evaluates consent requirements
**Objective**: Ensure that if the compliance engine updates the jurisdiction for an active session, the consent gate is re-evaluated.

**Preconditions**:
- Session started in `US-FL` (one-party) with only self-consent.
- Compliance engine detects user has crossed into `US-CA` (all-party).

**Test Steps**:
1. Emit a `jurisdiction.changed` event for `sess-int-004` to `US-CA`.
2. Call `consentService.canPersistAudio({ sessionId: 'sess-int-004', jurisdiction: 'US-CA' })`.
3. Assert the result is `{ allowed: false, reason: 'ALL_PARTY_CONSENT_INCOMPLETE' }`.

**Expected Result**: Consent gate tightens dynamically when the jurisdiction switches to a stricter regime.

**Code Sample**:
```typescript
it('should block persistence after jurisdiction tightens', async () => {
  const bus = new TestEventBus();
  const svc = new ConsentService({ log: selfConsentLog, eventBus: bus });

  bus.emit({ type: 'jurisdiction.changed', sessionId: 'sess-int-004', newJurisdiction: 'US-CA' });
  await delay(100);

  const result = await svc.canPersistAudio({ sessionId: 'sess-int-004', jurisdiction: 'US-CA' });
  expect(result.allowed).toBe(false);
  expect(result.reason).toBe('ALL_PARTY_CONSENT_INCOMPLETE');
});
```

---

### 2.3 Consent Propagation to Downstream Services

#### TC-F1-I3.1: Consent grant event is received by transcription service within 500ms
**Objective**: Validate that `consent.granted` events propagate to the transcription service within the 500ms SLA.

**Preconditions**:
- Consent service and transcription service are connected via the test event bus.
- Latency measurement hook is installed on the transcription service.

**Test Steps**:
1. Record the timestamp before calling `consentService.grant(...)`.
2. Grant consent for `sess-int-005`.
3. Assert the transcription service receives the `consent.granted` event within 500ms.

**Expected Result**: Propagation latency is under 500ms, meeting the performance SLA.

**Code Sample**:
```typescript
it('should propagate consent grant to transcription service within 500ms', async () => {
  const transcriptionSvc = new MockTranscriptionService({ eventBus: bus });
  const consentSvc = new ConsentService({ log: new InMemoryConsentLog(), eventBus: bus });

  const start = Date.now();
  await consentSvc.grant({ sessionId: 'sess-int-005', subjectId: 'user-42', subjectType: 'self', consentMethod: 'tap', jurisdiction: 'US-TX' });
  await waitForEvent(transcriptionSvc, 'consent.received', 600);
  const latency = Date.now() - start;

  expect(latency).toBeLessThan(500);
});
```

---

#### TC-F1-I3.2: Storage service halts writes on receipt of revocation event
**Objective**: Confirm the storage service stops writing audio segments when a `consent.revoked` event is received.

**Preconditions**:
- Storage service is actively writing segments for `sess-int-006`.
- A revocation event is emitted.

**Test Steps**:
1. Emit `consent.revoked` for `sess-int-006`.
2. Push two additional audio segments to the pipeline.
3. Assert neither segment is written to durable storage.

**Expected Result**: Storage service immediately halts new writes for the affected session on receiving the revocation event.

**Code Sample**:
```typescript
it('should stop storage writes after consent.revoked event', async () => {
  const storage = new MockStorageService({ eventBus: bus });
  bus.emit({ type: 'consent.revoked', sessionId: 'sess-int-006', consentId: 'cr-007' });
  await delay(50);

  pipeline.pushSegment({ sessionId: 'sess-int-006', data: SAMPLE_AUDIO_BUFFER });
  pipeline.pushSegment({ sessionId: 'sess-int-006', data: SAMPLE_AUDIO_BUFFER });
  await delay(200);

  expect(storage.writesAfterRevocation('sess-int-006')).toBe(0);
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Offline Consent Capture

#### TC-F1-E1.1: Consent captured offline is synced on reconnect
**Objective**: Verify that consent granted while the device is offline is queued locally and synced to the backend on reconnect.

**Preconditions**:
- Device is in offline mode (network adapter mocked as disconnected).
- A valid session is active.

**Test Steps**:
1. Call `consentService.grant(...)` while offline.
2. Assert the record is persisted to the local queue store.
3. Restore network connectivity.
4. Assert the queued record is synced to the backend within 5 seconds.
5. Assert the backend log contains the record with the original `grantedAt` timestamp.

**Expected Result**: Consent record is preserved offline and synced without timestamp modification.

**Code Sample**:
```typescript
it('should sync offline consent on reconnect with original timestamp', async () => {
  networkAdapter.setOffline();
  const grantedAt = new Date().toISOString();
  await svc.grant({ sessionId: 'sess-edge-001', subjectId: 'user-42', subjectType: 'self', consentMethod: 'tap', jurisdiction: 'US-CA', grantedAt });

  expect(localQueue.pending()).toHaveLength(1);

  networkAdapter.setOnline();
  await delay(5100);

  const synced = await backendLog.getRecord({ sessionId: 'sess-edge-001' });
  expect(synced.grantedAt).toBe(grantedAt);
});
```

---

#### TC-F1-E1.2: Recording buffer does not overflow while consent sync is pending
**Objective**: Ensure the rolling local audio buffer does not grow unboundedly while waiting for offline consent sync.

**Preconditions**:
- Device is offline; consent has been captured locally but not synced.
- Audio is being recorded continuously.

**Test Steps**:
1. Record audio for 120 seconds while offline.
2. Measure the size of the rolling buffer.
3. Assert buffer size does not exceed the configured maximum (e.g. 60 seconds of audio).

**Expected Result**: Buffer rolls over and discards oldest frames, never exceeding the configured limit.

**Code Sample**:
```typescript
it('should cap the rolling buffer at the configured maximum', async () => {
  networkAdapter.setOffline();
  const buffer = new RollingAudioBuffer({ maxSeconds: 60 });
  for (let i = 0; i < 120; i++) {
    buffer.push(generateOneSec());
    await delay(1);
  }
  expect(buffer.durationSeconds()).toBeLessThanOrEqual(60);
});
```

---

### 3.2 Group / Panel Consent

#### TC-F1-E2.1: Group consent record covers multiple subject IDs
**Objective**: Verify that a single group consent event can cover an array of subject IDs (e.g. panel session).

**Preconditions**:
- A panel session has five identified attendees.

**Test Steps**:
1. Call `consentService.grantGroup({ sessionId: 'sess-panel-01', subjectIds: ['p1','p2','p3','p4','p5'], consentMethod: 'verbal', jurisdiction: 'US-NY' })`.
2. Assert five individual `ConsentRecord` entries are created, one per subject.
3. Assert all records share the same `groupConsentId`.

**Expected Result**: Group grant creates linked individual records for auditability while sharing a common group reference.

**Code Sample**:
```typescript
it('should create linked individual records for group consent', async () => {
  const svc = new ConsentService({ log: new InMemoryConsentLog() });
  const result = await svc.grantGroup({
    sessionId: 'sess-panel-01',
    subjectIds: ['p1','p2','p3','p4','p5'],
    consentMethod: 'verbal',
    jurisdiction: 'US-NY',
  });

  expect(result.records).toHaveLength(5);
  const groupId = result.records[0].groupConsentId;
  result.records.forEach(r => expect(r.groupConsentId).toBe(groupId));
});
```

---

#### TC-F1-E2.2: Revoking one subject from a group does not revoke others
**Objective**: Ensure individual revocation within a group consent event only affects the requesting subject.

**Preconditions**:
- Group consent for subjects `['p1','p2','p3']` exists under `groupConsentId = 'gc-001'`.

**Test Steps**:
1. Call `consentService.revoke({ consentId: recordForP2.consentId })`.
2. Assert `p2`'s record has `revokedAt` set.
3. Assert `p1` and `p3` records still have `revokedAt === null`.

**Expected Result**: Revocation is scoped to the individual subject, not the entire group.

**Code Sample**:
```typescript
it('should revoke only the specified subject in a group', async () => {
  const svc = new ConsentService({ log: groupLog });
  const [r1, r2, r3] = await svc.getGroupRecords('gc-001');

  await svc.revoke({ consentId: r2.consentId });

  expect((await svc.getRecord(r2.consentId)).revokedAt).not.toBeNull();
  expect((await svc.getRecord(r1.consentId)).revokedAt).toBeNull();
  expect((await svc.getRecord(r3.consentId)).revokedAt).toBeNull();
});
```

---

### 3.3 Consent Script Unavailability

#### TC-F1-E3.1: Missing locale consent script falls back to English
**Objective**: Verify that when a consent script is unavailable in the subject's preferred language, the system falls back to English and logs the fallback.

**Preconditions**:
- Consent script store has English (`en`) but not Swahili (`sw`).

**Test Steps**:
1. Call `consentService.getConsentScript({ jurisdiction: 'KE', preferredLanguage: 'sw' })`.
2. Assert the returned script `language === 'en'`.
3. Assert a `consent.script.fallback` telemetry event is emitted.

**Expected Result**: Consent script is provided in English with a fallback event logged for visibility.

**Code Sample**:
```typescript
it('should fall back to English when preferred language script is unavailable', async () => {
  const svc = new ConsentService({ scriptStore: englishOnlyStore, telemetry: mockTelemetry });
  const script = await svc.getConsentScript({ jurisdiction: 'KE', preferredLanguage: 'sw' });

  expect(script.language).toBe('en');
  expect(mockTelemetry.events).toContainEqual(
    expect.objectContaining({ type: 'consent.script.fallback', requestedLanguage: 'sw' })
  );
});
```

---

#### TC-F1-E3.2: Stale consent script version triggers re-fetch before use
**Objective**: Confirm that an outdated cached consent script is replaced with the latest version before being presented to the user.

**Preconditions**:
- Cached script has `version = 1`; the script store reports `latestVersion = 2`.

**Test Steps**:
1. Call `consentService.getConsentScript({ jurisdiction: 'US-CA', preferredLanguage: 'en' })`.
2. Assert the returned script has `version === 2`.
3. Assert the stale version 1 script is evicted from the cache.

**Expected Result**: Only the current, jurisdiction-verified script version is presented to users.

**Code Sample**:
```typescript
it('should refresh stale consent script from store', async () => {
  const cache = new MockScriptCache({ cachedVersion: 1 });
  const store = new MockScriptStore({ latestVersion: 2 });
  const svc = new ConsentService({ scriptStore: store, scriptCache: cache });

  const script = await svc.getConsentScript({ jurisdiction: 'US-CA', preferredLanguage: 'en' });

  expect(script.version).toBe(2);
  expect(cache.get('US-CA', 'en')?.version).toBe(2);
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Consent State Propagation Latency

#### TC-F1-P1.1: Consent grant propagates to all downstream consumers within 500ms under load
**Objective**: Validate that consent state propagation remains under the 500ms SLA when 100 concurrent sessions are active.

**Preconditions**:
- 100 active sessions with consent service and event bus under simulated load.
- Transcription, storage, and retention consumers are all subscribed.

**Test Steps**:
1. Simultaneously grant consent for all 100 sessions.
2. Measure the time until each downstream consumer acknowledges the event.
3. Assert p95 propagation latency is under 500ms.

**Expected Result**: p95 propagation latency remains under 500ms at 100 concurrent sessions.

**Code Sample**:
```typescript
it('should propagate consent to all consumers within 500ms at 100 concurrent sessions', async () => {
  const latencies: number[] = [];
  const sessions = Array.from({ length: 100 }, (_, i) => `sess-perf-${i}`);

  await Promise.all(sessions.map(async sessionId => {
    const start = Date.now();
    await svc.grant({ sessionId, subjectId: 'user-42', subjectType: 'self', consentMethod: 'tap', jurisdiction: 'US-TX' });
    await waitForAllConsumers(sessionId, bus);
    latencies.push(Date.now() - start);
  }));

  const p95 = percentile(latencies, 95);
  expect(p95).toBeLessThan(500);
});
```

---

#### TC-F1-P1.2: Consent status check completes within 50ms under read load
**Objective**: Ensure that `canPersistAudio` read checks remain fast under high read concurrency.

**Preconditions**:
- 1,000 active sessions with consent records in the log.

**Test Steps**:
1. Perform 1,000 concurrent `canPersistAudio` checks across all sessions.
2. Assert p99 response time is under 50ms.

**Expected Result**: Read-path performance is sufficient to avoid becoming a bottleneck in the audio pipeline.

**Code Sample**:
```typescript
it('should resolve canPersistAudio in under 50ms at p99 under 1000 concurrent reads', async () => {
  const durations: number[] = [];
  await Promise.all(Array.from({ length: 1000 }, async (_, i) => {
    const start = Date.now();
    await svc.canPersistAudio({ sessionId: `sess-${i}`, jurisdiction: 'US-CA' });
    durations.push(Date.now() - start);
  }));
  expect(percentile(durations, 99)).toBeLessThan(50);
});
```

---

### 4.2 Revocation Processing Throughput

#### TC-F1-P2.1: Revocation triggers redaction job within 5 seconds under normal load
**Objective**: Validate the revocation-to-redaction-trigger SLA of 5 seconds.

**Preconditions**:
- 50 concurrent sessions, each with an active consent record.
- Redaction queue consumer is running.

**Test Steps**:
1. Revoke consent for all 50 sessions simultaneously.
2. Measure time from revocation call to `redaction.job.created` event for each.
3. Assert p95 is under 5 seconds.

**Expected Result**: Redaction jobs are reliably enqueued within the 5-second SLA.

**Code Sample**:
```typescript
it('should enqueue redaction jobs within 5 seconds p95 under concurrent revocations', async () => {
  const latencies = await Promise.all(activeSessions.map(async ({ consentId, sessionId }) => {
    const start = Date.now();
    await svc.revoke({ consentId });
    await waitForEvent(bus, 'redaction.job.created', { consentId }, 6000);
    return Date.now() - start;
  }));
  expect(percentile(latencies, 95)).toBeLessThan(5000);
});
```

---

#### TC-F1-P2.2: Consent log sustains 500 writes per second without data loss
**Objective**: Ensure the consent event log can sustain high write throughput typical of a large conference event.

**Preconditions**:
- Consent log is backed by a test-mode durable store with write-ahead logging.

**Test Steps**:
1. Issue 500 `grant` calls per second for 10 seconds (5,000 total).
2. Assert all 5,000 records are durably persisted.
3. Assert no records are duplicated.

**Expected Result**: All 5,000 consent records are written without loss or duplication under sustained load.

**Code Sample**:
```typescript
it('should sustain 500 writes/sec for 10 seconds without data loss', async () => {
  const writePromises = Array.from({ length: 5000 }, (_, i) =>
    svc.grant({ sessionId: `sess-${i}`, subjectId: `user-${i}`, subjectType: 'self', consentMethod: 'tap', jurisdiction: 'US-TX' })
  );
  const results = await Promise.allSettled(writePromises);
  const fulfilled = results.filter(r => r.status === 'fulfilled');
  const uniqueIds = new Set(fulfilled.map(r => (r as PromiseFulfilledResult<ConsentRecord>).value.consentId));

  expect(fulfilled).toHaveLength(5000);
  expect(uniqueIds.size).toBe(5000);
});
```

---

### 4.3 Consent Prompt Render Time

#### TC-F1-P3.1: Consent modal renders within 1 second on low-end device profile
**Objective**: Confirm the consent prompt meets the 1-second render time requirement on a throttled CPU device profile.

**Preconditions**:
- Device CPU is throttled to simulate a mid-range smartphone.
- Consent script and jurisdiction are pre-fetched.

**Test Steps**:
1. Trigger the consent modal display.
2. Measure time from trigger to first-meaningful-paint.
3. Assert render time is under 1,000ms.

**Expected Result**: Consent modal is visible to the user within 1 second even on lower-end hardware.

**Code Sample**:
```typescript
it('should render consent modal within 1 second on throttled CPU', async () => {
  const start = performance.now();
  await renderConsentModal({ jurisdiction: 'US-CA', language: 'en', script: preloadedScript });
  const renderTime = performance.now() - start;

  expect(renderTime).toBeLessThan(1000);
});
```

---

#### TC-F1-P3.2: Consent prompt remains responsive during concurrent audio buffering
**Objective**: Ensure that audio buffering activity does not degrade UI thread responsiveness of the consent prompt.

**Preconditions**:
- Audio is being buffered at 48kHz stereo in the background.
- Consent modal is being displayed concurrently.

**Test Steps**:
1. Start audio buffering.
2. Display the consent modal.
3. Simulate 5 rapid tap interactions on the consent button.
4. Assert all 5 tap events are processed within 100ms each.

**Expected Result**: Consent UI remains fully interactive during concurrent audio buffering.

**Code Sample**:
```typescript
it('should handle consent taps within 100ms during audio buffering', async () => {
  audioBuffer.startBuffering({ sampleRate: 48000, channels: 2 });
  const modal = await renderConsentModal({ jurisdiction: 'US-CA', language: 'en', script: preloadedScript });

  const tapLatencies = await Promise.all(
    Array.from({ length: 5 }, async () => {
      const t = performance.now();
      await modal.simulateTap();
      return performance.now() - t;
    })
  );
  tapLatencies.forEach(l => expect(l).toBeLessThan(100));
});
```

---

## Test Execution Summary

| Section | Suites | Test Cases |
|---|---|---|
| Unit Tests | 3 | 9 |
| Integration Tests | 3 | 6 |
| Edge Case Validation | 3 | 6 |
| Performance Validation | 3 | 6 |
| **Total** | **12** | **27** |

**Coverage targets**: Consent token lifecycle, jurisdiction enforcement, revocation propagation, offline resilience, group consent, script fallback, and performance SLAs.
