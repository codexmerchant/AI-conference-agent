# EPIC11 Feature 2 — Encryption Platform — Test Cases

## Test Overview
Comprehensive test suite for the Encryption Platform covering unit tests, integration tests, edge cases, and performance validation. These tests validate AES-256-GCM encryption and decryption of audio, transcript, and metadata payloads, key lifecycle management, envelope encryption with KMS, and compliance with at-rest and in-transit encryption requirements.

---

## 1. UNIT TEST SCENARIOS

### 1.1 AES-256-GCM Encrypt / Decrypt

#### TC-F2-U1.1: Encrypt and decrypt a payload produces the original plaintext
**Objective**: Verify that encrypting then decrypting a buffer with AES-256-GCM returns the original plaintext without corruption.

**Preconditions**:
- A 256-bit data encryption key (DEK) is generated and available.
- `EncryptionService` is initialised with the DEK.

**Test Steps**:
1. Define `plaintext = Buffer.from('Conference transcript segment 001')`.
2. Call `encryptionService.encrypt({ plaintext, keyId: 'dek-001' })`.
3. Assert the result contains `ciphertext`, `iv`, `authTag`.
4. Call `encryptionService.decrypt({ ciphertext, iv, authTag, keyId: 'dek-001' })`.
5. Assert the decrypted buffer equals `plaintext`.

**Expected Result**: Round-trip encryption/decryption is lossless and the auth tag validates correctly.

**Code Sample**:
```typescript
import { EncryptionService } from '@/services/encryption-service';
import { KeyManagementService } from '@/services/kms';

describe('TC-F2-U1.1 — AES-256-GCM round trip', () => {
  it('should decrypt to original plaintext', async () => {
    const kms = new KeyManagementService({ backend: 'in-memory' });
    const svc = new EncryptionService({ kms });
    const keyId = await kms.generateDEK({ algorithm: 'AES-256-GCM' });
    const plaintext = Buffer.from('Conference transcript segment 001');

    const { ciphertext, iv, authTag } = await svc.encrypt({ plaintext, keyId });
    const decrypted = await svc.decrypt({ ciphertext, iv, authTag, keyId });

    expect(decrypted).toEqual(plaintext);
  });
});
```

---

#### TC-F2-U1.2: Auth tag verification fails when ciphertext is tampered
**Objective**: Confirm that modifying even one byte of the ciphertext causes the auth tag check to fail.

**Preconditions**:
- A valid encrypted payload with `ciphertext`, `iv`, and `authTag` exists.

**Test Steps**:
1. Flip one bit in `ciphertext[0]`.
2. Call `encryptionService.decrypt({ ciphertext: tampered, iv, authTag, keyId })`.
3. Expect the promise to reject with `AuthenticationTagMismatchError`.

**Expected Result**: Any ciphertext tampering is detected and the decrypt operation is aborted.

**Code Sample**:
```typescript
it('should reject tampered ciphertext', async () => {
  const { ciphertext, iv, authTag } = await svc.encrypt({ plaintext: Buffer.from('secret'), keyId });
  const tampered = Buffer.from(ciphertext);
  tampered[0] ^= 0xff;

  await expect(svc.decrypt({ ciphertext: tampered, iv, authTag, keyId }))
    .rejects.toThrow(AuthenticationTagMismatchError);
});
```

---

#### TC-F2-U1.3: Each encrypt call produces a unique IV
**Objective**: Ensure nonce/IV uniqueness across multiple encrypt calls with the same DEK to prevent IV reuse vulnerabilities.

**Preconditions**:
- `EncryptionService` is initialised with a single DEK.

**Test Steps**:
1. Encrypt the same plaintext 100 times with the same `keyId`.
2. Collect all 100 `iv` values.
3. Assert all 100 IVs are unique.

**Expected Result**: No IV is reused across 100 encryptions, ensuring GCM security properties are maintained.

**Code Sample**:
```typescript
it('should generate a unique IV for every encrypt call', async () => {
  const ivs = await Promise.all(
    Array.from({ length: 100 }, () =>
      svc.encrypt({ plaintext: Buffer.from('same data'), keyId }).then(r => r.iv.toString('hex'))
    )
  );
  expect(new Set(ivs).size).toBe(100);
});
```

---

