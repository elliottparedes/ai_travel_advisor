<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useTripStore } from "../stores/tripStore";
import DestinationStep from "../components/trip/DestinationStep.vue";
import ExploreStep from "../components/trip/ExploreStep.vue";
import BoardStep from "../components/trip/BoardStep.vue";

const store = useTripStore();
const router = useRouter();
const showLeaveModal = ref(false);

function handleBackToTrips() {
  const unsaved = store.pinnedCards.length > 0 && !store.savedTripId;
  if (unsaved) {
    showLeaveModal.value = true;
  } else {
    router.push("/trips");
  }
}

function confirmLeave() {
  showLeaveModal.value = false;
  router.push("/trips");
}

const STEPS = [
  { n: 1, label: "Destination" },
  { n: 2, label: "Explore" },
  { n: 3, label: "Board" },
];
</script>

<template>
  <div class="wizard-page">
    <!-- Top bar: back link + step indicator -->
    <div class="wizard-topbar">
      <button class="btn-all-trips" @click="handleBackToTrips">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        All trips
      </button>

      <!-- Step indicator -->
      <div class="step-bar">
      <template v-for="(s, i) in STEPS" :key="s.n">
        <div
          class="step-dot"
          :class="{
            'step-dot--done': store.step > s.n,
            'step-dot--active': store.step === s.n,
          }"
        >
          <div class="step-dot__circle">
            <svg v-if="store.step > s.n" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span v-else>{{ s.n }}</span>
          </div>
          <span class="step-dot__label">{{ s.label }}</span>
        </div>
        <div
          v-if="i < STEPS.length - 1"
          class="step-connector"
          :class="{ 'step-connector--done': store.step > s.n }"
        />
      </template>
      </div><!-- end step-bar -->
    </div><!-- end wizard-topbar -->

    <!-- Step content with slide transition -->
    <div class="wizard-body">
      <Transition name="slide" mode="out-in">
        <DestinationStep v-if="store.step === 1" key="step1" />
        <ExploreStep     v-else-if="store.step === 2" key="step2" />
        <BoardStep       v-else-if="store.step === 3" key="step3" />
      </Transition>
    </div>

    <!-- Unsaved pins modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showLeaveModal" class="modal-backdrop" @click.self="showLeaveModal = false">
          <div class="modal">
            <div class="modal-icon">📍</div>
            <h3 class="modal-title">Unsaved pins</h3>
            <p class="modal-body">
              You have {{ store.pinnedCards.length }} pinned
              {{ store.pinnedCards.length === 1 ? 'place' : 'places' }} that
              haven't been saved yet. If you leave now they'll be lost.
            </p>
            <div class="modal-actions">
              <button class="modal-btn modal-btn--cancel" @click="showLeaveModal = false">
                Stay & save
              </button>
              <button class="modal-btn modal-btn--leave" @click="confirmLeave">
                Leave anyway
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.wizard-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 20px 48px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* ── Top bar ── */
.wizard-topbar {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.btn-all-trips {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--transition), color var(--transition), border-color var(--transition);
  flex-shrink: 0;
  margin-top: 4px;
}

.btn-all-trips:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
  border-color: var(--border-focus);
}

/* ── Step indicator ── */
.step-bar {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 0 40px;
  flex: 1;
}

.step-dot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.step-connector {
  flex: 1;
  height: 2px;
  background: var(--border);
  border-radius: 2px;
  margin-top: 15px; /* vertically centers with the 32px circle */
  transition: background 400ms cubic-bezier(0.4, 0, 0.2, 1);
}

.step-connector--done {
  background: var(--accent);
}

.step-dot__circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-surface);
  border: 2px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-muted);
  transition: background var(--transition), border-color var(--transition), color var(--transition);
}

.step-dot--active .step-dot__circle {
  border-color: var(--accent);
  background: var(--accent-dim);
  color: var(--accent);
}

.step-dot--done .step-dot__circle {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}

.step-dot__label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  transition: color var(--transition);
  white-space: nowrap;
}

.step-dot--active .step-dot__label,
.step-dot--done .step-dot__label {
  color: var(--text-primary);
}

/* ── Step transitions ── */
.wizard-body {
  min-height: 60vh;
}

.slide-enter-active,
.slide-leave-active {
  transition: opacity 200ms ease, transform 220ms ease;
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(24px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(-24px);
}

/* ── Leave modal ── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 20px;
}

.modal {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 32px 28px 24px;
  max-width: 380px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4);
}

.modal-icon { font-size: 2rem; }

.modal-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.modal-body {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
  width: 100%;
}

.modal-btn {
  flex: 1;
  padding: 10px 16px;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--transition), border-color var(--transition);
}

.modal-btn--cancel {
  background: var(--accent);
  color: #fff;
  border: none;
}

.modal-btn--cancel:hover { background: var(--accent-hover); }

.modal-btn--leave {
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border);
}

.modal-btn--leave:hover {
  background: var(--danger-bg);
  color: var(--danger);
  border-color: rgba(239, 68, 68, 0.3);
}

.fade-enter-active, .fade-leave-active { transition: opacity 200ms ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
