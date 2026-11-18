const menu_button = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".site-nav");
const language_switch = document.querySelector("[data-locale-switch]");

if (language_switch instanceof HTMLAnchorElement) {
  language_switch.addEventListener("click", () => {
    const locale = language_switch.dataset.localeSwitch;
    const storage_key = language_switch.dataset.storageKey;
    if (!locale || !storage_key) {
      console.error("The language switch is missing its locale storage configuration.");
      return;
    }

    try {
      window.localStorage.setItem(storage_key, locale);
    } catch (error) {
      console.error("Unable to save the selected language:", error);
    }
  });
}

if (
  !(menu_button instanceof HTMLButtonElement) ||
  !(navigation instanceof HTMLElement) ||
  !menu_button.dataset.labelOpen ||
  !menu_button.dataset.labelClose
) {
  console.error("The shared site header is missing its navigation controls.");
} else {
  const close_menu = () => {
    menu_button.setAttribute("aria-expanded", "false");
    menu_button.setAttribute("aria-label", menu_button.dataset.labelOpen);
    navigation.classList.remove("is-open");
  };

  menu_button.addEventListener("click", () => {
    const expanded = menu_button.getAttribute("aria-expanded") === "true";
    menu_button.setAttribute("aria-expanded", String(!expanded));
    menu_button.setAttribute(
      "aria-label",
      expanded ? menu_button.dataset.labelOpen : menu_button.dataset.labelClose,
    );
    navigation.classList.toggle("is-open", !expanded);
  });

  navigation.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) {
      close_menu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu_button.getAttribute("aria-expanded") === "true") {
      close_menu();
      menu_button.focus();
    }
  });
}
