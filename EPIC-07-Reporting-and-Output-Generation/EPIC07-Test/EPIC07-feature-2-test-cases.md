# EPIC07 Feature 2 — Follow-Up Drafts — Test Cases

## Test Overview
Comprehensive test suite for Follow-Up Drafts covering unit tests, integration tests, edge cases, and performance validation. Follow-Up Drafts automatically generate personalized email and message drafts based on meeting outcomes, captured business cards, and conversation context — enabling users to send follow-ups within minutes of a conference interaction.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Draft Context Assembly
#### TC-F2-U1.1: Assemble Draft Context from Meeting and Contact Data
**Objective**: Verify that `DraftContextBuilder` correctly merges meeting summary, contact record, and captured notes into a single context object for prompt injection.
**Preconditions**: Valid `MeetingSummary`, `ContactRecord`, and `CapturedNotes` objects in memory.
**Test Steps**:
1. Instantiate `DraftContextBuilder` with mock meeting summary, contact, and notes.
2. Call `builder.build()`.
3. Assert output contains `recipientName`, `recipientTitle`, `sharedTopics`, `actionItems`, and `meetingDate`.
**Expected Result**: `DraftContext` object with all five fields populated and non-empty.
**Code Sample**:
```typescript
import { DraftContextBuilder } from '../src/drafts/DraftContextBuilder';

it('assembles a DraftContext from meeting and contact data', () => {
  const builder = new DraftContextBuilder({
    meeting: mockMeetingSummary,
    contact: { name: 'Bob Chen', title: 'CTO', company: 'Acme' },
    notes: { topics: ['AI integration', 'budget timeline'] }
  });
  const ctx = builder.build();
  expect(ctx.recipientName).toBe('Bob Chen');
  expect(ctx.sharedTopics).toContain('AI integration');
  expect(ctx.actionItems.length).toBeGreaterThan(0);
});
```

#### TC-F2-U1.2: Infer Relationship Tone from Contact Familiarity Score
**Objective**: Confirm tone selection (formal/semi-formal/casual) is correctly mapped from the contact familiarity score.
**Preconditions**: Three contact records with familiarity scores 10, 45, and 85.
**Test Steps**:
1. Call `inferTone(10)` — expect `'formal'`.
2. Call `inferTone(45)` — expect `'semi-formal'`.
3. Call `inferTone(85)` — expect `'casual'`.
**Expected Result**: Each score maps to the correct tone string.
**Code Sample**:
```typescript
import { inferTone } from '../src/drafts/toneInference';

it('maps familiarity scores to correct tone levels', () => {
  expect(inferTone(10)).toBe('formal');
  expect(inferTone(45)).toBe('semi-formal');
  expect(inferTone(85)).toBe('casual');
});
```

#### TC-F2-U1.3: Build Follow-Up Prompt with Tone and Context Injected
**Objective**: Ensure the prompt template correctly injects tone instruction, recipient details, and action items.
**Preconditions**: `DraftContext` with tone `'formal'` and two action items.
**Test Steps**:
1. Call `buildFollowUpPrompt(draftContext)`.
2. Assert prompt contains `"formal"` tone instruction.
3. Assert prompt includes both action item descriptions.
4. Assert prompt instructs model to output subject line and body separately.
**Expected Result**: Prompt string references tone, action items, and output format instruction.
**Code Sample**:
```typescript
import { buildFollowUpPrompt } from '../src/drafts/promptBuilder';

it('injects tone and action items into the follow-up prompt', () => {
  const ctx = { recipientName: 'Bob Chen', tone: 'formal', actionItems: ['Send contract', 'Schedule demo'] };
  const prompt = buildFollowUpPrompt(ctx);
  expect(prompt).toContain('formal');
  expect(prompt).toContain('Send contract');
  expect(prompt).toContain('Schedule demo');
  expect(prompt).toContain('subject:');
  expect(prompt).toContain('body:');
});
```

