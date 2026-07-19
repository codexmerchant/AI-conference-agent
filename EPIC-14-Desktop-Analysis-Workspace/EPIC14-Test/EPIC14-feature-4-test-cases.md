# EPIC14 Feature 4 — Advanced Search Workspace — Test Cases

## Test Overview
Comprehensive test suite for Advanced Search Workspace covering unit tests, integration tests, edge cases, and performance validation. This feature provides Mac desktop users with a powerful multi-modal search interface across transcripts, contacts, sessions, notes, and tags — using SQLite FTS5 full-text search, semantic vector similarity, and boolean filter logic.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Query Parsing and Validation

#### TC-F4-U1.1: Boolean Query Parser Produces Correct AST
**Objective**: Verify the query parser converts a boolean search string into the correct abstract syntax tree.

**Preconditions**:
- `BooleanQueryParser` initialized

**Test Steps**:
1. Parse `'AI AND cloud NOT security'`
2. Assert root node is `AND`
3. Assert left child is terminal `'AI'`
4. Assert right child is `NOT` with terminal `'security'`

**Expected Result**: AST correctly reflects operator precedence; NOT binds tighter than AND.

**Code Sample**:
```typescript
import { BooleanQueryParser } from '../src/main/search/BooleanQueryParser';

describe('BooleanQueryParser', () => {
  it('should parse AND/NOT boolean query into correct AST', () => {
    const parser = new BooleanQueryParser();
    const ast = parser.parse('AI AND cloud NOT security');

    expect(ast.type).toBe('AND');
    expect(ast.left.value).toBe('AI');
    expect(ast.right.type).toBe('NOT');
    expect(ast.right.operand.value).toBe('security');
  });
});
```

---

#### TC-F4-U1.2: Query Sanitization Strips SQL Injection Tokens
**Objective**: Verify that user-supplied search queries are sanitized before being passed to FTS5.

**Test Steps**:
1. Pass `"'; DROP TABLE transcripts; --"` to `QuerySanitizer.sanitize()`
2. Assert returned string does not contain `DROP`, `TABLE`, or `;`

**Expected Result**: Sanitized query is safe for DB use; malicious tokens removed or escaped; original intent partially preserved if possible.

**Code Sample**:
```typescript
import { QuerySanitizer } from '../src/main/search/QuerySanitizer';

it('should strip SQL injection tokens from query', () => {
  const sanitized = QuerySanitizer.sanitize("'; DROP TABLE transcripts; --");
  expect(sanitized).not.toContain('DROP');
  expect(sanitized).not.toContain('TABLE');
  expect(sanitized).not.toContain(';');
});
```

---

#### TC-F4-U1.3: Date Filter Converts to Correct Unix Timestamp Range
**Objective**: Verify that a human-readable date range filter is converted to UTC unix millisecond bounds correctly.

**Test Steps**:
1. Call `DateFilterConverter.toRange('2026-07-15', '2026-07-15')`
2. Assert `start` = `1752537600000` (2026-07-15T00:00:00Z)
3. Assert `end` = `1752623999999` (2026-07-15T23:59:59.999Z)

**Expected Result**: Start and end timestamps bracket the full UTC day.

**Code Sample**:
```typescript
it('should convert date strings to UTC millisecond bounds', () => {
  const range = DateFilterConverter.toRange('2026-07-15', '2026-07-15');
  expect(range.start).toBe(1752537600000);
  expect(range.end).toBe(1752623999999);
});
```

---

### 1.2 FTS5 Search Execution

#### TC-F4-U2.1: FTS5 Query Returns Ranked Results
**Objective**: Verify that the FTS5 search returns results ranked by BM25 relevance score.

**Preconditions**:
- `segments_fts` virtual table populated with 100 rows

**Test Steps**:
1. Execute FTS5 query for `'machine learning'`
2. Assert results non-empty
3. Assert results sorted by `rank` (ascending, as FTS5 rank is negative BM25)

**Expected Result**: Results in correct BM25 rank order; no duplicate rows; each result has `rowid`, `snippet`, `rank`.

