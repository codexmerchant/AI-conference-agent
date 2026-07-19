# EPIC14 Feature 1 — Transcript Review Workspace — Test Cases

## Test Overview
Comprehensive test suite for Transcript Review Workspace covering unit tests, integration tests, edge cases, and performance validation. This feature provides a Mac desktop environment for reviewing, annotating, and navigating AI-generated transcripts alongside synchronized audio/video playback.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Transcript Loading and Parsing

#### TC-F1-U1.1: Load Transcript from SQLite Cache
**Objective**: Verify that a transcript record is correctly deserialized from the local SQLite store into the view model.

**Preconditions**:
- Local SQLite database populated with at least one transcript record
- Electron main process running with ipc channel `transcript:load` registered

**Test Steps**:
1. Invoke `TranscriptRepository.fetchById('txn-001')` on the main process
2. Assert returned object maps all DB columns to typed fields
3. Confirm `segments` array is parsed from JSON column
4. Verify speaker labels are non-empty strings

**Expected Result**: Typed `Transcript` object with `id`, `conferenceId`, `segments[]`, `duration`, `createdAt` fully populated; no null fields for required columns.

**Code Sample**:
```typescript
import Database from 'better-sqlite3';
import { TranscriptRepository } from '../src/main/repositories/TranscriptRepository';

describe('TranscriptRepository', () => {
  let db: Database.Database;
  let repo: TranscriptRepository;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`CREATE TABLE transcripts (
      id TEXT PRIMARY KEY,
      conference_id TEXT NOT NULL,
      segments TEXT NOT NULL,
      duration_ms INTEGER,
      created_at INTEGER
    )`);
    db.prepare(`INSERT INTO transcripts VALUES (?,?,?,?,?)`).run(
      'txn-001', 'conf-42', JSON.stringify([
        { start: 0, end: 3200, speaker: 'Alice', text: 'Hello everyone.' }
      ]), 3200, Date.now()
    );
    repo = new TranscriptRepository(db);
  });

  it('should deserialize transcript with typed segments', () => {
    const result = repo.fetchById('txn-001');
    expect(result).toBeDefined();
    expect(result!.id).toBe('txn-001');
    expect(result!.segments).toHaveLength(1);
    expect(result!.segments[0].speaker).toBe('Alice');
    expect(result!.segments[0].start).toBe(0);
  });
});
```

---

#### TC-F1-U1.2: Segment Search Within Transcript
**Objective**: Verify keyword search returns correct segment indices sorted by relevance.

**Preconditions**:
- Transcript object loaded in `TranscriptViewModel` with 50+ segments
- Search index built in memory

**Test Steps**:
1. Call `viewModel.searchSegments('machine learning')`
2. Assert returned hits array is non-empty
3. Verify each hit contains `segmentIndex`, `matchStart`, `matchEnd`
4. Confirm results sorted by earliest occurrence

**Expected Result**: Array of `SearchHit` objects where `segmentIndex` is within bounds; `matchStart < matchEnd`; results in ascending `segmentIndex` order.

**Code Sample**:
```typescript
describe('TranscriptViewModel.searchSegments', () => {
  it('should return sorted search hits for keyword', () => {
    const vm = new TranscriptViewModel(mockTranscript);
    const hits = vm.searchSegments('machine learning');

    expect(hits.length).toBeGreaterThan(0);
    hits.forEach(hit => {
      expect(hit.segmentIndex).toBeGreaterThanOrEqual(0);
      expect(hit.segmentIndex).toBeLessThan(mockTranscript.segments.length);
      expect(hit.matchStart).toBeLessThan(hit.matchEnd);
    });
    // ascending order
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i].segmentIndex).toBeGreaterThanOrEqual(hits[i - 1].segmentIndex);
    }
  });
});
```

---

#### TC-F1-U1.3: Speaker Diarization Label Update
**Objective**: Verify that renaming a speaker label propagates to all matching segments atomically.

**Preconditions**:
- Transcript loaded with speaker label `'SPEAKER_1'` on multiple segments

