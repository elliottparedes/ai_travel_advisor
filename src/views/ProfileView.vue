<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/authStore";

const router = useRouter();
const auth = useAuthStore();

const editingName = ref(false);
const nameInput = ref("");
const saveError = ref("");
const saveSuccess = ref(false);
const avatarUploading = ref(false);
const avatarError = ref("");
const fileInput = ref<HTMLInputElement | null>(null);

async function handleAvatarChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  avatarUploading.value = true;
  avatarError.value = "";
  try {
    await auth.uploadAvatar(file);
  } catch (err) {
    avatarError.value = err instanceof Error ? err.message : "Upload failed.";
  } finally {
    avatarUploading.value = false;
    if (fileInput.value) fileInput.value.value = "";
  }
}

function startEdit() {
  nameInput.value = auth.user?.displayName ?? "";
  editingName.value = true;
  saveError.value = "";
  saveSuccess.value = false;
}

function cancelEdit() {
  editingName.value = false;
  saveError.value = "";
}

async function saveDisplayName() {
  if (!nameInput.value.trim()) {
    saveError.value = "Display name cannot be empty.";
    return;
  }
  saveError.value = "";
  try {
    await auth.updateProfile(nameInput.value.trim());
    editingName.value = false;
    saveSuccess.value = true;
    setTimeout(() => (saveSuccess.value = false), 3000);
  } catch (err) {
    saveError.value = err instanceof Error ? err.message : "Update failed.";
  }
}

async function handleSignOut() {
  await auth.signOut();
  router.push("/login");
}

const memberSince = computed(() => {
  if (!auth.user) return "";
  return new Date(auth.user.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
});

const avatarInitials = computed(() => {
  const name = auth.user?.displayName ?? auth.user?.username ?? "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
});
</script>

<template>
  <div class="view">
    <div class="profile-page">
      <!-- Header -->
      <div class="profile-header">
        <h1 class="page-title">Profile</h1>
      </div>

      <!-- Avatar + identity card -->
      <div class="card identity-card">
        <!-- Clickable avatar -->
        <div class="avatar-wrap" @click="fileInput?.click()" :class="{ 'avatar-wrap--uploading': avatarUploading }" title="Change photo">
          <img v-if="auth.user?.avatarUrl" :src="auth.user.avatarUrl" class="avatar avatar--photo" alt="Profile photo" />
          <div v-else class="avatar">{{ avatarInitials }}</div>
          <div class="avatar-overlay">
            <svg v-if="!avatarUploading" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <div v-else class="avatar-spinner" />
          </div>
          <input ref="fileInput" type="file" accept="image/*" class="avatar-file-input" @change="handleAvatarChange" />
        </div>
        <p v-if="avatarError" class="avatar-error">{{ avatarError }}</p>

        <div class="identity-details">
          <p class="identity-label label">Username</p>
          <p class="identity-username">{{ auth.user?.username }}</p>
          <p class="identity-since">Member since {{ memberSince }}</p>
        </div>
      </div>

      <!-- Display name card -->
      <div class="card setting-card">
        <div class="setting-header">
          <div>
            <p class="setting-title">Display name</p>
            <p class="setting-sub">Shown in the navigation bar</p>
          </div>
          <button v-if="!editingName" class="btn btn-ghost edit-btn" @click="startEdit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit
          </button>
        </div>

        <div v-if="!editingName" class="setting-value">
          <span>{{ auth.user?.displayName }}</span>
          <span v-if="saveSuccess" class="save-success">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Saved
          </span>
        </div>

        <div v-else class="edit-form">
          <input
            v-model="nameInput"
            type="text"
            placeholder="Your display name"
            autofocus
            @keydown.enter="saveDisplayName"
            @keydown.esc="cancelEdit"
          />
          <div v-if="saveError" class="save-error">{{ saveError }}</div>
          <div class="edit-actions">
            <button class="btn btn-ghost" @click="cancelEdit">Cancel</button>
            <button class="btn btn-primary" :disabled="auth.loading" @click="saveDisplayName">
              {{ auth.loading ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Danger zone -->
      <div class="card danger-card">
        <div class="danger-content">
          <div>
            <p class="setting-title">Sign out</p>
            <p class="setting-sub">You'll need to sign in again to search flights</p>
          </div>
          <button class="btn sign-out-btn" @click="handleSignOut">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.view {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 20px 60px;
}

.profile-page {
  max-width: 560px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.profile-header {
  margin-bottom: 8px;
}

.page-title {
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

/* ── Identity card ── */
.identity-card {
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.avatar-wrap {
  position: relative;
  flex-shrink: 0;
  cursor: pointer;
  border-radius: 50%;
}

.avatar-wrap:hover .avatar-overlay {
  opacity: 1;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 1.3rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.02em;
  flex-shrink: 0;
}

.avatar--photo {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--bg-input);
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  opacity: 0;
  transition: opacity var(--transition);
}

.avatar-wrap--uploading .avatar-overlay {
  opacity: 1;
}

.avatar-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.avatar-file-input {
  display: none;
}

.avatar-error {
  font-size: 0.75rem;
  color: var(--danger);
  margin-top: 4px;
  width: 100%;
}

.identity-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.identity-username {
  font-size: 1.1rem;
  font-weight: 700;
  font-family: "SF Mono", "Fira Code", "Cascadia Code", monospace;
  color: var(--text-primary);
}

.identity-since {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-top: 2px;
}

/* ── Settings card ── */
.setting-card {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.setting-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
}

.setting-sub {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-top: 2px;
}

.edit-btn {
  padding: 6px 12px;
  font-size: 0.8rem;
  flex-shrink: 0;
}

.setting-value {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95rem;
  color: var(--text-primary);
  font-weight: 500;
}

.save-success {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--success);
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.save-error {
  font-size: 0.8rem;
  color: var(--danger);
}

.edit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* ── Danger card ── */
.danger-card {
  padding: 20px 24px;
  border-color: rgba(239, 68, 68, 0.15);
}

.danger-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.sign-out-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--danger-bg);
  color: var(--danger);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition), border-color var(--transition);
  white-space: nowrap;
  flex-shrink: 0;
}

.sign-out-btn:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.4);
}
</style>
