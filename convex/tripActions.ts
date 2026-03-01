"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { geocodingProvider } from "./providers/geocoding";
import { placesProvider, type PlaceType, type RawPlace, type AllPlacesResult } from "./providers/places";
import { imageProvider } from "./providers/images";

// ── OpenRouter helper ─────────────────────────────────────────────────────────

async function callOpenRouter(
  messages: { role: string; content: string }[],
  opts: { jsonMode?: boolean; model?: string } = {},
): Promise<string> {
  const model = opts.model ?? "openai/gpt-4o-mini";
  const body: Record<string, unknown> = { model, messages };
  if (opts.jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://voyager.app",
      "X-Title": "Voyager Trip Planner",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices[0].message.content as string;
}

function extractJSON(text: string): unknown {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("No JSON object found in AI response");
  return JSON.parse(m[0]);
}

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

// ── Shared types (mirrored from src/types/trips.ts) ───────────────────────────

export interface DiscoveryCard {
  id: string;
  type: string;
  title: string;
  description: string;
  tags: string[];
  rating?: number;
  priceRange?: string;
  neighborhood?: string;
  cuisine?: string;
  category?: string;
  vibe?: string;
  pricePerNight?: string;
  lat?: number;
  lng?: number;
  image?: string;
}

export interface DestinationInfo {
  city: string;
  country: string;
  description: string;
  bestTime?: string;
  highlights: string[];
  lat?: number;
  lng?: number;
}

export interface EnrichResult {
  info: DestinationInfo;
  cards: DiscoveryCard[];
}

// ── Card building helpers ─────────────────────────────────────────────────────

function buildDescription(place: RawPlace, type: PlaceType, city: string): string {
  const loc = place.neighborhood
    ? `in the ${place.neighborhood} neighborhood`
    : `in ${city}`;
  switch (type) {
    case "restaurant":
      return place.cuisine
        ? `A ${place.cuisine} restaurant ${loc}.`
        : `A local dining spot ${loc}.`;
    case "landmark":
      return place.category
        ? `A ${place.category} ${loc}.`
        : `A notable attraction ${loc}.`;
    case "nightlife":
      return place.vibe ? `A ${place.vibe} ${loc}.` : `A nightlife venue ${loc}.`;
    case "hotel":
      return `Accommodation ${loc}.`;
    default:
      return `Located ${loc}.`;
  }
}

function rawToCard(place: RawPlace, type: PlaceType, city: string, index: number): DiscoveryCard {
  return {
    id: `${type}-${index}-${uid()}`,
    type,
    title: place.name,
    description: buildDescription(place, type, city),
    tags: place.tags,
    lat: place.lat,
    lng: place.lng,
    rating: place.rating,
    priceRange: place.priceRange,
    neighborhood: place.neighborhood,
    cuisine: place.cuisine,
    category: place.category,
    vibe: place.vibe,
  };
}

function settled<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

// ── enrichDestination ─────────────────────────────────────────────────────────

export const enrichDestination = action({
  args: { destination: v.string() },
  handler: async (_ctx, args): Promise<EnrichResult> => {
    // 1. Real geocoding via Nominatim
    const geo = await geocodingProvider.geocode(args.destination);
    if (!geo) {
      throw new Error(
        `Couldn't find "${args.destination}". Try a more specific location.`,
      );
    }

    // 2. ONE combined Overpass query + AI info in parallel
    //    (Overpass caps at 2 simultaneous connections — combining avoids rate-limiting)
    const aiPrompt = `Destination: "${geo.city}, ${geo.country}" (lat: ${geo.lat}, lng: ${geo.lng})

Return ONLY valid JSON (no markdown):
{
  "description": "2-3 engaging sentences about this destination",
  "bestTime": "e.g. April to June",
  "highlights": ["5 unique cultural/experiential highlights"],
  "airbnbs": [
    {
      "id": "airbnb-1",
      "type": "airbnb",
      "title": "Cozy Studio in [Neighborhood]",
      "description": "2 sentence description of the space",
      "pricePerNight": "$120/night",
      "neighborhood": "Neighborhood Name",
      "rating": 4.8,
      "tags": ["wifi", "kitchen", "city views"],
      "lat": ${geo.lat + 0.004},
      "lng": ${geo.lng + 0.003}
    }
  ]
}
Generate exactly 5 airbnb listings. Use varied home types in titles (studio, loft, apartment, cottage, penthouse). Use realistic prices ($60–$350/night). Spread coordinates within 0.02° of lat/lng.`;

    const [placesR, aiRaw] = await Promise.allSettled([
      placesProvider.searchAll({ lat: geo.lat, lng: geo.lng }),
      callOpenRouter([{ role: "user", content: aiPrompt }], { jsonMode: true }),
    ]);

    // 3. Parse AI result
    let aiData: {
      description?: string;
      bestTime?: string;
      highlights?: string[];
      airbnbs?: DiscoveryCard[];
    } = {};
    if (aiRaw.status === "fulfilled") {
      try {
        aiData = extractJSON(aiRaw.value) as typeof aiData;
      } catch { /* keep empty defaults */ }
    }

    // 4. Convert OSM results → DiscoveryCards
    const places: AllPlacesResult = settled(placesR, {
      restaurant: [], landmark: [], nightlife: [], hotel: [],
    });

    const cards: DiscoveryCard[] = [
      ...places.restaurant.map((p, i) => rawToCard(p, "restaurant", geo.city, i)),
      ...places.landmark.map((p, i) => rawToCard(p, "landmark", geo.city, i)),
      ...places.nightlife.map((p, i) => rawToCard(p, "nightlife", geo.city, i)),
      ...places.hotel.map((p, i) => rawToCard(p, "hotel", geo.city, i)),
      ...(aiData.airbnbs ?? []).map((c, i) => ({
        ...c,
        id: `airbnb-${i}-${uid()}`,
        type: "airbnb",
      })),
    ];

    return {
      info: {
        city: geo.city,
        country: geo.country,
        description: aiData.description ?? `${geo.city} is a wonderful destination worth exploring.`,
        bestTime: aiData.bestTime,
        highlights: aiData.highlights ?? [],
        lat: geo.lat,
        lng: geo.lng,
      },
      cards,
    };
  },
});

// ── fetchCardImages ───────────────────────────────────────────────────────────
// Called separately after cards are displayed so the initial load stays fast.
// Returns a map of cardId → image URL for successful fetches.

export const fetchCardImages = action({
  args: {
    queries: v.array(v.object({ id: v.string(), query: v.string() })),
  },
  handler: async (_ctx, args): Promise<Record<string, string>> => {
    const results = await Promise.allSettled(
      args.queries.map(async ({ id, query }) => {
        const image = await imageProvider.search(query);
        return { id, image };
      }),
    );

    const map: Record<string, string> = {};
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.image) {
        map[r.value.id] = r.value.image;
      }
    }
    return map;
  },
});

