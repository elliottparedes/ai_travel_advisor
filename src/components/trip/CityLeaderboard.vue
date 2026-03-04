<script setup lang="ts">
import { ref, watch } from "vue";
import * as reviewsApi from "../../api/reviewsApi";

const props = defineProps<{ city: string }>();

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  totalHelpful: number;
  reviewCount: number;
}

const entries = ref<LeaderboardEntry[]>([]);
const isLoading = ref(false);

watch(() => props.city, async (city) => {
  if (!city) return;
  isLoading.value = true;
  try {
    entries.value = await reviewsApi.getCityLeaderboard(city);
  } catch {
    entries.value = [];
  } finally {
    isLoading.value = false;
  }
}, { immediate: true });

const rankColors = ["#f59e0b", "#94a3b8", "#cd7c2f"];

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
</script>

<template>
  <div class="leaderboard">
    <div class="lb-header">
      <span class="lb-title">🏆 Top reviewers in {{ city }}</span>
    </div>

    <div v-if="isLoading" class="lb-loading">
      <div class="spinner" />
      <span>Loading…</span>
    </div>

    <div v-else-if="entries.length === 0" class="lb-empty">
      No reviews yet for {{ city }}. Be the first!
    </div>

    <div v-else class="lb-list">
      <div
        v-for="(entry, idx) in entries"
        :key="entry.userId"
        class="lb-row"
        :class="{ 'lb-row--podium': idx < 3 }"
      >
        <!-- Rank -->
        <span class="lb-rank" :style="idx < 3 ? { color: rankColors[idx] } : {}">
          {{ idx + 1 }}
        </span>

        <!-- Avatar chip -->
        <span class="lb-avatar" :style="idx < 3 ? { background: rankColors[idx] } : {}">
          {{ initials(entry.displayName) }}
        </span>

        <!-- Name + stats -->
        <div class="lb-info">
          <span class="lb-name">{{ entry.displayName }}</span>
          <span class="lb-stats">{{ entry.reviewCount }} review{{ entry.reviewCount !== 1 ? 's' : '' }} · {{ entry.totalHelpful }} helpful</span>
        </div>

        <!-- Helpful count badge -->
        <span class="lb-helpful">👍 {{ entry.totalHelpful }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.leaderboard {
  background: var(--bg-card);
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.lb-header {
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--border);
}

.lb-title {
  font-size: 0.875rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.lb-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 24px 20px;
  font-size: 0.82rem;
  color: var(--text-muted);
}

.lb-empty {
  padding: 24px 20px;
  font-size: 0.82rem;
  color: var(--text-muted);
  text-align: center;
}

.lb-list {
  display: flex;
  flex-direction: column;
}

.lb-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  transition: background var(--transition);
}

.lb-row:hover { background: var(--bg-input); }

.lb-row--podium { background: var(--bg-input); }

.lb-rank {
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--text-muted);
  width: 18px;
  text-align: center;
  flex-shrink: 0;
}

.lb-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}

.lb-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.lb-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lb-stats {
  font-size: 0.68rem;
  color: var(--text-muted);
}

.lb-helpful {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  flex-shrink: 0;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
