<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { FlightSearchParams, TripType, SeatClass, FetchMode } from "../types/flights";

const props = defineProps<{ destinationAirport?: string }>();

const emit = defineEmits<{
  search: [params: FlightSearchParams];
}>();

// ── Form state ─────────────────────────────────────────────────────────────
const trip = ref<TripType>("one-way");
const fromAirport = ref("");
const toAirport = ref(props.destinationAirport ?? "");

// Pre-fill when the parent resolves the airport asynchronously
watch(() => props.destinationAirport, (val) => {
  if (val && !toAirport.value) toAirport.value = val;
});
const date = ref("");
const returnDate = ref("");
const adults = ref(1);
const children = ref(0);
const infantsInSeat = ref(0);
const infantsOnLap = ref(0);
const seat = ref<SeatClass>("economy");
const maxStops = ref<number | undefined>(undefined);
const fetchMode = ref<FetchMode>("fallback");
const showAdvanced = ref(false);
const submitted = ref(false);

// ── Passenger field descriptors (reactive) ────────────────────────────────
const paxFields = computed(() => [
  { field: "adults" as const, label: "Adults", sub: "12+ years", value: adults.value, min: 1 },
  { field: "children" as const, label: "Children", sub: "2–11 years", value: children.value, min: 0 },
  { field: "infantsInSeat" as const, label: "Infants (seat)", sub: "Under 2, own seat", value: infantsInSeat.value, min: 0 },
  { field: "infantsOnLap" as const, label: "Infants (lap)", sub: "Under 2, on lap", value: infantsOnLap.value, min: 0 },
]);

// ── Computed validation ────────────────────────────────────────────────────
const totalPassengers = computed(
  () => adults.value + children.value + infantsInSeat.value + infantsOnLap.value,
);

const errors = computed(() => {
  const e: string[] = [];
  if (!fromAirport.value || fromAirport.value.length !== 3)
    e.push("Departure airport must be a 3-letter IATA code.");
  if (!toAirport.value || toAirport.value.length !== 3)
    e.push("Arrival airport must be a 3-letter IATA code.");
  if (!date.value) e.push("Departure date is required.");
  if (trip.value === "round-trip" && !returnDate.value)
    e.push("Return date is required for round-trip.");
  if (totalPassengers.value > 9) e.push("Total passengers cannot exceed 9.");
  if (infantsOnLap.value > adults.value)
    e.push("Lap infants cannot exceed the number of adults.");
  return e;
});

const canSearch = computed(() => errors.value.length === 0);

// ── Helpers ───────────────────────────────────────────────────────────────
const today = new Date().toISOString().split("T")[0];

function toUpperInput(field: "from" | "to", e: Event) {
  const val = (e.target as HTMLInputElement).value
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  if (field === "from") fromAirport.value = val;
  else toAirport.value = val;
}

function swapAirports() {
  [fromAirport.value, toAirport.value] = [toAirport.value, fromAirport.value];
}

const refMap = { adults, children, infantsInSeat, infantsOnLap } as const;

function adjustPassenger(
  field: keyof typeof refMap,
  delta: number,
) {
  const target = refMap[field];
  const min = field === "adults" ? 1 : 0;
  const otherTotal = totalPassengers.value - target.value;
  target.value = Math.max(min, Math.min(target.value + delta, 9 - otherTotal));
  if (infantsOnLap.value > adults.value) infantsOnLap.value = adults.value;
}

watch(trip, (val) => {
  if (val !== "round-trip") returnDate.value = "";
});

// ── Submit ────────────────────────────────────────────────────────────────
function handleSubmit() {
  submitted.value = true;
  if (!canSearch.value) return;

  const params: FlightSearchParams = {
    from_airport: fromAirport.value,
    to_airport: toAirport.value,
    date: date.value,
    trip: trip.value,
    seat: seat.value,
    adults: adults.value,
    fetch_mode: fetchMode.value,
  };

  if (trip.value === "round-trip") params.return_date = returnDate.value;
  if (children.value > 0) params.children = children.value;
  if (infantsInSeat.value > 0) params.infants_in_seat = infantsInSeat.value;
  if (infantsOnLap.value > 0) params.infants_on_lap = infantsOnLap.value;
  if (maxStops.value !== undefined) params.max_stops = maxStops.value;

  emit("search", params);
}
</script>

