"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { geocodingProvider } from "./providers/geocoding";
import { placesProvider, type PlaceType, type RawPlace, type AllPlacesResult, type PlaceDetails } from "./providers/places";
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
  fsqId?: string;         // FSQ place ID — used to fetch photos
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
}

// ── Card building helpers ─────────────────────────────────────────────────────

function buildDescription(place: RawPlace, type: PlaceType, city: string): string {
  const loc = place.neighborhood
    ? `in the ${place.neighborhood} neighborhood`
    : `in ${city}`;
  switch (type) {
    case "restaurant":
      return place.cuisine ? `A ${place.cuisine} restaurant ${loc}.` : `A local dining spot ${loc}.`;
    case "landmark":
      return place.category ? `A ${place.category} ${loc}.` : `A notable attraction ${loc}.`;
    case "nightlife":
      return place.vibe ? `A ${place.vibe} ${loc}.` : `A nightlife venue ${loc}.`;
    case "hotel":
      return `Accommodation ${loc}.`;
    case "coffee":
      return place.category ? `A ${place.category.toLowerCase()} ${loc}.` : `A café ${loc}.`;
    case "outdoor":
      return place.category ? `${place.category} ${loc}.` : `An outdoor space ${loc}.`;
    case "shopping":
      return place.category ? `A ${place.category.toLowerCase()} ${loc}.` : `A shopping destination ${loc}.`;
    case "entertainment":
      return place.category ? `A ${place.category.toLowerCase()} ${loc}.` : `An entertainment venue ${loc}.`;
    default:
      return `Located ${loc}.`;
  }
}

