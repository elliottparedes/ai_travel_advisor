import { convexClient } from "./client";
import { api } from "../../convex/_generated/api";
import type { Review } from "../types/trips";
import type { Id } from "../../convex/_generated/dataModel";

export interface UserReviewSummary {
  _id: string;
  fsqId: string;
  placeTitle: string;
  city: string;
  country: string;
  placeType: string;
  vibe: number;
  text: string;
  helpfulCount: number;
  createdAt: number;
}

export async function getUserReviews(token: string): Promise<UserReviewSummary[]> {
  return await convexClient.query(api.reviewsData.getUserReviews, { token }) ?? [];
}

export async function getPlaceReviews(fsqId: string): Promise<Review[]> {
  return await convexClient.query(api.reviewsData.getPlaceReviews, { fsqId }) ?? [];
}

export async function getUserReviewForPlace(token: string, fsqId: string): Promise<Review | null> {
  return await convexClient.query(api.reviewsData.getUserReviewForPlace, { token, fsqId });
}

export async function getCityLeaderboard(city: string): Promise<{ userId: string; displayName: string; totalHelpful: number; reviewCount: number }[]> {
  return await convexClient.query(api.reviewsData.getCityLeaderboard, { city }) ?? [];
}

export async function writeReview(opts: {
  token: string;
  fsqId: string;
  placeTitle: string;
  city: string;
  country: string;
  placeType: string;
  vibe: number;
  text: string;
}): Promise<string> {
  return await convexClient.mutation(api.reviewsData.writeReview, opts) as string;
}

export async function voteHelpful(token: string, reviewId: string): Promise<void> {
  await convexClient.mutation(api.reviewsData.voteHelpful, {
    token,
    reviewId: reviewId as Id<"reviews">,
  });
}

export async function deleteReview(token: string, reviewId: string): Promise<void> {
  await convexClient.mutation(api.reviewsData.deleteReview, {
    token,
    reviewId: reviewId as Id<"reviews">,
  });
}
