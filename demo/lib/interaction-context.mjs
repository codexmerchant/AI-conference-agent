function inputError(message, code) {
  const error = new Error(message);
  error.status = 400;
  error.code = code;
  error.retryable = false;
  return error;
}

function isCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isTimezone(value) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function validateInteractionContext(value = {}) {
  const userName = String(value.userName || "").trim();
  const interactionDate = String(value.interactionDate || "").trim();
  const timezone = String(value.timezone || "").trim();
  if (!userName) throw inputError("Enter your name as it appears in the conversation", "missing_user_name");
  if (userName.length > 100) throw inputError("Your name must be 100 characters or fewer", "invalid_user_name");
  if (!isCalendarDate(interactionDate)) throw inputError("Choose the date when the conversation happened", "invalid_interaction_date");
  if (!timezone || !isTimezone(timezone)) throw inputError("Choose a valid conversation timezone", "invalid_timezone");
  return { userName, interactionDate, timezone };
}

export function validateProcessingPermission(value) {
  if (String(value) !== "true") throw inputError("Confirm that you have permission to process this recording", "permission_required");
}

export function validateAudioFile(audio, maxBytes) {
  if (!(audio instanceof File) || !audio.size) throw inputError("Choose an audio file to process", "audio_required");
  if (audio.size > maxBytes) {
    const error = inputError("Audio upload exceeds the 25 MB limit", "audio_too_large");
    error.status = 413;
    throw error;
  }
}
