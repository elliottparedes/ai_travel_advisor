// ── Places provider ───────────────────────────────────────────────────────────
// Returns real places (restaurants, landmarks, nightlife, hotels) near a lat/lng.
//
// To swap to a paid API for production:
//   1. Implement the PlacesProvider interface (search + searchAll)
//   2. Change the last line: export const placesProvider = yourImpl;
//
// NOTE: "airbnb" is not in OpenStreetMap — always returns [] and falls
//       back to AI generation in tripActions.ts.

export type PlaceType = "restaurant" | "landmark" | "nightlife" | "hotel" | "airbnb";

export interface RawPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  rating?: number;
  priceRange?: string;    // "$" | "$$" | "$$$" | "$$$$"
  neighborhood?: string;
  tags: string[];
  cuisine?: string;       // restaurants
  category?: string;      // landmarks
  vibe?: string;          // nightlife
}

export interface AllPlacesResult {
  restaurant: RawPlace[];
  landmark: RawPlace[];
  nightlife: RawPlace[];
  hotel: RawPlace[];
}

export interface PlacesProvider {
  // Single-type query — used by generateMoreCards
  search(opts: {
    lat: number;
    lng: number;
    type: PlaceType;
    radiusMeters?: number;
    limit?: number;
  }): Promise<RawPlace[]>;

  // Combined query — all 4 types in ONE request (avoids rate-limiting)
  searchAll(opts: {
    lat: number;
    lng: number;
    radiusMeters?: number;
  }): Promise<AllPlacesResult>;
}

// ── Overpass (OpenStreetMap, free) ────────────────────────────────────────────

// Single-type selectors (used by search / generateMoreCards)
// {R} → radius metres, {LAT}/{LNG} → coordinates
const SELECTORS: Record<PlaceType, string> = {
  restaurant: `
    node["amenity"="restaurant"](around:{R},{LAT},{LNG});
    way["amenity"="restaurant"](around:{R},{LAT},{LNG});`,
  landmark: `
    node["tourism"~"attraction|museum|gallery|viewpoint|artwork"](around:{R},{LAT},{LNG});
    node["historic"~"."](around:{R},{LAT},{LNG});
    node["amenity"~"theatre|cinema|library"](around:{R},{LAT},{LNG});
    way["tourism"~"attraction|museum|gallery"](around:{R},{LAT},{LNG});
    way["historic"~"."](around:{R},{LAT},{LNG});`,
  // Broadened — lounge, music_venue, jazz_cafe, social_club all count
  nightlife: `
    node["amenity"~"bar|nightclub|pub|biergarten|casino|lounge|music_venue|jazz_cafe|social_club"](around:{R},{LAT},{LNG});
    way["amenity"~"bar|nightclub|pub|biergarten|lounge|music_venue"](around:{R},{LAT},{LNG});`,
  hotel: `
    node["tourism"~"hotel|hostel|motel|guest_house|apartment"](around:{R},{LAT},{LNG});
    way["tourism"~"hotel|hostel|motel|guest_house"](around:{R},{LAT},{LNG});`,
  airbnb: ``,
};

// Combined selector for searchAll — ONE request, all four types
const ALL_SELECTORS = `
  node["amenity"="restaurant"](around:{R},{LAT},{LNG});
  way["amenity"="restaurant"](around:{R},{LAT},{LNG});
  node["tourism"~"attraction|museum|gallery|viewpoint|artwork"](around:{R},{LAT},{LNG});
  node["historic"~"."](around:{R},{LAT},{LNG});
  node["amenity"~"theatre|cinema|library"](around:{R},{LAT},{LNG});
  way["tourism"~"attraction|museum|gallery"](around:{R},{LAT},{LNG});
  way["historic"~"."](around:{R},{LAT},{LNG});
  node["amenity"~"bar|nightclub|pub|biergarten|casino|lounge|music_venue|jazz_cafe|social_club"](around:{R},{LAT},{LNG});
  way["amenity"~"bar|nightclub|pub|biergarten|lounge|music_venue"](around:{R},{LAT},{LNG});
  node["tourism"~"hotel|hostel|motel|guest_house|apartment"](around:{R},{LAT},{LNG});
  way["tourism"~"hotel|hostel|motel|guest_house"](around:{R},{LAT},{LNG});`;

// Priority order for classification — first match wins
function classifyType(tags: Record<string, string>): Exclude<PlaceType, "airbnb"> | null {
  const amenity = tags.amenity ?? "";
  const tourism = tags.tourism ?? "";

  if (amenity === "restaurant" || amenity === "cafe") return "restaurant";

  if (
    ["bar", "nightclub", "pub", "biergarten", "casino", "lounge",
     "music_venue", "jazz_cafe", "social_club"].includes(amenity)
  ) return "nightlife";

  if (
    ["hotel", "hostel", "motel", "guest_house", "apartment"].includes(tourism)
  ) return "hotel";

  if (
    ["attraction", "museum", "gallery", "viewpoint", "artwork",
     "theme_park", "zoo", "aquarium"].includes(tourism)
  ) return "landmark";

  if (tags.historic) return "landmark";

  if (
    ["theatre", "cinema", "library", "place_of_worship"].includes(amenity)
  ) return "landmark";

  return null;
}

function starsToPriceRange(stars?: string): string | undefined {
  const n = parseInt(stars ?? "");
  if (isNaN(n) || n < 1) return undefined;
  return (["$", "$$", "$$$", "$$$$"] as const)[Math.min(n - 1, 3)];
}

const NIGHTLIFE_VIBE: Record<string, string> = {
  nightclub: "nightclub",
  bar: "bar",
  pub: "pub",
  biergarten: "beer garden",
  casino: "casino",
  lounge: "lounge",
  music_venue: "live music venue",
  jazz_cafe: "jazz café",
  social_club: "social club",
};

