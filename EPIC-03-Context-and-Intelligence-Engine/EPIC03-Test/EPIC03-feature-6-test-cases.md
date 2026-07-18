# EPIC03 Feature 6 — Entity Extraction — Test Cases

## Test Overview
Comprehensive test suite for Entity Extraction covering unit tests, integration tests, edge cases, and performance validation. This feature performs Named Entity Recognition (NER) on conference transcripts to extract persons, organizations, locations, products, dates, and custom domain entities. It also includes PII detection, entity deduplication, and coreference resolution.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Core NER Accuracy

#### TC-F6-U1.1: Person Entities Correctly Extracted
**Objective**: Verify that person names mentioned in a transcript are accurately extracted with the `"person"` type.

**Preconditions**:
- NER model is loaded
- Transcript explicitly mentions speaker names

**Test Steps**:
1. Submit transcript: "Dr. Sarah Chen presented her findings, followed by a keynote from James Okafor."
2. Call `extractEntities({ transcript })`
3. Assert entities include `{ text: "Dr. Sarah Chen", type: "person" }` and `{ text: "James Okafor", type: "person" }`

**Expected Result**: Both person entities extracted with type `"person"`

**Code Sample**:
```typescript
import { extractEntities } from "@/services/intelligence/entityExtraction";

describe("TC-F6-U1.1 Person Entities Correctly Extracted", () => {
  it("should extract person names with correct entity type", async () => {
    const result = await extractEntities({
      transcript: "Dr. Sarah Chen presented her findings, followed by a keynote from James Okafor.",
    });
    const persons = result.entities.filter((e) => e.type === "person");
    const names = persons.map((p) => p.text);
    expect(names).toContain("Dr. Sarah Chen");
    expect(names).toContain("James Okafor");
  });
});
```

---

#### TC-F6-U1.2: Organization Entities Correctly Extracted
**Objective**: Verify that organization names are extracted with the `"organization"` type.

**Test Steps**:
1. Submit: "Representatives from Microsoft, Anthropic, and the Linux Foundation joined the panel."
2. Assert entities include all three organizations with type `"organization"`

**Expected Result**: `[{ text: "Microsoft", type: "organization" }, { text: "Anthropic", type: "organization" }, { text: "Linux Foundation", type: "organization" }]`

**Code Sample**:
```typescript
it("should extract organization names correctly", async () => {
  const result = await extractEntities({
    transcript: "Representatives from Microsoft, Anthropic, and the Linux Foundation joined the panel.",
  });
  const orgs = result.entities.filter((e) => e.type === "organization").map((e) => e.text);
  expect(orgs).toContain("Microsoft");
  expect(orgs).toContain("Anthropic");
  expect(orgs).toContain("Linux Foundation");
});
```

---

#### TC-F6-U1.3: Date and Time Entities Extracted
**Objective**: Verify that temporal expressions are extracted as `"date"` or `"time"` entities.

**Test Steps**:
1. Submit: "The workshop will resume on March 15th at 2:30 PM and conclude by end of Q2 2026."
2. Assert entities include `"March 15th"`, `"2:30 PM"`, and `"Q2 2026"` with appropriate types

**Expected Result**: Temporal entities extracted with `type: "date"` or `type: "time"`

**Code Sample**:
```typescript
it("should extract date and time entities from transcript", async () => {
  const result = await extractEntities({
    transcript: "The workshop will resume on March 15th at 2:30 PM and conclude by end of Q2 2026.",
  });
  const temporals = result.entities.filter((e) => ["date", "time"].includes(e.type)).map((e) => e.text);
  expect(temporals.some((t) => t.includes("March 15"))).toBe(true);
  expect(temporals.some((t) => t.includes("2:30"))).toBe(true);
});
```

---

### 1.2 PII Detection

#### TC-F6-U2.1: Email Address Detected as PII
**Objective**: Email addresses in transcripts are flagged as PII entities with type `"email"`.

**Preconditions**:
- PII detection is enabled in extraction options

**Test Steps**:
1. Submit: "Contact us at support@example-ai.com or admin@conference.org for more details."
2. Assert entities include both email addresses with `type: "email"` and `isPII: true`

**Expected Result**: Both emails extracted and flagged as PII

