// ── Places provider ───────────────────────────────────────────────────────────
// Two modes:
//   search          — targeted query search for a specific type → per-tab lazy loading
//   searchProximity — general nearby search with classification (kept for legacy use)

export type PlaceType =
  | "restaurant" | "landmark" | "nightlife" | "hotel"
  | "coffee" | "outdoor" | "shopping" | "entertainment";

export interface RawPlace {
  id: string;
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  rating?: number;
  priceRange?: string;
  neighborhood?: string;
  tags: string[];
  cuisine?: string;
  category?: string;
  vibe?: string;
}

export interface AllPlacesResult {
  restaurant: RawPlace[];
  landmark: RawPlace[];
  nightlife: RawPlace[];
  hotel: RawPlace[];
  coffee: RawPlace[];
  outdoor: RawPlace[];
  shopping: RawPlace[];
  entertainment: RawPlace[];
}

export interface PlaceDetails {
  website?: string;
  tel?: string;
}

export interface PlacesProvider {
  // Targeted search.
  // Pass `queries` (array) to run multiple focused searches in parallel and deduplicate —
  // much higher signal than one broad multi-word query.
  // `strictType` requires a POSITIVE classifyType match; drops anything unclassifiable.
  search(opts: {
    lat: number;
    lng: number;
    type: PlaceType;
    query?: string;          // single text query
    queries?: string[];      // multiple text queries — run in parallel, results merged + deduplicated
    radiusMeters?: number;
    offset?: number;
    strictType?: boolean;
  }): Promise<RawPlace[]>;

  // Proximity search → classify results by category (legacy, used by fetchCategoryPlaces "all")
  searchProximity(opts: {
    lat: number;
    lng: number;
    radiusMeters?: number;
    offset?: number;
  }): Promise<AllPlacesResult>;

  // Fetch detailed info for a single place by FSQ ID
  getPlaceDetails(fsqId: string): Promise<PlaceDetails>;

  // Fetch user-uploaded photos for a place (guaranteed to be the exact venue)
  getPhotos(fsqId: string, limit: number): Promise<string[]>;
}

// ── Foursquare Places API ─────────────────────────────────────────────────────

const FSQ_BASE = "https://places-api.foursquare.com/places/search";
const FSQ_PLACE = "https://places-api.foursquare.com/places";

async function foursquareFetch(url: string): Promise<{ results: any[] }> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.FOURSQUARE_API_KEY ?? ""}`,
      "X-Places-Api-Version": "2025-06-17",
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Foursquare ${res.status}: ${await res.text().then(t => t.slice(0, 120))}`);
  }
  return res.json() as Promise<{ results: any[] }>;
}

// ── Category classification (used only for "All" tab proximity results) ───────

const COFFEE_RE       = /coffee|espresso|café|cafe|tea\s*room|tea\s*house|bubble\s*tea|\bboba\b|juice\s*bar|smoothie|bakery|patisserie|dessert\s*shop|donut|gelato|ice\s*cream|creamery|roaster/i;
const OUTDOOR_RE      = /\bpark\b|\bgarden\b|hiking|trail|nature\s*preserve|beach|dog\s*park|botanical|forest|\blake\b|waterfall|golf\s*course|recreation\s*center|campground/i;
const SHOPPING_RE     = /boutique|shopping\s*mall|shopping\s*center|department\s*store|clothing\s*store|fashion\s*retail|vintage\s*store|thrift\s*store|antique\s*store|souvenir|gift\s*shop|jewel|bookstore|toy\s*store|\bapparel\b/i;
const ENTERTAINMENT_RE = /cinema|movie\s*theater|\barcade\b|bowling|casino|escape\s*room|comedy\s*club|game\s*room|laser\s*tag|mini\s*golf|amusement/i;
const RESTAURANT_RE   = /restaurant|bistro|brasserie|diner|eatery|pizzeria|sushi|ramen|burger|steakhouse|kitchen|grill|taco|thai|chinese|indian|italian|french|japanese|korean|mexican|seafood|bbq|barbecue|buffet|mediterranean|greek|vietnamese|middle\s*eastern|ethiopian|lebanese|persian|turkish|spanish|cuban|caribbean|peruvian|colombian|latin|asian|african\s*restaurant|german|polish|fusion|\bfood\b/i;
const NIGHTLIFE_RE    = /\bbar\b|night\s*club|pub|brewery|winery|cidery|lounge|cocktail|speakeasy|tavern|saloon|disco|karaoke|jazz\s*club|beer\s*garden|biergarten|rooftop\s*bar|whisky|whiskey|gin|distillery|gay\s*bar|dance\s*club|dance\s*hall|salsa\s*club|latin\s*bar|strip\s*club|hookah\s*bar|dive\s*bar|gastropub|\bnightlife\b/i;
const HOTEL_RE        = /hotel|hostel|motel|resort|inn\b|lodge|bed\s*and\s*breakfast|b&b|guesthouse|guest\s*house|suites|apartment|condo|airbnb/i;
const LANDMARK_RE     = /museum|monument|landmark|theater|theatre|gallery|attraction|historic|plaza|square|church|cathedral|mosque|temple|castle|palace|stadium|amphitheater|memorial|viewpoint|ruins|zoo|aquarium|library|opera|fort|bridge|tower|basilica/i;