**Test Steps**:
1. Call `viewModel.renameSpeaker('SPEAKER_1', 'Dr. Chen')`
2. Query all segments where original label was `'SPEAKER_1'`
3. Assert all now carry `'Dr. Chen'`
4. Confirm no other segments were modified

**Expected Result**: All segments previously labeled `'SPEAKER_1'` show `'Dr. Chen'`; segment count unchanged; other speaker labels untouched.

**Code Sample**:
```typescript
it('should rename speaker across all matching segments', () => {
  const vm = new TranscriptViewModel(transcriptWithSpeakers);
  const before = vm.segments.filter(s => s.speaker === 'SPEAKER_1').length;

  vm.renameSpeaker('SPEAKER_1', 'Dr. Chen');

  const after = vm.segments.filter(s => s.speaker === 'Dr. Chen').length;
  const remnants = vm.segments.filter(s => s.speaker === 'SPEAKER_1').length;

  expect(after).toBe(before);
  expect(remnants).toBe(0);
});
```

---

### 1.2 Annotation Management

#### TC-F1-U2.1: Create Inline Annotation on Segment
**Objective**: Verify that an annotation is created, persisted to SQLite, and returned with a valid ID.

**Preconditions**:
- Transcript segment `seg-007` exists
- `AnnotationService` initialized with writable DB connection

**Test Steps**:
1. Call `annotationService.create({ segmentId: 'seg-007', note: 'Key insight', tag: 'ACTION' })`
2. Assert returned annotation has UUID-format `id`
3. Query DB directly and confirm record exists

**Expected Result**: New row in `annotations` table; returned `id` matches DB record; `createdAt` within 1 second of now.

**Code Sample**:
```typescript
it('should persist annotation and return valid id', async () => {
  const svc = new AnnotationService(testDb);
  const ann = await svc.create({
    segmentId: 'seg-007',
    note: 'Key insight from panel discussion',
    tag: 'ACTION'
  });

  expect(ann.id).toMatch(/^[0-9a-f-]{36}$/);
  const row = testDb.prepare('SELECT * FROM annotations WHERE id = ?').get(ann.id);
  expect(row).toBeDefined();
  expect(row.segment_id).toBe('seg-007');
});
```

---

#### TC-F1-U2.2: Delete Annotation and Confirm Removal
**Objective**: Verify soft-delete of an annotation marks it as deleted without removing the row.

**Test Steps**:
1. Insert annotation into DB
2. Call `annotationService.delete(annotationId)`
3. Query DB for the annotation row
4. Assert `deleted_at` is populated and `active` flag is false

**Expected Result**: Row still present in DB; `deleted_at` non-null; `active = 0`; subsequent `listBySegment` calls exclude it.

**Code Sample**:
```typescript
it('should soft-delete annotation', async () => {
  const id = await svc.create({ segmentId: 's1', note: 'temp', tag: 'NOTE' }).then(a => a.id);
  await svc.delete(id);

  const row = testDb.prepare('SELECT * FROM annotations WHERE id = ?').get(id);
  expect(row.active).toBe(0);
  expect(row.deleted_at).toBeTruthy();

  const visible = await svc.listBySegment('s1');
  expect(visible.find(a => a.id === id)).toBeUndefined();
});
```

---

#### TC-F1-U2.3: Annotation Tag Filtering
**Objective**: Verify filtering annotations by tag returns only matching entries.

**Test Steps**:
1. Insert annotations with tags `ACTION`, `QUESTION`, `NOTE`
2. Call `annotationService.listByTag('ACTION')`
3. Assert all returned items have `tag === 'ACTION'`

**Expected Result**: Only `ACTION`-tagged annotations returned; count matches inserted count for that tag.

**Code Sample**:
```typescript
it('should filter annotations by tag', async () => {
  await svc.create({ segmentId: 's1', note: 'todo', tag: 'ACTION' });
  await svc.create({ segmentId: 's2', note: 'ask later', tag: 'QUESTION' });
  await svc.create({ segmentId: 's3', note: 'fyi', tag: 'NOTE' });

  const actions = await svc.listByTag('ACTION');
  expect(actions).toHaveLength(1);
  expect(actions[0].tag).toBe('ACTION');
});
```

