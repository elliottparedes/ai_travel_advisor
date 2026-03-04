import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ── Session helper ────────────────────────────────────────────────────────────

async function requireUser(
  ctx: { db: { query: Function } },
  token: string,
) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .unique();
  if (!session || session.expiresAt < Date.now()) {
    throw new Error("Session expired. Please sign in again.");
  }
  return session.userId;
}

// ── Card validator (mirrors schema) ──────────────────────────────────────────

const cardV = v.object({
  id: v.string(),
  type: v.string(),
  title: v.string(),
  description: v.string(),
  tags: v.array(v.string()),
  rating: v.optional(v.number()),
  priceRange: v.optional(v.string()),
  neighborhood: v.optional(v.string()),
  cuisine: v.optional(v.string()),
  category: v.optional(v.string()),
  vibe: v.optional(v.string()),
  pricePerNight: v.optional(v.string()),
  lat: v.optional(v.number()),
  lng: v.optional(v.number()),
  image: v.optional(v.string()),
  imageFallbacks: v.optional(v.array(v.string())),
  fsqId: v.optional(v.string()),
});

// ── Mutations ─────────────────────────────────────────────────────────────────

export const saveTrip = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    destination: v.string(),
    destinationInfo: v.object({
      city: v.string(),
      country: v.string(),
      description: v.string(),
      bestTime: v.optional(v.string()),
      highlights: v.array(v.string()),
      lat: v.optional(v.number()),
      lng: v.optional(v.number()),
    }),
    pinnedCards: v.array(cardV),
    chatHistory: v.array(v.object({ role: v.string(), content: v.string() })),
    itinerary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, args.token);
    return await ctx.db.insert("trips", {
      userId,
      name: args.name,
      destination: args.destination,
      destinationInfo: args.destinationInfo,
      pinnedCards: args.pinnedCards,
      chatHistory: args.chatHistory,
      itinerary: args.itinerary,
      createdAt: Date.now(),
    });
  },
});

export const updateTrip = mutation({
  args: {
    token: v.string(),
    tripId: v.id("trips"),
    name: v.string(),
    destinationInfo: v.object({
      city: v.string(),
      country: v.string(),
      description: v.string(),
      bestTime: v.optional(v.string()),
      highlights: v.array(v.string()),
      lat: v.optional(v.number()),
      lng: v.optional(v.number()),
    }),
    pinnedCards: v.array(cardV),
    chatHistory: v.array(v.object({ role: v.string(), content: v.string() })),
    itinerary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, args.token);
    const trip = await ctx.db.get(args.tripId);
    if (!trip || trip.userId !== userId) throw new Error("Trip not found.");
    await ctx.db.patch(args.tripId, {
      name: args.name,
      destinationInfo: args.destinationInfo,
      pinnedCards: args.pinnedCards,
      chatHistory: args.chatHistory,
      itinerary: args.itinerary,
    });
    return args.tripId;
  },
});

export const deleteTrip = mutation({
  args: { token: v.string(), tripId: v.id("trips") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, args.token);
    const trip = await ctx.db.get(args.tripId);
    if (!trip || trip.userId !== userId) throw new Error("Trip not found.");
    await ctx.db.delete(args.tripId);
  },
});

// ── Queries ───────────────────────────────────────────────────────────────────

export const listTrips = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .unique();
    if (!session || session.expiresAt < Date.now()) return [];

    const trips = await ctx.db
      .query("trips")
      .withIndex("by_user", (q: any) => q.eq("userId", session.userId))
      .order("desc")
      .collect();

    return trips.map((t) => ({
      id: t._id,
      name: t.name,
      destination: t.destination,
      city: t.destinationInfo.city,
      country: t.destinationInfo.country,
      pinnedCount: t.pinnedCards.length,
      pinnedImages: t.pinnedCards
        .filter((c: any) => c.image)
        .slice(0, 4)
        .map((c: any) => c.image as string),
      createdAt: t.createdAt,
    }));
  },
});

export const getTrip = query({
  args: { token: v.string(), tripId: v.id("trips") },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .unique();
    if (!session || session.expiresAt < Date.now()) return null;

    const trip = await ctx.db.get(args.tripId);
    if (!trip || trip.userId !== session.userId) return null;
    return trip;
  },
});
