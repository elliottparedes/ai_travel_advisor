import { action } from "./_generated/server";
import { v } from "convex/values";

export const searchFlights = action({
  args: {
    from_airport: v.string(),
    to_airport: v.string(),
    date: v.string(),
    return_date: v.optional(v.string()),
    trip: v.optional(
      v.union(
        v.literal("one-way"),
        v.literal("round-trip"),
        v.literal("multi-city"),
      ),
    ),
    seat: v.optional(
      v.union(
        v.literal("economy"),
        v.literal("premium-economy"),
        v.literal("business"),
        v.literal("first"),
      ),
    ),
    adults: v.optional(v.number()),
    children: v.optional(v.number()),
    infants_in_seat: v.optional(v.number()),
    infants_on_lap: v.optional(v.number()),
    max_stops: v.optional(v.number()),
    fetch_mode: v.optional(
      v.union(
        v.literal("common"),
        v.literal("fallback"),
        v.literal("force-fallback"),
        v.literal("local"),
      ),
    ),
  },
  handler: async (_ctx, args) => {
    const baseUrl = process.env.FLIGHT_API_URL;
    if (!baseUrl) throw new Error("FLIGHT_API_URL environment variable not set");

    const params = new URLSearchParams({
      from_airport: args.from_airport,
      to_airport: args.to_airport,
      date: args.date,
    });

    if (args.return_date) params.set("return_date", args.return_date);
    if (args.trip) params.set("trip", args.trip);
    if (args.seat) params.set("seat", args.seat);
    if (args.adults !== undefined) params.set("adults", String(args.adults));
    if (args.children !== undefined) params.set("children", String(args.children));
    if (args.infants_in_seat !== undefined) params.set("infants_in_seat", String(args.infants_in_seat));
    if (args.infants_on_lap !== undefined) params.set("infants_on_lap", String(args.infants_on_lap));
    if (args.max_stops !== undefined) params.set("max_stops", String(args.max_stops));
    if (args.fetch_mode) params.set("fetch_mode", args.fetch_mode);

    const response = await fetch(`${baseUrl}/flights?${params.toString()}`);

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Flight API error ${response.status}: ${body}`);
    }

    return await response.json();
  },
});
