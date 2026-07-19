# EPIC08 Feature 4 — LinkedIn Enrichment — Test Cases

## Test Overview
Comprehensive test suite for LinkedIn Enrichment covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 LinkedIn Profile Data Normalization

#### TC-F4-U1.1: Raw LinkedIn Profile Normalized to EnrichedContact Schema
**Objective**: Verify that a raw LinkedIn API profile response is mapped to the `EnrichedContact` schema with all standard fields populated.

**Preconditions**:
- LinkedIn API mock returns a full profile JSON with `firstName`, `lastName`, `headline`, `industry`, `positions`, `educations`, `publicProfileUrl`

**Test Steps**:
1. Pass raw LinkedIn profile JSON to `LinkedInProfileNormalizer.normalize(rawProfile)`
2. Assert `fullName`, `headline`, `currentTitle`, `currentCompany`, `linkedInUrl`, `industry` mapped correctly
3. Assert `source = 'linkedin'`

**Expected Result**: `EnrichedContact` fully populated; `source = 'linkedin'`; all string fields trimmed.

**Code Sample**:
```typescript
describe('LinkedInProfileNormalizer', () => {
  it('should normalize a raw LinkedIn profile to EnrichedContact schema', () => {
    const rawProfile = {
      firstName: { localized: { en_US: 'Jane' } },
      lastName: { localized: { en_US: 'Doe' } },
      headline: { localized: { en_US: 'VP of Engineering at Acme Corp' } },
      industry: 'COMPUTER_SOFTWARE',
      publicProfileUrl: 'https://www.linkedin.com/in/janedoe',
      positions: {
        values: [{ company: { name: 'Acme Corp' }, title: 'VP of Engineering', isCurrent: true }],
      },
    };

    const normalizer = new LinkedInProfileNormalizer();
    const contact = normalizer.normalize(rawProfile);

    expect(contact.fullName).toBe('Jane Doe');
    expect(contact.currentTitle).toBe('VP of Engineering');
    expect(contact.currentCompany).toBe('Acme Corp');
    expect(contact.source).toBe('linkedin');
    expect(contact.linkedInUrl).toBe('https://www.linkedin.com/in/janedoe');
  });
});
```

---

#### TC-F4-U1.2: Most Recent Position Extracted as Current Role
**Objective**: Verify that when a profile has multiple positions, the one with `isCurrent = true` (or latest `startDate`) is selected as the current role.

**Test Steps**:
1. Build raw profile with 3 positions: one current, two historical
2. Call `normalizer.normalize(rawProfile)`
3. Assert `currentTitle` and `currentCompany` match the position with `isCurrent = true`

**Expected Result**: Current position correctly selected; historical positions ignored for `currentTitle`.

**Code Sample**:
```typescript
it('should select the current position as the primary role', () => {
  const rawProfile = buildRawProfileWithPositions([
    { title: 'Engineer', company: 'OldCo', isCurrent: false, startDate: { year: 2018 } },
    { title: 'VP of Engineering', company: 'Acme Corp', isCurrent: true, startDate: { year: 2022 } },
    { title: 'Senior Engineer', company: 'MidCo', isCurrent: false, startDate: { year: 2020 } },
  ]);

  const contact = normalizer.normalize(rawProfile);
  expect(contact.currentTitle).toBe('VP of Engineering');
  expect(contact.currentCompany).toBe('Acme Corp');
});
```

---

#### TC-F4-U1.3: Mutual Connection Count Extracted from Shared Connections
**Objective**: Verify that `LinkedInProfileNormalizer` correctly extracts the mutual connection count from the `miniProfile` shared connections field.

**Test Steps**:
1. Build raw profile including `sharedConnectionCount: 12`
2. Call `normalizer.normalize(rawProfile)`
3. Assert `mutualConnections = 12`

**Expected Result**: `mutualConnections` field set to 12; enriches relationship context.

