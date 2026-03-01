<script setup lang="ts">
import { ref, watch } from "vue";
import { useTripStore } from "../../stores/tripStore";

const store = useTripStore();

const examples = ["Paris, France", "Tokyo, Japan", "New York City", "Bali, Indonesia", "Amalfi Coast, Italy"];

const LOADING_STEPS = [
  { icon: "🌍", text: "Looking up your destination…" },
  { icon: "🍽️", text: "Finding the best restaurants…" },
  { icon: "🏛️", text: "Discovering landmarks & culture…" },
  { icon: "🌙", text: "Mapping nightlife & hidden gems…" },
  { icon: "🏨", text: "Sourcing hotels & stays…" },
  { icon: "✨", text: "Putting it all together…" },
];

const loadingStep = ref(0);
let loadingInterval: ReturnType<typeof setInterval> | null = null;

watch(
  () => store.isEnriching,
  (enriching) => {
    if (enriching) {
      loadingStep.value = 0;
      loadingInterval = setInterval(() => {
        loadingStep.value = Math.min(loadingStep.value + 1, LOADING_STEPS.length - 1);
      }, 2200);
    } else {
      if (loadingInterval) {
        clearInterval(loadingInterval);
        loadingInterval = null;
      }
    }
  },
);
</script>

<template>
  <div class="destination-step">
    <div class="hero">
      <div class="globe">🌍</div>
      <h1 class="hero-title">Where are you headed?</h1>
      <p class="hero-sub">Describe your dream destination — city, region, or vibe — and Wander will curate a personalized guide just for you.</p>
    </div>

    <form class="search-wrap" @submit.prevent="store.enrich">
      <div class="search-box" :class="{ 'search-box--loading': store.isEnriching }">
        <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        <input
          v-model="store.destinationInput"
          type="text"
          class="destination-input"
          placeholder="Paris, Tokyo, Bali, NYC…"
          :disabled="store.isEnriching"
          autofocus
        />
        <button
          type="submit"
          class="explore-btn"
          :disabled="!store.destinationInput.trim() || store.isEnriching"
        >
          <span v-if="store.isEnriching" class="btn-spinner" />
          <span v-else>Explore →</span>
        </button>
      </div>

      <div v-if="store.enrichError" class="error-msg">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        {{ store.enrichError }}
      </div>
    </form>

    <div class="examples">
      <span class="examples-label">Try:</span>
      <button
        v-for="ex in examples"
        :key="ex"
        class="example-pill"
        @click="store.destinationInput = ex"
      >
        {{ ex }}
      </button>
    </div>

    <!-- Loading overlay -->
    <Transition name="fade">
      <div v-if="store.isEnriching" class="loading-overlay">
        <div class="loading-card">
          <div class="loading-globe">{{ LOADING_STEPS[loadingStep].icon }}</div>
          <p class="loading-title">Exploring {{ store.destinationInput }}…</p>

          <!-- Step list -->
          <div class="loading-steps">
            <div
              v-for="(s, i) in LOADING_STEPS"
              :key="i"
              class="loading-step"
              :class="{
                'loading-step--done': i < loadingStep,
                'loading-step--active': i === loadingStep,
              }"
            >
              <div class="loading-step__dot">
                <svg v-if="i < loadingStep" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <span>{{ s.text }}</span>
            </div>
          </div>

          <div class="loading-dots"><span /><span /><span /></div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.destination-step {
  max-width: 640px;
  margin: 0 auto;
  padding: 60px 20px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  position: relative;
}

.hero {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.globe { font-size: 3rem; }

.hero-title {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--text-primary);
}

.hero-sub {
  font-size: 0.95rem;
  color: var(--text-muted);
  max-width: 480px;
  line-height: 1.6;
}

/* ── Search box ── */
.search-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-card);
  border: 1.5px solid var(--border);
  border-radius: 999px;
  padding: 8px 8px 8px 20px;
  box-shadow: var(--shadow-card);
  transition: border-color var(--transition), box-shadow var(--transition);
}

.search-box:focus-within {
  border-color: var(--border-focus);
  box-shadow: var(--shadow-focus);
}

.search-icon { color: var(--text-muted); flex-shrink: 0; }

.destination-input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 1.05rem;
  outline: none;
  min-width: 0;
}

.destination-input::placeholder { color: var(--text-muted); }

.explore-btn {
  padding: 10px 24px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--transition), box-shadow var(--transition);
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 110px;
  justify-content: center;
}

.explore-btn:hover:not(:disabled) {
  background: var(--accent-hover);
  box-shadow: 0 0 20px rgba(99,102,241,0.4);
}

.explore-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: block;
}

@keyframes spin { to { transform: rotate(360deg); } }

.error-msg {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--danger);
  font-size: 0.83rem;
  padding: 0 20px;
}

/* ── Examples ── */
.examples {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.examples-label {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-weight: 600;
}

.example-pill {
  padding: 5px 14px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--transition), border-color var(--transition), color var(--transition);
}

.example-pill:hover {
  background: var(--accent-dim);
  border-color: rgba(99,102,241,0.4);
  color: var(--accent);
}

/* ── Loading overlay ── */
.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.loading-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 40px 48px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  max-width: 380px;
}

.loading-globe {
  font-size: 2.8rem;
  transition: all 300ms ease;
}

/* ── Step list ── */
.loading-steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  text-align: left;
}

.loading-step {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.82rem;
  color: var(--text-muted);
  transition: color 300ms ease, opacity 300ms ease;
  opacity: 0.4;
}

.loading-step--active {
  color: var(--text-primary);
  opacity: 1;
  font-weight: 600;
}

.loading-step--done {
  color: var(--success);
  opacity: 0.8;
}

.loading-step__dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1.5px solid currentColor;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  transition: background 300ms ease, border-color 300ms ease;
}

.loading-step--active .loading-step__dot {
  background: var(--accent);
  border-color: var(--accent);
  animation: pulse-dot 1s ease-in-out infinite;
}

.loading-step--done .loading-step__dot {
  background: var(--success);
  border-color: var(--success);
  color: #fff;
}

@keyframes pulse-dot {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
  50% { box-shadow: 0 0 0 4px rgba(99, 102, 241, 0); }
}

.loading-title { font-size: 1.1rem; font-weight: 700; }

.loading-dots {
  display: flex;
  gap: 6px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  animation: bounce 1.2s ease-in-out infinite;
}
.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

.fade-enter-active, .fade-leave-active { transition: opacity 200ms ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
