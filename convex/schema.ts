import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Shared card shape used in trips
const cardValidator = v.object({
  id: v.string(),
  type: v.string(), // restaurant | landmark | nightlife | hotel | airbnb
  title: v.string(),
  description: v.string(),
  tags: v.array(v.string()),
  rating: v.optional(v.number()),
  priceRange: v.optional(v.string()),
  neighborhood: v.optional(v.string()),
  // type-specific
  cuisine: v.optional(v.string()),
  category: v.optional(v.string()),
  vibe: v.optional(v.string()),
  pricePerNight: v.optional(v.string()),
  // map
  lat: v.optional(v.number()),
  lng: v.optional(v.number()),
  // real photo from image provider
  image: v.optional(v.string()),
});

export default defineSchema({
  users: defineTable({
    username: v.string(),
    passwordHash: v.string(),
    displayName: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
  }).index("by_username", ["username"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  }).index("by_token", ["token"]),

  trips: defineTable({
    userId: v.id("users"),
    name: v.string(),
    destination: v.string(),
    destinationInfo: v.object({
      city: v.string(),
      country: v.string(),
      description: v.string(),
      bestTime: v.optional(v.string()),
      highlights: v.array(v.string()),
      // approximate map center for the destination
      lat: v.optional(v.number()),
      lng: v.optional(v.number()),
    }),
    pinnedCards: v.array(cardValidator),
    chatHistory: v.array(
      v.object({ role: v.string(), content: v.string() }),
    ),
    itinerary: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
});
