<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useAuthStore } from "../stores/authStore";
import * as reviewsApi from "../api/reviewsApi";
import type { UserReviewSummary } from "../api/reviewsApi";
import CityLeaderboard from "../components/trip/CityLeaderboard.vue";

const auth = useAuthStore();
const activeTab = ref<"mine" | "leaderboard">("mine");

// ── My Reviews ────────────────────────────────────────────────────────────────
const myReviews = ref<UserReviewSummary[]>([]);
const isLoading = ref(false);

async function loadMyReviews() {
  if (!auth.sessionToken) return;
  isLoading.value = true;
  try {
    myReviews.value = await reviewsApi.getUserReviews(auth.sessionToken);
  } catch {
    // ignore
  } finally {
    isLoading.value = false;
  }
}

async function handleDelete(id: string) {
  if (!auth.sessionToken) return;
  await reviewsApi.deleteReview(auth.sessionToken, id);
  myReviews.value = myReviews.value.filter((r) => r._id !== id);
}

onMounted(loadMyReviews);

// ── Leaderboard ───────────────────────────────────────────────────────────────
const cityInput = ref("");
const cityQuery = ref("");
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function onCityInput(e: Event) {
  const val = (e.target as HTMLInputElement).value;
  cityInput.value = val;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    cityQuery.value = val.trim();
  }, 400);
}

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(ts));
}
</script>

<template>
  <div class="reviews-page">
    <!-- Header -->
    <div class="reviews-header">
      <div>
        <h1 class="reviews-title">Reviews</h1>
        <p class="reviews-sub">Places you've explored</p>
      </div>
    </div>

    <!-- Tab bar -->
    <div class="tab-bar">
      <button
        class="tab-btn"
        :class="{ 'tab-btn--active': activeTab === 'mine' }"
        @click="activeTab = 'mine'"
      >
        My Reviews
      </button>
      <button
        class="tab-btn"
        :class="{ 'tab-btn--active': activeTab === 'leaderboard' }"
        @click="activeTab = 'leaderboard'"
      >
        Leaderboard
      </button>
    </div>

    <!-- My Reviews tab -->
    <div v-if="activeTab === 'mine'">
      <!-- Loading skeleton -->
      <div v-if="isLoading" class="skeleton-list">
        <div v-for="n in 4" :key="n" class="skeleton-review">
          <div class="skel-bar skel-bar--title" />
          <div class="skel-bar skel-bar--sub" />
          <div class="skel-bar skel-bar--body" />
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="myReviews.length === 0" class="empty-state">
        <div class="empty-icon">✍️</div>
        <h2 class="empty-title">No reviews yet</h2>
        <p class="empty-sub">
          Explore a city in the trip wizard and leave a review on any place.
        </p>
      </div>

      <!-- Review list -->
      <div v-else class="review-list">
        <div v-for="r in myReviews" :key="r._id" class="review-card">
          <div class="review-card__top">
            <div class="review-card__meta">
              <span class="place-title">{{ r.placeTitle }}</span>
              <span class="place-location">{{ r.city }}, {{ r.country }}</span>
            </div>
            <div class="review-card__badges">
              <span class="type-badge">{{ r.placeType }}</span>
            </div>
          </div>

          <div class="review-card__vibe">
            <span
              v-for="i in 5"
              :key="i"
              class="vibe-star"
              :class="{ 'vibe-star--active': i <= Math.round(r.vibe) }"
            >★</span>
            <span class="review-date">{{ formatDate(r.createdAt) }}</span>
          </div>

          <p class="review-text">{{ r.text }}</p>

          <div class="review-card__footer">
            <span class="helpful-count">👍 {{ r.helpfulCount }}</span>
            <button class="btn-delete" @click="handleDelete(r._id)">Delete</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Leaderboard tab -->
    <div v-else class="leaderboard-tab">
      <div class="city-search">
        <svg class="city-search__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          :value="cityInput"
          class="city-input"
          type="text"
          placeholder="Enter a city to explore reviewers…"
          @input="onCityInput"
        />
      </div>
      <CityLeaderboard v-if="cityQuery" :city="cityQuery" />
      <div v-else class="leaderboard-hint">
        Type a city name above to see the top reviewers.
      </div>
    </div>
  </div>
</template>

<style scoped>
.reviews-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 40px 20px 60px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* ── Header ── */
.reviews-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.reviews-title {
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--text-primary);
}

.reviews-sub {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 4px;
}

/* ── Tabs ── */
.tab-bar {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0;
}

.tab-btn {
  padding: 9px 20px;
  border: none;
  background: transparent;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  position: relative;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  transition: color var(--transition), background var(--transition);
}

.tab-btn:hover { color: var(--text-primary); background: var(--bg-card-hover); }

.tab-btn--active {
  color: var(--accent);
  background: var(--accent-dim);
}

/* ── Skeleton ── */
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.skeleton-review {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skel-bar {
  height: 12px;
  border-radius: 6px;
  background: var(--bg-card-hover);
  animation: shimmer 1.4s ease-in-out infinite;
}

.skel-bar--title { width: 55%; }
.skel-bar--sub { width: 35%; }
.skel-bar--body { width: 90%; }

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

.empty-icon { font-size: 3rem; }

.empty-title {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--text-primary);
}

.empty-sub {
  font-size: 0.875rem;
  color: var(--text-muted);
  max-width: 360px;
  line-height: 1.6;
}

/* ── Review list ── */
.review-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.review-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color var(--transition);
}

.review-card:hover { border-color: rgba(99,102,241,0.3); }

.review-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.review-card__meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.place-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.place-location {
  font-size: 0.78rem;
  color: var(--text-muted);
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
}

.review-card__vibe {
  display: flex;
  align-items: center;
  gap: 2px;
}

.vibe-star {
  font-size: 1rem;
  color: var(--border);
}

.vibe-star--active { color: #f59e0b; }

.review-date {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin-left: 10px;
}

.review-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.55;
}

.review-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.helpful-count {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.btn-delete {
  padding: 4px 12px;
  border: 1px solid var(--border);
  background: transparent;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  transition: background var(--transition), color var(--transition), border-color var(--transition);
}

.btn-delete:hover {
  background: var(--danger-bg);
  color: var(--danger);
  border-color: rgba(239, 68, 68, 0.3);
}

/* ── Leaderboard tab ── */
.leaderboard-tab {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.city-search {
  position: relative;
}

.city-search__icon {
  position: absolute;
  left: 13px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.city-input {
  width: 100%;
  padding: 11px 14px 11px 40px;
  border: 1.5px solid var(--border);
  background: var(--bg-input);
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  color: var(--text-primary);
  outline: none;
  box-sizing: border-box;
  transition: border-color var(--transition);
}

.city-input:focus { border-color: var(--border-focus); }
.city-input::placeholder { color: var(--text-muted); }

.leaderboard-hint {
  text-align: center;
  padding: 40px 20px;
  font-size: 0.875rem;
  color: var(--text-muted);
}
</style>