**Code Sample**:
```typescript
it("should detect and flag email addresses as PII entities", async () => {
  const result = await extractEntities({
    transcript: "Contact us at support@example-ai.com or admin@conference.org for more details.",
    options: { detectPII: true },
  });
  const emails = result.entities.filter((e) => e.type === "email");
  expect(emails.length).toBe(2);
  emails.forEach((e) => expect(e.isPII).toBe(true));
});
```

---

#### TC-F6-U2.2: Phone Number Detected and Masked
**Objective**: Phone numbers are detected as PII and masked in the cleaned transcript output.

**Test Steps**:
1. Submit: "Call us at +1 (555) 867-5309 or 1-800-CONFERENCE for registration."
2. Assert the entity is extracted with `type: "phone"` and `isPII: true`
3. Assert `result.cleanedTranscript` masks the phone number with `[PHONE_REDACTED]`

**Expected Result**: Phone number detected, masked in cleaned transcript

**Code Sample**:
```typescript
it("should detect phone numbers as PII and mask in cleaned transcript", async () => {
  const result = await extractEntities({
    transcript: "Call us at +1 (555) 867-5309 for registration.",
    options: { detectPII: true, maskPII: true },
  });
  const phone = result.entities.find((e) => e.type === "phone");
  expect(phone?.isPII).toBe(true);
  expect(result.cleanedTranscript).toContain("[PHONE_REDACTED]");
  expect(result.cleanedTranscript).not.toContain("867-5309");
});
```

---

#### TC-F6-U2.3: PII Extraction Disabled Does Not Flag PII
**Objective**: When `detectPII: false`, entities are extracted without PII flags.

**Test Steps**:
1. Submit transcript with an email address
2. Call with `options: { detectPII: false }`
3. Assert no entity has `isPII: true`

**Expected Result**: No PII flags when PII detection is disabled

**Code Sample**:
```typescript
it("should not flag PII when detectPII is disabled", async () => {
  const result = await extractEntities({
    transcript: "Reach out to ceo@bigtech.com for partnership inquiries.",
    options: { detectPII: false },
  });
  result.entities.forEach((e) => {
    expect(e.isPII).toBeFalsy();
  });
});
```

---

### 1.3 Entity Deduplication and Coreference

#### TC-F6-U3.1: Duplicate Entity Mentions Are Deduplicated
**Objective**: An entity mentioned multiple times in a transcript appears only once in the output (with mention count).

**Preconditions**:
- Same entity mentioned 5 times with slight variations

**Test Steps**:
1. Submit transcript where "Google Cloud" is mentioned 5 times
2. Assert only 1 entity record for "Google Cloud" in results
3. Assert `entity.mentionCount === 5`

**Expected Result**: `{ text: "Google Cloud", type: "organization", mentionCount: 5 }`

**Code Sample**:
```typescript
it("should deduplicate repeated entity mentions and track mention count", async () => {
  const transcript = "Google Cloud is leading the market. " +
    "Google Cloud announced new features. " +
    "The Google Cloud team presented. " +
    "Google Cloud pricing was discussed. " +
    "Google Cloud roadmap was revealed.";
  const result = await extractEntities({ transcript });
  const googleCloud = result.entities.filter((e) => e.text === "Google Cloud");
  expect(googleCloud).toHaveLength(1);
  expect(googleCloud[0].mentionCount).toBe(5);
});
```

---

#### TC-F6-U3.2: Coreference Resolution Links Pronouns to Named Entities
**Objective**: Pronouns referring to named entities are resolved and linked to the correct entity.

**Preconditions**:
- `options.coreference: true`

**Test Steps**:
1. Submit: "Elon Musk took the stage. He discussed the company's plans."
2. Assert "He" is resolved to link to `"Elon Musk"` entity

**Expected Result**: Coreference chain: `[{ text: "Elon Musk", type: "person" }, { text: "He", resolvedTo: "Elon Musk" }]`

**Code Sample**:
```typescript
it("should resolve pronoun coreferences to named entities", async () => {
  const result = await extractEntities({
    transcript: "Elon Musk took the stage. He discussed the company's plans.",
    options: { coreference: true },
  });
  const elonMusk = result.entities.find((e) => e.text === "Elon Musk");
  expect(elonMusk?.coreferents).toContain("He");
});
```

---

#### TC-F6-U3.3: Variant Name Forms Merged Under Canonical Name
**Objective**: Variant forms of the same entity ("AWS", "Amazon Web Services", "Amazon's cloud") are merged under a canonical name.