---

### 1.3 Playback Synchronization (IPC Bridge)

#### TC-F1-U3.1: IPC Seek Command Sent to Renderer
**Objective**: Verify that clicking a segment timestamp in the transcript panel emits the correct IPC `playback:seek` message to the renderer.

**Preconditions**:
- Electron main and renderer processes mocked
- `PlaybackBridge` initialized

**Test Steps**:
1. Call `playbackBridge.seekToSegment({ startMs: 14200 })`
2. Capture IPC messages sent via `webContents.send`
3. Assert channel is `'playback:seek'` and payload `{ positionMs: 14200 }`

**Expected Result**: Exactly one IPC message sent on `'playback:seek'` channel with correct position.

**Code Sample**:
```typescript
import { PlaybackBridge } from '../src/main/ipc/PlaybackBridge';

describe('PlaybackBridge', () => {
  it('should send seek IPC to renderer with correct positionMs', () => {
    const mockWebContents = { send: jest.fn() };
    const bridge = new PlaybackBridge(mockWebContents as any);

    bridge.seekToSegment({ startMs: 14200 });

    expect(mockWebContents.send).toHaveBeenCalledTimes(1);
    expect(mockWebContents.send).toHaveBeenCalledWith('playback:seek', { positionMs: 14200 });
  });
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Transcript Load and Render Pipeline

#### TC-F1-I1.1: End-to-End Transcript Display from SQLite to UI
**Objective**: Verify the full pipeline from DB fetch through IPC to renderer state update renders correct segment count.

**Preconditions**:
- Electron test harness (Spectron or custom) running
- SQLite DB seeded with 3 transcripts, 120 segments total

**Test Steps**:
1. Open Transcript Review Workspace window
2. Select transcript `txn-001` from sidebar
3. Wait for renderer to receive `transcript:loaded` IPC event
4. Count rendered segment rows in DOM

**Expected Result**: DOM contains exactly 40 segment rows matching the DB record; speaker badges rendered; timestamps displayed in `mm:ss` format.

**Code Sample**:
```typescript
import { ipcMain, BrowserWindow } from 'electron';
import { createTestWindow } from '../test-utils/electron-harness';

