document.addEventListener("DOMContentLoaded", () => {
  if (!window.hljs) {
    console.error("Highlight.js failed to load.");
    return;
  }

  document.querySelectorAll(".article-content pre code").forEach((element) => {
    window.hljs.highlightElement(element);
  });
});