### 1.2 Draft Generation and Parsing
#### TC-F2-U2.1: Parse Subject and Body from LLM Response
**Objective**: Verify the draft parser correctly extracts subject and body from a well-formed LLM response.
**Preconditions**: Mock LLM response with `subject:` and `body:` delimiters.
**Test Steps**:
1. Pass mock LLM response to `parseDraftResponse(response)`.
2. Assert `draft.subject` is non-empty.
3. Assert `draft.body` contains the recipient's name.
**Expected Result**: `EmailDraft` object with populated `subject` and `body` fields.
**Code Sample**:
```typescript
import { parseDraftResponse } from '../src/drafts/parser';

it('extracts subject and body from a delimited LLM response', () => {
  const response = 'subject: Following up on our AI discussion\nbody: Dear Bob, Thank you for meeting with me...';
  const draft = parseDraftResponse(response);
  expect(draft.subject).toBe('Following up on our AI discussion');
  expect(draft.body).toContain('Bob');
});
```

#### TC-F2-U2.2: Detect and Remove Placeholder Text in Draft Body
**Objective**: Confirm that any unreplaced LLM placeholder tokens (e.g., `[INSERT DATE]`) are detected and flagged before the draft is returned to the user.
**Preconditions**: Draft body containing `[INSERT DATE]` and `[COMPANY NAME]` placeholders.
**Test Steps**:
1. Call `detectPlaceholders(draftBody)`.
2. Assert returned array contains both placeholder strings.
3. Assert `hasUnresolvedPlaceholders(draftBody)` returns `true`.
**Expected Result**: Two placeholders detected; unresolved flag is `true`.
**Code Sample**:
```typescript
import { detectPlaceholders, hasUnresolvedPlaceholders } from '../src/drafts/placeholderDetector';

it('detects unreplaced placeholder tokens in the draft body', () => {
  const body = 'Looking forward to visiting [COMPANY NAME] on [INSERT DATE].';
  expect(detectPlaceholders(body)).toEqual(['[COMPANY NAME]', '[INSERT DATE]']);
  expect(hasUnresolvedPlaceholders(body)).toBe(true);
});
```

#### TC-F2-U2.3: Apply User Edits to Draft via Patch Operation
**Objective**: Verify that a user's manual edit to subject or body is applied via a diff-patch operation without overwriting other fields.
**Preconditions**: Existing `EmailDraft` in memory; user provides updated subject only.
**Test Steps**:
1. Call `applyDraftPatch(draft, { subject: 'Updated Subject Line' })`.
2. Assert `draft.subject` is updated.
3. Assert `draft.body` is unchanged.
**Expected Result**: Patched draft with updated subject and original body.
**Code Sample**:
```typescript
import { applyDraftPatch } from '../src/drafts/patchApplier';

it('applies a partial patch to a draft without overwriting other fields', () => {
  const draft = { subject: 'Old Subject', body: 'Original body text.' };
  const patched = applyDraftPatch(draft, { subject: 'Updated Subject Line' });
  expect(patched.subject).toBe('Updated Subject Line');
  expect(patched.body).toBe('Original body text.');
});
```

### 1.3 Draft Versioning and Templates
#### TC-F2-U3.1: Save Draft Creates New Version Record
**Objective**: Confirm that saving a draft creates a versioned snapshot rather than overwriting the previous draft.
**Preconditions**: Draft v1 already persisted; user edits and saves again.
**Test Steps**:
1. Save draft v1 for `contact-456`.
2. Modify subject and save again.
3. Assert `draftRepo.listVersions('contact-456')` returns 2 versions.
4. Assert v2 has a later `createdAt` timestamp.
**Expected Result**: Two distinct version records exist; v2 is newer.
**Code Sample**:
```typescript
import { DraftRepository } from '../src/db/DraftRepository';

it('creates a new version on each save rather than overwriting', async () => {
  await draftRepo.save({ contactId: 'contact-456', subject: 'v1 Subject', body: 'v1 body' });
  await draftRepo.save({ contactId: 'contact-456', subject: 'v2 Subject', body: 'v2 body' });
  const versions = await draftRepo.listVersions('contact-456');
  expect(versions).toHaveLength(2);
  expect(new Date(versions[1].createdAt) > new Date(versions[0].createdAt)).toBe(true);
});
```

