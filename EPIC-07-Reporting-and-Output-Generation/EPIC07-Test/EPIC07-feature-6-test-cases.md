# EPIC07 Feature 6 — Action Item Extraction — Test Cases

## Test Overview
Comprehensive test suite for Action Item Extraction covering unit tests, integration tests, edge cases, and performance validation. Action Item Extraction uses NLP pipelines to identify committed tasks, owners, and due dates from meeting transcripts — turning verbal commitments into structured, trackable work items.

---

## 1. UNIT TEST SCENARIOS

### 1.1 NLP Extraction Primitives
#### TC-F6-U1.1: Identify Action Verb Patterns in Transcript Text
**Objective**: Verify that the action verb detector identifies commitment patterns (`"will send"`, `"going to prepare"`, `"I'll follow up"`) and tags them as action item candidates.
**Preconditions**: Sentence array containing both action and non-action sentences.
**Test Steps**:
1. Call `detectActionVerbs(sentences)`.
2. Assert sentences with commitment verbs are returned.
3. Assert non-action sentences (observations, questions) are excluded.
**Expected Result**: Only commitment-pattern sentences flagged.
**Code Sample**:
```typescript
import { detectActionVerbs } from '../src/actions/verbDetector';

it('identifies commitment verb patterns and excludes non-action sentences', () => {
  const sentences = [
    'I will send the proposal by Friday.',        // action
    'The weather has been great this week.',       // non-action
    "Alice is going to prepare the budget doc.",   // action
    'What time does the session start?'            // question
  ];
  const actions = detectActionVerbs(sentences);
  expect(actions).toHaveLength(2);
  expect(actions[0]).toContain('proposal');
  expect(actions[1]).toContain('budget');
});
```

#### TC-F6-U1.2: Extract Owner Name from Action Sentence
**Objective**: Confirm the owner extractor correctly identifies the subject of the action sentence as the task owner.
**Preconditions**: Sentences with explicit named subjects.
**Test Steps**:
1. Call `extractOwner('Bob will send the contract to the legal team.')`.
2. Assert `owner === 'Bob'`.
3. Call `extractOwner('I will schedule the demo.')` — assert `owner === 'speaker'` (first-person placeholder).
**Expected Result**: Named owner extracted; first-person mapped to `'speaker'`.
**Code Sample**:
```typescript
import { extractOwner } from '../src/actions/ownerExtractor';

it('extracts the named owner from an action sentence', () => {
  expect(extractOwner('Bob will send the contract to the legal team.')).toBe('Bob');
  expect(extractOwner('I will schedule the demo.')).toBe('speaker');
});
```

#### TC-F6-U1.3: Parse Due Date Expressions into ISO Dates
**Objective**: Verify that relative date expressions (`"by Friday"`, `"next week"`, `"end of month"`) are correctly resolved to ISO date strings relative to the meeting date.
**Preconditions**: Meeting date `2026-07-19` (Sunday); locale `en-US`.
**Test Steps**:
1. Parse `'by Friday'` → assert `'2026-07-24'`.
2. Parse `'next week'` → assert `'2026-07-26'` (next Monday).
3. Parse `'end of month'` → assert `'2026-07-31'`.
**Expected Result**: Relative expressions resolved to correct ISO dates.
**Code Sample**:
```typescript
import { parseDueDate } from '../src/actions/dueDateParser';

it('resolves relative due date expressions to ISO dates', () => {
  const baseDate = '2026-07-19';
  expect(parseDueDate('by Friday', baseDate)).toBe('2026-07-24');
  expect(parseDueDate('next week', baseDate)).toBe('2026-07-26');
  expect(parseDueDate('end of month', baseDate)).toBe('2026-07-31');
});
```