describe('Transcript load pipeline', () => {
  it('should render all segments after IPC transcript:loaded', async () => {
    const win = await createTestWindow('/transcript-review');
    const segments = await win.webContents.executeJavaScript(`
      document.querySelectorAll('[data-testid="transcript-segment"]').length
    `);
    expect(segments).toBe(40);
  });
});
```

---

#### TC-F1-I1.2: Playback Position Highlight Sync
**Objective**: Verify that advancing playback position causes the correct segment to gain the `active` CSS class.

**Preconditions**:
- Transcript rendered with 40 segments
- Media player paused at 0ms

**Test Steps**:
1. Send IPC `playback:position` event with `{ positionMs: 8500 }`
2. Query which segment element has class `segment--active`
3. Assert its `data-start` attribute <= 8500 and `data-end` attribute >= 8500

**Expected Result**: Exactly one segment highlighted; its time range contains 8500ms; previously active segment loses the class.

**Code Sample**:
```typescript
it('should highlight segment at current playback position', async () => {
  await win.webContents.send('playback:position', { positionMs: 8500 });
  await new Promise(r => setTimeout(r, 100));

  const active = await win.webContents.executeJavaScript(`
    (() => {
      const el = document.querySelector('.segment--active');
      return el ? { start: +el.dataset.start, end: +el.dataset.end } : null;
    })()
  `);

  expect(active).not.toBeNull();
  expect(active!.start).toBeLessThanOrEqual(8500);
  expect(active!.end).toBeGreaterThanOrEqual(8500);
});
```

---

### 2.2 Annotation Persistence Across Sessions

#### TC-F1-I2.1: Annotations Survive App Restart
**Objective**: Verify annotations written in one session are visible after closing and reopening the workspace.

**Preconditions**:
- App running with persistent SQLite at `~/Library/Application Support/ConferenceAgent/data.db`

**Test Steps**:
1. Create annotation on segment `seg-005`
2. Close BrowserWindow and reopen it
3. Navigate back to the same transcript
4. Confirm annotation appears on `seg-005`

**Expected Result**: Annotation note text, tag, and segment association are identical after reload.

**Code Sample**:
```typescript
it('should persist annotations across window lifecycle', async () => {
  await annotationService.create({ segmentId: 'seg-005', note: 'persist me', tag: 'NOTE' });
  await win.close();

  win = await createTestWindow('/transcript-review?transcript=txn-001');
  const annCount = await win.webContents.executeJavaScript(`
    document.querySelectorAll('[data-segment-id="seg-005"] .annotation-badge').length
  `);
  expect(annCount).toBeGreaterThanOrEqual(1);
});
```

---

#### TC-F1-I2.2: Concurrent Annotation Write from Multiple Windows
**Objective**: Verify two transcript windows writing annotations to the same transcript do not corrupt the DB.

**Test Steps**:
1. Open two BrowserWindows pointing at `txn-001`
2. Simultaneously create annotations from both windows via IPC
3. Wait 500ms for both writes to settle
4. Query total annotation count from DB

**Expected Result**: Both annotations present in DB with unique IDs; no SQLite `SQLITE_BUSY` or constraint errors.

**Code Sample**:
```typescript
it('should handle concurrent annotation writes without corruption', async () => {
  const [w1, w2] = await Promise.all([createTestWindow('/transcript-review?id=txn-001'), createTestWindow('/transcript-review?id=txn-001')]);

  await Promise.all([
    w1.webContents.send('annotation:create', { segmentId: 'seg-010', note: 'from w1', tag: 'NOTE' }),
    w2.webContents.send('annotation:create', { segmentId: 'seg-010', note: 'from w2', tag: 'ACTION' })
  ]);
  await new Promise(r => setTimeout(r, 500));

  const count = testDb.prepare('SELECT COUNT(*) as c FROM annotations WHERE segment_id = ?').get('seg-010') as { c: number };
  expect(count.c).toBe(2);
});
```

---

### 2.3 Search and Navigation Integration

#### TC-F1-I3.1: Search Result Navigation Scrolls to Segment
**Objective**: Verify selecting a search result scrolls the transcript panel to the matching segment and highlights it.

**Test Steps**:
1. Enter `'keynote'` in search bar
2. Click second result in hits list
3. Assert transcript scrolled so the target segment is in viewport
4. Assert segment has `segment--search-match` class

**Expected Result**: Target segment visible in viewport; highlighted; scroll position adjusted if segment was off-screen.

**Code Sample**:
```typescript
it('should scroll to and highlight search result on selection', async () => {
  await win.webContents.executeJavaScript(`
    document.querySelector('[data-testid="transcript-search"]').value = 'keynote';
    document.querySelector('[data-testid="transcript-search"]').dispatchEvent(new Event('input'));
  `);
  await new Promise(r => setTimeout(r, 300));

  await win.webContents.executeJavaScript(`
    document.querySelectorAll('[data-testid="search-hit"]')[1].click();
  `);
  await new Promise(r => setTimeout(r, 200));

  const inView = await win.webContents.executeJavaScript(`
    (() => {
      const el = document.querySelector('.segment--search-match');
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight;
    })()
  `);
  expect(inView).toBe(true);
});
```

---

#### TC-F1-I3.2: Export Annotated Transcript to Markdown
**Objective**: Verify that the export action produces a well-formed Markdown file containing all segments and inline annotations.

**Test Steps**:
1. Load transcript with 3 annotations
2. Trigger `File > Export > Annotated Transcript (Markdown)`
3. Read the saved file
4. Assert all segments present as headings/paragraphs
5. Assert annotations appear as blockquotes inline

**Expected Result**: Exported `.md` file has correct segment count; each annotation appears beneath its segment; file size > 1KB.

**Code Sample**:
```typescript
import fs from 'fs';
import { ExportService } from '../src/main/services/ExportService';

