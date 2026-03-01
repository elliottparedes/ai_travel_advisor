import { convexClient } from "./client";
import { api } from "../../convex/_generated/api";
import type { FlightSearchParams, FlightSearchResponse } from "../types/flights";

export async function searchFlights(
  params: FlightSearchParams,
): Promise<FlightSearchResponse> {
  return await convexClient.action(api.flights.searchFlights, params);
}