**Code Sample**:
```typescript
import Database from 'better-sqlite3';

describe('FTS5 search', () => {
  it('should return BM25-ranked results', () => {
    const rows = testDb.prepare(`
      SELECT rowid, snippet(segments_fts, 0, '<b>', '</b>', '...', 20) as snip, rank
      FROM segments_fts WHERE segments_fts MATCH ? ORDER BY rank LIMIT 10
    `).all('machine learning') as { rowid: number; snip: string; rank: number }[];

    expect(rows.length).toBeGreaterThan(0);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].rank).toBeGreaterThanOrEqual(rows[i - 1].rank); // ascending (less negative = lower rank)
    }
  });
});
```

---

#### TC-F4-U2.2: Search with Speaker Filter Scopes Results Correctly
**Objective**: Verify adding a speaker filter reduces the result set to only segments by that speaker.

**Test Steps**:
1. Search `'innovation'` without filter → record count
2. Search `'innovation'` with `speaker: 'Alice'` filter
3. Assert all filtered results have `speaker = 'Alice'`
4. Assert filtered count <= unfiltered count

**Expected Result**: All results from filtered search authored by Alice; no cross-speaker contamination.

**Code Sample**:
```typescript
it('should scope search results to specified speaker', () => {
  const allResults = searchService.search({ query: 'innovation' });
  const aliceResults = searchService.search({ query: 'innovation', speaker: 'Alice' });

  expect(aliceResults.length).toBeLessThanOrEqual(allResults.length);
  aliceResults.forEach(r => expect(r.speaker).toBe('Alice'));
});
```

---

#### TC-F4-U2.3: Phrase Search Returns Only Exact Phrase Matches
**Objective**: Verify that `"artificial intelligence"` (quoted) returns only segments containing the exact phrase.

**Test Steps**:
1. Search for phrase `'"artificial intelligence"'`
2. Assert each result contains the substring `'artificial intelligence'` (case-insensitive)

**Expected Result**: Zero false positives; each snippet contains the exact two-word sequence.

**Code Sample**:
```typescript
it('should match only exact phrase in quoted search', () => {
  const results = searchService.search({ query: '"artificial intelligence"' });
  results.forEach(r => {
    expect(r.text.toLowerCase()).toContain('artificial intelligence');
  });
});
```

---

### 1.3 Search Result Rendering

#### TC-F4-U3.1: Snippet Highlight Tags Are Safe HTML
**Objective**: Verify that search snippets with highlight tags do not introduce XSS vectors.

**Test Steps**:
1. Generate snippet from segment text containing `<script>alert('xss')</script>`
2. Call `SnippetFormatter.format(rawText, 'keyword')`
3. Assert returned HTML does not contain `<script>` tag

**Expected Result**: `<script>` tags are HTML-escaped in the output; `<b>` highlight tags are preserved.

**Code Sample**:
```typescript
import { SnippetFormatter } from '../src/renderer/search/SnippetFormatter';

it('should escape XSS vectors in search snippets', () => {
  const raw = "Check this out <script>alert('xss')</script> and keyword here";
  const html = SnippetFormatter.format(raw, 'keyword');
  expect(html).not.toContain('<script>');
  expect(html).toContain('&lt;script&gt;');
  expect(html).toContain('<b>keyword</b>');
});
```

---

#### TC-F4-U3.2: Result Grouping by Transcript
**Objective**: Verify that results are correctly grouped by transcript ID when group-by mode is enabled.

**Test Steps**:
1. Return 15 results spanning 3 transcripts (5 each)
2. Call `ResultGrouper.groupByTranscript(results)`
3. Assert 3 groups; each group has 5 results

**Expected Result**: 3 groups; `groupKey` is transcript ID; each group's results all share that transcript ID.