**Code Sample**:
```typescript
it('should extract mutual connection count from raw LinkedIn profile', () => {
  const rawProfile = buildRawProfile({ sharedConnectionCount: 12 });
  const contact = normalizer.normalize(rawProfile);
  expect(contact.mutualConnections).toBe(12);
});
```

---

### 1.2 Profile Match Scoring

#### TC-F4-U2.1: Exact Email Match Scores Maximum Confidence
**Objective**: Verify that when a contact's email exactly matches a LinkedIn profile's primary email, the match scorer returns `confidence = 1.0`.

**Preconditions**:
- Contact record with `email = 'jane.doe@acmecorp.com'`
- LinkedIn profile with verified email `'jane.doe@acmecorp.com'`

**Test Steps**:
1. Call `LinkedInMatchScorer.score(contactRecord, linkedInProfile)`
2. Assert `confidence = 1.0`; `matchBasis = 'EMAIL_EXACT'`

**Expected Result**: Perfect confidence on exact email match; no fuzzy scoring applied.

**Code Sample**:
```typescript
describe('LinkedInMatchScorer', () => {
  it('should return confidence 1.0 for an exact email match', () => {
    const contact = buildContact({ email: 'jane.doe@acmecorp.com' });
    const profile = buildLinkedInProfile({ primaryEmail: 'jane.doe@acmecorp.com' });

    const result = LinkedInMatchScorer.score(contact, profile);

    expect(result.confidence).toBe(1.0);
    expect(result.matchBasis).toBe('EMAIL_EXACT');
  });
});
```

---

#### TC-F4-U2.2: Name + Company Fuzzy Match Returns Moderate Confidence
**Objective**: Verify that when no email is available but name and company are similar (fuzzy match), the scorer returns a moderate confidence score between 0.6 and 0.8.

**Test Steps**:
1. Contact: `name = 'Jon Smith'`, `company = 'Acme'`
2. LinkedIn profile: `name = 'Jonathan Smith'`, `company = 'Acme Corp'`
3. Call `LinkedInMatchScorer.score(contact, profile)`
4. Assert `confidence` in range `[0.6, 0.8]`; `matchBasis = 'NAME_COMPANY_FUZZY'`

**Expected Result**: Moderate confidence for fuzzy name+company match; not auto-applied without review.

**Code Sample**:
```typescript
it('should return moderate confidence for a fuzzy name + company match', () => {
  const contact = buildContact({ name: 'Jon Smith', company: 'Acme' });
  const profile = buildLinkedInProfile({ fullName: 'Jonathan Smith', currentCompany: 'Acme Corp' });

  const result = LinkedInMatchScorer.score(contact, profile);

  expect(result.confidence).toBeGreaterThanOrEqual(0.6);
  expect(result.confidence).toBeLessThanOrEqual(0.8);
  expect(result.matchBasis).toBe('NAME_COMPANY_FUZZY');
});
```

---

#### TC-F4-U2.3: No Match Returns Confidence Below Threshold
**Objective**: Verify that a mismatched name and company returns `confidence < 0.3`, preventing auto-enrichment.

**Test Steps**:
1. Contact: `name = 'Alice Wong'`, `company = 'TechStart'`
2. LinkedIn profile: `name = 'Bob Johnson'`, `company = 'BigCorp'`
3. Call `LinkedInMatchScorer.score(contact, profile)`
4. Assert `confidence < 0.3`

**Expected Result**: Low confidence; enrichment not applied; manual review flagged.

**Code Sample**:
```typescript
it('should return confidence below 0.3 for mismatched contact and profile', () => {
  const contact = buildContact({ name: 'Alice Wong', company: 'TechStart' });
  const profile = buildLinkedInProfile({ fullName: 'Bob Johnson', currentCompany: 'BigCorp' });

  const result = LinkedInMatchScorer.score(contact, profile);
  expect(result.confidence).toBeLessThan(0.3);
});
```

---

### 1.3 Enrichment Delta Detection

