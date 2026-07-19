# EPIC08 Feature 2 — Outlook Integration — Test Cases

## Test Overview
Comprehensive test suite for Outlook Integration covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Microsoft Identity Platform OAuth2 Flow

#### TC-F2-U1.1: MSAL Token Acquisition via Authorization Code Flow
**Objective**: Verify that `OutlookAuthClient` correctly exchanges an authorization code for an access + refresh token pair using MSAL.

**Preconditions**:
- MSAL `ConfidentialClientApplication` mocked
- Authorization code `auth_code_xyz` provided by mock redirect

**Test Steps**:
1. Call `OutlookAuthClient.exchangeCodeForTokens('auth_code_xyz', redirectUri)`
2. Assert `acquireTokenByCode` called with correct `scopes: ['Mail.Read', 'Mail.ReadWrite', 'offline_access']`
3. Assert returned `TokenResponse` contains `accessToken`, `refreshToken`, and `expiresOn`

**Expected Result**: Valid token pair returned; scopes match required Mail permissions; `expiresOn` is ~1 hour in future.

**Code Sample**:
```typescript
describe('OutlookAuthClient', () => {
  it('should exchange authorization code for MSAL token pair', async () => {
    mockMsalApp.acquireTokenByCode.mockResolvedValue({
      accessToken: 'msal-access-token',
      refreshToken: 'msal-refresh-token',
      expiresOn: new Date(Date.now() + 3600_000),
      scopes: ['Mail.Read', 'Mail.ReadWrite', 'offline_access'],
    });

    const client = new OutlookAuthClient(mockMsalApp, mockCredentialStore);
    const tokens = await client.exchangeCodeForTokens('auth_code_xyz', 'https://app/callback');

    expect(mockMsalApp.acquireTokenByCode).toHaveBeenCalledWith(
      expect.objectContaining({ scopes: ['Mail.Read', 'Mail.ReadWrite', 'offline_access'] })
    );
    expect(tokens.accessToken).toBe('msal-access-token');
  });
});
```

---

#### TC-F2-U1.2: Silent Token Refresh via MSAL Cache
**Objective**: Verify that `ensureValidToken()` uses MSAL's silent token acquisition from cache rather than triggering a new auth flow when a valid cached token exists.

**Preconditions**:
- MSAL cache contains a valid account with a non-expired token

**Test Steps**:
1. Seed MSAL mock cache with a valid account
2. Call `client.ensureValidToken()`
3. Assert `acquireTokenSilent` called; `acquireTokenByRefreshToken` NOT called

**Expected Result**: Silent refresh used; no user interaction required; existing account used.

**Code Sample**:
```typescript
it('should use silent MSAL token acquisition when cache is valid', async () => {
  mockMsalApp.getTokenCache.mockReturnValue(mockCache);
  mockCache.getAllAccounts.mockReturnValue([mockAccount]);
  mockMsalApp.acquireTokenSilent.mockResolvedValue({ accessToken: 'cached-token' });

  const token = await client.ensureValidToken();

  expect(mockMsalApp.acquireTokenSilent).toHaveBeenCalled();
  expect(mockMsalApp.acquireTokenByRefreshToken).not.toHaveBeenCalled();
  expect(token.accessToken).toBe('cached-token');
});
```

---

#### TC-F2-U1.3: Tenant-Specific Authority URL Constructed Correctly
**Objective**: Verify that the MSAL client is initialized with the correct tenant-specific authority for enterprise (AAD) accounts.

**Test Steps**:
1. Call `OutlookAuthClient.buildAuthority({ tenantId: 'contoso-tenant-id', accountType: 'AAD' })`
2. Assert returned authority URL equals `'https://login.microsoftonline.com/contoso-tenant-id'`

**Expected Result**: Correct tenant authority URL; not the `/common` endpoint.

**Code Sample**:
```typescript
it('should construct tenant-specific authority URL for AAD accounts', () => {
  const authority = OutlookAuthClient.buildAuthority({
    tenantId: 'contoso-tenant-id',
    accountType: 'AAD',
  });
  expect(authority).toBe('https://login.microsoftonline.com/contoso-tenant-id');
});
```

---

### 1.2 Microsoft Graph Email Parsing

