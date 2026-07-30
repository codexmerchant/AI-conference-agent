const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const state = {
  file: null,
  sampleMode: false,
  duration: "—",
  audioUrl: null,
  current: null,
  dirty: false,
  interactions: []
};

const stages = [
  [12, "Preparing the audio…", "Checking the recording and creating a secure processing job."],
  [32, "Creating the transcript…", "Separating the conversation into reviewable source text."],
  [55, "Finding people and topics…", "Extracting contact details, context, and discussion themes."],
  [76, "Drafting the conversation brief…", "Turning the transcript into a focused, editable summary."],
  [91, "Identifying next moves…", "Finding commitments and preparing a personalized follow-up."],
  [100, "Ready for review", "Every generated field remains editable before it is saved."]
];

async function api(path, options = {}) {
  const headers = { ...options.headers };
  if (options.body && !(options.body instanceof FormData) && !headers["content-type"]) headers["content-type"] = "application/json";
  const response = await fetch(path, {
    ...options,
    headers
  });
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload.error || "Something went wrong");
    Object.assign(error, payload);
    throw error;
  }
  return payload;
}

function formatBytes(bytes = 0) {
  if (!bytes) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 2500);
}

function selectView(name) {
  $$(".view").forEach((view) => view.classList.toggle("is-visible", view.id === `${name}-view`));
  $$(".nav-item").forEach((item) => item.classList.toggle("is-active", item.dataset.view === name));
  $("#view-eyebrow").textContent = name === "library" ? "Conference memory" : "Conference workspace";
  $("#view-title").textContent = name === "library" ? "Return to any conversation" : "Turn a conversation into momentum";
  if (name === "library") loadLibrary();
}

function updateProcessAvailability() {
  const allowed = state.file && (state.sampleMode || $("#consent-confirmed").checked);
  $("#process-button").disabled = !allowed;
}

function setFile(file, { sample = false } = {}) {
  if (!file) return;
  if (!sample && !file.type.startsWith("audio/")) return showToast("Choose an audio file to continue");
  if (file.size > 25 * 1024 * 1024) return showToast("Please choose an audio file under 25 MB");

  state.file = file;
  state.sampleMode = sample;
  state.duration = sample ? "02:14" : "—";
  $("#file-title").textContent = file.name;
  $("#file-detail").textContent = `${formatBytes(file.size)} · Ready to process`;
  $("#drop-zone").classList.add("has-file");
  $("#consent-row").hidden = sample;
  $("#consent-confirmed").checked = sample;
  $("#process-button").childNodes[0].textContent = sample ? "Run sample workflow " : "Transcribe & analyze ";
  updateProcessAvailability();

  if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
  if (!sample) {
    state.audioUrl = URL.createObjectURL(file);
    $("#audio-preview").src = state.audioUrl;
    $("#audio-preview").hidden = false;
    $("#audio-preview").onloadedmetadata = () => {
      const seconds = Math.round($("#audio-preview").duration || 0);
      if (Number.isFinite(seconds) && seconds > 0) state.duration = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    };
  } else {
    $("#audio-preview").hidden = true;
  }
}

function resetCapture() {
  state.current = null;
  state.dirty = false;
  state.file = null;
  state.sampleMode = false;
  state.duration = "—";
  $("#capture-card").hidden = false;
  $("#processing-card").hidden = true;
  $("#results").hidden = true;
  $("#capture-form").reset();
  setInteractionDefaults();
  $("#conference-name").value = "Human-Centered AI Summit 2026";
  $("#session-name").value = "Expo floor conversation";
  $("#file-title").textContent = "Drop a conversation recording here";
  $("#file-detail").textContent = "MP3, M4A, WAV, or WebM · up to 25 MB";
  $("#drop-zone").classList.remove("has-file");
  $("#audio-preview").hidden = true;
  $("#saved-audio").hidden = true;
  $("#consent-row").hidden = true;
  $("#consent-confirmed").checked = false;
  $("#process-button").disabled = true;
  $("#process-button").childNodes[0].textContent = "Transcribe & analyze ";
  $("#processing-error").hidden = true;
  $("#progress-bar").style.background = "";
  selectView("workspace");
}

function setInteractionDefaults() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  $("#interaction-date").value = localDate;
  $("#interaction-timezone").value = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

