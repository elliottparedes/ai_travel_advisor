import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { AuthUser } from "../types/auth";
import * as authApi from "../api/authApi";

const SESSION_KEY = "ft-session";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<AuthUser | null>(null);
  const sessionToken = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => user.value !== null);

  // Called once at app bootstrap — validates any stored token
  async function init(): Promise<void> {
    const token = localStorage.getItem(SESSION_KEY);
    if (!token) return;
    try {
      const userData = await authApi.getSessionUser(token);
      if (userData) {
        sessionToken.value = token;
        user.value = userData;
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  async function signUp(
    username: string,
    password: string,
    displayName?: string,
  ): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const result = await authApi.signUp(username, password, displayName);
      _setSession(result.token, result.user);
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Sign up failed.";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function signIn(username: string, password: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const result = await authApi.signIn(username, password);
      _setSession(result.token, result.user);
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Sign in failed.";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function signOut(): Promise<void> {
    if (sessionToken.value) {
      try {
        await authApi.signOut(sessionToken.value);
      } catch {
        // Clear locally even if the server call fails
      }
    }
    _clearSession();
  }

  async function updateProfile(displayName: string): Promise<void> {
    if (!sessionToken.value) throw new Error("Not authenticated.");
    loading.value = true;
    error.value = null;
    try {
      user.value = await authApi.updateProfile(sessionToken.value, displayName);
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Update failed.";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function uploadAvatar(file: File): Promise<void> {
    if (!sessionToken.value) throw new Error("Not authenticated.");
    loading.value = true;
    error.value = null;
    try {
      // 1. Get a pre-signed upload URL from Convex Storage
      const uploadUrl = await authApi.generateAvatarUploadUrl(sessionToken.value);
      // 2. PUT the file directly to Convex Storage
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Upload failed.");
      const { storageId } = await uploadRes.json();
      // 3. Save the storage ID and get back the serving URL
      const avatarUrl = await authApi.saveAvatar(sessionToken.value, storageId);
      if (user.value && avatarUrl) {
        user.value = { ...user.value, avatarUrl };
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Upload failed.";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function clearError() {
    error.value = null;
  }

  // ── Private helpers ──────────────────────────────────────────────────────
  function _setSession(token: string, userData: AuthUser) {
    sessionToken.value = token;
    user.value = userData;
    localStorage.setItem(SESSION_KEY, token);
  }

  function _clearSession() {
    user.value = null;
    sessionToken.value = null;
    localStorage.removeItem(SESSION_KEY);
  }

  return {
    user,
    sessionToken,
    loading,
    error,
    isAuthenticated,
    init,
    signUp,
    signIn,
    signOut,
    updateProfile,
    uploadAvatar,
    clearError,
  };
});