#### TC-F2-U2.1: Graph API Message Converted to Normalized EmailRecord
**Objective**: Verify that a raw Microsoft Graph `/me/messages` response is correctly normalized into an `EmailRecord` matching the shared schema used by the Gmail integration.

**Preconditions**:
- Raw Graph message JSON with `from.emailAddress`, `subject`, `body.content`, `receivedDateTime`

**Test Steps**:
1. Pass raw Graph message to `OutlookEmailParser.normalize(graphMessage)`
2. Assert `senderEmail`, `senderName`, `subject`, `receivedAt`, `body` mapped correctly
3. Assert `source = 'outlook'`

**Expected Result**: `EmailRecord` fully populated; `source` field set to `'outlook'`; dates in ISO-8601.

**Code Sample**:
```typescript
describe('OutlookEmailParser', () => {
  it('should normalize a Graph API message into an EmailRecord', () => {
    const graphMessage = {
      from: { emailAddress: { name: 'Alice Smith', address: 'alice@contoso.com' } },
      subject: 'Following up from TechConf',
      body: { contentType: 'html', content: '<p>Great meeting you!</p>' },
      receivedDateTime: '2026-07-15T14:30:00Z',
      id: 'graph-msg-id-001',
    };

    const parser = new OutlookEmailParser(mockNlpClient);
    const record = parser.normalize(graphMessage);

    expect(record.senderEmail).toBe('alice@contoso.com');
    expect(record.senderName).toBe('Alice Smith');
    expect(record.source).toBe('outlook');
    expect(record.receivedAt).toBe('2026-07-15T14:30:00Z');
  });
});
```

---

#### TC-F2-U2.2: Inline Attachment Excluded from Attachment List
**Objective**: Verify that inline CID-referenced images embedded in HTML email bodies are excluded from the external attachments list.

**Test Steps**:
1. Provide Graph message with one inline image attachment (`isInline: true`) and one PDF (`isInline: false`)
2. Call `parser.extractAttachments(graphMessage)`
3. Assert returned array has length 1 (PDF only)

**Expected Result**: Inline attachments excluded; only external/downloadable attachments listed.

**Code Sample**:
```typescript
it('should exclude inline CID attachments from the attachment list', () => {
  const graphMessage = buildGraphMessageWithAttachments([
    { name: 'image.png', isInline: true, size: 5000 },
    { name: 'proposal.pdf', isInline: false, size: 102400 },
  ]);

  const attachments = parser.extractAttachments(graphMessage);

  expect(attachments).toHaveLength(1);
  expect(attachments[0].name).toBe('proposal.pdf');
});
```

---

#### TC-F2-U2.3: Multi-Part MIME Body Prefers Plain Text Over HTML
**Objective**: Verify that when both `text/plain` and `text/html` body parts exist, the parser uses plain text for NLP processing.

**Test Steps**:
1. Build Graph message with both `text` and `html` body content types
2. Call `parser.extractBodyForNlp(graphMessage)`
3. Assert returned content matches the `text/plain` part

**Expected Result**: Plain-text body returned; HTML body not used for NLP.

**Code Sample**:
```typescript
it('should prefer plain text body over HTML for NLP extraction', () => {
  const graphMessage = {
    body: { contentType: 'html', content: '<p>HTML content</p>' },
    uniqueBody: { contentType: 'text', content: 'Plain text content' },
  };

  const body = parser.extractBodyForNlp(graphMessage);
  expect(body).toBe('Plain text content');
});
```

---

### 1.3 Outlook Folder Management

#### TC-F2-U3.1: Conference Subfolder Created Under Inbox
**Objective**: Verify that `OutlookFolderManager.ensureConferenceFolder()` creates a mail folder named `ConferenceAgent/TechConf-2026` as a child of Inbox when it does not exist.

**Test Steps**:
1. Mock `graph.me.mailFolders.inbox.childFolders.list` to return empty list
2. Call `ensureConferenceFolder('TechConf-2026')`
3. Assert `childFolders.create` called with `displayName = 'ConferenceAgent/TechConf-2026'`

**Expected Result**: Folder created; returned folder ID persisted to session context.

