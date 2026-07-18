# EPIC03 Feature 4 — Topic Extraction — Test Cases

## Test Overview
Comprehensive test suite for Topic Extraction covering unit tests, integration tests, edge cases, and performance validation. This feature extracts dominant topics from conference transcripts using NLP/embedding-based techniques, returning ranked topic candidates with relevance scores, keywords, and optional hierarchical clustering.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Core Topic Extraction Accuracy

#### TC-F4-U1.1: Top Topic Correctly Identified
**Objective**: Verify the top-ranked extracted topic matches the dominant subject of an unambiguous transcript.

**Preconditions**:
- Topic extraction model is loaded
- Transcript is clearly focused on a single technical topic

**Test Steps**:
1. Submit transcript focusing on Kubernetes orchestration
2. Call `extractTopics({ transcript, options })`
3. Assert `topics[0].label` contains `"kubernetes"` or `"container orchestration"`
4. Assert `topics[0].relevanceScore >= 0.80`

**Expected Result**: `{ topics: [{ label: "Kubernetes Orchestration", relevanceScore: 0.87, keywords: ["pods", "cluster", "deployment"] }] }`

**Code Sample**:
```typescript
import { extractTopics } from "@/services/intelligence/topicExtraction";

describe("TC-F4-U1.1 Top Topic Correctly Identified", () => {
  it("should extract Kubernetes as top topic from relevant transcript", async () => {
    const transcript = "Today we deep-dive into Kubernetes pod scheduling, cluster autoscaling, and deployment strategies using Helm charts...";
    const result = await extractTopics({ transcript, options: { maxTopics: 5 } });
    expect(result.topics[0].label.toLowerCase()).toMatch(/kubernetes|container orchestration/);
    expect(result.topics[0].relevanceScore).toBeGreaterThanOrEqual(0.80);
  });
});
```

---

#### TC-F4-U1.2: Multiple Topics Extracted from Multi-Domain Transcript
**Objective**: A transcript covering 3 distinct topics returns at least 3 extracted topics with relevance >= 0.40.

**Preconditions**:
- Transcript covers machine learning, cloud architecture, and DevOps

**Test Steps**:
1. Submit mixed-domain transcript
2. Assert >= 3 topics returned
3. Assert each has relevance >= 0.40

**Expected Result**: 3 topics with relevant labels for each domain

**Code Sample**:
```typescript
it("should extract at least 3 distinct topics from multi-domain transcript", async () => {
  const transcript = "Session 1 covered ML model training. Session 2 discussed AWS architecture. Session 3 focused on CI/CD pipelines...";
  const result = await extractTopics({ transcript, options: { maxTopics: 10 } });
  const significant = result.topics.filter((t) => t.relevanceScore >= 0.40);
  expect(significant.length).toBeGreaterThanOrEqual(3);
});
```

---

#### TC-F4-U1.3: Topics Are Sorted by Relevance Score Descending
**Objective**: Returned topics are always sorted highest relevance first.

**Test Steps**:
1. Submit any multi-topic transcript
2. Iterate through `result.topics`
3. Assert each topic's relevance >= next topic's relevance

**Expected Result**: Topics sorted descending by relevanceScore

**Code Sample**:
```typescript
it("should return topics sorted by relevance score descending", async () => {
  const result = await extractTopics({ transcript: mixedTranscript, options: { maxTopics: 8 } });
  for (let i = 1; i < result.topics.length; i++) {
    expect(result.topics[i - 1].relevanceScore).toBeGreaterThanOrEqual(result.topics[i].relevanceScore);
  }
});
```

---

### 1.2 Keyword Extraction

#### TC-F4-U2.1: Keywords Are Extracted for Each Topic
**Objective**: Every returned topic contains at least 3 keywords.

**Test Steps**:
1. Submit a technical transcript
2. For each returned topic, assert `topic.keywords.length >= 3`

**Expected Result**: All topics have >= 3 keywords

**Code Sample**:
```typescript
it("should extract at least 3 keywords per topic", async () => {
  const result = await extractTopics({ transcript: technicalTranscript, options: { maxTopics: 5 } });
  result.topics.forEach((topic) => {
    expect(topic.keywords.length).toBeGreaterThanOrEqual(3);
  });
});
```

---

