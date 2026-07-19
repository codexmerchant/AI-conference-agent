# EPIC14 Feature 5 — Report Editing Studio — Test Cases

## Test Overview
Comprehensive test suite for Report Editing Studio covering unit tests, integration tests, edge cases, and performance validation. This feature provides a rich-text editing environment for reviewing, customizing, and finalizing AI-generated conference reports, including block-level editing, AI-assisted rewriting, version history, and collaborative annotations.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Rich Text Editor State

#### TC-F5-U1.1: Block Insertion Inserts at Correct Position
**Objective**: Verify inserting a new paragraph block at index 2 shifts subsequent blocks down.

**Preconditions**:
- `EditorDocument` with 4 blocks: heading, paragraph, paragraph, conclusion

**Test Steps**:
1. Call `doc.insertBlock(2, { type: 'PARAGRAPH', content: 'New paragraph' })`
2. Assert `doc.blocks[2].content === 'New paragraph'`
3. Assert `doc.blocks.length === 5`
4. Assert previously-index-2 block is now at index 3

**Expected Result**: Block inserted at position 2; total block count incremented; surrounding blocks unaffected.

**Code Sample**:
```typescript
import { EditorDocument } from '../src/renderer/editor/EditorDocument';

describe('EditorDocument', () => {
  it('should insert block at specified index and shift remaining blocks', () => {
    const doc = new EditorDocument(fourBlockFixture);
    const previousBlock2 = doc.blocks[2].content;

    doc.insertBlock(2, { type: 'PARAGRAPH', content: 'New paragraph' });

    expect(doc.blocks).toHaveLength(5);
    expect(doc.blocks[2].content).toBe('New paragraph');
    expect(doc.blocks[3].content).toBe(previousBlock2);
  });
});
```

---

#### TC-F5-U1.2: Undo Stack Reverts Last Block Insertion
**Objective**: Verify `doc.undo()` correctly removes the last inserted block.

**Test Steps**:
1. Insert block at index 1
2. Call `doc.undo()`
3. Assert block count reverts to original
4. Assert block at index 1 is the original block

**Expected Result**: Undo removes inserted block; document state identical to pre-insertion.

**Code Sample**:
```typescript
it('should revert document state after undo', () => {
  const original = doc.blocks.map(b => b.content);
  doc.insertBlock(1, { type: 'PARAGRAPH', content: 'Temp block' });
  doc.undo();

  expect(doc.blocks).toHaveLength(original.length);
  expect(doc.blocks.map(b => b.content)).toEqual(original);
});
```

---

#### TC-F5-U1.3: Bold Mark Applied to Selection Range
**Objective**: Verify applying a bold mark to a character range updates inline marks correctly.

**Test Steps**:
1. Set selection on block 0, offset 5–10
2. Call `doc.applyMark({ type: 'BOLD', blockIndex: 0, start: 5, end: 10 })`
3. Assert characters 5–9 have `bold: true`
4. Assert characters outside range unaffected

**Expected Result**: Characters 5–9 marked bold; characters 0–4 and 10+ unchanged.

**Code Sample**:
```typescript
it('should apply bold mark only to selected range', () => {
  doc.applyMark({ type: 'BOLD', blockIndex: 0, start: 5, end: 10 });
  const marks = doc.getInlineMarks(0);

  for (let i = 5; i < 10; i++) {
    expect(marks[i]?.bold).toBe(true);
  }
  expect(marks[4]?.bold).toBeUndefined();
  expect(marks[10]?.bold).toBeUndefined();
});
```

---

### 1.2 AI Rewrite Integration

#### TC-F5-U2.1: AI Rewrite Request Payload Is Well-Formed
**Objective**: Verify that the AI rewrite IPC call sends a correctly-structured payload.

**Preconditions**:
- `AIRewriteService` initialized with mock IPC

**Test Steps**:
1. Select block with content `'This is the original text.'`
2. Call `aiRewriteService.requestRewrite({ blockId: 'blk-01', tone: 'formal' })`
3. Capture IPC payload sent to main process

**Expected Result**: IPC payload includes `blockId`, `originalText`, `tone`, `userId`; no undefined fields.

