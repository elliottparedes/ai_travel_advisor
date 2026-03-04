<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useListStore } from "../stores/listStore";
import { useAuthStore } from "../stores/authStore";
import type { ListItem } from "../types/lists";
import type { DiscoveryCard } from "../types/trips";
import { usePlaceDetail } from "../composables/usePlaceDetail";
import ListCard from "../components/list/ListCard.vue";
import PlaceDetailPanel from "../components/trip/PlaceDetailPanel.vue";
import ConfirmModal from "../components/common/ConfirmModal.vue";
import NewListModal from "../components/list/NewListModal.vue";

const listStore = useListStore();
const auth = useAuthStore();

onMounted(async () => {
  await listStore.load(auth.sessionToken!);
});

// ── Expanded state ────────────────────────────────────────────────────────────
const expandedId = ref<string | null>(null);

function toggleExpanded(id: string) {
  expandedId.value = expandedId.value === id ? null : id;
}

// ── New list modal ────────────────────────────────────────────────────────────
const showNewModal = ref(false);

// ── Remove item ───────────────────────────────────────────────────────────────
async function removeItem(listId: string, item: ListItem) {
  await listStore.removeItem(auth.sessionToken!, listId, item.fsqId, item.title);
}

// ── Place detail panel ────────────────────────────────────────────────────────
const selectedItem = ref<ListItem | null>(null);
const { placeDetails: selectedItemDetails, isLoadingDetails: isLoadingItemDetails, openCard } = usePlaceDetail();

function listItemToCard(item: ListItem): DiscoveryCard {
  return {
    id: item.fsqId ?? item.title,
    fsqId: item.fsqId,
    type: item.type as DiscoveryCard["type"],
    title: item.title,
    description: "",
    tags: [],
    rating: item.rating,
    priceRange: item.priceRange,
    neighborhood: item.neighborhood,
    image: item.image,
    imageFallbacks: item.imageFallbacks,
    lat: item.lat,
    lng: item.lng,
  };
}

async function openItem(item: ListItem) {
  selectedItem.value = item;
  await openCard(listItemToCard(item));
}

// ── Delete list ───────────────────────────────────────────────────────────────
const confirmDeleteId = ref<string | null>(null);

async function confirmDelete() {
  if (!confirmDeleteId.value) return;
  await listStore.deleteList(auth.sessionToken!, confirmDeleteId.value);
  if (expandedId.value === confirmDeleteId.value) expandedId.value = null;
  confirmDeleteId.value = null;
}
</script>

<template>
  <div class="lists-page">
    <!-- Header -->
    <div class="lists-header">
      <div>
        <h1 class="lists-title">My Lists</h1>
        <p class="lists-sub">Saved places across your travels</p>
      </div>
      <button v-if="!listStore.isLoading" class="btn-new-list" @click="showNewModal = true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        New list
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="listStore.isLoading" class="skeleton-grid">
      <div v-for="n in 3" :key="n" class="skeleton-card">
        <div class="skeleton-bar skeleton-bar--wide" />
        <div class="skeleton-bar skeleton-bar--narrow" />
        <div class="skeleton-bar skeleton-bar--mid" />
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="listStore.lists.length === 0" class="empty-state">
      <div class="empty-icon">🔖</div>
      <h2 class="empty-title">No lists yet</h2>
      <p class="empty-sub">
        Create a list to save places you love — restaurants, landmarks, hotels and more.
        When exploring a city in the trip wizard, save any place directly to a list.
      </p>
      <button class="btn-new-list btn-new-list--large" @click="showNewModal = true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Create your first list
      </button>
    </div>

    <!-- Lists grid -->
    <div v-else class="lists-grid">
      <ListCard
        v-for="list in listStore.lists"
        :key="list.id"
        :list="list"
        :expanded="expandedId === list.id"
        @toggle="toggleExpanded(list.id)"
        @remove-item="(listId, item) => removeItem(listId, item)"
        @delete-list="(listId) => (confirmDeleteId = listId)"
        @select-item="(_listId, item) => openItem(item)"
      />
    </div>

    <!-- Place detail panel -->
    <PlaceDetailPanel
      v-if="selectedItem"
      :card="listItemToCard(selectedItem)"
      :details="selectedItemDetails"
      :is-loading="isLoadingItemDetails"
      :pinned="false"
      :city="selectedItem.city"
      :country="selectedItem.country"
      @close="selectedItem = null"
      @toggle-pin="() => {}"
    />

    <!-- New list modal -->
    <NewListModal
      v-if="showNewModal"
      @created="showNewModal = false"
      @cancel="showNewModal = false"
    />

    <!-- Delete confirmation -->
    <ConfirmModal
      v-if="confirmDeleteId"
      title="Delete list?"
      confirm-label="Delete"
      @confirm="confirmDelete"
      @cancel="confirmDeleteId = null"
    >
      This will permanently delete
      <strong>{{ listStore.lists.find(l => l.id === confirmDeleteId)?.emoji }} {{ listStore.lists.find(l => l.id === confirmDeleteId)?.name }}</strong>
      and all {{ listStore.lists.find(l => l.id === confirmDeleteId)?.items.length }} saved places.
    </ConfirmModal>
  </div>
</template>

<style scoped>
.lists-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 40px 20px 60px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* ── Header ── */
.lists-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.lists-title {
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--text-primary);
}

.lists-sub {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 4px;
}

.btn-new-list {
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

.btn-new-list:hover {
  background: var(--accent-hover);
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
}

.btn-new-list--large {
  padding: 12px 28px;
  font-size: 0.95rem;
}

/* ── Skeleton ── */
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
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

.empty-icon { font-size: 3.5rem; }

.empty-title {
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.empty-sub {
  font-size: 0.9rem;
  color: var(--text-muted);
  max-width: 400px;
  line-height: 1.6;
}

/* ── Lists grid ── */
.lists-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 20px;
  align-items: start;
}
</style>
