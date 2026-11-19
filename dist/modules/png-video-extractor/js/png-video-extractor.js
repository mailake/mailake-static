import initialize, {
  extract_video_1,
} from "../../../plugins/png-analysis/1.0/png_core.js";

const extractor_root = document.querySelector("main[data-extract-video-messages]");
if (!(extractor_root instanceof HTMLElement)) {
  throw new Error("The PNG Video Extractor Case 1 page is missing its localized messages.");
}

const messages = JSON.parse(extractor_root.dataset.extractVideoMessages || "");
const input = document.getElementById("file-input");
const dropzone = document.getElementById("dropzone");
const statusMessage = document.getElementById("extract-status");
const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];

let extractorReady = false;
let extractorLoadError = "";
let isExtracting = false;

function setStatus(message, state) {
  statusMessage.hidden = false;
  statusMessage.textContent = message;
  statusMessage.dataset.state = state;
}

function clearStatus() {
  statusMessage.textContent = "";
  statusMessage.hidden = true;
  delete statusMessage.dataset.state;
}

function getOutputFilename(file) {
  const baseName = file.name
    .replace(/\.png$/i, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/[. ]+$/g, "");

  return `${baseName || "extracted-video-case-1"}.mp4`;
}

function isPng(bytes) {
  return (
    bytes.length >= pngSignature.length &&
    pngSignature.every((byte, index) => bytes[index] === byte)
  );
}

function downloadVideo(video, filename) {
  const objectUrl = URL.createObjectURL(video);
  const downloadLink = document.createElement("a");
  downloadLink.href = objectUrl;
  downloadLink.download = filename;
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

async function extractVideo(file) {
  if (!file.name.toLowerCase().endsWith(".png") && file.type !== "image/png") {
    setStatus(messages.status.invalid_file, "error");
    input.value = "";
    return;
  }

  if (!extractorReady) {
    setStatus(extractorLoadError || messages.status.module_loading, "error");
    input.value = "";
    return;
  }

  if (isExtracting) return;

  isExtracting = true;
  input.disabled = true;

  try {
    const outputFilename = getOutputFilename(file);
    let fileHandle;
    let useDownloadFallback =
      typeof window.showSaveFilePicker !== "function";

    if (!useDownloadFallback) {
      setStatus(messages.status.choosing_save, "loading");
      try {
        fileHandle = await window.showSaveFilePicker({
          suggestedName: outputFilename,
          types: [
            {
              description: "MP4 video",
              accept: { "video/mp4": [".mp4"] },
            },
          ],
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          setStatus(messages.status.save_canceled, "ready");
          return;
        }

        if (
          error instanceof DOMException &&
          ["NotAllowedError", "SecurityError"].includes(error.name)
        ) {
          useDownloadFallback = true;
        } else {
          console.error("Unable to open the video save dialog:", error);
          const detail = error instanceof Error ? error.message : String(error);
          setStatus(
            messages.status.save_failed.replace("{detail}", detail),
            "error",
          );
          return;
        }
      }
    }

    setStatus(messages.status.loading.replace("{file}", file.name), "loading");
    let video;
    try {
      const pngBytes = new Uint8Array(await file.arrayBuffer());
      if (!isPng(pngBytes)) {
        setStatus(messages.status.invalid_png, "error");
        return;
      }

      setStatus(messages.status.extracting, "loading");
      const videoBytes = extract_video_1(pngBytes);
      if (videoBytes.length === 0) {
        setStatus(messages.status.no_video, "error");
        return;
      }

      video = new Blob([videoBytes], { type: "video/mp4" });
    } catch (error) {
      console.error("PNG video extraction failed:", error);
      const detail = error instanceof Error ? error.message : String(error);
      if (detail.includes("INVALID_FILE_SIZE")) {
        setStatus(messages.status.invalid_file_size, "error");
      } else {
        setStatus(messages.status.failed.replace("{detail}", detail), "error");
      }
      return;
    }

    setStatus(messages.status.saving, "loading");
    try {
      if (fileHandle) {
        const writable = await fileHandle.createWritable();
        await writable.write(video);
        await writable.close();
      } else {
        if (useDownloadFallback) {
          setStatus(messages.status.save_fallback, "loading");
        }
        downloadVideo(video, outputFilename);
      }
    } catch (error) {
      console.error("Unable to save the extracted video:", error);
      const detail = error instanceof Error ? error.message : String(error);
      setStatus(messages.status.save_failed.replace("{detail}", detail), "error");
      return;
    }

    clearStatus();
  } finally {
    isExtracting = false;
    input.disabled = false;
    input.value = "";
  }
}

input.addEventListener("change", () => {
  const file = input.files && input.files[0];
  if (file) void extractVideo(file);
});

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("is-dragging");
});

dropzone.addEventListener("dragleave", (event) => {
  if (!dropzone.contains(event.relatedTarget)) {
    dropzone.classList.remove("is-dragging");
  }
});

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("is-dragging");
  const file = event.dataTransfer && event.dataTransfer.files[0];
  if (file) {
    void extractVideo(file);
  } else {
    setStatus(messages.status.cannot_read_drop, "error");
  }
});

setStatus(messages.status.initializing, "loading");
initialize()
  .then(() => {
    extractorReady = true;
    input.disabled = false;
    setStatus(messages.status.ready, "ready");
  })
  .catch((error) => {
    console.error("Unable to load the PNG video extractor:", error);
    const detail = error instanceof Error ? error.message : String(error);
    extractorLoadError = messages.status.module_failed.replace("{detail}", detail);
    setStatus(extractorLoadError, "error");
  });
