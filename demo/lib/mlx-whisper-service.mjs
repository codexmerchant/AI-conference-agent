import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { ProviderError } from "./openai-service.mjs";

const execFileAsync = promisify(execFile);
const demoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adapterPath = path.join(demoRoot, "local-ai", "transcribe.py");

export const defaultMlxModel = "mlx-community/whisper-large-v3-turbo";

function pythonPath() {
  const configured = process.env.MLX_WHISPER_PYTHON;
  if (!configured) return path.join(demoRoot, ".venv", "bin", "python");
  return path.isAbsolute(configured) ? configured : path.resolve(demoRoot, configured);
}

export async function getMlxWhisperStatus({
  execFileImpl = execFileAsync,
  python = pythonPath(),
  model = process.env.MLX_WHISPER_MODEL || defaultMlxModel,
  timeoutMs = 4_000
} = {}) {
  try {
    await execFileImpl(python, [adapterPath, "--health"], { timeout: timeoutMs });
    return { available: true, model, python };
  } catch {
    return { available: false, model, python };
  }
}

export async function transcribeAudioLocally({
  bytes,
  fileName,
  model = process.env.MLX_WHISPER_MODEL || defaultMlxModel,
  python = pythonPath(),
  execFileImpl = execFileAsync,
  timeoutMs = 20 * 60 * 1_000
}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "conference-mlx-"));
  const extension = path.extname(fileName || "").replace(/[^.a-zA-Z0-9]/g, "").slice(0, 10) || ".audio";
  const inputPath = path.join(directory, `input${extension}`);
  const outputPath = path.join(directory, "transcript.json");

  try {
    await writeFile(inputPath, bytes);
    await execFileImpl(python, [
      adapterPath,
      "--input", inputPath,
      "--output", outputPath,
      "--model", model
    ], { timeout: timeoutMs, maxBuffer: 2 * 1024 * 1024 });

    const result = JSON.parse(await readFile(outputPath, "utf8"));
    if (!result.text?.trim()) {
      throw new ProviderError("MLX Whisper returned no transcript text", { code: "empty_local_transcript" });
    }
    return {
      text: result.text.trim(),
      segments: Array.isArray(result.segments) ? result.segments : []
    };
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    const detail = error.stderr?.trim() || error.message;
    throw new ProviderError(`Local MLX Whisper transcription failed: ${detail}`, {
      status: 503,
      code: "mlx_whisper_failed",
      retryable: false
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
