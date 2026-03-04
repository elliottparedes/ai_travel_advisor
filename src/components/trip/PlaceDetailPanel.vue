<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import { CARD_GRADIENTS, CARD_ICONS } from "../../types/trips";
import type { DiscoveryCard, PlaceDetails } from "../../types/trips";
import * as tripsApi from "../../api/tripsApi";
import AddToListModal from "../list/AddToListModal.vue";
import TripMap from "./TripMap.vue";
import PlacePhotos from "./PlacePhotos.vue";
import PlaceReviews from "./PlaceReviews.vue";

const PANEL_CLOSE_DELAY_MS = 240;
const MAX_PANEL_PHOTOS = 8;

const props = defineProps<{
  card: DiscoveryCard;
  details: PlaceDetails | null;
  isLoading: boolean;
  pinned: boolean;
  city?: string;
  country?: string;
}>();

const emit = defineEmits<{ close: []; togglePin: [id: string] }>();

// ── Save to list ──────────────────────────────────────────────────────────────
const showAddToList = ref(false);

// ── Mini map ──────────────────────────────────────────────────────────────────
const showMiniMap = ref(false);

// ── Photos (fetched here, passed to PlacePhotos) ──────────────────────────────
const photos = ref<string[]>([]);
const photosRef = ref<InstanceType<typeof PlacePhotos> | null>(null);

watch(() => props.card, async (card) => {
  const seedUrls = [card.image, ...(card.imageFallbacks ?? [])].filter((u): u is string => Boolean(u));
  photos.value = seedUrls;
  showAddToList.value = false;
  showMiniMap.value = false;

  const more = await tripsApi.fetchPlacePhotos(card.title).catch(() => [] as string[]);
  const seedSet = new Set(seedUrls);
  const extra = more.filter(u => !seedSet.has(u));
  photos.value = [...seedUrls, ...extra].slice(0, MAX_PANEL_PHOTOS);
}, { immediate: true });

// ── Close with animation ──────────────────────────────────────────────────────
const isClosing = ref(false);

function startClose() {
  if (isClosing.value) return;
  isClosing.value = true;
  setTimeout(() => emit('close'), PANEL_CLOSE_DELAY_MS);
}

// ── Keyboard handler (centralised) ───────────────────────────────────────────
function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    if (photosRef.value?.isLightboxOpen) {
      photosRef.value.closeLightbox();
    } else {
      startClose();
    }
  } else if (photosRef.value?.isLightboxOpen) {
    if (e.key === "ArrowLeft")  photosRef.value.prevPhoto();
    if (e.key === "ArrowRight") photosRef.value.nextPhoto();
  }
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onUnmounted(() => window.removeEventListener("keydown", onKeydown));

// ── Helpers ───────────────────────────────────────────────────────────────────
const gradient = (type: string) => CARD_GRADIENTS[type] ?? CARD_GRADIENTS.landmark;
const iconPath = (type: string) => CARD_ICONS[type] ?? CARD_ICONS.landmark;
</script>

<template>
  <!-- Backdrop -->
  <div class="panel-backdrop" :class="{ 'panel-backdrop--closing': isClosing }" @click="startClose" />

  <!-- Sliding panel -->
  <div class="detail-panel" :class="{ 'detail-panel--closing': isClosing }">
    <!-- Close button -->
    <button class="close-btn" @click="startClose" aria-label="Close">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>

    <!-- Photos: hero + strip + lightbox -->
    <PlacePhotos
      ref="photosRef"
      :photos="photos"
      :title="card.title"
      :gradient="gradient(card.type)"
      :icon-path="iconPath(card.type)"
      hide-strip
    />

    <div class="panel-body">
      <!-- Name + type badge -->
      <div class="panel-title-row">
        <h2 class="panel-name">{{ card.title }}</h2>
        <span class="type-badge">{{ card.type }}</span>
      </div>

      <!-- Neighborhood -->
      <div v-if="card.neighborhood" class="panel-neighborhood">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
        </svg>
        {{ card.neighborhood }}
      </div>

      <!-- Rating + price -->
      <div class="panel-meta">
        <div v-if="card.rating" class="rating">
          <span
            v-for="i in 5"
            :key="i"
            class="star"
            :class="{ 'star--filled': i <= Math.round(card.rating) }"
          >★</span>
          <span class="rating-num">{{ card.rating.toFixed(1) }}</span>
        </div>
        <span v-if="card.priceRange" class="price-range">{{ card.priceRange }}</span>
      </div>

      <!-- Details loading skeleton -->
      <div v-if="isLoading" class="details-loading">
        <div class="skel-line" />
        <div class="skel-line skel-line--short" />
      </div>

      <template v-else-if="details">
        <!-- Links -->
        <div v-if="details.website || details.tel" class="detail-links">
          <a v-if="details.website" :href="details.website" target="_blank" rel="noopener" class="detail-link">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            Website
          </a>
          <a v-if="details.tel" :href="`tel:${details.tel}`" class="detail-link">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.27 2 2 0 0 1 3.59 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.16 6.16l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            {{ details.tel }}
          </a>
        </div>
      </template>

      <!-- Tags -->
      <div v-if="card.tags?.length" class="panel-tags">
        <span v-for="tag in card.tags.slice(0, 4)" :key="tag" class="tag">{{ tag }}</span>
      </div>

      <!-- Pin button -->
      <button
        class="pin-btn"
        :class="{ 'pin-btn--active': pinned }"
        @click="emit('togglePin', card.id)"
      >
        <svg viewBox="0 0 24 24" :fill="pinned ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        {{ pinned ? 'Pinned' : 'Pin this place' }}
      </button>

      <!-- Save to list button -->
      <button class="list-save-btn" @click="showAddToList = true">
        🔖 Save to list
      </button>

      <!-- Mini map toggle -->
      <button v-if="card.lat" class="map-toggle-btn" @click="showMiniMap = !showMiniMap">
        🗺 {{ showMiniMap ? 'Hide map' : 'Show on map' }}
      </button>
      <Transition name="slide-down">
        <div v-if="showMiniMap && card.lat" class="mini-map-panel">
          <TripMap
            :cards="[card]"
            :pinned-ids="new Set()"
            :center-lat="card.lat ?? 0"
            :center-lng="card.lng ?? 0"
            @toggle-pin="() => {}"
            @select-card="() => {}"
          />
        </div>
      </Transition>

      <!-- Reviews section -->
      <PlaceReviews
        v-if="card.fsqId"
        :fsq-id="card.fsqId"
        :place-title="card.title"
        :place-type="card.type"
        :city="city ?? ''"
        :country="country ?? ''"
      />

      <!-- Additional photos (after reviews) -->
      <template v-if="photosRef?.visibleStripPhotos?.length">
        <div class="photos-label">Photos</div>
        <div class="photos-strip">
          <img
            v-for="{ url, originalIndex } in photosRef.visibleStripPhotos"
            :key="url"
            :src="url"
            :alt="`${card.title} photo ${originalIndex + 1}`"
            referrerpolicy="no-referrer"
            class="photo-item"
            @click="photosRef?.openLightbox(originalIndex)"
            @error="photosRef?.onPhotoError(originalIndex)"
          />
        </div>
      </template>
    </div>
  </div>

  <!-- Add to list modal -->
  <AddToListModal
    v-if="showAddToList"
    :card="card"
    :city="city ?? ''"
    :country="country ?? ''"
    @close="showAddToList = false"
  />