### 1.2 Action Item Structuring
#### TC-F6-U2.1: Build Structured ActionItem from Extracted Components
**Objective**: Confirm that extracted components (task description, owner, due date) are assembled into a valid `ActionItem` object with the correct schema.
**Preconditions**: Extracted sentence, owner, and due date available.
**Test Steps**:
1. Call `buildActionItem({ sentence: 'Bob will send the contract.', owner: 'Bob', dueDate: '2026-07-24' })`.
2. Assert result has `id`, `task`, `owner`, `dueDate`, `status: 'pending'`, `sourceText`.
**Expected Result**: Complete `ActionItem` with all required fields.
**Code Sample**:
```typescript
import { buildActionItem } from '../src/actions/actionItemBuilder';

it('builds a structured ActionItem from extracted components', () => {
  const item = buildActionItem({ sentence: 'Bob will send the contract.', owner: 'Bob', dueDate: '2026-07-24' });
  expect(item.id).toBeTruthy();
  expect(item.task).toContain('contract');
  expect(item.owner).toBe('Bob');
  expect(item.dueDate).toBe('2026-07-24');
  expect(item.status).toBe('pending');
  expect(item.sourceText).toBe('Bob will send the contract.');
});
```

#### TC-F6-U2.2: Assign Priority Based on Action Item Keywords
**Objective**: Ensure priority scoring assigns `'high'` to items with urgency keywords (`"ASAP"`, `"urgent"`, `"today"`) and `'normal'` otherwise.
**Preconditions**: Two action items — one with `"urgent"` keyword, one without.
**Test Steps**:
1. Assign priority to `"Urgently fix the integration issue"` → assert `'high'`.
2. Assign priority to `"Send the weekly report"` → assert `'normal'`.
**Expected Result**: `'high'` for urgent items; `'normal'` for standard items.
**Code Sample**:
```typescript
import { assignPriority } from '../src/actions/priorityAssigner';

it('assigns high priority to action items with urgency keywords', () => {
  expect(assignPriority('Urgently fix the integration issue')).toBe('high');
  expect(assignPriority('Send the weekly report')).toBe('normal');
});
```

#### TC-F6-U2.3: Deduplicate Action Items with Near-Identical Text
**Objective**: Verify that action items with semantically equivalent text (same task, same owner) across two meetings are deduplicated into a single item.
**Preconditions**: Two action items with 92% text similarity for the same owner.
**Test Steps**:
1. Call `deduplicateActionItems([item1, item2])` where items differ only by minor wording.
2. Assert result contains only one item.
3. Assert merged item references both source meeting IDs.
**Expected Result**: Single deduplicated item; both meeting sources recorded.
**Code Sample**:
```typescript
import { deduplicateActionItems } from '../src/actions/deduplicator';

it('deduplicates near-identical action items across meetings', () => {
  const items = [
    { task: 'Send contract to Alice', owner: 'Bob', meetingId: 'meeting-A', similarity: 1.0 },
    { task: 'Send the contract to Alice', owner: 'Bob', meetingId: 'meeting-B', similarity: 0.92 }
  ];
  const deduped = deduplicateActionItems(items, { threshold: 0.9 });
  expect(deduped).toHaveLength(1);
  expect(deduped[0].sourceMeetings).toEqual(expect.arrayContaining(['meeting-A', 'meeting-B']));
});
```

### 1.3 Action Item Lifecycle
#### TC-F6-U3.1: Mark Action Item as Complete Updates Status and Timestamp
**Objective**: Confirm that marking an action item complete transitions its status and sets `completedAt`.
**Preconditions**: Action item `item-001` in `'pending'` status.
**Test Steps**:
1. Call `actionItemRepo.markComplete('item-001')`.
2. Assert `item.status === 'completed'`.
3. Assert `item.completedAt` is a valid ISO timestamp.
**Expected Result**: Status changed to `'completed'`; `completedAt` set.
**Code Sample**:
```typescript
import { ActionItemRepository } from '../src/db/ActionItemRepository';

it('marks an action item as complete with timestamp', async () => {
  await actionItemRepo.markComplete('item-001');
  const item = await actionItemRepo.findById('item-001');
  expect(item.status).toBe('completed');
  expect(new Date(item.completedAt).getTime()).toBeCloseTo(Date.now(), -3);
});
```

