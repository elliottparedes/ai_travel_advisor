<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useTripStore } from "../../stores/tripStore";
import { useFlightsStore } from "../../stores/flightsStore";
import { CARD_GRADIENTS, CARD_ICONS } from "../../types/trips";
import WanderChat from "./WanderChat.vue";
import SearchForm from "../SearchForm.vue";
import FlightList from "../FlightList.vue";
import { getNearestAirport } from "../../api/tripsApi";

const store = useTripStore();
const flights = useFlightsStore();

// Use the saved trip name when returning to an existing trip
const tripName = ref(store.savedTripName ?? `Trip to ${store.destinationInfo?.city ?? "Unknown"}`);
const saveMsg = ref("");
const showFlights = ref(false);
const destinationAirport = ref<string | undefined>(undefined);
const showPinToast = ref(false);
let toastTimer: ReturnType<typeof setTimeout> | null = null;

// Show toast if the user added pins while exploring an already-saved trip
onMounted(() => {
  if (store.pinJustAdded) {
    store.pinJustAdded = false;
    showPinToast.value = true;
    toastTimer = setTimeout(() => { showPinToast.value = false; }, 4000);
  }
});

// Fetch nearest airport once when the flight panel is first opened
let airportFetched = false;
watch(showFlights, async (open) => {
  if (open && !airportFetched && store.destinationInfo?.city) {
    airportFetched = true;
    const iata = await getNearestAirport(
      store.destinationInfo.city,
      store.destinationInfo.country,
    );
    if (iata) destinationAirport.value = iata;
  }
});

async function handleSave() {
  const isUpdate = !!store.savedTripId;
  const id = await store.save(tripName.value);
  if (id) {
    saveMsg.value = isUpdate ? "Trip updated! ✓" : "Trip saved! ✓";
    store.savedTripName = tripName.value;
    setTimeout(() => { saveMsg.value = ""; }, 3000);
  }
}
</script>

