import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDemoAnalysis, createRealAnalysis, normalizeInteraction } from "./lib/demo-data.mjs";
import { inferOtherParticipantName, validateAnalysis } from "./lib/analysis-validation.mjs";
import { attributeTranscriptSegments, diarizeAudioLocally, getFluidDiarizationStatus } from "./lib/fluid-diarization-service.mjs";
import { MediaStore } from "./lib/media-store.mjs";
import { getMlxWhisperStatus, transcribeAudioLocally } from "./lib/mlx-whisper-service.mjs";
import { validateAudioFile, validateInteractionContext, validateProcessingPermission } from "./lib/interaction-context.mjs";
import { analyzeTranscript, ProviderError, transcribeAudio } from "./lib/openai-service.mjs";
import { analyzeTranscriptLocally, getOllamaStatus } from "./lib/ollama-service.mjs";
import { chooseAnalysisProvider, chooseTranscriptionProvider } from "./lib/provider-routing.mjs";
import { InteractionStore } from "./lib/store.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.join(root, "public");
const store = new InteractionStore(process.env.DEMO_DATA_FILE || path.join(root, ".data", "interactions.json"));
const mediaStore = new MediaStore(process.env.DEMO_MEDIA_DIR || path.join(root, ".data", "uploads"));
const port = Number(process.env.PORT || 4173);
const maxAudioBytes = 25 * 1024 * 1024;

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function json(res, status, body) {
  res.writeHead(status, { "content-type": types[".json"], "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

async function body(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1_000_000) throw new Error("Request is too large");
  }
  return raw ? JSON.parse(raw) : {};
}

async function bytes(req, limit = maxAudioBytes + 512_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) {
      const error = new Error("Audio upload exceeds the 25 MB limit");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function multipart(req) {
  const contentType = req.headers["content-type"] || "";
  if (!contentType.startsWith("multipart/form-data")) {
    const error = new Error("Audio processing requires multipart form data");
    error.status = 415;
    throw error;
  }
  const raw = await bytes(req);
  const request = new Request("http://localhost/upload", {
    method: "POST",
    headers: { "content-type": contentType },
    body: raw
  });
  return request.formData();
}

function processingError(res, error) {
  const status = error.status || 500;
  return json(res, status, {
    error: error.message || "Audio processing failed",
    code: error.code || "processing_failed",
    retryable: error.retryable !== false
  });
}

export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

      if (url.pathname === "/api/health") {
        const [ollama, mlxWhisper, diarization] = await Promise.all([getOllamaStatus(), getMlxWhisperStatus(), getFluidDiarizationStatus()]);
        const transcriptionPreference = process.env.TRANSCRIPTION_PROVIDER || "mlx";
        const analysisPreference = process.env.ANALYSIS_PROVIDER || "ollama";
        const openAIConfigured = Boolean(process.env.OPENAI_API_KEY);
        const transcriptionReady = transcriptionPreference === "mlx" ? mlxWhisper.available : openAIConfigured;
        const analysisReady = analysisPreference === "ollama" ? ollama.available && ollama.modelReady : openAIConfigured;
        return json(res, 200, {
          status: "ok",
          realProcessingConfigured: transcriptionReady && analysisReady && diarization.available,
          openAIConfigured,
          transcriptionProvider: transcriptionPreference,
          analysisProvider: analysisPreference,
          localTranscriptionReady: mlxWhisper.available,
          localAnalysisReady: ollama.available && ollama.modelReady,
          localDiarizationReady: diarization.available,
          transcriptionModel: transcriptionPreference === "mlx" ? mlxWhisper.model : process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-transcribe",
          cloudAnalysisModel: process.env.OPENAI_TEXT_MODEL || "gpt-5.6-terra",
          localAnalysisModel: ollama.model
        });
      }

      if (url.pathname === "/api/process/sample" && req.method === "POST") {
        const input = await body(req);
        return json(res, 200, createDemoAnalysis(input));
      }

      if (url.pathname === "/api/process" && req.method === "POST") {
        try {
          const [ollama, mlxWhisper, diarization] = await Promise.all([getOllamaStatus(), getMlxWhisperStatus(), getFluidDiarizationStatus()]);
          if (!diarization.available) {
            throw new ProviderError("FluidAudio diarization is not ready. Run the local diarization setup first.", {
              status: 503,
              code: "fluid_diarization_unavailable",
              retryable: false
            });
          }
          const openAIConfigured = Boolean(process.env.OPENAI_API_KEY);
          const transcriptionProvider = chooseTranscriptionProvider({
            preference: process.env.TRANSCRIPTION_PROVIDER || "mlx",
            localReady: mlxWhisper.available,
            openAIConfigured
          });
          const analysisProvider = chooseAnalysisProvider({
            preference: process.env.ANALYSIS_PROVIDER || "ollama",
            localReady: ollama.available && ollama.modelReady,
            openAIConfigured
          });
          const form = await multipart(req);
          const audio = form.get("audio");
          validateAudioFile(audio, maxAudioBytes);
          validateProcessingPermission(form.get("consentConfirmed"));

          const context = validateInteractionContext({
            userName: form.get("userName"),
            interactionDate: form.get("interactionDate"),
            timezone: form.get("timezone")
          });

          const input = {
            conferenceName: String(form.get("conferenceName") || ""),
            sessionName: String(form.get("sessionName") || ""),
            ...context,
            duration: String(form.get("duration") || "—")
          };
          const audioBytes = Buffer.from(await audio.arrayBuffer());
          const [transcriptionResult, diarizationResult] = await Promise.all([
            transcriptionProvider === "mlx"
              ? transcribeAudioLocally({
                bytes: audioBytes,
                fileName: audio.name,
                model: mlxWhisper.model
              })
              : transcribeAudio({
                bytes: audioBytes,
                fileName: audio.name,
                mimeType: audio.type,
                apiKey: process.env.OPENAI_API_KEY,
                model: process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-transcribe"
              }),
            diarizeAudioLocally({ bytes: audioBytes, fileName: audio.name })
          ]);
          const transcript = typeof transcriptionResult === "string" ? transcriptionResult : transcriptionResult.text;
          const segments = typeof transcriptionResult === "string"
            ? [{ id: 0, text: transcript }]
            : transcriptionResult.segments;
          const otherParticipantName = inferOtherParticipantName(transcript, input.userName);
          const attribution = attributeTranscriptSegments({
            transcriptSegments: segments,
            diarizationSegments: diarizationResult.segments,
            userName: input.userName,
            otherParticipantName
          });
          const attributedTranscript = attribution.transcript;
          const providerAnalysis = analysisProvider === "ollama"
            ? await analyzeTranscriptLocally({
                transcript: attributedTranscript,
                conferenceName: input.conferenceName,
                sessionName: input.sessionName,
                userName: input.userName,
                interactionDate: input.interactionDate,
                timezone: input.timezone,
                model: ollama.model
              })
            : await analyzeTranscript({
                transcript: attributedTranscript,
                conferenceName: input.conferenceName,
                sessionName: input.sessionName,
                userName: input.userName,
                interactionDate: input.interactionDate,
                timezone: input.timezone,
                apiKey: process.env.OPENAI_API_KEY,
                model: process.env.OPENAI_TEXT_MODEL || "gpt-5.6-terra"
              });
          const analysis = validateAnalysis({
            analysis: providerAnalysis,
            transcript: attributedTranscript,
            userName: input.userName,
            interactionDate: input.interactionDate
          });
          const media = await mediaStore.save({ bytes: audioBytes, originalName: audio.name, mimeType: audio.type });
          return json(res, 200, createRealAnalysis({
            input,
            transcript: attributedTranscript,
            analysis,
            media,
            providers: {
              transcription: transcriptionProvider === "mlx" ? `Local MLX Whisper (${mlxWhisper.model})` : "OpenAI file transcription",
              analysis: analysisProvider === "ollama" ? `Local ${ollama.model} structured analysis` : "OpenAI structured transcript analysis",
              speakerAttribution: `Local FluidAudio 0.7.12 diarization (${diarizationResult.processingTimeSeconds?.toFixed(1) || "—"}s)`
            }
          }));
        } catch (error) {
          return processingError(res, error);
        }
      }

      if (url.pathname === "/api/interactions" && req.method === "GET") {
        const records = await store.readAll();
        return json(res, 200, records.map(({ transcript, followUp, ...record }) => record));
      }

      if (url.pathname === "/api/interactions" && req.method === "POST") {
        const interaction = normalizeInteraction(await body(req));
        await store.save(interaction);
        return json(res, 200, interaction);
      }

      const detailMatch = url.pathname.match(/^\/api\/interactions\/([^/]+)$/);
      if (detailMatch && req.method === "GET") {
        const interaction = await store.find(decodeURIComponent(detailMatch[1]));
        return interaction ? json(res, 200, interaction) : json(res, 404, { error: "Interaction not found" });
      }

      const mediaMatch = url.pathname.match(/^\/api\/media\/([0-9a-f-]{36})$/i);
      if (mediaMatch && req.method === "GET") {
        const media = await mediaStore.read(mediaMatch[1]);
        if (!media) return json(res, 404, { error: "Audio file not found" });
        res.writeHead(200, {
          "content-type": media.metadata.mimeType,
          "content-length": media.bytes.length,
          "content-disposition": `inline; filename="${encodeURIComponent(media.metadata.originalName)}"`,
          "cache-control": "private, no-store"
        });
        return res.end(media.bytes);
      }

      if (req.method !== "GET" && req.method !== "HEAD") return json(res, 405, { error: "Method not allowed" });

      const requested = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      const filePath = path.resolve(publicRoot, requested);
      if (!filePath.startsWith(publicRoot)) return json(res, 403, { error: "Forbidden" });

      try {
        const content = await readFile(filePath);
        res.writeHead(200, { "content-type": types[path.extname(filePath)] || "application/octet-stream" });
        if (req.method === "HEAD") return res.end();
        res.end(content);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        const content = await readFile(path.join(publicRoot, "index.html"));
        res.writeHead(200, { "content-type": types[".html"] });
        res.end(content);
      }
    } catch (error) {
      json(res, 400, { error: error.message || "Unexpected error" });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createServer();
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use. Stop the other process or run PORT=4174 npm run dev.`);
      process.exitCode = 1;
      return;
    }
    throw error;
  });
  server.listen(port, () => {
    console.log(`AI Conference Agent demo running at http://localhost:${port}`);
    console.log("Default real-processing pipeline: Local MLX Whisper transcription · Local Qwen3 analysis.");
  });
}
