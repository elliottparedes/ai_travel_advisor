<script setup lang="ts">
import { ref, computed } from "vue";
import { useListStore } from "../../stores/listStore";
import { useAuthStore } from "../../stores/authStore";
import { LIST_TEMPLATES, LIST_EMOJIS } from "../../types/lists";
import type { DiscoveryCard } from "../../types/trips";

const props = defineProps<{
  card: DiscoveryCard;
  city: string;
  country: string;
}>();

const emit = defineEmits<{ close: [] }>();

const listStore = useListStore();
const auth = useAuthStore();

// Which lists are selected
const selected = ref(new Set<string>());

function toggleList(id: string) {
  if (selected.value.has(id)) {
    selected.value.delete(id);
  } else {
    selected.value.add(id);
  }
  selected.value = new Set(selected.value);
}

// Check if card is already in a list
function isInList(listId: string): boolean {
  const list = listStore.lists.find((l) => l.id === listId);
  if (!list) return false;
  return list.items.some((i) =>
    props.card.fsqId ? i.fsqId === props.card.fsqId : i.title === props.card.title,
  );
}

// ── Inline new list form ───────────────────────────────────────────────────────
const showNewForm = ref(false);
const newName = ref("");
const newEmoji = ref("⭐");
const isCreating = ref(false);

function pickTemplate(t: { emoji: string; name: string }) {
  newEmoji.value = t.emoji;
  newName.value = t.name;
}

async function createAndSelect() {
  if (!newName.value.trim()) return;
  isCreating.value = true;
  try {
    const id = await listStore.createList(auth.sessionToken!, newName.value.trim(), newEmoji.value);
    selected.value.add(id);
    selected.value = new Set(selected.value);
    newName.value = "";
    showNewForm.value = false;
  } finally {
    isCreating.value = false;
  }
}

// ── Confirm ───────────────────────────────────────────────────────────────────
const isSaving = ref(false);

async function confirm() {
  if (selected.value.size === 0) { emit("close"); return; }
  isSaving.value = true;
  try {
    await Promise.all(
      [...selected.value].map((listId) =>
        listStore.addItem(auth.sessionToken!, listId, props.card, props.city, props.country),
      ),
    );
    emit("close");
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="emit('close')">
      <div class="modal">
        <button class="modal-close" @click="emit('close')" aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div class="modal-header">
          <span class="modal-icon">🔖</span>
          <h2 class="modal-title">Save to a list</h2>
          <p class="modal-sub">{{ card.title }}</p>
        </div>

        <!-- Existing lists -->
        <div class="lists-scroll">
          <div
            v-for="list in listStore.lists"
            :key="list.id"
            class="list-row"
            :class="{ 'list-row--selected': selected.has(list.id) || isInList(list.id) }"
            @click="!isInList(list.id) && toggleList(list.id)"
          >
            <span class="list-row__emoji">{{ list.emoji }}</span>
            <div class="list-row__info">
              <span class="list-row__name">{{ list.name }}</span>
              <span class="list-row__count">{{ list.items.length }} places</span>
            </div>
            <svg
              v-if="selected.has(list.id) || isInList(list.id)"
              class="list-row__check"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span v-if="isInList(list.id)" class="list-row__already">Already saved</span>
          </div>

          <div v-if="listStore.lists.length === 0 && !showNewForm" class="lists-empty">
            No lists yet — create one below.
          </div>
        </div>

        <!-- New list form toggle -->
        <button v-if="!showNewForm" class="btn-new-list" @click="showNewForm = true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New list
        </button>

        <!-- New list inline form -->
        <div v-if="showNewForm" class="new-list-form">
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

          <p class="form-label" style="margin-top: 10px;">Emoji</p>
          <div class="emoji-grid">
            <button
              v-for="e in LIST_EMOJIS"
              :key="e"
              class="emoji-btn"
              :class="{ 'emoji-btn--active': newEmoji === e }"
              @click="newEmoji = e"
            >{{ e }}</button>
          </div>

          <input
            v-model="newName"
            class="name-input"
            type="text"
            placeholder="List name…"
            maxlength="40"
            @keydown.enter="createAndSelect"
          />
          <div class="form-actions">
            <button class="form-btn form-btn--cancel" @click="showNewForm = false">Cancel</button>
            <button
              class="form-btn form-btn--create"
              :disabled="!newName.trim() || isCreating"
              @click="createAndSelect"
            >
              {{ isCreating ? 'Creating…' : 'Create & select' }}
            </button>
          </div>
        </div>

        <!-- Confirm -->
        <button
          class="btn-confirm"
          :disabled="isSaving"
          @click="confirm"
        >
          {{ isSaving ? 'Saving…' : selected.size > 0 ? `Save to ${selected.size} list${selected.size > 1 ? 's' : ''}` : 'Done' }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 400;
  padding: 20px;
}

.modal {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 380px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
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
  transition: background var(--transition);
}

.modal-close:hover { background: var(--bg-card-hover); }

.modal-header { text-align: center; }

.modal-icon { font-size: 1.6rem; }

.modal-title {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-primary);
  margin-top: 6px;
}

.modal-sub {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 3px;
}

/* ── Lists ── */
.lists-scroll {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 220px;
  overflow-y: auto;
}

.list-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: border-color var(--transition), background var(--transition);
}

.list-row:hover { background: var(--bg-input); }

.list-row--selected {
  border-color: var(--accent);
  background: var(--accent-dim);
}

.list-row__emoji { font-size: 1.1rem; flex-shrink: 0; }

.list-row__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.list-row__name {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text-primary);
}

.list-row__count {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.list-row__check { color: var(--accent); flex-shrink: 0; }

.list-row__already {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--text-muted);
  white-space: nowrap;
}

.lists-empty {
  font-size: 0.82rem;
  color: var(--text-muted);
  text-align: center;
  padding: 16px 0;
}

/* ── New list ── */
.btn-new-list {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1.5px dashed var(--border);
  background: transparent;
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  width: 100%;
  justify-content: center;
  transition: border-color var(--transition), color var(--transition);
}

.btn-new-list:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.new-list-form {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--bg-input);
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
  gap: 5px;
}

.template-btn {
  padding: 4px 10px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  border-radius: 999px;
  font-size: 0.75rem;
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
  gap: 4px;
}

.emoji-btn {
  width: 32px;
  height: 32px;
  border: 1.5px solid var(--border);
  background: var(--bg-card);
  border-radius: var(--radius-sm);
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color var(--transition);
}

.emoji-btn--active { border-color: var(--accent); }
.emoji-btn:hover { border-color: var(--accent); }

.name-input {
  width: 100%;
  padding: 9px 12px;
  border: 1.5px solid var(--border);
  background: var(--bg-card);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  color: var(--text-primary);
  outline: none;
  box-sizing: border-box;
  transition: border-color var(--transition);
}

.name-input:focus { border-color: var(--border-focus); }
.name-input::placeholder { color: var(--text-muted); }

.form-actions {
  display: flex;
  gap: 8px;
}

.form-btn {
  flex: 1;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--transition);
}

.form-btn--cancel {
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border);
}

.form-btn--cancel:hover { background: var(--bg-card-hover); }

.form-btn--create {
  background: var(--accent);
  color: #fff;
  border: none;
}

.form-btn--create:hover:not(:disabled) { background: var(--accent-hover); }
.form-btn--create:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Confirm ── */
.btn-confirm {
  width: 100%;
  padding: 12px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--transition), box-shadow var(--transition);
}

.btn-confirm:hover:not(:disabled) {
  background: var(--accent-hover);
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
}

.btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
