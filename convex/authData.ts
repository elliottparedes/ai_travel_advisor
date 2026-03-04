import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireUser } from "./utils/session";

// ── Internal (called by node actions) ────────────────────────────────────────

export const getUserByUsername = internalQuery({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();
  },
});

export const createUser = internalMutation({
  args: {
    username: v.string(),
    passwordHash: v.string(),
    displayName: v.optional(v.string()),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", args);
  },
});

export const createSession = internalMutation({
  args: {
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sessions", args);
  },
});

// ── Public ────────────────────────────────────────────────────────────────────

export const getSessionUser = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!session || session.expiresAt < Date.now()) return null;

    const user = await ctx.db.get(session.userId);
    if (!user) return null;

    const avatarUrl = user.avatarStorageId
      ? await ctx.storage.getUrl(user.avatarStorageId as Id<"_storage">)
      : null;

    return {
      id: user._id,
      username: user.username,
      displayName: user.displayName ?? user.username,
      createdAt: user.createdAt,
      avatarUrl: avatarUrl ?? undefined,
    };
  },
});

export const signOut = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (session) await ctx.db.delete(session._id);
  },
});

export const updateProfile = mutation({
  args: {
    token: v.string(),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.displayName.trim()) throw new Error("Display name cannot be empty.");

    const userId = await requireUser(ctx, args.token);
    await ctx.db.patch(userId, { displayName: args.displayName.trim() });

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found.");

    const avatarUrl = user.avatarStorageId
      ? await ctx.storage.getUrl(user.avatarStorageId as Id<"_storage">)
      : null;

    return {
      id: user._id,
      username: user.username,
      displayName: user.displayName ?? user.username,
      createdAt: user.createdAt,
      avatarUrl: avatarUrl ?? undefined,
    };
  },
});

export const generateAvatarUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token);
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveAvatar = mutation({
  args: { token: v.string(), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, args.token);
    await ctx.db.patch(userId, { avatarStorageId: args.storageId });
    const avatarUrl = await ctx.storage.getUrl(args.storageId);
    return avatarUrl;
  },
});
