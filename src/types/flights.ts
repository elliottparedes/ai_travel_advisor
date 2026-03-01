export type TripType = "one-way" | "round-trip" | "multi-city";
export type SeatClass = "economy" | "premium-economy" | "business" | "first";
export type FetchMode = "common" | "fallback" | "force-fallback" | "local";
export type PriceLevel = "low" | "typical" | "high";

export interface FlightResult {
  name: string;
  price: string;
  departure: string;
  arrival: string;
  arrival_time_ahead: string;
  duration: string;
  stops: number;
  delay: string | null;
  is_best: boolean;
}

export interface FlightSearchResponse {
  price_level: PriceLevel;
  book_url: string;
  flights: FlightResult[];
}

export interface FlightSearchParams {
  from_airport: string;
  to_airport: string;
  date: string;
  return_date?: string;
  trip?: TripType;
  seat?: SeatClass;
  adults?: number;
  children?: number;
  infants_in_seat?: number;
  infants_on_lap?: number;
  max_stops?: number;
  fetch_mode?: FetchMode;
}