### 1.2 Key Lifecycle Management

#### TC-F2-U2.1: DEK rotation generates a new key version and re-encrypts the KEK wrapper
**Objective**: Verify that rotating a DEK produces a new key version and the old version is retired (not deleted) in KMS.

**Preconditions**:
- DEK `'dek-audio-001'` is at version 1.
- KMS is configured with a key encryption key (KEK).

**Test Steps**:
1. Call `kms.rotateDEK({ keyId: 'dek-audio-001' })`.
2. Assert the returned key version is 2.
3. Assert version 1 is marked `retired` (not deleted) in KMS metadata.
4. Assert version 2 can encrypt and decrypt new payloads.

**Expected Result**: Rotation produces a new active version; the old version is retained for decrypting existing data.

**Code Sample**:
```typescript
it('should rotate DEK to version 2 and retire version 1', async () => {
  const kms = new KeyManagementService({ backend: 'in-memory' });
  const keyId = await kms.generateDEK({ algorithm: 'AES-256-GCM', label: 'dek-audio-001' });

  const rotated = await kms.rotateDEK({ keyId });
  expect(rotated.version).toBe(2);

  const v1Meta = await kms.getKeyMetadata({ keyId, version: 1 });
  expect(v1Meta.status).toBe('retired');
});
```

---

#### TC-F2-U2.2: Expired DEK cannot be used to encrypt new data
**Objective**: Ensure that a DEK that has passed its expiry date is blocked from encrypting new payloads.

**Preconditions**:
- DEK `'dek-expired'` has `expiresAt` set to a past timestamp.

**Test Steps**:
1. Call `encryptionService.encrypt({ plaintext: Buffer.from('test'), keyId: 'dek-expired' })`.
2. Expect the call to reject with `KeyExpiredError`.

**Expected Result**: Expired keys are blocked on the encrypt path, forcing use of a current DEK.

**Code Sample**:
```typescript
it('should reject encryption with an expired DEK', async () => {
  await kms.setKeyExpiry({ keyId: 'dek-expired', expiresAt: new Date(Date.now() - 1000) });
  await expect(svc.encrypt({ plaintext: Buffer.from('test'), keyId: 'dek-expired' }))
    .rejects.toThrow(KeyExpiredError);
});
```

---

#### TC-F2-U2.3: Envelope encryption wraps DEK under KEK correctly
**Objective**: Validate that the DEK is stored encrypted under the KEK (envelope encryption) and never appears in plaintext in the key store.

**Preconditions**:
- KMS is configured with KEK `'kek-master-01'`.
- A DEK is generated and wrapped.

**Test Steps**:
1. Generate DEK `'dek-media-01'`.
2. Retrieve the stored key blob from the key store.
3. Assert the blob is not equal to the raw DEK material.
4. Unwrap the blob using KEK; assert the unwrapped bytes equal the original DEK material.

**Expected Result**: The key store never holds a plaintext DEK; the envelope is only openable via the KEK.

**Code Sample**:
```typescript
it('should store DEK encrypted under KEK', async () => {
  const { rawKey, keyId } = await kms.generateDEK({ kekId: 'kek-master-01', algorithm: 'AES-256-GCM' });
  const storedBlob = await keyStore.getRawBlob(keyId);

  expect(storedBlob).not.toEqual(rawKey);

  const unwrapped = await kms.unwrapDEK({ keyId, kekId: 'kek-master-01' });
  expect(unwrapped).toEqual(rawKey);
});
```

---

### 1.3 In-Transit Encryption Verification

#### TC-F2-U3.1: TLS 1.3 is enforced on all outbound API connections
**Objective**: Verify that the HTTP client used by the encryption service only establishes TLS 1.3 or higher connections.

**Preconditions**:
- TLS inspection proxy is configured in the test environment.

**Test Steps**:
1. Initiate a KMS key-fetch call.
2. Intercept the TLS handshake via the inspection proxy.
3. Assert the negotiated protocol version is `TLSv1.3`.

**Expected Result**: Only TLS 1.3 is used on outbound connections; 1.2 and below are rejected.

