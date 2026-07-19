# EPIC08 Feature 1 — Gmail Integration — Test Cases

## Test Overview
Comprehensive test suite for Gmail Integration covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 OAuth2 Token Management

#### TC-F1-U1.1: Access Token Refresh on Expiry
**Objective**: Verify that the Gmail client automatically refreshes an expired access token using the stored refresh token before making an API call.

**Preconditions**:
- A valid refresh token is stored in the credential vault
- The current access token has an `expiresAt` timestamp 5 seconds in the past

**Test Steps**:
1. Instantiate `GmailOAuthClient` with an expired access token and valid refresh token
2. Call `ensureValidToken()`
3. Assert the mock token endpoint was called once with `grant_type = 'refresh_token'`
4. Assert the returned token has a new `expiresAt` at least 3500 s in the future

**Expected Result**: Fresh access token returned; credential store updated; no `401` propagated to caller.

**Code Sample**:
```typescript
describe('GmailOAuthClient.ensureValidToken', () => {
  it('should refresh an expired access token', async () => {
    const expiredCredential: OAuthCredential = {
      accessToken: 'old-token',
      refreshToken: 'valid-refresh-token',
      expiresAt: Date.now() - 5000,
      scope: 'https://www.googleapis.com/auth/gmail.readonly',
    };
    mockTokenEndpoint.mockResolvedValue({
      access_token: 'new-access-token',
      expires_in: 3600,
    });

    const client = new GmailOAuthClient(expiredCredential, mockCredentialStore);
    const token = await client.ensureValidToken();

    expect(mockTokenEndpoint).toHaveBeenCalledWith(
      expect.objectContaining({ grant_type: 'refresh_token' })
    );
    expect(token.accessToken).toBe('new-access-token');
    expect(token.expiresAt).toBeGreaterThan(Date.now() + 3500_000);
  });
});
```

---

#### TC-F1-U1.2: Token Refresh Failure Emits Credential Error
**Objective**: Verify that when the Google token endpoint returns `invalid_grant`, the client emits a `CredentialRevokedError` and clears stored tokens.

**Preconditions**:
- Refresh token is revoked on the Google side
- Mock token endpoint returns `{ error: 'invalid_grant' }`

**Test Steps**:
1. Configure mock token endpoint to reject with `{ error: 'invalid_grant' }`
2. Call `ensureValidToken()`
3. Assert `CredentialRevokedError` is thrown
4. Assert `credentialStore.clear(userId)` was called

**Expected Result**: `CredentialRevokedError` thrown; stored tokens cleared; user re-auth required.

**Code Sample**:
```typescript
it('should throw CredentialRevokedError and clear tokens on invalid_grant', async () => {
  mockTokenEndpoint.mockRejectedValue({ error: 'invalid_grant' });
  const client = new GmailOAuthClient(expiredCredential, mockCredentialStore);

  await expect(client.ensureValidToken()).rejects.toThrow(CredentialRevokedError);
  expect(mockCredentialStore.clear).toHaveBeenCalledWith(expiredCredential.userId);
});
```

---

#### TC-F1-U1.3: Token Not Refreshed When Still Valid
**Objective**: Verify no unnecessary refresh calls are made when the access token is valid with >60 s remaining.

**Test Steps**:
1. Provide an access token with `expiresAt = Date.now() + 1800_000`
2. Call `ensureValidToken()`
3. Assert mock token endpoint was NOT called

**Expected Result**: Existing token returned unchanged; zero HTTP calls made.

**Code Sample**:
```typescript
it('should return existing token without calling endpoint when still valid', async () => {
  const validCredential: OAuthCredential = {
    accessToken: 'still-valid-token',
    refreshToken: 'refresh',
    expiresAt: Date.now() + 1_800_000,
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
  };
  const client = new GmailOAuthClient(validCredential, mockCredentialStore);
  const token = await client.ensureValidToken();

  expect(mockTokenEndpoint).not.toHaveBeenCalled();
  expect(token.accessToken).toBe('still-valid-token');
});
```

---

### 1.2 Email Parsing and Metadata Extraction

#### TC-F1-U2.1: Business Card Email Thread Detected
**Objective**: Verify that `GmailEmailParser` correctly identifies a post-conference "nice to meet you" email thread and extracts sender name, company, and contact identifiers.