async function processConversation(event) {
  event?.preventDefault?.();
  if (!state.file) return;

  $("#capture-card").hidden = true;
  $("#processing-card").hidden = false;
  $("#processing-error").hidden = true;
  $("#retry-processing").hidden = false;
  $("#progress-bar").style.background = "";
  let stageIndex = 0;
  const updateStage = ([progress, title, detail]) => {
    $("#progress-bar").style.width = `${progress}%`;
    $("#progress-value").textContent = `${progress}%`;
    $("#processing-title").textContent = title;
    $("#processing-detail").textContent = detail;
  };
  updateStage(stages[0]);
  const stageTimer = setInterval(() => {
    stageIndex = Math.min(stageIndex + 1, stages.length - 2);
    updateStage(stages[stageIndex]);
  }, 1400);

  try {
    let latest;
    if (state.sampleMode) {
      latest = await api("/api/process/sample", {
        method: "POST",
        body: JSON.stringify({
          conferenceName: $("#conference-name").value,
          sessionName: $("#session-name").value,
          userName: $("#user-name").value,
          interactionDate: $("#interaction-date").value,
          timezone: $("#interaction-timezone").value,
          fileName: state.file.name,
          fileSize: state.file.size,
          duration: state.duration
        })
      });
    } else {
      const form = new FormData();
      form.append("audio", state.file, state.file.name);
      form.append("conferenceName", $("#conference-name").value);
      form.append("sessionName", $("#session-name").value);
      form.append("userName", $("#user-name").value);
      form.append("interactionDate", $("#interaction-date").value);
      form.append("timezone", $("#interaction-timezone").value);
      form.append("duration", state.duration);
      form.append("consentConfirmed", String($("#consent-confirmed").checked));
      latest = await api("/api/process", { method: "POST", body: form });
    }
    clearInterval(stageTimer);
    updateStage(stages.at(-1));
    await new Promise((resolve) => setTimeout(resolve, 350));
    state.current = latest;
    state.dirty = false;
    renderInteraction();
  } catch (error) {
    clearInterval(stageTimer);
    $("#processing-title").textContent = "We couldn’t finish this conversation";
    $("#processing-detail").textContent = "Your review workspace has not been changed.";
    $("#progress-bar").style.width = "100%";
    $("#progress-bar").style.background = "#c36b56";
    $("#progress-value").textContent = "!";
    $("#processing-error-message").textContent = error.message;
    $("#retry-processing").hidden = error.retryable === false;
    $("#processing-error").hidden = false;
  }
}

function renderTopics() {
  $("#topics").innerHTML = state.current.topics.map((topic) => `<span class="topic">${escapeHtml(topic)}</span>`).join("");
}

function renderActions() {
  $("#action-list").innerHTML = state.current.actionItems.map((item) => `
    <div class="action-row ${item.completed ? "is-done" : ""}" data-action-id="${escapeHtml(item.id)}">
      <input type="checkbox" ${item.completed ? "checked" : ""} aria-label="Complete ${escapeHtml(item.text)}" />
      <div class="action-content">
        <input class="action-text" value="${escapeHtml(item.text)}" aria-label="Action item" />
        <div class="action-controls">
          <label>Owner<select class="action-owner" aria-label="Action owner">
            ${["Me", "Contact", "Mutual", "Unclear"].map((owner) => `<option ${item.owner === owner ? "selected" : ""}>${owner}</option>`).join("")}
          </select></label>
          <label>Due date<input class="action-date" type="date" value="${escapeHtml(item.dueDate || "")}" aria-label="Action due date" /></label>
          <span class="action-support">${Math.round((Number(item.confidence) || 0) * 100)}% supported</span>
        </div>
        ${item.evidence ? `<details class="action-evidence"><summary>Source evidence</summary><p>“${escapeHtml(item.evidence)}”</p></details>` : ""}
      </div>
      <button class="action-remove" aria-label="Remove action">×</button>
    </div>`).join("");
}

function renderReviewState() {
  const item = state.current;
  const confidence = Math.round((Number(item.quality?.overallConfidence) || 0) * 100);
  const requiresReview = item.quality?.requiresReview !== false;
  $("#analysis-confidence").textContent = `${confidence}% supported${requiresReview ? " · review" : ""}`;
  $("#analysis-confidence").classList.toggle("needs-review", requiresReview);
  const flags = item.reviewFlags || [];
  $("#review-flags").hidden = flags.length === 0;
  $("#review-flags").innerHTML = flags.length
    ? `<strong>Review these items</strong><ul>${flags.map((flag) => `<li>${escapeHtml(flag.message)}</li>`).join("")}</ul>`
    : "";
}

