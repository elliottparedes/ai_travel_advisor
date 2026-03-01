// ── Image provider ────────────────────────────────────────────────────────────
// Returns a single image URL for a search query.
//
// To swap to a paid API for production:
//   1. Implement the ImageProvider interface
//   2. Change the last line: export const imageProvider = yourImpl;
//
// DuckDuckGo image search is unofficial and may break.
// Recommended production alternatives: Unsplash API, Pexels API, Google Custom Search.

export interface ImageProvider {
  search(query: string): Promise<string | null>;
}

// ── DuckDuckGo (unofficial, free) ────────────────────────────────────────────
// Two-step: get vqd token from the search page, then fetch image results JSON.
const duckduckgo: ImageProvider = {
  async search(query: string): Promise<string | null> {
    try {
      // Step 1 — get the vqd token embedded in the search page HTML
      const pageRes = await fetch(
        `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        },
      );
      if (!pageRes.ok) return null;

      const html = await pageRes.text();
      // vqd appears as vqd='3-...' or vqd="3-..." or vqd=3-...
      const match = html.match(/vqd=['"]?([^'"&\s]+)['"]?/);
      if (!match) return null;
      const vqd = match[1];

      // Step 2 — fetch image results
      const imgRes = await fetch(
        `https://duckduckgo.com/i.js` +
          `?q=${encodeURIComponent(query)}&vqd=${encodeURIComponent(vqd)}` +
          `&o=json&p=1&s=0&u=bing&f=,,,&l=us-en`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Referer: "https://duckduckgo.com/",
          },
        },
      );
      if (!imgRes.ok) return null;

      const data = (await imgRes.json()) as {
        results?: { image: string; thumbnail: string }[];
      };

      return data.results?.[0]?.image ?? null;
    } catch {
      return null;
    }
  },
};

// ── Production swap (example: Unsplash) ──────────────────────────────────────
// const unsplash: ImageProvider = {
//   async search(query) {
//     const res = await fetch(
//       `https://api.unsplash.com/search/photos` +
//       `?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
//       { headers: { Authorization: `Client-ID ${process.env.UNSPLASH_KEY}` } },
//     );
//     const data = await res.json();
//     return data.results?.[0]?.urls?.regular ?? null;
//   },
// };

// ── Production swap (example: Pexels) ────────────────────────────────────────
// const pexels: ImageProvider = {
//   async search(query) {
//     const res = await fetch(
//       `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`,
//       { headers: { Authorization: process.env.PEXELS_KEY ?? "" } },
//     );
//     const data = await res.json();
//     return data.photos?.[0]?.src?.large ?? null;
//   },
// };

export const imageProvider: ImageProvider = duckduckgo;
