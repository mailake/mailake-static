const status_message = document.getElementById("article-redirect-status");
const slug = new URLSearchParams(window.location.search).get("slug");
const error_message = status_message instanceof HTMLElement
  ? status_message.dataset.errorMessage
  : undefined;
const article_base = status_message instanceof HTMLElement
  ? status_message.dataset.articleBase
  : undefined;

if (slug && article_base && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  window.location.replace(`${article_base}/${encodeURIComponent(slug)}.html`);
} else if (status_message) {
  if (error_message) {
    status_message.textContent = error_message;
  } else {
    console.error("The article redirect page is missing its localized error message.");
  }
}
