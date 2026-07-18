# EPIC04 Feature 7 — Company Association — Test Cases

## Test Overview
Comprehensive test suite for Company Association covering unit tests, integration tests, edge cases, and performance validation. Company association links contacts to the organisations they work for, supporting the system's ability to group contacts by company, infer company-level relationship networks, and track employment changes over time. Tests cover company resolution, domain-to-company mapping, employment record management, hierarchical company structures, and stale association detection.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Company Resolution from Email Domain

#### TC-F7-U1.1: Email domain is resolved to a known company record
**Objective**: Verify that the email domain `@stripe.com` is resolved to the Stripe company record in the company registry.

**Preconditions**:
- Company registry contains an entry for `stripe.com → Stripe, Inc.`.

**Test Steps**:
1. Call `companyResolver.resolveByDomain('stripe.com')`.
2. Assert result has `name: 'Stripe, Inc.'` and `domain: 'stripe.com'`.

**Expected Result**: Known domain resolves to the correct company record.

**Code Sample**:
```typescript
import { CompanyResolver } from '@/services/company/company-resolver';

it('should resolve a known email domain to a company', async () => {
  const resolver = new CompanyResolver({ registry: companyRegistry });
  const company = await resolver.resolveByDomain('stripe.com');

  expect(company.name).toBe('Stripe, Inc.');
  expect(company.domain).toBe('stripe.com');
});
```

---

#### TC-F7-U1.2: Unknown domain creates a new company stub
**Objective**: Verify that an unrecognised domain triggers the creation of a minimal company stub rather than failing.

**Preconditions**:
- `newstartup123.io` is not in the company registry.

**Test Steps**:
1. Call `companyResolver.resolveByDomain('newstartup123.io')`.
2. Assert a new company stub is created with `domain: 'newstartup123.io'` and `isVerified: false`.

**Expected Result**: Unrecognised domain produces a new unverified stub company.

**Code Sample**:
```typescript
it('should create a company stub for an unknown domain', async () => {
  const resolver = new CompanyResolver({ registry: companyRegistry, createStubsOnMiss: true });
  const company = await resolver.resolveByDomain('newstartup123.io');

  expect(company.domain).toBe('newstartup123.io');
  expect(company.isVerified).toBe(false);
});
```

---

#### TC-F7-U1.3: Free/personal email domains are not mapped to companies
**Objective**: Confirm that generic email domains like `@gmail.com`, `@yahoo.com`, and `@outlook.com` do not produce company records.

**Preconditions**:
- `personalEmailDomains` blocklist includes `gmail.com`, `yahoo.com`, `outlook.com`.

**Test Steps**:
1. Call `companyResolver.resolveByDomain('gmail.com')`.
2. Assert result is `null` or a special `PERSONAL_EMAIL` sentinel.

**Expected Result**: Personal domains return null; no company record created.

**Code Sample**:
```typescript
it.each(['gmail.com', 'yahoo.com', 'outlook.com'])(
  'should not create a company for personal domain %s',
  async (domain) => {
    const resolver = new CompanyResolver({ personalEmailDomains: ['gmail.com', 'yahoo.com', 'outlook.com'] });
    const company = await resolver.resolveByDomain(domain);
    expect(company).toBeNull();
  }
);
```

---

### 1.2 Employment Record Management

#### TC-F7-U2.1: Adding a company association creates a dated employment record
**Objective**: Verify that associating a contact with a company creates an employment record with a start date and no end date.

**Preconditions**:
- Contact A and Company B both exist.

**Test Steps**:
1. Call `employmentService.associate(contactA.id, companyB.id, { startDate: '2024-01-15' })`.
2. Query employment records for contact A.
3. Assert one record exists with `companyId = B.id`, `startDate = 2024-01-15`, `endDate = null`.

**Expected Result**: Employment record created with correct start date and no end date.

**Code Sample**:
```typescript
import { EmploymentService } from '@/services/company/employment-service';

it('should create a dated employment record', async () => {
  await employmentService.associate(contactA.id, companyB.id, { startDate: new Date('2024-01-15') });
  const records = await employmentStore.findByContactId(contactA.id);

  expect(records).toHaveLength(1);
  expect(records[0].companyId).toBe(companyB.id);
  expect(records[0].endDate).toBeNull();
});
```

---

#### TC-F7-U2.2: Updating employment to a new company closes the old record
**Objective**: Verify that associating a contact with a new company sets `endDate` on the current employment record and creates a new open record.

