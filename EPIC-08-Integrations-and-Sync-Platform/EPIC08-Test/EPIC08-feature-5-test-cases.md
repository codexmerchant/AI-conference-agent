# EPIC08 Feature 5 — CRM Sync — Test Cases

## Test Overview
Comprehensive test suite for CRM Sync covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 CRM Record Normalization

#### TC-F5-U1.1: Salesforce Contact Mapped to Normalized CRMContact Schema
**Objective**: Verify that a raw Salesforce REST API contact record is correctly mapped to the shared `CRMContact` schema.

**Preconditions**:
- Raw Salesforce contact JSON with `Id`, `FirstName`, `LastName`, `Email`, `Title`, `Account.Name`, `Phone`, `LastModifiedDate`

**Test Steps**:
1. Pass raw Salesforce contact to `SalesforceCRMAdapter.normalize(rawContact)`
2. Assert `externalId`, `email`, `fullName`, `title`, `company`, `phone`, `lastModifiedAt` mapped
3. Assert `crmSource = 'salesforce'`

**Expected Result**: `CRMContact` fully populated; `crmSource = 'salesforce'`; dates in ISO-8601.

**Code Sample**:
```typescript
describe('SalesforceCRMAdapter', () => {
  it('should normalize a Salesforce contact to CRMContact schema', () => {
    const rawContact = {
      Id: 'sf_contact_001',
      FirstName: 'Alice',
      LastName: 'Smith',
      Email: 'alice.smith@enterprise.com',
      Title: 'Chief Revenue Officer',
      Account: { Name: 'Enterprise Inc' },
      Phone: '+1-415-555-0100',
      LastModifiedDate: '2026-07-10T08:00:00.000Z',
    };

    const adapter = new SalesforceCRMAdapter();
    const contact = adapter.normalize(rawContact);

    expect(contact.externalId).toBe('sf_contact_001');
    expect(contact.fullName).toBe('Alice Smith');
    expect(contact.crmSource).toBe('salesforce');
    expect(contact.company).toBe('Enterprise Inc');
  });
});
```

---

#### TC-F5-U1.2: HubSpot Contact Normalized Including Custom Properties
**Objective**: Verify that a HubSpot contact record with standard and custom properties is correctly normalized, with custom fields mapped to `customProperties` object.

**Test Steps**:
1. Build HubSpot contact with standard fields (`firstname`, `lastname`, `email`) and custom property `conference_met_at`
2. Call `HubSpotCRMAdapter.normalize(hubspotContact)`
3. Assert standard fields in top-level schema; `conference_met_at` in `customProperties`

**Expected Result**: Standard fields mapped; custom properties preserved in `customProperties` map.

**Code Sample**:
```typescript
describe('HubSpotCRMAdapter', () => {
  it('should normalize HubSpot contact including custom properties', () => {
    const hubspotContact = {
      id: 'hs_contact_042',
      properties: {
        firstname: 'Bob',
        lastname: 'Chen',
        email: 'bob.chen@startup.io',
        jobtitle: 'CTO',
        company: 'Startup IO',
        conference_met_at: 'TechConf 2026',
      },
    };

    const adapter = new HubSpotCRMAdapter();
    const contact = adapter.normalize(hubspotContact);

    expect(contact.fullName).toBe('Bob Chen');
    expect(contact.crmSource).toBe('hubspot');
    expect(contact.customProperties['conference_met_at']).toBe('TechConf 2026');
  });
});
```

---

#### TC-F5-U1.3: CRM Contact Merge Priority: CRM Wins Over Internal Draft
**Objective**: Verify that when merging a CRM contact with an internally-captured draft contact, CRM values take precedence for fields present in both.

**Test Steps**:
1. Internal draft: `title = 'Founder'`, `company = 'Stealth'`, `email = 'bob@startup.io'`
2. CRM contact: `title = 'CTO'`, `company = 'Startup IO'`, `email = 'bob.chen@startup.io'`
3. Call `CRMContactMerger.merge(draft, crmContact, { priority: 'crm' })`
4. Assert `title = 'CTO'`; `company = 'Startup IO'`; `email = 'bob.chen@startup.io'`

**Expected Result**: CRM values win on conflict; draft fields used only for fields absent in CRM.

