import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createDemoAnalysis, normalizeInteraction } from "../lib/demo-data.mjs";
import { MediaStore } from "../lib/media-store.mjs";
import { getMlxWhisperStatus, transcribeAudioLocally } from "../lib/mlx-whisper-service.mjs";
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
    actionItems: [{ text: "Share notes", owner: "Me", dueDate: "No due date" }],
    followUp: "Thank you for discussing computing."
  };
  const result = await analyzeTranscript({
    transcript: "We discussed computing and I will share notes.",
    conferenceName: "Technology Forum",
    sessionName: "Hallway conversation",
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
      await import("node:fs/promises").then(({ writeFile }) => writeFile(outputPath, JSON.stringify({ text: "Local transcript text" })));
      return { stdout: "", stderr: "" };
    }
  });
  assert.equal(transcript, "Local transcript text");
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
    actionItems: [{ text: "Share notes", owner: "Me", dueDate: "No due date" }],
    followUp: "Thank you for discussing compilers."
  };
  const result = await analyzeTranscriptLocally({
    transcript: "We discussed compilers and I will share notes.",
    conferenceName: "Computing Forum",
    sessionName: "Hallway conversation",
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
