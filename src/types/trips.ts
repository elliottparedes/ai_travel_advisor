export type CardType = "restaurant" | "landmark" | "nightlife" | "hotel" | "airbnb";

export interface DiscoveryCard {
  id: string;
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
  createdAt: number;
}

export const CARD_FILTERS: { key: CardType | "all"; label: string; emoji: string }[] = [
  { key: "all", label: "All", emoji: "✦" },
  { key: "restaurant", label: "Restaurants", emoji: "🍽" },
  { key: "landmark", label: "Landmarks", emoji: "🏛" },
  { key: "nightlife", label: "Nightlife", emoji: "🌙" },
  { key: "hotel", label: "Hotels", emoji: "🏨" },
  { key: "airbnb", label: "Airbnb", emoji: "🏠" },
];

export const CARD_GRADIENTS: Record<string, string> = {
  restaurant: "linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)",
  landmark: "linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)",
  nightlife: "linear-gradient(135deg, #6d28d9 0%, #1e1b4b 100%)",
  hotel: "linear-gradient(135deg, #0d9488 0%, #059669 100%)",
  airbnb: "linear-gradient(135deg, #f43f5e 0%, #db2777 100%)",
};

export const CARD_ICONS: Record<string, string> = {
  restaurant: "M18.6 3H5.4C4.1 3 3 4.1 3 5.4v.2C3 9.1 5.5 12.4 9 13.7V19H7v2h10v-2h-2v-5.3c3.5-1.3 6-4.6 6-8.1v-.2C21 4.1 19.9 3 18.6 3z",
  landmark: "M12 3L2 12h3v9h6v-5h2v5h6v-9h3L12 3zm0 2.5l7 6.3V19h-3v-5H8v5H5v-7.2l7-6.3z",
  nightlife: "M12 3v10.55A4 4 0 1 0 14 17V5h4V3h-6zm-2 16a2 2 0 1 1 0-4 2 2 0 0 1 0 4z",
  hotel: "M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z",
  airbnb: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
};