#### TC-F6-U3.2: Overdue Action Items Flagged Automatically
**Objective**: Ensure the overdue detector flags action items whose `dueDate` has passed without `completedAt` being set.
**Preconditions**: Action item with `dueDate: '2026-07-10'` (in the past); no `completedAt`.
**Test Steps**:
1. Call `detectOverdueItems([item])` with today `2026-07-19`.
2. Assert item is returned in the overdue list.
3. Assert `item.overdue === true`.
**Expected Result**: Item correctly flagged as overdue.
**Code Sample**:
```typescript
import { detectOverdueItems } from '../src/actions/overdueDetector';

it('flags past-due items without completion as overdue', () => {
  const item = { dueDate: '2026-07-10', completedAt: null };
  const overdue = detectOverdueItems([item], { today: '2026-07-19' });
  expect(overdue).toHaveLength(1);
  expect(overdue[0].overdue).toBe(true);
});
```

#### TC-F6-U3.3: Reassign Action Item Owner Updates Audit Trail
**Objective**: Verify that reassigning an action item to a new owner creates an audit trail entry with old and new owner names.
**Preconditions**: Action item `item-002` owned by `'Bob'`; reassigned to `'Carol'`.
**Test Steps**:
1. Call `actionItemService.reassign('item-002', { newOwner: 'Carol', reason: 'Bob is on leave' })`.
2. Assert item owner is now `'Carol'`.
3. Assert audit log entry has `previousOwner: 'Bob'`, `newOwner: 'Carol'`, and `reason`.
**Expected Result**: Owner updated; audit trail entry created.
**Code Sample**:
```typescript
it('creates an audit trail entry when an action item is reassigned', async () => {
  await actionItemService.reassign('item-002', { newOwner: 'Carol', reason: 'Bob is on leave' });
  const item = await actionItemRepo.findById('item-002');
  expect(item.owner).toBe('Carol');
  const audit = await auditRepo.findByItemId('item-002');
  expect(audit[0].previousOwner).toBe('Bob');
  expect(audit[0].newOwner).toBe('Carol');
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Full Extraction Pipeline
#### TC-F6-I1.1: Extract Action Items from a Real Meeting Transcript
**Objective**: Validate the complete extraction pipeline from raw transcript to persisted action items.
**Preconditions**: Meeting `meeting-actions-001` with transcript containing 4 clear action commitments.
**Test Steps**:
1. Call `ActionItemService.extractFromMeeting('meeting-actions-001')`.
2. Assert at least 4 action items returned.
3. Assert each item has `task`, `owner`, and `status: 'pending'`.
4. Assert items persisted in DB.
**Expected Result**: 4+ structured action items extracted and stored.
**Code Sample**:
```typescript
import { ActionItemService } from '../src/services/ActionItemService';