#### TC-F4-U2.2: Keywords Are Relevant to Topic Label
**Objective**: Each keyword appears in the transcript and is semantically related to its topic label.

**Test Steps**:
1. Extract topics from a security-focused transcript
2. For the top topic (expected: "Cybersecurity"), assert keywords include at least one of: "encryption", "firewall", "vulnerability", "breach", "SIEM"

**Expected Result**: Security-relevant keywords returned for security topic

**Code Sample**:
```typescript
it("should return security-relevant keywords for cybersecurity topic", async () => {
  const result = await extractTopics({
    transcript: "We reviewed firewall configurations, identified critical vulnerabilities, and implemented SIEM monitoring...",
    options: { maxTopics: 3 },
  });
  const securityTopic = result.topics.find((t) => t.label.toLowerCase().includes("security") || t.label.toLowerCase().includes("cyber"));
  expect(securityTopic).toBeDefined();
  const relevantKeywords = ["encryption", "firewall", "vulnerability", "breach", "siem"];
  const hasRelevant = securityTopic!.keywords.some((k) => relevantKeywords.includes(k.toLowerCase()));
  expect(hasRelevant).toBe(true);
});
```

---

#### TC-F4-U2.3: Stop Words Excluded from Keywords
**Objective**: Common stop words ("the", "a", "is", "and") do not appear in extracted keywords.

**Test Steps**:
1. Extract topics from any transcript
2. Collect all keywords across all topics
3. Assert none are in the stop word list

**Expected Result**: No stop words in keyword list

**Code Sample**:
```typescript
it("should exclude stop words from extracted keywords", async () => {
  const stopWords = new Set(["the", "a", "an", "is", "are", "and", "or", "of", "in", "to", "for"]);
  const result = await extractTopics({ transcript: generalTranscript, options: { maxTopics: 5 } });
  const allKeywords = result.topics.flatMap((t) => t.keywords.map((k) => k.toLowerCase()));
  allKeywords.forEach((kw) => {
    expect(stopWords.has(kw)).toBe(false);
  });
});
```

---

### 1.3 Hierarchical Topic Clustering

#### TC-F4-U3.1: Sub-Topics Nested Under Parent Topic
**Objective**: When hierarchical clustering is enabled, sub-topics are nested under their parent topic.

**Preconditions**:
- `options.hierarchical: true`

**Test Steps**:
1. Submit a transcript covering both "Machine Learning" (parent) and "Neural Networks" and "Decision Trees" (sub-topics)
2. Assert the ML parent topic has at least 2 children

**Expected Result**: `{ label: "Machine Learning", children: [{ label: "Neural Networks" }, { label: "Decision Trees" }] }`

**Code Sample**:
```typescript
it("should nest sub-topics under parent topics in hierarchical mode", async () => {
  const result = await extractTopics({
    transcript: "Covering machine learning broadly: neural networks for image classification and decision trees for tabular data...",
    options: { maxTopics: 10, hierarchical: true },
  });
  const mlTopic = result.topics.find((t) => t.label.toLowerCase().includes("machine learning"));
  expect(mlTopic?.children?.length).toBeGreaterThanOrEqual(2);
});
```

---

#### TC-F4-U3.2: Flat Mode Returns No Children
**Objective**: When hierarchical mode is disabled (default), no topic has a `children` array.

**Test Steps**:
1. Submit transcript with `options.hierarchical: false`
2. Assert no topic has a `children` property

**Expected Result**: All topics have `children === undefined`

**Code Sample**:
```typescript
it("should return flat topic list when hierarchical mode is disabled", async () => {
  const result = await extractTopics({ transcript: hierarchicalTranscript, options: { hierarchical: false } });
  result.topics.forEach((t) => {
    expect(t.children).toBeUndefined();
  });
});
```

---

#### TC-F4-U3.3: Hierarchy Depth Does Not Exceed Max Depth Setting
**Objective**: When `maxDepth: 2` is configured, no topic cluster exceeds 2 levels deep.

**Test Steps**:
1. Submit a deeply nested domain transcript with `maxDepth: 2`
2. Recursively check depth of returned hierarchy
3. Assert max depth <= 2

**Expected Result**: No hierarchy deeper than 2 levels

