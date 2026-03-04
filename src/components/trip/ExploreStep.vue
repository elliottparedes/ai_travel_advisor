<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import { useTripStore } from "../../stores/tripStore";
import { useListStore } from "../../stores/listStore";
import { useAuthStore } from "../../stores/authStore";
import { CARD_FILTERS } from "../../types/trips";
import { usePlaceDetail } from "../../composables/usePlaceDetail";
import DiscoveryCard from "./DiscoveryCard.vue";
import SkeletonCard from "./SkeletonCard.vue";
import PlaceDetailPanel from "./PlaceDetailPanel.vue";
import TripMap from "./TripMap.vue";

const store = useTripStore();
const listStore = useListStore();
const auth = useAuthStore();

// ── Infinite scroll via IntersectionObserver ─────────────────────────────────
const sentinel = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !store.isLoadingMore) {
        store.loadMore();
      }
    },
    { rootMargin: "300px" },
  );
  if (sentinel.value) observer.observe(sentinel.value);

  // Load list store non-blocking for card highlighting
  if (auth.sessionToken) void listStore.load(auth.sessionToken);
});

onUnmounted(() => observer?.disconnect());

watch(
  () => store.activeFilter,
  async () => {
    if (sentinel.value && observer) {
      observer.unobserve(sentinel.value);
      observer.observe(sentinel.value);
    }
  },
);

// ── Map toggle ───────────────────────────────────────────────────────────────
const showMap = ref(false);

// ── Place detail panel ───────────────────────────────────────────────────────
const { selectedCard, placeDetails, isLoadingDetails, openCard } = usePlaceDetail();
</script>

<template>
  <div class="explore-step">
    <!-- Destination header -->
    <div class="dest-header">
      <div class="dest-info">
        <h2 class="dest-name">
          {{ store.destinationInfo?.city }},
          <span class="dest-country">{{ store.destinationInfo?.country }}</span>
        </h2>
        <p class="dest-desc">{{ store.destinationInfo?.description }}</p>
        <div v-if="store.destinationInfo?.highlights?.length" class="highlights">
          <span v-for="h in store.destinationInfo.highlights.slice(0, 4)" :key="h" class="highlight">
            {{ h }}
          </span>
        </div>
      </div>
      <div class="dest-actions">
        <button
          class="map-toggle"
          :class="{ 'map-toggle--active': showMap }"
          @click="showMap = !showMap"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
            <line x1="8" y1="2" x2="8" y2="18"/>
            <line x1="16" y1="6" x2="16" y2="22"/>
          </svg>
          {{ showMap ? 'Hide map' : 'Show map' }}
        </button>
        <div class="pin-counter" v-if="store.pinnedIds.size > 0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          {{ store.pinnedIds.size }} pinned
        </div>
        <button class="btn-next" @click="store.goToBoard">
          View board →
        </button>
      </div>
    </div>

    <!-- Map panel -->
    <Transition name="slide-down">
      <div v-if="showMap" class="map-panel">
        <TripMap
          :cards="store.displayedCards"
          :pinned-ids="store.pinnedIds"
          :center-lat="store.destinationInfo?.lat ?? 0"
          :center-lng="store.destinationInfo?.lng ?? 0"
          @toggle-pin="store.togglePin"
          @select-card="openCard"
        />
      </div>
    </Transition>

    <!-- Filter tabs -->
    <div class="filter-bar">
      <button
        v-for="f in CARD_FILTERS"
        :key="f.key"
        class="filter-tab"
        :class="{ 'filter-tab--active': store.activeFilter === f.key }"
        @click="store.setFilter(f.key)"
      >
        <span class="filter-emoji">{{ f.emoji }}</span>
        <span>{{ f.label }}</span>
      </button>
    </div>

    <!-- Skeleton cards while category loads -->
    <div v-if="store.isLoadingCategory" class="masonry">
      <div class="masonry-col" v-for="col in 3" :key="col">
        <SkeletonCard v-for="n in 4" :key="n" />
      </div>
    </div>

    <!-- Masonry grid -->
    <div v-else class="masonry">
      <div class="masonry-col" v-for="col in 3" :key="col">
        <DiscoveryCard
          v-for="card in store.displayedCards.filter((_, i) => i % 3 === col - 1)"
          :key="card.id"
          :card="card"
          :pinned="store.pinnedIds.has(card.id)"
          :listed="!!card.fsqId && listStore.listedFsqIds.has(card.fsqId)"
          @toggle-pin="store.togglePin"
          @select="openCard(card)"
        />
      </div>
    </div>

    <!-- Infinite scroll sentinel + loader -->
    <div ref="sentinel" class="sentinel">
      <div v-if="store.isLoadingMore" class="loading-more">
        <div class="spinner" />
        <span>Finding more places…</span>
      </div>
    </div>

    <!-- No results -->
    <div v-if="store.filteredCards.length === 0 && !store.isLoadingMore && !store.isLoadingCategory" class="empty">
      No {{ CARD_FILTERS.find(f => f.key === store.activeFilter)?.label.toLowerCase() ?? store.activeFilter }} found yet.
    </div>

    <!-- Place detail panel -->
    <PlaceDetailPanel
      v-if="selectedCard"
      :card="selectedCard"
      :details="placeDetails"
      :is-loading="isLoadingDetails"
      :pinned="store.pinnedIds.has(selectedCard.id)"
      :city="store.destinationInfo?.city ?? ''"
      :country="store.destinationInfo?.country ?? ''"
      @close="selectedCard = null"
      @toggle-pin="store.togglePin"
    />
  </div>
