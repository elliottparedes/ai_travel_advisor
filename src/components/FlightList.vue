<script setup lang="ts">
import type { FlightSearchResponse, FlightSearchParams } from "../types/flights";
import FlightCard from "./FlightCard.vue";
import PriceLevelBadge from "./PriceLevelBadge.vue";

defineProps<{
  data: FlightSearchResponse;
  params: FlightSearchParams;
}>();
</script>

<template>
  <section class="flight-list">
    <!-- Header -->
    <div class="flight-list__header">
      <div class="header-left">
        <h2 class="result-count">
          {{ data.flights.length }}
          {{ data.flights.length === 1 ? "flight" : "flights" }} found
        </h2>
        <PriceLevelBadge :level="data.price_level" />
      </div>
      <a
        :href="data.book_url"
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-ghost view-all-btn"
      >
        View on Google Flights
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </a>
    </div>

    <!-- Grid -->
    <div class="flight-list__grid">
      <FlightCard
        v-for="(flight, i) in data.flights"
        :key="i"
        :flight="flight"
        :params="params"
        :book-url="data.book_url"
      />
    </div>

    <!-- Empty state -->
    <div v-if="data.flights.length === 0" class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <p>No flights found for this route and date.</p>
      <p class="empty-hint">Try adjusting your search parameters or a different date.</p>
    </div>
  </section>
</template>

<style scoped>
.flight-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.flight-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.result-count {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.view-all-btn {
  font-size: 0.82rem;
}

.flight-list__grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.empty-hint {
  font-size: 0.85rem;
}
</style>