#### TC-F2-U3.2: Apply Custom Email Template to Generated Draft
**Objective**: Verify that a user-defined template's header and footer are injected into the generated draft body.
**Preconditions**: Custom template with `{{BODY}}` placeholder and a branded footer.
**Test Steps**:
1. Call `applyTemplate(draft, customTemplate)`.
2. Assert draft body starts with template header text.
3. Assert draft body ends with branded footer text.
4. Assert `{{BODY}}` placeholder is replaced with original draft body.
**Expected Result**: Template-wrapped draft with header, original body, and footer.
**Code Sample**:
```typescript
import { applyTemplate } from '../src/drafts/templateEngine';

it('wraps draft body with custom template header and footer', () => {
  const template = { header: '-- ACME Corp --', footer: 'Regards, Sales Team', bodyPlaceholder: '{{BODY}}' };
  const draft = { subject: 'Hi', body: 'Let us connect.' };
  const result = applyTemplate(draft, template);
  expect(result.body.startsWith('-- ACME Corp --')).toBe(true);
  expect(result.body.endsWith('Regards, Sales Team')).toBe(true);
  expect(result.body).toContain('Let us connect.');
});
```

#### TC-F2-U3.3: List Available Templates Filtered by Industry
**Objective**: Confirm that `TemplateService.listByIndustry('technology')` returns only technology-tagged templates.
**Preconditions**: Template DB seeded with 5 templates: 2 technology, 2 finance, 1 healthcare.
**Test Steps**:
1. Call `TemplateService.listByIndustry('technology')`.
2. Assert exactly 2 templates are returned.
3. Assert all returned templates have `industry: 'technology'`.
**Expected Result**: Array of 2 technology templates.
**Code Sample**:
```typescript
it('filters templates by industry tag', async () => {
  const templates = await TemplateService.listByIndustry('technology');
  expect(templates).toHaveLength(2);
  templates.forEach(t => expect(t.industry).toBe('technology'));
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 End-to-End Draft Generation
#### TC-F2-I1.1: Generate Follow-Up Email After Meeting Completion
**Objective**: Validate the full pipeline from meeting summary to deliverable email draft for a new contact.
**Preconditions**: Meeting `meeting-007` summarized; contact `contact-789` with familiarity score 5.
**Test Steps**:
1. Call `FollowUpDraftService.generateForContact({ meetingId: 'meeting-007', contactId: 'contact-789' })`.
2. Assert returned `EmailDraft` has non-empty `subject` and `body`.
3. Assert tone in body reflects formal language (no contractions at sentence start).
4. Assert draft is persisted in DB.
**Expected Result**: Formal email draft generated and saved with correct meeting and contact references.
**Code Sample**:
```typescript
import { FollowUpDraftService } from '../src/services/FollowUpDraftService';