<template>
  <div class="board-step">
    <!-- Header -->
    <div class="board-header">
      <div>
        <h2 class="board-title">Your Board</h2>
        <p class="board-sub">
          {{ store.pinnedCards.length }} pinned ·
          {{ store.destinationInfo?.city }}, {{ store.destinationInfo?.country }}
        </p>
      </div>
      <div class="board-actions">
        <button class="btn-back" @click="store.step = 2">← Explore more</button>
        <div class="save-row">
          <input v-model="tripName" class="trip-name-input" placeholder="Name your trip" />
          <div class="save-btn-wrap">
            <button
              class="save-btn"
              :disabled="store.isSaving"
              @click="handleSave"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              {{ store.isSaving ? "Saving…" : saveMsg || (store.savedTripId ? "Update trip" : "Save trip") }}
            </button>
            <p class="save-hint">
              {{ store.savedTripId
                  ? `Overwrites "${store.savedTripName ?? tripName}"`
                  : "Creates a new saved trip" }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Two-column layout: pins + chat -->
    <div class="board-layout">
      <!-- Pinned cards panel -->
      <div class="pins-panel">
        <p class="panel-label">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          Pinned places
        </p>

        <div v-if="store.pinnedCards.length === 0" class="pins-empty">
          <p>No pins yet.</p>
          <button class="btn-back-small" @click="store.step = 2">← Go pin some places</button>
        </div>

        <div class="pins-grid">
          <div
            v-for="card in store.pinnedCards"
            :key="card.id"
            class="pin-card"
          >
            <div
              class="pin-card__color"
              :style="card.image
                ? { backgroundImage: `url(${card.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { background: CARD_GRADIENTS[card.type] ?? CARD_GRADIENTS.landmark }"
            >
              <svg v-if="!card.image" width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path :d="CARD_ICONS[card.type] ?? CARD_ICONS.landmark" />
              </svg>
            </div>
            <div class="pin-card__body">
              <p class="pin-card__title">{{ card.title }}</p>
              <p class="pin-card__sub">{{ card.neighborhood ?? card.type }}</p>
            </div>
            <button class="unpin-btn" @click="store.togglePin(card.id)" title="Unpin">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Wander chat panel -->
      <div class="chat-panel">
        <WanderChat />
      </div>
    </div>

    <!-- Pin added toast -->
    <Transition name="toast-slide">
      <div v-if="showPinToast" class="pin-toast">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        New pin added — click <strong>Update trip</strong> to save your changes.
        <button class="pin-toast__close" @click="showPinToast = false">✕</button>
      </div>
    </Transition>

    <!-- ── Flight search ── -->
    <div class="flights-section">
      <button class="flights-toggle" @click="showFlights = !showFlights">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
        </svg>
        Search flights to {{ store.destinationInfo?.city }}
        <svg
          class="flights-toggle__chevron"
          :class="{ 'flights-toggle__chevron--open': showFlights }"
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      <Transition name="slide-down">
        <div v-if="showFlights" class="flights-body">
          <SearchForm :destinationAirport="destinationAirport" @search="flights.search" />

          <div v-if="flights.loading" class="flights-loading">
            <div class="spinner" />
            <span>Searching for flights…</span>
          </div>

          <div v-else-if="flights.error" class="flights-error">
            {{ flights.error }}
            <button @click="flights.reset()">Dismiss</button>
          </div>

          <FlightList
            v-else-if="flights.results && flights.lastParams"
            :data="flights.results"
            :params="flights.lastParams"
          />
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.board-step {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Header ── */
.board-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}

.board-title {
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.board-sub {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin-top: 3px;
}

.board-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.btn-back {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: color var(--transition);
}

.btn-back:hover { color: var(--text-primary); }

.save-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.trip-name-input {
  width: 220px;
  padding: 8px 12px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.85rem;
  outline: none;
  transition: border-color var(--transition);
}

.trip-name-input:focus { border-color: var(--border-focus); }

.save-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  background: var(--success);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--transition), box-shadow var(--transition);
  white-space: nowrap;
}

.save-btn:hover:not(:disabled) {
  background: #059669;
  box-shadow: 0 0 16px rgba(16,185,129,0.4);
}

.save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.save-btn-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
}

.save-hint {
  font-size: 0.68rem;
  color: var(--text-muted);
  white-space: nowrap;
}

/* ── Pin toast ── */
.pin-toast {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--accent-dim);
  border: 1px solid rgba(99,102,241,0.35);
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  color: var(--text-primary);
  line-height: 1.4;
}

.pin-toast svg { color: var(--accent); flex-shrink: 0; }

.pin-toast__close {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.75rem;
  padding: 0 2px;
  flex-shrink: 0;
}

.toast-slide-enter-active, .toast-slide-leave-active {
  transition: opacity 250ms ease, transform 250ms ease;
}
.toast-slide-enter-from, .toast-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ── Two-column layout ── */
.board-layout {
  display: grid;
  grid-template-columns: 340px 1fr;
  grid-template-rows: 1fr;
  gap: 16px;
  height: calc(100vh - 280px);
  min-height: 480px;
  overflow: hidden;
}

@media (max-width: 860px) {
  .board-layout { grid-template-columns: 1fr; height: auto; }
  .chat-panel { min-height: 500px; }
}

/* ── Pins panel ── */
.pins-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  overflow-y: auto;
  min-height: 0;
}

.panel-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
}

.pins-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px 20px;
  color: var(--text-muted);
  font-size: 0.85rem;
  text-align: center;
}

.btn-back-small {
  font-size: 0.8rem;
  color: var(--accent);
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 600;
}

.pins-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pin-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  transition: background var(--transition);
}

.pin-card:hover { background: var(--bg-card-hover); }

.pin-card__color {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pin-card__body {
  flex: 1;
  min-width: 0;
}

.pin-card__title {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pin-card__sub {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: capitalize;
}

.unpin-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background var(--transition), color var(--transition);
}

.unpin-btn:hover {
  background: var(--danger-bg);
  color: var(--danger);
}

/* ── Chat panel ── */
.chat-panel {
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ── Flight search section ── */
.flights-section {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.flights-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  background: var(--bg-card);
  border: none;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
  transition: background var(--transition);
}

.flights-toggle:hover { background: var(--bg-card-hover); }

.flights-toggle svg:first-child { color: var(--accent); flex-shrink: 0; }

.flights-toggle__chevron {
  margin-left: auto;
  transition: transform 250ms ease;
  color: var(--text-muted);
  flex-shrink: 0;
}

.flights-toggle__chevron--open { transform: rotate(180deg); }

.flights-body {
  padding: 20px;
  border-top: 1px solid var(--border);
  background: var(--bg-surface);
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.flights-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px;
  color: var(--text-muted);
  font-size: 0.85rem;
  justify-content: center;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.flights-error {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--danger-bg);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: var(--radius-sm);
  color: var(--danger);
  font-size: 0.85rem;
}

.flights-error button {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--danger);
  font-weight: 600;
  cursor: pointer;
  font-size: 0.82rem;
  text-decoration: underline;
}

/* slide-down transition (same as ExploreStep map panel) */
.slide-down-enter-active, .slide-down-leave-active {
  transition: max-height 300ms ease, opacity 250ms ease;
  overflow: hidden;
  max-height: 1200px;
}
.slide-down-enter-from, .slide-down-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
