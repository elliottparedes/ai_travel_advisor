// ── Image provider ────────────────────────────────────────────────────────────
// search()         — returns a single image URL for a card background
// searchMultiple() — returns N images for the detail panel

export interface ImageProvider {
  search(query: string): Promise<string | null>;
  searchMultiple(query: string, count: number): Promise<string[]>;
}

// ── DuckDuckGo image search (unofficial 2-step hack) ─────────────────────────
// No API key required. Mildly flaky — results are cached aggressively (3 days)
// in the imageCache Convex table to minimise live calls.
// Step 1: hit the DDG HTML page to extract the vqd session token.
// Step 2: call i.js with that token to get JSON image results.

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function ddgSearch(query: string, count: number): Promise<string[]> {
  try {
    // Step 1 — get vqd token
    const initRes = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
      { headers: { "User-Agent": UA } },
    );
    if (!initRes.ok) return [];
    const html = await initRes.text();
    const vqdMatch = html.match(/vqd=["']?([^"'&\s]+)/);
    if (!vqdMatch?.[1]) return [];
    const vqd = vqdMatch[1];

    // Step 2 — fetch image results
    const imgRes = await fetch(
      `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&vqd=${encodeURIComponent(vqd)}&o=json&p=1&s=0&l=us-en&f=,,,,`,
      { headers: { "Referer": "https://duckduckgo.com/", "User-Agent": UA } },
    );
    if (!imgRes.ok) return [];
    const data = await imgRes.json() as { results?: any[] };
    return (data.results ?? [])
      .slice(0, count)
      .map((r: any) => (r.image ?? r.thumbnail) as string | undefined)
      .filter((u): u is string => Boolean(u));
  } catch {
    return [];
  }
}

const ddg: ImageProvider = {
  async search(query) {
    const results = await ddgSearch(query, 1);
    return results[0] ?? null;
  },
  async searchMultiple(query, count) {
    return ddgSearch(query, count);
  },
};

// ── Swap comments (paid providers when DDG is unreliable) ─────────────────────
// const pexels: ImageProvider = {
//   async search(query) {
//     const res = await fetch(
//       `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
//       { headers: { Authorization: process.env.PEXELS_API_KEY ?? "" } },
//     );
//     if (!res.ok) return null;
//     const data = await res.json() as { photos?: any[] };
//     return data.photos?.[0]?.src?.large ?? null;
//   },
//   async searchMultiple(query, count) {
//     const res = await fetch(
//       `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${Math.min(count, 80)}&orientation=landscape`,
//       { headers: { Authorization: process.env.PEXELS_API_KEY ?? "" } },
//     );
//     if (!res.ok) return [];
//     const data = await res.json() as { photos?: any[] };
//     return (data.photos ?? []).map((p: any) => p.src?.large).filter(Boolean);
//   },
// };
//
// const brave: ImageProvider = {
//   async search(query) {
//     const res = await fetch(
//       `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(query)}&count=1`,
//       { headers: { "X-Subscription-Token": process.env.BRAVE_API_KEY ?? "", "Accept": "application/json" } },
//     );
//     if (!res.ok) return null;
//     const data = await res.json() as { results?: any[] };
//     return data.results?.[0]?.thumbnail?.src ?? null;
//   },
//   async searchMultiple(query, count) {
//     const res = await fetch(
//       `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(query)}&count=${count}`,
//       { headers: { "X-Subscription-Token": process.env.BRAVE_API_KEY ?? "", "Accept": "application/json" } },
//     );
//     if (!res.ok) return [];
//     const data = await res.json() as { results?: any[] };
//     return (data.results ?? []).map((r: any) => r.thumbnail?.src).filter(Boolean);
//   },
// };

export const imageProvider: ImageProvider = ddg;
