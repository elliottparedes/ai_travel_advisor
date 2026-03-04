<script setup lang="ts">
import { ref, computed, watch } from "vue";

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  photos: string[];
  title: string;
  gradient?: string;
  iconPath?: string;
  hideStrip?: boolean;
}>();

// ── Photo error tracking ──────────────────────────────────────────────────────
const photoErrors = ref(new Set<number>());

watch(() => props.photos, () => {
  photoErrors.value = new Set();
}, { immediate: true });

function onPhotoError(index: number) {
  photoErrors.value = new Set([...photoErrors.value, index]);
}

// Hero = first non-errored photo
const heroIndex = computed(() => {
  for (let i = 0; i < props.photos.length; i++) {
    if (!photoErrors.value.has(i)) return i;
  }
  return -1;
});
const heroUrl = computed(() => heroIndex.value >= 0 ? props.photos[heroIndex.value] : null);

// Non-errored strip photos (indices 1+) for the photo strip
const visibleStripPhotos = computed(() =>
  props.photos
    .slice(1)
    .map((url, i) => ({ url, originalIndex: i + 1 }))
    .filter(({ originalIndex }) => !photoErrors.value.has(originalIndex))
);

// ── Lightbox ─────────────────────────────────────────────────────────────────
const lightboxOpen = ref(false);
const lightboxIndex = ref(0);

function openLightbox(index: number) {
  if (props.photos[index]) {
    lightboxIndex.value = index;
    lightboxOpen.value = true;
  }
}

function closeLightbox() {
  lightboxOpen.value = false;
}

function prevPhoto() {
  lightboxIndex.value = (lightboxIndex.value - 1 + props.photos.length) % props.photos.length;
}

function nextPhoto() {
  lightboxIndex.value = (lightboxIndex.value + 1) % props.photos.length;
}

defineExpose({ isLightboxOpen: lightboxOpen, closeLightbox, prevPhoto, nextPhoto, visibleStripPhotos, openLightbox, onPhotoError });
</script>

<template>
  <!-- Hero — first non-errored photo, click to enlarge -->
  <div class="panel-hero">
    <div
      class="panel-hero__bg"
      :class="{ 'panel-hero__bg--zoomable': !!heroUrl }"
      :style="heroUrl ? {} : (gradient ? { background: gradient } : {})"
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
      <svg v-if="!heroUrl && iconPath" class="panel-hero__icon" viewBox="0 0 24 24" fill="white">
        <path :d="iconPath" />
      </svg>
      <div v-if="heroUrl" class="zoom-hint">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
        </svg>
      </div>
    </div>
  </div>

  <!-- Photo strip (inside panel-body, rendered in flow via slot pass-through) -->
  <template v-if="!hideStrip && visibleStripPhotos.length > 0">
    <div class="photos-label">Photos</div>
    <div class="photos-strip">
      <img
        v-for="{ url, originalIndex } in visibleStripPhotos"
        :key="url"
        :src="url"
        :alt="`${title} photo ${originalIndex + 1}`"
        referrerpolicy="no-referrer"
        class="photo-item"
        @click="openLightbox(originalIndex)"
        @error="onPhotoError(originalIndex)"
      />
    </div>
  </template>

  <!-- Lightbox -->
  <Teleport to="body">
    <Transition name="lb-fade">
      <div v-if="lightboxOpen" class="lightbox" @click.self="closeLightbox">
        <button class="lb-close" @click="closeLightbox" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <button v-if="photos.length > 1" class="lb-nav lb-nav--prev" @click.stop="prevPhoto" aria-label="Previous">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>

        <img class="lb-img" :src="photos[lightboxIndex]" :alt="title" referrerpolicy="no-referrer" @click.stop />

        <button v-if="photos.length > 1" class="lb-nav lb-nav--next" @click.stop="nextPhoto" aria-label="Next">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        <div v-if="photos.length > 1" class="lb-counter">{{ lightboxIndex + 1 }} / {{ photos.length }}</div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Hero ── */
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
  background: var(--bg-card);
}

.panel-hero__icon {
  width: 52px;
  height: 52px;
  opacity: 0.5;
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