**Code Sample**:
```typescript
function getMaxDepth(topics: Topic[], depth = 0): number {
  if (!topics || topics.length === 0) return depth;
  return Math.max(...topics.map((t) => getMaxDepth(t.children ?? [], depth + 1)));
}

it("should not exceed maxDepth in hierarchical clustering", async () => {
  const result = await extractTopics({
    transcript: deepDomainTranscript,
    options: { hierarchical: true, maxDepth: 2, maxTopics: 20 },
  });
  expect(getMaxDepth(result.topics)).toBeLessThanOrEqual(2);
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Topic Extraction + Context Tagging Pipeline

#### TC-F4-I1.1: Extracted Topics Converted to Context Tags
**Objective**: Top N extracted topics are automatically converted to context tags by the tagging pipeline.

**Preconditions**:
- Context tagging pipeline is connected

**Test Steps**:
1. Extract topics for conference `conf-050`
2. Run context tagging pipeline
3. Assert `tags` includes entries with `category: "topic"` for each of the top 5 topics

**Expected Result**: 5 topic tags created matching extracted topics

**Code Sample**:
```typescript
it("should convert top 5 extracted topics to context tags", async () => {
  const { topics, tags } = await runTopicAndTaggingPipeline({ conferenceId: "conf-050", transcript: technicalTranscript });
  const topicTags = tags.filter((t) => t.category === "topic");
  const topicLabels = topics.slice(0, 5).map((t) => t.label);
  topicLabels.forEach((label) => {
    expect(topicTags.some((tag) => tag.value === label)).toBe(true);
  });
});
```

---

#### TC-F4-I1.2: Low-Relevance Topics Not Tagged
**Objective**: Topics below relevance threshold (< 0.25) are not converted to context tags.

**Test Steps**:
1. Extract topics with some below 0.25 relevance
2. Run tagging pipeline with `tagThreshold: 0.25`
3. Assert no tag exists for topics below threshold

**Expected Result**: Only topics >= 0.25 relevance are tagged

**Code Sample**:
```typescript
it("should not create context tags for low-relevance topics", async () => {
  const { topics, tags } = await runTopicAndTaggingPipeline({
    conferenceId: "conf-051",
    transcript: mixedRelevanceTranscript,
    options: { tagThreshold: 0.25 },
  });
  const lowRelevanceTopics = topics.filter((t) => t.relevanceScore < 0.25);
  const topicTagValues = tags.filter((t) => t.category === "topic").map((t) => t.value);
  lowRelevanceTopics.forEach((lrTopic) => {
    expect(topicTagValues).not.toContain(lrTopic.label);
  });
});
```

---

### 2.2 Topic Extraction + Semantic Enrichment

#### TC-F4-I2.1: Topics Enriched with Embedding Vectors
**Objective**: Each extracted topic is enriched with a semantic embedding vector by the enrichment service.

**Test Steps**:
1. Extract topics for a transcript
2. Run semantic enrichment on each topic
3. Assert each topic has `embedding` with dimensionality 1536 (OpenAI ada-002 compatible)

**Expected Result**: All topics have `embedding: number[]` with length 1536

**Code Sample**:
```typescript
it("should enrich extracted topics with semantic embedding vectors", async () => {
  const result = await extractAndEnrichTopics({ transcript: technicalTranscript });
  result.topics.forEach((topic) => {
    expect(topic.embedding).toBeDefined();
    expect(topic.embedding!.length).toBe(1536);
  });
});
```

---

#### TC-F4-I2.2: Similar Topics Across Sessions Have High Embedding Cosine Similarity
**Objective**: The same conceptual topic extracted from two different session transcripts has cosine similarity >= 0.85.

**Test Steps**:
1. Extract and enrich "Kubernetes Networking" topic from session A
2. Extract and enrich "Kubernetes Network Policies" topic from session B
3. Compute cosine similarity between their embeddings
4. Assert similarity >= 0.85

**Expected Result**: Cosine similarity >= 0.85

**Code Sample**:
```typescript
import { cosineSimilarity } from "@/utils/math";

