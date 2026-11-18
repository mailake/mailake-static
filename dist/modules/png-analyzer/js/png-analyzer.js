import initialize, { png_parse } from "../../../plugins/png-analysis/1.0/png_core.js";

const analyzer_root = document.querySelector("main[data-png-analyzer-messages]");
if (!(analyzer_root instanceof HTMLElement)) {
  throw new Error("The PNG Analyzer page is missing its localized messages.");
}

const messages = JSON.parse(analyzer_root.dataset.pngAnalyzerMessages || "");
const fields = messages.chunks;

const binaryFields = new Set([
  "idat",
  "alphas",
  "compressed_profile",
  "compressed_text",
  "data",
  "keyword",
  "language_tag",
  "name",
  "profile_name",
  "text",
  "translated_keyword",
]);

const input = document.getElementById("file-input");
const dropzone = document.getElementById("dropzone");
const statusMessage = document.getElementById("status-message");
const resultsPanel = document.getElementById("results-panel");
const resultsEmpty = document.getElementById("results-empty");
const fileMeta = document.getElementById("file-meta-row");
const chunkList = document.getElementById("chunk-list");

let analyzerReady = false;
let analyzerLoadError = "";
let currentRun = 0;

function setStatus(message, state) {
  statusMessage.textContent = message;
  statusMessage.dataset.state = state;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isByteArray(value) {
  return Array.isArray(value) && value.every((item) => Number.isInteger(item) && item >= 0 && item <= 255);
}

function summarize(value, key) {
  if (key === "iend") return messages.iend;
  if (value === null || value === undefined) return messages.not_included;
  if (binaryFields.has(key) && isByteArray(value)) {
    return messages.binary_summary.replace("{size}", formatBytes(value.length));
  }
  if (Array.isArray(value)) {
    return messages.array_summary.replace("{count}", String(value.length));
  }
  if (typeof value === "object") {
    return messages.object_summary.replace("{count}", String(Object.keys(value).length));
  }
  return String(value);
}

function compactBinary(value, key) {
  if (Array.isArray(value)) {
    if (binaryFields.has(key) && isByteArray(value)) {
      return messages.binary_detail.replace("{count}", String(value.length));
    }
    return value.map((item) => compactBinary(item, key));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        compactBinary(childValue, childKey),
      ]),
    );
  }

  return value;
}

function makeChunkRow([key, chunk, label], result) {
  const row = document.createElement("div");
  row.className = "chunk-row";

  const name = document.createElement("div");
  name.className = "chunk-name";
  const chunkCode = document.createElement("span");
  chunkCode.className = "chunk-code";
  chunkCode.textContent = chunk;
  const chunkLabel = document.createElement("span");
  chunkLabel.className = "chunk-label";
  chunkLabel.textContent = label;
  const chunkKey = document.createElement("span");
  chunkKey.className = "chunk-key";
  chunkKey.textContent = key;
  name.append(chunkCode, chunkLabel, chunkKey);

  const value = document.createElement("div");
  value.className = "chunk-value";
  const parsedValue = result[key];
  value.append(document.createTextNode(summarize(parsedValue, key)));

  if (key !== "iend" && parsedValue !== null && parsedValue !== undefined) {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = messages.details;
    const pre = document.createElement("pre");
    pre.textContent = JSON.stringify(compactBinary(parsedValue, key), null, 2);
    details.append(summary, pre);
    value.append(details);
  }

  row.append(name, value);
  return row;
}

function renderResult(file, result) {
  fileMeta.textContent = "";
  const dimensions = result.ihdr && Number.isFinite(result.ihdr.width) && Number.isFinite(result.ihdr.height)
    ? ` · ${result.ihdr.width} × ${result.ihdr.height}`
    : "";
  fileMeta.textContent = `${file.name} · ${formatBytes(file.size)}${dimensions}`;

  const fragment = document.createDocumentFragment();
  for (const field of fields) fragment.append(makeChunkRow(field, result));
  chunkList.replaceChildren(fragment);
  resultsPanel.hidden = false;
  resultsEmpty.hidden = true;
}

function showEmptyResults() {
  resultsPanel.hidden = true;
  resultsEmpty.hidden = false;
  fileMeta.textContent = "";
  chunkList.replaceChildren();
}

async function analyzeFile(file) {
  const run = ++currentRun;
  showEmptyResults();

  if (!file.name.toLowerCase().endsWith(".png") && file.type !== "image/png") {
    setStatus(messages.status.invalid_file, "error");
    input.value = "";
    return;
  }

  if (!analyzerReady) {
    setStatus(analyzerLoadError || messages.status.module_loading, "error");
    input.value = "";
    return;
  }

  setStatus(messages.status.loading.replace("{file}", file.name), "loading");

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const parsed = JSON.parse(png_parse(bytes));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(messages.invalid_result);
    }
    if (run !== currentRun) return;
    renderResult(file, parsed);
    setStatus(messages.status.completed, "success");
  } catch (error) {
    if (run !== currentRun) return;
    console.error("PNG analysis failed:", error);
    showEmptyResults();
    const detail = error instanceof Error ? error.message : String(error);
    setStatus(messages.status.failed.replace("{detail}", detail), "error");
  } finally {
    if (run === currentRun) input.value = "";
  }
}

input.addEventListener("change", () => {
  const file = input.files && input.files[0];
  if (file) void analyzeFile(file);
});

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("is-dragging");
});

dropzone.addEventListener("dragleave", (event) => {
  if (!dropzone.contains(event.relatedTarget)) dropzone.classList.remove("is-dragging");
});

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("is-dragging");
  const file = event.dataTransfer && event.dataTransfer.files[0];
  if (file) {
    void analyzeFile(file);
  } else {
    setStatus(messages.status.cannot_read_drop, "error");
  }
});

setStatus(messages.status.initializing, "loading");
initialize()
  .then(() => {
    analyzerReady = true;
    setStatus(messages.status.ready, "ready");
  })
  .catch((error) => {
    console.error("Unable to load the PNG analyzer:", error);
    const detail = error instanceof Error ? error.message : String(error);
    analyzerLoadError = messages.status.module_failed.replace("{detail}", detail);
    setStatus(analyzerLoadError, "error");
  });