function renderInteraction() {
  const item = state.current;
  $("#processing-card").hidden = true;
  $("#capture-card").hidden = true;
  $("#results").hidden = false;
  $("#result-contact-name").textContent = item.contact.name;
  $("#result-context").textContent = `${item.contact.company} · ${item.conferenceName}`;
  $("#summary").value = item.summary;
  $("#follow-up").value = item.followUp;
  $("#transcript").value = item.transcript;
  $("#contact-name").value = item.contact.name;
  $("#contact-role").value = item.contact.role;
  $("#contact-company").value = item.contact.company;
  $("#contact-email").value = item.contact.email;
  $("#contact-initials").textContent = initials(item.contact.name);
  $("#source-file-name").textContent = item.fileName;
  $("#source-duration").textContent = item.duration;
  $("#source-size").textContent = formatBytes(item.fileSize);
  const localAnalysis = item.provenance?.extraction?.startsWith("Local ") ? item.provenance.extraction.replace(" structured analysis", " analysis") : "";
  $("#result-mode").textContent = item.processingMode === "real"
    ? `Real audio processed${localAnalysis ? ` · ${localAnalysis}` : ""} · ready to review`
    : "Sample data · ready to review";
  if (item.mediaId) {
    $("#saved-audio").src = `/api/media/${encodeURIComponent(item.mediaId)}`;
    $("#saved-audio").hidden = false;
  } else {
    $("#saved-audio").hidden = true;
  }
  $("#save-status").textContent = item.savedAt ? `Saved ${new Date(item.savedAt).toLocaleString()}` : "Not saved yet";
  renderTopics();
  renderActions();
  renderReviewState();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function collectEdits() {
  if (!state.current) return;
  state.current.summary = $("#summary").value;
  state.current.followUp = $("#follow-up").value;
  state.current.transcript = $("#transcript").value;
  state.current.contact = {
    ...state.current.contact,
    name: $("#contact-name").value,
    role: $("#contact-role").value,
    company: $("#contact-company").value,
    email: $("#contact-email").value
  };
  state.dirty = true;
  $("#save-status").textContent = "Unsaved changes";
}

async function saveInteraction() {
  collectEdits();
  const savedAt = new Date().toISOString();
  state.current = await api("/api/interactions", {
    method: "POST",
    body: JSON.stringify({ ...state.current, savedAt })
  });
  state.current.savedAt = savedAt;
  state.dirty = false;
  $("#save-status").textContent = `Saved ${new Date(savedAt).toLocaleString()}`;
  await loadLibrary(false);
  showToast("Interaction saved — you can reopen it anytime");
}

async function loadLibrary(render = true) {
  state.interactions = await api("/api/interactions");
  $("#nav-count").textContent = state.interactions.length;
  $("#empty-library").hidden = state.interactions.length > 0;
  $("#conversation-list").innerHTML = state.interactions.map((item) => `
    <article class="conversation-card">
      <div class="conversation-icon">✦</div>
      <div>
        <h3>${escapeHtml(item.contact?.name || "Unknown contact")}</h3>
        <p>${escapeHtml(item.contact?.company || "")}${item.contact?.company ? " · " : ""}${escapeHtml(item.sessionName)}</p>
        <div class="topic-list">${(item.topics || []).slice(0, 3).map((topic) => `<span class="topic">${escapeHtml(topic)}</span>`).join("")}</div>
      </div>
      <div><time>${new Date(item.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time><button class="button secondary reopen-button" data-id="${escapeHtml(item.id)}">Reopen</button></div>
    </article>`).join("");
  if (render) $("#conversation-list").scrollIntoView({ block: "start" });
}

async function reopenInteraction(id) {
  state.current = await api(`/api/interactions/${encodeURIComponent(id)}`);
  state.file = { name: state.current.fileName, size: state.current.fileSize, type: "audio/demo" };
  state.sampleMode = state.current.processingMode !== "real";
  state.dirty = false;
  selectView("workspace");
  renderInteraction();
  showToast("Saved interaction reopened");
}

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

$("#audio-file").addEventListener("change", (event) => setFile(event.target.files[0]));
$("#controlled-test-preset").addEventListener("click", () => {
  $("#conference-name").value = "HealthTech Futures 2026";
  $("#session-name").value = "ClearPath Labs conversation";
  $("#user-name").value = "Maya Chen";
  $("#interaction-date").value = "2026-08-02";
  showToast("Controlled test settings applied");
});
$("#sample-button").addEventListener("click", () => setFile({ name: "maya-chen-conversation.m4a", size: 2_840_320, type: "audio/mp4" }, { sample: true }));
$("#capture-form").addEventListener("submit", processConversation);
$("#consent-confirmed").addEventListener("change", updateProcessAvailability);
$("#retry-processing").addEventListener("click", processConversation);
$("#return-to-capture").addEventListener("click", () => {
  $("#processing-card").hidden = true;
  $("#capture-card").hidden = false;
});
$("#save-button").addEventListener("click", saveInteraction);
$("#new-interaction").addEventListener("click", resetCapture);
$("#back-to-capture").addEventListener("click", resetCapture);
$("#library-new").addEventListener("click", resetCapture);
$("#add-action").addEventListener("click", () => {
  const id = `${state.current.id}_action_${Date.now().toString(36)}`;
  state.current.actionItems.push({ id, text: "New action item", owner: "Me", participant: state.current.userName || "", dueDate: null, dateEvidence: null, evidence: "", confidence: 1, completed: false });
  state.dirty = true;
  renderActions();
  $("#save-status").textContent = "Unsaved changes";
});
$("#copy-follow-up").addEventListener("click", async () => {
  await navigator.clipboard.writeText($("#follow-up").value);
  showToast("Follow-up draft copied");
});

$$(".nav-item").forEach((button) => button.addEventListener("click", () => selectView(button.dataset.view)));
$$(["#summary", "#follow-up", "#transcript", "#contact-name", "#contact-role", "#contact-company", "#contact-email"].join(",")).forEach((field) => field.addEventListener("input", collectEdits));
$("#action-list").addEventListener("input", (event) => {
  const row = event.target.closest(".action-row");
  if (!row) return;
  const item = state.current.actionItems.find((action) => action.id === row.dataset.actionId);
  if (event.target.matches("[type='checkbox']")) item.completed = event.target.checked;
  if (event.target.matches(".action-text")) item.text = event.target.value;
  if (event.target.matches(".action-owner")) item.owner = event.target.value;
  if (event.target.matches(".action-date")) item.dueDate = event.target.value || null;
  state.dirty = true;
  if (event.target.matches("[type='checkbox']")) renderActions();
  $("#save-status").textContent = "Unsaved changes";
});
$("#action-list").addEventListener("click", (event) => {
  const row = event.target.closest(".action-row");
  if (!row || !event.target.matches(".action-remove")) return;
  state.current.actionItems = state.current.actionItems.filter((action) => action.id !== row.dataset.actionId);
  state.dirty = true;
  renderActions();
  $("#save-status").textContent = "Unsaved changes";
});
$("#conversation-list").addEventListener("click", (event) => {
  const button = event.target.closest(".reopen-button");
  if (button) reopenInteraction(button.dataset.id);
});

const dropZone = $("#drop-zone");
["dragenter", "dragover"].forEach((name) => dropZone.addEventListener(name, (event) => { event.preventDefault(); dropZone.classList.add("is-dragging"); }));
["dragleave", "drop"].forEach((name) => dropZone.addEventListener(name, (event) => { event.preventDefault(); dropZone.classList.remove("is-dragging"); }));
dropZone.addEventListener("drop", (event) => setFile(event.dataTransfer.files[0]));

window.addEventListener("beforeunload", (event) => {
  if (!state.dirty) return;
  event.preventDefault();
});

Promise.all([
  loadLibrary(false),
  api("/api/health").then((health) => {
    if (health.realProcessingConfigured && health.transcriptionProvider === "mlx" && health.analysisProvider === "ollama" && health.localDiarizationReady) {
      $(".system-status").lastChild.textContent = ` Fully local · MLX Whisper + ${health.localAnalysisModel}`;
    } else if (health.realProcessingConfigured) {
      $(".system-status").lastChild.textContent = ` Ready · ${health.transcriptionProvider} transcription + FluidAudio speakers + ${health.analysisProvider} analysis`;
    } else if (health.localAnalysisReady && !health.localTranscriptionReady) {
      $(".system-status").lastChild.textContent = ` Local ${health.localAnalysisModel} ready · run MLX Whisper setup`;
    } else if (health.localTranscriptionReady && !health.localAnalysisReady) {
      $(".system-status").lastChild.textContent = " Local MLX Whisper ready · start Ollama/Qwen3";
    } else {
      $(".system-status").lastChild.textContent = " Sample ready · processing setup needed";
    }
  })
]).catch(() => showToast("The local demo service is not available"));

setInteractionDefaults();
