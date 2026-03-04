<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { Review } from "../../types/trips";
import * as reviewsApi from "../../api/reviewsApi";
import { useAuthStore } from "../../stores/authStore";

const props = defineProps<{
  fsqId: string;
  placeTitle: string;
  placeType: string;
  city: string;
  country: string;
}>();

const auth = useAuthStore();

// ── State ─────────────────────────────────────────────────────────────────────
const reviews = ref<Review[]>([]);
const userReview = ref<Review | null>(null);
const showReviewForm = ref(false);
const reviewVibe = ref(5);
const reviewText = ref("");
const isSavingReview = ref(false);

const avgVibe = computed(() => {
  if (!reviews.value.length) return null;
  const sum = reviews.value.reduce((acc, r) => acc + r.vibe, 0);
  return (sum / reviews.value.length).toFixed(1);
});

// ── Load reviews on fsqId change ──────────────────────────────────────────────
watch(() => props.fsqId, async (fsqId) => {
  reviews.value = [];
  userReview.value = null;
  showReviewForm.value = false;
  reviewVibe.value = 5;
  reviewText.value = "";

  const [all, mine] = await Promise.all([
    reviewsApi.getPlaceReviews(fsqId).catch(() => [] as Review[]),
    auth.sessionToken
      ? reviewsApi.getUserReviewForPlace(auth.sessionToken, fsqId).catch(() => null)
      : Promise.resolve(null),
  ]);
  reviews.value = all;
  userReview.value = mine;
  if (mine) {
    reviewVibe.value = mine.vibe;
    reviewText.value = mine.text;
  }
}, { immediate: true });

// ── Actions ───────────────────────────────────────────────────────────────────
async function submitReview() {
  if (!auth.sessionToken || !reviewText.value.trim()) return;
  isSavingReview.value = true;
  try {
    await reviewsApi.writeReview({
      token: auth.sessionToken,
      fsqId: props.fsqId,
      placeTitle: props.placeTitle,
      city: props.city,
      country: props.country,
      placeType: props.placeType,
      vibe: reviewVibe.value,
      text: reviewText.value.trim(),
    });
    const [all, mine] = await Promise.all([
      reviewsApi.getPlaceReviews(props.fsqId).catch(() => [] as Review[]),
      reviewsApi.getUserReviewForPlace(auth.sessionToken, props.fsqId).catch(() => null),
    ]);
    reviews.value = all;
    userReview.value = mine;
    showReviewForm.value = false;
  } finally {
    isSavingReview.value = false;
  }
}

async function voteHelpful(reviewId: string) {
  if (!auth.sessionToken) return;
  await reviewsApi.voteHelpful(auth.sessionToken, reviewId);
  reviews.value = await reviewsApi.getPlaceReviews(props.fsqId).catch(() => [] as Review[]);
}

async function deleteReview(reviewId: string) {
  if (!auth.sessionToken) return;
  await reviewsApi.deleteReview(auth.sessionToken, reviewId);
  const [all, mine] = await Promise.all([
    reviewsApi.getPlaceReviews(props.fsqId).catch(() => [] as Review[]),
    reviewsApi.getUserReviewForPlace(auth.sessionToken, props.fsqId).catch(() => null),
  ]);
  reviews.value = all;
  userReview.value = mine;
  showReviewForm.value = false;
}

function formatReviewDate(ts: number): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(ts));
}
</script>

