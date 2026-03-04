<script setup lang="ts">
import { ref } from "vue";
import { useListStore } from "../../stores/listStore";
import { useAuthStore } from "../../stores/authStore";
import { LIST_TEMPLATES, LIST_EMOJIS } from "../../types/lists";

const emit = defineEmits<{ created: []; cancel: [] }>();

const listStore = useListStore();
const auth = useAuthStore();

const newName = ref("");
const newEmoji = ref("⭐");
const isCreating = ref(false);

function pickTemplate(t: { emoji: string; name: string }) {
  newEmoji.value = t.emoji;
  newName.value = t.name;
}

async function createList() {
  if (!newName.value.trim()) return;
  isCreating.value = true;
  try {
    await listStore.createList(auth.sessionToken!, newName.value.trim(), newEmoji.value);
    emit("created");
  } finally {
    isCreating.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div class="modal-backdrop" @click.self="emit('cancel')">
        <div class="modal">
          <button class="modal-close" @click="emit('cancel')">
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
            <button class="modal-btn modal-btn--cancel" @click="emit('cancel')">Cancel</button>
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
  </Teleport>
</template>

<style scoped>
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

.modal-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.01em;
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

.fade-enter-active, .fade-leave-active { transition: opacity 200ms ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
