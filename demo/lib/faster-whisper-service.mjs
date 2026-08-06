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
const adapterPath = path.join(demoRoot, "local-ai", "transcribe_cross_platform.py");
export const defaultFasterWhisperModel = "large-v3-turbo";

function pythonPath(platform = process.platform) {
  return localPythonPath({ demoRoot, configured: process.env.CROSS_PLATFORM_PYTHON, platform });
}

export async function getFasterWhisperStatus({
  execFileImpl = execFileAsync,
  python = pythonPath(),
  model = process.env.FASTER_WHISPER_MODEL || defaultFasterWhisperModel,
  timeoutMs = 4_000
} = {}) {
  try {
    await execFileImpl(python, [adapterPath, "--health"], { timeout: timeoutMs });
    return { available: true, model, python };
  } catch {
    return { available: false, model, python };
  }
}

export async function transcribeAudioCrossPlatform({
  bytes,
  fileName,
  model = process.env.FASTER_WHISPER_MODEL || defaultFasterWhisperModel,
  python = pythonPath(),
  execFileImpl = execFileAsync,
  timeoutMs = 20 * 60 * 1_000
}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "conference-whisper-"));
  const extension = path.extname(fileName || "").replace(/[^.a-zA-Z0-9]/g, "").slice(0, 10) || ".audio";
  const inputPath = path.join(directory, `input${extension}`);
  const outputPath = path.join(directory, "transcript.json");
  try {
    await writeFile(inputPath, bytes);
    await execFileImpl(python, [adapterPath, "--input", inputPath, "--output", outputPath, "--model", model], {
      timeout: timeoutMs,
      maxBuffer: 2 * 1024 * 1024
    });
    const result = JSON.parse(await readFile(outputPath, "utf8"));
    if (!result.text?.trim()) throw new ProviderError("faster-whisper returned no transcript text", { code: "empty_local_transcript" });
    return { text: result.text.trim(), segments: Array.isArray(result.segments) ? result.segments : [] };
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError(`Cross-platform transcription failed: ${error.stderr?.trim() || error.message}`, {
      status: 503,
      code: "faster_whisper_failed",
      retryable: false
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