function elementToRawPlace(el: any, type: PlaceType): RawPlace | null {
  const tags: Record<string, string> = el.tags ?? {};

  const name = tags.name || tags["name:en"];
  if (!name) return null;

  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat == null || lng == null) return null;

  const neighborhood =
    tags["addr:suburb"] ||
    tags["addr:neighbourhood"] ||
    tags["addr:city_district"] ||
    tags["addr:quarter"] ||
    undefined;

  const extraTags: string[] = [];
  if (tags.outdoor_seating === "yes") extraTags.push("outdoor seating");
  if (tags.wheelchair === "yes") extraTags.push("accessible");
  if (tags.takeaway === "yes") extraTags.push("takeaway");
  if (tags["internet_access"]) extraTags.push("wifi");
  if (tags.delivery === "yes") extraTags.push("delivery");
  if (tags.live_music === "yes") extraTags.push("live music");

  return {
    id: `osm-${el.type}-${el.id}`,
    name,
    lat,
    lng,
    rating: tags.stars ? Math.min(parseFloat(tags.stars), 5) : undefined,
    priceRange: starsToPriceRange(tags.stars),
    neighborhood,
    tags: extraTags.slice(0, 4),
    cuisine: tags.cuisine?.replace(/_/g, " "),
    category:
      tags.tourism?.replace(/_/g, " ") ||
      tags.historic?.replace(/_/g, " ") ||
      tags.amenity?.replace(/_/g, " ") ||
      undefined,
    vibe: type === "nightlife" ? (NIGHTLIFE_VIBE[tags.amenity ?? ""] ?? "bar") : undefined,
  };
}

async function overpassFetch(query: string): Promise<{ elements: any[] }> {
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) {
    throw new Error(`Overpass ${res.status}: ${await res.text().then(t => t.slice(0, 120))}`);
  }
  return res.json() as Promise<{ elements: any[] }>;
}

const overpass: PlacesProvider = {
  // Used by generateMoreCards — safe to call individually since it's one request
  async search({ lat, lng, type, radiusMeters = 5000, limit = 20 }) {
    if (type === "airbnb") return [];

    const sel = SELECTORS[type]
      .replace(/{R}/g, String(radiusMeters))
      .replace(/{LAT}/g, String(lat))
      .replace(/{LNG}/g, String(lng));
    const query = `[out:json][timeout:25];(${sel});out body center ${limit * 3};`;

    const data = await overpassFetch(query);

    const seen = new Set<string>();
    return data.elements
      .map((el) => elementToRawPlace(el, type))
      .filter((p): p is RawPlace => {
        if (!p || seen.has(p.name)) return false;
        seen.add(p.name);
        return true;
      })
      .slice(0, limit);
  },

  // Used by enrichDestination — ONE request for all 4 types, avoids rate-limiting
  async searchAll({ lat, lng, radiusMeters = 5000 }) {
    const sel = ALL_SELECTORS
      .replace(/{R}/g, String(radiusMeters))
      .replace(/{LAT}/g, String(lat))
      .replace(/{LNG}/g, String(lng));
    // Generous output limit: (20+16+12+10) * 3
    const query = `[out:json][timeout:30];(${sel});out body center 174;`;

    const data = await overpassFetch(query);

    const limits: Record<Exclude<PlaceType, "airbnb">, number> = {
      restaurant: 20,
      landmark: 16,
      nightlife: 12,
      hotel: 10,
    };

    const result: AllPlacesResult = { restaurant: [], landmark: [], nightlife: [], hotel: [] };
    const seen: Record<string, Set<string>> = {
      restaurant: new Set(),
      landmark: new Set(),
      nightlife: new Set(),
      hotel: new Set(),
    };

    for (const el of data.elements) {
      const tags = el.tags ?? {};
      const type = classifyType(tags);
      if (!type) continue;

      if (result[type].length >= limits[type]) continue;

      const place = elementToRawPlace(el, type);
      if (!place || seen[type].has(place.name)) continue;

      seen[type].add(place.name);
      result[type].push(place);
    }

    return result;
  },
};

// ── Production swap (example: Foursquare Places API) ─────────────────────────
// const FOURSQUARE_CATEGORIES: Partial<Record<PlaceType, string>> = {
//   restaurant: "13065", landmark: "16000", nightlife: "10032", hotel: "19014",
// };
// const foursquare: PlacesProvider = {
//   async search({ lat, lng, type, limit = 20 }) {
//     const cat = FOURSQUARE_CATEGORIES[type];
//     if (!cat) return [];
//     const url = `https://api.foursquare.com/v3/places/search?ll=${lat},${lng}&categories=${cat}&limit=${limit}`;
//     const res = await fetch(url, { headers: { Authorization: process.env.FOURSQUARE_KEY ?? "" } });
//     const data = await res.json();
//     return data.results.map((r: any): RawPlace => ({
//       id: `fsq-${r.fsq_id}`, name: r.name,
//       lat: r.geocodes.main.latitude, lng: r.geocodes.main.longitude,
//       neighborhood: r.location?.neighborhood?.[0],
//       tags: r.categories.map((c: any) => c.name),
//       category: r.categories[0]?.name,
//     }));
//   },
//   async searchAll({ lat, lng }) {
//     const types: PlaceType[] = ["restaurant", "landmark", "nightlife", "hotel"];
//     const results = await Promise.all(types.map(t => foursquare.search({ lat, lng, type: t })));
//     return Object.fromEntries(types.map((t, i) => [t, results[i]])) as AllPlacesResult;
//   },
// };

export const placesProvider: PlacesProvider = overpass;