**Code Sample**:
```typescript
describe('OutlookFolderManager', () => {
  it('should create a conference folder under Inbox when none exists', async () => {
    mockGraphClient.me.mailFolders.inbox.childFolders.list.mockResolvedValue({ value: [] });
    mockGraphClient.me.mailFolders.inbox.childFolders.create.mockResolvedValue({
      id: 'folder_456',
      displayName: 'ConferenceAgent/TechConf-2026',
    });

    const manager = new OutlookFolderManager(mockGraphClient);
    const folderId = await manager.ensureConferenceFolder('TechConf-2026');

    expect(mockGraphClient.me.mailFolders.inbox.childFolders.create).toHaveBeenCalled();
    expect(folderId).toBe('folder_456');
  });
});
```

---

#### TC-F2-U3.2: Move Email to Conference Folder
**Objective**: Verify that `OutlookFolderManager.moveToConferenceFolder(messageId, folderId)` calls the Graph move API with the correct destination folder.

**Test Steps**:
1. Call `manager.moveToConferenceFolder('msg_001', 'folder_456')`
2. Assert `graph.me.messages('msg_001').move` called with `{ destinationId: 'folder_456' }`

**Expected Result**: Email moved to conference folder; no copy created; original location cleared.

**Code Sample**:
```typescript
it('should move a message to the conference folder via Graph move API', async () => {
  await manager.moveToConferenceFolder('msg_001', 'folder_456');

  expect(mockGraphClient.me.messages('msg_001').move).toHaveBeenCalledWith({
    destinationId: 'folder_456',
  });
});
```

---

#### TC-F2-U3.3: Delta Query Token Stored After Folder Sync
**Objective**: Verify that after a folder delta sync, the `@odata.deltaLink` token is persisted for use in the next incremental sync.

**Test Steps**:
1. Mock Graph delta response with `@odata.deltaLink: 'https://graph.microsoft.com/v1.0/me/mailFolders/delta?$deltatoken=abc'`
2. Call `manager.syncFolderDelta(folderId)`
3. Assert delta token `'abc'` stored in `deltaTokenStore` keyed by `folderId`

**Expected Result**: Delta token stored; next sync call uses incremental delta instead of full re-fetch.