#### TC-F4-U3.1: Changed Headline Detected as Enrichment Delta
**Objective**: Verify that `EnrichmentDeltaDetector` identifies a changed LinkedIn headline as a delta requiring a contact record update.

**Test Steps**:
1. Existing contact enrichment: `headline = 'Engineer at Acme'`
2. New LinkedIn fetch: `headline = 'VP of Engineering at Acme'`
3. Call `detector.detect(existing, fresh)`
4. Assert delta contains `{ field: 'headline', old: 'Engineer at Acme', new: 'VP of Engineering at Acme' }`

**Expected Result**: Headline delta detected; contact update queued.

**Code Sample**:
```typescript
describe('EnrichmentDeltaDetector', () => {
  it('should detect a changed LinkedIn headline as a delta', () => {
    const existing = buildEnrichment({ headline: 'Engineer at Acme' });
    const fresh = buildEnrichment({ headline: 'VP of Engineering at Acme' });

    const detector = new EnrichmentDeltaDetector();
    const deltas = detector.detect(existing, fresh);

    expect(deltas).toContainEqual({ field: 'headline', old: 'Engineer at Acme', new: 'VP of Engineering at Acme' });
  });
});
```

---

#### TC-F4-U3.2: Unchanged Profile Produces Empty Delta
**Objective**: Verify that when the fresh LinkedIn profile is identical to the cached enrichment, `detect()` returns an empty delta array.

**Test Steps**:
1. Build identical `existing` and `fresh` enrichment objects
2. Call `detector.detect(existing, fresh)`
3. Assert empty array returned

**Expected Result**: No unnecessary updates triggered; enrichment marked as current.

**Code Sample**:
```typescript
it('should return empty delta when the profile has not changed', () => {
  const enrichment = buildEnrichment({ headline: 'Engineer', company: 'Acme' });
  const deltas = new EnrichmentDeltaDetector().detect(enrichment, { ...enrichment });
  expect(deltas).toHaveLength(0);
});
```

---

#### TC-F4-U3.3: Company Change Triggers CRM Sync Downstream Event
**Objective**: Verify that when the delta detector finds a company change, it emits a `CompanyChangedEvent` that the CRM sync listener can consume.

**Test Steps**:
1. Change `currentCompany` from `'OldCo'` to `'NewCo'` in fresh enrichment
2. Call `detector.detect(existing, fresh)`
3. Assert `CompanyChangedEvent` emitted on internal event bus

**Expected Result**: `CompanyChangedEvent` emitted; downstream CRM sync triggered.

