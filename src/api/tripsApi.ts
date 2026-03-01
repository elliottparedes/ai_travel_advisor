import { convexClient } from "./client";
import { api } from "../../convex/_generated/api";
import type { DiscoveryCard, DestinationInfo, SavedTrip, ChatMessage } from "../types/trips";
import type { Id } from "../../convex/_generated/dataModel";

export async function enrichDestination(destination: string): Promise<{
  info: DestinationInfo;
  cards: DiscoveryCard[];
}> {
  return await convexClient.action(api.tripActions.enrichDestination, { destination });
}

export async function generateMoreCards(opts: {
  city: string;
  country: string;
  category: string;
  existingTitles: string[];
  cityLat?: number;
  cityLng?: number;
}): Promise<DiscoveryCard[]> {
  return await convexClient.action(api.tripActions.generateMoreCards, opts);
}

export async function chatWithWander(opts: {
  destination: string;
  city: string;
  pinnedSummary: string;
  history: { role: string; content: string }[];
  userMessage: string;
}): Promise<string> {
  return await convexClient.action(api.tripActions.chatWithWander, opts);
}

export async function saveTrip(opts: {
  token: string;
  name: string;
  destination: string;
  destinationInfo: DestinationInfo;
  pinnedCards: DiscoveryCard[];
  chatHistory: { role: string; content: string }[];
  itinerary?: string;
}): Promise<Id<"trips">> {
  return await convexClient.mutation(api.tripData.saveTrip, opts);
}

export async function fetchCardImages(
  queries: { id: string; query: string }[],
): Promise<Record<string, string>> {
  return await convexClient.action(api.tripActions.fetchCardImages, { queries });
}

export async function updateTrip(opts: {
  token: string;
  tripId: string;
  name: string;
  destinationInfo: DestinationInfo;
  pinnedCards: DiscoveryCard[];
  chatHistory: { role: string; content: string }[];
  itinerary?: string;
}): Promise<void> {
  await convexClient.mutation(api.tripData.updateTrip, {
    ...opts,
    tripId: opts.tripId as Id<"trips">,
  });
}

export async function deleteTrip(token: string, tripId: string): Promise<void> {
  await convexClient.mutation(api.tripData.deleteTrip, {
    token,
    tripId: tripId as Id<"trips">,
  });
}

export async function listTrips(token: string): Promise<SavedTrip[]> {
  const raw = await convexClient.query(api.tripData.listTrips, { token });
  return (raw ?? []).map((t: any) => ({ ...t, id: t.id as string }));
}

export async function getNearestAirport(city: string, country: string): Promise<string | null> {
  return await convexClient.action(api.tripActions.getNearestAirport, { city, country });
}

export async function getTrip(token: string, tripId: string) {
  return await convexClient.query(api.tripData.getTrip, {
    token,
    tripId: tripId as Id<"trips">,
  });
}
