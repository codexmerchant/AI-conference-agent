import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDemoAnalysis, createRealAnalysis, normalizeInteraction } from "./lib/demo-data.mjs";
import { MediaStore } from "./lib/media-store.mjs";
import { analyzeTranscript, ProviderError, transcribeAudio } from "./lib/openai-service.mjs";
import { analyzeTranscriptLocally, getOllamaStatus } from "./lib/ollama-service.mjs";
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
        const ollama = await getOllamaStatus();
        return json(res, 200, {
          status: "ok",
          realProcessingConfigured: Boolean(process.env.OPENAI_API_KEY),
          localAnalysisReady: ollama.available && ollama.modelReady,
          transcriptionModel: process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-transcribe",
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
          if (!process.env.OPENAI_API_KEY) {
            throw new ProviderError("Real audio processing is not configured. Start the demo with OPENAI_API_KEY set, or use the sample conversation.", {
              status: 503,
              code: "missing_api_key",
              retryable: false
            });
          }
          const form = await multipart(req);
          const audio = form.get("audio");
          if (!(audio instanceof File) || !audio.size) {
            const error = new Error("Choose an audio file to process");
            error.status = 400;
            throw error;
          }
          if (audio.size > maxAudioBytes) {
            const error = new Error("Audio upload exceeds the 25 MB limit");
            error.status = 413;
            throw error;
          }
          if (form.get("consentConfirmed") !== "true") {
            const error = new Error("Confirm that you have permission to process this recording");
            error.status = 400;
            throw error;
          }

          const input = {
            conferenceName: String(form.get("conferenceName") || ""),
            sessionName: String(form.get("sessionName") || ""),
            duration: String(form.get("duration") || "—")
          };
          const audioBytes = Buffer.from(await audio.arrayBuffer());
          const transcript = await transcribeAudio({
            bytes: audioBytes,
            fileName: audio.name,
            mimeType: audio.type,
            apiKey: process.env.OPENAI_API_KEY,
            model: process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-transcribe"
          });
          const ollama = await getOllamaStatus();
          const useLocalAnalysis = process.env.ANALYSIS_PROVIDER !== "openai" && ollama.available && ollama.modelReady;
          const analysis = useLocalAnalysis
            ? await analyzeTranscriptLocally({
                transcript,
                conferenceName: input.conferenceName,
                sessionName: input.sessionName,
                model: ollama.model
              })
            : await analyzeTranscript({
                transcript,
                conferenceName: input.conferenceName,
                sessionName: input.sessionName,
                apiKey: process.env.OPENAI_API_KEY,
                model: process.env.OPENAI_TEXT_MODEL || "gpt-5.6-terra"
              });
          const media = await mediaStore.save({ bytes: audioBytes, originalName: audio.name, mimeType: audio.type });
          return json(res, 200, createRealAnalysis({
            input,
            transcript,
            analysis,
            media,
            providers: {
              transcription: "OpenAI file transcription",
              analysis: useLocalAnalysis ? `Local ${ollama.model} structured analysis` : "OpenAI structured transcript analysis"
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
    if (!process.env.OPENAI_API_KEY) console.log("Audio transcription is not configured yet. Local Qwen analysis is detected separately; use the sample workflow until transcription is configured.");
  });
}
