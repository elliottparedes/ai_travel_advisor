<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { listTrips as apiListTrips, deleteTrip as apiDeleteTrip, fetchCardImages } from "../api/tripsApi";
import { useAuthStore } from "../stores/authStore";
import { useTripStore } from "../stores/tripStore";
import type { SavedTrip } from "../types/trips";

const router = useRouter();
const auth = useAuthStore();
const tripStore = useTripStore();

const trips = ref<SavedTrip[]>([]);
const isLoading = ref(true);
const deletingId = ref<string | null>(null);
const heroImages = ref<Record<string, string>>({});
const confirmDeleteId = ref<string | null>(null);

onMounted(async () => {
  await loadTrips();
});

async function loadTrips() {
  isLoading.value = true;
  try {
    trips.value = await apiListTrips(auth.sessionToken!);
    _fetchHeroImages();
  } finally {
    isLoading.value = false;
  }
}

async function _fetchHeroImages() {
  if (!trips.value.length) return;
  const queries = trips.value.map((t) => ({
    id: t.id,
    query: `${t.city} ${t.country} skyline cityscape`,
  }));
  try {
    const images = await fetchCardImages(queries);
    heroImages.value = images;
  } catch { /* images optional */ }
}

function startNewTrip() {
  tripStore.reset();
  router.push("/trips/new");
}

async function openTrip(tripId: string) {
  const ok = await tripStore.loadSavedTrip(tripId);
  if (ok) router.push("/trips/new");
}

async function confirmDelete() {
  if (!confirmDeleteId.value) return;
  const id = confirmDeleteId.value;
  confirmDeleteId.value = null;
  deletingId.value = id;
  try {
    await apiDeleteTrip(auth.sessionToken!, id);
    trips.value = trips.value.filter((t) => t.id !== id);
  } finally {
    deletingId.value = null;
  }
}

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(ts));
}
</script>

