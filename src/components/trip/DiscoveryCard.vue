<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { CARD_GRADIENTS, CARD_ICONS } from "../../types/trips";
import type { DiscoveryCard } from "../../types/trips";

const props = defineProps<{
  card: DiscoveryCard;
  pinned: boolean;
}>();
const emit = defineEmits<{ togglePin: [id: string]; select: [] }>();

const gradient = (type: string) => CARD_GRADIENTS[type] ?? CARD_GRADIENTS.landmark;
const iconPath = (type: string) => CARD_ICONS[type] ?? CARD_ICONS.landmark;
const stars = (n: number) => Math.round(n);

// Image fallback cycling — tries card.image, then each imageFallbacks entry on error
const imgIndex = ref(0);
watch(() => props.card.id, () => { imgIndex.value = 0; });

const allImageUrls = computed(() =>
  [props.card.image, ...(props.card.imageFallbacks ?? [])].filter((u): u is string => Boolean(u))
);
const effectiveImage = computed(() => allImageUrls.value[imgIndex.value] ?? null);

function onImageError() {
  if (imgIndex.value < allImageUrls.value.length - 1) {
    imgIndex.value++;
  } else {
    imgIndex.value = 9999; // exhausted all — show gradient
  }
}
</script>

<template>
  <div class="discovery-card" :class="{ 'discovery-card--pinned': pinned }" @click="emit('select')">
    <!-- Hero: real photo when available, gradient fallback -->
    <div class="card-hero" :style="effectiveImage ? {} : { background: gradient(card.type) }">
      <!-- referrerpolicy="no-referrer" prevents Referer header → no 403 hotlink blocks -->
      <img
        v-if="effectiveImage"
        :src="effectiveImage"
        referrerpolicy="no-referrer"
        class="card-hero__img"
        @error="onImageError"
      />
      <!-- Scrim so chips/buttons remain readable over photos -->
      <div v-if="effectiveImage" class="card-hero__scrim" />
      <svg v-else class="card-hero__icon" viewBox="0 0 24 24" fill="white">
        <path :d="iconPath(card.type)" />
      </svg>

      <!-- Type chip -->
      <span class="type-chip">{{ card.type }}</span>

      <!-- Pin button -->
      <button
        class="pin-btn"
        :class="{ 'pin-btn--active': pinned }"
        :aria-label="pinned ? 'Unpin' : 'Pin'"
        @click.stop="emit('togglePin', card.id)"
      >
        <svg viewBox="0 0 24 24" :fill="pinned ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
    </div>

    <!-- Content -->
    <div class="card-body">
      <h3 class="card-title">{{ card.title }}</h3>

      <!-- Meta row -->
      <div class="card-meta">
        <span v-if="card.neighborhood" class="meta-neighborhood">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          {{ card.neighborhood }}
        </span>
        <span v-if="card.cuisine" class="meta-badge">{{ card.cuisine }}</span>
        <span v-if="card.category" class="meta-badge">{{ card.category }}</span>
        <span v-if="card.vibe" class="meta-badge">{{ card.vibe }}</span>
      </div>

      <p class="card-desc">{{ card.description }}</p>

      <!-- Stars + price row -->
      <div class="card-footer">
        <div v-if="card.rating" class="rating">
          <span
            v-for="i in 5"
            :key="i"
            class="star"
            :class="{ 'star--filled': i <= stars(card.rating) }"
          >★</span>
          <span class="rating-num">{{ card.rating.toFixed(1) }}</span>
        </div>
        <div class="price-info">
          <span v-if="card.priceRange" class="price-range">{{ card.priceRange }}</span>
          <span v-if="card.pricePerNight" class="price-night">{{ card.pricePerNight }}</span>
        </div>
      </div>

      <!-- Tags -->
      <div v-if="card.tags?.length" class="tags">
        <span v-for="tag in card.tags.slice(0, 3)" :key="tag" class="tag">{{ tag }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.discovery-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  break-inside: avoid;
  margin-bottom: 14px;
  transition: transform var(--transition), box-shadow var(--transition), border-color var(--transition);
  cursor: pointer;
}

.discovery-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}

.discovery-card--pinned {
  border-color: rgba(99, 102, 241, 0.45);
  box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.2);
}

/* ── Hero ── */
.card-hero {
  position: relative;
  height: 130px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-hero__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-hero__scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.45) 100%);
}

.card-hero__icon {
  width: 44px;
  height: 44px;
  opacity: 0.55;
}

.type-chip {
  position: absolute;
  bottom: 8px;
  left: 10px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: rgba(255,255,255,0.9);
  background: rgba(0,0,0,0.25);
  padding: 2px 8px;
  border-radius: 999px;
  backdrop-filter: blur(4px);
}

.pin-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(0,0,0,0.3);
  backdrop-filter: blur(4px);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition), transform var(--transition), color var(--transition);
  opacity: 0;
}

.discovery-card:hover .pin-btn,
.pin-btn--active {
  opacity: 1;
}

.pin-btn svg { width: 15px; height: 15px; }

.pin-btn--active {
  background: rgba(239, 68, 68, 0.85);
  color: white;
  transform: scale(1.1);
}

.pin-btn:hover {
  background: rgba(239, 68, 68, 0.9);
  transform: scale(1.05);
}

/* ── Body ── */
.card-body {
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.card-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}

.card-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
}

.meta-neighborhood {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 0.7rem;
  color: var(--text-muted);
  font-weight: 500;
}

.meta-badge {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-dim);
  padding: 1px 7px;
  border-radius: 999px;
}

.card-desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* ── Footer ── */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.rating {
  display: flex;
  align-items: center;
  gap: 1px;
}

.star {
  font-size: 0.75rem;
  color: var(--border);
}

.star--filled { color: #f59e0b; }

.rating-num {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin-left: 4px;
}

.price-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.price-range {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--success);
}

.price-night {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--success);
}

/* ── Tags ── */
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag {
  font-size: 0.65rem;
  color: var(--text-muted);
  background: var(--bg-input);
  border: 1px solid var(--border);
  padding: 2px 7px;
  border-radius: 999px;
}
</style>
