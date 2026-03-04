<script setup lang="ts">
defineProps<{
  title: string;
  confirmLabel?: string;
}>();

const emit = defineEmits<{ confirm: []; cancel: [] }>();
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div class="modal-backdrop" @click.self="emit('cancel')">
        <div class="modal">
          <div class="modal-icon">🗑️</div>
          <h3 class="modal-title">{{ title }}</h3>
          <p class="modal-body"><slot /></p>
          <div class="modal-actions">
            <button class="modal-btn modal-btn--cancel" @click="emit('cancel')">Cancel</button>
            <button class="modal-btn modal-btn--delete" @click="emit('confirm')">
              {{ confirmLabel ?? 'Delete' }}
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
  padding: 32px 28px 24px;
  max-width: 380px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4);
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
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.modal-btn--delete:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: var(--danger);
}

.fade-enter-active, .fade-leave-active { transition: opacity 200ms ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