// ── generateMoreCards ─────────────────────────────────────────────────────────

export const generateMoreCards = action({
  args: {
    city: v.string(),
    country: v.string(),
    category: v.string(),
    existingTitles: v.array(v.string()),
    cityLat: v.optional(v.number()),
    cityLng: v.optional(v.number()),
  },
  handler: async (_ctx, args): Promise<DiscoveryCard[]> => {
    // "all" filter maps to landmark for Overpass
    const placeType = (
      args.category === "attraction" ? "landmark" : args.category
    ) as PlaceType;

    // Airbnbs aren't in OSM — always use AI
    if (placeType !== "airbnb" && args.cityLat && args.cityLng) {
      const raw = await placesProvider
        .search({
          lat: args.cityLat,
          lng: args.cityLng,
          type: placeType,
          radiusMeters: 10000, // wider than initial 5 km to find new results
          limit: 30,
        })
        .catch(() => [] as RawPlace[]);

      const fresh = raw
        .filter((p) => !args.existingTitles.includes(p.name))
        .slice(0, 8);

      if (fresh.length >= 4) {
        return fresh.map((p, i) => rawToCard(p, placeType, args.city, i));
      }
      // Fall through to AI if Overpass didn't return enough new results
    }

    // AI fallback (always used for airbnbs, and as fallback for other types)
    const typeHints: Record<string, string> = {
      restaurant: 'Include "cuisine", "priceRange" ($-$$$$), "rating", "neighborhood", "tags".',
      landmark: 'Include "category" (Museum/Historic Site/etc), "rating", "neighborhood", "tags".',
      nightlife: 'Include "vibe" (e.g. rooftop bar), "priceRange", "rating", "neighborhood", "tags".',
      hotel: 'Include "pricePerNight" (e.g. "$200/night"), "rating", "neighborhood", "tags".',
      airbnb:
        'Include home type in title (e.g. "Cozy Studio in ..."). Include "pricePerNight", "rating", "neighborhood", "tags".',
    };

    const prompt = `You are a travel expert. Generate 8 more ${args.category} options in ${args.city}, ${args.country}.

Do NOT repeat these: ${args.existingTitles.slice(0, 20).join(", ")}.

Return ONLY a valid JSON array (no markdown):
[
  {
    "id": "unique-slug",
    "type": "${args.category}",
    "title": "Name",
    "description": "2 sentence description",
    "tags": ["tag1", "tag2"],
    "lat": ${(args.cityLat ?? 0) + (Math.random() - 0.5) * 0.04},
    "lng": ${(args.cityLng ?? 0) + (Math.random() - 0.5) * 0.04}
  }
]

${typeHints[args.category] ?? ""}
Use realistic coordinates near the city center. Make details specific to ${args.city}.`;

    const raw = await callOpenRouter([{ role: "user", content: prompt }]);

    const m = raw.match(/\[[\s\S]*\]/);
    if (!m) return [];

    const cards = JSON.parse(m[0]) as DiscoveryCard[];
    return cards.map((c, i) => ({
      ...c,
      id: `${args.category}-more-${i}-${uid()}`,
    }));
  },
});

