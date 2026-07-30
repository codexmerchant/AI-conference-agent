import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createDemoAnalysis, normalizeInteraction } from "../lib/demo-data.mjs";
import { inferOtherParticipantName, normalizeSpokenEmail, resolveSupportedDate, validateAnalysis } from "../lib/analysis-validation.mjs";
import { attributeTranscriptSegments, diarizeAudioLocally, getFluidDiarizationStatus } from "../lib/fluid-diarization-service.mjs";
import { MediaStore } from "../lib/media-store.mjs";
import { getMlxWhisperStatus, transcribeAudioLocally } from "../lib/mlx-whisper-service.mjs";
import { validateAudioFile, validateInteractionContext, validateProcessingPermission } from "../lib/interaction-context.mjs";
import { analyzeTranscript, ProviderError, transcribeAudio } from "../lib/openai-service.mjs";
import { analyzeTranscriptLocally, getOllamaStatus } from "../lib/ollama-service.mjs";
import { chooseAnalysisProvider, chooseTranscriptionProvider } from "../lib/provider-routing.mjs";
import { InteractionStore } from "../lib/store.mjs";

test("creates every artifact required by the first slice", () => {
  const result = createDemoAnalysis({ conferenceName: "Test Conference", fileName: "talk.wav" });
  assert.equal(result.conferenceName, "Test Conference");
  assert.equal(result.fileName, "talk.wav");
  assert.match(result.transcript, /Maya:/);
  assert.equal(result.contact.name, "Maya Chen");
  assert.ok(result.topics.length >= 3);
  assert.ok(result.summary.length > 100);
  assert.ok(result.actionItems.length >= 2);
  assert.match(result.followUp, /human-centered AI evaluation/i);
  assert.equal(result.processingMode, "sample");
});

test("sends the actual audio bytes to the transcription endpoint", async () => {
  let request;
  const transcript = await transcribeAudio({
    bytes: Buffer.from("audio bytes"),
    fileName: "meeting.wav",
    mimeType: "audio/wav",
    apiKey: "test-key",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ text: "Real transcript text" }), { status: 200, headers: { "content-type": "application/json" } });
    }
  });
  assert.equal(transcript, "Real transcript text");
  assert.equal(request.url, "https://api.openai.com/v1/audio/transcriptions");
  assert.equal(request.options.body.get("model"), "gpt-transcribe");
  assert.equal(request.options.body.get("file").name, "meeting.wav");
});

test("requests schema-constrained transcript analysis", async () => {
  let requestBody;
  const expected = {
    contact: { name: "Ada Lovelace", role: "Engineer", company: "Analytical Engines", email: "", confidence: 0.8 },
    topics: ["Computing"],
    summary: "A discussion about computing.",
    actionItems: [{ text: "Share notes", owner: "Me", participant: "Ada Lovelace", dueDate: null, dateEvidence: null, evidence: "I will share notes", confidence: 0.9 }],
    followUp: "Thank you for discussing computing."
  };
  const result = await analyzeTranscript({
    transcript: "We discussed computing and I will share notes.",
    conferenceName: "Technology Forum",
    sessionName: "Hallway conversation",
    userName: "Ada Lovelace",
    interactionDate: "2026-08-02",
    timezone: "America/Los_Angeles",
    apiKey: "test-key",
    fetchImpl: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return new Response(JSON.stringify({ output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(expected) }] }] }), { status: 200, headers: { "content-type": "application/json" } });
    }
  });
  assert.deepEqual(result, expected);
  assert.equal(requestBody.text.format.type, "json_schema");
  assert.equal(requestBody.text.format.strict, true);
  assert.equal(requestBody.store, false);
  const context = requestBody.input[1].content[0].text;
  assert.match(context, /App user: Ada Lovelace/);
  assert.match(context, /Interaction date: 2026-08-02/);
  assert.match(context, /Timezone: America\/Los_Angeles/);
  assert.deepEqual(requestBody.text.format.schema.properties.actionItems.items.properties.owner.enum, ["Me", "Contact", "Mutual", "Unclear"]);
});

test("reports a missing API key as a non-retryable configuration error", async () => {
  await assert.rejects(
    () => transcribeAudio({ bytes: Buffer.from("audio"), fileName: "audio.wav" }),
    (error) => error instanceof ProviderError && error.code === "missing_api_key" && error.retryable === false
  );
});