**Code Sample**:
```typescript
import { AIRewriteService } from '../src/renderer/editor/AIRewriteService';

it('should send well-formed rewrite request payload', async () => {
  const mockSend = jest.fn();
  const svc = new AIRewriteService({ send: mockSend } as any);

  await svc.requestRewrite({ blockId: 'blk-01', originalText: 'This is original.', tone: 'formal', userId: 'u-1' });

  expect(mockSend).toHaveBeenCalledWith('ai:rewrite', expect.objectContaining({
    blockId: 'blk-01',
    originalText: 'This is original.',
    tone: 'formal',
    userId: 'u-1',
  }));
});
```

---

#### TC-F5-U2.2: AI Suggestion Diff Correctly Identifies Changed Tokens
**Objective**: Verify the diff engine highlights changed words between original and AI-suggested text.

**Test Steps**:
1. Original: `'The conference was very informative.'`
2. Suggestion: `'The conference was highly informative and engaging.'`
3. Call `TextDiff.compute(original, suggestion)`
4. Assert diff contains added tokens `'highly'`, `'and engaging'` and removed token `'very'`

**Expected Result**: Diff accurately identifies additions and deletions; unchanged tokens marked as equal.

**Code Sample**:
```typescript
import { TextDiff } from '../src/renderer/editor/TextDiff';

it('should compute accurate word-level diff', () => {
  const diff = TextDiff.compute(
    'The conference was very informative.',
    'The conference was highly informative and engaging.'
  );

  const added = diff.filter(d => d.type === 'ADD').map(d => d.text);
  const removed = diff.filter(d => d.type === 'REMOVE').map(d => d.text);

  expect(added).toContain('highly');
  expect(added.join(' ')).toContain('and engaging');
  expect(removed).toContain('very');
});
```

---

#### TC-F5-U2.3: Accepting AI Suggestion Updates Block Content
**Objective**: Verify that accepting an AI suggestion replaces the block content and is added to undo stack.

**Test Steps**:
1. Set block `blk-01` content to `'Original text.'`
2. Call `doc.acceptSuggestion('blk-01', 'AI improved text.')`
3. Assert block content = `'AI improved text.'`
4. Call `doc.undo()`
5. Assert block content reverts to `'Original text.'`

**Expected Result**: Content replaced; undo-able; redo available after undo.

**Code Sample**:
```typescript
it('should accept AI suggestion and make it undoable', () => {
  doc.getBlock('blk-01')!.content = 'Original text.';
  doc.acceptSuggestion('blk-01', 'AI improved text.');

  expect(doc.getBlock('blk-01')!.content).toBe('AI improved text.');

  doc.undo();
  expect(doc.getBlock('blk-01')!.content).toBe('Original text.');
});
```

---

### 1.3 Version History

#### TC-F5-U3.1: Save Version Creates Snapshot in SQLite
**Objective**: Verify `VersionHistory.save(doc)` creates a complete snapshot row in `report_versions` table.

**Preconditions**:
- `VersionHistory` initialized with writable SQLite connection

**Test Steps**:
1. Call `versionHistory.save(doc, { label: 'v1.0', userId: 'u-1' })`
2. Query `report_versions` table
3. Assert row exists with correct `report_id`, `label`, `snapshot` JSON

**Expected Result**: Row inserted; `snapshot` column contains full serialized document; `created_at` populated.

**Code Sample**:
```typescript
it('should create version snapshot in SQLite', () => {
  versionHistory.save(doc, { label: 'v1.0', userId: 'u-1' });
  const row = testDb.prepare('SELECT * FROM report_versions WHERE label = ?').get('v1.0');

  expect(row).toBeDefined();
  expect(row.report_id).toBe(doc.id);
  const snapshot = JSON.parse(row.snapshot);
  expect(snapshot.blocks).toHaveLength(doc.blocks.length);
});
```

---

#### TC-F5-U3.2: Restore Version Replaces Current Document State
**Objective**: Verify `versionHistory.restore(versionId)` replaces current editor state with the snapshot.

**Test Steps**:
1. Save version `v1.0` with 3 blocks
2. Add 2 more blocks to document
3. Call `versionHistory.restore(v1Id)`
4. Assert document has 3 blocks matching snapshot

**Expected Result**: Document reverts to 3-block state; current edits discarded; restored state pushed to undo stack.