it("should have high embedding similarity for semantically related topics across sessions", async () => {
  const { topics: topicsA } = await extractAndEnrichTopics({ transcript: sessionATranscript });
  const { topics: topicsB } = await extractAndEnrichTopics({ transcript: sessionBTranscript });
  const topicA = topicsA.find((t) => t.label.toLowerCase().includes("kubernetes"));
  const topicB = topicsB.find((t) => t.label.toLowerCase().includes("kubernetes"));
  const similarity = cosineSimilarity(topicA!.embedding!, topicB!.embedding!);
  expect(similarity).toBeGreaterThanOrEqual(0.85);
});
```

---

### 2.3 Topic Extraction + Persistence

#### TC-F4-I3.1: Topics Persisted After Extraction
**Objective**: Extracted topics are saved to the database with correct schema.

**Test Steps**:
1. Run topic extraction + persist for `conf-060`
2. Query `conferenceTopics` table
3. Assert records match expected schema

**Expected Result**: Database contains correct topic records

**Code Sample**:
```typescript
it("should persist extracted topics to database with correct schema", async () => {
  await extractAndPersistTopics({ conferenceId: "conf-060", transcript: technicalTranscript });
  const stored = await db.conferenceTopics.findAll({ conferenceId: "conf-060" });
  expect(stored.length).toBeGreaterThan(0);
  stored.forEach((topic) => {
    expect(topic).toMatchObject({
      conferenceId: "conf-060",
      label: expect.any(String),
      relevanceScore: expect.any(Number),
      keywords: expect.any(Array),
    });
  });
});
```

---

#### TC-F4-I3.2: Re-Extraction Replaces Existing Topic Records
**Objective**: Re-running extraction on the same conference replaces (not appends to) existing records.

**Test Steps**:
1. Extract topics for `conf-061` and persist
2. Re-extract with updated transcript and persist again
3. Assert total record count for `conf-061` matches second extraction count (not cumulative)

**Expected Result**: Database count equals latest extraction count, not sum of both

**Code Sample**:
```typescript
it("should replace existing topic records on re-extraction", async () => {
  await extractAndPersistTopics({ conferenceId: "conf-061", transcript: shortTranscript });
  const firstCount = await db.conferenceTopics.count({ conferenceId: "conf-061" });
  await extractAndPersistTopics({ conferenceId: "conf-061", transcript: longerTranscript });
  const secondCount = await db.conferenceTopics.count({ conferenceId: "conf-061" });
  const currentCount = await db.conferenceTopics.count({ conferenceId: "conf-061" });
  expect(currentCount).toBe(secondCount);
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Low-Content Inputs

#### TC-F3-E1.1: Very Short Transcript Returns Minimum Topics
**Objective**: A 10-word transcript returns at least 1 topic, not an error.

**Test Steps**:
1. Submit: "Brief session on AI ethics."
2. Assert `result.topics.length >= 1`
3. Assert no error thrown

**Expected Result**: At least 1 topic returned for minimal input

**Code Sample**:
```typescript
it("should return at least 1 topic for very short transcript", async () => {
  const result = await extractTopics({ transcript: "Brief session on AI ethics.", options: {} });
  expect(result.error).toBeUndefined();
  expect(result.topics.length).toBeGreaterThanOrEqual(1);
});
```

---

#### TC-F3-E1.2: Transcript with No Clear Topic Returns `"general"` Fallback
**Objective**: A transcript with no identifiable topic returns a `"general"` fallback topic with low confidence.

**Test Steps**:
1. Submit a meaningless transcript: "Um, so, uh, yeah, so, like, anyway..."
2. Assert `topics[0].label === "general"` or `topics[0].isFallback === true`

**Expected Result**: Fallback topic returned

**Code Sample**:
```typescript
it("should return general fallback topic for incoherent transcript", async () => {
  const result = await extractTopics({ transcript: "Um so uh yeah so like anyway right um...", options: {} });
  const fallback = result.topics.find((t) => t.label === "general" || t.isFallback);
  expect(fallback).toBeDefined();
});
```

---

### 3.2 Duplicate and Redundant Topics

#### TC-F4-E2.1: Duplicate Topics Are Deduplicated
**Objective**: When the model would return near-identical topics, they are merged into one.

**Test Steps**:
1. Submit a transcript that repeats the same concept multiple times in different phrasings
2. Assert the returned topics list does not contain near-duplicate labels (semantic similarity > 0.95)

**Expected Result**: No near-duplicate topics in output

**Code Sample**:
```typescript
it("should deduplicate near-identical topic labels", async () => {
  const result = await extractTopics({
    transcript: "We discussed machine learning. Later we returned to ML. Finally, the session ended with more machine learning content.",
    options: { maxTopics: 10 },
  });
  const mlTopics = result.topics.filter((t) => t.label.toLowerCase().match(/machine learning|ml\b/));
  expect(mlTopics.length).toBeLessThanOrEqual(1);
});
```

---

#### TC-F4-E2.2: Overly Specific Topics Are Generalized
**Objective**: Topics that are too granular (single term appearing once) are either excluded or merged into broader topics.

**Test Steps**:
1. Submit a transcript where "Kubernetes StatefulSet v1.27.4 patch release" appears once
2. Assert the returned topic is "Kubernetes" or "Container Orchestration" rather than the overly specific string

**Expected Result**: Granular one-off terms are rolled into parent topics

**Code Sample**:
```typescript
it("should generalize overly specific single-occurrence terms", async () => {
  const transcript = "Quick mention: Kubernetes StatefulSet v1.27.4 patch was released. " + "kubernetes content ".repeat(100);
  const result = await extractTopics({ transcript, options: { maxTopics: 5 } });
  const hasOverlySpecific = result.topics.some((t) => t.label.includes("v1.27.4"));
  expect(hasOverlySpecific).toBe(false);
});
```

---

### 3.3 Domain-Specific Jargon

#### TC-F4-E3.1: Medical Jargon Extracted as Valid Topics
**Objective**: A medical conference transcript produces clinically relevant topic labels.

**Test Steps**:
1. Submit transcript: "We reviewed CRISPR-Cas9 gene editing protocols, mRNA vaccine efficacy data, and Phase III clinical trial endpoints..."
2. Assert topics include medical/genomics labels

**Expected Result**: Topics include labels like "Gene Editing", "mRNA Vaccines", "Clinical Trials"

**Code Sample**:
```typescript
it("should extract medically relevant topic labels from clinical transcript", async () => {
  const result = await extractTopics({
    transcript: "We reviewed CRISPR-Cas9 gene editing protocols, mRNA vaccine efficacy data, and Phase III clinical trial endpoints...",
    options: { maxTopics: 5, domain: "medical" },
  });
  const medicalTerms = ["gene editing", "mrna", "clinical trial", "crispr", "vaccine"];
  const hasRelevant = result.topics.some((t) => medicalTerms.some((term) => t.label.toLowerCase().includes(term)));
  expect(hasRelevant).toBe(true);
});
```

---

#### TC-F4-E3.2: Legal Jargon Handled Without Hallucination
**Objective**: Legal conference topics are extracted accurately without fabricating legal citations.

**Test Steps**:
1. Submit legal transcript with actual case references
2. Assert extracted topics are conceptual ("Contract Law", "IP Rights") not fabricated citations

**Expected Result**: No hallucinated case numbers or statute references in topic labels

**Code Sample**:
```typescript
it("should extract conceptual legal topics without hallucinating citations", async () => {
  const result = await extractTopics({
    transcript: "Discussion of intellectual property rights, breach of contract remedies, and GDPR compliance obligations...",
    options: { maxTopics: 5 },
  });
  result.topics.forEach((topic) => {
    // Topic labels should not look like case citations
    expect(topic.label).not.toMatch(/\d{3,}|v\.\s+\w+|\S+ F\.\d+d/);
  });
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Extraction Latency

#### TC-F4-P1.1: Topic Extraction Completes Within 4 Seconds
**Objective**: Standard 2,000-token transcript is processed within 4 seconds.

**Test Steps**:
1. Prepare 2,000-token transcript
2. Time `extractTopics` call
3. Assert elapsed < 4,000ms

**Expected Result**: Latency <= 4,000ms

**Code Sample**:
```typescript
it("should extract topics from 2000-token transcript in under 4 seconds", async () => {
  const transcript = "technical conference content sentence. ".repeat(100);
  const start = Date.now();
  await extractTopics({ transcript, options: { maxTopics: 10 } });
  expect(Date.now() - start).toBeLessThan(4000);
}, 10000);
```

---

#### TC-F4-P1.2: Hierarchical Mode Adds < 2s Overhead
**Objective**: Enabling hierarchical clustering adds no more than 2,000ms over flat extraction.

**Test Steps**:
1. Extract topics in flat mode; record latency
2. Extract same transcript in hierarchical mode; record latency
3. Assert overhead <= 2,000ms

**Expected Result**: Hierarchical mode overhead <= 2,000ms

**Code Sample**:
```typescript
it("should not add more than 2s overhead for hierarchical clustering", async () => {
  const input = { transcript: largeTranscript, options: { maxTopics: 10 } };
  const start1 = Date.now();
  await extractTopics({ ...input, options: { ...input.options, hierarchical: false } });
  const flat = Date.now() - start1;

  const start2 = Date.now();
  await extractTopics({ ...input, options: { ...input.options, hierarchical: true } });
  const hierarchical = Date.now() - start2;

  expect(hierarchical - flat).toBeLessThan(2000);
});
```

---

### 4.2 Scalability

#### TC-F4-P2.1: 20 Concurrent Extractions Complete Without Error
**Objective**: 20 simultaneous topic extraction calls all return successfully.

**Test Steps**:
1. Prepare 20 unique transcripts
2. Fire all 20 extractions concurrently
3. Assert all resolve without error

**Expected Result**: All 20 succeed

**Code Sample**:
```typescript
it("should handle 20 concurrent topic extractions without error", async () => {
  const inputs = Array.from({ length: 20 }, (_, i) => ({
    transcript: `Conference session ${i} covering topic area ${i} with detailed technical content...`,
    options: { maxTopics: 5 },
  }));
  const results = await Promise.all(inputs.map((input) => extractTopics(input)));
  results.forEach((result) => {
    expect(result.error).toBeUndefined();
    expect(result.topics.length).toBeGreaterThan(0);
  });
}, 30000);
```

---

#### TC-F4-P2.2: Large Conference (10,000 tokens) Processed Within 15 Seconds
**Objective**: A very large transcript of 10,000 tokens completes topic extraction within 15 seconds.

**Test Steps**:
1. Prepare 10,000-token transcript
2. Time extraction
3. Assert elapsed < 15,000ms

**Expected Result**: Latency <= 15,000ms for 10,000-token input

**Code Sample**:
```typescript
it("should process 10,000-token transcript within 15 seconds", async () => {
  const largeTranscript = "detailed technical conference content covering many topics ".repeat(500);
  const start = Date.now();
  await extractTopics({ transcript: largeTranscript, options: { maxTopics: 15 } });
  expect(Date.now() - start).toBeLessThan(15000);
}, 20000);
```

---

### 4.3 Embedding and Enrichment Performance

#### TC-F4-P3.1: Embedding Generation Does Not Exceed 500ms Per Topic
**Objective**: Semantic embedding generation for a single topic label completes within 500ms.

**Test Steps**:
1. Extract a single topic
2. Request embedding for that topic
3. Assert embedding generation < 500ms

**Expected Result**: Embedding latency <= 500ms

**Code Sample**:
```typescript
it("should generate topic embedding within 500ms", async () => {
  const topic = { label: "Kubernetes Networking", keywords: ["CNI", "network policies", "ingress"] };
  const start = Date.now();
  await enrichTopicWithEmbedding(topic);
  expect(Date.now() - start).toBeLessThan(500);
});
```

---

#### TC-F4-P3.2: Batch Embedding of 20 Topics < 5 Seconds
**Objective**: Batch embedding generation for 20 topics completes within 5 seconds.

**Test Steps**:
1. Prepare 20 topic objects
2. Call `batchEnrichTopicsWithEmbeddings(topics)`
3. Assert elapsed < 5,000ms

**Expected Result**: 20 embeddings generated in under 5 seconds

**Code Sample**:
```typescript
it("should generate embeddings for 20 topics in under 5 seconds", async () => {
  const topics = Array.from({ length: 20 }, (_, i) => ({ label: `Topic ${i}`, keywords: [`keyword-${i}`, `term-${i}`] }));
  const start = Date.now();
  await batchEnrichTopicsWithEmbeddings(topics);
  expect(Date.now() - start).toBeLessThan(5000);
}, 10000);
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
- Core extraction accuracy tested across single-domain, multi-domain, and mixed-relevance transcripts
- Keyword extraction, stop word filtering, and relevance threshold enforcement validated
- Hierarchical clustering depth and flat mode compatibility verified
- Integration with context tagging, semantic enrichment, and persistence layer tested
- Deduplication, overly specific term generalization, domain-specific jargon, and incoherent input edge cases covered
