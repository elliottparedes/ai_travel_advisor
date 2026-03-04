export interface ListItem {
  fsqId?: string;
  title: string;
  type: string;
  city: string;
  country: string;
  image?: string;
  imageFallbacks?: string[];
  neighborhood?: string;
  rating?: number;
  priceRange?: string;
  lat?: number;
  lng?: number;
  addedAt: number;
}

export interface UserList {
  id: string;
  name: string;
  emoji: string;
  items: ListItem[];
  createdAt: number;
}

export const LIST_TEMPLATES = [
  { emoji: "⭐", name: "Favorites" },
  { emoji: "🤍", name: "Wish List" },
  { emoji: "✅", name: "Been There" },
  { emoji: "📍", name: "Want to Visit" },
];

export const LIST_EMOJIS = ["⭐", "🤍", "✅", "📍", "🍽", "🏛", "🌙", "🏨", "☕", "🌿"];