**Preconditions**:
- Raw Gmail message payload with headers `From`, `Subject`, and plain-text body available
- NLP name-extraction service mocked

**Test Steps**:
1. Supply a raw Gmail message with subject `"Great meeting you at TechConf 2026"` and body containing signature
2. Call `parseContactableEmail(rawMessage)`
3. Assert `senderEmail`, `senderName`, `company`, and `linkedInUrl` extracted

**Expected Result**: All four fields populated; `confidence >= 0.85`; thread ID preserved.

**Code Sample**:
```typescript
describe('GmailEmailParser', () => {
  it('should extract contact metadata from a post-conference email', async () => {
    const rawMessage = buildRawGmailMessage({
      from: 'Jane Doe <jane.doe@acmecorp.com>',
      subject: 'Great meeting you at TechConf 2026',
      body: 'Hi,\nWonderful connecting...\n\nJane Doe\nHead of Partnerships\nAcme Corp\nhttps://linkedin.com/in/janedoe',
    });

    const parser = new GmailEmailParser(mockNlpClient);
    const result = await parser.parseContactableEmail(rawMessage);

    expect(result.senderEmail).toBe('jane.doe@acmecorp.com');
    expect(result.senderName).toBe('Jane Doe');
    expect(result.company).toBe('Acme Corp');
    expect(result.linkedInUrl).toBe('https://linkedin.com/in/janedoe');
  });
});
```

---

#### TC-F1-U2.2: Attachment Metadata Extracted Correctly
**Objective**: Verify that email attachments (e.g., vCard, PDF deck) are catalogued with filename, MIME type, and size.

**Test Steps**:
1. Build raw Gmail message with two attachments: `contact.vcf` and `deck.pdf`
2. Call `parseContactableEmail(rawMessage)`
3. Assert `attachments` array has length 2 with correct `filename`, `mimeType`, `sizeBytes`

**Expected Result**: Both attachments catalogued accurately; inline images excluded.

**Code Sample**:
```typescript
it('should catalogue email attachments with correct metadata', async () => {
  const rawMessage = buildRawGmailMessageWithAttachments([
    { filename: 'contact.vcf', mimeType: 'text/vcard', sizeBytes: 1024 },
    { filename: 'deck.pdf', mimeType: 'application/pdf', sizeBytes: 204800 },
  ]);

  const result = await parser.parseContactableEmail(rawMessage);

  expect(result.attachments).toHaveLength(2);
  expect(result.attachments[0]).toMatchObject({ filename: 'contact.vcf', mimeType: 'text/vcard' });
  expect(result.attachments[1]).toMatchObject({ filename: 'deck.pdf', mimeType: 'application/pdf' });
});
```

---

#### TC-F1-U2.3: HTML-Only Email Body Stripped to Plain Text
**Objective**: Verify that HTML email bodies are sanitized and reduced to readable plain text before NLP processing.

**Test Steps**:
1. Provide a `text/html` MIME part with `<b>`, `<a href>`, and `<img>` tags
2. Call `stripHtmlToText(htmlBody)`
3. Assert no HTML tags remain; link hrefs preserved as plain text; img tags removed

**Expected Result**: Clean plain-text string; no tags; hyperlink URLs retained inline.

**Code Sample**:
```typescript
it('should strip HTML tags and preserve link text', () => {
  const html = '<p>Visit <a href="https://example.com">our site</a> for more info.</p>';
  const result = GmailEmailParser.stripHtmlToText(html);
  expect(result).toBe('Visit our site (https://example.com) for more info.');
  expect(result).not.toMatch(/<[^>]+>/);
});
```

---

### 1.3 Label and Filter Synchronization

#### TC-F1-U3.1: Conference Label Created If Not Existing
**Objective**: Verify `GmailLabelManager` creates a `ConferenceAgent/TechConf-2026` label when it does not already exist.

**Test Steps**:
1. Mock `gmail.users.labels.list` to return an empty label list
2. Call `ensureConferenceLabel('TechConf-2026')`
3. Assert `gmail.users.labels.create` called with correct name and `labelListVisibility = 'labelShow'`

**Expected Result**: Label created; returned label ID stored in session context.

