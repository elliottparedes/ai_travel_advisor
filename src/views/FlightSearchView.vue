<script setup lang="ts">
import { useFlightsStore } from "../stores/flightsStore";
import SearchForm from "../components/SearchForm.vue";
import FlightList from "../components/FlightList.vue";
import type { FlightSearchParams } from "../types/flights";

const store = useFlightsStore();
</script>

<template>
  <div class="view">
    <SearchForm @search="store.search" />

    <!-- Loading -->
    <div v-if="store.loading" class="loading-state">
      <div class="spinner" />
      <p class="loading-text">Searching for flights…</p>
      <p class="loading-hint">This may take a few seconds</p>
    </div>

    <!-- Error -->
    <div v-else-if="store.error" class="error-state">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p class="error-title">Search failed</p>
      <p class="error-message">{{ store.error }}</p>
      <button class="btn btn-ghost" @click="store.reset()">Dismiss</button>
    </div>

    <!-- Results -->
    <FlightList
      v-else-if="store.results && store.lastParams"
      :data="store.results"
      :params="store.lastParams"
    />

    <!-- Idle -->
    <div v-else class="idle-state">
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.8">
        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
      </svg>
      <p class="idle-title">Ready for takeoff</p>
      <p class="idle-hint">Enter departure and arrival airports to search for flights.</p>
    </div>
  </div>
</template>

<style scoped>
.view {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 20px 60px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.spinner {
  width: 38px;
  height: 38px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.loading-text { font-size: 1rem; font-weight: 600; }
.loading-hint { font-size: 0.82rem; color: var(--text-muted); }

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 20px;
  color: var(--danger);
  background: var(--danger-bg);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-lg);
}

.error-title { font-size: 1rem; font-weight: 700; }
.error-message { font-size: 0.85rem; color: var(--text-secondary); text-align: center; max-width: 480px; }

.idle-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 80px 20px;
  color: var(--text-muted);
  text-align: center;
}

.idle-title { font-size: 1.05rem; font-weight: 700; color: var(--text-secondary); }
.idle-hint { font-size: 0.85rem; max-width: 340px; }
</style>