**Code Sample**:
```typescript
describe('CRMContactMerger', () => {
  it('should give CRM values priority over internal draft on merge', () => {
    const draft = buildContact({ title: 'Founder', company: 'Stealth', email: 'bob@startup.io' });
    const crmContact = buildCRMContact({ title: 'CTO', company: 'Startup IO', email: 'bob.chen@startup.io' });

    const merged = CRMContactMerger.merge(draft, crmContact, { priority: 'crm' });

    expect(merged.title).toBe('CTO');
    expect(merged.company).toBe('Startup IO');
    expect(merged.email).toBe('bob.chen@startup.io');
  });
});
```

---

### 1.2 Upsert Logic

#### TC-F5-U2.1: Salesforce Upsert Uses External ID Field to Prevent Duplicates
**Objective**: Verify that `SalesforceSyncWriter.upsert()` uses the `ConferenceAgent__ExternalId__c` custom field for upsert operations, preventing duplicate Salesforce records.

**Preconditions**:
- Salesforce org configured with `ConferenceAgent__ExternalId__c` custom field on Contact object

**Test Steps**:
1. Call `SalesforceSyncWriter.upsert(crmContact)` with `externalId = 'ca-contact-001'`
2. Assert Salesforce REST upsert endpoint called: `PATCH /services/data/v57.0/sobjects/Contact/ConferenceAgent__ExternalId__c/ca-contact-001`
3. Assert no `POST` (insert) called

**Expected Result**: Upsert via external ID; no duplicate created; idempotent on re-run.

**Code Sample**:
```typescript
describe('SalesforceSyncWriter', () => {
  it('should use external ID field for upsert to prevent duplicates', async () => {
    const crmContact = buildCRMContact({ externalId: 'ca-contact-001' });
    await SalesforceSyncWriter.upsert(crmContact);

    expect(mockSalesforceApi.patch).toHaveBeenCalledWith(
      '/services/data/v57.0/sobjects/Contact/ConferenceAgent__ExternalId__c/ca-contact-001',
      expect.any(Object)
    );
    expect(mockSalesforceApi.post).not.toHaveBeenCalled();
  });
});
```

---

#### TC-F5-U2.2: HubSpot Upsert Uses Email as Deduplication Key
**Objective**: Verify that `HubSpotSyncWriter.upsert()` uses the contact's email address as the HubSpot deduplication key, merging with existing contacts by email.

**Test Steps**:
1. Call `HubSpotSyncWriter.upsert(crmContact)` with `email = 'alice@enterprise.com'`
2. Assert HubSpot contacts upsert endpoint called with `idProperty = 'email'`

**Expected Result**: HubSpot upsert uses email deduplication; no duplicate contact created.

**Code Sample**:
```typescript
describe('HubSpotSyncWriter', () => {
  it('should use email as HubSpot deduplication key for upsert', async () => {
    const crmContact = buildCRMContact({ email: 'alice@enterprise.com' });
    await HubSpotSyncWriter.upsert(crmContact);

    expect(mockHubSpotApi.post).toHaveBeenCalledWith(
      '/crm/v3/objects/contacts/upsert',
      expect.objectContaining({ idProperty: 'email' })
    );
  });
});
```

---

#### TC-F5-U2.3: Upsert Diff Minimizes API Payload to Changed Fields Only
**Objective**: Verify that `CRMSyncDiffBuilder` produces a minimal update payload containing only fields that have changed, rather than sending the full contact record.

**Test Steps**:
1. Existing CRM snapshot: `title = 'Engineer'`, `phone = '+1-415-555-0100'`, `company = 'Acme'`
2. Updated contact: `title = 'Senior Engineer'`, `phone` unchanged, `company` unchanged
3. Call `CRMSyncDiffBuilder.build(existing, updated)`
4. Assert payload contains only `{ title: 'Senior Engineer' }`

**Expected Result**: Minimal diff payload; unchanged fields excluded; reduces API bandwidth.

**Code Sample**:
```typescript
describe('CRMSyncDiffBuilder', () => {
  it('should produce a minimal payload containing only changed fields', () => {
    const existing = buildCRMSnapshot({ title: 'Engineer', phone: '+1-415-555-0100', company: 'Acme' });
    const updated = buildCRMContact({ title: 'Senior Engineer', phone: '+1-415-555-0100', company: 'Acme' });

    const diff = CRMSyncDiffBuilder.build(existing, updated);

    expect(diff).toEqual({ title: 'Senior Engineer' });
    expect(Object.keys(diff)).toHaveLength(1);
  });
});
```