// ── getNearestAirport ─────────────────────────────────────────────────────────
// Uses AI to reliably identify the nearest major commercial airport IATA code.
// Overpass/OSM iata tags are sparsely populated, so AI is more dependable here.

export const getNearestAirport = action({
  args: { city: v.string(), country: v.string() },
  handler: async (_ctx, args): Promise<string | null> => {
    try {
      const raw = await callOpenRouter([
        {
          role: "user",
          content: `What is the IATA code of the nearest major commercial airport to ${args.city}, ${args.country}? Reply with ONLY the 3-letter IATA code and nothing else. Example: DFW`,
        },
      ], { model: "openai/gpt-4o-mini" });

      // Extract the first 3-letter uppercase code from the response
      const match = raw.trim().match(/\b([A-Z]{3})\b/);
      return match?.[1] ?? null;
    } catch {
      return null;
    }
  },
});

// ── chatWithWander ────────────────────────────────────────────────────────────

export const chatWithWander = action({
  args: {
    destination: v.string(),
    city: v.string(),
    pinnedSummary: v.string(),
    history: v.array(v.object({ role: v.string(), content: v.string() })),
    userMessage: v.string(),
  },
  handler: async (_ctx, args): Promise<string> => {
    const system = `You are Wander 🧭, an enthusiastic and knowledgeable AI travel companion. You help users plan amazing trips with personalized recommendations and detailed itineraries.

Current trip context:
- Destination: ${args.destination}
- User's pinned interests: ${args.pinnedSummary || "none yet"}

Guidelines:
- Be warm, specific, and conversational
- When creating itineraries, use a clear day-by-day format with timings
- Reference the user's pinned items when relevant
- Keep responses focused but rich in useful detail
- Use your web search capability to provide up-to-date information about opening hours, prices, and current events
- Occasionally use travel-related emoji for personality`;

    const messages = [
      { role: "system", content: system },
      ...args.history,
      { role: "user", content: args.userMessage },
    ];

    // perplexity/sonar has live web search built in via OpenRouter
    return await callOpenRouter(messages, { model: "perplexity/sonar" });
  },
});