test("detects a ready MLX Whisper installation", async () => {
  const status = await getMlxWhisperStatus({
    python: "/test/python",
    execFileImpl: async (file, args) => {
      assert.equal(file, "/test/python");
      assert.equal(args.at(-1), "--health");
      return { stdout: '{"ready": true}', stderr: "" };
    }
  });
  assert.equal(status.available, true);
  assert.equal(status.model, "mlx-community/whisper-large-v3-turbo");
});

test("detects a ready FluidAudio executable", async () => {
  const status = await getFluidDiarizationStatus({
    binary: "/test/fluidaudio",
    accessImpl: async (file) => assert.equal(file, "/test/fluidaudio")
  });
  assert.equal(status.available, true);
  assert.equal(status.version, "FluidAudio 0.7.12");
});

test("passes audio bytes through FluidAudio and strips voice embeddings", async () => {
  const source = Buffer.from("conference audio");
  const result = await diarizeAudioLocally({
    bytes: source,
    fileName: "meeting.m4a",
    binary: "/test/fluidaudio",
    execFileImpl: async (_file, args) => {
      const inputPath = args[1];
      const outputPath = args[args.indexOf("--output") + 1];
      assert.deepEqual(await readFile(inputPath), source);
      await import("node:fs/promises").then(({ writeFile }) => writeFile(outputPath, JSON.stringify({
        processingTimeSeconds: 3.7,
        segments: [{ speakerId: "2", startTimeSeconds: 0, endTimeSeconds: 4.8, embedding: [0.1, 0.2] }]
      })));
    }
  });
  assert.deepEqual(result, {
    processingTimeSeconds: 3.7,
    segments: [{ speakerId: "2", start: 0, end: 4.8 }]
  });
});

test("rejects empty FluidAudio diarization output", async () => {
  await assert.rejects(
    () => diarizeAudioLocally({
      bytes: Buffer.from("audio"),
      fileName: "meeting.wav",
      binary: "/test/fluidaudio",
      execFileImpl: async (_file, args) => {
        const outputPath = args[args.indexOf("--output") + 1];
        await import("node:fs/promises").then(({ writeFile }) => writeFile(outputPath, JSON.stringify({ segments: [] })));
      }
    }),
    (error) => error instanceof ProviderError && error.code === "empty_diarization"
  );
});

test("maps diarized voices to introduced identities and leaves extra voices unclear", () => {
  const result = attributeTranscriptSegments({
    transcriptSegments: [
      { id: 0, start: 0, end: 4.8, text: "I am Maya Chen." },
      { id: 1, start: 5, end: 10, text: "I am Daniel Ruiz." },
      { id: 2, start: 10.2, end: 12, text: "I will email you." }
    ],
    diarizationSegments: [
      { speakerId: "2", start: 0, end: 4.8 },
      { speakerId: "1", start: 5, end: 10 },
      { speakerId: "3", start: 10.2, end: 12 }
    ],
    userName: "Maya Chen",
    otherParticipantName: "Daniel Ruiz"
  });
  assert.equal(result.speakers.userSpeaker, "2");
  assert.equal(result.speakers.contactSpeaker, "1");
  assert.match(result.transcript, /APP USER \(Maya Chen\): I am Maya Chen/);
  assert.match(result.transcript, /OTHER PARTICIPANT \(Daniel Ruiz\): I am Daniel Ruiz/);
  assert.match(result.transcript, /UNCLEAR SPEAKER \(3\): I will email you/);
});

test("passes actual audio bytes through the local MLX adapter", async () => {
  const source = Buffer.from("local audio bytes");
  const transcript = await transcribeAudioLocally({
    bytes: source,
    fileName: "meeting.m4a",
    python: "/test/python",
    execFileImpl: async (_file, args) => {
      const inputPath = args[args.indexOf("--input") + 1];
      const outputPath = args[args.indexOf("--output") + 1];
      assert.deepEqual(await readFile(inputPath), source);
      await import("node:fs/promises").then(({ writeFile }) => writeFile(outputPath, JSON.stringify({
        text: "Local transcript text",
        segments: [{ id: 0, start: 0, end: 1, text: "Local transcript text" }]
      })));
      return { stdout: "", stderr: "" };
    }
  });
  assert.deepEqual(transcript, {
    text: "Local transcript text",
    segments: [{ id: 0, start: 0, end: 1, text: "Local transcript text" }]
  });
});

