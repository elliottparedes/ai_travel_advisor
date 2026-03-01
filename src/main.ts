import { createApp } from "vue";
import { createPinia } from "pinia";
import router from "./router";
import App from "./App.vue";
import "./assets/main.css";
import { useAuthStore } from "./stores/authStore";

async function bootstrap() {
  const app = createApp(App);
  const pinia = createPinia();

  app.use(pinia);

  // Validate stored session BEFORE the router mounts so guards have correct state
  await useAuthStore().init();

  app.use(router);
  app.mount("#app");
}

bootstrap();
