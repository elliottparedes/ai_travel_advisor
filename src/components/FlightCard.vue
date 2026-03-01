<script setup lang="ts">
import type { FlightResult, FlightSearchParams } from "../types/flights";

defineProps<{
  flight: FlightResult;
  params: FlightSearchParams;
  bookUrl: string;
}>();

// API returns "6:00 AM" or "6:00 AM on Sun, Mar 1" — split them cleanly
function parseTime(raw: string | undefined): { time: string; date: string } {
  if (!raw) return { time: "—", date: "" };
  const m = raw.match(/^(\d{1,2}:\d{2}\s*(?:AM|PM))\s*(?:on\s+(.+))?$/i);
  if (m) return { time: (m[1] ?? raw).trim(), date: (m[2] ?? "").trim() };
  return { time: raw, date: "" };
}

const stopsLabel = (n: number) => {
  if (n === 0) return "Nonstop";
  return n === 1 ? "1 stop" : `${n} stops`;
};
</script>

<template>
  <article class="flight-card card" :class="{ 'flight-card--best': flight.is_best }">

    <!-- ── Header row: airline + best chip ───────────────────────────── -->
    <div class="fc-header">
      <div class="airline">
        <svg class="airline__icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
        </svg>
        <span class="airline__name">{{ flight.name || "Airline" }}</span>
      </div>
      <span v-if="flight.is_best" class="best-chip">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        Best value
      </span>
    </div>

    <!-- ── Route block ─────────────────────────────────────────────────── -->
    <div class="fc-route">

      <!-- Departure -->
      <div class="endpoint">
        <span class="endpoint__time">{{ parseTime(flight.departure).time }}</span>
        <span class="endpoint__code">{{ params.from_airport }}</span>
        <span class="endpoint__date">{{ parseTime(flight.departure).date }}</span>
      </div>

      <!-- Center: duration / line / stops -->
      <div class="segment">
        <span class="segment__duration">{{ flight.duration || "—" }}</span>
        <div class="segment__track" :class="{ 'segment__track--stops': flight.stops > 0 }">
          <div class="track__dot" />
          <div class="track__line" />
          <svg class="track__plane" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
          <div class="track__dot track__dot--right" />
        </div>
        <span class="segment__stops" :class="{ 'segment__stops--nonstop': flight.stops === 0 }">
          {{ stopsLabel(flight.stops) }}
        </span>
      </div>

      <!-- Arrival -->
      <div class="endpoint endpoint--right">
        <span class="endpoint__time">
          {{ parseTime(flight.arrival).time }}
          <sup v-if="flight.arrival_time_ahead" class="endpoint__ahead">
            {{ flight.arrival_time_ahead }}
          </sup>
        </span>
        <span class="endpoint__code">{{ params.to_airport }}</span>
        <span class="endpoint__date">{{ parseTime(flight.arrival).date }}</span>
      </div>
    </div>

    <!-- ── Footer: delay + price + book ──────────────────────────────── -->
    <div class="fc-footer">
      <div v-if="flight.delay" class="delay">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        {{ flight.delay }}
      </div>
      <div v-else />

      <div class="price-block">
        <span class="price">{{ flight.price }}</span>
        <a
          :href="bookUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="book-btn"
        >
          Select
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </a>
      </div>
    </div>
  </article>
</template>

<style scoped>
/* ── Card shell ──────────────────────────────────────────────────────────── */
.flight-card {
  padding: 18px 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: background var(--transition), box-shadow var(--transition), transform var(--transition);
  cursor: default;
}

.flight-card:hover {
  background: var(--bg-card-hover);
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.flight-card--best {
  border-color: rgba(251, 191, 36, 0.25);
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.fc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.airline {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
}

.airline__icon { flex-shrink: 0; }

.airline__name {
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}

/* Inline chip — no absolute positioning */
.best-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  background: rgba(251, 191, 36, 0.1);
  color: #f59e0b;
  border: 1px solid rgba(251, 191, 36, 0.22);
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

/* ── Route ───────────────────────────────────────────────────────────────── */
.fc-route {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Departure / arrival endpoint columns */
.endpoint {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  flex-shrink: 0;
  min-width: 0;
}

.endpoint--right {
  align-items: flex-end;
}

.endpoint__time {
  font-size: 1.65rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.03em;
  line-height: 1;
  white-space: nowrap;
}

.endpoint__ahead {
  font-size: 0.6rem;
  font-weight: 800;
  color: var(--warning);
  vertical-align: super;
  margin-left: 1px;
}

.endpoint__code {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-secondary);
}

.endpoint__date {
  font-size: 0.7rem;
  color: var(--text-muted);
  white-space: nowrap;
  min-height: 1em; /* keeps alignment when date is absent */
}

/* Center segment */
.segment {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.segment__duration {
  font-size: 0.73rem;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.02em;
}

.segment__track {
  width: 100%;
  display: flex;
  align-items: center;
}

.track__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-muted);
  flex-shrink: 0;
  opacity: 0.6;
}

.track__dot--right {
  background: var(--text-muted);
}

.track__line {
  flex: 1;
  height: 1.5px;
  background: linear-gradient(
    to right,
    rgba(148, 163, 184, 0.3),
    rgba(148, 163, 184, 0.15)
  );
}

/* Dashed line for flights with stops */
.segment__track--stops .track__line {
  background: none;
  border-top: 1.5px dashed rgba(148, 163, 184, 0.3);
  height: 0;
  margin-top: 1px;
}

.track__plane {
  color: var(--text-secondary);
  flex-shrink: 0;
  margin: 0 1px;
  opacity: 0.85;
}

.segment__stops {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.02em;
}

.segment__stops--nonstop {
  color: var(--success);
}

/* ── Footer ──────────────────────────────────────────────────────────────── */
.fc-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.delay {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--warning);
  background: rgba(245, 158, 11, 0.08);
  padding: 4px 8px;
  border-radius: 6px;
}

.price-block {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.price {
  font-size: 1.55rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.03em;
}

.book-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 9px 18px;
  background: var(--accent);
  color: #fff;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 700;
  text-decoration: none;
  letter-spacing: 0.01em;
  transition: background var(--transition), box-shadow var(--transition), transform var(--transition);
  white-space: nowrap;
}

.book-btn:hover {
  background: var(--accent-hover);
  box-shadow: 0 0 18px rgba(99, 102, 241, 0.4);
  transform: translateY(-1px);
}

.book-btn:active {
  transform: scale(0.97);
}
</style>