<template>
  <form class="card search-form" @submit.prevent="handleSubmit">
    <div class="form-header">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="form-icon">
        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
      </svg>
      <h2 class="form-title">Search Flights</h2>
    </div>

    <!-- Trip type tabs -->
    <div class="trip-tabs">
      <button
        v-for="t in (['one-way', 'round-trip', 'multi-city'] as TripType[])"
        :key="t"
        type="button"
        class="trip-tab"
        :class="{ 'trip-tab--active': trip === t }"
        @click="trip = t"
      >
        {{ t === 'one-way' ? 'One-way' : t === 'round-trip' ? 'Round-trip' : 'Multi-city' }}
      </button>
    </div>

    <!-- Route row -->
    <div class="route-row">
      <div class="field">
        <label class="label">From</label>
        <div class="iata-input-wrap">
          <input
            type="text"
            :value="fromAirport"
            maxlength="3"
            placeholder="LAX"
            autocomplete="off"
            class="iata-input"
            @input="toUpperInput('from', $event)"
          />
          <span class="iata-hint">IATA</span>
        </div>
      </div>

      <button type="button" class="swap-btn" title="Swap airports" @click="swapAirports">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M7 16V4m0 0L3 8m4-4l4 4"/><path d="M17 8v12m0 0l4-4m-4 4l-4-4"/>
        </svg>
      </button>

      <div class="field">
        <label class="label">To</label>
        <div class="iata-input-wrap">
          <input
            type="text"
            :value="toAirport"
            maxlength="3"
            placeholder="JFK"
            autocomplete="off"
            class="iata-input"
            @input="toUpperInput('to', $event)"
          />
          <span class="iata-hint">IATA</span>
        </div>
      </div>
    </div>

    <!-- Date row -->
    <div class="dates-row">
      <div class="field">
        <label class="label">Departure date</label>
        <input type="date" v-model="date" :min="today" />
      </div>
      <div v-if="trip === 'round-trip'" class="field">
        <label class="label">Return date</label>
        <input type="date" v-model="returnDate" :min="date || today" />
      </div>
    </div>

    <!-- Passengers -->
    <div class="passengers-section">
      <p class="label">
        Passengers
        <span class="pax-total">({{ totalPassengers }} / 9)</span>
      </p>
      <div class="passengers-grid">
        <div v-for="pax in paxFields" :key="pax.field" class="pax-counter">
          <div class="pax-info">
            <span class="pax-label">{{ pax.label }}</span>
            <span class="pax-sub">{{ pax.sub }}</span>
          </div>
          <div class="counter">
            <button
              type="button"
              class="counter-btn"
              :disabled="pax.value <= pax.min"
              @click="adjustPassenger(pax.field, -1)"
            >−</button>
            <span class="counter-value">{{ pax.value }}</span>
            <button
              type="button"
              class="counter-btn"
              :disabled="totalPassengers >= 9"
              @click="adjustPassenger(pax.field, 1)"
            >+</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Advanced options (collapsible) -->
    <div class="advanced-section">
      <button type="button" class="advanced-toggle" @click="showAdvanced = !showAdvanced">
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2"
          :style="{ transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 200ms' }"
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
        Advanced options
      </button>

      <div v-if="showAdvanced" class="advanced-fields">
        <div class="field">
          <label class="label">Seat class</label>
          <select v-model="seat">
            <option value="economy">Economy</option>
            <option value="premium-economy">Premium Economy</option>
            <option value="business">Business</option>
            <option value="first">First</option>
          </select>
        </div>

        <div class="field">
          <label class="label">Max stops</label>
          <select
            :value="maxStops === undefined ? '' : String(maxStops)"
            @change="maxStops = ($event.target as HTMLSelectElement).value === '' ? undefined : Number(($event.target as HTMLSelectElement).value)"
          >
            <option value="">Any</option>
            <option value="0">Nonstop only</option>
            <option value="1">Up to 1 stop</option>
            <option value="2">Up to 2 stops</option>
            <option value="3">Up to 3 stops</option>
          </select>
        </div>

        <div class="field">
          <label class="label">Fetch mode</label>
          <select v-model="fetchMode">
            <option value="fallback">Fallback (recommended)</option>
            <option value="common">Common (fastest)</option>
            <option value="force-fallback">Force Playwright</option>
            <option value="local">Local browser</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Validation errors — only shown after first submit attempt -->
    <ul v-if="submitted && errors.length > 0" class="error-list">
      <li v-for="err in errors" :key="err" class="error-item">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        {{ err }}
      </li>
    </ul>

    <!-- Submit -->
    <div class="form-footer">
      <button type="submit" class="btn btn-primary search-btn" :disabled="!canSearch">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        Search flights
      </button>
    </div>
  </form>
