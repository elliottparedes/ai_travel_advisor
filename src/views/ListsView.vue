<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useListStore } from "../stores/listStore";
import { useAuthStore } from "../stores/authStore";
import { LIST_TEMPLATES, LIST_EMOJIS } from "../types/lists";
import type { ListItem } from "../types/lists";
import type { DiscoveryCard, PlaceDetails } from "../types/trips";
import ListCard from "../components/list/ListCard.vue";
import PlaceDetailPanel from "../components/trip/PlaceDetailPanel.vue";
import * as tripsApi from "../api/tripsApi";

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
const newName = ref("");
const newEmoji = ref("⭐");
const isCreating = ref(false);

function openNewModal() {
  newName.value = "";
  newEmoji.value = "⭐";
  showNewModal.value = true;
}

function pickTemplate(t: { emoji: string; name: string }) {
  newEmoji.value = t.emoji;
  newName.value = t.name;
}

async function createList() {
  if (!newName.value.trim()) return;
  isCreating.value = true;
  try {
    await listStore.createList(auth.sessionToken!, newName.value.trim(), newEmoji.value);
    showNewModal.value = false;
  } finally {
    isCreating.value = false;
  }
}

// ── Remove item ───────────────────────────────────────────────────────────────
async function removeItem(listId: string, item: ListItem) {
  await listStore.removeItem(auth.sessionToken!, listId, item.fsqId, item.title);
}

// ── Place detail panel ────────────────────────────────────────────────────────
const selectedItem = ref<ListItem | null>(null);
const selectedItemDetails = ref<PlaceDetails | null>(null);
const isLoadingItemDetails = ref(false);

function listItemToCard(item: ListItem): DiscoveryCard {
  return {
    id: item.fsqId ?? item.title,
    fsqId: item.fsqId,
    type: item.type as any,
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
  selectedItemDetails.value = null;
  if (item.fsqId) {
    isLoadingItemDetails.value = true;
    try {
      selectedItemDetails.value = await tripsApi.getPlaceDetails(item.fsqId);
    } catch {
      // ignore
    } finally {
      isLoadingItemDetails.value = false;
    }
  }
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
      <button v-if="!listStore.isLoading" class="btn-new-list" @click="openNewModal">
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
      <button class="btn-new-list btn-new-list--large" @click="openNewModal">
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
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showNewModal" class="modal-backdrop" @click.self="showNewModal = false">
          <div class="modal">
            <button class="modal-close" @click="showNewModal = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            <div class="modal-header">
              <h2 class="modal-title">New list</h2>
            </div>

            <p class="form-label">Quick pick</p>
            <div class="templates">
              <button
                v-for="t in LIST_TEMPLATES"
                :key="t.name"
                class="template-btn"
                :class="{ 'template-btn--active': newEmoji === t.emoji && newName === t.name }"
                @click="pickTemplate(t)"
              >
                {{ t.emoji }} {{ t.name }}
              </button>
            </div>

            <p class="form-label" style="margin-top:12px;">Emoji</p>
            <div class="emoji-grid">
              <button
                v-for="e in LIST_EMOJIS"
                :key="e"
                class="emoji-btn"
                :class="{ 'emoji-btn--active': newEmoji === e }"
                @click="newEmoji = e"
              >{{ e }}</button>
            </div>

            <p class="form-label" style="margin-top:12px;">Name</p>
            <input
              v-model="newName"
              class="name-input"
              type="text"
              placeholder="List name…"
              maxlength="40"
              @keydown.enter="createList"
            />

            <div class="modal-actions">
              <button class="modal-btn modal-btn--cancel" @click="showNewModal = false">Cancel</button>
              <button
                class="modal-btn modal-btn--create"
                :disabled="!newName.trim() || isCreating"
                @click="createList"
              >
                {{ isCreating ? 'Creating…' : 'Create list' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Delete confirmation -->
      <Transition name="fade">
        <div v-if="confirmDeleteId" class="modal-backdrop" @click.self="confirmDeleteId = null">
          <div class="modal">
            <div class="modal-icon">🗑️</div>
            <h3 class="modal-title">Delete list?</h3>
            <p class="modal-body">
              This will permanently delete
              <strong>{{ listStore.lists.find(l => l.id === confirmDeleteId)?.emoji }} {{ listStore.lists.find(l => l.id === confirmDeleteId)?.name }}</strong>
              and all {{ listStore.lists.find(l => l.id === confirmDeleteId)?.items.length }} saved places.
            </p>
            <div class="modal-actions">
              <button class="modal-btn modal-btn--cancel" @click="confirmDeleteId = null">Cancel</button>
              <button class="modal-btn modal-btn--delete" @click="confirmDelete">Delete</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
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

/* ── Modal ── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
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
  padding: 28px 24px 24px;
  max-width: 400px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4);
  position: relative;
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: var(--bg-input);
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-header { margin-bottom: 4px; }

.modal-icon { font-size: 2rem; text-align: center; }

.modal-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.01em;
  text-align: center;
}

.modal-body {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.6;
  text-align: center;
}

.form-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
}

.templates {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.template-btn {
  padding: 5px 12px;
  border: 1px solid var(--border);
  background: var(--bg-input);
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: border-color var(--transition), color var(--transition), background var(--transition);
}

.template-btn--active,
.template-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-dim);
}

.emoji-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.emoji-btn {
  width: 34px;
  height: 34px;
  border: 1.5px solid var(--border);
  background: var(--bg-input);
  border-radius: var(--radius-sm);
  font-size: 1.05rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color var(--transition);
}

.emoji-btn--active { border-color: var(--accent); background: var(--accent-dim); }
.emoji-btn:hover { border-color: var(--accent); }

.name-input {
  width: 100%;
  padding: 10px 13px;
  border: 1.5px solid var(--border);
  background: var(--bg-input);
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  color: var(--text-primary);
  outline: none;
  box-sizing: border-box;
  transition: border-color var(--transition);
}

.name-input:focus { border-color: var(--border-focus); }
.name-input::placeholder { color: var(--text-muted); }

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
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

.modal-btn--cancel:hover { background: var(--bg-card-hover); }

.modal-btn--create {
  background: var(--accent);
  color: #fff;
  border: none;
}

.modal-btn--create:hover:not(:disabled) { background: var(--accent-hover); }
.modal-btn--create:disabled { opacity: 0.5; cursor: not-allowed; }

.modal-btn--delete {
  background: var(--danger-bg);
  color: var(--danger);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.modal-btn--delete:hover { background: rgba(239, 68, 68, 0.2); border-color: var(--danger); }

.fade-enter-active, .fade-leave-active { transition: opacity 200ms ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
