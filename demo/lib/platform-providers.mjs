export function defaultProviders(platform = process.platform) {
  return platform === "darwin"
    ? { transcription: "mlx", diarization: "fluid", analysis: "ollama" }
    : { transcription: "faster-whisper", diarization: "pyannote", analysis: "ollama" };
}

export function configuredProviders({ env = process.env, platform = process.platform } = {}) {
  const defaults = defaultProviders(platform);
  return {
    transcription: env.TRANSCRIPTION_PROVIDER || defaults.transcription,
    diarization: env.DIARIZATION_PROVIDER || defaults.diarization,
    analysis: env.ANALYSIS_PROVIDER || defaults.analysis
  };
}

export function platformLabel(platform = process.platform) {
  if (platform === "darwin") return "macOS";
  if (platform === "win32") return "Windows";
  if (platform === "linux") return "Linux";
  return platform;
}
