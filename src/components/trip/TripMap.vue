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

const emit = defineEmits<{ togglePin: [id: string]; selectCard: [card: DiscoveryCard] }>();

// Marker colors per card type (must be CSS-safe hex for SVG)
const MARKER_COLORS: Record<string, string> = {
  restaurant:    "#f59e0b",
  landmark:      "#6366f1",
  nightlife:     "#7c3aed",
  hotel:         "#0d9488",
  coffee:        "#b45309",
  outdoor:       "#16a34a",
  shopping:      "#db2777",
  entertainment: "#2563eb",
  airbnb:        "#f43f5e",
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
    zoomControl: false,
  });

  // CartoDB Dark Matter — minimal dark tiles, no API key required
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '© <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 20,
  }).addTo(map);

  // Zoom control bottom-right so it doesn't crowd the top
  L.control.zoom({ position: "bottomright" }).addTo(map);

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
        `<div style="font-family:system-ui;min-width:150px;color:#f1f5f9">
          <strong style="font-size:0.85rem;display:block;margin-bottom:2px">${card.title}</strong>
          <span style="font-size:0.72rem;color:#94a3b8;text-transform:capitalize">${card.neighborhood ?? card.type}</span>
          <div style="margin-top:5px;display:flex;align-items:center;gap:8px">
            ${card.rating ? `<span style="color:#f59e0b;font-size:0.78rem">★ ${card.rating}</span>` : ""}
            ${card.priceRange ? `<span style="font-size:0.78rem;color:#34d399">${card.priceRange}</span>` : ""}
          </div>
          <div style="margin-top:7px;display:flex;gap:6px">
            <button onclick="window.__wanderPin('${card.id}')" style="flex:1;padding:5px 0;background:#6366f1;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.75rem;font-weight:500">
              ${pinned ? "♥ Pinned" : "♡ Pin"}
            </button>
            <button onclick="window.__wanderSelect('${card.id}')" style="flex:1;padding:5px 0;background:rgba(255,255,255,0.08);color:#f1f5f9;border:1px solid rgba(255,255,255,0.15);border-radius:6px;cursor:pointer;font-size:0.75rem;font-weight:500">
              Open →
            </button>
          </div>
        </div>`,
        { className: "wander-popup" },
      );

    markers.set(card.id, marker);
  });

  // Expose handlers for popup buttons
  (window as any).__wanderPin = (id: string) => emit("togglePin", id);
  (window as any).__wanderSelect = (id: string) => {
    const card = props.cards.find(c => c.id === id);
    if (card) emit("selectCard", card);
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

<style>
/* Leaflet popup overrides — must be global (not scoped) */
.wander-popup .leaflet-popup-content-wrapper {
  background: #1a2235;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.45);
  padding: 0;
}

.wander-popup .leaflet-popup-content {
  margin: 10px 12px;
  color: #f1f5f9;
}

.wander-popup .leaflet-popup-tip {
  background: #1a2235;
}

.wander-popup .leaflet-popup-close-button {
  color: rgba(255,255,255,0.45) !important;
  top: 6px !important;
  right: 8px !important;
}

.wander-popup .leaflet-popup-close-button:hover {
  color: white !important;
  background: none !important;
}
</style>