</template>

<style scoped>
.panel-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 199;
  animation: fade-in 200ms ease;
}

@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.panel-backdrop--closing {
  animation: fade-out 240ms ease forwards;
}

@keyframes fade-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}

.detail-panel {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: 380px;
  background: var(--bg-page);
  border-left: 1px solid var(--border);
  z-index: 200;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  animation: slide-in 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

@keyframes slide-in {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}

.detail-panel--closing {
  animation: slide-out 240ms cubic-bezier(0.55, 0, 1, 0.45) forwards;
}

@keyframes slide-out {
  from { transform: translateX(0); }
  to   { transform: translateX(100%); }
}

@media (max-width: 480px) {
  .detail-panel { width: 100vw; }
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(4px);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition);
}

.close-btn:hover { background: rgba(0, 0, 0, 0.55); }

/* ── Body ── */
.panel-body {
  padding: 18px 20px 28px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-title-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex-wrap: wrap;
}

.panel-name {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.25;
  flex: 1;
  min-width: 0;
}

.type-badge {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--accent);
  background: var(--accent-dim);
  padding: 3px 9px;
  border-radius: 999px;
  white-space: nowrap;
  align-self: flex-start;
  margin-top: 3px;
}

.panel-neighborhood {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78rem;
  color: var(--text-muted);
  font-weight: 500;
}

.panel-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rating {
  display: flex;
  align-items: center;
  gap: 1px;
}

.star { font-size: 0.8rem; color: var(--border); }
.star--filled { color: #f59e0b; }

.rating-num {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin-left: 4px;
}

.price-range {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--success);
}

/* ── Loading skeleton ── */
.details-loading {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skel-line {
  height: 11px;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--bg-input) 25%, var(--bg-card-hover) 50%, var(--bg-input) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.skel-line--short { width: 55%; }

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Links ── */
.detail-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;
  background: var(--accent-dim);
  padding: 5px 12px;
  border-radius: 999px;
  transition: background var(--transition);
}

.detail-link:hover { background: rgba(99,102,241,0.2); }

/* ── Tags ── */
.panel-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.tag {
  font-size: 0.68rem;
  color: var(--text-muted);
  background: var(--bg-input);
  border: 1px solid var(--border);
  padding: 3px 9px;
  border-radius: 999px;
}

/* ── Pin button ── */
.pin-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 11px;
  border: 1.5px solid var(--border);
  background: var(--bg-card);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
  cursor: pointer;
  margin-top: 4px;
  transition: background var(--transition), border-color var(--transition), color var(--transition);
}

.pin-btn svg { width: 16px; height: 16px; }

.pin-btn--active {
  background: var(--danger-bg);
  border-color: rgba(239, 68, 68, 0.4);
  color: var(--danger);
}

.pin-btn:hover {
  background: var(--danger-bg);
  border-color: rgba(239, 68, 68, 0.4);
  color: var(--danger);
}

/* ── Save to list / map toggle buttons ── */
.list-save-btn,
.map-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px;
  border: 1.5px solid var(--border);
  background: var(--bg-card);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--transition), border-color var(--transition), color var(--transition);
}

.list-save-btn:hover,
.map-toggle-btn:hover {
  background: var(--accent-dim);
  border-color: rgba(99, 102, 241, 0.4);
  color: var(--accent);
}

/* ── Mini map ── */
.mini-map-panel {
  height: 200px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--border);
}

.slide-down-enter-active, .slide-down-leave-active {
  transition: max-height 250ms ease, opacity 200ms ease;
  overflow: hidden;
  max-height: 220px;
}
.slide-down-enter-from, .slide-down-leave-to {
  max-height: 0;
  opacity: 0;
}

/* ── Photo strip (rendered after reviews) ── */
.photos-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-top: 4px;
}

.photos-strip {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.photo-item {
  width: 100%;
  border-radius: var(--radius-sm);
  display: block;
  cursor: zoom-in;
  transition: opacity var(--transition);
  object-fit: cover;
}

.photo-item:hover { opacity: 0.88; }
</style>
