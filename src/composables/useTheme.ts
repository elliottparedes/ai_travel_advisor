import { ref } from "vue";

type Theme = "dark" | "light";

const STORAGE_KEY = "ft-theme";

// Module-level singleton — shared across all useTheme() calls
const theme = ref<Theme>("dark");

function applyTheme(next: Theme) {
  const html = document.documentElement;

  // Add transition class, switch, then remove so normal interactions aren't slowed
  html.classList.add("theme-switching");
  html.setAttribute("data-theme", next);
  localStorage.setItem(STORAGE_KEY, next);
  theme.value = next;

  setTimeout(() => html.classList.remove("theme-switching"), 250);
}

export function useTheme() {
  function initTheme() {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const preferred: Theme = window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
    const resolved = stored ?? preferred;
    theme.value = resolved;
    // <html data-theme> is already set by the inline script in index.html,
    // so we only need to sync the ref here.
  }

  function toggleTheme() {
    applyTheme(theme.value === "dark" ? "light" : "dark");
  }

  return { theme, initTheme, toggleTheme };
}
