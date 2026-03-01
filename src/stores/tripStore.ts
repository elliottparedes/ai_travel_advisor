import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { DiscoveryCard, DestinationInfo, ChatMessage, CardType } from "../types/trips";
import * as tripsApi from "../api/tripsApi";
import { useAuthStore } from "./authStore";

const PAGE_SIZE = 12;

export const useTripStore = defineStore("trip", () => {
  // ── Wizard navigation ──────────────────────────────────────────────────────
  const step = ref<1 | 2 | 3>(1);

  // ── Step 1 ─────────────────────────────────────────────────────────────────
  const destinationInput = ref("");
  const isEnriching = ref(false);
  const enrichError = ref("");

  // ── Step 2 ─────────────────────────────────────────────────────────────────
  const destinationInfo = ref<DestinationInfo | null>(null);
  const allCards = ref<DiscoveryCard[]>([]);
  const pinnedIds = ref<Set<string>>(new Set());
  const activeFilter = ref<CardType | "all">("all");
  const visibleCount = ref(PAGE_SIZE);
  const isLoadingMore = ref(false);

  // ── Step 3 ─────────────────────────────────────────────────────────────────
  const savedTripName = ref<string | null>(null);
  const pinJustAdded = ref(false);
  const chatMessages = ref<ChatMessage[]>([]);
  const isChatting = ref(false);
  const chatHistory = ref<{ role: string; content: string }[]>([]);
  const savedTripId = ref<string | null>(null);
  const isSaving = ref(false);

  // ── Computed ───────────────────────────────────────────────────────────────
  const filteredCards = computed(() => {
    if (activeFilter.value === "all") return allCards.value;
    return allCards.value.filter((c) => c.type === activeFilter.value);
  });

  const displayedCards = computed(() =>
    filteredCards.value.slice(0, visibleCount.value),
  );

  const pinnedCards = computed(() =>
    allCards.value.filter((c) => pinnedIds.value.has(c.id)),
  );

  const hasMoreToShow = computed(
    () => visibleCount.value < filteredCards.value.length,
  );

  // ── Actions ────────────────────────────────────────────────────────────────
  async function enrich() {
    if (!destinationInput.value.trim()) return;
    isEnriching.value = true;
    enrichError.value = "";
    try {
      const result = await tripsApi.enrichDestination(destinationInput.value.trim());
      destinationInfo.value = result.info;
      allCards.value = result.cards;
      pinnedIds.value = new Set();
      visibleCount.value = PAGE_SIZE;
      activeFilter.value = "all";
      step.value = 2;
      // Fetch images in the background — cards update reactively as they arrive
      _fetchImages(result.cards, result.info.city);
    } catch (err) {
      enrichError.value = err instanceof Error ? err.message : "Failed to load destination.";
    } finally {
      isEnriching.value = false;
    }
  }

  async function _fetchImages(cards: typeof allCards.value, city: string) {
    const queries = cards.slice(0, 16).map((c) => ({
      id: c.id,
      query: `${c.title} ${city}`,
    }));
    try {
      const images = await tripsApi.fetchCardImages(queries);
      allCards.value = allCards.value.map((c) =>
        images[c.id] ? { ...c, image: images[c.id] } : c,
      );
    } catch { /* images are optional — silently ignore failures */ }
  }

  function setFilter(f: CardType | "all") {
    activeFilter.value = f;
    visibleCount.value = PAGE_SIZE;
  }

  function togglePin(id: string) {
    if (pinnedIds.value.has(id)) {
      pinnedIds.value.delete(id);
    } else {
      pinnedIds.value.add(id);
      // Signal to the board that a new pin was added on an existing saved trip
      if (savedTripId.value) pinJustAdded.value = true;
    }
    // Trigger reactivity
    pinnedIds.value = new Set(pinnedIds.value);
  }

  async function loadMore() {
    if (isLoadingMore.value) return;

    if (hasMoreToShow.value) {
      visibleCount.value += PAGE_SIZE;
      return;
    }

    // Need fresh cards from AI
    if (!destinationInfo.value) return;
    isLoadingMore.value = true;
    try {
      const category = activeFilter.value === "all" ? "attraction" : activeFilter.value;
      const existing = allCards.value
        .filter((c) => activeFilter.value === "all" || c.type === activeFilter.value)
        .map((c) => c.title);

      const more = await tripsApi.generateMoreCards({
        city: destinationInfo.value.city,
        country: destinationInfo.value.country,
        category,
        existingTitles: existing,
        cityLat: destinationInfo.value.lat,
        cityLng: destinationInfo.value.lng,
      });
      allCards.value = [...allCards.value, ...more];
      visibleCount.value += PAGE_SIZE;
      _fetchImages(more, destinationInfo.value.city);
    } finally {
      isLoadingMore.value = false;
    }
  }

  function goToBoard() {
    step.value = 3;
    if (chatMessages.value.length === 0) _sendWanderGreeting();
  }

  async function _sendWanderGreeting() {
    if (!destinationInfo.value) return;
    const pinList = pinnedCards.value.map((c) => c.title).join(", ");
    const greeting = pinnedCards.value.length > 0
      ? `Hey there! I'm **Wander** 🧭, your AI travel companion. You've pinned some fantastic spots for **${destinationInfo.value.city}**! I see you're interested in ${pinList}. I can help you build the perfect itinerary, find hidden gems, or answer any questions. What would you like to do first?`
      : `Hey there! I'm **Wander** 🧭, your AI travel companion. I see you're planning a trip to **${destinationInfo.value.city}, ${destinationInfo.value.country}** — amazing choice! Try pinning some places you like, then I can help you craft the perfect itinerary. Or just ask me anything!`;

    chatMessages.value.push({
      id: `wander-${Date.now()}`,
      role: "wander",
      content: greeting,
      timestamp: Date.now(),
    });
  }

  async function sendMessage(content: string) {
    if (!destinationInfo.value || isChatting.value) return;
    isChatting.value = true;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: Date.now(),
    };
    chatMessages.value.push(userMsg);
    chatHistory.value.push({ role: "user", content });

    try {
      const reply = await tripsApi.chatWithWander({
        destination: `${destinationInfo.value.city}, ${destinationInfo.value.country}`,
        city: destinationInfo.value.city,
        pinnedSummary: pinnedCards.value.map((c) => c.title).join(", ") || "none",
        history: chatHistory.value.slice(-20), // keep last 20 messages to avoid token limits
        userMessage: content,
      });

      chatHistory.value.push({ role: "assistant", content: reply });
      chatMessages.value.push({
        id: `wander-${Date.now()}`,
        role: "wander",
        content: reply,
        timestamp: Date.now(),
      });
    } finally {
      isChatting.value = false;
    }
  }

  async function createItinerary() {
    const msg =
      pinnedCards.value.length > 0
        ? `Create a detailed day-by-day itinerary for my trip to ${destinationInfo.value?.city} based on my pinned interests: ${pinnedCards.value.map((c) => c.title).join(", ")}. Include timings, tips, and logistics.`
        : `Create a detailed day-by-day itinerary for ${destinationInfo.value?.city} covering the top experiences. Include timings, tips, and logistics.`;
    await sendMessage(msg);
  }

  async function save(name?: string) {
    const auth = useAuthStore();
    if (!auth.sessionToken || !destinationInfo.value) return null;
    isSaving.value = true;
    try {
      const tripName = name || `Trip to ${destinationInfo.value.city}`;

      if (savedTripId.value) {
        // Overwrite the existing trip
        await tripsApi.updateTrip({
          token: auth.sessionToken,
          tripId: savedTripId.value,
          name: tripName,
          destinationInfo: destinationInfo.value,
          pinnedCards: pinnedCards.value,
          chatHistory: chatHistory.value,
        });
        return savedTripId.value;
      }

      // First save — create a new trip
      const id = await tripsApi.saveTrip({
        token: auth.sessionToken,
        name: tripName,
        destination: destinationInput.value,
        destinationInfo: destinationInfo.value,
        pinnedCards: pinnedCards.value,
        chatHistory: chatHistory.value,
      });
      savedTripId.value = id as string;
      return id;
    } finally {
      isSaving.value = false;
    }
  }

  async function loadSavedTrip(tripId: string) {
    const auth = useAuthStore();
    if (!auth.sessionToken) return false;
    const raw = await tripsApi.getTrip(auth.sessionToken, tripId);
    if (!raw) return false;

    // Restore store state from saved trip
    destinationInput.value = raw.destination ?? "";
    destinationInfo.value = raw.destinationInfo;
    allCards.value = raw.pinnedCards ?? [];
    pinnedIds.value = new Set((raw.pinnedCards ?? []).map((c: any) => c.id));
    activeFilter.value = "all";
    visibleCount.value = PAGE_SIZE;
    chatHistory.value = raw.chatHistory ?? [];

    // Reconstruct chat messages from history so Wander's replies are visible
    chatMessages.value = (raw.chatHistory ?? []).map(
      (m: { role: string; content: string }, i: number) => ({
        id: `loaded-${i}`,
        role: m.role === "user" ? "user" : "wander",
        content: m.content,
        timestamp: Date.now() - (raw.chatHistory.length - i) * 1000,
      }),
    );

    savedTripId.value = tripId;
    savedTripName.value = raw.name ?? null;
    step.value = 3;
    return true;
  }

  function reset() {
    step.value = 1;
    destinationInput.value = "";
    destinationInfo.value = null;
    allCards.value = [];
    pinnedIds.value = new Set();
    activeFilter.value = "all";
    visibleCount.value = PAGE_SIZE;
    chatMessages.value = [];
    chatHistory.value = [];
    savedTripId.value = null;
    savedTripName.value = null;
    pinJustAdded.value = false;
    enrichError.value = "";
  }

  return {
    // state
    step, destinationInput, isEnriching, enrichError,
    destinationInfo, allCards, pinnedIds, activeFilter,
    visibleCount, isLoadingMore, chatMessages, isChatting,
    isSaving, savedTripId, savedTripName, pinJustAdded,
    // computed
    filteredCards, displayedCards, pinnedCards, hasMoreToShow,
    // actions
    enrich, setFilter, togglePin, loadMore, goToBoard,
    sendMessage, createItinerary, save, loadSavedTrip, reset,
  };
});
