// ── Geocoding provider ────────────────────────────────────────────────────────
// Converts a free-text destination ("Dallas", "Amalfi Coast") into
// lat/lng + normalised city/country strings.
//
// To swap to a paid API for production:
//   1. Implement the GeocodingProvider interface below
//   2. Change the last line: export const geocodingProvider = yourImpl;

export interface GeoResult {
  lat: number;
  lng: number;
  city: string;
  country: string;
}

export interface GeocodingProvider {
  geocode(query: string): Promise<GeoResult | null>;
}

// ── Nominatim (OpenStreetMap, free) ───────────────────────────────────────────

// Place types that represent actual cities/towns — ranked by preference
const CITY_TYPES = ["city", "administrative", "town", "village", "hamlet"];

const nominatim: GeocodingProvider = {
  async geocode(query: string): Promise<GeoResult | null> {
    // Fetch top 5 and pick the best match ourselves — limit=1 often picks a
    // tiny namesake town (e.g. "Fort Worth, MA") over the major city.
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "WanderTravelApp/1.0 (open-source trip planner)",
        "Accept-Language": "en",
      },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as any[];
    if (!data.length) return null;

    // Prefer results whose type is a city/town over other OSM classes
    const cityResult = data.find(
      (r: any) => r.class === "place" && CITY_TYPES.includes(r.type),
    );
    // Fall back to highest-importance result (Nominatim already sorts by importance desc)
    const r = cityResult ?? data[0];
    const addr = r.address ?? {};

    return {
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      city: addr.city ?? addr.town ?? addr.village ?? addr.county ?? query,
      country: addr.country ?? "",
    };
  },
};

// ── Production swap (example: Google Geocoding) ───────────────────────────────
// const googleGeocoding: GeocodingProvider = {
//   async geocode(query) {
//     const url = `https://maps.googleapis.com/maps/api/geocode/json` +
//       `?address=${encodeURIComponent(query)}&key=${process.env.GOOGLE_MAPS_KEY}`;
//     const res = await fetch(url);
//     const data = await res.json();
//     const r = data.results?.[0];
//     if (!r) return null;
//     return {
//       lat: r.geometry.location.lat,
//       lng: r.geometry.location.lng,
//       city: r.address_components.find((c: any) => c.types.includes("locality"))?.long_name ?? query,
//       country: r.address_components.find((c: any) => c.types.includes("country"))?.long_name ?? "",
//     };
//   },
// };

export const geocodingProvider: GeocodingProvider = nominatim;