</template>

<style scoped>
.explore-step {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Destination header ── */
.dest-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.dest-info { flex: 1; min-width: 0; }

.dest-name {
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--text-primary);
  line-height: 1.2;
}

.dest-country { color: var(--text-muted); font-weight: 500; }

.dest-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 6px;
  line-height: 1.6;
  max-width: 600px;
}

.highlights {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.highlight {
  font-size: 0.73rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-card);
  border: 1px solid var(--border);
  padding: 3px 10px;
  border-radius: 999px;
}

.dest-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.map-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--transition), border-color var(--transition), color var(--transition);
}

.map-toggle--active,
.map-toggle:hover {
  background: var(--accent-dim);
  border-color: rgba(99,102,241,0.4);
  color: var(--accent);
}

.pin-counter {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--danger);
  background: var(--danger-bg);
  padding: 6px 12px;
  border-radius: 999px;
}

.btn-next {
  padding: 8px 20px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--transition), box-shadow var(--transition);
}

.btn-next:hover {
  background: var(--accent-hover);
  box-shadow: 0 0 20px rgba(99,102,241,0.4);
}

/* ── Map panel ── */
.map-panel {
  height: 360px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--border);
  isolation: isolate;
}

.slide-down-enter-active, .slide-down-leave-active {
  transition: max-height 300ms ease, opacity 250ms ease;
  overflow: hidden;
  max-height: 400px;
}
.slide-down-enter-from, .slide-down-leave-to {
  max-height: 0;
  opacity: 0;
}

/* ── Filters ── */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.filter-tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--transition), border-color var(--transition), color var(--transition);
}

.filter-tab:hover {
  color: var(--text-primary);
  background: var(--bg-card-hover);
}

.filter-tab--active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.filter-emoji { font-size: 0.9rem; }

/* ── Masonry ── */
.masonry {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  align-items: start;
}

@media (max-width: 900px) { .masonry { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 580px) { .masonry { grid-template-columns: 1fr; } }

.masonry-col {
  display: flex;
  flex-direction: column;
}

/* ── Sentinel / loader ── */
.sentinel { padding: 20px 0; display: flex; justify-content: center; }

.loading-more {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.83rem;
  color: var(--text-muted);
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

.empty {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
  font-size: 0.9rem;
}
</style>