**Code Sample**:
```typescript
describe('GmailLabelManager', () => {
  it('should create a conference label when none exists', async () => {
    mockGmailApi.users.labels.list.mockResolvedValue({ data: { labels: [] } });
    mockGmailApi.users.labels.create.mockResolvedValue({ data: { id: 'Label_123', name: 'ConferenceAgent/TechConf-2026' } });

    const manager = new GmailLabelManager(mockGmailApi);
    const labelId = await manager.ensureConferenceLabel('TechConf-2026');

    expect(mockGmailApi.users.labels.create).toHaveBeenCalledWith(
      expect.objectContaining({ requestBody: expect.objectContaining({ name: 'ConferenceAgent/TechConf-2026' }) })
    );
    expect(labelId).toBe('Label_123');
  });
});
```

---

#### TC-F1-U3.2: Existing Label Reused Without Duplicate Creation
**Objective**: Verify that when the `ConferenceAgent/TechConf-2026` label already exists, `ensureConferenceLabel` returns the existing ID without creating a duplicate.

**Test Steps**:
1. Mock `gmail.users.labels.list` to return an existing label with `id = 'Label_99'`
2. Call `ensureConferenceLabel('TechConf-2026')`
3. Assert `gmail.users.labels.create` was NOT called

**Expected Result**: Existing `Label_99` returned; no duplicate creation API call.

**Code Sample**:
```typescript
it('should reuse an existing conference label without creating a duplicate', async () => {
  mockGmailApi.users.labels.list.mockResolvedValue({
    data: { labels: [{ id: 'Label_99', name: 'ConferenceAgent/TechConf-2026' }] },
  });

  const labelId = await manager.ensureConferenceLabel('TechConf-2026');

  expect(mockGmailApi.users.labels.create).not.toHaveBeenCalled();
  expect(labelId).toBe('Label_99');
});
```

---

#### TC-F1-U3.3: Filter Applied to Label Incoming Conference Emails
**Objective**: Verify that a Gmail filter is created to auto-label emails matching conference domain criteria.

**Test Steps**:
1. Call `createConferenceFilter({ fromDomain: 'techconf.io', labelId: 'Label_123' })`
2. Assert `gmail.users.settings.filters.create` called with `from: '*@techconf.io'` and `addLabelIds: ['Label_123']`

**Expected Result**: Filter created; future emails from `techconf.io` automatically labelled.

