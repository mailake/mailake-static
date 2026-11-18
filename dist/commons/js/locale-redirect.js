const locale_redirect = document.querySelector("[data-locale-redirect]");
if (!(locale_redirect instanceof HTMLElement)) {
  throw new Error("The locale redirect page is missing its configuration.");
}

const default_locale = locale_redirect.dataset.defaultLocale;
const storage_key = locale_redirect.dataset.storageKey;
const locale_routes = JSON.parse(locale_redirect.dataset.localeRoutes || "{}");
const supported_locales = Object.keys(locale_routes);

if (!default_locale || !storage_key || supported_locales.length === 0) {
  throw new Error("The locale redirect page has incomplete locale configuration.");
}

function get_browser_locale() {
  for (const language of navigator.languages) {
    const normalized_language = language.toLowerCase().replaceAll("_", "-");
    if (normalized_language === "en" || normalized_language.startsWith("en-")) {
      return "en";
    }
    if (normalized_language === "zh" || normalized_language.startsWith("zh-")) {
      return "zh-CN";
    }
  }
  return default_locale;
}

let selected_locale;
try {
  const stored_locale = window.localStorage.getItem(storage_key);
  if (supported_locales.includes(stored_locale)) {
    selected_locale = stored_locale;
  }
} catch (error) {
  console.error("Unable to read the saved language preference:", error);
}

if (!selected_locale) {
  selected_locale = get_browser_locale();
  try {
    window.localStorage.setItem(storage_key, selected_locale);
  } catch (error) {
    console.error("Unable to save the detected language preference:", error);
  }
}

const target_url = locale_routes[selected_locale];
if (typeof target_url !== "string") {
  throw new Error(`No homepage route is configured for locale: ${selected_locale}`);
}
window.location.replace(target_url);
