import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./utils/session";

// ── Item validator ─────────────────────────────────────────────────────────────

const itemV = v.object({
  fsqId:          v.optional(v.string()),
  title:          v.string(),
  type:           v.string(),
  city:           v.string(),
  country:        v.string(),
  image:          v.optional(v.string()),
  imageFallbacks: v.optional(v.array(v.string())),
  neighborhood:   v.optional(v.string()),
  rating:         v.optional(v.float64()),
  priceRange:     v.optional(v.string()),
  lat:            v.optional(v.float64()),
  lng:            v.optional(v.float64()),
  addedAt:        v.float64(),
});

// ── Mutations ─────────────────────────────────────────────────────────────────

export const createList = mutation({
  args: { token: v.string(), name: v.string(), emoji: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, args.token);
    return await ctx.db.insert("userLists", {
      userId,
      name: args.name,
      emoji: args.emoji,
      items: [],
      createdAt: Date.now(),
    });
  },
});

export const deleteList = mutation({
  args: { token: v.string(), listId: v.id("userLists") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, args.token);
    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== userId) throw new Error("List not found.");
    await ctx.db.delete(args.listId);
  },
});

export const addToList = mutation({
  args: { token: v.string(), listId: v.id("userLists"), item: itemV },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, args.token);
    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== userId) throw new Error("List not found.");
    // Avoid duplicates by fsqId (or title if no fsqId)
    const already = list.items.some((i: any) =>
      args.item.fsqId ? i.fsqId === args.item.fsqId : i.title === args.item.title,
    );
    if (already) return args.listId;
    await ctx.db.patch(args.listId, { items: [...list.items, args.item] });
    return args.listId;
  },
});

export const removeFromList = mutation({
  args: { token: v.string(), listId: v.id("userLists"), fsqId: v.optional(v.string()), title: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, args.token);
    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== userId) throw new Error("List not found.");
    const filtered = list.items.filter((i: any) => {
      if (args.fsqId) return i.fsqId !== args.fsqId;
      return i.title !== args.title;
    });
    await ctx.db.patch(args.listId, { items: filtered });
  },
});

export const renameList = mutation({
  args: { token: v.string(), listId: v.id("userLists"), name: v.string(), emoji: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, args.token);
    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== userId) throw new Error("List not found.");
    await ctx.db.patch(args.listId, { name: args.name, emoji: args.emoji });
  },
});

// ── Queries ───────────────────────────────────────────────────────────────────

export const getUserLists = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .unique();
    if (!session || session.expiresAt < Date.now()) return [];

    const lists = await ctx.db
      .query("userLists")
      .withIndex("by_user", (q: any) => q.eq("userId", session.userId))
      .order("desc")
      .collect();

    return lists.map((l) => ({
      id: l._id as string,
      name: l.name,
      emoji: l.emoji,
      items: l.items,
      createdAt: l.createdAt,
    }));
  },
});

export const getListFsqIds = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .unique();
    if (!session || session.expiresAt < Date.now()) return [] as string[];

    const lists = await ctx.db
      .query("userLists")
      .withIndex("by_user", (q: any) => q.eq("userId", session.userId))
      .collect();

    const ids: string[] = [];
    for (const l of lists) {
      for (const item of l.items) {
        if ((item as any).fsqId) ids.push((item as any).fsqId);
      }
    }
    return ids;
  },
});