export function classifyType(categories: any[]): PlaceType | null {
  for (const cat of (categories ?? [])) {
    const name: string = cat.name ?? "";
    if (HOTEL_RE.test(name))         return "hotel";
    if (COFFEE_RE.test(name))        return "coffee";
    if (NIGHTLIFE_RE.test(name))     return "nightlife";
    if (RESTAURANT_RE.test(name))    return "restaurant";
    if (OUTDOOR_RE.test(name))       return "outdoor";
    if (SHOPPING_RE.test(name))      return "shopping";
    if (ENTERTAINMENT_RE.test(name)) return "entertainment";
    if (LANDMARK_RE.test(name))      return "landmark";
  }
  return null;
}

// ── Response parsing ──────────────────────────────────────────────────────────

const PRICE_MAP = ["$", "$$", "$$$", "$$$$"] as const;

const NIGHTLIFE_VIBES: Record<string, string> = {
  "Nightclub": "nightclub", "Bar": "bar", "Lounge": "lounge",
  "Pub": "pub", "Brewery": "brewery", "Winery": "winery",
  "Jazz Club": "jazz club", "Beer Garden": "beer garden",
  "Cocktail Bar": "cocktail bar", "Speakeasy": "speakeasy",
  "Gay Bar": "gay bar", "Dive Bar": "dive bar", "Sports Bar": "sports bar",
};

const CATEGORY_TYPES = new Set<PlaceType>(["landmark", "coffee", "outdoor", "shopping", "entertainment"]);