**Preconditions**:
- Contact has an open employment record at Company A (no end date).

**Test Steps**:
1. Call `employmentService.changeCompany(contact.id, companyB.id, { effectiveDate: new Date() })`.
2. Assert the old Company A record now has `endDate = effectiveDate`.
3. Assert a new open record exists for Company B.

**Expected Result**: Old record closed; new record opened.

**Code Sample**:
```typescript
it('should close old employment and open new one on company change', async () => {
  await employmentService.associate(contact.id, companyA.id, { startDate: new Date('2023-01-01') });
  const changeDate = new Date();
  await employmentService.changeCompany(contact.id, companyB.id, { effectiveDate: changeDate });

  const records = await employmentStore.findByContactId(contact.id);
  const old = records.find((r) => r.companyId === companyA.id);
  const current = records.find((r) => r.companyId === companyB.id);

  expect(old?.endDate).toEqual(changeDate);
  expect(current?.endDate).toBeNull();
});
```

---

#### TC-F7-U2.3: Contact can have multiple historical employment records
**Objective**: Confirm that a contact can have sequential employment records forming a complete job history.

**Preconditions**:
- Contact has had 3 employers over the past 5 years.

**Test Steps**:
1. Create 3 sequential employment records.
2. Query employment history.
3. Assert 3 records in chronological order.
4. Assert only the most recent has `endDate = null`.

**Expected Result**: Full employment history preserved; only latest record is open.

**Code Sample**:
```typescript
it('should preserve full employment history', async () => {
  await employmentService.associate(contact.id, companyA.id, { startDate: new Date('2021-01-01') });
  await employmentService.changeCompany(contact.id, companyB.id, { effectiveDate: new Date('2022-06-01') });
  await employmentService.changeCompany(contact.id, companyC.id, { effectiveDate: new Date('2024-03-01') });

  const history = await employmentStore.findByContactIdOrdered(contact.id);
  expect(history).toHaveLength(3);
  expect(history[2].endDate).toBeNull(); // most recent is open
});
```

---

### 1.3 Company Deduplication

#### TC-F7-U3.1: Two contacts with the same email domain are linked to the same company
**Objective**: Verify that two contacts with emails from the same domain are both associated with the same company record.

**Preconditions**:
- Company record for `acme.com` already exists.

**Test Steps**:
1. Create contact with `email: 'alice@acme.com'`.
2. Create contact with `email: 'bob@acme.com'`.
3. Run company association for both.
4. Assert both contacts' `companyId` is the same `acme.com` company ID.

**Expected Result**: Both contacts share the same company record.

**Code Sample**:
```typescript
it('should link both contacts from the same domain to the same company', async () => {
  const alice = await svc.createContact({ firstName: 'Alice', email: 'alice@acme.com' });
  const bob = await svc.createContact({ firstName: 'Bob', email: 'bob@acme.com' });

  await companyAssocService.associateAll([alice, bob]);

  const aliceComp = await employmentStore.getCurrentCompanyId(alice.id);
  const bobComp = await employmentStore.getCurrentCompanyId(bob.id);
  expect(aliceComp).toBe(bobComp);
});
```

---

#### TC-F7-U3.2: Company name fuzzy match prevents duplicate company records
**Objective**: Ensure that `'Microsoft Corporation'` and `'Microsoft Corp.'` resolve to the same company record.

**Preconditions**:
- Company registry contains `Microsoft Corporation`.

**Test Steps**:
1. Call `companyResolver.resolveByName('Microsoft Corp.')`.
2. Assert result matches the existing `Microsoft Corporation` record (same ID).

**Expected Result**: Fuzzy name match prevents a duplicate company record.

**Code Sample**:
```typescript
it('should fuzzy-match company name to existing record', async () => {
  const existing = await companyStore.findByName('Microsoft Corporation');
  const resolved = await companyResolver.resolveByName('Microsoft Corp.');

  expect(resolved.id).toBe(existing.id);
});
```

---

#### TC-F7-U3.3: Explicitly different companies with similar names are not merged
**Objective**: Confirm that `'Apple Inc.'` and `'Apple Records'` are NOT merged despite sharing the word `'Apple'`.

**Preconditions**:
- Both companies exist in the registry with distinct industry codes.

**Test Steps**:
1. Resolve `'Apple Inc.'` and `'Apple Records'`.
2. Assert the two resolved IDs are different.