**Code Sample**:
```typescript
it('should negotiate TLS 1.3 on outbound KMS connections', async () => {
  const tlsInspector = new TLSInspectionProxy({ allowedVersions: ['TLSv1.3'] });
  const kmsClient = new KMSHttpClient({ proxy: tlsInspector });

  await kmsClient.fetchKey('kek-master-01');
  expect(tlsInspector.negotiatedVersion).toBe('TLSv1.3');
});
```

---

#### TC-F2-U3.2: Plaintext payload is never logged in transit layer
**Objective**: Confirm that the encryption service does not accidentally log plaintext payloads at the DEBUG or INFO log levels.

**Preconditions**:
- Log capture is enabled at DEBUG level.

**Test Steps**:
1. Encrypt a known secret string `'SENSITIVE_PAYLOAD_001'`.
2. Scan all captured log lines for occurrences of the plaintext string.
3. Assert no log line contains `'SENSITIVE_PAYLOAD_001'`.

**Expected Result**: Plaintext never appears in application logs at any level.

**Code Sample**:
```typescript
it('should never log plaintext payload', async () => {
  const logCapture = new LogCapture({ level: 'debug' });
  await svc.encrypt({ plaintext: Buffer.from('SENSITIVE_PAYLOAD_001'), keyId });

  const sensitiveLines = logCapture.lines.filter(l => l.includes('SENSITIVE_PAYLOAD_001'));
  expect(sensitiveLines).toHaveLength(0);
});
```

---

#### TC-F2-U3.3: Cipher suite negotiation rejects weak algorithms
**Objective**: Ensure the TLS configuration rejects connections offering only RC4, DES, or 3DES cipher suites.

**Preconditions**:
- A mock client attempting to connect with `RC4-SHA` cipher suite.

**Test Steps**:
1. Attempt a TLS handshake with a client advertising only `RC4-SHA`.
2. Assert the connection is refused by the server.
3. Assert a `WeakCipherRejected` security event is emitted.

**Expected Result**: Connections negotiating weak ciphers are refused and the event is auditable.