export function fsqToRawPlace(r: any, type: PlaceType): RawPlace | null {
  if (!r.name) return null;
  const lat = r.latitude;
  const lng = r.longitude;
  if (lat == null || lng == null) return null;

  const primaryCategory: string | undefined = r.categories?.[0]?.name;

  return {
    id: `fsq-${r.fsq_place_id}`,
    placeId: r.fsq_place_id,
    name: r.name,
    lat,
    lng,
    rating:     r.rating != null ? Math.round((r.rating / 2) * 10) / 10 : undefined,
    priceRange: r.price  != null ? PRICE_MAP[Math.min(r.price - 1, 3)] : undefined,
    neighborhood: r.location?.neighborhood ?? undefined,
    tags: (r.categories ?? []).slice(1, 4).map((c: any) => c.name as string),
    cuisine:  type === "restaurant" ? primaryCategory : undefined,
    category: CATEGORY_TYPES.has(type) ? primaryCategory : undefined,
    vibe:     type === "nightlife"
      ? (NIGHTLIFE_VIBES[primaryCategory ?? ""] ?? primaryCategory?.toLowerCase() ?? "bar")
      : undefined,
  };
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchNearby(lat: number, lng: number, radius: number, limit: number, offset = 0): Promise<any[]> {
  const url = `${FSQ_BASE}?ll=${lat},${lng}&radius=${radius}&limit=${Math.min(limit, 50)}&offset=${offset}`;
  return foursquareFetch(url).then(d => d.results ?? []).catch(() => []);
}

// ── Provider ──────────────────────────────────────────────────────────────────

const foursquare: PlacesProvider = {
  // Targeted search with optional strict type post-filtering
  async search({ lat, lng, type, query, queries, radiusMeters = 15000, offset = 0, strictType = false }) {
    let raw: any[];

    if (queries && queries.length > 0) {
      // Run each focused query in parallel (1 page each) — higher signal than one broad query.
      // FSQ text search matches category names too, so "bar" returns Bar/Cocktail Bar/Dive Bar/etc.
      const pages = await Promise.all(
        queries.map(q =>
          foursquareFetch(
            `${FSQ_BASE}?ll=${lat},${lng}&query=${encodeURIComponent(q)}&radius=${radiusMeters}&limit=50&offset=${offset}`
          ).then(d => d.results ?? []).catch(() => [])
        )
      );
      raw = pages.flat();
    } else {
      const base = `${FSQ_BASE}?ll=${lat},${lng}&query=${encodeURIComponent(query ?? "")}&radius=${radiusMeters}&limit=50`;
      const [p0, p1] = await Promise.all([
        foursquareFetch(`${base}&offset=${offset}`).then(d => d.results ?? []).catch(() => []),
        foursquareFetch(`${base}&offset=${offset + 50}`).then(d => d.results ?? []).catch(() => []),
      ]);
      raw = [...p0, ...p1];
    }

    const seen = new Set<string>();
    const results: RawPlace[] = [];
    for (const r of raw) {
      if (strictType) {
        // Require a POSITIVE match — drop anything classifyType doesn't confirm as this type.
        // Dropping nulls is intentional: unclassifiable venues (cinemas, museums, restaurants)
        // slip through otherwise since they don't match any negative pattern.
        const classified = classifyType(r.categories ?? []);
        if (classified !== type) continue;
      }
      const place = fsqToRawPlace(r, type);
      if (!place || seen.has(place.name)) continue;
      seen.add(place.name);
      results.push(place);
    }
    return results;
  },

  // Proximity with classification — used by "all" tab in fetchCategoryPlaces
  async searchProximity({ lat, lng, radiusMeters = 8000, offset = 0 }) {
    const [p0, p1] = await Promise.all([
      fetchNearby(lat, lng, radiusMeters, 50, offset),
      fetchNearby(lat, lng, radiusMeters, 50, offset + 50),
    ]);
    const raw = [...p0, ...p1];

    const limits: Record<PlaceType, number> = {
      restaurant: 20, landmark: 15, nightlife: 15, hotel: 8,
      coffee: 12, outdoor: 10, shopping: 8, entertainment: 8,
    };
    const result: AllPlacesResult = {
      restaurant: [], landmark: [], nightlife: [], hotel: [],
      coffee: [], outdoor: [], shopping: [], entertainment: [],
    };
    const seen: Record<PlaceType, Set<string>> = {
      restaurant: new Set(), landmark: new Set(), nightlife: new Set(), hotel: new Set(),
      coffee: new Set(), outdoor: new Set(), shopping: new Set(), entertainment: new Set(),
    };

    for (const r of raw) {
      const type = classifyType(r.categories ?? []);
      if (!type) continue;
      if (result[type].length >= limits[type]) continue;
      const place = fsqToRawPlace(r, type);
      if (!place || seen[type].has(place.name)) continue;
      seen[type].add(place.name);
      result[type].push(place);
    }

    return result;
  },

  // Fetch detailed info for a single place (Pro fields only — no Premium billing)
  async getPlaceDetails(fsqId: string): Promise<PlaceDetails> {
    const res = await fetch(
      `${FSQ_PLACE}/${fsqId}?fields=website,tel`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FOURSQUARE_API_KEY ?? ""}`,
          "X-Places-Api-Version": "2025-06-17",
          Accept: "application/json",
        },
      },
    );
    if (!res.ok) return {};
    const data = await res.json();
    return {
      website: data.website,
      tel:     data.tel,
    };
  },

  // Fetch user-uploaded photos for a place — exact venue match, no guessing
  async getPhotos(fsqId: string, limit: number): Promise<string[]> {
    const res = await fetch(
      `${FSQ_PLACE}/${fsqId}/photos?limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FOURSQUARE_API_KEY ?? ""}`,
          "X-Places-Api-Version": "2025-06-17",
          Accept: "application/json",
        },
      },
    );
    if (!res.ok) return [];
    const photos: any[] = await res.json();
    return photos
      .filter((p: any) => p.prefix && p.suffix)
      .map((p: any) => `${p.prefix}800x600${p.suffix}`);
  },
};

export const placesProvider: PlacesProvider = foursquare;
