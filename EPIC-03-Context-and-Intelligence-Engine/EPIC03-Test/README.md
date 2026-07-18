# EPIC03 Test Suite — Context & Intelligence Engine

Comprehensive test cases for all 8 features of EPIC-03. Each file follows a consistent structure covering unit tests, integration tests, edge case validation, and performance validation (~30 test cases per feature).

---

## Feature Index

| # | Feature | Test File |
|---|---------|-----------|
| 1 | Conference Classification | [EPIC03-feature-1-test-cases.md](./EPIC03-feature-1-test-cases.md) |
| 2 | Interaction-Type Classification | [EPIC03-feature-2-test-cases.md](./EPIC03-feature-2-test-cases.md) |
| 3 | Intent Inference | [EPIC03-feature-3-test-cases.md](./EPIC03-feature-3-test-cases.md) |
| 4 | Topic Extraction | [EPIC03-feature-4-test-cases.md](./EPIC03-feature-4-test-cases.md) |
| 5 | Context Tagging | [EPIC03-feature-5-test-cases.md](./EPIC03-feature-5-test-cases.md) |
| 6 | Entity Extraction | [EPIC03-feature-6-test-cases.md](./EPIC03-feature-6-test-cases.md) |
| 7 | Minimal Clarification Prompts | [EPIC03-feature-7-test-cases.md](./EPIC03-feature-7-test-cases.md) |
| 8 | Semantic Enrichment | [EPIC03-feature-8-test-cases.md](./EPIC03-feature-8-test-cases.md) |

---

## Test Structure (per file)

Each test file is organized into four sections:

1. **Unit Test Scenarios** — 3 suites, ~12 test cases
2. **Integration Test Scenarios** — 3 suites, 6 test cases
3. **Edge Case Validation** — 3 suites, 6 test cases
4. **Performance Validation** — 3 suites, 6 test cases

**Total per feature**: ~30 comprehensive test cases

---

## TC ID Convention

| Prefix | Meaning |
|--------|---------|
| `TC-F{N}-U{suite}.{case}` | Unit test |
| `TC-F{N}-I{suite}.{case}` | Integration test |
| `TC-F{N}-E{suite}.{case}` | Edge case |
| `TC-F{N}-P{suite}.{case}` | Performance test |

Where `{N}` is the feature number (1–8).

---

## Related Artifacts

- User stories: `../EPIC03-UserStories/`
- Epic specification: EPIC-03 — Context & Intelligence Engine
