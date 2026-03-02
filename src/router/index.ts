import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/authStore";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/trips" },
    {
      path: "/login",
      component: () => import("../views/LoginView.vue"),
    },
    {
      path: "/flights",
      component: () => import("../views/FlightSearchView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/profile",
      component: () => import("../views/ProfileView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/trips",
      component: () => import("../views/TripsView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/trips/new",
      component: () => import("../views/TripWizard.vue"),
      meta: { requiresAuth: true },
    },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isAuthenticated) return "/login";
  if (to.path === "/login" && auth.isAuthenticated) return "/trips";
});

export default router;
