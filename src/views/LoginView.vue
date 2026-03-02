<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/authStore";

const router = useRouter();
const auth = useAuthStore();

type Tab = "signin" | "signup";
const tab = ref<Tab>("signin");

const username = ref("");
const password = ref("");
const displayName = ref("");
const confirmPassword = ref("");

const localError = ref("");

function switchTab(t: Tab) {
  tab.value = t;
  localError.value = "";
  auth.clearError();
  username.value = "";
  password.value = "";
  displayName.value = "";
  confirmPassword.value = "";
}

async function handleSubmit() {
  localError.value = "";
  auth.clearError();

  if (tab.value === "signup") {
    if (password.value !== confirmPassword.value) {
      localError.value = "Passwords do not match.";
      return;
    }
    try {
      await auth.signUp(username.value, password.value, displayName.value || undefined);
      router.push("/trips");
    } catch {
      // error already set in store
    }
  } else {
    try {
      await auth.signIn(username.value, password.value);
      router.push("/trips");
    } catch {
      // error already set in store
    }
  }
}

const errorMessage = () => localError.value || auth.error || "";
</script>

<template>
  <div class="login-page">
    <div class="login-container">
      <!-- Logo -->
      <div class="login-logo">
        <div class="login-logo__icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
        </div>
        <h1 class="login-logo__name">Voyager</h1>
      </div>

      <!-- Card -->
      <div class="login-card card">
        <!-- Tabs -->
        <div class="tabs">
          <button
            class="tab"
            :class="{ 'tab--active': tab === 'signin' }"
            @click="switchTab('signin')"
          >
            Sign in
          </button>
          <button
            class="tab"
            :class="{ 'tab--active': tab === 'signup' }"
            @click="switchTab('signup')"
          >
            Create account
          </button>
        </div>

        <!-- Form -->
        <form class="login-form" @submit.prevent="handleSubmit">
          <!-- Display name (signup only) -->
          <div v-if="tab === 'signup'" class="field">
            <label class="label" for="displayName">Display name</label>
            <input
              id="displayName"
              v-model="displayName"
              type="text"
              placeholder="Your name"
              autocomplete="name"
            />
          </div>

          <div class="field">
            <label class="label" for="username">Username</label>
            <input
              id="username"
              v-model="username"
              type="text"
              placeholder="lowercase, letters & numbers"
              autocomplete="username"
              required
            />
          </div>

          <div class="field">
            <label class="label" for="password">Password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              placeholder="Min. 8 characters"
              autocomplete="current-password"
              required
            />
          </div>

          <div v-if="tab === 'signup'" class="field">
            <label class="label" for="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              type="password"
              placeholder="Repeat password"
              autocomplete="new-password"
              required
            />
          </div>

          <!-- Error -->
          <div v-if="errorMessage()" class="form-error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            {{ errorMessage() }}
          </div>

          <button
            type="submit"
            class="btn btn-primary submit-btn"
            :disabled="auth.loading"
          >
            <svg v-if="auth.loading" class="spinner-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            <span>{{ tab === 'signin' ? 'Sign in' : 'Create account' }}</span>
          </button>
        </form>
      </div>

      <p class="login-footer">
        Flight data via Google Flights
      </p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-root);
  padding: 20px;
}

.login-container {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

/* ── Logo ── */
.login-logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.login-logo__icon {
  width: 48px;
  height: 48px;
  background: var(--accent-dim);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
}

.login-logo__name {
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--text-primary);
}

/* ── Card ── */
.login-card {
  width: 100%;
  padding: 0;
  overflow: hidden;
}

/* ── Tabs ── */
.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-bottom: 1px solid var(--border);
}

.tab {
  padding: 14px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition), color var(--transition);
  position: relative;
}

.tab:hover:not(.tab--active) {
  background: var(--bg-card-hover);
  color: var(--text-secondary);
}

.tab--active {
  color: var(--text-primary);
  background: var(--bg-card);
}

.tab--active::after {
  content: "";
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--accent);
  border-radius: 2px 2px 0 0;
}

/* ── Form ── */
.login-form {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
}

.form-error {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 12px;
  background: var(--danger-bg);
  color: var(--danger);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 500;
}

.submit-btn {
  width: 100%;
  padding: 12px;
  font-size: 0.95rem;
  margin-top: 4px;
  gap: 8px;
}

/* ── Spinner icon animation ── */
.spinner-icon {
  animation: spin 1s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Footer ── */
.login-footer {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-align: center;
}
</style>
