import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

const THREE_DAYS   = 3  * 24 * 60 * 60 * 1000;
const THIRTY_DAYS  = 30 * 24 * 60 * 60 * 1000;

// ── Destination cache ─────────────────────────────────────────────────────────

export const getDestinationCache = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const row = await ctx.db
      .query("destinationCache")
      .withIndex("by_key", q => q.eq("key", key))
      .first();
    if (!row || Date.now() - row.cachedAt > THIRTY_DAYS) return null;
    return {
      city:        row.city,
      country:     row.country,
      description: row.description,
      bestTime:    row.bestTime,
      highlights:  row.highlights,
      lat:         row.lat,
      lng:         row.lng,
    };
  },
});

export const upsertDestinationCache = internalMutation({
  args: {
    key:         v.string(),
    city:        v.string(),
    country:     v.string(),
    description: v.string(),
    bestTime:    v.optional(v.string()),
    highlights:  v.array(v.string()),
    lat:         v.optional(v.number()),
    lng:         v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { key, ...data } = args;
    const existing = await ctx.db
      .query("destinationCache")
      .withIndex("by_key", q => q.eq("key", key))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { ...data, cachedAt: Date.now() });
    } else {
      await ctx.db.insert("destinationCache", { key, ...data, cachedAt: Date.now() });
    }
  },
});

// ── Image cache ───────────────────────────────────────────────────────────────

// Returns array (not Record) so query strings are values, not field names.
// Convex validates field names as ASCII-only, but place names can contain
// accented chars (ó, ', etc.) — using them as Record keys would throw.
export const getImageCacheMany = internalQuery({
  args: { queries: v.array(v.string()) },
  handler: async (ctx, { queries }) => {
    const now = Date.now();
    const hits: { query: string; urls: string[] }[] = [];
    for (const query of queries) {
      const row = await ctx.db
        .query("imageCache")
        .withIndex("by_query", q => q.eq("query", query))
        .first();
      if (row && now - row.cachedAt < THIRTY_DAYS) {
        hits.push({ query, urls: row.urls });
      }
    }
    return hits;
  },
});

export const upsertImageCacheMany = internalMutation({
  args: {
    entries: v.array(v.object({ query: v.string(), urls: v.array(v.string()) })),
  },
  handler: async (ctx, { entries }) => {
    const now = Date.now();
    for (const { query, urls } of entries) {
      const existing = await ctx.db
        .query("imageCache")
        .withIndex("by_query", q => q.eq("query", query))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { urls, cachedAt: now });
      } else {
        await ctx.db.insert("imageCache", { query, urls, cachedAt: now });
      }
    }
  },
});