---

### 1.3 Sync State Tracking

#### TC-F5-U3.1: Successful Upsert Recorded in Sync Log with Timestamp
**Objective**: Verify that after a successful CRM upsert, a sync log entry is created with `status = 'success'`, `contactId`, `crmSource`, and `syncedAt` timestamp.

**Test Steps**:
1. Perform successful `SalesforceSyncWriter.upsert(crmContact)`
2. Query sync log store
3. Assert entry exists with `status = 'success'` and `syncedAt` within last 5 seconds

**Expected Result**: Sync log entry created; all required fields populated.

**Code Sample**:
```typescript
describe('CRM sync log', () => {
  it('should record a success entry in the sync log after a successful upsert', async () => {
    await SalesforceSyncWriter.upsert(buildCRMContact({ id: 'contact_1' }));

    const logEntry = await syncLogStore.findByContactId('contact_1');
    expect(logEntry.status).toBe('success');
    expect(logEntry.crmSource).toBe('salesforce');
    expect(Date.now() - new Date(logEntry.syncedAt).getTime()).toBeLessThan(5000);
  });
});
```

---

#### TC-F5-U3.2: Failed Upsert Recorded with Error Details and Retry Scheduled
**Objective**: Verify that a failed CRM upsert records `status = 'failed'` in the sync log along with the error message, and schedules a retry.

**Test Steps**:
1. Configure mock Salesforce API to return `500 Internal Server Error`
2. Call `SalesforceSyncWriter.upsert(crmContact)` — expect failure
3. Query sync log; assert `status = 'failed'` and `error` message captured
4. Assert retry job scheduled

**Expected Result**: Failure recorded; error details captured; retry job created.

**Code Sample**:
```typescript
it('should record failure with error details and schedule retry on upsert failure', async () => {
  mockSalesforceApi.patch.mockRejectedValue(new Error('500 Internal Server Error'));

  await SalesforceSyncWriter.upsert(buildCRMContact({ id: 'contact_fail' })).catch(() => {});

  const logEntry = await syncLogStore.findByContactId('contact_fail');
  expect(logEntry.status).toBe('failed');
  expect(logEntry.error).toContain('500 Internal Server Error');
  expect(retryJobSpy).toHaveBeenCalledWith(expect.objectContaining({ contactId: 'contact_fail' }));
});
```

---

#### TC-F5-U3.3: Sync State Prevents Re-Sync of Unchanged Contact
**Objective**: Verify that when a contact's `lastModifiedAt` has not changed since last successful sync, the sync writer skips the upsert to avoid redundant API calls.

**Test Steps**:
1. Record successful sync for `contact_1` at `T`
2. Contact `lastModifiedAt` = `T` (unchanged)
3. Call `CRMSyncOrchestrator.syncContact(contact_1)`
4. Assert Salesforce API NOT called

**Expected Result**: Sync skipped for unchanged contact; `skipped` event emitted.