test("requires explicit provider configuration and never silently uses OpenAI", () => {
  assert.equal(chooseTranscriptionProvider({ localReady: true, openAIConfigured: true }), "mlx");
  assert.equal(chooseAnalysisProvider({ localReady: true, openAIConfigured: true }), "ollama");
  assert.throws(
    () => chooseTranscriptionProvider({ localReady: false, openAIConfigured: true }),
    (error) => error.code === "mlx_whisper_unavailable"
  );
  assert.throws(
    () => chooseAnalysisProvider({ localReady: false, openAIConfigured: true }),
    (error) => error.code === "ollama_unavailable"
  );
});

test("requests schema-constrained local Qwen3 analysis without thinking", async () => {
  let requestBody;
  const expected = {
    contact: { name: "Grace Hopper", role: "Engineer", company: "Navy", email: "", confidence: 0.9 },
    topics: ["Compilers"],
    summary: "A discussion about compilers.",
    actionItems: [{ text: "Share notes", owner: "Me", participant: "Grace Hopper", dueDate: null, dateEvidence: null, evidence: "I will share notes", confidence: 0.9 }],
    followUp: "Thank you for discussing compilers."
  };
  const result = await analyzeTranscriptLocally({
    transcript: "We discussed compilers and I will share notes.",
    conferenceName: "Computing Forum",
    sessionName: "Hallway conversation",
    userName: "Grace Hopper",
    interactionDate: "2026-08-02",
    timezone: "America/Los_Angeles",
    fetchImpl: async (url, options) => {
      assert.equal(url, "http://127.0.0.1:11434/api/chat");
      requestBody = JSON.parse(options.body);
      return new Response(JSON.stringify({ message: { role: "assistant", content: JSON.stringify(expected) }, done: true }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
  });
  assert.deepEqual(result, expected);
  assert.equal(requestBody.model, "qwen3");
  assert.equal(requestBody.stream, false);
  assert.equal(requestBody.think, false);
  assert.equal(requestBody.options.temperature, 0);
  assert.equal(requestBody.format.type, "object");
  assert.match(requestBody.messages[1].content, /App user: Grace Hopper/);
  assert.match(requestBody.messages[1].content, /Interaction date: 2026-08-02/);
  assert.match(requestBody.messages[1].content, /Timezone: America\/Los_Angeles/);
});

test("detects whether the configured Qwen model is installed", async () => {
  const status = await getOllamaStatus({
    fetchImpl: async () => new Response(JSON.stringify({ models: [{ name: "qwen3:latest" }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    })
  });
  assert.deepEqual(status, { available: true, model: "qwen3", modelReady: true });
});

test("rejects malformed local structured output", async () => {
  await assert.rejects(
    () => analyzeTranscriptLocally({
      transcript: "Maya met Daniel.",
      userName: "Maya",
      interactionDate: "2026-08-02",
      timezone: "UTC",
      fetchImpl: async () => new Response(JSON.stringify({ message: { content: "not-json" } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    }),
    (error) => error instanceof ProviderError && error.code === "invalid_local_analysis"
  );
});

test("normalizes spoken email and resolves only supported dates", () => {
  assert.equal(normalizeSpokenEmail("daniel dot ruiz at clearpathlabs dot com"), "daniel.ruiz@clearpathlabs.com");
  assert.equal(normalizeSpokenEmail("daniel.ruiz at clearpathlabs.com"), "daniel.ruiz@clearpathlabs.com");
  assert.equal(normalizeSpokenEmail("not enough information"), "");
  assert.equal(resolveSupportedDate("tomorrow afternoon", "2026-08-02"), "2026-08-03");
  assert.equal(resolveSupportedDate("Tuesday, August 4, 2026", "2026-08-02"), "2026-08-04");
  assert.equal(resolveSupportedDate("later that week", "2026-08-02"), null);
  assert.equal(resolveSupportedDate("tomorrow", ""), null);
  assert.equal(inferOtherParticipantName("I am Maya Chen. Nice to meet you. I am Daniel Ruiz.", "Maya Chen"), "Daniel Ruiz");
});

test("requires a grounded user identity, calendar date, and valid timezone", () => {
  assert.deepEqual(validateInteractionContext({
    userName: "  Maya Chen  ",
    interactionDate: "2026-08-02",
    timezone: "America/Los_Angeles"
  }), {
    userName: "Maya Chen",
    interactionDate: "2026-08-02",
    timezone: "America/Los_Angeles"
  });
  assert.throws(() => validateInteractionContext({ interactionDate: "2026-08-02", timezone: "UTC" }), (error) => error.code === "missing_user_name");
  assert.throws(() => validateInteractionContext({ userName: "Maya", interactionDate: "2026-02-31", timezone: "UTC" }), (error) => error.code === "invalid_interaction_date");
  assert.throws(() => validateInteractionContext({ userName: "Maya", interactionDate: "2026-08-02", timezone: "Mars/Olympus" }), (error) => error.code === "invalid_timezone");
});

test("requires processing permission and rejects missing or oversized audio", () => {
  assert.doesNotThrow(() => validateProcessingPermission("true"));
  assert.throws(() => validateProcessingPermission("false"), (error) => error.code === "permission_required" && error.retryable === false);
  assert.throws(() => validateAudioFile(null, 10), (error) => error.code === "audio_required");
  assert.throws(() => validateAudioFile(new File(["too much audio"], "large.wav"), 4), (error) => error.code === "audio_too_large" && error.status === 413);
});

test("corrects ownership from participant identity and removes invented dates", () => {
  const transcript = "Maya Chen said I can send the pilot overview tomorrow afternoon. Daniel Ruiz shared daniel dot ruiz at clearpathlabs dot com and said I will make the introduction by Tuesday, August 4, 2026.";
  const result = validateAnalysis({
    transcript,
    userName: "Maya Chen",
    interactionDate: "2026-08-02",
    analysis: {
      contact: { name: "Daniel Ruiz", role: "", company: "", email: "daniel dot ruiz at clearpathlabs dot com", confidence: 0.99 },
      topics: ["Pilot"],
      summary: "Maya and Daniel discussed a pilot.",
      actionItems: [
        {
          text: "Send the pilot overview",
          owner: "Contact",
          participant: "Maya Chen",
          dueDate: "2026-08-03",
          dateEvidence: "tomorrow afternoon",
          evidence: "I can send the pilot overview tomorrow afternoon",
          confidence: 0.9
        },
        {
          text: "Schedule a later call",
          owner: "Contact",
          participant: "Daniel Ruiz",
          dueDate: "2026-08-05",
          dateEvidence: "later that week",
          evidence: "I will make the introduction by Tuesday, August 4, 2026",
          confidence: 0.8
        }
      ],
      followUp: "Hi Daniel, thank you for discussing the pilot."
    }
  });
  assert.equal(result.contact.email, "daniel.ruiz@clearpathlabs.com");
  assert.equal(result.actionItems[0].owner, "Me");
  assert.equal(result.actionItems[0].dueDate, "2026-08-03");
  assert.equal(result.actionItems[1].owner, "Unclear");
  assert.equal(result.actionItems[1].dueDate, null);
  assert.ok(result.reviewFlags.some((flag) => flag.code === "unsupported_due_date"));
  assert.ok(result.quality.overallConfidence < 0.99);
});

test("speaker-labelled evidence overrides a contradictory model participant", () => {
  const transcript = "APP USER (Maya Chen): I will send the materials tomorrow afternoon.\nOTHER PARTICIPANT (Daniel Ruiz): After I connect you, let us schedule a call with the three of us.";
  const result = validateAnalysis({
    transcript,
    userName: "Maya Chen",
    interactionDate: "2026-08-02",
    analysis: {
      contact: { name: "Daniel Ruiz", role: "", company: "", email: "" },
      actionItems: [
        { text: "Send materials", participant: "Daniel Ruiz", owner: "Contact", evidence: "APP USER (Maya Chen): I will send the materials tomorrow afternoon.", dueDate: "2026-08-03", dateEvidence: "tomorrow afternoon", confidence: 1 },
        { text: "Schedule a call with all three", participant: "Daniel Ruiz", owner: "Contact", evidence: "OTHER PARTICIPANT (Daniel Ruiz): After I connect you, let us schedule a call with the three of us.", dueDate: null, dateEvidence: null, confidence: 1 }
      ]
    }
  });
  assert.equal(result.actionItems[0].owner, "Me");
  assert.equal(result.actionItems[0].participant, "Maya Chen");
  assert.equal(result.actionItems[1].owner, "Mutual");
  assert.equal(result.actionItems[1].participant, "Maya Chen + Daniel Ruiz");
});

test("uses Unclear when action evidence or the app user cannot be grounded", () => {
  const result = validateAnalysis({
    transcript: "Daniel Ruiz discussed a hospital pilot.",
    userName: "Maya Chen",
    interactionDate: "2026-08-02",
    analysis: {
      contact: { name: "Daniel Ruiz", role: "", company: "", email: "", confidence: 0.9 },
      topics: [],
      summary: "A pilot discussion.",
      actionItems: [{
        text: "Send materials",
        owner: "Me",
        participant: "Maya Chen",
        dueDate: "2026-08-03",
        dateEvidence: "tomorrow",
        evidence: "I will send materials tomorrow",
        confidence: 0.9
      }],
      followUp: ""
    }
  });
  assert.equal(result.actionItems[0].owner, "Unclear");
  assert.equal(result.actionItems[0].dueDate, null);
  assert.ok(result.reviewFlags.some((flag) => flag.code === "user_not_grounded"));
  assert.ok(result.reviewFlags.some((flag) => flag.code === "unsupported_action_evidence"));
});

test("removes hallucinated contact fields from irrelevant or unclear audio", () => {
  const result = validateAnalysis({
    transcript: "Background music and an announcement about the hall closing.",
    userName: "Maya Chen",
    interactionDate: "2026-08-02",
    analysis: {
      contact: { name: "Daniel Ruiz", role: "Director", company: "ClearPath Labs", email: "daniel@clearpathlabs.com" },
      topics: [], summary: "", actionItems: [], followUp: ""
    }
  });
  assert.deepEqual(result.contact, { name: "", role: "", company: "", email: "", confidence: 0 });
  assert.ok(result.reviewFlags.some((flag) => flag.code === "unsupported_contact_name"));
  assert.ok(result.reviewFlags.some((flag) => flag.code === "unsupported_contact_email"));
});

test("preserves unknown contact details and deadlines as empty values", () => {
  const result = validateAnalysis({
    transcript: "APP USER (Maya Chen): It was good meeting you.\nOTHER PARTICIPANT: Likewise.",
    userName: "Maya Chen",
    interactionDate: "2026-08-02",
    analysis: {
      contact: { name: "", role: "", company: "", email: "" },
      topics: [], summary: "A brief greeting.", actionItems: [], followUp: "Thank you for speaking with me."
    }
  });
  assert.equal(result.contact.email, "");
  assert.equal(result.actionItems.length, 0);
});

test("stores uploaded audio under an opaque id and reads it back", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "conference-media-"));
  const store = new MediaStore(directory);
  const saved = await store.save({ bytes: Buffer.from("audio bytes"), originalName: "conversation.wav", mimeType: "audio/wav" });
  assert.match(saved.id, /^[0-9a-f-]{36}$/);
  const reopened = await store.read(saved.id);
  assert.equal(reopened.metadata.originalName, "conversation.wav");
  assert.equal(reopened.bytes.toString(), "audio bytes");
});

test("normalizes edits and removes empty action items", () => {
  const source = createDemoAnalysis();
  source.contact.name = "  Maya Chen  ";
  source.actionItems.push({ text: "" });
  const normalized = normalizeInteraction(source);
  assert.equal(normalized.contact.name, "  Maya Chen  ");
  assert.equal(normalized.actionItems.length, 3);
  assert.ok(normalized.updatedAt);
});

test("saves and reopens an interaction", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "conference-demo-"));
  const file = path.join(directory, "interactions.json");
  const store = new InteractionStore(file);
  const interaction = createDemoAnalysis({ id: "saved_1" });
  await store.save(interaction);
  const reopened = await store.find("saved_1");
  assert.equal(reopened.summary, interaction.summary);
  assert.equal(reopened.followUp, interaction.followUp);
  assert.equal(JSON.parse(await readFile(file, "utf8")).length, 1);
});

test("updates an existing interaction instead of duplicating it", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "conference-demo-"));
  const store = new InteractionStore(path.join(directory, "interactions.json"));
  const interaction = createDemoAnalysis({ id: "saved_2" });
  await store.save(interaction);
  await store.save({ ...interaction, summary: "Edited summary" });
  assert.equal((await store.readAll()).length, 1);
  assert.equal((await store.find("saved_2")).summary, "Edited summary");
});

test("exposes identity, date, confidence, and action correction controls", async () => {
  const [html, app] = await Promise.all([
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/app.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="user-name"/);
  assert.match(html, /id="interaction-date"/);
  assert.match(html, /id="analysis-confidence"/);
  assert.match(html, /id="review-flags"/);
  assert.match(html, /id="controlled-test-preset"/);
  assert.match(app, /Controlled test settings applied/);
  assert.match(app, /class="action-owner"/);
  assert.match(app, /class="action-date"/);
  assert.doesNotMatch(html, />92% confidence</);
});