<template>
  <div class="reviews-section">
    <div class="reviews-header">
      <span class="reviews-label">Reviews</span>
      <span v-if="avgVibe" class="avg-vibe">★ {{ avgVibe }}</span>
      <button class="write-review-btn" @click="showReviewForm = !showReviewForm">
        {{ userReview ? 'Edit review' : '+ Write review' }}
      </button>
    </div>

    <!-- Review form -->
    <div v-if="showReviewForm" class="review-form">
      <div class="vibe-picker">
        <span class="vibe-label">Vibe</span>
        <span
          v-for="i in 5"
          :key="i"
          class="vibe-star"
          :class="{ 'vibe-star--active': i <= reviewVibe }"
          @click="reviewVibe = i"
        >★</span>
      </div>
      <textarea
        v-model="reviewText"
        class="review-textarea"
        placeholder="Share your experience…"
        rows="3"
      />
      <div class="review-form-actions">
        <button class="review-btn review-btn--cancel" @click="showReviewForm = false">Cancel</button>
        <button
          v-if="userReview"
          class="review-btn review-btn--delete"
          @click="deleteReview(userReview._id)"
        >Delete</button>
        <button
          class="review-btn review-btn--submit"
          :disabled="!reviewText.trim() || isSavingReview"
          @click="submitReview"
        >{{ isSavingReview ? 'Saving…' : 'Submit' }}</button>
      </div>
    </div>

    <!-- Review list -->
    <div v-if="reviews.length === 0 && !showReviewForm" class="reviews-empty">
      No reviews yet. Be the first!
    </div>
    <div v-for="r in reviews" :key="r._id" class="review-item">
      <div class="review-meta">
        <span class="reviewer-name">{{ r.displayName }}</span>
        <span class="review-vibe">{{ '★'.repeat(Math.round(r.vibe)) }}</span>
        <span class="review-date">{{ formatReviewDate(r.createdAt) }}</span>
      </div>
      <p class="review-text">{{ r.text }}</p>
      <button class="helpful-btn" @click="voteHelpful(r._id)">
        👍 {{ r.helpfulCount }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.reviews-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-top: 1px solid var(--border);
  padding-top: 12px;
}

.reviews-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.reviews-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  flex: 1;
}

.avg-vibe {
  font-size: 0.8rem;
  font-weight: 700;
  color: #f59e0b;
}

.write-review-btn {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-dim);
  border: none;
  border-radius: 999px;
  padding: 4px 10px;
  cursor: pointer;
  transition: background var(--transition);
}

.write-review-btn:hover { background: rgba(99,102,241,0.2); }

.reviews-empty {
  font-size: 0.78rem;
  color: var(--text-muted);
  text-align: center;
  padding: 8px 0;
}

/* Review form */
.review-form {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.vibe-picker {
  display: flex;
  align-items: center;
  gap: 6px;
}

.vibe-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.vibe-star {
  font-size: 1.2rem;
  cursor: pointer;
  color: var(--border);
  transition: color var(--transition);
}

.vibe-star--active { color: #f59e0b; }
.vibe-star:hover { color: #f59e0b; }

.review-textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1.5px solid var(--border);
  background: var(--bg-card);
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  color: var(--text-primary);
  outline: none;
  resize: vertical;
  box-sizing: border-box;
  font-family: inherit;
  line-height: 1.5;
  transition: border-color var(--transition);
}

.review-textarea:focus { border-color: var(--border-focus); }
.review-textarea::placeholder { color: var(--text-muted); }

.review-form-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

.review-btn {
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--transition);
}

.review-btn--cancel {
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border);
}

.review-btn--cancel:hover { background: var(--bg-card-hover); }

.review-btn--delete {
  background: var(--danger-bg);
  color: var(--danger);
  border: 1px solid rgba(239,68,68,0.3);
}

.review-btn--submit {
  background: var(--accent);
  color: #fff;
  border: none;
}

.review-btn--submit:hover:not(:disabled) { background: var(--accent-hover); }
.review-btn--submit:disabled { opacity: 0.5; cursor: not-allowed; }

/* Review items */
.review-item {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.review-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.reviewer-name {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-primary);
}

.review-vibe {
  font-size: 0.72rem;
  color: #f59e0b;
  letter-spacing: -0.02em;
}

.review-date {
  font-size: 0.68rem;
  color: var(--text-muted);
  margin-left: auto;
}

.review-text {
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.helpful-btn {
  align-self: flex-start;
  padding: 3px 9px;
  border: 1px solid var(--border);
  background: transparent;
  border-radius: 999px;
  font-size: 0.7rem;
  color: var(--text-muted);
  cursor: pointer;
  transition: background var(--transition), color var(--transition);
}

.helpful-btn:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}
</style>
