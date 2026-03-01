<script setup lang="ts">
import { onMounted } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "./stores/authStore";
import { useTheme } from "./composables/useTheme";
import NavBar from "./components/NavBar.vue";

const route = useRoute();
const auth = useAuthStore();
const { initTheme } = useTheme();

onMounted(initTheme);
</script>

<template>
  <div class="app">
    <NavBar v-if="auth.isAuthenticated" />
    <router-view />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