**Code Sample**:
```typescript
it('should create a Gmail filter for conference domain emails', async () => {
  await manager.createConferenceFilter({ fromDomain: 'techconf.io', labelId: 'Label_123' });

  expect(mockGmailApi.users.settings.filters.create).toHaveBeenCalledWith(
    expect.objectContaining({
      requestBody: {
        criteria: { from: '*@techconf.io' },
        action: { addLabelIds: ['Label_123'], removeLabelIds: [] },
      },
    })
  );
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Gmail API End-to-End Message Retrieval

#### TC-F1-I1.1: Paginated Inbox Fetch Collects All Messages
**Objective**: Verify that `GmailInboxSync.fetchConferenceEmails()` follows `nextPageToken` pagination until all messages are collected.

**Preconditions**:
- Gmail API sandbox returns 3 pages of 10 messages each with `nextPageToken`
- Valid OAuth credential in test credential store

**Test Steps**:
1. Instantiate `GmailInboxSync` with sandbox credentials
2. Call `fetchConferenceEmails({ labelId: 'Label_123', maxResults: 100 })`
3. Assert total messages returned = 30
4. Assert `gmail.users.messages.list` called 3 times (once per page)

**Expected Result**: 30 messages collected; pagination followed; no duplicates.

**Code Sample**:
```typescript
describe('GmailInboxSync integration', () => {
  it('should paginate through all inbox pages', async () => {
    setupPaginatedGmailSandbox({ pages: 3, messagesPerPage: 10 });

    const sync = new GmailInboxSync(sandboxCredentials, mockLabelManager);
    const messages = await sync.fetchConferenceEmails({ labelId: 'Label_123', maxResults: 100 });

    expect(messages).toHaveLength(30);
    expect(gmailListSpy).toHaveBeenCalledTimes(3);
  });
});
```

---

#### TC-F1-I1.2: Rate-Limited Response Triggers Exponential Backoff
**Objective**: Verify that a `429 Too Many Requests` response causes the client to retry with exponential backoff and eventually succeed.

**Test Steps**:
1. Configure sandbox to return `429` for first 2 calls, then `200` with message list on 3rd
2. Call `fetchConferenceEmails()`
3. Assert final result contains expected messages
4. Assert retry delays follow exponential pattern (1 s, 2 s)

**Expected Result**: Request succeeds on 3rd attempt; messages returned; delays logged.

**Code Sample**:
```typescript
it('should retry with exponential backoff on 429 rate limit', async () => {
  let callCount = 0;
  mockGmailApi.users.messages.list.mockImplementation(async () => {
    callCount++;
    if (callCount < 3) throw Object.assign(new Error(), { code: 429 });
    return { data: { messages: [{ id: 'msg1' }], nextPageToken: undefined } };
  });

  const messages = await sync.fetchConferenceEmails({ labelId: 'Label_123' });

  expect(messages).toHaveLength(1);
  expect(mockSleep).toHaveBeenNthCalledWith(1, 1000);
  expect(mockSleep).toHaveBeenNthCalledWith(2, 2000);
});
```

---

### 2.2 Contact Extraction Pipeline

#### TC-F1-I2.1: Full Pipeline from Gmail Fetch to Contact Record Creation
**Objective**: Verify that fetched emails are parsed, contacts extracted, and written to the contact store in a single pipeline invocation.

**Test Steps**:
1. Seed sandbox Gmail with 5 post-conference emails from unique senders
2. Call `GmailContactPipeline.run({ userId, conferenceId })`
3. Query contact store
4. Assert 5 contact records created with correct `sourceEmail = 'gmail'`

**Expected Result**: 5 contacts created; each linked to source email thread ID; pipeline completes without error.

**Code Sample**:
```typescript
describe('GmailContactPipeline integration', () => {
  it('should create contact records from fetched conference emails', async () => {
    seedGmailSandbox(5, { subject: 'Great meeting you at TechConf 2026' });

    await GmailContactPipeline.run({ userId: 'user_1', conferenceId: 'conf_abc' });

    const contacts = await contactStore.findBySource('gmail', 'conf_abc');
    expect(contacts).toHaveLength(5);
    contacts.forEach(c => expect(c.sourceEmail).toBe('gmail'));
  });
});
```

---

#### TC-F1-I2.2: Duplicate Email Thread Not Re-Processed
**Objective**: Verify that re-running the pipeline on already-processed email threads does not create duplicate contact records.

**Test Steps**:
1. Run `GmailContactPipeline.run()` for the same inbox twice
2. Assert contact store still contains exactly 5 records (not 10)
3. Assert second run emits `skipped` events for each duplicate thread

**Expected Result**: Idempotent behavior; 5 unique contacts; duplicate threads skipped.

**Code Sample**:
```typescript
it('should skip already-processed email threads on re-run', async () => {
  seedGmailSandbox(5, { subject: 'Great meeting you at TechConf 2026' });

  await GmailContactPipeline.run({ userId: 'user_1', conferenceId: 'conf_abc' });
  await GmailContactPipeline.run({ userId: 'user_1', conferenceId: 'conf_abc' });

  const contacts = await contactStore.findBySource('gmail', 'conf_abc');
  expect(contacts).toHaveLength(5);
  expect(skippedEventSpy).toHaveBeenCalledTimes(5);
});
```

---

### 2.3 Label Sync Round-Trip

#### TC-F1-I3.1: Labels Applied to Emails After Contact Creation
**Objective**: Verify that after a contact is created from a Gmail thread, the source email is auto-labelled with the conference label.

**Test Steps**:
1. Run pipeline with label application enabled
2. Fetch the labelled state of source email threads via Gmail API
3. Assert all 5 threads have `Label_123` in their `labelIds`

**Expected Result**: All source threads carry conference label; verifiable via Gmail API.

**Code Sample**:
```typescript
it('should apply the conference label to processed email threads', async () => {
  await GmailContactPipeline.run({ userId: 'user_1', conferenceId: 'conf_abc', applyLabels: true });

  for (const threadId of processedThreadIds) {
    const thread = await sandboxGmailApi.users.threads.get({ userId: 'me', id: threadId });
    expect(thread.data.messages[0].labelIds).toContain('Label_123');
  }
});
```

---

#### TC-F1-I3.2: Label Removal When Contact Is Deleted
**Objective**: Verify that when a contact record is deleted, the associated Gmail label is removed from the source thread.

**Test Steps**:
1. Create contact via pipeline (thread labelled)
2. Delete contact record via `contactStore.delete(contactId)`
3. Assert conference label removed from source thread

**Expected Result**: Label removed; thread reverts to unlabelled state; no orphaned labels.

**Code Sample**:
```typescript
it('should remove conference label when contact is deleted', async () => {
  const [contact] = await contactStore.findBySource('gmail', 'conf_abc');
  await contactStore.delete(contact.id);

  const thread = await sandboxGmailApi.users.threads.get({ userId: 'me', id: contact.sourceThreadId });
  expect(thread.data.messages[0].labelIds).not.toContain('Label_123');
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Malformed and Unusual Email Formats

#### TC-F1-E1.1: Email with No Body Content Handled Gracefully
**Objective**: Verify the parser handles emails with empty or missing body parts without throwing an exception.

**Preconditions**:
- Gmail message with `parts = []` and no plain-text or HTML content

**Test Steps**:
1. Provide raw Gmail message with empty `payload.parts`
2. Call `parseContactableEmail(rawMessage)`
3. Assert result has `body = ''`; no exception thrown

**Expected Result**: Parser returns partial result with empty body; pipeline continues; event logged.

**Code Sample**:
```typescript
it('should return an empty body without throwing for a message with no parts', async () => {
  const emptyMessage = buildRawGmailMessage({ parts: [] });
  const result = await parser.parseContactableEmail(emptyMessage);
  expect(result.body).toBe('');
  expect(result.senderEmail).toBeDefined();
});
```

---

#### TC-F1-E1.2: Non-Latin Characters in Sender Name Preserved
**Objective**: Verify that sender names containing CJK or Arabic characters are correctly decoded and stored.

**Test Steps**:
1. Provide email `From: 山田太郎 <taro@example.jp>`
2. Call `parseContactableEmail(rawMessage)`
3. Assert `senderName = '山田太郎'`

**Expected Result**: Unicode name preserved accurately; no garbled output.

**Code Sample**:
```typescript
it('should correctly decode non-Latin sender names', async () => {
  const rawMessage = buildRawGmailMessage({ from: '山田太郎 <taro@example.jp>' });
  const result = await parser.parseContactableEmail(rawMessage);
  expect(result.senderName).toBe('山田太郎');
});
```

---

### 3.2 Permission Scopes and Revocation

#### TC-F1-E2.1: Insufficient Scope Returns Descriptive Auth Error
**Objective**: Verify that a Gmail API call using a token with only `gmail.readonly` scope fails with a descriptive `InsufficientScopeError` when attempting to modify labels.

**Test Steps**:
1. Provide access token with scope `gmail.readonly`
2. Call `applyLabel(threadId, labelId)`
3. Assert `InsufficientScopeError` thrown with `requiredScope = 'gmail.modify'`

**Expected Result**: Descriptive error; no silent failure; scope upgrade prompt triggered.

**Code Sample**:
```typescript
it('should throw InsufficientScopeError when token lacks gmail.modify scope', async () => {
  const readOnlyToken = buildToken({ scope: 'https://www.googleapis.com/auth/gmail.readonly' });
  const manager = new GmailLabelManager(buildGmailClient(readOnlyToken));

  await expect(manager.applyLabel('thread_1', 'Label_123')).rejects.toThrow(InsufficientScopeError);
});
```

---

#### TC-F1-E2.2: Concurrent Sync Requests for Same User Serialized
**Objective**: Verify that two simultaneous `GmailInboxSync.run()` calls for the same user do not result in duplicate processing.

**Test Steps**:
1. Trigger two concurrent `sync.run({ userId: 'user_1' })` calls
2. Await both
3. Assert contact store contains exactly the expected number of unique contacts

**Expected Result**: Second concurrent call waits for or defers to the first; no duplicate records.

**Code Sample**:
```typescript
it('should serialize concurrent sync calls for the same user', async () => {
  const [r1, r2] = await Promise.all([
    sync.run({ userId: 'user_1' }),
    sync.run({ userId: 'user_1' }),
  ]);

  const contacts = await contactStore.findAll({ userId: 'user_1' });
  expect(contacts.length).toBe(expectedUniqueCount);
});
```

---

### 3.3 Webhook and Push Notification Edge Cases

#### TC-F1-E3.1: Expired Push Notification Channel Renewed Automatically
**Objective**: Verify that when a Gmail push notification channel approaches its 7-day expiry, the system automatically renews it before it lapses.

**Test Steps**:
1. Create a channel with `expiration = Date.now() + 3600_000` (1 h remaining)
2. Trigger the renewal check job
3. Assert `gmail.users.watch` called with refreshed channel parameters

**Expected Result**: Channel renewed; new expiration is 7 days out; no notification gap.

**Code Sample**:
```typescript
it('should renew a push notification channel expiring within 24 hours', async () => {
  const expiringSoon = Date.now() + 3_600_000;
  await channelStore.save({ channelId: 'ch_1', expiration: expiringSoon, userId: 'user_1' });

  await GmailPushManager.runRenewalCheck();

  expect(mockGmailApi.users.watch).toHaveBeenCalledWith(
    expect.objectContaining({ userId: 'me' })
  );
});
```

---

#### TC-F1-E3.2: Duplicate Pub/Sub Push Notification De-duplicated
**Objective**: Verify that receiving the same `historyId` twice from Pub/Sub does not trigger duplicate processing.

**Test Steps**:
1. Deliver push notification with `historyId = 42` twice
2. Assert Gmail history API called only once for `historyId = 42`
3. Assert idempotency key stored after first processing

**Expected Result**: Second identical notification skipped; idempotency key prevents re-processing.

**Code Sample**:
```typescript
it('should de-duplicate identical Pub/Sub push notifications', async () => {
  const notification = { historyId: '42', emailAddress: 'user@example.com' };

  await pushHandler.handle(notification);
  await pushHandler.handle(notification);

  expect(mockGmailApi.users.history.list).toHaveBeenCalledTimes(1);
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Inbox Sync Throughput

#### TC-F1-P1.1: 1,000 Emails Synced Within 30 Seconds
**Objective**: Verify that `GmailInboxSync` can process 1,000 messages (parse + extract + store) within 30 seconds using parallel batch requests.

**Preconditions**:
- Sandbox seeded with 1,000 Gmail messages
- Batch size configured to 100 messages per request

**Test Steps**:
1. Start timer
2. Call `sync.run({ userId: 'user_perf', maxMessages: 1000 })`
3. Stop timer on completion
4. Assert elapsed time < 30,000 ms

**Expected Result**: 1,000 messages processed in < 30 s; no memory spikes above 512 MB.

**Code Sample**:
```typescript
describe('GmailInboxSync performance', () => {
  it('should process 1000 messages in under 30 seconds', async () => {
    seedGmailSandbox(1000);
    const start = Date.now();

    await sync.run({ userId: 'user_perf', maxMessages: 1000 });

    expect(Date.now() - start).toBeLessThan(30_000);
    const contacts = await contactStore.count({ userId: 'user_perf' });
    expect(contacts).toBe(1000);
  }, 35_000);
});
```

---

#### TC-F1-P1.2: Batch API Request Reduces HTTP Round-Trips by 90%
**Objective**: Verify that using Gmail's batch endpoint for message retrieval reduces HTTP call count vs. individual fetches by at least 90%.

**Test Steps**:
1. Fetch 100 messages using individual `messages.get` calls; count HTTP calls
2. Fetch same 100 messages using `GmailBatchFetcher`; count HTTP calls
3. Assert batch HTTP calls <= individual calls * 0.10

**Expected Result**: <=10 batch HTTP calls vs 100 individual calls; throughput improvement verified.

**Code Sample**:
```typescript
it('should reduce HTTP round-trips by 90% using batch API', async () => {
  const individualCalls = await countHttpCallsForStrategy('individual', 100);
  const batchCalls = await countHttpCallsForStrategy('batch', 100);

  expect(batchCalls).toBeLessThanOrEqual(individualCalls * 0.1);
});
```

---

### 4.2 Token Refresh Latency

#### TC-F1-P2.1: Token Refresh Completes in Under 500 ms
**Objective**: Verify that `ensureValidToken()` completes the full refresh cycle (HTTP + store write) in under 500 ms under normal conditions.

**Test Steps**:
1. Configure mock token endpoint with 100 ms simulated latency
2. Call `ensureValidToken()` 50 times and measure P95 latency
3. Assert P95 < 500 ms

**Expected Result**: P95 latency < 500 ms; no timeout errors.

**Code Sample**:
```typescript
it('should complete token refresh in under 500ms at P95', async () => {
  mockTokenEndpoint.mockImplementation(() => delay(100).then(() => newTokenResponse));
  const latencies: number[] = [];

  for (let i = 0; i < 50; i++) {
    const start = Date.now();
    await client.ensureValidToken();
    latencies.push(Date.now() - start);
  }

  const p95 = percentile(latencies, 95);
  expect(p95).toBeLessThan(500);
});
```

---

#### TC-F1-P2.2: Concurrent Token Refresh Requests Coalesced
**Objective**: Verify that 10 concurrent calls to `ensureValidToken()` result in a single HTTP refresh call (request coalescing), not 10 separate calls.

**Test Steps**:
1. Force token expiry
2. Fire 10 concurrent `ensureValidToken()` calls
3. Assert token endpoint called exactly once

**Expected Result**: Only 1 HTTP refresh call; all 10 waiters receive the same new token.

**Code Sample**:
```typescript
it('should coalesce 10 concurrent refresh calls into a single HTTP request', async () => {
  forceTokenExpiry(client);
  await Promise.all(Array.from({ length: 10 }, () => client.ensureValidToken()));
  expect(mockTokenEndpoint).toHaveBeenCalledTimes(1);
});
```

---

### 4.3 Label and Filter Operations Scalability

#### TC-F1-P3.1: 50 Concurrent Label Applications Complete Without Errors
**Objective**: Verify that applying conference labels to 50 threads concurrently completes without rate-limit errors or partial failures.

**Test Steps**:
1. Create 50 thread IDs in sandbox
2. Call `manager.applyLabel(threadId, labelId)` for all 50 concurrently
3. Assert all 50 resolve successfully; zero errors

**Expected Result**: All 50 label operations succeed; no `429` errors due to internal throttling.

**Code Sample**:
```typescript
it('should apply labels to 50 threads concurrently without errors', async () => {
  const threadIds = Array.from({ length: 50 }, (_, i) => `thread_${i}`);
  const results = await Promise.allSettled(
    threadIds.map(id => manager.applyLabel(id, 'Label_123'))
  );

  const failures = results.filter(r => r.status === 'rejected');
  expect(failures).toHaveLength(0);
});
```

---

#### TC-F1-P3.2: Label List Cache Prevents Redundant API Calls on Repeated Operations
**Objective**: Verify that `GmailLabelManager` caches the label list for at least 60 seconds, preventing repeated `labels.list` calls.

**Test Steps**:
1. Call `ensureConferenceLabel` 10 times within 30 seconds
2. Assert `gmail.users.labels.list` called only once (cache hit for subsequent calls)

**Expected Result**: 1 API call for label list; 9 cache hits; cache TTL honored.

**Code Sample**:
```typescript
it('should cache the label list and avoid redundant API calls', async () => {
  for (let i = 0; i < 10; i++) {
    await manager.ensureConferenceLabel('TechConf-2026');
  }
  expect(mockGmailApi.users.labels.list).toHaveBeenCalledTimes(1);
});
```

---

## Test Execution Summary

| Section | Suites | Test Cases |
|---------|--------|-----------|
| 1. Unit Tests | 3 | 9 |
| 2. Integration Tests | 3 | 6 |
| 3. Edge Case Validation | 3 | 6 |
| 4. Performance Validation | 3 | 6 |
| **Total** | **12** | **27** |

**Estimated Execution Time**: Unit ~45 s | Integration ~3 min | Edge Cases ~1 min | Performance ~5 min
**Coverage Target**: ≥90% branch coverage on `GmailOAuthClient`, `GmailEmailParser`, `GmailLabelManager`, `GmailInboxSync`
