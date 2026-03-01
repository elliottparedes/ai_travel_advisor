<script setup lang="ts">
import { useTheme } from "../composables/useTheme";

const { theme, toggleTheme } = useTheme();
</script>

<template>
  <button
    class="theme-toggle"
    :aria-label="`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`"
    :title="`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`"
    @click="toggleTheme"
  >
    <span class="icon-wrap">
      <!-- Moon — shown in dark mode -->
      <svg
        class="icon icon--moon"
        :class="{ 'icon--visible': theme === 'dark' }"
        width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>

      <!-- Sun — shown in light mode -->
      <svg
        class="icon icon--sun"
        :class="{ 'icon--visible': theme === 'light' }"
        width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
    </span>
  </button>
</template>

<style scoped>
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--bg-input);
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    background var(--transition),
    border-color var(--transition),
    color var(--transition),
    box-shadow var(--transition);
  flex-shrink: 0;
}

.theme-toggle:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
  border-color: var(--border-focus);
  box-shadow: var(--shadow-focus);
}

.theme-toggle:active {
  transform: scale(0.92);
}

/* Icon crossfade */
.icon-wrap {
  position: relative;
  width: 16px;
  height: 16px;
}

.icon {
  position: absolute;
  inset: 0;
  opacity: 0;
  transform: rotate(-30deg) scale(0.7);
  transition:
    opacity 200ms ease,
    transform 200ms ease;
}

.icon--visible {
  opacity: 1;
  transform: rotate(0deg) scale(1);
}
</style>
