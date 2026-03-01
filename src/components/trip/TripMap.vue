<script setup lang="ts">
import { onMounted, onUnmounted, watch } from "vue";
import type { DiscoveryCard } from "../../types/trips";
import { CARD_GRADIENTS } from "../../types/trips";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const props = defineProps<{
  cards: DiscoveryCard[];
  pinnedIds: Set<string>;
  centerLat: number;
  centerLng: number;
}>();

const emit = defineEmits<{ togglePin: [id: string] }>();

// Marker colors per card type (must be CSS-safe hex for SVG)
const MARKER_COLORS: Record<string, string> = {
  restaurant: "#f59e0b",
  landmark: "#6366f1",
  nightlife: "#7c3aed",
  hotel: "#0d9488",
  airbnb: "#f43f5e",
};

function markerSvg(color: string, pinned: boolean): string {
  const fill = pinned ? "#ef4444" : color;
  const stroke = pinned ? "#b91c1c" : "#fff";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <ellipse cx="14" cy="34" rx="6" ry="2.5" fill="rgba(0,0,0,0.2)"/>
    <path d="M14 0C6.27 0 0 6.27 0 14c0 9.63 14 22 14 22S28 23.63 28 14C28 6.27 21.73 0 14 0z" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="6" fill="rgba(255,255,255,0.35)"/>
  </svg>`;
}

function makeIcon(color: string, pinned: boolean) {
  return L.divIcon({
    html: markerSvg(color, pinned),
    className: "",
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  });
}

let map: L.Map | null = null;
const markers: Map<string, L.Marker> = new Map();

onMounted(() => {
  if (!props.centerLat && !props.centerLng) return;

  map = L.map("trip-map", {
    center: [props.centerLat || 48.8566, props.centerLng || 2.3522],
    zoom: 13,
    zoomControl: true,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(map);

  addMarkers();

  // Wait for the slide-down transition (300ms) to finish before telling
  // Leaflet the true container size — otherwise the bottom half stays grey.
  setTimeout(() => map?.invalidateSize(), 320);
});

onUnmounted(() => {
  map?.remove();
  map = null;
});

function addMarkers() {
  if (!map) return;

  // Remove old markers
  markers.forEach((m) => m.remove());
  markers.clear();

  props.cards.forEach((card) => {
    if (!card.lat || !card.lng) return;
    const color = MARKER_COLORS[card.type] ?? "#6366f1";
    const pinned = props.pinnedIds.has(card.id);
    const icon = makeIcon(color, pinned);

    const marker = L.marker([card.lat, card.lng], { icon })
      .addTo(map!)
      .bindPopup(
        `<div style="font-family:system-ui;min-width:160px">
          <strong style="font-size:0.9rem">${card.title}</strong>
          <p style="font-size:0.75rem;color:#64748b;margin:4px 0 8px">${card.neighborhood ?? card.type}</p>
          ${card.rating ? `<span style="color:#f59e0b;font-size:0.8rem">★ ${card.rating}</span>` : ""}
          ${card.priceRange ? `<span style="font-size:0.8rem;margin-left:8px;color:#059669">${card.priceRange}</span>` : ""}
          <br><button onclick="window.__wanderPin('${card.id}')" style="margin-top:8px;padding:4px 12px;background:#6366f1;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.78rem">
            ${pinned ? "Unpin ♥" : "Pin ♡"}
          </button>
        </div>`,
      );

    markers.set(card.id, marker);
  });

  // Expose pin handler for popup buttons
  (window as any).__wanderPin = (id: string) => {
    emit("togglePin", id);
  };
}

// Re-render markers when cards or pins change
watch(
  () => [props.cards, props.pinnedIds] as const,
  () => addMarkers(),
  { deep: true },
);

watch(
  () => [props.centerLat, props.centerLng] as const,
  ([lat, lng]) => {
    if (map && lat && lng) map.setView([lat, lng], 13);
  },
);
</script>

<template>
  <div id="trip-map" style="width: 100%; height: 100%;" />
</template>