**Code Sample**:
```typescript
it('should persist the delta token after a folder delta sync', async () => {
  mockGraphClient.me.mailFolders.delta.mockResolvedValue({
    value: [],
    '@odata.deltaLink': 'https://graph.microsoft.com/v1.0/me/mailFolders/delta?$deltatoken=abc',
  });

  await manager.syncFolderDelta('folder_456');

  expect(mockDeltaTokenStore.save).toHaveBeenCalledWith('folder_456', 'abc');
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Graph API Subscription (Push Notifications)

#### TC-F2-I1.1: Graph Subscription Created for Inbox New Messages
**Objective**: Verify that `OutlookPushManager.subscribe()` creates a valid Graph change notification subscription for `created` events on `/me/mailFolders/inbox/messages`.

**Preconditions**:
- Valid OAuth token with `Mail.Read` scope
- Notification endpoint URL registered and reachable

**Test Steps**:
1. Call `OutlookPushManager.subscribe({ userId, notificationUrl, expirationMinutes: 4230 })`
2. Capture request to `POST /v1.0/subscriptions`
3. Assert `changeType = 'created'`, `resource = '/me/mailFolders/inbox/messages'`, `expirationDateTime` is ~4230 minutes out

**Expected Result**: Subscription created; subscription ID returned; expiry set correctly.

**Code Sample**:
```typescript
describe('OutlookPushManager integration', () => {
  it('should create a Graph subscription for inbox new message events', async () => {
    const pushManager = new OutlookPushManager(sandboxGraphClient, mockSubscriptionStore);
    const subscriptionId = await pushManager.subscribe({
      userId: 'user_1',
      notificationUrl: 'https://webhooks.example.com/outlook',
      expirationMinutes: 4230,
    });

    expect(sandboxSubscriptionCapture.changeType).toBe('created');
    expect(sandboxSubscriptionCapture.resource).toBe('/me/mailFolders/inbox/messages');
    expect(subscriptionId).toBeDefined();
  });
});
```

---

#### TC-F2-I1.2: Change Notification Processed and Email Fetched
**Objective**: Verify that an incoming Graph change notification triggers fetching the new email and running it through the contact extraction pipeline.

**Test Steps**:
1. POST a mock Graph notification payload to the notification endpoint
2. Assert the message ID from the notification is fetched via `graph.me.messages(id)`
3. Assert contact extraction pipeline called once for the fetched message

**Expected Result**: Notification received; email fetched; contact pipeline invoked.

**Code Sample**:
```typescript
it('should fetch and process email on receiving a Graph change notification', async () => {
  const notification = buildGraphNotification({ messageId: 'msg_new_001' });
  await notificationController.handle(notification);

  expect(mockGraphClient.me.messages).toHaveBeenCalledWith('msg_new_001');
  expect(contactPipelineSpy).toHaveBeenCalledTimes(1);
});
```

---

### 2.2 Incremental Delta Sync

#### TC-F2-I2.1: Delta Sync Fetches Only New Messages Since Last Sync
**Objective**: Verify that `OutlookInboxSync` uses a stored delta token to perform an incremental fetch, returning only messages changed since the previous sync.

**Test Steps**:
1. Perform full initial sync; store resulting delta token
2. Add 3 new messages to sandbox inbox
3. Call `sync.runDelta({ userId })`
4. Assert only 3 new messages returned; old messages not re-fetched

**Expected Result**: Delta query returns exactly 3 new items; previous messages excluded.

**Code Sample**:
```typescript
describe('OutlookInboxSync delta integration', () => {
  it('should return only new messages added since last delta sync', async () => {
    await sync.runFull({ userId: 'user_1' }); // stores delta token
    addSandboxMessages(3);

    const delta = await sync.runDelta({ userId: 'user_1' });

    expect(delta.newMessages).toHaveLength(3);
    expect(delta.totalFetched).toBe(3);
  });
});
```

---

#### TC-F2-I2.2: Deleted Message Propagated to Contact Soft-Delete
**Objective**: Verify that when a Graph delta response includes a `@removed` entry for a message, the associated contact record is soft-deleted.

**Test Steps**:
1. Create contact from email `msg_001`
2. Seed sandbox delta to include `{ id: 'msg_001', '@removed': { reason: 'deleted' } }`
3. Run delta sync
4. Assert contact record has `deletedAt` timestamp set

**Expected Result**: Contact soft-deleted; `deletedAt` field populated; contact excluded from active queries.

**Code Sample**:
```typescript
it('should soft-delete contact when source email is deleted in delta response', async () => {
  await seedContactFromEmail('msg_001');
  addDeltaRemoval('msg_001');

  await sync.runDelta({ userId: 'user_1' });

  const contact = await contactStore.findBySourceMessageId('msg_001');
  expect(contact.deletedAt).toBeDefined();
});
```

---

### 2.3 Shared Mailbox Support

#### TC-F2-I3.1: Shared Mailbox Emails Fetched Using Delegated Access
**Objective**: Verify that emails from a shared mailbox (`sales@contoso.com`) are fetched using delegated access on behalf of the authorized user.

**Test Steps**:
1. Configure `OutlookInboxSync` with `sharedMailbox: 'sales@contoso.com'`
2. Call `sync.runFull({ userId: 'user_1' })`
3. Assert Graph API called with `/users/sales@contoso.com/messages` not `/me/messages`

**Expected Result**: Correct shared mailbox endpoint used; delegate permissions exercised.

**Code Sample**:
```typescript
it('should use shared mailbox endpoint for delegated mailbox access', async () => {
  const sync = new OutlookInboxSync(sandboxGraphClient, { sharedMailbox: 'sales@contoso.com' });
  await sync.runFull({ userId: 'user_1' });

  expect(sandboxRequestCapture.url).toContain('/users/sales@contoso.com/messages');
});
```

---

#### TC-F2-I3.2: Shared Mailbox Without Permission Returns Graceful Error
**Objective**: Verify that attempting to access a shared mailbox without `Mail.Read.Shared` permission returns a descriptive `PermissionError` without crashing.

**Test Steps**:
1. Configure token without `Mail.Read.Shared` scope
2. Call `sync.runFull({ userId: 'user_1', sharedMailbox: 'exec@contoso.com' })`
3. Assert `PermissionError` thrown with `requiredScope: 'Mail.Read.Shared'`

**Expected Result**: Graceful error; descriptive message; no partial data written.

**Code Sample**:
```typescript
it('should throw PermissionError for shared mailbox access without required scope', async () => {
  const limitedToken = buildToken({ scopes: ['Mail.Read'] });
  const sync = new OutlookInboxSync(buildGraphClient(limitedToken), { sharedMailbox: 'exec@contoso.com' });

  await expect(sync.runFull({ userId: 'user_1' })).rejects.toThrow(
    expect.objectContaining({ type: 'PermissionError', requiredScope: 'Mail.Read.Shared' })
  );
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Graph API Throttling

#### TC-F2-E1.1: 429 Response with Retry-After Header Honored
**Objective**: Verify that when Graph returns `429` with a `Retry-After: 5` header, the client waits exactly 5 seconds before retrying.

**Preconditions**:
- Mock Graph returns `429` with `Retry-After: 5` on first call, then succeeds

**Test Steps**:
1. Trigger any Graph API call
2. Assert `mockSleep` called with `5000` ms after first `429`
3. Assert second call succeeds and returns expected data

**Expected Result**: Retry-After header respected; retry succeeds; total delay ~5 s.

**Code Sample**:
```typescript
it('should wait for Retry-After duration before retrying on 429', async () => {
  let attempt = 0;
  mockGraphClient.me.messages.list.mockImplementation(async () => {
    if (attempt++ === 0) {
      const err = new Error('Too Many Requests');
      Object.assign(err, { statusCode: 429, headers: { 'retry-after': '5' } });
      throw err;
    }
    return { value: [{ id: 'msg_1' }] };
  });

  const messages = await sync.fetchMessages();

  expect(mockSleep).toHaveBeenCalledWith(5000);
  expect(messages).toHaveLength(1);
});
```

---

#### TC-F2-E1.2: Consecutive 429s Do Not Exceed Maximum Retry Attempts
**Objective**: Verify that repeated `429` responses eventually cause the client to give up and throw a `MaxRetriesExceededError` after 3 attempts.

**Test Steps**:
1. Configure mock to return `429` indefinitely
2. Call any Graph API method
3. Assert `MaxRetriesExceededError` thrown after exactly 3 attempts

**Expected Result**: Client retries 3 times then throws; no infinite loop.

**Code Sample**:
```typescript
it('should throw MaxRetriesExceededError after 3 consecutive 429 responses', async () => {
  mockGraphClient.me.messages.list.mockRejectedValue(
    Object.assign(new Error(), { statusCode: 429, headers: { 'retry-after': '1' } })
  );

  await expect(sync.fetchMessages()).rejects.toThrow(MaxRetriesExceededError);
  expect(mockGraphClient.me.messages.list).toHaveBeenCalledTimes(3);
});
```

---

### 3.2 Large Attachment Handling

#### TC-F2-E2.1: Attachment Larger Than 3 MB Uses Resumable Upload
**Objective**: Verify that when an Outlook email attachment exceeds 3 MB, the system uses the Graph resumable upload session API rather than inline upload.

**Test Steps**:
1. Simulate attachment download of 5 MB file
2. Trigger re-upload to storage
3. Assert `graph.me.drive.createUploadSession` called instead of standard PUT

**Expected Result**: Resumable session created; upload completed in chunks; no `413` error.

**Code Sample**:
```typescript
it('should use resumable upload for attachments over 3MB', async () => {
  const largeAttachment = buildAttachment({ sizeBytes: 5 * 1024 * 1024 });
  await attachmentService.upload(largeAttachment);

  expect(mockGraphClient.me.drive.createUploadSession).toHaveBeenCalled();
  expect(mockGraphClient.me.drive.put).not.toHaveBeenCalled();
});
```

---

#### TC-F2-E2.2: Attachment Download Timeout Triggers Partial-Download Error
**Objective**: Verify that if an attachment download exceeds the 30-second timeout, a `DownloadTimeoutError` is thrown and no partial file is stored.

**Test Steps**:
1. Mock attachment download to hang for 35 s
2. Call `attachmentService.downloadAttachment(attachmentId)`
3. Assert `DownloadTimeoutError` thrown within ~30 s
4. Assert no partial file written to storage

**Expected Result**: Timeout error after 30 s; no partial data persisted.

**Code Sample**:
```typescript
it('should throw DownloadTimeoutError after 30 seconds on stalled download', async () => {
  mockGraphClient.me.messages.attachments.get.mockImplementation(() => new Promise(() => {}));

  await expect(
    attachmentService.downloadAttachment('att_001', { timeoutMs: 30_000 })
  ).rejects.toThrow(DownloadTimeoutError);

  expect(mockStorageWrite).not.toHaveBeenCalled();
}, 35_000);
```

---

### 3.3 Multi-Tenant and Personal Account Edge Cases

#### TC-F2-E3.1: Personal Microsoft Account Uses /common Tenant Endpoint
**Objective**: Verify that for personal Microsoft accounts (MSA), the authority URL uses `/common` instead of a tenant-specific endpoint.

**Test Steps**:
1. Call `OutlookAuthClient.buildAuthority({ accountType: 'MSA' })`
2. Assert returned URL is `'https://login.microsoftonline.com/common'`

**Expected Result**: `/common` endpoint used for personal accounts; no tenant ID injected.

**Code Sample**:
```typescript
it('should use /common authority URL for personal Microsoft accounts', () => {
  const authority = OutlookAuthClient.buildAuthority({ accountType: 'MSA' });
  expect(authority).toBe('https://login.microsoftonline.com/common');
});
```

---

#### TC-F2-E3.2: Conditional Access Policy Failure Returns Actionable Error
**Objective**: Verify that an MFA-required conditional access policy error (`interaction_required`) surfaces an `MFARequiredError` with re-auth URL.

**Test Steps**:
1. Mock MSAL silent acquisition to fail with `interaction_required` error
2. Call `client.ensureValidToken()`
3. Assert `MFARequiredError` thrown with `reAuthUrl` property set

**Expected Result**: `MFARequiredError` thrown; `reAuthUrl` enables user to complete MFA; no silent failure.

**Code Sample**:
```typescript
it('should throw MFARequiredError with re-auth URL on interaction_required', async () => {
  mockMsalApp.acquireTokenSilent.mockRejectedValue(
    new InteractionRequiredAuthError('interaction_required')
  );

  await expect(client.ensureValidToken()).rejects.toThrow(MFARequiredError);
  const error = await client.ensureValidToken().catch(e => e);
  expect(error.reAuthUrl).toContain('login.microsoftonline.com');
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Message Sync Throughput

#### TC-F2-P1.1: 500 Outlook Messages Synced Within 20 Seconds
**Objective**: Verify that `OutlookInboxSync` processes 500 messages (fetch + parse + contact extract + store) in under 20 seconds using parallel Graph batch requests.

**Preconditions**:
- Sandbox seeded with 500 messages
- Batch size: 20 messages per `$batch` request

**Test Steps**:
1. Start timer
2. Call `sync.runFull({ userId: 'user_perf', maxMessages: 500 })`
3. Assert elapsed < 20,000 ms
4. Assert contact store has 500 records

**Expected Result**: 500 messages processed in < 20 s; all contacts stored.

**Code Sample**:
```typescript
describe('OutlookInboxSync performance', () => {
  it('should process 500 messages within 20 seconds', async () => {
    seedSandboxMessages(500);
    const start = Date.now();

    await sync.runFull({ userId: 'user_perf', maxMessages: 500 });

    expect(Date.now() - start).toBeLessThan(20_000);
  }, 25_000);
});
```

---

#### TC-F2-P1.2: Graph $batch Endpoint Reduces API Calls by 80%
**Objective**: Verify that batching Graph message fetch requests reduces total API call count by at least 80% vs. individual requests.

**Test Steps**:
1. Fetch 100 messages individually; record call count
2. Fetch same 100 messages via `OutlookBatchFetcher`; record call count
3. Assert batch call count <= individual count * 0.2

**Expected Result**: <=20 batch calls vs 100 individual calls.

**Code Sample**:
```typescript
it('should reduce API call count by 80% using Graph $batch', async () => {
  const individual = await countCallsFor('individual', 100);
  const batch = await countCallsFor('batch', 100);
  expect(batch).toBeLessThanOrEqual(individual * 0.2);
});
```

---

### 4.2 Subscription Management Latency

#### TC-F2-P2.1: Subscription Renewal Completes in Under 2 Seconds
**Objective**: Verify that renewing a Graph change notification subscription (PATCH `/subscriptions/{id}`) completes in under 2 seconds.

**Test Steps**:
1. Create subscription; record subscription ID
2. Measure time to call `pushManager.renewSubscription(subscriptionId)`
3. Assert elapsed < 2,000 ms

**Expected Result**: Renewal API call and response < 2 s; new expiry confirmed.

**Code Sample**:
```typescript
it('should renew a subscription in under 2 seconds', async () => {
  const subId = await pushManager.subscribe({ userId: 'user_1', notificationUrl });
  const start = Date.now();

  await pushManager.renewSubscription(subId);

  expect(Date.now() - start).toBeLessThan(2000);
});
```

---

#### TC-F2-P2.2: 10 Concurrent Subscription Renewals Succeed
**Objective**: Verify that 10 simultaneous subscription renewals for 10 different users all complete without Graph throttling errors.

**Test Steps**:
1. Create 10 subscriptions for 10 users
2. Renew all 10 concurrently via `Promise.all`
3. Assert all succeed; zero `429` errors

**Expected Result**: All 10 renewals succeed concurrently; internal rate limiter prevents API throttling.

**Code Sample**:
```typescript
it('should handle 10 concurrent subscription renewals without throttling', async () => {
  const subIds = await Promise.all(Array.from({ length: 10 }, (_, i) =>
    pushManager.subscribe({ userId: `user_${i}`, notificationUrl })
  ));

  const results = await Promise.allSettled(subIds.map(id => pushManager.renewSubscription(id)));
  const failures = results.filter(r => r.status === 'rejected');

  expect(failures).toHaveLength(0);
});
```

---

### 4.3 Delta Sync Efficiency

#### TC-F2-P3.1: Delta Sync Processes 50 Changed Messages in Under 5 Seconds
**Objective**: Verify that an incremental delta sync of 50 changed messages completes in under 5 seconds (vs. a full re-fetch of 500 messages).

**Test Steps**:
1. Perform full sync to establish delta token
2. Add 50 new messages to sandbox
3. Measure delta sync elapsed time
4. Assert elapsed < 5,000 ms

**Expected Result**: Delta sync < 5 s; full sync baseline is > 10 s (confirming delta efficiency).

**Code Sample**:
```typescript
it('should complete a 50-message delta sync in under 5 seconds', async () => {
  await sync.runFull({ userId: 'user_perf' });
  addSandboxMessages(50);

  const start = Date.now();
  await sync.runDelta({ userId: 'user_perf' });

  expect(Date.now() - start).toBeLessThan(5000);
}, 10_000);
```

---

#### TC-F2-P3.2: Delta Token Prevents Full Re-fetch on Reconnect
**Objective**: Verify that after a network interruption and reconnect, the stored delta token is used to resume from where sync left off rather than performing a full re-fetch.

**Test Steps**:
1. Run full sync; persist delta token
2. Simulate network outage (drop Graph mock)
3. Restore network; call `sync.runDelta()`
4. Assert full sync endpoint NOT called; delta endpoint called with stored token

**Expected Result**: Delta token reused on reconnect; full sync endpoint avoided.

**Code Sample**:
```typescript
it('should resume from delta token after network reconnect without full re-fetch', async () => {
  await sync.runFull({ userId: 'user_1' });
  simulateNetworkOutage();
  restoreNetwork();

  await sync.runDelta({ userId: 'user_1' });

  expect(fullSyncEndpointSpy).toHaveBeenCalledTimes(1); // only the initial full sync
  expect(deltaEndpointSpy).toHaveBeenCalledTimes(1);
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

**Estimated Execution Time**: Unit ~60 s | Integration ~4 min | Edge Cases ~2 min | Performance ~6 min
**Coverage Target**: ≥90% branch coverage on `OutlookAuthClient`, `OutlookEmailParser`, `OutlookFolderManager`, `OutlookInboxSync`, `OutlookPushManager`
