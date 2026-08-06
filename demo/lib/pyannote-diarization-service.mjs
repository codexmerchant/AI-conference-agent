import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { ProviderError } from "./openai-service.mjs";
import { localPythonPath } from "./python-runtime.mjs";

const execFileAsync = promisify(execFile);
const demoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adapterPath = path.join(demoRoot, "local-ai", "diarize_cross_platform.py");
export const defaultPyannoteModel = "pyannote/speaker-diarization-community-1";

function pythonPath(platform = process.platform) {
  return localPythonPath({ demoRoot, configured: process.env.CROSS_PLATFORM_PYTHON, platform });
}

export async function getPyannoteStatus({
  execFileImpl = execFileAsync,
  python = pythonPath(),
  model = process.env.PYANNOTE_MODEL || defaultPyannoteModel,
  token = process.env.HUGGINGFACE_TOKEN,
  timeoutMs = 4_000
} = {}) {
  try {
    await execFileImpl(python, [adapterPath, "--health"], { timeout: timeoutMs });
    return { available: Boolean(token), installed: true, model, python, tokenConfigured: Boolean(token) };
  } catch {
    return { available: false, installed: false, model, python, tokenConfigured: Boolean(token) };
  }
}

export async function diarizeAudioCrossPlatform({
  bytes,
  fileName,
  model = process.env.PYANNOTE_MODEL || defaultPyannoteModel,
  token = process.env.HUGGINGFACE_TOKEN,
  python = pythonPath(),
  execFileImpl = execFileAsync,
  timeoutMs = 20 * 60 * 1_000
}) {
  if (!token) throw new ProviderError("HUGGINGFACE_TOKEN is required when DIARIZATION_PROVIDER=pyannote", { status: 503, code: "missing_huggingface_token", retryable: false });
  const directory = await mkdtemp(path.join(os.tmpdir(), "conference-pyannote-"));
  const extension = path.extname(fileName || "").replace(/[^.a-zA-Z0-9]/g, "").slice(0, 10) || ".audio";
  const inputPath = path.join(directory, `input${extension}`);
  const outputPath = path.join(directory, "diarization.json");
  try {
    await writeFile(inputPath, bytes);
    await execFileImpl(python, [adapterPath, "--input", inputPath, "--output", outputPath, "--model", model], {
      timeout: timeoutMs,
      maxBuffer: 4 * 1024 * 1024,
      env: { ...process.env, HUGGINGFACE_TOKEN: token }
    });
    const result = JSON.parse(await readFile(outputPath, "utf8"));
    const segments = Array.isArray(result.segments) ? result.segments.filter((segment) => segment.speakerId && Number.isFinite(segment.start) && Number.isFinite(segment.end) && segment.end > segment.start) : [];
    if (!segments.length) throw new ProviderError("pyannote returned no speaker segments", { code: "empty_diarization" });
    return { segments, processingTimeSeconds: Number(result.processingTimeSeconds) || null };
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError(`Cross-platform diarization failed: ${error.stderr?.trim() || error.message}`, { status: 503, code: "pyannote_failed", retryable: false });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