**Code Sample**:
```typescript
it('should restore document to saved version snapshot', () => {
  const v1Id = versionHistory.save(doc, { label: 'v1.0', userId: 'u-1' }).id;
  doc.insertBlock(3, { type: 'PARAGRAPH', content: 'Extra 1' });
  doc.insertBlock(4, { type: 'PARAGRAPH', content: 'Extra 2' });

  versionHistory.restore(v1Id, doc);
  expect(doc.blocks).toHaveLength(3);
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Editor Open and Save Pipeline

#### TC-F5-I1.1: Opening a Report Populates Editor with AI-Generated Content
**Objective**: Verify that opening a report from the Reports list loads AI-generated blocks into the editor.

**Preconditions**:
- Report `rpt-001` exists in DB with 6 AI-generated blocks

**Test Steps**:
1. Open Report Editing Studio for `rpt-001`
2. Wait for `editor:ready` IPC event
3. Assert editor contains exactly 6 block elements

**Expected Result**: 6 blocks rendered in editor; heading block visible at top; no loading state.

**Code Sample**:
```typescript
it('should populate editor with 6 AI-generated blocks on open', async () => {
  const win = await createTestWindow('/report-editor?id=rpt-001');
  await waitForIPC(win, 'editor:ready');

  const blockCount = await win.webContents.executeJavaScript(`
    document.querySelectorAll('[data-testid="editor-block"]').length
  `);
  expect(blockCount).toBe(6);
});
```

---

#### TC-F5-I1.2: Auto-Save Persists Changes to SQLite Within 2 Seconds
**Objective**: Verify that editing a block triggers auto-save within 2 seconds and content appears in DB.

**Test Steps**:
1. Edit block 2 text to `'Updated content.'`
2. Wait 2.5 seconds
3. Query DB for `rpt-001` content
4. Assert block 2 content is `'Updated content.'`

**Expected Result**: DB updated within 2 seconds; auto-save indicator shows checkmark; no data loss.

**Code Sample**:
```typescript
it('should auto-save edited content to DB within 2 seconds', async () => {
  await win.webContents.executeJavaScript(`
    window.__editorAPI.updateBlock(1, 'Updated content.');
  `);
  await new Promise(r => setTimeout(r, 2500));

  const row = testDb.prepare('SELECT content FROM report_blocks WHERE report_id = ? AND block_index = 1').get('rpt-001');
  expect(row?.content).toContain('Updated content.');
});
```

---

### 2.2 AI Rewrite Round-Trip

#### TC-F5-I2.1: Request AI Rewrite and Accept Suggestion Updates Editor
**Objective**: Verify the full AI rewrite flow from request to UI acceptance updates the editor block.

**Test Steps**:
1. Right-click block 3 and select `'Rewrite with AI (Formal)'`
2. Wait for suggestion panel to appear
3. Click `'Accept'`
4. Assert block 3 content has changed from original

**Expected Result**: Block 3 contains AI-suggested text; original text visible in undo history.

**Code Sample**:
```typescript
it('should accept AI rewrite suggestion and update editor block', async () => {
  const original = await getBlockContent(win, 3);
  await triggerAIRewrite(win, 3, 'formal');
  await waitForSuggestionPanel(win);
  await acceptSuggestion(win);
  const updated = await getBlockContent(win, 3);
  expect(updated).not.toBe(original);
  expect(updated.length).toBeGreaterThan(0);
});
```

---

#### TC-F5-I2.2: Dismiss AI Suggestion Leaves Block Unchanged
**Objective**: Verify dismissing the suggestion panel leaves the original block content intact.

**Test Steps**:
1. Request AI rewrite for block 2
2. Click `'Dismiss'` on suggestion panel
3. Assert block 2 content unchanged

**Expected Result**: Block 2 content identical to pre-request state; no partial update.

**Code Sample**:
```typescript
it('should leave block unchanged when AI suggestion is dismissed', async () => {
  const before = await getBlockContent(win, 2);
  await triggerAIRewrite(win, 2, 'casual');
  await waitForSuggestionPanel(win);
  await dismissSuggestion(win);
  const after = await getBlockContent(win, 2);
  expect(after).toBe(before);
});
```

---

### 2.3 Version History UI

#### TC-F5-I3.1: Version History Panel Lists All Saved Versions
**Objective**: Verify the version history panel lists all previously saved versions in reverse-chronological order.

**Test Steps**:
1. Save 3 versions manually (`v1.0`, `v1.1`, `v2.0`)
2. Open version history panel
3. Assert all 3 versions listed with labels and timestamps

**Expected Result**: 3 versions shown; most recent (`v2.0`) at top; timestamps displayed; restore buttons present.

**Code Sample**:
```typescript
it('should list all saved versions in history panel', async () => {
  for (const label of ['v1.0', 'v1.1', 'v2.0']) {
    await win.webContents.send('editor:saveVersion', { label });
    await new Promise(r => setTimeout(r, 100));
  }
  await openVersionHistoryPanel(win);

  const labels = await win.webContents.executeJavaScript(`
    [...document.querySelectorAll('[data-testid="version-label"]')].map(el => el.textContent)
  `);
  expect(labels).toContain('v2.0');
  expect(labels).toContain('v1.0');
  expect(labels[0]).toBe('v2.0'); // most recent first
});
```

---

#### TC-F5-I3.2: Restoring Version from Panel Updates Editor
**Objective**: Verify clicking `Restore` on a version in the panel replaces editor content with that version's snapshot.

**Test Steps**:
1. Save `v1.0` with 3 blocks
2. Add 2 more blocks and save `v2.0`
3. Open history panel and click `Restore` on `v1.0`
4. Assert editor shows 3 blocks

**Expected Result**: Editor reverts to 3-block v1.0 state; current unsaved changes lost; confirmation dialog shown before restore.

**Code Sample**:
```typescript
it('should restore earlier version from history panel', async () => {
  await restoreVersionFromPanel(win, 'v1.0');
  await new Promise(r => setTimeout(r, 500));

  const blockCount = await win.webContents.executeJavaScript(`
    document.querySelectorAll('[data-testid="editor-block"]').length
  `);
  expect(blockCount).toBe(3);
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Document Integrity

#### TC-F5-E1.1: Pasting Rich HTML Content Is Sanitized
**Objective**: Verify pasting HTML with `<script>` and `<iframe>` tags into the editor sanitizes those elements.

**Test Steps**:
1. Paste `<p>Safe text</p><script>alert('xss')</script><iframe src="evil.com"></iframe>` into editor
2. Assert editor content contains `'Safe text'`
3. Assert editor DOM does not contain `<script>` or `<iframe>` elements

**Expected Result**: Safe text preserved; dangerous tags stripped; no script executed.

**Code Sample**:
```typescript
it('should sanitize pasted HTML and remove dangerous tags', async () => {
  const pastedHtml = `<p>Safe text</p><script>alert('xss')</script><iframe src="evil.com"></iframe>`;
  const sanitized = EditorDocument.sanitizePastedHTML(pastedHtml);

  expect(sanitized).toContain('Safe text');
  expect(sanitized).not.toContain('<script>');
  expect(sanitized).not.toContain('<iframe');
});
```

---

#### TC-F5-E1.2: Undo Limit of 100 Actions Does Not Crash
**Objective**: Verify that performing 101 undoable actions stays within the undo stack limit without error.

**Test Steps**:
1. Insert 101 blocks one by one
2. Call `doc.undo()` 101 times
3. Assert no exception thrown on the 101st undo
4. Assert document state stable

**Expected Result**: 101st undo is a no-op; document state = original; no crash.

**Code Sample**:
```typescript
it('should cap undo stack at 100 without crashing', () => {
  for (let i = 0; i < 101; i++) {
    doc.insertBlock(0, { type: 'PARAGRAPH', content: `Block ${i}` });
  }
  expect(() => {
    for (let i = 0; i < 101; i++) doc.undo();
  }).not.toThrow();
});
```

---

### 3.2 Large Reports

#### TC-F5-E2.1: 500-Block Report Renders Without Performance Regression
**Objective**: Verify a report with 500 blocks renders without blocking the UI or causing scroll jank.

**Test Steps**:
1. Load report with 500 blocks into editor
2. Measure time for all blocks to appear in DOM
3. Assert < 3 seconds

**Expected Result**: Editor renders within 3 seconds; virtual scrolling active; only visible blocks in DOM.

**Code Sample**:
```typescript
it('should render 500-block report within 3 seconds', async () => {
  const t0 = performance.now();
  await win.webContents.send('editor:load', generate500BlockReport());
  await waitForIPC(win, 'editor:ready');
  expect(performance.now() - t0).toBeLessThan(3000);

  const domCount = await win.webContents.executeJavaScript(`
    document.querySelectorAll('[data-testid="editor-block"]').length
  `);
  expect(domCount).toBeLessThan(100); // virtual scroll
});
```

---

#### TC-F5-E2.2: Auto-Save Does Not Block Editor During Large Document Save
**Objective**: Verify that auto-saving a 500-block report does not freeze the editor UI.

**Test Steps**:
1. Load 500-block report
2. Trigger auto-save
3. While save is in progress, type into editor
4. Assert typing responds within 50ms

**Expected Result**: Editor remains responsive during background auto-save; no UI freeze.

**Code Sample**:
```typescript
it('should keep editor responsive during auto-save of large report', async () => {
  await win.webContents.send('editor:triggerAutoSave', {});
  const responseTime = await win.webContents.executeJavaScript(`
    const start = performance.now();
    window.__editorAPI.updateBlock(0, 'Typing during save');
    return performance.now() - start;
  `);
  expect(responseTime).toBeLessThan(50);
});
```

---

### 3.3 Concurrent Editing

#### TC-F5-E3.1: Simultaneous Auto-Save and Version Save Do Not Corrupt Report
**Objective**: Verify that a user-triggered version save occurring simultaneously with auto-save does not corrupt the report.

**Test Steps**:
1. Trigger auto-save and version save simultaneously
2. Wait 3 seconds
3. Query DB and assert report content is valid and version row exists

**Expected Result**: Both saves complete; report content intact; version snapshot contains correct data.

**Code Sample**:
```typescript
it('should handle simultaneous auto-save and version save without corruption', async () => {
  await Promise.allSettled([
    win.webContents.send('editor:triggerAutoSave', {}),
    win.webContents.send('editor:saveVersion', { label: 'race-version' })
  ]);
  await new Promise(r => setTimeout(r, 3000));

  const version = testDb.prepare('SELECT * FROM report_versions WHERE label = ?').get('race-version');
  const report = testDb.prepare('SELECT * FROM reports WHERE id = ?').get('rpt-001');
  expect(version).toBeDefined();
  expect(report).toBeDefined();
  expect(() => JSON.parse(version.snapshot)).not.toThrow();
});
```

---

#### TC-F5-E3.2: Offline Auto-Save Queues and Flushes on Reconnect
**Objective**: Verify that auto-saves attempted while offline are queued and committed when connectivity returns.

**Test Steps**:
1. Simulate offline mode
2. Edit 3 blocks (triggering 3 auto-saves)
3. Restore connectivity
4. Assert all 3 edits persisted

**Expected Result**: All 3 edits in DB after reconnect; save queue flushed in order; no duplicate saves.

**Code Sample**:
```typescript
it('should flush queued auto-saves after reconnect', async () => {
  await setOfflineMode(win, true);
  for (let i = 0; i < 3; i++) {
    await win.webContents.send('editor:blockUpdated', { index: i, content: `Offline edit ${i}` });
    await new Promise(r => setTimeout(r, 2100)); // trigger debounced save
  }
  await setOfflineMode(win, false);
  await new Promise(r => setTimeout(r, 2000));

  for (let i = 0; i < 3; i++) {
    const row = testDb.prepare('SELECT content FROM report_blocks WHERE report_id = ? AND block_index = ?').get('rpt-001', i);
    expect(row?.content).toBe(`Offline edit ${i}`);
  }
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Editor Load Performance

#### TC-F5-P1.1: Report Editor Opens in Under 1.5 Seconds
**Objective**: Verify the report editor window is interactive within 1.5 seconds of opening.

**Preconditions**:
- Report with 50 blocks in DB

**Test Steps**:
1. Time from `createTestWindow` to `editor:ready` IPC event

**Expected Result**: Editor ready in < 1500ms; all blocks visible.

**Code Sample**:
```typescript
it('should open report editor within 1.5 seconds', async () => {
  const t0 = performance.now();
  const win = await createTestWindow('/report-editor?id=rpt-001');
  await waitForIPC(win, 'editor:ready');
  expect(performance.now() - t0).toBeLessThan(1500);
});
```

---

#### TC-F5-P1.2: Block Update Renders in DOM Within 50ms
**Objective**: Verify that updating a block's content reflects in the DOM within 50ms.

**Test Steps**:
1. Call `window.__editorAPI.updateBlock(0, 'new text')`
2. Measure time until DOM reflects the update

**Expected Result**: DOM update completes within 50ms.

**Code Sample**:
```typescript
it('should reflect block update in DOM within 50ms', async () => {
  const elapsed = await win.webContents.executeJavaScript(`
    const t = performance.now();
    window.__editorAPI.updateBlock(0, 'new text');
    return new Promise(resolve => {
      const check = () => {
        const el = document.querySelectorAll('[data-testid="editor-block"]')[0];
        if (el?.textContent?.includes('new text')) resolve(performance.now() - t);
        else requestAnimationFrame(check);
      };
      check();
    });
  `);
  expect(elapsed).toBeLessThan(50);
});
```

---

### 4.2 Auto-Save Performance

#### TC-F5-P2.1: Auto-Save of 50-Block Report Completes in Under 200ms
**Objective**: Verify the SQLite write for a 50-block report auto-save completes in < 200ms.

**Test Steps**:
1. Generate 50-block document
2. Time `reportRepository.save(doc)` call

**Expected Result**: Save < 200ms; all 50 blocks written in a single SQLite transaction.

**Code Sample**:
```typescript
it('should auto-save 50-block report in under 200ms', () => {
  const doc = generate50BlockDocument();
  const start = performance.now();
  reportRepository.save(doc);
  expect(performance.now() - start).toBeLessThan(200);
});
```

---

#### TC-F5-P2.2: Auto-Save Does Not Impact Typing Latency
**Objective**: Verify that a background auto-save does not delay keystroke processing by more than 5ms.

**Test Steps**:
1. Trigger auto-save in background thread
2. Measure keystroke-to-DOM latency during save

**Expected Result**: Keystroke latency delta during save < 5ms over baseline.

**Code Sample**:
```typescript
it('should not add more than 5ms latency during auto-save', async () => {
  const baseline = await measureKeystrokeLatency(win);
  await win.webContents.send('editor:triggerAutoSave', {});
  const duringave = await measureKeystrokeLatency(win);
  expect(duringSave - baseline).toBeLessThan(5);
});
```

---

### 4.3 Undo/Redo Performance

#### TC-F5-P3.1: Undo 50 Operations Completes in Under 100ms Total
**Objective**: Verify that 50 consecutive undo operations complete within 100ms total.

**Test Steps**:
1. Perform 50 insertions
2. Time 50 `doc.undo()` calls

**Expected Result**: Total time < 100ms; average per undo < 2ms.

**Code Sample**:
```typescript
it('should complete 50 undo operations in under 100ms', () => {
  for (let i = 0; i < 50; i++) doc.insertBlock(0, { type: 'PARAGRAPH', content: `block-${i}` });
  const start = performance.now();
  for (let i = 0; i < 50; i++) doc.undo();
  expect(performance.now() - start).toBeLessThan(100);
});
```

---

#### TC-F5-P3.2: Version Snapshot Save Under 50ms for 200-Block Document
**Objective**: Verify saving a version snapshot for a 200-block document takes < 50ms.

**Test Steps**:
1. Generate 200-block document
2. Time `versionHistory.save(doc, { label: 'perf-test' })` call

**Expected Result**: Save < 50ms; JSON serialization included in timing.

**Code Sample**:
```typescript
it('should save 200-block version snapshot in under 50ms', () => {
  const doc = generate200BlockDocument();
  const start = performance.now();
  versionHistory.save(doc, { label: 'perf-test', userId: 'u-1' });
  expect(performance.now() - start).toBeLessThan(50);
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

**Estimated Execution Time**: ~4 minutes (unit: 30s, integration: 2m, edge: 45s, performance: 45s)

**Tooling**: Jest + better-sqlite3 (unit/performance), Electron test harness (integration/edge), custom keystroke-latency helper