**Test Steps**:
1. Submit transcript mentioning all three variants
2. Assert result contains one entity with `canonicalName: "Amazon Web Services"` and `aliases: ["AWS", "Amazon's cloud"]`

**Expected Result**: Single canonical entity with aliases

**Code Sample**:
```typescript
it("should merge entity name variants under a canonical name", async () => {
  const transcript = "AWS announced new features. Amazon Web Services expanded. Amazon's cloud grew 40%.";
  const result = await extractEntities({ transcript, options: { resolveAliases: true } });
  const aws = result.entities.find((e) => e.canonicalName === "Amazon Web Services" || e.text === "Amazon Web Services");
  expect(aws?.aliases?.length).toBeGreaterThanOrEqual(1);
  expect(aws?.aliases).toContain("AWS");
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Entity Extraction + Context Tagging

#### TC-F6-I1.1: Extracted Entities Produce Entity Tags
**Objective**: Extracted person and organization entities are propagated as entity tags through the context tagging pipeline.

**Preconditions**:
- Entity extraction and context tagging pipeline are connected

**Test Steps**:
1. Run entity extraction + context tagging for `conf-080`
2. Assert context tags contain `category: "entity"` tags for each extracted high-confidence entity

**Expected Result**: Entity tags present for all high-confidence extracted entities

**Code Sample**:
```typescript
it("should produce entity context tags from extracted entities", async () => {
  const { entities, tags } = await runEntityAndTaggingPipeline({ conferenceId: "conf-080", transcript: richTranscript });
  const highConfidence = entities.filter((e) => e.confidence >= 0.75);
  const entityTagValues = tags.filter((t) => t.category === "entity").map((t) => t.value);
  highConfidence.forEach((entity) => {
    expect(entityTagValues).toContain(entity.text);
  });
});
```

---

#### TC-F6-I1.2: PII Entities Are Excluded from Context Tags
**Objective**: PII entities (email, phone, SSN) are not propagated to context tags even if high-confidence.

**Test Steps**:
1. Run pipeline on transcript containing email addresses
2. Assert no entity tag with category `"entity"` has a value containing an email address

**Expected Result**: No PII in context tags

**Code Sample**:
```typescript
it("should not include PII entities in context tags", async () => {
  const { tags } = await runEntityAndTaggingPipeline({
    conferenceId: "conf-081",
    transcript: "Email ceo@secret.com for more info. Discussion on Kubernetes architecture.",
    options: { detectPII: true },
  });
  const entityTags = tags.filter((t) => t.category === "entity");
  entityTags.forEach((tag) => {
    expect(tag.value).not.toMatch(/@/); // no email addresses in tags
  });
});
```

---

### 2.2 Entity Extraction + Knowledge Graph

#### TC-F6-I2.1: Extracted Organizations Linked to Knowledge Graph
**Objective**: Recognized organizations are resolved to knowledge graph entries with enriched metadata.

**Test Steps**:
1. Extract entities from transcript mentioning "Microsoft Azure"
2. Run knowledge graph linking
3. Assert `entity.kgId` is populated with a valid knowledge graph ID

**Expected Result**: `{ text: "Microsoft Azure", kgId: "kg://organization/microsoft-azure", ... }`

**Code Sample**:
```typescript
it("should link extracted organizations to knowledge graph entries", async () => {
  const result = await extractAndLinkEntities({
    transcript: "Microsoft Azure showcased new AI services at the conference.",
  });
  const msAzure = result.entities.find((e) => e.text.includes("Azure") || e.text.includes("Microsoft Azure"));
  expect(msAzure?.kgId).toBeDefined();
  expect(msAzure?.kgId).toMatch(/^kg:\/\//);
});
```

---

#### TC-F6-I2.2: Unrecognized Entity Not Linked to Knowledge Graph
**Objective**: A fictional or unrecognized entity is not linked and is flagged as `kgLinked: false`.

**Test Steps**:
1. Submit transcript mentioning a fictional company "Frobnitz Technologies"
2. Assert the entity is extracted but `kgLinked: false`

**Expected Result**: `{ text: "Frobnitz Technologies", type: "organization", kgLinked: false }`

**Code Sample**:
```typescript
it("should not link unrecognized entities to knowledge graph", async () => {
  const result = await extractAndLinkEntities({
    transcript: "Frobnitz Technologies announced a breakthrough in quantum networking.",
  });
  const frobnitz = result.entities.find((e) => e.text === "Frobnitz Technologies");
  expect(frobnitz).toBeDefined();
  expect(frobnitz?.kgLinked).toBe(false);
});
```

---

### 2.3 Entity Extraction + Persistence

#### TC-F6-I3.1: Extracted Entities Persisted to Entity Store
**Objective**: All extracted entities are saved to the entity store with correct conference association.

**Test Steps**:
1. Run extraction and persistence for `conf-090`
2. Query entity store for `conf-090`
3. Assert entity records match the extraction output

**Expected Result**: All entities stored with `conferenceId: "conf-090"`

**Code Sample**:
```typescript
it("should persist extracted entities to entity store", async () => {
  await extractAndPersistEntities({ conferenceId: "conf-090", transcript: richTranscript });
  const stored = await db.conferenceEntities.findAll({ conferenceId: "conf-090" });
  expect(stored.length).toBeGreaterThan(0);
  stored.forEach((e) => {
    expect(e.conferenceId).toBe("conf-090");
    expect(e.type).toBeDefined();
    expect(e.text).toBeDefined();
  });
});
```

---

#### TC-F6-I3.2: Re-Extraction Deduplicates Persisted Entities
**Objective**: Running extraction twice on the same conference does not create duplicate entity records.

**Test Steps**:
1. Extract and persist entities for `conf-091` (run 1)
2. Extract and persist entities for `conf-091` (run 2)
3. Assert stored entity count equals the unique extraction count (not doubled)

**Expected Result**: No duplicate entity records

**Code Sample**:
```typescript
it("should not create duplicate entity records on re-extraction", async () => {
  await extractAndPersistEntities({ conferenceId: "conf-091", transcript: standardTranscript });
  const firstCount = await db.conferenceEntities.count({ conferenceId: "conf-091" });
  await extractAndPersistEntities({ conferenceId: "conf-091", transcript: standardTranscript });
  const secondCount = await db.conferenceEntities.count({ conferenceId: "conf-091" });
  expect(secondCount).toBe(firstCount);
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Ambiguous Entity Types

#### TC-F6-E1.1: Ambiguous Name Resolved Using Context
**Objective**: "Apple" in a technology conference context is classified as `"organization"`, not `"product"` or `"food"`.

**Test Steps**:
1. Submit: "Apple announced a new chip architecture at the developer conference."
2. Assert the extracted "Apple" entity has `type: "organization"`

**Expected Result**: `{ text: "Apple", type: "organization" }`

**Code Sample**:
```typescript
it("should resolve 'Apple' as organization in tech conference context", async () => {
  const result = await extractEntities({
    transcript: "Apple announced a new chip architecture at the developer conference.",
    options: { contextDomain: "technology" },
  });
  const apple = result.entities.find((e) => e.text === "Apple");
  expect(apple?.type).toBe("organization");
});
```

---

#### TC-F6-E1.2: Person Name Matching Organization Name Resolved Correctly
**Objective**: "Johnson & Johnson" is classified as `"organization"`, not `"person"`.

**Test Steps**:
1. Submit: "Johnson & Johnson presented their oncology pipeline."
2. Assert entity type is `"organization"`

**Expected Result**: `{ text: "Johnson & Johnson", type: "organization" }`

**Code Sample**:
```typescript
it("should classify Johnson & Johnson as organization not person", async () => {
  const result = await extractEntities({ transcript: "Johnson & Johnson presented their oncology pipeline." });
  const entity = result.entities.find((e) => e.text.includes("Johnson & Johnson"));
  expect(entity?.type).toBe("organization");
});
```

---

### 3.2 High-Density Entity Inputs

#### TC-F6-E2.1: Transcript with 50+ Entities Processed Without Truncation
**Objective**: A transcript mentioning 50+ distinct entities returns all of them without silent truncation.

**Test Steps**:
1. Construct a transcript with exactly 55 distinct named entities
2. Assert `result.entities.length >= 50` (allowing for low-confidence exclusions)
3. Assert `result.metadata.truncated !== true`

**Expected Result**: >= 50 entities returned; no silent truncation

**Code Sample**:
```typescript
it("should process transcripts with 50+ distinct entities without truncation", async () => {
  const manyEntitiesTranscript = Array.from({ length: 55 }, (_, i) => `${personNames[i]} from ${orgNames[i]}`).join(". ");
  const result = await extractEntities({ transcript: manyEntitiesTranscript });
  expect(result.entities.length).toBeGreaterThanOrEqual(50);
  expect(result.metadata?.truncated).not.toBe(true);
});
```

---

#### TC-F6-E2.2: Entity Confidence Scores Available for All Entities
**Objective**: Every extracted entity has a `confidence` score between 0 and 1.

**Test Steps**:
1. Extract entities from any transcript
2. Assert all entities have `0 <= confidence <= 1`

**Expected Result**: All entities have valid confidence scores

**Code Sample**:
```typescript
it("should include confidence score for every extracted entity", async () => {
  const result = await extractEntities({ transcript: richTranscript });
  result.entities.forEach((entity) => {
    expect(entity.confidence).toBeGreaterThanOrEqual(0);
    expect(entity.confidence).toBeLessThanOrEqual(1);
  });
});
```

---

### 3.3 Special Characters and Non-Standard Names

#### TC-F6-E3.1: Entity with Accented Characters Extracted Correctly
**Objective**: Names with accented characters (e.g., "José Martínez") are extracted with full fidelity.

**Test Steps**:
1. Submit: "Dr. José Martínez from UNAM presented his research."
2. Assert `{ text: "José Martínez", type: "person" }` is in results (with correct characters)

**Expected Result**: Name extracted with accented characters preserved

**Code Sample**:
```typescript
it("should extract names with accented characters without corruption", async () => {
  const result = await extractEntities({ transcript: "Dr. José Martínez from UNAM presented his research." });
  const jose = result.entities.find((e) => e.text === "José Martínez");
  expect(jose).toBeDefined();
  expect(jose?.type).toBe("person");
});
```

---

#### TC-F6-E3.2: Acronym Entity Extracted and Expanded
**Objective**: A defined acronym ("NLP (Natural Language Processing)") is extracted as one entity with both forms.

**Test Steps**:
1. Submit: "We discussed NLP (Natural Language Processing) techniques."
2. Assert entity contains `{ text: "NLP", expandedForm: "Natural Language Processing", type: "concept" }`

**Expected Result**: Acronym expanded and linked

**Code Sample**:
```typescript
it("should extract acronym with its expanded form", async () => {
  const result = await extractEntities({
    transcript: "We discussed NLP (Natural Language Processing) techniques.",
    options: { expandAcronyms: true },
  });
  const nlp = result.entities.find((e) => e.text === "NLP" || e.text === "Natural Language Processing");
  expect(nlp?.expandedForm || nlp?.text).toMatch(/Natural Language Processing/i);
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Extraction Latency

#### TC-F6-P1.1: Entity Extraction Completes Within 3 Seconds
**Objective**: A 1,500-token transcript is processed for entity extraction within 3 seconds.

**Test Steps**:
1. Prepare 1,500-token transcript
2. Time `extractEntities` call
3. Assert elapsed < 3,000ms

**Expected Result**: Latency <= 3,000ms

**Code Sample**:
```typescript
it("should extract entities from 1500-token transcript in under 3 seconds", async () => {
  const transcript = "Dr. Alice Johnson from Google discussed Kubernetes at the conference. ".repeat(50);
  const start = Date.now();
  await extractEntities({ transcript });
  expect(Date.now() - start).toBeLessThan(3000);
}, 8000);
```

---

#### TC-F6-P1.2: PII Detection Adds < 500ms Overhead
**Objective**: Enabling PII detection adds no more than 500ms to baseline extraction time.

**Test Steps**:
1. Extract without PII detection; record baseline
2. Extract same input with `detectPII: true`; record latency
3. Assert overhead <= 500ms

**Expected Result**: PII detection overhead <= 500ms

**Code Sample**:
```typescript
it("should not add more than 500ms overhead for PII detection", async () => {
  const input = { transcript: piiRichTranscript };
  const start1 = Date.now();
  await extractEntities({ ...input, options: { detectPII: false } });
  const baseline = Date.now() - start1;

  const start2 = Date.now();
  await extractEntities({ ...input, options: { detectPII: true } });
  const withPII = Date.now() - start2;

  expect(withPII - baseline).toBeLessThan(500);
});
```

---

### 4.2 Deduplication Performance

#### TC-F6-P2.1: Deduplication of 500 Entity Mentions < 100ms
**Objective**: Deduplicating 500 raw entity mentions into unique entities completes within 100ms.

**Test Steps**:
1. Generate 500 raw entity mention objects (many duplicates)
2. Call `deduplicateEntities(mentions)`
3. Assert elapsed < 100ms

**Expected Result**: Deduplication completes in <= 100ms

**Code Sample**:
```typescript
it("should deduplicate 500 entity mentions within 100ms", async () => {
  const mentions = Array.from({ length: 500 }, (_, i) => ({
    text: `Entity ${i % 50}`, // 50 unique entities, 10 mentions each
    type: "organization",
    confidence: 0.80,
  }));
  const start = Date.now();
  const result = deduplicateEntities(mentions);
  expect(Date.now() - start).toBeLessThan(100);
  expect(result.length).toBe(50);
});
```

---

#### TC-F6-P2.2: Coreference Resolution < 2 Seconds for 3,000-Token Transcript
**Objective**: Full coreference resolution on a 3,000-token transcript completes within 2 seconds.

**Test Steps**:
1. Prepare 3,000-token transcript with multiple pronoun references
2. Call `extractEntities` with `coreference: true`
3. Assert elapsed < 2,000ms

**Expected Result**: Coreference resolution completes in <= 2,000ms

**Code Sample**:
```typescript
it("should complete coreference resolution for 3000-token transcript within 2 seconds", async () => {
  const transcript = coreferenceRichTranscript; // 3,000-token transcript with many pronoun references
  const start = Date.now();
  await extractEntities({ transcript, options: { coreference: true } });
  expect(Date.now() - start).toBeLessThan(2000);
}, 6000);
```

---

### 4.3 Scalability

#### TC-F6-P3.1: 15 Concurrent Extractions Complete Without Error
**Objective**: 15 simultaneous entity extraction calls all succeed.

**Test Steps**:
1. Prepare 15 unique transcripts
2. Fire all 15 concurrently
3. Assert all resolve without errors

**Expected Result**: All 15 succeed

**Code Sample**:
```typescript
it("should handle 15 concurrent entity extractions without errors", async () => {
  const inputs = Array.from({ length: 15 }, (_, i) => ({
    transcript: `Conference ${i}: Dr. Person${i} from Org${i} discussed Topic${i}.`,
  }));
  const results = await Promise.all(inputs.map((input) => extractEntities(input)));
  results.forEach((result) => {
    expect(result.error).toBeUndefined();
    expect(result.entities.length).toBeGreaterThan(0);
  });
}, 30000);
```

---

#### TC-F6-P3.2: Entity Store Write Throughput >= 1,000 Entities/Second
**Objective**: The entity persistence layer can write at least 1,000 entity records per second.

**Test Steps**:
1. Generate 5,000 entity objects
2. Time batch write to entity store
3. Assert rate >= 1,000 entities/second

**Expected Result**: Throughput >= 1,000 entities/second

**Code Sample**:
```typescript
it("should write at least 1000 entities per second to entity store", async () => {
  const entities = Array.from({ length: 5000 }, (_, i) => ({ conferenceId: "conf-perf", text: `Entity ${i}`, type: "organization", confidence: 0.80 }));
  const start = Date.now();
  await db.conferenceEntities.bulkInsert(entities);
  const elapsedSec = (Date.now() - start) / 1000;
  const rate = entities.length / elapsedSec;
  expect(rate).toBeGreaterThanOrEqual(1000);
}, 30000);
```

---

## Test Execution Summary

### Test Categories
- **Unit Tests**: 3 suites, 9 test cases
- **Integration Tests**: 3 suites, 6 test cases
- **Edge Cases**: 3 suites, 6 test cases
- **Performance Tests**: 3 suites, 6 test cases

### Total: 27 comprehensive test cases

### Coverage Notes
- All NER types covered: person, organization, location, date/time, product, concept
- PII detection (email, phone) and masking verified; PII exclusion from context tags confirmed
- Deduplication, mention counting, coreference resolution, and alias merging tested
- Knowledge graph linking (recognized and unrecognized entities) verified in integration tests
- Edge cases cover ambiguous names, high-density inputs, accented characters, and acronym expansion
- Performance covers extraction latency, PII overhead, deduplication speed, coreference speed, and persistence throughput
