<script setup lang="ts">
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "../stores/authStore";
import { useTheme } from "../composables/useTheme";
import ThemeToggle from "./ThemeToggle.vue";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const { theme } = useTheme();

const initials = () => {
  const name = auth.user?.displayName ?? auth.user?.username ?? "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

async function handleSignOut() {
  await auth.signOut();
  router.push("/login");
}
</script>

<template>
  <nav class="navbar">
    <div class="navbar__inner">
      <!-- Left: logo + links -->
      <div class="navbar__left">
        <router-link to="/trips" class="navbar__logo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
          <span>Voyager</span>
        </router-link>

        <div class="navbar__links">
          <router-link
            to="/trips"
            class="nav-link"
            :class="{ 'nav-link--active': route.path.startsWith('/trips') }"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
              <line x1="8" y1="2" x2="8" y2="18"/>
              <line x1="16" y1="6" x2="16" y2="22"/>
            </svg>
            Trips
          </router-link>
          <router-link
            to="/profile"
            class="nav-link"
            :class="{ 'nav-link--active': route.path === '/profile' }"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Profile
          </router-link>
        </div>
      </div>

      <!-- Right: theme + user -->
      <div class="navbar__right">
        <ThemeToggle />

        <router-link to="/profile" class="user-chip">
          <img v-if="auth.user?.avatarUrl" :src="auth.user.avatarUrl" class="user-chip__avatar user-chip__avatar--photo" alt="" />
          <span v-else class="user-chip__avatar">{{ initials() }}</span>
          <span class="user-chip__name">{{ auth.user?.displayName }}</span>
        </router-link>

        <button class="sign-out-btn" title="Sign out" @click="handleSignOut">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(12px);
}

.navbar__inner {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 20px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

/* ── Left ── */
.navbar__left {
  display: flex;
  align-items: center;
  gap: 28px;
}

.navbar__logo {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--text-primary);
  text-decoration: none;
  letter-spacing: -0.01em;
}

.navbar__logo svg {
  color: var(--accent);
}

.navbar__links {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  text-decoration: none;
  transition: background var(--transition), color var(--transition);
}

.nav-link:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}

.nav-link--active {
  background: var(--accent-dim);
  color: var(--accent);
}

/* ── Right ── */
.navbar__right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px 4px 4px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-input);
  text-decoration: none;
  transition: background var(--transition), border-color var(--transition);
  color: var(--text-primary);
}

.user-chip:hover {
  background: var(--bg-card-hover);
  border-color: var(--border-focus);
}

.user-chip__avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.03em;
  flex-shrink: 0;
}

.user-chip__avatar--photo {
  object-fit: cover;
  background: var(--bg-input);
}

.user-chip__name {
  font-size: 0.82rem;
  font-weight: 600;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sign-out-btn {
  width: 34px;
  height: 34px;
  border: 1px solid var(--border);
  background: transparent;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  cursor: pointer;
  transition: background var(--transition), color var(--transition), border-color var(--transition);
}

.sign-out-btn:hover {
  background: var(--danger-bg);
  color: var(--danger);
  border-color: rgba(239, 68, 68, 0.3);
}
</style>