it('extracts and stores action items from a meeting transcript', async () => {
  const items = await ActionItemService.extractFromMeeting('meeting-actions-001');
  expect(items.length).toBeGreaterThanOrEqual(4);
  items.forEach(item => {
    expect(item.task.length).toBeGreaterThan(5);
    expect(item.owner).toBeTruthy();
    expect(item.status).toBe('pending');
  });
  const stored = await actionItemRepo.findByMeetingId('meeting-actions-001');
  expect(stored.length).toBeGreaterThanOrEqual(4);
}, 20000);
```

#### TC-F6-I1.2: LLM-Assisted Extraction Identifies Implicit Action Items
**Objective**: Confirm that the LLM extraction pass identifies implicit commitments that the NLP pattern matcher misses.
**Preconditions**: Transcript with implicit commitment: `"Let's make sure the design doc is ready before next week's call."` (no `'will'` verb).
**Test Steps**:
1. Run NLP-only extraction → assert 0 items (no explicit action verb).
2. Run LLM-assisted extraction → assert at least 1 item detected.
3. Assert item task references `'design doc'`.
**Expected Result**: LLM pass catches implicit commitment missed by NLP.
**Code Sample**:
```typescript
it('LLM extraction catches implicit commitments missed by NLP patterns', async () => {
  const transcript = "Let's make sure the design doc is ready before next week's call.";
  const nlpOnly = await ActionItemService.extractNlpOnly(transcript);
  const withLlm = await ActionItemService.extractWithLLM(transcript);
  expect(nlpOnly).toHaveLength(0);
  expect(withLlm.length).toBeGreaterThanOrEqual(1);
  expect(withLlm[0].task).toMatch(/design doc/i);
}, 15000);
```

### 2.2 Task Management Integration
#### TC-F6-I2.1: Sync Extracted Action Items to Jira as Tasks
**Objective**: Verify that extracted action items are synced to Jira as tasks in the configured project.
**Preconditions**: Mock Jira connector; `ActionItem` objects with owner mapping to Jira usernames.
**Test Steps**:
1. Extract 3 action items from `meeting-jira-001`.
2. Call `ActionItemSyncService.syncToJira('meeting-jira-001')`.
3. Assert Jira mock `createIssue` called 3 times.
4. Assert each issue has `issuetype: 'Task'` and correct assignee.
**Expected Result**: 3 Jira tasks created with correct attributes.
**Code Sample**:
```typescript
it('syncs extracted action items to Jira as task issues', async () => {
  await ActionItemService.extractFromMeeting('meeting-jira-001');
  await ActionItemSyncService.syncToJira('meeting-jira-001');
  expect(mockJira.createIssue).toHaveBeenCalledTimes(3);
  expect(mockJira.createIssue).toHaveBeenCalledWith(
    expect.objectContaining({ fields: expect.objectContaining({ issuetype: { name: 'Task' } }) })
  );
});
```

#### TC-F6-I2.2: Completed Jira Task Reflects Back as Completed in App
**Objective**: Confirm that when a Jira task linked to an action item is marked done, the webhook from Jira updates the item's status in the app.
**Preconditions**: Action item `item-jira-007` linked to Jira issue `PROJ-42`; Jira sends `issue.status.done` webhook.
**Test Steps**:
1. Simulate Jira `issue.status.done` webhook payload for `PROJ-42`.
2. Assert `actionItemRepo.findById('item-jira-007').status === 'completed'`.
**Expected Result**: App action item marked complete on Jira webhook receipt.
**Code Sample**:
```typescript
it('marks an action item complete when its Jira task is done', async () => {
  await webhookController.handleJira({ issueKey: 'PROJ-42', status: 'Done' });
  const item = await actionItemRepo.findById('item-jira-007');
  expect(item.status).toBe('completed');
});
```

### 2.3 Reminder and Notification Integration
#### TC-F6-I3.1: Send Reminder Notification 24 Hours Before Due Date
**Objective**: Validate that reminder notifications are sent to action item owners 24 hours before the due date.
**Preconditions**: Action item due `2026-07-20`; current time simulated to `2026-07-19 10:00`.
**Test Steps**:
1. Run reminder scheduler check.
2. Assert push notification sent to owner.
3. Assert notification contains task description and due date.
**Expected Result**: Reminder sent 24 hours before due; correct content.
**Code Sample**:
```typescript
it('sends a 24-hour reminder notification before an action item due date', async () => {
  await reminderScheduler.run({ now: new Date('2026-07-19T10:00:00Z') });
  expect(mockPush.send).toHaveBeenCalledWith(
    expect.objectContaining({ body: expect.stringContaining('due tomorrow') })
  );
});
```

#### TC-F6-I3.2: Overdue Notification Sent Every Morning Until Item Completed
**Objective**: Confirm that overdue items generate a daily morning notification until they are marked complete.
**Preconditions**: Overdue item `item-overdue-001`; morning scheduler runs at `08:00`.
**Test Steps**:
1. Run morning scheduler on day 1 → assert notification sent.
2. Run morning scheduler on day 2 (item still pending) → assert second notification sent.
3. Mark item complete; run scheduler on day 3 → assert no notification sent.
**Expected Result**: Daily notifications until completion; silent after completion.
**Code Sample**:
```typescript
it('sends daily overdue notifications until the action item is completed', async () => {
  await morningScheduler.run({ day: 1 });
  await morningScheduler.run({ day: 2 });
  expect(mockPush.send).toHaveBeenCalledTimes(2);
  await actionItemRepo.markComplete('item-overdue-001');
  await morningScheduler.run({ day: 3 });
  expect(mockPush.send).toHaveBeenCalledTimes(2); // no new call
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Ambiguous Ownership
#### TC-F6-E1.1: Action Item Without Explicit Owner Assigned to Meeting Organizer
**Objective**: Confirm that when no owner can be identified from the sentence, the action item is assigned to the meeting organizer.
**Preconditions**: Meeting `meeting-no-owner` with organizer `alice@example.com`; transcript sentence with no named subject.
**Test Steps**:
1. Extract from sentence `"The proposal needs to be sent this week."` (passive voice, no owner).
2. Assert `item.owner === 'alice@example.com'` (meeting organizer fallback).
3. Assert `item.ownerSource === 'fallback'`.
**Expected Result**: Action item assigned to organizer; `ownerSource: 'fallback'` flagged.
**Code Sample**:
```typescript
it('falls back to meeting organizer for action items with no explicit owner', async () => {
  const items = await ActionItemService.extractFromMeeting('meeting-no-owner');
  const passiveItem = items.find(i => i.sourceText.includes('proposal'));
  expect(passiveItem?.owner).toBe('alice@example.com');
  expect(passiveItem?.ownerSource).toBe('fallback');
});
```

#### TC-F6-E1.2: Multiple Owners in Single Sentence Generates Multiple Action Items
**Objective**: Verify that a sentence with two subjects (`"Bob and Carol will both review the contract"`) generates two separate action items.
**Preconditions**: Sentence with compound subject.
**Test Steps**:
1. Extract action items from the compound sentence.
2. Assert two items are returned: one for `'Bob'` and one for `'Carol'`.
3. Assert both items have identical task descriptions.
**Expected Result**: Two items generated for compound owner sentence.
**Code Sample**:
```typescript
it('creates separate action items for compound subjects in a sentence', () => {
  const sentence = 'Bob and Carol will both review the contract.';
  const items = extractActionItemsFromSentence(sentence);
  expect(items).toHaveLength(2);
  expect(items.map(i => i.owner)).toEqual(expect.arrayContaining(['Bob', 'Carol']));
  expect(items[0].task).toBe(items[1].task);
});
```

### 3.2 Extraction Quality Edge Cases
#### TC-F6-E2.1: Social Commitments Not Extracted as Action Items
**Objective**: Ensure casual social commitments (`"We should grab lunch!"`, `"Let's stay in touch."`) are not extracted as trackable action items.
**Preconditions**: Transcript containing social pleasantries.
**Test Steps**:
1. Extract from `"We should grab lunch sometime!"` and `"Let's catch up soon."`.
2. Assert no action items extracted.
**Expected Result**: Social pleasantries correctly excluded from action items.
**Code Sample**:
```typescript
it('excludes social pleasantries from action item extraction', () => {
  const social = ['We should grab lunch sometime!', "Let's catch up soon."];
  social.forEach(s => {
    const items = extractActionItemsFromSentence(s);
    expect(items).toHaveLength(0);
  });
});
```

#### TC-F6-E2.2: Negated Commitments Not Extracted as Action Items
**Objective**: Confirm that negated commitment patterns (`"I won't be sending that"`, `"We are NOT going to proceed"`) are not extracted as action items.
**Preconditions**: Sentences with negated action verbs.
**Test Steps**:
1. Extract from negated commitment sentences.
2. Assert no action items returned.
**Expected Result**: Negated patterns produce zero action items.
**Code Sample**:
```typescript
it('does not extract negated commitment patterns as action items', () => {
  const negated = ["I won't be sending that report.", 'We are NOT going to proceed with the demo.'];
  negated.forEach(s => {
    expect(extractActionItemsFromSentence(s)).toHaveLength(0);
  });
});
```

### 3.3 Due Date Edge Cases
#### TC-F6-E3.1: Action Item Without Extractable Due Date Gets Null dueDate
**Objective**: Confirm that action items with no time reference get `dueDate: null` rather than a guessed or defaulted date.
**Preconditions**: Sentence `"Bob will send the proposal."` with no date reference.
**Test Steps**:
1. Extract action item.
2. Assert `item.dueDate === null`.
3. Assert `item.dueDateConfidence === 'none'`.
**Expected Result**: `dueDate` is null; no date fabricated.
**Code Sample**:
```typescript
it('sets dueDate to null when no date can be extracted', () => {
  const items = extractActionItemsFromSentence('Bob will send the proposal.');
  expect(items[0].dueDate).toBeNull();
  expect(items[0].dueDateConfidence).toBe('none');
});
```

#### TC-F6-E3.2: Ambiguous Date Reference Flagged with Low Confidence
**Objective**: Verify that vague date expressions (`"soon"`, `"eventually"`, `"at some point"`) generate a due date with `confidence: 'low'`.
**Preconditions**: Sentence with `"soon"` as the time reference.
**Test Steps**:
1. Parse `'soon'` relative to meeting date.
2. Assert `dueDateConfidence === 'low'`.
3. Assert `dueDate` is set to 7 days after meeting (default vague future).
**Expected Result**: Date estimated with low confidence; 7-day default applied.
**Code Sample**:
```typescript
it('flags ambiguous date references with low confidence', () => {
  const result = parseDueDate('soon', '2026-07-19');
  expect(result.confidence).toBe('low');
  expect(result.date).toBe('2026-07-26'); // 7-day default
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Extraction Speed
#### TC-F6-P1.1: Extract Action Items from 1-Hour Transcript Under 3 Seconds (NLP Only)
**Objective**: Confirm NLP-only action item extraction from a 1-hour transcript completes within 3 seconds.
**Preconditions**: 1-hour transcript (~16,000 words); NLP pipeline only (no LLM).
**Test Steps**:
1. Measure time for `ActionItemService.extractNlpOnly(oneHourTranscript)`.
2. Assert elapsed < 3,000ms.
**Expected Result**: NLP extraction under 3 seconds.
**Code Sample**:
```typescript
it('extracts action items from a 1-hour transcript in under 3 seconds (NLP only)', () => {
  const start = Date.now();
  ActionItemService.extractNlpOnly(oneHourTranscript);
  expect(Date.now() - start).toBeLessThan(3000);
});
```

#### TC-F6-P1.2: Full LLM-Assisted Extraction for 30-Minute Meeting Under 10 Seconds
**Objective**: Validate that the combined NLP + LLM extraction pipeline for a 30-minute meeting completes within 10 seconds.
**Preconditions**: 30-minute transcript; staging LLM endpoint.
**Test Steps**:
1. Measure wall-clock time for `ActionItemService.extractWithLLM(thirtyMinTranscript)`.
2. Assert elapsed < 10,000ms.
**Expected Result**: Full extraction under 10 seconds.
**Code Sample**:
```typescript
it('completes full LLM-assisted extraction for a 30-min meeting in under 10 seconds', async () => {
  const start = Date.now();
  await ActionItemService.extractWithLLM(thirtyMinTranscript);
  expect(Date.now() - start).toBeLessThan(10000);
}, 15000);
```

### 4.2 Throughput Under Load
#### TC-F6-P2.1: Process 100 Meeting Transcripts in Batch Under 5 Minutes
**Objective**: Confirm that batch action item extraction for 100 meetings (end-of-conference run) completes within 5 minutes.
**Preconditions**: 100 meeting transcripts averaging 20 minutes each; concurrency 10.
**Test Steps**:
1. Call `ActionItemService.batchExtract(hundredMeetingIds)`.
2. Assert total time < 300,000ms.
3. Assert no extraction errors.
**Expected Result**: 100 meetings processed in under 5 minutes.
**Code Sample**:
```typescript
it('batch-processes 100 meetings for action items within 5 minutes', async () => {
  const start = Date.now();
  const results = await ActionItemService.batchExtract(hundredMeetingIds);
  expect(Date.now() - start).toBeLessThan(300000);
  expect(results.errors).toHaveLength(0);
}, 310000);
```

#### TC-F6-P2.2: Action Item Query by Owner Returns Within 50ms
**Objective**: Ensure querying all pending action items for a specific owner returns within 50ms even with 5,000 items in the DB.
**Preconditions**: DB seeded with 5,000 action items; index on `owner` and `status`.
**Test Steps**:
1. Query `actionItemRepo.findPendingByOwner('alice@example.com')`.
2. Assert elapsed < 50ms.
**Expected Result**: Query returns in under 50ms.
**Code Sample**:
```typescript
it('queries pending action items by owner in under 50ms', async () => {
  const start = Date.now();
  await actionItemRepo.findPendingByOwner('alice@example.com');
  expect(Date.now() - start).toBeLessThan(50);
});
```

### 4.3 Deduplication Performance
#### TC-F6-P3.1: Deduplicate 500 Action Items in Under 2 Seconds
**Objective**: Confirm the similarity-based deduplication algorithm handles 500 action items in under 2 seconds.
**Preconditions**: 500 action items with ~20% expected duplicates.
**Test Steps**:
1. Call `deduplicateActionItems(fiveHundredItems, { threshold: 0.9 })`.
2. Assert elapsed < 2,000ms.
3. Assert ~100 duplicates removed.
**Expected Result**: Deduplication in under 2 seconds; correct dedup count.
**Code Sample**:
```typescript
it('deduplicates 500 action items in under 2 seconds', () => {
  const start = Date.now();
  const result = deduplicateActionItems(fiveHundredItems, { threshold: 0.9 });
  expect(Date.now() - start).toBeLessThan(2000);
  expect(result.length).toBeLessThan(fiveHundredItems.length);
});
```

#### TC-F6-P3.2: Reminder Scheduler Processes 1000 Items in Under 1 Second
**Objective**: Validate that the daily reminder scheduler can evaluate 1,000 action items for due-date proximity in under 1 second.
**Preconditions**: 1,000 action items in DB with varying due dates.
**Test Steps**:
1. Run `reminderScheduler.evaluate({ now: new Date() })`.
2. Assert elapsed < 1,000ms.
**Expected Result**: Scheduler evaluation under 1 second for 1,000 items.
**Code Sample**:
```typescript
it('evaluates 1000 action items for reminders in under 1 second', async () => {
  const start = Date.now();
  await reminderScheduler.evaluate({ now: new Date('2026-07-19T08:00:00Z') });
  expect(Date.now() - start).toBeLessThan(1000);
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

**Estimated execution time**: Unit: ~25s | Integration: ~5min | Edge: ~1min | Performance: ~8min
**Test environment**: Node.js 20+, Jest, TypeScript, PostgreSQL 15, staging LLM endpoint, mock Jira/push notification services
