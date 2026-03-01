<script setup lang="ts">
import { ref, nextTick, watch } from "vue";
import { useTripStore } from "../../stores/tripStore";

const store = useTripStore();
const input = ref("");
const messagesEl = ref<HTMLElement | null>(null);

// Auto-scroll on new messages
watch(
  () => store.chatMessages.length,
  async () => {
    await nextTick();
    messagesEl.value?.scrollTo({ top: messagesEl.value.scrollHeight, behavior: "smooth" });
  },
);

async function send() {
  const text = input.value.trim();
  if (!text || store.isChatting) return;
  input.value = "";
  await store.sendMessage(text);
}

// Simple markdown: headings, bold, italic, bullets, line breaks
function renderContent(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<span class="md-h3">$1</span>')
    .replace(/^## (.+)$/gm, '<span class="md-h2">$1</span>')
    .replace(/^# (.+)$/gm, '<span class="md-h1">$1</span>')
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "• $1")
    .replace(/\n/g, "<br>");
}
</script>

<template>
  <div class="wander-chat">
    <!-- Header -->
    <div class="chat-header">
      <div class="wander-avatar">🧭</div>
      <div>
        <p class="wander-name">Wander</p>
        <p class="wander-sub">Your AI travel companion</p>
      </div>
      <div v-if="store.isChatting" class="typing-indicator">
        <span /><span /><span />
      </div>
    </div>

    <!-- Messages -->
    <div ref="messagesEl" class="messages">
      <div
        v-for="msg in store.chatMessages"
        :key="msg.id"
        class="message"
        :class="msg.role === 'user' ? 'message--user' : 'message--wander'"
      >
        <div v-if="msg.role === 'wander'" class="msg-avatar">🧭</div>
        <div class="msg-bubble" v-html="renderContent(msg.content)" />
      </div>

      <div v-if="store.isChatting" class="message message--wander">
        <div class="msg-avatar">🧭</div>
        <div class="msg-bubble msg-bubble--loading">
          <span /><span /><span />
        </div>
      </div>
    </div>

    <!-- Quick actions -->
    <div class="quick-actions">
      <button class="quick-btn" @click="store.createItinerary">
        ✨ Create itinerary
      </button>
      <button
        class="quick-btn"
        @click="store.sendMessage('What are the top hidden gems I shouldn\'t miss?')"
      >
        💎 Hidden gems
      </button>
      <button
        class="quick-btn"
        @click="store.sendMessage('What\'s the best way to get around?')"
      >
        🚇 Getting around
      </button>
    </div>

    <!-- Input -->
    <div class="chat-input-row">
      <input
        v-model="input"
        type="text"
        placeholder="Ask Wander anything…"
        class="chat-input"
        :disabled="store.isChatting"
        @keydown.enter="send"
      />
      <button
        class="send-btn"
        :disabled="!input.trim() || store.isChatting"
        @click="send"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.wander-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

/* ── Header ── */
.chat-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-surface);
}

.wander-avatar {
  font-size: 1.4rem;
  width: 38px;
  height: 38px;
  background: var(--accent-dim);
  border: 1px solid rgba(99,102,241,0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wander-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
}

.wander-sub {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.typing-indicator {
  margin-left: auto;
  display: flex;
  gap: 3px;
  align-items: center;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  animation: bounce 1.2s ease-in-out infinite;
}
.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

/* ── Messages ── */
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.message {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  max-width: 85%;
}

.message--user {
  flex-direction: row-reverse;
  align-self: flex-end;
}

.message--wander {
  align-self: flex-start;
}

.msg-avatar {
  font-size: 1rem;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent-dim);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.msg-bubble {
  padding: 10px 13px;
  border-radius: 16px;
  font-size: 0.84rem;
  line-height: 1.55;
  color: var(--text-primary);
}

.message--wander .msg-bubble {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-top-left-radius: 4px;
}

.message--user .msg-bubble {
  background: var(--accent);
  color: #fff;
  border-top-right-radius: 4px;
}

/* Loading dots in bubble */
.msg-bubble--loading {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 12px 16px;
}

.msg-bubble--loading span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-muted);
  animation: bounce 1.2s ease-in-out infinite;
}
.msg-bubble--loading span:nth-child(2) { animation-delay: 0.2s; }
.msg-bubble--loading span:nth-child(3) { animation-delay: 0.4s; }

/* ── Quick actions ── */
.quick-actions {
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  overflow-x: auto;
  border-top: 1px solid var(--border);
  scrollbar-width: none;
}
.quick-actions::-webkit-scrollbar { display: none; }

.quick-btn {
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-input);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--transition), border-color var(--transition), color var(--transition);
}

.quick-btn:hover {
  background: var(--accent-dim);
  border-color: rgba(99,102,241,0.4);
  color: var(--accent);
}

/* ── Input ── */
.chat-input-row {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--border);
  background: var(--bg-surface);
}

.chat-input {
  flex: 1;
  padding: 9px 14px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text-primary);
  font-size: 0.875rem;
  outline: none;
  transition: border-color var(--transition), box-shadow var(--transition);
}

.chat-input:focus {
  border-color: var(--border-focus);
  box-shadow: var(--shadow-focus);
}

.send-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition), transform var(--transition);
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: scale(1.05);
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── Markdown heading styles (v-html, need :deep) ── */
:deep(.md-h1) {
  display: block;
  font-size: 1rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 6px 0 2px;
}

:deep(.md-h2) {
  display: block;
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 5px 0 2px;
}

:deep(.md-h3) {
  display: block;
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 4px 0 1px;
}
</style>
