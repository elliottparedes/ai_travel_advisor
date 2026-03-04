export type CardType = "restaurant" | "landmark" | "nightlife" | "hotel" | "coffee" | "outdoor" | "shopping" | "entertainment";

export interface DiscoveryCard {
  id: string;
  fsqId?: string;
  type: CardType | string;
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
  imageFallbacks?: string[];
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

export interface ChatMessage {
  id: string;
  role: "user" | "wander";
  content: string;
  timestamp: number;
}

export interface SavedTrip {
  id: string;
  name: string;
  destination: string;
  city: string;
  country: string;
  pinnedCount: number;
  pinnedImages?: string[];
  createdAt: number;
}

export interface PlaceDetails {
  website?: string;
  tel?: string;
}

export const CARD_FILTERS: { key: CardType; label: string; emoji: string }[] = [
  { key: "restaurant",    label: "Restaurants",   emoji: "🍽" },
  { key: "coffee",        label: "Coffee & Cafés", emoji: "☕" },
  { key: "nightlife",     label: "Nightlife",     emoji: "🌙" },
  { key: "landmark",      label: "Landmarks",     emoji: "🏛" },
  { key: "outdoor",       label: "Outdoors",      emoji: "🌿" },
  { key: "shopping",      label: "Shopping",      emoji: "🛍" },
  { key: "entertainment", label: "Entertainment", emoji: "🎭" },
  { key: "hotel",         label: "Hotels",        emoji: "🏨" },
];

export const CARD_GRADIENTS: Record<string, string> = {
  restaurant:    "linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)",
  landmark:      "linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)",
  nightlife:     "linear-gradient(135deg, #6d28d9 0%, #1e1b4b 100%)",
  hotel:         "linear-gradient(135deg, #0d9488 0%, #059669 100%)",
  coffee:        "linear-gradient(135deg, #78350f 0%, #b45309 100%)",
  outdoor:       "linear-gradient(135deg, #14532d 0%, #16a34a 100%)",
  shopping:      "linear-gradient(135deg, #9d174d 0%, #db2777 100%)",
  entertainment: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
};

export const CARD_ICONS: Record<string, string> = {
  restaurant:    "M18.6 3H5.4C4.1 3 3 4.1 3 5.4v.2C3 9.1 5.5 12.4 9 13.7V19H7v2h10v-2h-2v-5.3c3.5-1.3 6-4.6 6-8.1v-.2C21 4.1 19.9 3 18.6 3z",
  landmark:      "M12 3L2 12h3v9h6v-5h2v5h6v-9h3L12 3zm0 2.5l7 6.3V19h-3v-5H8v5H5v-7.2l7-6.3z",
  nightlife:     "M12 3v10.55A4 4 0 1 0 14 17V5h4V3h-6zm-2 16a2 2 0 1 1 0-4 2 2 0 0 1 0 4z",
  hotel:         "M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z",
  coffee:        "M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4v-2z",
  outdoor:       "M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-12.37l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0zM7.05 18.36l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0z",
  shopping:      "M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-8 4c0 .55-.45 1-1 1s-1-.45-1-1V8h2v2zm2-6c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm4 6c0 .55-.45 1-1 1s-1-.45-1-1V8h2v2z",
  entertainment: "M8 5v14l11-7z",
};