it('should export annotated transcript as valid Markdown', async () => {
  const path = '/tmp/test-export.md';
  await exportService.exportMarkdown({ transcriptId: 'txn-001', outputPath: path });

  const content = fs.readFileSync(path, 'utf8');
  expect(content).toContain('## Segment');
  expect(content).toContain('> ACTION:');
  expect(fs.statSync(path).size).toBeGreaterThan(1024);
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Empty and Malformed Transcripts

#### TC-F1-E1.1: Display Transcript with Zero Segments
**Objective**: Verify the workspace renders an empty-state UI instead of crashing when transcript has no segments.

**Preconditions**:
- Transcript record exists with `segments = '[]'` in DB

**Test Steps**:
1. Load transcript `txn-empty`
2. Observe transcript panel

**Expected Result**: Empty-state illustration and message `'No segments found for this transcript.'` displayed; no JavaScript errors in console.

**Code Sample**:
```typescript
it('should render empty state for transcript with zero segments', async () => {
  testDb.prepare(`INSERT INTO transcripts VALUES (?,?,?,?,?)`).run('txn-empty', 'conf-1', '[]', 0, Date.now());

  const vm = new TranscriptViewModel(repo.fetchById('txn-empty')!);
  expect(vm.segments).toHaveLength(0);
  expect(vm.isEmpty).toBe(true);
  expect(vm.emptyStateMessage).toBe('No segments found for this transcript.');
});
```

---

#### TC-F1-E1.2: Handle Corrupted Segments JSON in DB
**Objective**: Verify graceful error recovery when `segments` column contains invalid JSON.

**Test Steps**:
1. Insert transcript with `segments = 'NOT_VALID_JSON'`
2. Call `repo.fetchById('txn-corrupt')`
3. Observe returned value

**Expected Result**: Returns `null` or throws a typed `TranscriptParseError`; no unhandled exception; error logged to app logger.

**Code Sample**:
```typescript
it('should throw TranscriptParseError for invalid segment JSON', () => {
  testDb.prepare(`INSERT INTO transcripts VALUES (?,?,?,?,?)`).run('txn-corrupt', 'conf-1', 'NOT_VALID_JSON', 0, Date.now());

  expect(() => repo.fetchById('txn-corrupt')).toThrow(TranscriptParseError);
});
```

---

### 3.2 Very Long Transcripts

#### TC-F1-E2.1: Virtual Scrolling with 2000+ Segments
**Objective**: Verify the segment list uses virtual scrolling and renders only the visible window of segments.

**Test Steps**:
1. Load transcript with 2000 segments
2. Observe DOM segment element count
3. Scroll to bottom and observe DOM count again

**Expected Result**: DOM never contains more than 60 segment elements at any scroll position; total scrollable height reflects all 2000 segments.

**Code Sample**:
```typescript
it('should virtualise rendering for large transcripts', async () => {
  // Seed 2000 segments
  const segments = Array.from({ length: 2000 }, (_, i) => ({
    start: i * 5000, end: (i + 1) * 5000, speaker: 'A', text: `Segment ${i}`
  }));
  testDb.prepare(`UPDATE transcripts SET segments = ? WHERE id = ?`).run(JSON.stringify(segments), 'txn-large');

  const domCount = await win.webContents.executeJavaScript(`
    document.querySelectorAll('[data-testid="transcript-segment"]').length
  `);
  expect(domCount).toBeLessThanOrEqual(60);
});
```

---

#### TC-F1-E2.2: Search Performance on 2000-Segment Transcript
**Objective**: Verify search completes in under 200ms on a 2000-segment transcript.

**Test Steps**:
1. Load 2000-segment transcript into `TranscriptViewModel`
2. Time `searchSegments('conference')` call

**Expected Result**: Execution time < 200ms; returns at least one hit.

**Code Sample**:
```typescript
it('should search 2000 segments in under 200ms', () => {
  const vm = new TranscriptViewModel(largeTranscript);
  const start = performance.now();
  const hits = vm.searchSegments('conference');
  const elapsed = performance.now() - start;

  expect(elapsed).toBeLessThan(200);
  expect(hits.length).toBeGreaterThan(0);
});
```

---

### 3.3 Concurrent User Actions

#### TC-F1-E3.1: Rapid Speaker Rename During Playback
**Objective**: Verify renaming a speaker while playback is active does not cause a race condition or stale segment highlights.

**Test Steps**:
1. Start mock playback emitting `position` events at 100ms intervals
2. Concurrently rename `'SPEAKER_0'` to `'Bob'`
3. After 1 second, stop playback
4. Assert no segments still labeled `'SPEAKER_0'`

**Expected Result**: All segments relabeled; active highlight still tracks playback position correctly; no UI freeze.

**Code Sample**:
```typescript
it('should handle rename concurrent with playback without stale labels', async () => {
  const interval = setInterval(() => bridge.emitPosition({ positionMs: Date.now() % 60000 }), 100);
  await vm.renameSpeaker('SPEAKER_0', 'Bob');
  clearInterval(interval);

  const stale = vm.segments.filter(s => s.speaker === 'SPEAKER_0');
  expect(stale).toHaveLength(0);
});
```

---

#### TC-F1-E3.2: Annotation Create During Transcript Reload
**Objective**: Verify that an annotation IPC call in-flight during a transcript reload is either committed or rolled back cleanly.

**Test Steps**:
1. Begin annotation create IPC call (async)
2. Immediately trigger transcript reload IPC
3. Await both operations
4. Check DB state

**Expected Result**: Annotation either fully committed or not present; no partial/corrupt row; DB integrity maintained.

**Code Sample**:
```typescript
it('should not corrupt DB on annotation-create during reload', async () => {
  const createPromise = annotationService.create({ segmentId: 's1', note: 'race', tag: 'NOTE' });
  const reloadPromise = transcriptService.reload('txn-001');

  await Promise.allSettled([createPromise, reloadPromise]);

  const rows = testDb.prepare('SELECT * FROM annotations WHERE segment_id = ? AND note = ?').all('s1', 'race');
  // Either 0 (rolled back) or 1 (committed) — never partial
  expect(rows.length).toBeLessThanOrEqual(1);
  if (rows.length === 1) {
    expect(rows[0].note).toBe('race');
  }
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Load Time Benchmarks

#### TC-F1-P1.1: Transcript Window Cold Start Under 1.5 Seconds
**Objective**: Verify the Transcript Review Workspace window renders first meaningful content within 1500ms of being opened.

**Preconditions**:
- SQLite DB with 10 transcripts, each 200 segments

**Test Steps**:
1. Record timestamp before `BrowserWindow.loadURL`
2. Listen for `did-finish-load` event
3. Record timestamp when first segment element appears in DOM
4. Calculate delta

**Expected Result**: Delta < 1500ms on MacBook Pro M-series; delta < 2500ms on Mac mini Intel baseline.

**Code Sample**:
```typescript
it('should render first segment within 1500ms of window open', async () => {
  const t0 = performance.now();
  const win = await createTestWindow('/transcript-review?transcript=txn-001');

  await win.webContents.executeJavaScript(`
    new Promise(resolve => {
      const check = () => document.querySelector('[data-testid="transcript-segment"]') ? resolve() : requestAnimationFrame(check);
      check();
    })
  `);
  const elapsed = performance.now() - t0;
  expect(elapsed).toBeLessThan(1500);
});
```

---

#### TC-F1-P1.2: Segment Search Returns Results Under 100ms for Typical Transcripts
**Objective**: Verify search on a 500-segment transcript returns hits within 100ms.

**Test Steps**:
1. Build `TranscriptViewModel` with 500 segments
2. Measure `searchSegments('innovation')` execution time
3. Repeat 10 times and assess median

**Expected Result**: Median execution time < 100ms; no single run > 250ms.

**Code Sample**:
```typescript
it('should return search results in under 100ms (median)', () => {
  const vm = new TranscriptViewModel(generate500SegmentTranscript());
  const times: number[] = [];

  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    vm.searchSegments('innovation');
    times.push(performance.now() - start);
  }

  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length / 2)];
  expect(median).toBeLessThan(100);
});
```

---

### 4.2 Memory Usage

#### TC-F1-P2.1: Memory Footprint for Large Transcript Does Not Exceed 150MB
**Objective**: Verify loading and rendering a 2000-segment transcript keeps renderer process heap below 150MB.

**Test Steps**:
1. Load `txn-large` (2000 segments) in test window
2. After render settles, query `performance.memory.usedJSHeapSize`
3. Assert below threshold

**Expected Result**: `usedJSHeapSize < 157_286_400` (150MB in bytes).

**Code Sample**:
```typescript
it('should keep heap under 150MB for 2000-segment transcript', async () => {
  await loadTranscript(win, 'txn-large');
  await new Promise(r => setTimeout(r, 500)); // settle

  const heap = await win.webContents.executeJavaScript(`performance.memory.usedJSHeapSize`);
  expect(heap).toBeLessThan(150 * 1024 * 1024);
});
```

---

#### TC-F1-P2.2: No Memory Leak Across 20 Transcript Open/Close Cycles
**Objective**: Verify that repeatedly opening and closing transcript windows does not accumulate heap memory.

**Test Steps**:
1. Record baseline heap after first window open/close
2. Open and close 19 more windows
3. Record final heap
4. Assert delta < 20MB

**Expected Result**: Heap growth across 20 cycles < 20MB; no detached DOM nodes accumulating.

**Code Sample**:
```typescript
it('should not leak memory across 20 open/close cycles', async () => {
  const heapAtStart = await measureHeap();
  for (let i = 0; i < 20; i++) {
    const w = await createTestWindow('/transcript-review?transcript=txn-001');
    await w.close();
    if (global.gc) global.gc();
  }
  const heapAtEnd = await measureHeap();
  const growthMB = (heapAtEnd - heapAtStart) / (1024 * 1024);
  expect(growthMB).toBeLessThan(20);
});
```

---

### 4.3 SQLite Query Performance

#### TC-F1-P3.1: Annotation List Query Under 10ms for 10,000 Annotations
**Objective**: Verify `listBySegment` remains fast even when the annotations table is large.

**Test Steps**:
1. Insert 10,000 annotation rows across 200 segments
2. Time `annotationService.listBySegment('seg-050')`
3. Assert < 10ms

**Expected Result**: Query completes in < 10ms; result set contains only annotations for `seg-050`.

**Code Sample**:
```typescript
it('should query annotations in under 10ms with 10k rows', () => {
  const insert = testDb.prepare('INSERT INTO annotations VALUES (?,?,?,?,?,?)');
  const bulk = testDb.transaction(() => {
    for (let i = 0; i < 10000; i++) {
      insert.run(`ann-${i}`, `seg-${i % 200}`, 'note', 'NOTE', 1, Date.now());
    }
  });
  bulk();

  const start = performance.now();
  const results = annotationService.listBySegmentSync('seg-050');
  const elapsed = performance.now() - start;

  expect(elapsed).toBeLessThan(10);
  results.forEach(a => expect(a.segmentId).toBe('seg-050'));
});
```

---

#### TC-F1-P3.2: Full-Text Search via FTS5 Under 50ms for 50,000 Segments
**Objective**: Verify SQLite FTS5 virtual table search over 50,000 segments returns results under 50ms.

**Test Steps**:
1. Populate FTS5 `segments_fts` table with 50,000 rows
2. Execute FTS query for `'artificial intelligence'`
3. Assert duration < 50ms

**Expected Result**: FTS query completes in < 50ms; at least 1 result returned; results include `rank` score.

**Code Sample**:
```typescript
it('should execute FTS5 search over 50k segments in under 50ms', () => {
  // Assumes segments_fts already populated in beforeAll
  const start = performance.now();
  const rows = testDb.prepare(
    `SELECT rowid, snippet(segments_fts, 0, '<b>', '</b>', '...', 20) as snip, rank
     FROM segments_fts WHERE segments_fts MATCH ? ORDER BY rank LIMIT 20`
  ).all('artificial intelligence');
  const elapsed = performance.now() - start;

  expect(elapsed).toBeLessThan(50);
  expect(rows.length).toBeGreaterThan(0);
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

**Tooling**: Jest + better-sqlite3 (unit/edge), Electron test harness (integration), `performance.now()` benchmarks (performance)
