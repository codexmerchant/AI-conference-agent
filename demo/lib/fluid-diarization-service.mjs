import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { ProviderError } from "./openai-service.mjs";

const execFileAsync = promisify(execFile);
const demoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function binaryPath() {
  return process.env.FLUID_AUDIO_BINARY || path.join(demoRoot, ".local-ai", "FluidAudio", ".build", "release", "fluidaudio");
}

export async function getFluidDiarizationStatus({ binary = binaryPath(), accessImpl = access } = {}) {
  try {
    await accessImpl(binary, constants.X_OK);
    return { available: true, version: "FluidAudio 0.7.12", binary };
  } catch {
    return { available: false, version: "FluidAudio 0.7.12", binary };
  }
}

export async function diarizeAudioLocally({ bytes, fileName, binary = binaryPath(), execFileImpl = execFileAsync, timeoutMs = 10 * 60 * 1_000 }) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "conference-fluid-"));
  const extension = path.extname(fileName || "").replace(/[^.a-zA-Z0-9]/g, "").slice(0, 10) || ".audio";
  const inputPath = path.join(directory, `input${extension}`);
  const outputPath = path.join(directory, "diarization.json");
  try {
    await writeFile(inputPath, bytes);
    await execFileImpl(binary, ["process", inputPath, "--output", outputPath, "--threshold", "0.6"], {
      timeout: timeoutMs,
      maxBuffer: 4 * 1024 * 1024
    });
    const result = JSON.parse(await readFile(outputPath, "utf8"));
    const segments = Array.isArray(result.segments) ? result.segments.map((segment) => ({
      speakerId: String(segment.speakerId),
      start: Number(segment.startTimeSeconds),
      end: Number(segment.endTimeSeconds)
    })).filter((segment) => segment.speakerId && Number.isFinite(segment.start) && Number.isFinite(segment.end) && segment.end > segment.start) : [];
    if (!segments.length) throw new ProviderError("FluidAudio returned no speaker segments", { code: "empty_diarization" });
    return { segments, processingTimeSeconds: Number(result.processingTimeSeconds) || null };
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError(`Local FluidAudio diarization failed: ${error.stderr?.trim() || error.message}`, {
      status: 503,
      code: "fluid_diarization_failed",
      retryable: false
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function overlap(a, b) {
  return Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
}

function normalized(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function dominantSpeaker(segment, diarizationSegments) {
  const totals = new Map();
  for (const diarized of diarizationSegments) {
    const duration = overlap(segment, diarized);
    if (duration > 0) totals.set(diarized.speakerId, (totals.get(diarized.speakerId) || 0) + duration);
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function introducedIdentitySpeaker(transcriptSegments, diarizationSegments, name) {
  const target = normalized(name);
  if (!target) return null;
  const segment = transcriptSegments.find((item) => {
    const text = normalized(item.text);
    return text.includes(target) && /\b(i am|i m|my name is|this is)\b/.test(text);
  });
  return segment ? dominantSpeaker(segment, diarizationSegments) : null;
}

export function attributeTranscriptSegments({ transcriptSegments, diarizationSegments, userName, otherParticipantName }) {
  const userSpeaker = introducedIdentitySpeaker(transcriptSegments, diarizationSegments, userName);
  const contactSpeaker = introducedIdentitySpeaker(transcriptSegments, diarizationSegments, otherParticipantName);
  const mappingsConflict = Boolean(userSpeaker && contactSpeaker && userSpeaker === contactSpeaker);
  const mappedUser = mappingsConflict ? null : userSpeaker;
  const mappedContact = mappingsConflict ? null : contactSpeaker;

  const segments = transcriptSegments.map((segment) => {
    const speakerId = dominantSpeaker(segment, diarizationSegments);
    const role = speakerId && speakerId === mappedUser ? "App user" : speakerId && speakerId === mappedContact ? "Other participant" : "Unclear";
    const label = role === "App user" ? `APP USER (${userName})` : role === "Other participant" ? `OTHER PARTICIPANT (${otherParticipantName})` : `UNCLEAR SPEAKER${speakerId ? ` (${speakerId})` : ""}`;
    return { ...segment, speakerId, role, label };
  });

  return {
    transcript: segments.map((segment) => `${segment.label}: ${String(segment.text).trim()}`).join("\n"),
    segments,
    speakers: { userSpeaker: mappedUser, contactSpeaker: mappedContact },
    requiresConfirmation: !mappedUser || !mappedContact || segments.some((segment) => segment.role === "Unclear")
  };
}