**Expected Result**: Distinct company records maintained for similar but different company names.

**Code Sample**:
```typescript
it('should not merge companies with similar names but different industries', async () => {
  const apple = await companyResolver.resolveByName('Apple Inc.');
  const appleRecords = await companyResolver.resolveByName('Apple Records');
  expect(apple.id).not.toBe(appleRecords.id);
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Automated Association on Contact Creation

#### TC-F7-I1.1: Company is automatically inferred and associated when a contact is created
**Objective**: Verify that when a contact is created with a work email, the system automatically infers and creates a company association.

**Preconditions**:
- Company registry has `hubspot.com → HubSpot, Inc.`.

**Test Steps**:
1. Create contact with `email: 'dave@hubspot.com'`.
2. Wait for async company association.
3. Assert contact's `currentCompanyId` is the HubSpot company record.

**Expected Result**: Company automatically inferred from email domain and associated.

**Code Sample**:
```typescript
it('should auto-associate company from email domain on contact creation', async () => {
  const contact = await svc.createContact({ firstName: 'Dave', email: 'dave@hubspot.com' });
  await waitFor(() => employmentStore.getCurrentCompanyId(contact.id), 2000);

  const companyId = await employmentStore.getCurrentCompanyId(contact.id);
  const company = await companyStore.findById(companyId);
  expect(company.name).toBe('HubSpot, Inc.');
});
```

---

#### TC-F7-I1.2: Changing contact email updates company association automatically
**Objective**: Verify that updating a contact's email to a new domain triggers an automatic company change.

**Preconditions**:
- Contact currently associated with `acme.com → ACME Corp`.
- Contact's email is updated to `newco@newco.io`.

**Test Steps**:
1. Update contact's email to `newco@newco.io`.
2. Run company association pipeline.
3. Assert old ACME employment record has an `endDate`.
4. Assert new `newco.io` employment record is open.

**Expected Result**: Employment record automatically updated on email domain change.

**Code Sample**:
```typescript
it('should update company association when email domain changes', async () => {
  await employmentService.associate(contact.id, acmeCompany.id, { startDate: new Date() });
  await svc.updateContact(contact.id, { email: 'newco@newco.io' });

  await companyAssocPipeline.run(contact.id);

  const oldRecord = await employmentStore.findOne({ contactId: contact.id, companyId: acmeCompany.id });
  expect(oldRecord?.endDate).not.toBeNull();
});
```

---

### 2.2 Company-Level Aggregation

#### TC-F7-I2.1: All contacts at a company are retrievable via company ID
**Objective**: Verify that querying by company ID returns all contacts currently employed there.

**Preconditions**:
- 15 contacts associated with `companyId: 'stripe-001'`.

**Test Steps**:
1. Call `companyService.getContacts('stripe-001')`.
2. Assert result has 15 contacts.

**Expected Result**: All 15 contacts returned.

**Code Sample**:
```typescript
it('should return all contacts for a given company', async () => {
  await seedCompanyContacts('stripe-001', 15);
  const contacts = await companyService.getContacts('stripe-001');
  expect(contacts).toHaveLength(15);
});
```

---

#### TC-F7-I2.2: Company-level relationship map aggregates all pairwise scores for employees
**Objective**: Verify that the company relationship map correctly aggregates all intra-company pairwise relationship scores.

**Preconditions**:
- 5 contacts at the same company with known pairwise scores.

**Test Steps**:
1. Seed 5 contacts at the same company with pairwise relationship scores.
2. Call `companyService.getInternalRelationshipMap('company-id')`.
3. Assert the map contains 10 edges (5*4/2).

**Expected Result**: All 10 intra-company pairs represented in the map.

**Code Sample**:
```typescript
it('should return full intra-company relationship map', async () => {
  await seedCompanyWithRelationships('co-id', { contactCount: 5 });
  const map = await companyService.getInternalRelationshipMap('co-id');
  expect(map.edges).toHaveLength(10); // C(5,2)
});
```

---

### 2.3 Company Enrichment Sync

#### TC-F7-I3.1: Company record is enriched from external data provider after creation
**Objective**: Verify that after a company stub is created, the enrichment service populates it with industry, headcount, and LinkedIn URL.

**Preconditions**:
- External enrichment provider mock returns data for `newstartup123.io`.

**Test Steps**:
1. Create a stub company for `newstartup123.io`.
2. Await enrichment (up to 5 s).
3. Assert company record has `industry`, `headcount`, and `linkedInUrl` set.

**Expected Result**: Company stub is enriched within 5 s.

**Code Sample**:
```typescript
it('should enrich a stub company from external provider', async () => {
  const company = await companyStore.createStub({ domain: 'newstartup123.io' });
  await waitFor(() => companyStore.isEnriched(company.id), 5000);

  const enriched = await companyStore.findById(company.id);
  expect(enriched.industry).toBeDefined();
  expect(enriched.headcount).toBeGreaterThan(0);
}, 10_000);
```

---

#### TC-F7-I3.2: Company enrichment failure does not prevent contact association
**Objective**: Confirm that if the external enrichment provider is unavailable, the company stub and contact association are still created.

**Preconditions**:
- External enrichment mock throws `ServiceUnavailableError`.

**Test Steps**:
1. Disable enrichment provider.
2. Create contact with a new-domain email.
3. Assert company stub was created.
4. Assert contact-company association exists.
5. Assert stub has `enrichmentStatus: 'pending'`.

**Expected Result**: Association created; enrichment queued for retry; no crash.

**Code Sample**:
```typescript
it('should create company association even when enrichment is unavailable', async () => {
  jest.spyOn(enrichmentProvider, 'enrich').mockRejectedValue(new ServiceUnavailableError());
  const contact = await svc.createContact({ firstName: 'No', email: 'no@enrichable.io' });

  await companyAssocPipeline.run(contact.id);

  const company = await companyStore.findByDomain('enrichable.io');
  expect(company).toBeDefined();
  expect(company.enrichmentStatus).toBe('pending');
  expect(await employmentStore.getCurrentCompanyId(contact.id)).toBe(company.id);
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Multi-Company Contacts

#### TC-F7-E1.1: Contact with two current employers is handled correctly
**Objective**: Verify that a contact who has two current roles (e.g., consultant + board member) can have two simultaneous open employment records.

**Preconditions**:
- `EmploymentService` configured with `allowConcurrentEmployment: true`.

**Test Steps**:
1. Associate contact with Company A (current).
2. Associate contact with Company B (also current, different role).
3. Query open employment records.
4. Assert two open records exist.

**Expected Result**: Two concurrent open employment records permitted.

**Code Sample**:
```typescript
it('should allow concurrent employment records when configured', async () => {
  const svc = new EmploymentService({ allowConcurrentEmployment: true });
  await svc.associate(contact.id, companyA.id, { role: 'Consultant' });
  await svc.associate(contact.id, companyB.id, { role: 'Board Member' });

  const open = await employmentStore.findOpen(contact.id);
  expect(open).toHaveLength(2);
});
```

---

#### TC-F7-E1.2: Default config rejects a second concurrent open employment without explicit flag
**Objective**: Verify that without `allowConcurrentEmployment`, creating a second open employment record throws an error.

**Preconditions**:
- `EmploymentService` default config (concurrent not allowed).
- Contact already has an open employment record.

**Test Steps**:
1. Associate contact with Company A (open).
2. Attempt to associate with Company B without closing A.
3. Assert `ConcurrentEmploymentError` is thrown.

**Expected Result**: Error thrown; only one open employment record at a time.

**Code Sample**:
```typescript
it('should reject second open employment by default', async () => {
  const svc = new EmploymentService({ allowConcurrentEmployment: false });
  await svc.associate(contact.id, companyA.id, {});
  await expect(svc.associate(contact.id, companyB.id, {})).rejects.toThrow(ConcurrentEmploymentError);
});
```

---

### 3.2 Subsidiary and Parent Companies

#### TC-F7-E2.1: Subsidiary email domain is associated with the subsidiary, not the parent
**Objective**: Verify that `@instagram.com` resolves to Instagram as its own company entity, not directly to Meta.

**Preconditions**:
- Registry: `instagram.com → Instagram` with `parentCompanyId → Meta`.

**Test Steps**:
1. Resolve `instagram.com`.
2. Assert `company.name === 'Instagram'`.
3. Assert `company.parentCompanyId` points to Meta's ID.

**Expected Result**: Contact associated with Instagram; parent relationship is metadata, not the primary association.

**Code Sample**:
```typescript
it('should associate with subsidiary, not parent company', async () => {
  const company = await companyResolver.resolveByDomain('instagram.com');
  expect(company.name).toBe('Instagram');
  expect(company.parentCompanyId).toBe(metaCompanyId);
});
```

---

#### TC-F7-E2.2: Company group query returns contacts across subsidiary and parent
**Objective**: Confirm that querying for all contacts in the Meta corporate group returns contacts from both Meta and Instagram.

**Preconditions**:
- Meta has 5 direct contacts; Instagram has 3 contacts.

**Test Steps**:
1. Call `companyService.getContactsInGroup(metaCompanyId, { includeSubsidiaries: true })`.
2. Assert result has 8 contacts.

**Expected Result**: Group query returns contacts from all subsidiaries.

**Code Sample**:
```typescript
it('should return contacts from subsidiaries in group query', async () => {
  await seedCompanyContacts(metaCompanyId, 5);
  await seedCompanyContacts(instagramCompanyId, 3); // Instagram = subsidiary of Meta
  const contacts = await companyService.getContactsInGroup(metaCompanyId, { includeSubsidiaries: true });
  expect(contacts).toHaveLength(8);
});
```

---

### 3.3 Stale Association Detection

#### TC-F7-E3.1: Company association is flagged as potentially stale if unchanged for 2 years
**Objective**: Verify that an employment record not updated in 2 years is flagged with `stalenessFlag: true` for human review.

**Preconditions**:
- `stalenessThresholdDays = 730` (2 years).

**Test Steps**:
1. Seed an employment record with `updatedAt = 2 years ago`.
2. Run the staleness scan job.
3. Assert the record has `stalenessFlag: true`.

**Expected Result**: Stale association flagged for review.

**Code Sample**:
```typescript
it('should flag employment records unchanged for 2+ years as stale', async () => {
  await seedEmploymentRecord(contact.id, companyA.id, { updatedAt: subDays(new Date(), 730) });
  await stalenessScanJob.run();

  const record = await employmentStore.findOne({ contactId: contact.id, companyId: companyA.id });
  expect(record?.stalenessFlag).toBe(true);
});
```

---

#### TC-F7-E3.2: LinkedIn-corroborated association is not flagged as stale
**Objective**: Confirm that an employment record recently corroborated by LinkedIn enrichment data is not flagged as stale, even if the system record is old.

**Preconditions**:
- Employment record is 3 years old but LinkedIn verification timestamp is recent.

**Test Steps**:
1. Seed stale employment record with recent `linkedInVerifiedAt`.
2. Run staleness scan.
3. Assert `stalenessFlag === false`.

**Expected Result**: LinkedIn verification prevents false stale flagging.

**Code Sample**:
```typescript
it('should not flag LinkedIn-corroborated association as stale', async () => {
  await seedEmploymentRecord(contact.id, companyA.id, {
    updatedAt: subDays(new Date(), 1095),
    linkedInVerifiedAt: subDays(new Date(), 7),
  });
  await stalenessScanJob.run();

  const record = await employmentStore.findOne({ contactId: contact.id, companyId: companyA.id });
  expect(record?.stalenessFlag).toBe(false);
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Domain Resolution Throughput

#### TC-F7-P1.1: Resolve 10 000 email domains in under 5 seconds
**Objective**: Validate the domain resolver throughput for bulk contact import scenarios.

**Preconditions**:
- Company registry is indexed.
- Domains are a mix of known, unknown, and personal.

**Test Steps**:
1. Generate 10 000 email domains.
2. Time `companyResolver.batchResolve(domains)`.
3. Assert elapsed <= 5 000 ms.

**Expected Result**: 10 000 domain resolutions within 5 s.

**Code Sample**:
```typescript
it('should resolve 10k domains under 5 seconds', async () => {
  const domains = generateMixedDomains(10_000);
  const t0 = performance.now();
  await companyResolver.batchResolve(domains);
  expect(performance.now() - t0).toBeLessThan(5000);
});
```

---

#### TC-F7-P1.2: Cache hit for repeated domain lookups reduces latency by 90%
**Objective**: Confirm that the domain resolution cache dramatically reduces latency for repeated lookups.

**Preconditions**:
- LRU domain cache configured with 1 000 entries.

**Test Steps**:
1. Resolve `'stripe.com'` once (cold).
2. Resolve `'stripe.com'` 999 more times.
3. Assert median latency of cached lookups <= 10% of cold lookup latency.

**Expected Result**: Cache hit reduces latency by >= 90%.

**Code Sample**:
```typescript
it('should serve 90%+ latency reduction via domain cache', async () => {
  const t0 = performance.now();
  await companyResolver.resolveByDomain('stripe.com'); // cold
  const coldTime = performance.now() - t0;

  const cachedTimes: number[] = [];
  for (let i = 0; i < 999; i++) {
    const t = performance.now();
    await companyResolver.resolveByDomain('stripe.com');
    cachedTimes.push(performance.now() - t);
  }
  const medianCached = cachedTimes.sort((a, b) => a - b)[499];
  expect(medianCached).toBeLessThanOrEqual(coldTime * 0.1);
});
```

---

### 4.2 Bulk Association Performance

#### TC-F7-P2.1: Associate 50 000 contacts with companies in under 2 minutes
**Objective**: Validate the bulk company association job processes 50 000 contacts within the maintenance window.

**Preconditions**:
- 50 000 contacts seeded; company registry populated.

**Test Steps**:
1. Seed 50 000 contacts.
2. Time `companyAssocBatchJob.run()`.
3. Assert elapsed <= 120 000 ms.
4. Assert all contacts have a `currentCompanyId` or `personalEmail` flag.

**Expected Result**: Bulk association completes in <= 2 minutes.

**Code Sample**:
```typescript
it('bulk company association for 50k contacts under 2 minutes', async () => {
  await seedContacts(store, 50_000);
  const t0 = performance.now();
  await companyAssocBatchJob.run();
  expect(performance.now() - t0).toBeLessThan(120_000);
}, 150_000);
```

---

#### TC-F7-P2.2: Contacts-by-company query returns under 100 ms for large companies
**Objective**: Validate the company contacts query is performant for companies with 10 000+ employees in the system.

**Preconditions**:
- Company has 10 000 associated contacts.
- Index on `(companyId, endDate)`.

**Test Steps**:
1. Seed 10 000 employment records for a single company.
2. Time `companyService.getContacts(companyId)`.
3. Assert elapsed <= 100 ms.

**Expected Result**: Large company contacts query returns in <= 100 ms.

**Code Sample**:
```typescript
it('contacts-by-company query returns under 100ms for 10k employees', async () => {
  await seedCompanyContacts(bigCompanyId, 10_000);
  const t0 = performance.now();
  await companyService.getContacts(bigCompanyId);
  expect(performance.now() - t0).toBeLessThan(100);
});
```

---

### 4.3 Staleness Scan Performance

#### TC-F7-P3.1: Staleness scan of 100 000 employment records completes in under 3 minutes
**Objective**: Validate the nightly staleness scan job handles 100 000 employment records within the maintenance window.

**Preconditions**:
- 100 000 employment records seeded with varied `updatedAt` timestamps.

**Test Steps**:
1. Seed 100 000 records.
2. Time `stalenessScanJob.run()`.
3. Assert elapsed <= 180 000 ms.

**Expected Result**: Staleness scan completes in <= 3 minutes.

**Code Sample**:
```typescript
it('staleness scan of 100k records under 3 minutes', async () => {
  await seedEmploymentRecords(employmentStore, 100_000);
  const t0 = performance.now();
  await stalenessScanJob.run();
  expect(performance.now() - t0).toBeLessThan(180_000);
}, 200_000);
```

---

#### TC-F7-P3.2: Flagging stale records does not lock the employment table
**Objective**: Confirm that the staleness update batch uses row-level locking and does not block concurrent reads.

**Preconditions**:
- Staleness scan running.
- 20 concurrent read queries.

**Test Steps**:
1. Start staleness scan in the background.
2. Run 20 concurrent `getContacts` queries.
3. Assert all read queries complete in <= 2× baseline latency.

**Expected Result**: No read lock contention during staleness update.

**Code Sample**:
```typescript
it('staleness scan should not block concurrent reads', async () => {
  const baselineP95 = await measureReadP95(employmentStore, 20);
  const scanPromise = stalenessScanJob.run();
  const duringP95 = await measureReadP95(employmentStore, 20);
  await scanPromise;

  expect(duringP95 / baselineP95).toBeLessThanOrEqual(2);
});
```

---

## Test Execution Summary

### Test Categories
- **Unit Tests**: 3 suites, 9 test cases
- **Integration Tests**: 3 suites, 6 test cases
- **Edge Cases**: 3 suites, 6 test cases
- **Performance Tests**: 3 suites, 6 test cases

### Total: 27 comprehensive test cases
