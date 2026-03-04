import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

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

// ── Mutations ─────────────────────────────────────────────────────────────────

export const writeReview = mutation({
  args: {
    token:      v.string(),
    fsqId:      v.string(),
    placeTitle: v.string(),
    city:       v.string(),
    country:    v.string(),
    placeType:  v.string(),
    vibe:       v.float64(),
    text:       v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, args.token);
    const user = await ctx.db
      .query("users")
      .filter((q: any) => q.eq(q.field("_id"), userId))
      .unique();
    if (!user) throw new Error("User not found.");

    // Check for existing review by this user for this place (upsert)
    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_place", (q: any) => q.eq("fsqId", args.fsqId))
      .filter((q: any) => q.eq(q.field("userId"), userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        vibe: args.vibe,
        text: args.text,
        createdAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("reviews", {
      userId,
      username:   user.username,
      displayName: user.displayName ?? user.username,
      fsqId:      args.fsqId,
      placeTitle: args.placeTitle,
      city:       args.city,
      country:    args.country,
      placeType:  args.placeType,
      vibe:       args.vibe,
      text:       args.text,
      helpfulVoterIds: [],
      createdAt:  Date.now(),
    });
  },
});

export const voteHelpful = mutation({
  args: { token: v.string(), reviewId: v.id("reviews") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, args.token);
    const review = await ctx.db.get(args.reviewId);
    if (!review) throw new Error("Review not found.");

    const voters = review.helpfulVoterIds as Id<"users">[];
    const already = voters.some((id) => id === userId);
    await ctx.db.patch(args.reviewId, {
      helpfulVoterIds: already
        ? voters.filter((id) => id !== userId)
        : [...voters, userId],
    });
  },
});

export const deleteReview = mutation({
  args: { token: v.string(), reviewId: v.id("reviews") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, args.token);
    const review = await ctx.db.get(args.reviewId);
    if (!review || review.userId !== userId) throw new Error("Review not found.");
    await ctx.db.delete(args.reviewId);
  },
});

// ── Queries ───────────────────────────────────────────────────────────────────

export const getPlaceReviews = query({
  args: { fsqId: v.string() },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_place", (q: any) => q.eq("fsqId", args.fsqId))
      .collect();

    return reviews
      .map((r) => ({
        _id: r._id as string,
        userId: r.userId as string,
        displayName: r.displayName,
        vibe: r.vibe,
        text: r.text,
        helpfulCount: r.helpfulVoterIds.length,
        helpfulVoterIds: r.helpfulVoterIds as string[],
        createdAt: r.createdAt,
      }))
      .sort((a, b) => b.helpfulCount - a.helpfulCount);
  },
});

export const getCityLeaderboard = query({
  args: { city: v.string() },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_city", (q: any) => q.eq("city", args.city))
      .collect();

    const map = new Map<string, { displayName: string; totalHelpful: number; reviewCount: number }>();
    for (const r of reviews) {
      const uid = r.userId as string;
      const existing = map.get(uid);
      if (existing) {
        existing.totalHelpful += r.helpfulVoterIds.length;
        existing.reviewCount += 1;
      } else {
        map.set(uid, {
          displayName: r.displayName,
          totalHelpful: r.helpfulVoterIds.length,
          reviewCount: 1,
        });
      }
    }

    return Array.from(map.entries())
      .map(([userId, stats]) => ({ userId, ...stats }))
      .sort((a, b) => b.totalHelpful - a.totalHelpful)
      .slice(0, 10);
  },
});

export const getUserReviews = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .unique();
    if (!session || session.expiresAt < Date.now()) return [];
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_user", (q: any) => q.eq("userId", session.userId))
      .order("desc")
      .collect();
    return reviews.map((r) => ({
      _id: r._id as string,
      fsqId: r.fsqId,
      placeTitle: r.placeTitle,
      city: r.city,
      country: r.country,
      placeType: r.placeType,
      vibe: r.vibe,
      text: r.text,
      helpfulCount: r.helpfulVoterIds.length,
      createdAt: r.createdAt,
    }));
  },
});

export const getUserReviewForPlace = query({
  args: { token: v.string(), fsqId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .unique();
    if (!session || session.expiresAt < Date.now()) return null;

    const review = await ctx.db
      .query("reviews")
      .withIndex("by_place", (q: any) => q.eq("fsqId", args.fsqId))
      .filter((q: any) => q.eq(q.field("userId"), session.userId))
      .unique();

    if (!review) return null;
    return {
      _id: review._id as string,
      userId: review.userId as string,
      displayName: review.displayName,
      vibe: review.vibe,
      text: review.text,
      helpfulCount: review.helpfulVoterIds.length,
      helpfulVoterIds: review.helpfulVoterIds as string[],
      createdAt: review.createdAt,
    };
  },
});