<template>
  <div class="trips-page">
    <!-- Header -->
    <div class="trips-header">
      <div>
        <h1 class="trips-title">My Trips</h1>
        <p class="trips-sub">Your saved travel plans</p>
      </div>
      <button v-if="!isLoading && trips.length > 0" class="btn-new-trip" @click="startNewTrip()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Plan new trip
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="isLoading" class="skeleton-grid">
      <div v-for="n in 3" :key="n" class="skeleton-card">
        <div class="skeleton-bar skeleton-bar--wide" />
        <div class="skeleton-bar skeleton-bar--narrow" />
        <div class="skeleton-bar skeleton-bar--mid" />
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="trips.length === 0" class="empty-state">
      <div class="empty-globe">🌍</div>
      <h2 class="empty-title">No trips yet</h2>
      <p class="empty-sub">Start planning your next adventure and save it here.</p>
      <button class="btn-new-trip btn-new-trip--large" @click="startNewTrip()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Plan your first trip
      </button>
    </div>

    <!-- Trip grid -->
    <div v-else class="trips-grid">
      <div
        v-for="trip in trips"
        :key="trip.id"
        class="trip-card"
        @click="openTrip(trip.id)"
      >
        <!-- Hero: city photo or gradient fallback -->
        <div
          class="trip-card__hero"
          :style="heroImages[trip.id]
            ? { backgroundImage: `url(${heroImages[trip.id]})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : {}"
        >
          <div class="trip-card__scrim" />
          <div class="trip-card__overlay">
            <h2 class="trip-card__name">{{ trip.name }}</h2>
            <p class="trip-card__dest">{{ trip.city }}, {{ trip.country }}</p>
          </div>
          <div v-if="!heroImages[trip.id]" class="trip-card__emoji">🗺️</div>
        </div>

        <div class="trip-card__body">
          <!-- Stats row -->
          <div class="trip-card__stats">
            <span class="stat">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {{ trip.pinnedCount }} pinned
            </span>
            <span class="stat">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {{ formatDate(trip.createdAt) }}
            </span>
          </div>

          <!-- Actions -->
          <div class="trip-card__actions">
            <button
              class="btn-delete"
              :disabled="deletingId === trip.id"
              @click.stop="confirmDeleteId = trip.id"
              title="Delete trip"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
              </svg>
              {{ deletingId === trip.id ? "Deleting…" : "Delete" }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete confirmation modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="confirmDeleteId" class="modal-backdrop" @click.self="confirmDeleteId = null">
          <div class="modal">
            <div class="modal-icon">🗑️</div>
            <h3 class="modal-title">Delete trip?</h3>
            <p class="modal-body">
              This will permanently delete
              <strong>{{ trips.find(t => t.id === confirmDeleteId)?.name }}</strong>.
              This action cannot be undone.
            </p>
            <div class="modal-actions">
              <button class="modal-btn modal-btn--cancel" @click="confirmDeleteId = null">
                Cancel
              </button>
              <button class="modal-btn modal-btn--delete" @click="confirmDelete">
                Delete
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.trips-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 40px 20px 60px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* ── Header ── */
.trips-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.trips-title {
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--text-primary);
}

.trips-sub {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 4px;
}

.btn-new-trip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 20px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--transition), box-shadow var(--transition);
  white-space: nowrap;
}

.btn-new-trip:hover {
  background: var(--accent-hover);
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
}

.btn-new-trip--large {
  padding: 12px 28px;
  font-size: 0.95rem;
}

/* ── Loading skeleton ── */
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.skeleton-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-bar {
  height: 12px;
  border-radius: 6px;
  background: var(--bg-card-hover);
  animation: shimmer 1.4s ease-in-out infinite;
}

.skeleton-bar--wide { width: 75%; }
.skeleton-bar--narrow { width: 45%; }
.skeleton-bar--mid { width: 60%; }

@keyframes shimmer {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* ── Empty state ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 80px 20px;
  text-align: center;
}

.empty-globe { font-size: 3.5rem; }

.empty-title {
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.empty-sub {
  font-size: 0.9rem;
  color: var(--text-muted);
  max-width: 360px;
  line-height: 1.6;
}

/* ── Trip grid ── */
.trips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 20px;
}

.trip-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform var(--transition), box-shadow var(--transition);
}

.trip-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

/* Hero gradient */
.trip-card__hero {
  height: 130px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
  position: relative;
  display: flex;
  align-items: flex-end;
  padding: 16px;
  overflow: hidden;
}

.trip-card__scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 100%);
}

.trip-card__emoji {
  position: absolute;
  top: 14px;
  right: 16px;
  font-size: 2.4rem;
  opacity: 0.35;
  pointer-events: none;
}

.trip-card {
  cursor: pointer;
}

.trip-card__overlay {
  position: relative;
  z-index: 1;
}

.trip-card__name {
  font-size: 1.05rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.01em;
  line-height: 1.2;
}

.trip-card__dest {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.75);
  margin-top: 2px;
}

/* Body */
.trip-card__body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.trip-card__stats {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.78rem;
  color: var(--text-muted);
  font-weight: 600;
}

.trip-card__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
}

.btn-delete {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border: 1px solid var(--border);
  background: transparent;
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  transition: background var(--transition), color var(--transition), border-color var(--transition);
}

.btn-delete:hover:not(:disabled) {
  background: var(--danger-bg);
  color: var(--danger);
  border-color: rgba(239, 68, 68, 0.3);
}

.btn-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 600px) {
  .trips-grid { grid-template-columns: 1fr; }
}

/* ── Delete modal ── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
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
  box-shadow: 0 24px 64px rgba(0,0,0,0.4);
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
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border);
}

.modal-btn--cancel:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}

.modal-btn--delete {
  background: var(--danger-bg);
  color: var(--danger);
  border: 1px solid rgba(239,68,68,0.3);
}

.modal-btn--delete:hover {
  background: rgba(239,68,68,0.2);
  border-color: var(--danger);
}

.fade-enter-active, .fade-leave-active { transition: opacity 200ms ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
