<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { CARD_GRADIENTS, CARD_ICONS } from "../../types/trips";
import type { DiscoveryCard, PlaceDetails } from "../../types/trips";
import * as tripsApi from "../../api/tripsApi";

const props = defineProps<{
  card: DiscoveryCard;
  details: PlaceDetails | null;
  isLoading: boolean;
  pinned: boolean;
}>();

const emit = defineEmits<{ close: []; togglePin: [id: string] }>();

const gradient = (type: string) => CARD_GRADIENTS[type] ?? CARD_GRADIENTS.landmark;
const iconPath = (type: string) => CARD_ICONS[type] ?? CARD_ICONS.landmark;

// ── Lightbox ─────────────────────────────────────────────────────────────────
const lightboxOpen = ref(false);
const lightboxIndex = ref(0);

// ── Photos ───────────────────────────────────────────────────────────────────
const photos = ref<string[]>([]);
const photoErrors = ref(new Set<number>());

// Hero = first non-errored photo; cycles automatically as errors come in
const heroIndex = computed(() => {
  for (let i = 0; i < photos.value.length; i++) {
    if (!photoErrors.value.has(i)) return i;
  }
  return -1;
});
const heroUrl = computed(() => heroIndex.value >= 0 ? photos.value[heroIndex.value] : null);

function onPhotoError(index: number) {
  photoErrors.value = new Set([...photoErrors.value, index]);
}

// Non-errored strip photos (indices 1+) for the photo strip below the hero
const visibleStripPhotos = computed(() =>
  photos.value
    .slice(1)
    .map((url, i) => ({ url, originalIndex: i + 1 }))
    .filter(({ originalIndex }) => !photoErrors.value.has(originalIndex))
);

watch(() => props.card, async (card) => {
  // Seed with card image + fallbacks immediately so hero appears while extras load
  const seedUrls = [card.image, ...(card.imageFallbacks ?? [])].filter((u): u is string => Boolean(u));
  photos.value = seedUrls;
  photoErrors.value = new Set();
  lightboxIndex.value = 0;
  lightboxOpen.value = false;

  const more = await tripsApi.fetchPlacePhotos(card.title).catch(() => [] as string[]);
  const seedSet = new Set(seedUrls);
  const extra = more.filter(u => !seedSet.has(u));
  photos.value = [...seedUrls, ...extra].slice(0, 8);
}, { immediate: true });

function openLightbox(index: number) {
  if (photos.value[index]) {
    lightboxIndex.value = index;
    lightboxOpen.value = true;
  }
}

function prevPhoto() {
  lightboxIndex.value = (lightboxIndex.value - 1 + photos.value.length) % photos.value.length;
}

function nextPhoto() {
  lightboxIndex.value = (lightboxIndex.value + 1) % photos.value.length;
}

// ── Close with animation ─────────────────────────────────────────────────────
const isClosing = ref(false);

function startClose() {
  if (isClosing.value) return;
  isClosing.value = true;
  setTimeout(() => emit('close'), 240);
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    if (lightboxOpen.value) lightboxOpen.value = false;
    else startClose();
  } else if (lightboxOpen.value) {
    if (e.key === "ArrowLeft")  prevPhoto();
    if (e.key === "ArrowRight") nextPhoto();
  }
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onUnmounted(() => window.removeEventListener("keydown", onKeydown));
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

    <!-- Hero — first non-errored photo, click to enlarge -->
    <div class="panel-hero">
      <div
        class="panel-hero__bg"
        :class="{ 'panel-hero__bg--zoomable': !!heroUrl }"
        :style="heroUrl ? {} : { background: gradient(card.type) }"
        @click="heroUrl && openLightbox(heroIndex)"
      >
        <img
          v-if="heroUrl"
          :src="heroUrl"
          referrerpolicy="no-referrer"
          class="panel-hero__img"
          @error="onPhotoError(heroIndex)"
        />
        <div v-if="heroUrl" class="panel-hero__scrim" />
        <svg v-else class="panel-hero__icon" viewBox="0 0 24 24" fill="white">
          <path :d="iconPath(card.type)" />
        </svg>
        <div v-if="heroUrl" class="zoom-hint">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </div>
      </div>
    </div>

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

      <!-- Additional photos -->
      <template v-if="visibleStripPhotos.length > 0">
        <div class="photos-label">Photos</div>
        <div class="photos-strip">
          <img
            v-for="{ url, originalIndex } in visibleStripPhotos"
            :key="url"
            :src="url"
            :alt="`${card.title} photo ${originalIndex + 1}`"
            referrerpolicy="no-referrer"
            class="photo-item"
            @click="openLightbox(originalIndex)"
            @error="onPhotoError(originalIndex)"
          />
        </div>
      </template>
    </div>
  </div>

  <!-- Lightbox -->
  <Teleport to="body">
    <Transition name="lb-fade">
      <div v-if="lightboxOpen" class="lightbox" @click.self="lightboxOpen = false">
        <button class="lb-close" @click="lightboxOpen = false" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <button v-if="photos.length > 1" class="lb-nav lb-nav--prev" @click.stop="prevPhoto" aria-label="Previous">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>

        <img class="lb-img" :src="photos[lightboxIndex]" :alt="card.title" referrerpolicy="no-referrer" @click.stop />

        <button v-if="photos.length > 1" class="lb-nav lb-nav--next" @click.stop="nextPhoto" aria-label="Next">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        <!-- Counter -->
        <div v-if="photos.length > 1" class="lb-counter">{{ lightboxIndex + 1 }} / {{ photos.length }}</div>
      </div>
    </Transition>
  </Teleport>
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

/* ── Hero / Carousel ── */
.panel-hero {
  position: relative;
  height: 200px;
  flex-shrink: 0;
  overflow: hidden;
}

.panel-hero__bg {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.panel-hero__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.panel-hero__scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.5) 100%);
}

.panel-hero__icon {
  width: 52px;
  height: 52px;
  opacity: 0.5;
}

/* ── Photo strip ── */
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

/* ── Detail sections ── */
.detail-section { display: flex; flex-direction: column; gap: 4px; }

.detail-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.detail-value {
  font-size: 0.82rem;
  color: var(--text-secondary);
  line-height: 1.5;
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

/* ── Zoom hint ── */
.panel-hero__bg--zoomable { cursor: zoom-in; }

.zoom-hint {
  position: absolute;
  bottom: 10px;
  right: 10px;
  z-index: 4;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(0,0,0,0.35);
  backdrop-filter: blur(4px);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--transition);
  pointer-events: none;
}

.panel-hero__bg--zoomable:hover .zoom-hint { opacity: 1; }

/* ── Lightbox ── */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.lb-img {
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 0 0 80px rgba(0,0,0,0.8);
  user-select: none;
}

.lb-close {
  position: fixed;
  top: 16px;
  right: 16px;
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 50%;
  background: rgba(255,255,255,0.12);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition);
  z-index: 10;
}

.lb-close:hover { background: rgba(255,255,255,0.22); }

.lb-nav {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  width: 46px;
  height: 46px;
  border: none;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition);
  z-index: 10;
}

.lb-nav:hover { background: rgba(255,255,255,0.22); }
.lb-nav--prev { left: 16px; }
.lb-nav--next { right: 16px; }

.lb-counter {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(255,255,255,0.65);
  background: rgba(0,0,0,0.4);
  padding: 4px 12px;
  border-radius: 999px;
}

.lb-fade-enter-active, .lb-fade-leave-active { transition: opacity 180ms ease; }
.lb-fade-enter-from, .lb-fade-leave-to { opacity: 0; }
</style>