function rawToCard(place: RawPlace, type: PlaceType, city: string, index: number): DiscoveryCard {
  return {
    id: `${type}-${index}-${uid()}`,
    fsqId: place.placeId,
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

// ── enrichDestination ─────────────────────────────────────────────────────────
// Only runs geocoding + AI description. No FSQ calls.
// Cards are fetched lazily per-tab via fetchCategoryPlaces.

export const enrichDestination = action({
  args: { destination: v.string() },
  handler: async (ctx, args): Promise<EnrichResult> => {
    // 1. Geocode the destination
    const geo = await geocodingProvider.geocode(args.destination);
    if (!geo) {
      throw new Error(
        `Couldn't find "${args.destination}". Try a more specific location.`,
      );
    }

    // 2. Check destination cache
    const cacheKey = `${geo.city.toLowerCase()},${geo.country.toLowerCase()}`;
    const cached = await ctx.runQuery(internal.cache.getDestinationCache, { key: cacheKey });
    if (cached) return { info: cached };

    // 3. AI destination info
    const aiPrompt = `Destination: "${geo.city}, ${geo.country}"

Return ONLY valid JSON (no markdown):
{
  "description": "2-3 engaging sentences about this destination",
  "bestTime": "e.g. April to June",
  "highlights": ["5 unique cultural/experiential highlights"]
}`;

    let aiData: { description?: string; bestTime?: string; highlights?: string[] } = {};
    try {
      const aiRaw = await callOpenRouter([{ role: "user", content: aiPrompt }], { jsonMode: true });
      aiData = extractJSON(aiRaw) as typeof aiData;
    } catch { /* keep empty defaults */ }

    const info: DestinationInfo = {
      city: geo.city,
      country: geo.country,
      description: aiData.description ?? `${geo.city} is a wonderful destination worth exploring.`,
      bestTime: aiData.bestTime,
      highlights: aiData.highlights ?? [],
      lat: geo.lat,
      lng: geo.lng,
    };

    // 4. Persist to cache (silent failure — don't block the response)
    await ctx.runMutation(internal.cache.upsertDestinationCache, { key: cacheKey, ...info }).catch(() => {});

    return { info };
  },
});

// ── Image cache version ───────────────────────────────────────────────────────
// Bump to invalidate all cached image URLs (e.g. after switching image providers).
// Old entries with different prefix are silently ignored — no DB cleanup needed.
const IMG_V = "v5:";

// ── fetchCardImages ───────────────────────────────────────────────────────────
// Returns a map of cardId → [url, fallback1, fallback2].
// Multiple URLs per card so the client can retry on image load failure.

export const fetchCardImages = action({
  args: {
    queries: v.array(v.object({
      id: v.string(),
      query: v.string(),
    })),
  },
  handler: async (ctx, args): Promise<Record<string, string[]>> => {
    const cacheKeys = args.queries.map(q => IMG_V + q.query);
    const cachedArr = await ctx.runQuery(internal.cache.getImageCacheMany, { queries: cacheKeys });
    const cached: Record<string, string[]> = {};
    for (const h of cachedArr) cached[h.query.slice(IMG_V.length)] = h.urls;

    const toCache: { query: string; urls: string[] }[] = [];
    const freshMap: Record<string, string[]> = {};

    const uniqueQueries = [...new Set(args.queries.map(q => q.query))];
    const misses = uniqueQueries.filter(q => !cached[q]);
    if (misses.length > 0) {
      const results = await Promise.allSettled(
        misses.map(async query => {
          const candidates = await imageProvider.searchMultiple(query, 6);
          const checks = await Promise.allSettled(
            candidates.map(url =>
              fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(3000) })
                .then(r => r.ok).catch(() => false)
            )
          );
          const verified = candidates.filter((_, i) =>
            checks[i].status === "fulfilled" && (checks[i] as PromiseFulfilledResult<boolean>).value
          );
          const images = (verified.length > 0 ? verified : candidates).slice(0, 3);
          return { query, images };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.images.length > 0) {
          freshMap[r.value.query] = r.value.images;
          toCache.push({ query: IMG_V + r.value.query, urls: r.value.images });
        }
      }
    }

    if (toCache.length > 0) {
      await ctx.runMutation(internal.cache.upsertImageCacheMany, { entries: toCache }).catch(() => {});
    }

    const map: Record<string, string[]> = {};
    for (const { id, query } of args.queries) {
      const urls = cached[query] || freshMap[query];
      if (urls?.length) map[id] = urls;
    }
    return map;
  },
});

// ── fetchPlacePhotos ──────────────────────────────────────────────────────────
// Returns up to N photo URLs for the detail panel.

export const fetchPlacePhotos = action({
  args: { query: v.string() },
  handler: async (ctx, { query }): Promise<string[]> => {
    const cacheKey = `${IMG_V}photos:${query}`;
    const cachedArr = await ctx.runQuery(internal.cache.getImageCacheMany, { queries: [cacheKey] });
    const cachedHit = cachedArr.find(h => h.query === cacheKey);
    if (cachedHit?.urls.length) return cachedHit.urls;

    const urls = await imageProvider.searchMultiple(`${query} restaurant bar cafe photos`, 5);
    if (urls.length > 0) {
      await ctx.runMutation(internal.cache.upsertImageCacheMany, { entries: [{ query: cacheKey, urls }] }).catch(() => {});
    }
    return urls;
  },
});

// ── getPlaceDetails ───────────────────────────────────────────────────────────

export const getPlaceDetails = action({
  args: { fsqId: v.string() },
  handler: async (ctx, { fsqId }): Promise<PlaceDetails> => {
    // Check cache first
    const cacheKey = `${IMG_V}details:${fsqId}`;
    const cachedArr = await ctx.runQuery(internal.cache.getImageCacheMany, { queries: [cacheKey] });
    const cachedHit = cachedArr.find(h => h.query === cacheKey);
    if (cachedHit?.urls.length) {
      try { return JSON.parse(cachedHit.urls[0]); } catch { /* fall through */ }
    }

    const details = await placesProvider.getPlaceDetails(fsqId);

    // Cache the result (reuse image cache table — stores arbitrary string arrays)
    if (details.website || details.tel) {
      await ctx.runMutation(internal.cache.upsertImageCacheMany, {
        entries: [{ query: cacheKey, urls: [JSON.stringify(details)] }],
      }).catch(() => {});
    }

    return details;
  },
});

// ── fetchCategoryPlaces ───────────────────────────────────────────────────────
// Lazy per-tab loading. "all" = proximity + classify. Specific type = targeted query.


// For nightlife, run 4 focused parallel queries instead of one broad query.
// FSQ text search matches category names, so "bar" returns Bar/Cocktail Bar/Dive Bar/etc.
// Each query fetches 1 page of 50; combined + deduped = 200 raw → ~100 actual nightlife venues.
// 4 targeted queries cover the full taxonomy:
// "bar"        → Bar + all sub-bars (Cocktail, Dive, Gay, Karaoke, Lounge, Sports, Rooftop, etc.)
// "nightclub"  → Night Club
// "brewery"    → Brewery + Winery (both appear in results)
// "dance club" → Country Dance Club, Dance Hall, Salsa Club (not covered by "bar")
const NIGHTLIFE_QUERIES = ["bar", "nightclub", "brewery", "dance club"];

// Coffee uses multiple focused queries to cover the full taxonomy:
// "coffee"       → Coffee Shop, Espresso Bar, Coffee Roaster
// "cafe"         → Café, Bakery Café, Internet Café
// "espresso bar" → Espresso Bar (not always caught by "coffee" text search)
const COFFEE_QUERIES = ["coffee", "cafe", "espresso bar"];

// Single text queries for other categories (reliable enough with one broad query).
const CATEGORY_QUERIES: Record<string, string> = {
  restaurant:    "restaurant",
  landmark:      "museum landmark historic monument",
  outdoor:       "park outdoor nature",
  shopping:      "boutique shopping mall store",
  entertainment: "arcade cinema bowling theater",
  hotel:         "hotel",
};

// These tabs use strictType=true (require positive classifyType match, drop everything else).
const STRICT_TYPE_TABS = new Set(["nightlife", "coffee"]);

export const fetchCategoryPlaces = action({
  args: {
    lat: v.number(),
    lng: v.number(),
    city: v.string(),
    category: v.string(),
    offset: v.number(),
    existingTitles: v.array(v.string()),
  },
  handler: async (_ctx, args): Promise<DiscoveryCard[]> => {
    if (!args.lat || !args.lng) return [];
    const existingSet = new Set(args.existingTitles);

    if (args.category === "all") {
      const result = await placesProvider.searchProximity({
        lat: args.lat, lng: args.lng, offset: args.offset,
      }).catch(() => null);
      if (!result) return [];

      const cards: DiscoveryCard[] = [];
      const types: PlaceType[] = ["restaurant", "landmark", "nightlife", "hotel", "coffee", "outdoor", "shopping", "entertainment"];
      for (const type of types) {
        for (const p of result[type]) {
          if (!existingSet.has(p.name)) cards.push(rawToCard(p, type, args.city, cards.length));
        }
      }
      return cards;
    }

    const type = args.category as PlaceType;
    // Expand radius as the user loads deeper: 15km → 25km → 35km → 50km (cap)
    const radiusMeters = Math.min(15000 + Math.floor(args.offset / 100) * 10000, 50000);

    // Nightlife and coffee use precise FSQ category IDs to avoid text-search contamination.
    // All other tabs use text query search.
    let searchOpts: Parameters<typeof placesProvider.search>[0];
    if (args.category === "nightlife") {
      searchOpts = {
        lat: args.lat, lng: args.lng, type,
        queries: NIGHTLIFE_QUERIES,
        radiusMeters, offset: args.offset, strictType: true,
      };
    } else if (args.category === "coffee") {
      searchOpts = {
        lat: args.lat, lng: args.lng, type,
        queries: COFFEE_QUERIES,
        radiusMeters, offset: args.offset, strictType: true,
      };
    } else {
      const query = CATEGORY_QUERIES[args.category];
      if (!query) return [];
      searchOpts = {
        lat: args.lat, lng: args.lng, type, query, radiusMeters,
        offset: args.offset, strictType: STRICT_TYPE_TABS.has(args.category),
      };
    }

    const places = await placesProvider
      .search(searchOpts)
      .catch(() => [] as RawPlace[]);

    return places
      .filter(p => !existingSet.has(p.name))
      .slice(0, 60)
      .map((p, i) => rawToCard(p, type, args.city, i));
  },
});

// ── getNearestAirport ─────────────────────────────────────────────────────────

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

    return await callOpenRouter(messages, { model: "perplexity/sonar" });
  },
});