**Code Sample**:
```typescript
it('should refuse connections with weak cipher suites', async () => {
  const weakClient = new MockTLSClient({ cipherSuites: ['RC4-SHA'] });
  await expect(weakClient.connect(encryptionEndpoint)).rejects.toThrow(ConnectionRefusedError);
  expect(securityEvents).toContainEqual(expect.objectContaining({ type: 'WeakCipherRejected' }));
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Encryption Service ↔ KMS Integration

#### TC-F2-I1.1: Encrypt / decrypt cycle using KMS-backed DEK
**Objective**: Validate end-to-end encryption and decryption when the DEK is fetched from a live KMS (test mode).

**Preconditions**:
- KMS test instance is running with `kek-master-01` provisioned.
- `EncryptionService` is configured to use the KMS backend.

**Test Steps**:
1. Request a new DEK from KMS.
2. Encrypt a 1MB audio segment using the DEK.
3. Simulate a process restart (flush in-memory DEK cache).
4. Decrypt the ciphertext — the service must re-fetch the DEK from KMS.
5. Assert decrypted data matches the original.

**Expected Result**: Decryption succeeds after a cache flush by fetching the DEK from KMS, proving no plaintext DEK is stored locally.

**Code Sample**:
```typescript
it('should decrypt after in-memory DEK cache is cleared', async () => {
  const keyId = await kms.generateDEK({ kekId: 'kek-master-01', algorithm: 'AES-256-GCM' });
  const original = crypto.randomBytes(1024 * 1024);
  const encrypted = await svc.encrypt({ plaintext: original, keyId });

  svc.clearDEKCache();

  const decrypted = await svc.decrypt({ ...encrypted, keyId });
  expect(decrypted).toEqual(original);
});
```

---

#### TC-F2-I1.2: KMS unavailability returns graceful error without leaking key material
**Objective**: Confirm that when KMS is unreachable, the service returns a typed error rather than throwing an unhandled exception or exposing internal key state.

**Preconditions**:
- KMS endpoint is mocked to return 503.

**Test Steps**:
1. Attempt to encrypt a payload.
2. Assert the call rejects with `KMSUnavailableError`.
3. Assert no partial key material appears in the error message or stack trace.

**Expected Result**: Graceful degradation with a clean error; no key material leakage.

**Code Sample**:
```typescript
it('should return KMSUnavailableError when KMS is down', async () => {
  kmsServer.setStatus(503);
  await expect(svc.encrypt({ plaintext: Buffer.from('data'), keyId }))
    .rejects.toThrow(KMSUnavailableError);
});
```

---

### 2.2 Storage Encryption Integration

#### TC-F2-I2.1: Audio file written to object storage is encrypted at rest
**Objective**: Verify that files written to the object storage layer are stored in encrypted form, not as raw audio bytes.

**Preconditions**:
- Storage service is configured with the encryption service as middleware.
- Object storage is a test S3-compatible instance.

**Test Steps**:
1. Write a known audio segment to storage via `storageService.write({ sessionId, data: audioBuffer })`.
2. Read the raw object bytes directly from S3 (bypassing the storage service).
3. Assert the raw bytes do not start with the RIFF/WebM/OGG magic bytes of the original audio.
4. Decrypt via the encryption service and assert the decrypted bytes match `audioBuffer`.

**Expected Result**: Object storage contains only ciphertext; plaintext audio is never written to disk.

**Code Sample**:
```typescript
it('should store only ciphertext in object storage', async () => {
  const audioBuffer = loadFixture('sample-audio.webm');
  await storageService.write({ sessionId: 'sess-enc-001', data: audioBuffer });

  const rawBytes = await s3Client.getObjectRaw({ bucket: TEST_BUCKET, key: 'sess-enc-001' });
  expect(rawBytes.slice(0, 4).toString('hex')).not.toBe('1a45dfa3'); // WebM magic bytes

  const decrypted = await svc.decrypt({ ...parseEncryptedBlob(rawBytes) });
  expect(decrypted).toEqual(audioBuffer);
});
```

---

#### TC-F2-I2.2: Transcript metadata is encrypted with a separate DEK from audio
**Objective**: Ensure that transcript metadata uses a distinct DEK from the audio DEK, providing key isolation.

**Preconditions**:
- Session has both audio and transcript metadata stored.

**Test Steps**:
1. Retrieve the DEK ID used to encrypt the audio segment.
2. Retrieve the DEK ID used to encrypt the transcript metadata.
3. Assert the two DEK IDs are different.

**Expected Result**: Audio and transcript data are encrypted under separate keys, limiting the blast radius of key compromise.

**Code Sample**:
```typescript
it('should use separate DEKs for audio and transcript', async () => {
  const audioDEK = await storageService.getDEKForObject({ sessionId: 'sess-enc-002', type: 'audio' });
  const transcriptDEK = await storageService.getDEKForObject({ sessionId: 'sess-enc-002', type: 'transcript' });
  expect(audioDEK.keyId).not.toBe(transcriptDEK.keyId);
});
```

---

### 2.3 Key Rotation Integration

#### TC-F2-I3.1: Old DEK version can still decrypt data encrypted before rotation
**Objective**: Validate backward compatibility: data encrypted with DEK version 1 can still be decrypted after rotation to version 2.

**Preconditions**:
- Data was encrypted with DEK version 1.
- DEK has been rotated to version 2.

**Test Steps**:
1. Encrypt data with version 1.
2. Rotate the DEK to version 2.
3. Call `encryptionService.decrypt(...)` with the version-1 `keyId`.
4. Assert decryption succeeds and returns the original plaintext.

**Expected Result**: Retired key versions remain usable for decryption of existing data.

**Code Sample**:
```typescript
it('should decrypt v1-encrypted data after rotation to v2', async () => {
  const plaintext = Buffer.from('historic transcript segment');
  const { ciphertext, iv, authTag } = await svc.encrypt({ plaintext, keyId: 'dek-001:v1' });
  await kms.rotateDEK({ keyId: 'dek-001' });

  const decrypted = await svc.decrypt({ ciphertext, iv, authTag, keyId: 'dek-001:v1' });
  expect(decrypted).toEqual(plaintext);
});
```

---

#### TC-F2-I3.2: Automated re-encryption job migrates existing objects to current DEK version
**Objective**: Confirm that the scheduled re-encryption job re-encrypts existing objects using the current DEK version.

**Preconditions**:
- 10 objects are stored encrypted with DEK version 1.
- DEK has been rotated to version 2.

**Test Steps**:
1. Trigger the re-encryption job.
2. Wait for completion.
3. Assert all 10 objects now report `keyVersion = 2`.
4. Decrypt all 10 objects and assert plaintext is unchanged.

**Expected Result**: All objects are migrated to the current key version without data loss.

**Code Sample**:
```typescript
it('should re-encrypt all objects to current DEK version', async () => {
  await reEncryptionJob.run({ keyId: 'dek-001', targetVersion: 2 });
  const objects = await storageService.listObjects({ sessionId: 'sess-reenc-01' });
  objects.forEach(obj => expect(obj.keyVersion).toBe(2));
  for (const obj of objects) {
    const decrypted = await svc.decrypt({ ...obj.encryptedPayload });
    expect(decrypted).toEqual(obj.originalPlaintext);
  }
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Large Payload Encryption

#### TC-F2-E1.1: Encrypting a 500MB audio file completes without memory exhaustion
**Objective**: Validate that the encryption service uses streaming encryption for large files rather than loading the full payload into memory.

**Preconditions**:
- A 500MB synthetic audio file is available.
- Process memory limit is set to 256MB to force streaming.

**Test Steps**:
1. Call `encryptionService.encryptStream({ inputStream: largeFileStream, keyId })`.
2. Monitor peak heap usage during encryption.
3. Assert peak heap usage stays below 128MB.
4. Assert the encrypted output stream produces valid ciphertext.

**Expected Result**: Large files are encrypted via streaming with bounded memory usage.

**Code Sample**:
```typescript
it('should encrypt a 500MB file with bounded memory', async () => {
  const inputStream = createReadStream(LARGE_FILE_PATH);
  const heapSamples: number[] = [];

  const monitor = setInterval(() => heapSamples.push(process.memoryUsage().heapUsed), 100);
  await svc.encryptStream({ inputStream, keyId, outputPath: ENCRYPTED_OUTPUT_PATH });
  clearInterval(monitor);

  const peakMB = Math.max(...heapSamples) / 1024 / 1024;
  expect(peakMB).toBeLessThan(128);
});
```

---

#### TC-F2-E1.2: Empty plaintext buffer is handled without throwing
**Objective**: Ensure encrypting a zero-length buffer does not cause an unhandled error.

**Preconditions**:
- `EncryptionService` is initialised.

**Test Steps**:
1. Call `encryptionService.encrypt({ plaintext: Buffer.alloc(0), keyId })`.
2. Assert a valid encrypted result is returned.
3. Decrypt and assert an empty buffer is returned.

**Expected Result**: Empty payloads are encrypted and decrypted cleanly without errors.

**Code Sample**:
```typescript
it('should handle empty plaintext buffer', async () => {
  const encrypted = await svc.encrypt({ plaintext: Buffer.alloc(0), keyId });
  expect(encrypted.ciphertext).toBeDefined();
  const decrypted = await svc.decrypt({ ...encrypted, keyId });
  expect(decrypted.length).toBe(0);
});
```

---

### 3.2 Key Material Zeroization

#### TC-F2-E2.1: DEK material is zeroized in memory after use
**Objective**: Verify that raw DEK bytes are overwritten in memory after each encrypt/decrypt operation.

**Preconditions**:
- Memory inspection hook is available in the test environment.

**Test Steps**:
1. Encrypt a payload.
2. Inspect process heap for the raw DEK bytes after the call completes.
3. Assert the DEK bytes no longer appear in readable heap memory.

**Expected Result**: Key material is zeroized immediately after use, reducing window of exposure to memory-scraping attacks.

**Code Sample**:
```typescript
it('should zeroize DEK bytes after encrypt operation', async () => {
  const rawDEK = await kms.exportDEKForTest(keyId);
  await svc.encrypt({ plaintext: Buffer.from('data'), keyId });

  const heapSnapshot = await captureHeapSnapshot();
  const matches = findBytesInHeap(heapSnapshot, rawDEK);
  expect(matches).toBe(0);
});
```

---

#### TC-F2-E2.2: Process crash during encryption does not leave partial plaintext on disk
**Objective**: Confirm that a simulated process crash mid-encryption does not result in a partially written plaintext file.

**Preconditions**:
- Encryption is configured to write to a temp file before atomic rename.

**Test Steps**:
1. Start encrypting a 100MB file.
2. Kill the process after 50MB are written.
3. Inspect the output directory.
4. Assert no partial or fully readable plaintext file exists.

**Expected Result**: Atomic write semantics ensure only complete, encrypted files are visible in storage.

**Code Sample**:
```typescript
it('should leave no partial plaintext on crash', async () => {
  const writePromise = svc.encryptStream({ inputStream: largeStream, keyId, outputPath: OUTPUT_PATH });
  setTimeout(() => process.kill(process.pid, 'SIGKILL'), 200);

  await expect(writePromise).rejects.toBeDefined();
  const files = readdirSync(OUTPUT_DIR);
  const plainFiles = files.filter(f => !f.endsWith('.enc') && !f.endsWith('.tmp'));
  expect(plainFiles).toHaveLength(0);
});
```

---

### 3.3 Algorithm Agility

#### TC-F2-E3.1: Service rejects encryption requests specifying a disallowed algorithm
**Objective**: Ensure the encryption service does not allow callers to specify weaker algorithms like AES-128-CBC.

**Preconditions**:
- Allowed algorithm policy is set to `['AES-256-GCM']`.

**Test Steps**:
1. Call `encryptionService.encrypt({ plaintext, keyId, algorithm: 'AES-128-CBC' })`.
2. Expect the call to reject with `AlgorithmNotAllowedError`.

**Expected Result**: Callers cannot downgrade encryption strength by specifying a weaker algorithm.

**Code Sample**:
```typescript
it('should reject AES-128-CBC as disallowed algorithm', async () => {
  await expect(svc.encrypt({ plaintext: Buffer.from('data'), keyId, algorithm: 'AES-128-CBC' }))
    .rejects.toThrow(AlgorithmNotAllowedError);
});
```

---

#### TC-F2-E3.2: Encrypted payload includes algorithm metadata for future-proof decryption
**Objective**: Verify that each encrypted blob includes an `algorithm` field so decryption logic can handle future algorithm migrations.

**Preconditions**:
- Encryption service produces a structured `EncryptedPayload` object.

**Test Steps**:
1. Encrypt a payload.
2. Inspect the structured result.
3. Assert `result.algorithm === 'AES-256-GCM'`.

**Expected Result**: Algorithm metadata is stored with each payload, enabling safe migration to stronger algorithms later.

**Code Sample**:
```typescript
it('should include algorithm metadata in encrypted payload', async () => {
  const result = await svc.encrypt({ plaintext: Buffer.from('data'), keyId });
  expect(result.algorithm).toBe('AES-256-GCM');
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Encryption Throughput

#### TC-F2-P1.1: Encrypt 1000 audio segments per second at 64KB each
**Objective**: Validate encryption throughput is sufficient for real-time audio processing at conference scale.

**Preconditions**:
- DEK is pre-loaded in memory.
- Workload: 1,000 × 64KB segments.

**Test Steps**:
1. Encrypt 1,000 × 64KB buffers in parallel.
2. Measure total elapsed time.
3. Assert throughput exceeds 1,000 segments/second.

**Expected Result**: The encryption service can sustain real-time audio encryption without becoming a bottleneck.

**Code Sample**:
```typescript
it('should encrypt 1000 × 64KB segments per second', async () => {
  const segments = Array.from({ length: 1000 }, () => crypto.randomBytes(64 * 1024));
  const start = Date.now();
  await Promise.all(segments.map(s => svc.encrypt({ plaintext: s, keyId })));
  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(1000); // 1000 segments in under 1 second
});
```

---

#### TC-F2-P1.2: Streaming encryption of 1GB file completes within 30 seconds
**Objective**: Confirm the streaming encryption path meets the 30-second SLA for large file archival.

**Preconditions**:
- A 1GB synthetic audio file is available.

**Test Steps**:
1. Start the streaming encrypt operation.
2. Measure elapsed time until the output stream closes.
3. Assert elapsed time is under 30 seconds.

**Expected Result**: 1GB files are encrypted within the archival SLA.

**Code Sample**:
```typescript
it('should stream-encrypt 1GB file within 30 seconds', async () => {
  const start = Date.now();
  await svc.encryptStream({ inputStream: createReadStream(ONE_GB_FILE), keyId, outputPath: ENC_OUT });
  expect(Date.now() - start).toBeLessThan(30_000);
});
```

---

### 4.2 Key Fetch Latency

#### TC-F2-P2.1: DEK cache hit resolves within 1ms
**Objective**: Ensure that a cached DEK lookup does not add measurable latency to the encrypt path.

**Preconditions**:
- DEK `'dek-001'` is warm in the in-process cache.

**Test Steps**:
1. Measure the time for `encryptionService.encrypt(...)` when the DEK is cached.
2. Assert the overhead for key lookup is under 1ms.

**Expected Result**: Cache hits have negligible key-fetch overhead.

**Code Sample**:
```typescript
it('should resolve DEK from cache in under 1ms', async () => {
  await svc.warmCache(keyId); // pre-load
  const start = performance.now();
  await svc.encrypt({ plaintext: Buffer.from('data'), keyId });
  const keyFetchOverhead = performance.now() - start;
  expect(keyFetchOverhead).toBeLessThan(1);
});
```

---

#### TC-F2-P2.2: DEK cache miss incurs at most 20ms additional latency vs. cache hit
**Objective**: Verify that a cold DEK fetch from KMS adds no more than 20ms latency overhead.

**Preconditions**:
- DEK is not in cache; KMS is running locally in test mode.

**Test Steps**:
1. Clear the DEK cache.
2. Measure encrypt time (DEK cache miss path).
3. Warm the cache and measure encrypt time (DEK cache hit path).
4. Assert the difference is under 20ms.

**Expected Result**: KMS round-trip overhead is bounded and acceptable for real-time use.

**Code Sample**:
```typescript
it('should add at most 20ms for a cold DEK fetch vs. cache hit', async () => {
  svc.clearDEKCache();
  const coldStart = performance.now();
  await svc.encrypt({ plaintext: Buffer.from('data'), keyId });
  const coldTime = performance.now() - coldStart;

  const hotStart = performance.now();
  await svc.encrypt({ plaintext: Buffer.from('data'), keyId });
  const hotTime = performance.now() - hotStart;

  expect(coldTime - hotTime).toBeLessThan(20);
});
```

---

### 4.3 Key Rotation Performance

#### TC-F2-P3.1: DEK rotation completes within 2 seconds
**Objective**: Ensure DEK rotation does not disrupt active encryption operations.

**Preconditions**:
- `'dek-audio-001'` is the active DEK.
- Active encryption workload is running concurrently.

**Test Steps**:
1. Start continuous encryption workload.
2. Trigger DEK rotation.
3. Measure time from rotation request to new key becoming active.
4. Assert rotation completes within 2 seconds.

**Expected Result**: Key rotation is fast enough not to interrupt active sessions.

**Code Sample**:
```typescript
it('should complete DEK rotation within 2 seconds', async () => {
  const start = Date.now();
  await kms.rotateDEK({ keyId: 'dek-audio-001' });
  const activeKey = await kms.getCurrentActiveKey('dek-audio-001');
  expect(activeKey.version).toBe(2);
  expect(Date.now() - start).toBeLessThan(2000);
});
```

---

#### TC-F2-P3.2: In-flight encryptions complete successfully during DEK rotation
**Objective**: Confirm that encrypt operations already in flight complete without error when a DEK rotation occurs concurrently.

**Preconditions**:
- 50 encrypt operations are in flight.

**Test Steps**:
1. Start 50 concurrent encrypt operations.
2. Trigger DEK rotation mid-flight.
3. Assert all 50 operations complete without error.
4. Assert each returned payload decrypts correctly.

**Expected Result**: Rotation is non-disruptive to in-flight operations.

**Code Sample**:
```typescript
it('should not disrupt in-flight encryptions during rotation', async () => {
  const ops = Array.from({ length: 50 }, (_, i) =>
    svc.encrypt({ plaintext: Buffer.from(`segment-${i}`), keyId })
  );
  kms.rotateDEK({ keyId }); // fire and forget
  const results = await Promise.all(ops);
  expect(results).toHaveLength(50);
  for (const r of results) {
    await expect(svc.decrypt({ ...r, keyId })).resolves.toBeDefined();
  }
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

**Coverage targets**: AES-256-GCM correctness, IV uniqueness, auth tag integrity, DEK/KEK envelope encryption, key rotation, streaming encryption, algorithm policy enforcement, and throughput SLAs.