**Code Sample**:
```typescript
it('should skip CRM sync for a contact that has not changed since last sync', async () => {
  const syncTime = new Date().toISOString();
  await syncLogStore.save({ contactId: 'contact_1', status: 'success', syncedAt: syncTime });
  const contact = buildContact({ id: 'contact_1', lastModifiedAt: syncTime });

  await CRMSyncOrchestrator.syncContact(contact);

  expect(mockSalesforceApi.patch).not.toHaveBeenCalled();
  expect(skippedEventSpy).toHaveBeenCalledWith(expect.objectContaining({ contactId: 'contact_1' }));
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Salesforce End-to-End Sync

#### TC-F5-I1.1: New Conference Contact Upserted to Salesforce Successfully
**Objective**: Verify that a new conference contact captured by the mobile app is synced to Salesforce as a Contact record with all required fields.

**Preconditions**:
- Salesforce sandbox configured with `ConferenceAgent__ExternalId__c` field
- Valid Salesforce OAuth token in credential store

**Test Steps**:
1. Create new contact in internal store: `Alice Smith, CRO @ Enterprise Inc`
2. Call `CRMSyncService.sync({ userId, contactId, crmTarget: 'salesforce' })`
3. Query Salesforce sandbox for contact by external ID
4. Assert `Title`, `Account.Name`, `Email`, `Phone` populated correctly

**Expected Result**: Contact created in Salesforce; all fields matched; no duplicate records.

**Code Sample**:
```typescript
describe('CRMSyncService Salesforce integration', () => {
  it('should upsert a new conference contact to Salesforce sandbox', async () => {
    const contact = seedContact({ name: 'Alice Smith', title: 'CRO', company: 'Enterprise Inc', email: 'alice@enterprise.com' });

    await CRMSyncService.sync({ userId: 'user_1', contactId: contact.id, crmTarget: 'salesforce' });

    const sfContact = await salesforceSandbox.findByExternalId(contact.id);
    expect(sfContact).toBeDefined();
    expect(sfContact.Title).toBe('CRO');
    expect(sfContact.Account.Name).toBe('Enterprise Inc');
  });
});
```

---

#### TC-F5-I1.2: Salesforce Record Updated When Contact Modified
**Objective**: Verify that when a contact's title is updated in the internal store, re-running sync updates the corresponding Salesforce record.

**Test Steps**:
1. Upsert contact with `title = 'CRO'` to Salesforce
2. Update contact in internal store: `title = 'President'`
3. Re-run `CRMSyncService.sync()`
4. Query Salesforce; assert `Title = 'President'`

**Expected Result**: Salesforce record updated; `LastModifiedDate` refreshed; no duplicate.

**Code Sample**:
```typescript
it('should update Salesforce record when internal contact title changes', async () => {
  await CRMSyncService.sync({ userId: 'user_1', contactId: 'contact_1', crmTarget: 'salesforce' });
  await contactStore.update('contact_1', { title: 'President' });

  await CRMSyncService.sync({ userId: 'user_1', contactId: 'contact_1', crmTarget: 'salesforce' });

  const sfContact = await salesforceSandbox.findByExternalId('contact_1');
  expect(sfContact.Title).toBe('President');
});
```

---

### 2.2 HubSpot End-to-End Sync

#### TC-F5-I2.1: Conference Notes Written as HubSpot Timeline Activity
**Objective**: Verify that conference notes captured for a contact are synced to HubSpot as a timeline activity (Engagement) linked to the contact.

**Test Steps**:
1. Create contact in HubSpot sandbox
2. Add note `'Great conversation about AI agents at TechConf booth'` to internal store
3. Call `HubSpotNoteSync.sync({ userId, contactId, note })`
4. Query HubSpot sandbox for engagements linked to contact
5. Assert engagement of type `NOTE` with correct body text

**Expected Result**: Note appears as HubSpot timeline activity; linked to correct contact; timestamp correct.

**Code Sample**:
```typescript
describe('HubSpotNoteSync integration', () => {
  it('should create a HubSpot Note engagement for a conference contact note', async () => {
    const hsContact = await hubspotSandbox.createContact({ email: 'bob@startup.io' });
    await contactStore.addNote('contact_bob', { text: 'Great conversation about AI agents at TechConf booth' });

    await HubSpotNoteSync.sync({ userId: 'user_1', contactId: 'contact_bob', hubspotContactId: hsContact.id });

    const engagements = await hubspotSandbox.getEngagements(hsContact.id);
    const note = engagements.find(e => e.type === 'NOTE');

    expect(note).toBeDefined();
    expect(note.metadata.body).toContain('Great conversation about AI agents');
  });
});
```

---

#### TC-F5-I2.2: HubSpot Contact Pulled Back and Merged with Internal Record
**Objective**: Verify that when HubSpot has richer data (e.g., phone number added by sales team), a pull sync updates the internal contact record.

**Test Steps**:
1. Create internal contact with no phone number
2. Update HubSpot sandbox contact with `phone = '+1-415-555-0199'`
3. Run `CRMSyncService.pull({ userId, crmSource: 'hubspot' })`
4. Assert internal contact now has `phone = '+1-415-555-0199'`

**Expected Result**: HubSpot data pulled into internal store; phone field updated.

**Code Sample**:
```typescript
it('should pull HubSpot phone number update into internal contact store', async () => {
  seedContact({ id: 'contact_bob', email: 'bob@startup.io', phone: null });
  await hubspotSandbox.updateContact('hs_042', { phone: '+1-415-555-0199' });

  await CRMSyncService.pull({ userId: 'user_1', crmSource: 'hubspot' });

  const contact = await contactStore.get('contact_bob');
  expect(contact.phone).toBe('+1-415-555-0199');
});
```

---

### 2.3 Multi-CRM Fan-Out Sync

#### TC-F5-I3.1: Single Contact Synced to Both Salesforce and HubSpot Simultaneously
**Objective**: Verify that `CRMSyncOrchestrator` can fan out a single contact sync to both Salesforce and HubSpot in parallel.

**Test Steps**:
1. Configure user with both Salesforce and HubSpot CRM connections
2. Call `CRMSyncOrchestrator.syncContact({ userId, contactId })`
3. Assert contact upserted in Salesforce sandbox
4. Assert contact upserted in HubSpot sandbox

**Expected Result**: Contact synced to both CRMs; no partial failure; both confirmations logged.

**Code Sample**:
```typescript
describe('CRMSyncOrchestrator multi-CRM fan-out', () => {
  it('should sync a contact to both Salesforce and HubSpot in parallel', async () => {
    configureUserCRMs('user_1', ['salesforce', 'hubspot']);

    await CRMSyncOrchestrator.syncContact({ userId: 'user_1', contactId: 'contact_1' });

    const sfRecord = await salesforceSandbox.findByExternalId('contact_1');
    const hsRecord = await hubspotSandbox.findByEmail('alice@enterprise.com');

    expect(sfRecord).toBeDefined();
    expect(hsRecord).toBeDefined();
  });
});
```

---

#### TC-F5-I3.2: Partial CRM Failure Does Not Block Successful Targets
**Objective**: Verify that if Salesforce upsert fails (e.g., network error), the HubSpot sync still completes successfully.

**Test Steps**:
1. Configure Salesforce mock to throw a network error
2. Call `CRMSyncOrchestrator.syncContact({ userId, contactId })`
3. Assert HubSpot contact created successfully
4. Assert Salesforce failure logged; retry scheduled

**Expected Result**: HubSpot sync succeeds independently; Salesforce failure does not block HubSpot.

**Code Sample**:
```typescript
it('should complete HubSpot sync even when Salesforce upsert fails', async () => {
  mockSalesforceApi.patch.mockRejectedValue(new Error('Network error'));

  await CRMSyncOrchestrator.syncContact({ userId: 'user_1', contactId: 'contact_1' });

  const hsRecord = await hubspotSandbox.findByEmail('alice@enterprise.com');
  expect(hsRecord).toBeDefined();

  const sfLog = await syncLogStore.findByContactId('contact_1', 'salesforce');
  expect(sfLog.status).toBe('failed');
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 CRM Field Mapping Conflicts

#### TC-F5-E1.1: Unmapped CRM Field Stored in Overflow Map Without Data Loss
**Objective**: Verify that CRM fields not in the standard schema (e.g., Salesforce custom fields beyond `ConferenceAgent__ExternalId__c`) are stored in `unmappedFields` without being silently dropped.

**Test Steps**:
1. Include `Salesforce_Custom_Rating__c = 'Hot'` in raw Salesforce record
2. Normalize via `SalesforceCRMAdapter.normalize()`
3. Assert `unmappedFields['Salesforce_Custom_Rating__c'] = 'Hot'` in output

**Expected Result**: Custom field preserved in overflow map; no data loss; no normalization error.

**Code Sample**:
```typescript
it('should store unmapped Salesforce custom fields in the unmappedFields map', () => {
  const rawContact = buildSalesforceContact({ Salesforce_Custom_Rating__c: 'Hot' });
  const contact = new SalesforceCRMAdapter().normalize(rawContact);
  expect(contact.unmappedFields['Salesforce_Custom_Rating__c']).toBe('Hot');
});
```

---

#### TC-F5-E1.2: CRM Contact Without Email Handled via Phone-Only Deduplication
**Objective**: Verify that when a CRM contact has no email address, deduplication falls back to phone number matching to prevent duplicates.

**Test Steps**:
1. Create internal contact with no email but `phone = '+1-415-555-0100'`
2. CRM record also has no email but same phone number
3. Call `CRMDeduplicator.findMatch(internalContact, crmRecords)`
4. Assert match found via phone number

**Expected Result**: Phone-based deduplication succeeds; no duplicate record created.

**Code Sample**:
```typescript
it('should deduplicate CRM contacts by phone number when no email is present', () => {
  const internal = buildContact({ email: null, phone: '+1-415-555-0100' });
  const crmRecords = [buildCRMContact({ email: null, phone: '+1-415-555-0100' })];

  const match = CRMDeduplicator.findMatch(internal, crmRecords);
  expect(match).toBeDefined();
  expect(match.matchBasis).toBe('PHONE');
});
```

---

### 3.2 API Errors and Retries

#### TC-F5-E2.1: Salesforce Bulk API Partial Failure Rolls Back Batch
**Objective**: Verify that when a Salesforce Bulk API job has partial failures (some records failed, some succeeded), the entire batch is rolled back and no partial data written.

**Preconditions**:
- Salesforce Bulk API mock set to fail 20% of records with `FIELD_INTEGRITY_EXCEPTION`

**Test Steps**:
1. Call `SalesforceBulkSyncWriter.writeBatch(100 contacts)` with 20% configured to fail
2. Assert entire batch rolled back (0 records in Salesforce)
3. Assert all 100 contacts queued for individual retry

**Expected Result**: Atomic batch semantics; zero partial writes; all contacts re-queued.

**Code Sample**:
```typescript
it('should roll back entire batch on any Salesforce Bulk API partial failure', async () => {
  salesforceBulkSandbox.configurePartialFailure({ rate: 0.2, reason: 'FIELD_INTEGRITY_EXCEPTION' });
  const contacts = buildCRMContacts(100);

  await SalesforceBulkSyncWriter.writeBatch(contacts).catch(() => {});

  const sfCount = await salesforceSandbox.countByExternalIdPrefix('ca-');
  expect(sfCount).toBe(0);

  const retryQueue = await retryQueueStore.findAll({ source: 'salesforce_bulk' });
  expect(retryQueue).toHaveLength(100);
});
```

---

#### TC-F5-E2.2: HubSpot API Token Expiry Triggers Re-Auth Before Retry
**Objective**: Verify that a `401 Unauthorized` from HubSpot triggers OAuth re-authorization before retrying the upsert.

**Test Steps**:
1. Configure HubSpot mock to return `401` once, then `200` after re-auth
2. Call `HubSpotSyncWriter.upsert(crmContact)`
3. Assert `OAuthRefreshService.refresh('hubspot', userId)` called
4. Assert upsert ultimately succeeds

**Expected Result**: Re-auth triggered on `401`; upsert retried and succeeds; no user impact.

**Code Sample**:
```typescript
it('should refresh HubSpot OAuth token on 401 and retry the upsert', async () => {
  let attempt = 0;
  mockHubSpotApi.post.mockImplementation(async () => {
    if (attempt++ === 0) throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
    return { status: 'success' };
  });

  await HubSpotSyncWriter.upsert(buildCRMContact({ id: 'contact_hs' }));

  expect(mockOAuthRefreshService.refresh).toHaveBeenCalledWith('hubspot', 'user_1');
});
```

---

### 3.3 Data Validation and Sanitization

#### TC-F5-E3.1: Phone Number Normalized to E.164 Before CRM Write
**Objective**: Verify that phone numbers in various formats are normalized to E.164 format (`+[country][number]`) before being written to any CRM.

**Test Steps**:
1. Provide phone numbers in 3 formats: `'(415) 555-0100'`, `'415-555-0100'`, `'+14155550100'`
2. Call `PhoneNormalizer.toE164(phone, 'US')` for each
3. Assert all three produce `'+14155550100'`

**Expected Result**: All formats normalized to E.164; CRM receives consistent format.

**Code Sample**:
```typescript
describe('PhoneNormalizer', () => {
  it.each([
    ['(415) 555-0100', '+14155550100'],
    ['415-555-0100', '+14155550100'],
    ['+14155550100', '+14155550100'],
  ])('should normalize %s to E.164 format %s', (input, expected) => {
    expect(PhoneNormalizer.toE164(input, 'US')).toBe(expected);
  });
});
```

---

#### TC-F5-E3.2: Email Field Validated and Rejected If Malformed Before CRM Write
**Objective**: Verify that a contact with a malformed email address (`'not-an-email'`) is rejected before any CRM write attempt.

**Test Steps**:
1. Build CRM contact with `email = 'not-an-email'`
2. Call `CRMContactValidator.validate(crmContact)`
3. Assert `ValidationError` thrown with `field = 'email'`
4. Assert CRM API NOT called

**Expected Result**: Validation error before API call; malformed email not written to CRM.

**Code Sample**:
```typescript
it('should reject a malformed email address before writing to CRM', async () => {
  const invalidContact = buildCRMContact({ email: 'not-an-email' });

  await expect(CRMSyncService.sync({ userId: 'user_1', contactId: invalidContact.id, crmTarget: 'salesforce' }))
    .rejects.toThrow(expect.objectContaining({ type: 'ValidationError', field: 'email' }));

  expect(mockSalesforceApi.patch).not.toHaveBeenCalled();
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Bulk CRM Sync Throughput

#### TC-F5-P1.1: 500 Contacts Synced to Salesforce in Under 60 Seconds Using Bulk API
**Objective**: Verify that 500 conference contacts are synced to Salesforce using the Bulk API within 60 seconds.

**Preconditions**:
- 500 contacts seeded in internal store
- Salesforce sandbox configured for Bulk API

**Test Steps**:
1. Start timer
2. Call `SalesforceBulkSyncWriter.writeBatch(500 contacts)`
3. Assert elapsed < 60,000 ms
4. Assert 500 records in Salesforce sandbox

**Expected Result**: 500 contacts written in < 60 s via Bulk API; no individual call overhead.

**Code Sample**:
```typescript
describe('SalesforceBulkSyncWriter performance', () => {
  it('should sync 500 contacts to Salesforce Bulk API in under 60 seconds', async () => {
    const contacts = buildCRMContacts(500);
    const start = Date.now();

    await SalesforceBulkSyncWriter.writeBatch(contacts);

    expect(Date.now() - start).toBeLessThan(60_000);
    expect(await salesforceSandbox.countAll()).toBe(500);
  }, 65_000);
});
```

---

#### TC-F5-P1.2: HubSpot Batch Upsert of 100 Contacts Under 10 Seconds
**Objective**: Verify that using HubSpot's batch upsert endpoint, 100 contacts are synced in under 10 seconds.

**Test Steps**:
1. Call `HubSpotBatchWriter.batchUpsert(100 contacts)`
2. Assert elapsed < 10,000 ms
3. Assert 100 contacts in HubSpot sandbox

**Expected Result**: 100 HubSpot upserts in < 10 s via batch endpoint.

**Code Sample**:
```typescript
it('should batch upsert 100 contacts to HubSpot in under 10 seconds', async () => {
  const contacts = buildCRMContacts(100);
  const start = Date.now();

  await HubSpotBatchWriter.batchUpsert(contacts);

  expect(Date.now() - start).toBeLessThan(10_000);
  expect(await hubspotSandbox.countContacts()).toBe(100);
}, 15_000);
```

---

### 4.2 Sync Diff Computation

#### TC-F5-P2.1: Diff Computation for 1,000 Contacts Completes Under 1 Second
**Objective**: Verify that computing CRM sync diffs (identifying changed fields) for 1,000 contacts completes in under 1 second.

**Test Steps**:
1. Build 1,000 existing CRM snapshots and 1,000 updated contacts (20% with changes)
2. Measure time to call `CRMSyncDiffBuilder.buildBatch(snapshots, updated)`
3. Assert elapsed < 1,000 ms; 200 diffs identified

**Expected Result**: Batch diff computation < 1 s; 200 changed contacts identified.

**Code Sample**:
```typescript
it('should compute diffs for 1000 CRM contacts in under 1 second', () => {
  const snapshots = buildCRMSnapshots(1000);
  const updated = buildCRMContactsWithChanges(1000, { changeRate: 0.2 });

  const start = Date.now();
  const diffs = CRMSyncDiffBuilder.buildBatch(snapshots, updated);

  expect(Date.now() - start).toBeLessThan(1000);
  expect(diffs.filter(d => Object.keys(d.changes).length > 0)).toHaveLength(200);
});
```

---

#### TC-F5-P2.2: Multi-CRM Fan-Out Sync for 50 Contacts Completes Under 15 Seconds
**Objective**: Verify that syncing 50 contacts to both Salesforce and HubSpot simultaneously completes in under 15 seconds via parallel fan-out.

**Test Steps**:
1. Configure both CRMs for user
2. Measure time to call `CRMSyncOrchestrator.syncBatch({ userId, contactIds: 50Ids })`
3. Assert elapsed < 15,000 ms
4. Assert 50 records in both CRMs

**Expected Result**: Parallel fan-out faster than sequential; both CRMs updated in < 15 s.

**Code Sample**:
```typescript
it('should sync 50 contacts to both Salesforce and HubSpot in under 15 seconds', async () => {
  configureUserCRMs('user_1', ['salesforce', 'hubspot']);
  const contactIds = seedContacts(50).map(c => c.id);

  const start = Date.now();
  await CRMSyncOrchestrator.syncBatch({ userId: 'user_1', contactIds });

  expect(Date.now() - start).toBeLessThan(15_000);
  expect(await salesforceSandbox.countAll()).toBe(50);
  expect(await hubspotSandbox.countContacts()).toBe(50);
}, 20_000);
```

---

### 4.3 CRM API Connection Resilience

#### TC-F5-P3.1: Circuit Breaker Opens After 5 Consecutive Salesforce Failures
**Objective**: Verify that the circuit breaker for Salesforce opens after 5 consecutive failures, preventing further API calls until the half-open probe succeeds.

**Test Steps**:
1. Configure Salesforce mock to fail on every call
2. Call `SalesforceSyncWriter.upsert()` 7 times
3. Assert first 5 calls attempted; calls 6 and 7 immediately fail with `CircuitOpenError`
4. Assert circuit breaker state = `'open'`

**Expected Result**: Circuit opens after 5 failures; subsequent calls fast-fail; CRM not hammered.

**Code Sample**:
```typescript
it('should open circuit breaker after 5 consecutive Salesforce failures', async () => {
  mockSalesforceApi.patch.mockRejectedValue(new Error('ECONNREFUSED'));

  for (let i = 0; i < 7; i++) {
    await SalesforceSyncWriter.upsert(buildCRMContact({ id: `c_${i}` })).catch(() => {});
  }

  expect(mockSalesforceApi.patch).toHaveBeenCalledTimes(5);
  expect(salesforceCircuitBreaker.getState()).toBe('open');
});
```

---

#### TC-F5-P3.2: Sync Queue Drains 200 Queued Contacts After CRM Reconnects
**Objective**: Verify that contacts queued during a CRM outage are drained and synced within 30 seconds after the CRM comes back online.

**Test Steps**:
1. Trigger CRM outage; queue 200 contacts for sync
2. Restore CRM connectivity
3. Trigger `CRMSyncOrchestrator.drainQueue({ userId })`
4. Assert all 200 contacts synced within 30 s

**Expected Result**: Queue drained after reconnect; all 200 contacts synced; no loss.

**Code Sample**:
```typescript
it('should drain 200 queued contacts within 30 seconds after CRM reconnects', async () => {
  simulateCRMOutage();
  for (let i = 0; i < 200; i++) {
    await syncQueue.enqueue({ contactId: `c_${i}`, target: 'salesforce' });
  }

  restoreCRMConnectivity();
  const start = Date.now();
  await CRMSyncOrchestrator.drainQueue({ userId: 'user_1' });

  expect(Date.now() - start).toBeLessThan(30_000);
  expect(await salesforceSandbox.countAll()).toBe(200);
}, 35_000);
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

**Estimated Execution Time**: Unit ~60 s | Integration ~5 min | Edge Cases ~2 min | Performance ~8 min
**Coverage Target**: ≥90% branch coverage on `SalesforceCRMAdapter`, `HubSpotCRMAdapter`, `CRMSyncDiffBuilder`, `CRMSyncOrchestrator`, `SalesforceBulkSyncWriter`, `HubSpotBatchWriter`