</template>

<style scoped>
.search-form {
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.form-icon { color: var(--accent); }

.form-title {
  font-size: 1.1rem;
  font-weight: 700;
}

/* ── Trip tabs ── */
.trip-tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-input);
  padding: 4px;
  border-radius: var(--radius-sm);
  width: fit-content;
}

.trip-tab {
  padding: 6px 16px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: background var(--transition), color var(--transition);
}

.trip-tab:hover:not(.trip-tab--active) { color: var(--text-secondary); }

.trip-tab--active {
  background: var(--accent);
  color: #fff;
}

/* ── Route row ── */
.route-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.route-row .field { flex: 1; }

.iata-input-wrap { position: relative; }

.iata-input {
  font-size: 1.4rem !important;
  font-weight: 800 !important;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  text-align: center;
  padding-right: 40px !important;
}

.iata-hint {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  pointer-events: none;
}

.swap-btn {
  width: 38px;
  height: 38px;
  border: 1px solid var(--border);
  background: var(--bg-input);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition: background var(--transition), color var(--transition);
  margin-bottom: 1px;
}

.swap-btn:hover {
  background: var(--bg-card-hover);
  color: var(--accent);
}

/* ── Dates ── */
.dates-row {
  display: flex;
  gap: 16px;
}

.dates-row .field { flex: 1; }

/* ── Passengers ── */
.passengers-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pax-total {
  color: var(--text-muted);
  font-size: 0.8em;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
}

.passengers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 10px;
}

.pax-counter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.pax-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pax-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}

.pax-sub {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.counter {
  display: flex;
  align-items: center;
  gap: 10px;
}

.counter-btn {
  width: 28px;
  height: 28px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-primary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  transition: background var(--transition), border-color var(--transition);
  display: flex;
  align-items: center;
  justify-content: center;
}

.counter-btn:hover:not(:disabled) {
  background: var(--accent-dim);
  border-color: var(--border-focus);
}

.counter-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.counter-value {
  font-size: 1rem;
  font-weight: 700;
  min-width: 18px;
  text-align: center;
}

/* ── Advanced ── */
.advanced-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 0;
  transition: color var(--transition);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.advanced-toggle:hover { color: var(--text-secondary); }

.advanced-fields {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
  margin-top: 12px;
}

/* ── Errors ── */
.error-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.error-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  color: var(--danger);
  background: var(--danger-bg);
  padding: 6px 10px;
  border-radius: var(--radius-sm);
}

/* ── Footer ── */
.form-footer {
  display: flex;
  justify-content: flex-end;
}

.search-btn {
  padding: 12px 32px;
  font-size: 0.95rem;
  gap: 8px;
}

/* ── Generic field wrapper ── */
.field {
  display: flex;
  flex-direction: column;
}
</style>
