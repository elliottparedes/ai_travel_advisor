import { ConvexClient } from "convex/browser";

// Single ConvexClient instance shared across all API modules
export const convexClient = new ConvexClient(
  import.meta.env.VITE_CONVEX_URL as string,
);
