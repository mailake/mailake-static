const progressBar = document.getElementById("read-progress");
const progressLabel = document.getElementById("read-pct");
const feedback = document.getElementById("report-feedback");
const report_root = document.querySelector("main[data-report-messages]");

if (!(feedback instanceof HTMLElement) || !(report_root instanceof HTMLElement)) {
  throw new Error("The report page is missing its localized feedback messages.");
}

const messages = JSON.parse(report_root.dataset.reportMessages || "");

function updateReadingProgress() {
  const scrollable = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const percent = scrollable > 0
    ? Math.min(100, Math.max(0, Math.round((document.documentElement.scrollTop / scrollable) * 100)))
    : 0;

  if (progressBar) progressBar.style.width = `${percent}%`;
  if (progressLabel) progressLabel.textContent = `${percent}%`;
}

window.addEventListener("scroll", updateReadingProgress, { passive: true });
window.addEventListener("resize", updateReadingProgress);
updateReadingProgress();

document.addEventListener("click", async (event) => {
  if (!(event.target instanceof Element)) return;
  const action = event.target.closest("[data-report-action]");
  if (!action) return;

  if (action.dataset.reportAction === "print") {
    window.print();
  } else if (action.dataset.reportAction === "top") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (action.dataset.reportAction === "copy") {
    try {
      await navigator.clipboard.writeText(messages.citation);
      feedback.textContent = messages.copy_success;
    } catch (error) {
      console.error("Unable to copy the report citation:", error);
      feedback.textContent = messages.copy_failure;
    }
  }
});