it('generates a formal follow-up email for a new contact', async () => {
  const draft = await FollowUpDraftService.generateForContact({
    meetingId: 'meeting-007',
    contactId: 'contact-789'
  });
  expect(draft.subject.length).toBeGreaterThan(5);
  expect(draft.body).toContain('contact-789-first-name');
  const saved = await draftRepo.findByContactId('contact-789');
  expect(saved).not.toBeNull();
}, 20000);
```

#### TC-F2-I1.2: Generate LinkedIn Message Draft After Card Capture
**Objective**: Confirm that a LinkedIn-format follow-up (<=300 chars) is generated when channel is set to `'linkedin'`.
**Preconditions**: Business card capture for contact `contact-890`; channel `'linkedin'` specified.
**Test Steps**:
1. Call `FollowUpDraftService.generateForContact({ contactId: 'contact-890', channel: 'linkedin' })`.
2. Assert `draft.body.length` <= 300.
3. Assert draft does not contain email-specific greeting patterns.
**Expected Result**: Short LinkedIn-appropriate message draft within character limit.
**Code Sample**:
```typescript
it('generates a LinkedIn message within the 300 character limit', async () => {
  const draft = await FollowUpDraftService.generateForContact({
    contactId: 'contact-890',
    channel: 'linkedin'
  });
  expect(draft.body.length).toBeLessThanOrEqual(300);
  expect(draft.body).not.toMatch(/^Dear|^Hello,/);
}, 20000);
```

### 2.2 CRM Integration for Draft Dispatch
#### TC-F2-I2.1: Push Approved Draft to Salesforce Activity Log
**Objective**: Verify that an approved email draft is pushed to Salesforce as an activity record on the contact.
**Preconditions**: Mock Salesforce connector; draft `draft-111` approved by user.
**Test Steps**:
1. Approve draft via `DraftService.approve('draft-111')`.
2. Assert Salesforce mock `createActivity` was called with draft subject and contact ID.
3. Assert activity type is `'Email'`.
**Expected Result**: Salesforce activity created with correct subject and contact reference.
**Code Sample**:
```typescript
it('pushes an approved draft to Salesforce as an email activity', async () => {
  await DraftService.approve('draft-111');
  expect(mockSalesforce.createActivity).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'Email', subject: expect.any(String), contactId: expect.any(String) })
  );
});
```

#### TC-F2-I2.2: Gmail Send Integration Dispatches Approved Draft
**Objective**: Confirm that when a user approves and sends a draft, it is dispatched via the Gmail API with correct headers.
**Preconditions**: Mock Gmail API client; draft `draft-222` with recipient `bob@example.com`.
**Test Steps**:
1. Call `DraftService.approveAndSend('draft-222')`.
2. Assert Gmail mock `send` was called with correct `to`, `subject`, and `body`.
3. Assert response status is `202`.
**Expected Result**: Email dispatched via Gmail with matching fields.
**Code Sample**:
```typescript
it('sends an approved draft via Gmail with correct headers', async () => {
  mockGmail.send.mockResolvedValue({ status: 202 });
  const response = await DraftService.approveAndSend('draft-222');
  expect(response.status).toBe(202);
  expect(mockGmail.send).toHaveBeenCalledWith(
    expect.objectContaining({ to: 'bob@example.com' })
  );
});
```

### 2.3 Batch Draft Generation
#### TC-F2-I3.1: Generate Drafts for All Contacts from a Conference Day
**Objective**: Validate that batch draft generation for all 20 contacts captured in one day completes successfully.
**Preconditions**: 20 contact records for `conference-day-2026-07-19`; meeting summaries available for each.
**Test Steps**:
1. Call `FollowUpDraftService.generateBatch({ date: '2026-07-19', conferenceId: 'conf-001' })`.
2. Assert 20 drafts are returned.
3. Assert no draft has an empty body.
**Expected Result**: 20 personalized drafts returned with non-empty bodies.
**Code Sample**:
```typescript
it('generates follow-up drafts for all contacts from a conference day', async () => {
  const drafts = await FollowUpDraftService.generateBatch({ date: '2026-07-19', conferenceId: 'conf-001' });
  expect(drafts).toHaveLength(20);
  drafts.forEach(d => expect(d.body.length).toBeGreaterThan(50));
}, 120000);
```

#### TC-F2-I3.2: Failed Draft in Batch Does Not Block Remaining Drafts
**Objective**: Confirm that if one contact's draft generation fails (e.g., missing meeting data), the rest of the batch completes successfully.
**Preconditions**: 5-contact batch where contact index 3 has no associated meeting summary.
**Test Steps**:
1. Call `FollowUpDraftService.generateBatch({ contactIds: fiveContactIds })`.
2. Assert result contains 4 successful drafts and 1 error entry.
3. Assert error entry for contact index 3 has `status: 'failed'` and a `reason` field.
**Expected Result**: 4 drafts succeed; 1 error returned without crashing the batch.
**Code Sample**:
```typescript
it('continues batch generation when one contact fails', async () => {
  const results = await FollowUpDraftService.generateBatch({ contactIds: fiveContactIds });
  const successes = results.filter(r => r.status === 'success');
  const failures = results.filter(r => r.status === 'failed');
  expect(successes).toHaveLength(4);
  expect(failures).toHaveLength(1);
  expect(failures[0].reason).toBeTruthy();
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Missing or Incomplete Contact Data
#### TC-F2-E1.1: Generate Draft When Contact Has No Last Name
**Objective**: Ensure the draft generator handles contacts with only a first name without crashing or inserting blank tokens.
**Preconditions**: Contact record with `firstName: 'Maria'` and `lastName: null`.
**Test Steps**:
1. Call `FollowUpDraftService.generateForContact({ contactId: 'contact-no-last-name' })`.
2. Assert draft body does not contain `null`, `undefined`, or empty `''` in the greeting.
3. Assert greeting uses first name only.
**Expected Result**: Draft greeting reads `"Hi Maria,"` with no null tokens.
**Code Sample**:
```typescript
it('uses first name only when last name is missing', async () => {
  const draft = await FollowUpDraftService.generateForContact({ contactId: 'contact-no-last-name' });
  expect(draft.body).not.toMatch(/null|undefined/i);
  expect(draft.body).toContain('Maria');
});
```

#### TC-F2-E1.2: Generate Draft When No Shared Topics Detected
**Objective**: Confirm draft generation still succeeds when the context builder finds no shared topics between the meeting and the contact profile.
**Preconditions**: Meeting summary with empty `sharedTopics`; contact with no tagged interests.
**Test Steps**:
1. Call `FollowUpDraftService.generateForContact({ meetingId: 'no-topics-meeting', contactId: 'generic-contact' })`.
2. Assert draft body is non-empty and generic but professional.
3. Assert draft does not contain template placeholders.
**Expected Result**: Generic professional follow-up generated without crashing.
**Code Sample**:
```typescript
it('generates a generic draft when no shared topics are found', async () => {
  const draft = await FollowUpDraftService.generateForContact({ meetingId: 'no-topics-meeting', contactId: 'generic-contact' });
  expect(draft.body.length).toBeGreaterThan(50);
  expect(hasUnresolvedPlaceholders(draft.body)).toBe(false);
});
```

### 3.2 Tone and Language Edge Cases
#### TC-F2-E2.1: Draft for Contact with Non-ASCII Name Characters
**Objective**: Verify that contacts with non-ASCII names (e.g., `José Martínez`) are handled correctly in email drafts without encoding errors.
**Preconditions**: Contact with `name: 'José Martínez'`.
**Test Steps**:
1. Generate draft for contact with accented name.
2. Assert draft body contains `José Martínez` with correct encoding.
3. Assert no `\u` escape sequences or garbled characters in output.
**Expected Result**: Name appears correctly in UTF-8 encoded draft body.
**Code Sample**:
```typescript
it('correctly encodes non-ASCII characters in the recipient name', async () => {
  const draft = await FollowUpDraftService.generateForContact({ contactId: 'contact-jose' });
  expect(draft.body).toContain('José Martínez');
  expect(draft.body).not.toMatch(/\\u00/);
});
```

#### TC-F2-E2.2: Draft Respects User Instruction to Avoid Mentioning Competitors
**Objective**: Confirm that when user sets a content guard rule to avoid competitor names, the generated draft does not mention them.
**Preconditions**: Content guard configured with blocked terms `['CompetitorX', 'CompetitorY']`.
**Test Steps**:
1. Generate draft with content guard active.
2. Assert draft body does not contain `'CompetitorX'` or `'CompetitorY'`.
3. Assert content guard scan returns clean result.
**Expected Result**: Draft is free of competitor mentions; content guard returns no violations.
**Code Sample**:
```typescript
import { applyContentGuard } from '../src/drafts/contentGuard';

it('removes competitor mentions from drafts when content guard is active', async () => {
  const draft = await FollowUpDraftService.generateForContact({ contactId: 'contact-001', guardRules: ['CompetitorX'] });
  const violations = applyContentGuard(draft.body, ['CompetitorX', 'CompetitorY']);
  expect(violations).toHaveLength(0);
  expect(draft.body).not.toContain('CompetitorX');
});
```

### 3.3 Concurrency and Rate Limiting
#### TC-F2-E3.1: Draft Generation Queued When LLM Rate Limit Hit
**Objective**: Verify that when the LLM rate limit is hit during batch generation, requests are queued and eventually fulfilled.
**Preconditions**: LLM mock returns 429 for the first 3 calls in a 10-call batch.
**Test Steps**:
1. Initiate batch of 10 drafts.
2. Assert first 3 fail with rate limit and are re-queued.
3. Assert all 10 drafts are eventually returned.
**Expected Result**: All 10 drafts generated; rate-limited requests retried without data loss.
**Code Sample**:
```typescript
it('queues and retries rate-limited draft requests', async () => {
  let calls = 0;
  mockLlmClient.complete.mockImplementation(() => {
    calls++;
    if (calls <= 3) throw Object.assign(new Error('Rate limited'), { status: 429 });
    return Promise.resolve(mockDraftResponse);
  });
  const drafts = await FollowUpDraftService.generateBatch({ contactIds: tenContactIds });
  expect(drafts.filter(d => d.status === 'success')).toHaveLength(10);
}, 60000);
```

#### TC-F2-E3.2: Concurrent Edits to Same Draft Resolve via Last-Write-Wins
**Objective**: Ensure concurrent edits to the same draft from two devices don't corrupt the draft record.
**Preconditions**: Draft `draft-concurrent` exists; two edit requests submitted simultaneously.
**Test Steps**:
1. Submit two simultaneous PATCH requests with different subject lines.
2. Assert the DB record has exactly one subject line (not merged/corrupted).
3. Assert a conflict audit log entry is created.
**Expected Result**: Last write wins; draft not corrupted; conflict logged.
**Code Sample**:
```typescript
it('resolves concurrent draft edits with last-write-wins and logs conflict', async () => {
  await Promise.all([
    draftService.edit('draft-concurrent', { subject: 'Version A' }),
    draftService.edit('draft-concurrent', { subject: 'Version B' })
  ]);
  const saved = await draftRepo.findById('draft-concurrent');
  expect(['Version A', 'Version B']).toContain(saved.subject);
  const logs = await auditLog.getConflicts('draft-concurrent');
  expect(logs.length).toBeGreaterThanOrEqual(1);
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Draft Generation Latency
#### TC-F2-P1.1: Single Draft Generated Within 5-Second SLA
**Objective**: Confirm that generating a single follow-up draft from a meeting summary completes within 5 seconds.
**Preconditions**: Staging LLM endpoint; complete meeting and contact data available.
**Test Steps**:
1. Record start time.
2. Call `FollowUpDraftService.generateForContact`.
3. Assert elapsed time < 5,000ms.
**Expected Result**: Draft generated in under 5 seconds.
**Code Sample**:
```typescript
it('generates a single follow-up draft within 5 seconds', async () => {
  const start = Date.now();
  await FollowUpDraftService.generateForContact({ meetingId: 'perf-meet-001', contactId: 'perf-contact-001' });
  expect(Date.now() - start).toBeLessThan(5000);
}, 10000);
```

#### TC-F2-P1.2: Batch of 20 Drafts Completes Within 60-Second SLA
**Objective**: Validate that end-of-day batch draft generation for 20 contacts completes within 60 seconds.
**Preconditions**: 20 contact records with complete meeting data; parallel draft generation enabled (concurrency: 5).
**Test Steps**:
1. Measure wall-clock time for `FollowUpDraftService.generateBatch` with 20 contacts.
2. Assert elapsed time < 60,000ms.
3. Assert all 20 drafts are successful.
**Expected Result**: Batch of 20 completes in under 60 seconds.
**Code Sample**:
```typescript
it('generates 20 drafts in parallel within 60 seconds', async () => {
  const start = Date.now();
  const results = await FollowUpDraftService.generateBatch({ contactIds: twentyContactIds });
  expect(Date.now() - start).toBeLessThan(60000);
  expect(results.filter(r => r.status === 'success')).toHaveLength(20);
}, 65000);
```

### 4.2 Template Rendering Performance
#### TC-F2-P2.1: Template Engine Renders 1000 Drafts per Second
**Objective**: Verify the template engine can render at least 1,000 draft bodies per second when used in bulk export scenarios.
**Preconditions**: Standard email template; 10,000 draft contexts in memory.
**Test Steps**:
1. Render 10,000 drafts using `applyTemplate` in a tight loop.
2. Assert total time < 10,000ms (i.e., >= 1,000 ops/sec).
**Expected Result**: Template rendering throughput >= 1,000 drafts/sec.
**Code Sample**:
```typescript
it('renders 10000 draft templates in under 10 seconds', () => {
  const start = Date.now();
  for (let i = 0; i < 10000; i++) {
    applyTemplate({ subject: `Draft ${i}`, body: `Hello contact ${i}` }, standardTemplate);
  }
  expect(Date.now() - start).toBeLessThan(10000);
});
```

#### TC-F2-P2.2: Draft Retrieval by Contact ID Returns Within 100ms
**Objective**: Ensure the DB query for all drafts associated with a contact returns within 100ms even with 10,000 draft records.
**Preconditions**: Test DB seeded with 10,000 draft records; indexes on `contactId`.
**Test Steps**:
1. Call `draftRepo.findByContactId('high-volume-contact')`.
2. Assert response time < 100ms.
**Expected Result**: Query executes in under 100ms.
**Code Sample**:
```typescript
it('retrieves all drafts for a contact within 100ms', async () => {
  const start = Date.now();
  await draftRepo.findByContactId('high-volume-contact');
  expect(Date.now() - start).toBeLessThan(100);
});
```

### 4.3 Memory and Prompt Efficiency
#### TC-F2-P3.1: Draft Prompt Stays Within 4000-Token Budget
**Objective**: Ensure the follow-up draft prompt (context + instructions) does not exceed 4,000 tokens.
**Preconditions**: Verbose meeting summary and contact profile; token counter utility.
**Test Steps**:
1. Build draft context and generate prompt.
2. Count tokens via `countTokens(prompt)`.
3. Assert count <= 4,000.
**Expected Result**: Prompt token count within the 4,000-token budget.
**Code Sample**:
```typescript
import { countTokens } from '../src/utils/tokenCounter';

it('keeps the follow-up draft prompt within the 4000-token budget', () => {
  const prompt = buildFollowUpPrompt(verboseDraftContext);
  expect(countTokens(prompt)).toBeLessThanOrEqual(4000);
});
```

#### TC-F2-P3.2: Memory Footprint of 100-Draft Batch Does Not Exceed 256MB
**Objective**: Confirm that holding 100 draft contexts in memory simultaneously does not exceed the 256MB memory budget.
**Preconditions**: Node.js process with memory tracking; 100 draft contexts loaded.
**Test Steps**:
1. Record heap usage before loading contexts.
2. Load 100 draft contexts into memory.
3. Assert heap increase < 256MB.
**Expected Result**: Memory delta < 256MB for 100 concurrent draft contexts.
**Code Sample**:
```typescript
it('batch of 100 draft contexts stays within 256MB memory budget', () => {
  const before = process.memoryUsage().heapUsed;
  const contexts = Array.from({ length: 100 }, (_, i) => buildDraftContext(i));
  const after = process.memoryUsage().heapUsed;
  const deltaMB = (after - before) / 1024 / 1024;
  expect(deltaMB).toBeLessThan(256);
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

**Estimated execution time**: Unit: ~30s | Integration: ~4min | Edge: ~2min | Performance: ~3min
**Test environment**: Node.js 20+, Jest, TypeScript, PostgreSQL 15, staging LLM endpoint, mock Gmail/Salesforce connectors