**Code Sample**:
```typescript
it('should emit CompanyChangedEvent when company changes in enrichment delta', () => {
  const existing = buildEnrichment({ currentCompany: 'OldCo' });
  const fresh = buildEnrichment({ currentCompany: 'NewCo' });

  const detector = new EnrichmentDeltaDetector(mockEventBus);
  detector.detect(existing, fresh);

  expect(mockEventBus.emit).toHaveBeenCalledWith('CompanyChangedEvent', expect.objectContaining({
    oldCompany: 'OldCo',
    newCompany: 'NewCo',
  }));
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Enrichment Pipeline End-to-End

#### TC-F4-I1.1: Contact Enriched from LinkedIn Profile on Pipeline Run
**Objective**: Verify that running `LinkedInEnrichmentPipeline.run()` fetches the LinkedIn profile, matches it to a contact, and updates the contact record with enriched data.

**Preconditions**:
- Contact record with `email = 'jane.doe@acmecorp.com'` and `linkedInUrl = 'https://linkedin.com/in/janedoe'`
- LinkedIn API sandbox returns a profile for `janedoe`

**Test Steps**:
1. Call `LinkedInEnrichmentPipeline.run({ userId, contactId })`
2. Query contact store for updated record
3. Assert `currentTitle`, `currentCompany`, `headline`, `photoUrl` populated

**Expected Result**: Contact enriched with LinkedIn data; `enrichedAt` timestamp set; `enrichmentSource = 'linkedin'`.

**Code Sample**:
```typescript
describe('LinkedInEnrichmentPipeline integration', () => {
  it('should enrich a contact with LinkedIn profile data', async () => {
    seedContactStore([buildContact({ id: 'contact_1', email: 'jane.doe@acmecorp.com', linkedInUrl: 'https://linkedin.com/in/janedoe' })]);
    seedLinkedInSandbox('janedoe', buildLinkedInProfile({ title: 'VP of Engineering', company: 'Acme Corp' }));

    await LinkedInEnrichmentPipeline.run({ userId: 'user_1', contactId: 'contact_1' });

    const contact = await contactStore.get('contact_1');
    expect(contact.currentTitle).toBe('VP of Engineering');
    expect(contact.enrichmentSource).toBe('linkedin');
    expect(contact.enrichedAt).toBeDefined();
  });
});
```

---

#### TC-F4-I1.2: Batch Enrichment Processes 20 Contacts Sequentially with Rate Limiting
**Objective**: Verify that batch enrichment of 20 contacts respects LinkedIn API rate limits by inserting delays between requests and completes without `429` errors.

**Test Steps**:
1. Seed 20 contacts with LinkedIn URLs
2. Call `LinkedInBatchEnricher.enrich({ userId, contactIds: 20ContactIds })`
3. Assert all 20 enriched; assert inter-request delays >= 500 ms (rate limit compliance)

**Expected Result**: All 20 contacts enriched; no `429` errors; rate-limit delays observed.

**Code Sample**:
```typescript
it('should batch-enrich 20 contacts with rate-limit delays between requests', async () => {
  const contactIds = seedContacts(20);
  await LinkedInBatchEnricher.enrich({ userId: 'user_1', contactIds });

  const enriched = await contactStore.findEnriched({ userId: 'user_1' });
  expect(enriched).toHaveLength(20);

  const delays = capturedInterRequestDelays();
  delays.forEach(d => expect(d).toBeGreaterThanOrEqual(500));
});
```

---

### 2.2 Profile Search and Match Pipeline

#### TC-F4-I2.1: People Search by Name and Company Returns Ranked Candidates
**Objective**: Verify that `LinkedInSearchService.search({ name, company })` returns ranked match candidates for a given contact.

**Test Steps**:
1. Call `LinkedInSearchService.search({ name: 'Jane Doe', company: 'Acme Corp' })`
2. Assert at least 1 result returned
3. Assert results sorted by `confidence` descending
4. Assert top result `confidence >= 0.7`

**Expected Result**: Ranked results returned; top match meets minimum confidence threshold.

**Code Sample**:
```typescript
describe('LinkedInSearchService integration', () => {
  it('should return ranked candidates for a name + company search', async () => {
    const results = await LinkedInSearchService.search({ name: 'Jane Doe', company: 'Acme Corp' });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].confidence).toBeGreaterThanOrEqual(0.7);
    results.forEach((r, i) => {
      if (i > 0) expect(results[i - 1].confidence).toBeGreaterThanOrEqual(r.confidence);
    });
  });
});
```

---

#### TC-F4-I2.2: Low-Confidence Matches Queued for Manual Review
**Objective**: Verify that candidates with `confidence < 0.6` are placed in the manual review queue rather than auto-applied to the contact record.

**Test Steps**:
1. Seed LinkedIn sandbox to return a low-confidence match (confidence = 0.45)
2. Run enrichment pipeline for that contact
3. Assert contact NOT auto-enriched
4. Assert manual review queue has one pending item for that contact

**Expected Result**: Low-confidence match held for review; contact unchanged; queue entry created.

**Code Sample**:
```typescript
it('should queue low-confidence LinkedIn matches for manual review', async () => {
  seedLinkedInSandboxLowConfidenceMatch('contact_low', 0.45);

  await LinkedInEnrichmentPipeline.run({ userId: 'user_1', contactId: 'contact_low' });

  const contact = await contactStore.get('contact_low');
  expect(contact.enrichedAt).toBeUndefined();

  const reviewItems = await manualReviewQueue.findByContactId('contact_low');
  expect(reviewItems).toHaveLength(1);
});
```

---

### 2.3 Enrichment Refresh and Staleness

#### TC-F4-I3.1: Stale Enrichment (>30 Days) Triggers Automatic Refresh
**Objective**: Verify that the enrichment refresh job re-enriches contacts whose `enrichedAt` is older than 30 days.

**Test Steps**:
1. Create contact with `enrichedAt = 35 days ago`
2. Run `EnrichmentRefreshJob.run({ userId })`
3. Assert LinkedIn API called for that contact
4. Assert `enrichedAt` updated to now

**Expected Result**: Stale contact re-enriched; `enrichedAt` refreshed; LinkedIn API called once.

**Code Sample**:
```typescript
describe('EnrichmentRefreshJob integration', () => {
  it('should re-enrich contacts with enrichment older than 30 days', async () => {
    await seedContactWithStaleness('contact_stale', 35);

    await EnrichmentRefreshJob.run({ userId: 'user_1' });

    const contact = await contactStore.get('contact_stale');
    const ageMs = Date.now() - new Date(contact.enrichedAt).getTime();
    expect(ageMs).toBeLessThan(60_000); // refreshed within last 60 seconds
    expect(linkedInApiSpy).toHaveBeenCalledWith(expect.objectContaining({ profileId: contact.linkedInProfileId }));
  });
});
```

---

#### TC-F4-I3.2: Fresh Enrichment (<7 Days) Skipped in Refresh Run
**Objective**: Verify that contacts enriched within the last 7 days are skipped by the refresh job.

**Test Steps**:
1. Create contact with `enrichedAt = 3 days ago`
2. Run `EnrichmentRefreshJob.run({ userId })`
3. Assert LinkedIn API NOT called for that contact

**Expected Result**: Fresh contact skipped; LinkedIn API not called; `enrichedAt` unchanged.

**Code Sample**:
```typescript
it('should skip contacts enriched within the last 7 days', async () => {
  await seedContactWithStaleness('contact_fresh', 3);

  await EnrichmentRefreshJob.run({ userId: 'user_1' });

  expect(linkedInApiSpy).not.toHaveBeenCalledWith(
    expect.objectContaining({ contactId: 'contact_fresh' })
  );
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 LinkedIn API Rate Limiting

#### TC-F4-E1.1: Daily Enrichment Cap Halts Processing and Logs Warning
**Objective**: Verify that when the daily LinkedIn API enrichment cap (e.g., 100 requests/day) is reached, the pipeline halts gracefully and logs a warning.

**Preconditions**:
- Daily cap configured to 100 requests
- 100 requests already consumed today

**Test Steps**:
1. Attempt to enrich a new contact
2. Assert `LinkedInDailyCapError` thrown or pipeline halted
3. Assert warning logged with resume time (next midnight)

**Expected Result**: Pipeline halted at cap; informative warning logged; no silent failure.

**Code Sample**:
```typescript
it('should halt enrichment pipeline when the daily LinkedIn API cap is reached', async () => {
  simulateDailyCapReached(100);

  await expect(
    LinkedInEnrichmentPipeline.run({ userId: 'user_1', contactId: 'contact_1' })
  ).rejects.toThrow(LinkedInDailyCapError);

  expect(mockLogger.warn).toHaveBeenCalledWith(
    expect.stringContaining('Daily LinkedIn enrichment cap reached'),
    expect.objectContaining({ resumeAt: expect.any(String) })
  );
});
```

---

#### TC-F4-E1.2: Profile Not Found Returns EnrichmentNotAvailableError
**Objective**: Verify that when LinkedIn search finds no matching profile for a contact, an `EnrichmentNotAvailableError` is thrown and the contact is marked as unenrichable.

**Test Steps**:
1. Seed LinkedIn sandbox to return empty results for `name = 'Zyx Qwerty'`
2. Call enrichment pipeline for that contact
3. Assert `EnrichmentNotAvailableError` thrown
4. Assert contact `enrichmentStatus = 'unavailable'`

**Expected Result**: Graceful no-match handling; contact marked unavailable; no retry loop.

**Code Sample**:
```typescript
it('should mark contact as unenrichable when no LinkedIn profile is found', async () => {
  seedLinkedInSandboxNoResults('Zyx Qwerty');

  await expect(
    LinkedInEnrichmentPipeline.run({ userId: 'user_1', contactId: 'contact_nf' })
  ).rejects.toThrow(EnrichmentNotAvailableError);

  const contact = await contactStore.get('contact_nf');
  expect(contact.enrichmentStatus).toBe('unavailable');
});
```

---

### 3.2 Privacy and Consent Edge Cases

#### TC-F4-E2.1: Enrichment Blocked for Contacts Who Opted Out
**Objective**: Verify that contacts with `privacyConsent.linkedInEnrichment = false` are never enriched regardless of pipeline run.

**Test Steps**:
1. Create contact with `privacyConsent.linkedInEnrichment = false`
2. Call `LinkedInEnrichmentPipeline.run({ userId, contactId })`
3. Assert LinkedIn API NOT called
4. Assert `EnrichmentConsentDeniedError` emitted or logged

**Expected Result**: LinkedIn API call skipped; consent respected; no data written.

**Code Sample**:
```typescript
it('should not enrich a contact who has opted out of LinkedIn enrichment', async () => {
  await seedContactWithConsentDenied('contact_optout', { linkedInEnrichment: false });

  await LinkedInEnrichmentPipeline.run({ userId: 'user_1', contactId: 'contact_optout' });

  expect(linkedInApiSpy).not.toHaveBeenCalled();
  expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('consent denied'));
});
```

---

#### TC-F4-E2.2: Enrichment Data Purged on GDPR Deletion Request
**Objective**: Verify that when a GDPR deletion request is processed for a user, all LinkedIn enrichment data for their contacts is purged.

**Test Steps**:
1. Enrich 5 contacts for `user_1`
2. Submit GDPR deletion request for `user_1`
3. Assert all 5 contact enrichment payloads have `currentTitle`, `headline`, `photoUrl` nulled

**Expected Result**: Enrichment data purged; contact skeleton retained (name, email); enrichment fields nulled.

**Code Sample**:
```typescript
it('should purge LinkedIn enrichment data on GDPR deletion request', async () => {
  await enrichContacts('user_1', 5);
  await GdprDeletionService.processRequest({ userId: 'user_1' });

  const contacts = await contactStore.findAll({ userId: 'user_1' });
  contacts.forEach(c => {
    expect(c.currentTitle).toBeNull();
    expect(c.headline).toBeNull();
    expect(c.photoUrl).toBeNull();
  });
});
```

---

### 3.3 Malformed and Partial Profile Data

#### TC-F4-E3.1: Profile with Missing Position Data Handled Gracefully
**Objective**: Verify that a LinkedIn profile with `positions.values = []` (no work history) is normalized without throwing errors, producing an `EnrichedContact` with `currentTitle = null`.

**Test Steps**:
1. Build raw LinkedIn profile with `positions: { values: [] }`
2. Call `normalizer.normalize(rawProfile)`
3. Assert `currentTitle = null`; no exception thrown

**Expected Result**: Graceful handling; `currentTitle = null`; other fields populated normally.

**Code Sample**:
```typescript
it('should handle a LinkedIn profile with no work history without throwing', () => {
  const rawProfile = buildRawProfile({ positions: { values: [] } });
  const contact = normalizer.normalize(rawProfile);
  expect(contact.currentTitle).toBeNull();
  expect(contact.fullName).toBeDefined();
});
```

---

#### TC-F4-E3.2: Profile Photo URL Validated Before Storage
**Objective**: Verify that LinkedIn profile photo URLs are validated (must be `https://media.licdn.com/...`) before being stored to prevent SSRF via malicious URL injection.

**Test Steps**:
1. Build raw profile with `photoUrl = 'http://evil.com/steal-data'`
2. Call `normalizer.normalize(rawProfile)`
3. Assert `photoUrl = null` (rejected); no storage write of the malicious URL

**Expected Result**: Invalid photo URL rejected; `photoUrl = null`; no SSRF vector stored.

**Code Sample**:
```typescript
it('should reject and null non-LinkedIn photo URLs to prevent SSRF', () => {
  const rawProfile = buildRawProfile({ photoUrl: 'http://evil.com/steal-data' });
  const contact = normalizer.normalize(rawProfile);
  expect(contact.photoUrl).toBeNull();
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Enrichment Pipeline Throughput

#### TC-F4-P1.1: 50 Contact Batch Enrichment Completes in Under 60 Seconds
**Objective**: Verify that batch-enriching 50 contacts (including inter-request rate-limit delays of 500 ms) completes in under 60 seconds.

**Preconditions**:
- 50 contacts with LinkedIn URLs in store
- LinkedIn sandbox responds in < 200 ms per request
- Rate-limit delay: 500 ms between requests

**Test Steps**:
1. Start timer
2. Call `LinkedInBatchEnricher.enrich({ userId: 'user_perf', contactIds: 50Ids })`
3. Assert elapsed < 60,000 ms
4. Assert all 50 contacts enriched

**Expected Result**: 50 enrichments in < 60 s; rate-limit delays respected.

**Code Sample**:
```typescript
describe('LinkedInBatchEnricher performance', () => {
  it('should enrich 50 contacts in under 60 seconds with rate-limit delays', async () => {
    const contactIds = seedContacts(50);
    const start = Date.now();

    await LinkedInBatchEnricher.enrich({ userId: 'user_perf', contactIds });

    expect(Date.now() - start).toBeLessThan(60_000);
    const enriched = await contactStore.findEnriched({ userId: 'user_perf' });
    expect(enriched).toHaveLength(50);
  }, 65_000);
});
```

---

#### TC-F4-P1.2: Enrichment Cache Reduces LinkedIn API Calls by 70% on Re-Run
**Objective**: Verify that running enrichment twice for the same contacts (with profiles in cache) reduces LinkedIn API calls by at least 70%.

**Test Steps**:
1. Run enrichment for 20 contacts; capture API call count
2. Run enrichment again for same contacts within cache TTL
3. Assert second run makes ≤30% of the first run's API calls

**Expected Result**: Cache effective; ≤6 API calls in second run vs 20 in first.

**Code Sample**:
```typescript
it('should reduce LinkedIn API calls by 70% on re-enrichment within cache TTL', async () => {
  const contactIds = seedContacts(20);
  await LinkedInBatchEnricher.enrich({ userId: 'user_1', contactIds });
  const firstRunCalls = linkedInApiSpy.mock.calls.length;

  linkedInApiSpy.mockClear();
  await LinkedInBatchEnricher.enrich({ userId: 'user_1', contactIds });
  const secondRunCalls = linkedInApiSpy.mock.calls.length;

  expect(secondRunCalls).toBeLessThanOrEqual(firstRunCalls * 0.3);
});
```

---

### 4.2 Profile Search Latency

#### TC-F4-P2.1: LinkedIn Profile Search Returns Results in Under 2 Seconds
**Objective**: Verify that `LinkedInSearchService.search()` returns ranked results within 2 seconds for a typical name + company query.

**Test Steps**:
1. Call `LinkedInSearchService.search({ name: 'Jane Doe', company: 'Acme Corp' })` 20 times
2. Measure P95 latency
3. Assert P95 < 2,000 ms

**Expected Result**: P95 search latency < 2 s; consistent response times.

**Code Sample**:
```typescript
it('should return LinkedIn search results within 2 seconds at P95', async () => {
  const latencies: number[] = [];
  for (let i = 0; i < 20; i++) {
    const start = Date.now();
    await LinkedInSearchService.search({ name: 'Jane Doe', company: 'Acme Corp' });
    latencies.push(Date.now() - start);
  }

  const p95 = percentile(latencies, 95);
  expect(p95).toBeLessThan(2000);
});
```

---

#### TC-F4-P2.2: Profile Match Scoring of 100 Candidates Under 500 ms
**Objective**: Verify that scoring 100 LinkedIn match candidates for a single contact completes in under 500 ms.

**Test Steps**:
1. Generate 100 LinkedIn profile candidates
2. Measure time to call `LinkedInMatchScorer.scoreAll(contact, candidates)`
3. Assert elapsed < 500 ms; 100 scored results returned

**Expected Result**: Batch scoring fast enough for real-time enrichment feedback; no timeouts.

**Code Sample**:
```typescript
it('should score 100 LinkedIn match candidates in under 500ms', () => {
  const contact = buildContact({ name: 'Jane Doe', company: 'Acme Corp' });
  const candidates = buildLinkedInProfiles(100);

  const start = Date.now();
  const scored = LinkedInMatchScorer.scoreAll(contact, candidates);

  expect(Date.now() - start).toBeLessThan(500);
  expect(scored).toHaveLength(100);
});
```

---

### 4.3 Enrichment Delta Processing

#### TC-F4-P3.1: Delta Detection for 1,000 Enrichments Under 5 Seconds
**Objective**: Verify that comparing 1,000 existing enrichments with fresh LinkedIn data to detect deltas completes in under 5 seconds.

**Test Steps**:
1. Build 1,000 existing enrichment objects
2. Build 1,000 fresh profiles (10% have changes)
3. Measure time to call `EnrichmentDeltaDetector.detectBatch(existing, fresh)`
4. Assert elapsed < 5,000 ms; 100 deltas detected

**Expected Result**: Batch delta detection < 5 s; 100 deltas identified correctly.

**Code Sample**:
```typescript
it('should detect deltas for 1000 enrichments in under 5 seconds', () => {
  const existing = buildEnrichments(1000);
  const fresh = buildFreshProfilesWithChanges(1000, { changeRate: 0.1 });

  const start = Date.now();
  const deltas = EnrichmentDeltaDetector.detectBatch(existing, fresh);

  expect(Date.now() - start).toBeLessThan(5000);
  expect(deltas).toHaveLength(100);
});
```

---

#### TC-F4-P3.2: Concurrent Enrichment Requests from Multiple Users Do Not Interfere
**Objective**: Verify that 5 concurrent enrichment pipeline runs for 5 different users complete without data contamination across user contexts.

**Test Steps**:
1. Seed 10 contacts per user for 5 users
2. Run all 5 enrichment pipelines concurrently
3. Assert each user's contacts are enriched only with their own data
4. Assert no cross-user data leakage

**Expected Result**: All 5 users enriched correctly; data isolation maintained; no cross-contamination.

**Code Sample**:
```typescript
it('should isolate enrichment data across 5 concurrent user pipelines', async () => {
  const userIds = Array.from({ length: 5 }, (_, i) => `user_${i}`);
  userIds.forEach(uid => seedContacts(10, { userId: uid }));

  await Promise.all(userIds.map(uid =>
    LinkedInBatchEnricher.enrich({ userId: uid, contactIds: getContactIds(uid) })
  ));

  for (const uid of userIds) {
    const contacts = await contactStore.findAll({ userId: uid });
    contacts.forEach(c => expect(c.userId).toBe(uid));
  }
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
**Coverage Target**: ≥90% branch coverage on `LinkedInProfileNormalizer`, `LinkedInMatchScorer`, `EnrichmentDeltaDetector`, `LinkedInEnrichmentPipeline`, `LinkedInBatchEnricher`