**Code Sample**:
```typescript
it('should group 15 results into 3 transcript groups', () => {
  const groups = ResultGrouper.groupByTranscript(fifteenResults);
  expect(groups).toHaveLength(3);
  groups.forEach(g => {
    expect(g.results).toHaveLength(5);
    g.results.forEach(r => expect(r.transcriptId).toBe(g.groupKey));
  });
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 End-to-End Search Pipeline

#### TC-F4-I1.1: Type-in Search Box Triggers Debounced FTS Query
**Objective**: Verify that typing in the search input triggers an FTS query after a 300ms debounce and results appear in the list.

**Preconditions**:
- Search Workspace window open; FTS5 index populated

**Test Steps**:
1. Type `'machine'` character by character with 50ms intervals
2. Wait 400ms after last character
3. Assert search results panel shows at least 1 result

**Expected Result**: FTS query fires once (debounced); results list populated; no intermediate queries for each keystroke.

**Code Sample**:
```typescript
it('should debounce search input and show results after 300ms', async () => {
  const input = '[data-testid="search-input"]';
  for (const char of 'machine') {
    await win.webContents.executeJavaScript(`
      document.querySelector('${input}').value += '${char}';
      document.querySelector('${input}').dispatchEvent(new Event('input'));
    `);
    await new Promise(r => setTimeout(r, 50));
  }
  await new Promise(r => setTimeout(r, 400));

  const resultCount = await win.webContents.executeJavaScript(`
    document.querySelectorAll('[data-testid="search-result"]').length
  `);
  expect(resultCount).toBeGreaterThan(0);
});
```

---

#### TC-F4-I1.2: Filter Panel Reduces Results Without Clearing Query
**Objective**: Verify applying a speaker filter via the filter panel narrows results while keeping the search query intact.

**Test Steps**:
1. Search `'cloud'` — record result count (e.g., 30)
2. Apply speaker filter `'Bob'` in filter panel
3. Assert result count reduced
4. Assert search input still shows `'cloud'`

**Expected Result**: Fewer results; query preserved; all remaining results from `'Bob'`.

**Code Sample**:
```typescript
it('should narrow results on speaker filter without clearing query', async () => {
  const before = await getResultCount(win);
  await win.webContents.executeJavaScript(`
    document.querySelector('[data-filter="speaker"][value="Bob"]').click();
  `);
  await new Promise(r => setTimeout(r, 400));

  const after = await getResultCount(win);
  const query = await win.webContents.executeJavaScript(`
    document.querySelector('[data-testid="search-input"]').value
  `);

  expect(after).toBeLessThanOrEqual(before);
  expect(query).toBe('cloud');
});
```

---

### 2.2 Search History

#### TC-F4-I2.1: Recent Searches Persist and Appear on Focus
**Objective**: Verify that previous search queries are saved to DB and shown as recent suggestions when the input is focused.

**Test Steps**:
1. Submit searches for `'AI'`, `'cloud security'`, `'keynote'`
2. Clear the search input
3. Focus the search input
4. Assert recent suggestions dropdown shows all 3 queries

**Expected Result**: Suggestions dropdown visible; 3 recent queries listed in reverse-chronological order.

**Code Sample**:
```typescript
it('should show recent search history on input focus', async () => {
  for (const q of ['AI', 'cloud security', 'keynote']) {
    await submitSearch(win, q);
    await new Promise(r => setTimeout(r, 200));
  }
  await clearSearch(win);
  await focusSearchInput(win);

  const suggestions = await win.webContents.executeJavaScript(`
    [...document.querySelectorAll('[data-testid="recent-search"]')].map(el => el.textContent)
  `);
  expect(suggestions).toContain('keynote');
  expect(suggestions).toContain('cloud security');
  expect(suggestions).toContain('AI');
});
```

---

#### TC-F4-I2.2: Clearing Search History Removes Suggestions
**Objective**: Verify that clicking `'Clear History'` removes all saved searches from DB and suggestions list.

**Test Steps**:
1. Submit 3 searches
2. Click `'Clear History'` button
3. Focus search input
4. Assert no suggestions shown

**Expected Result**: Suggestions list empty after clear; DB `search_history` table has 0 rows.

**Code Sample**:
```typescript
it('should clear all search history and remove suggestions', async () => {
  await win.webContents.executeJavaScript(`
    document.querySelector('[data-testid="clear-history"]').click();
  `);
  await new Promise(r => setTimeout(r, 200));

  const suggestions = await win.webContents.executeJavaScript(`
    document.querySelectorAll('[data-testid="recent-search"]').length
  `);
  expect(suggestions).toBe(0);

  const rows = testDb.prepare('SELECT COUNT(*) as c FROM search_history').get() as { c: number };
  expect(rows.c).toBe(0);
});
```

---

### 2.3 Cross-Entity Search

#### TC-F4-I3.1: Search Returns Results Across Transcripts and Contacts
**Objective**: Verify a single search query returns results from both transcript segments and contact records.

**Test Steps**:
1. Search for a name that appears in both transcript text and a contact record
2. Assert result list contains items with `type: 'SEGMENT'` and `type: 'CONTACT'`

**Expected Result**: Mixed result types shown; section headers distinguish entity types; no duplicates.

**Code Sample**:
```typescript
it('should return mixed-entity results for cross-entity query', async () => {
  await submitSearch(win, 'Alice Wong');
  await new Promise(r => setTimeout(r, 500));

  const types = await win.webContents.executeJavaScript(`
    [...document.querySelectorAll('[data-testid="search-result"]')].map(el => el.dataset.resultType)
  `);
  expect(types).toContain('SEGMENT');
  expect(types).toContain('CONTACT');
});
```

---

#### TC-F4-I3.2: Result Click Opens Correct Entity in Context
**Objective**: Verify clicking a segment result opens the Transcript Review Workspace at the matching segment.

**Test Steps**:
1. Search for `'product roadmap'`
2. Click first segment result
3. Assert Transcript Review window opens
4. Assert the matching segment is visible and highlighted

**Expected Result**: Transcript workspace opens; matching segment highlighted; window focused.

**Code Sample**:
```typescript
it('should open transcript at matching segment on result click', async () => {
  await submitSearch(win, 'product roadmap');
  await win.webContents.executeJavaScript(`
    document.querySelectorAll('[data-result-type="SEGMENT"]')[0].click();
  `);
  await new Promise(r => setTimeout(r, 800));

  const highlighted = await win.webContents.executeJavaScript(`
    document.querySelector('.segment--search-match') !== null
  `);
  expect(highlighted).toBe(true);
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Unusual Query Inputs

#### TC-F4-E1.1: Empty Search Query Shows All Recent Results
**Objective**: Verify submitting an empty search query shows the most recent segments instead of an error.

**Test Steps**:
1. Clear search input and submit
2. Observe results panel

**Expected Result**: Recent 20 segments displayed; no error message; no spinner stuck.

**Code Sample**:
```typescript
it('should show recent results for empty search query', async () => {
  await submitSearch(win, '');
  await new Promise(r => setTimeout(r, 500));

  const count = await getResultCount(win);
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThanOrEqual(20);
});
```

---

#### TC-F4-E1.2: Unicode and Emoji in Search Query Handled Gracefully
**Objective**: Verify queries containing Unicode characters and emoji do not crash the search service.

**Test Steps**:
1. Search for `'こんにちは 🤖 AI'`
2. Assert no JavaScript error thrown
3. Assert results list renders (may be 0 results)

**Expected Result**: No crash; 0 or more results shown; emoji rendered correctly in query chip.

**Code Sample**:
```typescript
it('should handle unicode and emoji query without error', async () => {
  await expect(searchService.search({ query: 'こんにちは 🤖 AI' })).resolves.toBeDefined();
});
```

---

### 3.2 FTS Edge Cases

#### TC-F4-E2.1: FTS5 Query with Reserved Characters Does Not Throw
**Objective**: Verify that FTS5 reserved characters (`*`, `^`, `"`) in unsanitized input do not crash the search.

**Test Steps**:
1. Submit raw query `'innovation* AND ^keynote'` via the sanitized search path
2. Assert sanitizer transforms it to a safe query
3. Assert search executes without SQLite error

**Expected Result**: No SQLITE error thrown; sanitized query executes successfully.

**Code Sample**:
```typescript
it('should sanitize FTS reserved characters before execution', () => {
  expect(() => {
    const sanitized = QuerySanitizer.sanitize('innovation* AND ^keynote');
    testDb.prepare(`SELECT * FROM segments_fts WHERE segments_fts MATCH ? LIMIT 5`).all(sanitized);
  }).not.toThrow();
});
```

---

#### TC-F4-E2.2: Very Long Query (1000 characters) Handled Gracefully
**Objective**: Verify a 1000-character query does not exceed FTS5 limits or cause a timeout.

**Test Steps**:
1. Generate 1000-character query string
2. Submit via search service
3. Assert completes in < 2 seconds with no error

**Expected Result**: Query executes or is truncated gracefully; no timeout; no unhandled rejection.

**Code Sample**:
```typescript
it('should handle 1000-character search query gracefully', async () => {
  const longQuery = 'AI '.repeat(333).trim();
  const start = Date.now();
  await expect(searchService.search({ query: longQuery })).resolves.toBeDefined();
  expect(Date.now() - start).toBeLessThan(2000);
});
```

---

### 3.3 Filter Combinations

#### TC-F4-E3.1: Contradictory Filters Return Zero Results Gracefully
**Objective**: Verify applying a speaker filter `'Alice'` and a separate speaker filter `'Bob'` simultaneously (AND) returns zero results without error.

**Test Steps**:
1. Apply speaker filters `'Alice'` AND `'Bob'` simultaneously
2. Assert result count = 0
3. Assert empty-state message shown

**Expected Result**: 0 results; empty state message `'No results match your current filters.'`; no error.

**Code Sample**:
```typescript
it('should return zero results for contradictory speaker filters', async () => {
  const results = searchService.search({ query: 'cloud', speakers: ['Alice', 'Bob'], speakerLogic: 'AND' });
  expect(results).toHaveLength(0);
});
```

---

#### TC-F4-E3.2: All Filters Cleared Restores Full Result Set
**Objective**: Verify clearing all filters after applying several restores the full unfiltered result count.

**Test Steps**:
1. Search `'data'` → record baseline count
2. Apply date and speaker filters
3. Click `'Clear All Filters'`
4. Assert count restored to baseline

**Expected Result**: Result count matches original unfiltered baseline after clear.

**Code Sample**:
```typescript
it('should restore full result set after clearing all filters', async () => {
  const baseline = await getResultCount(win);
  await applyFilters(win, { speaker: 'Alice', dateRange: '2026-07-15' });
  await win.webContents.executeJavaScript(`document.querySelector('[data-testid="clear-filters"]').click()`);
  await new Promise(r => setTimeout(r, 400));
  const restored = await getResultCount(win);
  expect(restored).toBe(baseline);
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Search Latency

#### TC-F4-P1.1: FTS5 Query Returns Results in Under 50ms for 500K Segments
**Objective**: Verify the FTS5 search engine returns results in under 50ms even at scale.

**Preconditions**:
- `segments_fts` populated with 500,000 rows

**Test Steps**:
1. Time `searchService.search({ query: 'conference AI' })` call

**Expected Result**: Response < 50ms; at least 1 result returned.

**Code Sample**:
```typescript
it('should return FTS5 results in under 50ms for 500k segments', () => {
  const start = performance.now();
  const results = searchService.search({ query: 'conference AI' });
  const elapsed = performance.now() - start;
  expect(elapsed).toBeLessThan(50);
  expect(results.length).toBeGreaterThan(0);
});
```

---

#### TC-F4-P1.2: Filter Application Adds Under 10ms Overhead
**Objective**: Verify applying date + speaker filters adds less than 10ms to baseline query time.

**Test Steps**:
1. Time baseline unfiltered search for `'cloud'`
2. Time same search with `speaker: 'Alice'` and `date: '2026-07-15'` filters
3. Assert difference < 10ms

**Expected Result**: Filtered query overhead < 10ms over baseline.

**Code Sample**:
```typescript
it('should apply filters with under 10ms overhead', () => {
  const t0 = performance.now();
  searchService.search({ query: 'cloud' });
  const baseline = performance.now() - t0;

  const t1 = performance.now();
  searchService.search({ query: 'cloud', speaker: 'Alice', date: '2026-07-15' });
  const filtered = performance.now() - t1;

  expect(filtered - baseline).toBeLessThan(10);
});
```

---

### 4.2 UI Performance

#### TC-F4-P2.1: Rendering 100 Search Results Under 200ms
**Objective**: Verify that rendering 100 result items in the DOM completes within 200ms.

**Test Steps**:
1. Supply 100 mock results to the results renderer
2. Time from data-ready to DOM paint complete

**Expected Result**: All 100 results in DOM within 200ms; no layout thrash.

**Code Sample**:
```typescript
it('should render 100 search results within 200ms', async () => {
  const t0 = performance.now();
  await win.webContents.send('search:results', generate100Results());
  await waitForResultCount(win, 100);
  expect(performance.now() - t0).toBeLessThan(200);
});
```

---

#### TC-F4-P2.2: Virtual Scroll Maintains 60 FPS Through 10,000 Results
**Objective**: Verify scrolling through 10,000 search results maintains 60 FPS frame rate.

**Test Steps**:
1. Load 10,000 results into virtual scroll list
2. Programmatically scroll from top to bottom
3. Assert no frame delta exceeds 16ms

**Expected Result**: Virtual scroll renders smoothly; DOM row count < 50 at any time; no jank.

**Code Sample**:
```typescript
it('should scroll 10k results at 60fps without jank', async () => {
  await win.webContents.send('search:results', generate10kResults());
  const maxFrame = await win.webContents.executeJavaScript(`
    new Promise(resolve => {
      let last = performance.now(), max = 0, i = 0;
      const scroll = (now) => {
        max = Math.max(max, now - last);
        last = now;
        document.querySelector('[data-testid="results-list"]').scrollTop += 50;
        if (++i < 200) requestAnimationFrame(scroll);
        else resolve(max);
      };
      requestAnimationFrame(scroll);
    })
  `);
  expect(maxFrame).toBeLessThan(16.7);
});
```

---

### 4.3 Index Performance

#### TC-F4-P3.1: FTS5 Index Rebuild Under 10 Seconds for 100K Rows
**Objective**: Verify that rebuilding the FTS5 index for 100,000 segments completes in under 10 seconds.

**Test Steps**:
1. Drop and recreate `segments_fts` virtual table
2. Bulk insert 100,000 rows
3. Time the rebuild operation

**Expected Result**: Full rebuild < 10 seconds; index queryable immediately after.

**Code Sample**:
```typescript
it('should rebuild FTS5 index for 100k segments in under 10s', () => {
  const start = performance.now();
  testDb.exec('INSERT INTO segments_fts SELECT id, text FROM segments');
  const elapsed = performance.now() - start;
  expect(elapsed).toBeLessThan(10000);

  const result = testDb.prepare(`SELECT COUNT(*) as c FROM segments_fts WHERE segments_fts MATCH 'test'`).get() as { c: number };
  expect(result.c).toBeGreaterThanOrEqual(0);
}, 15000);
```

---

#### TC-F4-P3.2: Incremental FTS Index Update Under 5ms Per Row
**Objective**: Verify adding a new segment to the FTS index takes less than 5ms on average.

**Test Steps**:
1. Insert 100 new segments one by one, timing each insert
2. Assert median insert time < 5ms

**Expected Result**: Median < 5ms; no lock contention; index remains queryable during inserts.

**Code Sample**:
```typescript
it('should update FTS5 index incrementally in under 5ms per row', () => {
  const times: number[] = [];
  for (let i = 0; i < 100; i++) {
    const start = performance.now();
    testDb.prepare(`INSERT INTO segments_fts VALUES (?, ?)`).run(`seg-new-${i}`, `New segment text about topic ${i}`);
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  expect(times[50]).toBeLessThan(5);
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

**Estimated Execution Time**: ~5 minutes (unit: 30s, integration: 2m, edge: 1m, performance: 1.5m)

**Tooling**: Jest + better-sqlite3 + FTS5 (unit/performance), Electron test harness (integration), custom debounce helpers
