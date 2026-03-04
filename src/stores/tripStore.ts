import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { DiscoveryCard, DestinationInfo, ChatMessage, CardType } from "../types/trips";
import * as tripsApi from "../api/tripsApi";
import { useAuthStore } from "./authStore";

const PAGE_SIZE = 24;
const IMAGE_BATCH_SIZE = 8;

const TYPE_LABEL: Record<string, string> = {
  restaurant: "restaurant", coffee: "coffee shop", hotel: "hotel",
  landmark: "attraction", nightlife: "bar", outdoor: "park",
  shopping: "store", entertainment: "venue",
};

function buildImageQuery(card: DiscoveryCard, city: string): string {
  const parts = [card.title];
  if (card.cuisine) parts.push(card.cuisine);
  else if (card.category) parts.push(card.category);
  else parts.push(TYPE_LABEL[card.type] ?? card.type);
  if (card.neighborhood) parts.push(card.neighborhood);
  parts.push(city);
  return parts.join(" ");
}

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
  const activeFilter = ref<CardType>("restaurant");
  const visibleCount = ref(PAGE_SIZE);
  const isLoadingMore = ref(false);
  // Per-tab lazy loading
  const loadedCategories = ref<Set<string>>(new Set());
  const isLoadingCategory = ref(false);
  const categoryOffsets = ref<Record<string, number>>({});

  // ── Step 3 ─────────────────────────────────────────────────────────────────
  const savedTripName = ref<string | null>(null);
  const pinJustAdded = ref(false);
  const chatMessages = ref<ChatMessage[]>([]);
  const isChatting = ref(false);
  const chatHistory = ref<{ role: string; content: string }[]>([]);
  const savedTripId = ref<string | null>(null);
  const isSaving = ref(false);

  // ── Computed ───────────────────────────────────────────────────────────────
  const filteredCards = computed(() =>
    allCards.value.filter((c) => c.type === activeFilter.value),
  );

  const displayedCards = computed(() =>
    filteredCards.value.slice(0, visibleCount.value),
  );

  const pinnedCards = computed(() =>
    allCards.value.filter((c) => pinnedIds.value.has(c.id)),
  );

  const hasMoreToShow = computed(
    () => visibleCount.value < filteredCards.value.length,
  );

  // ── Private: batch image loading ───────────────────────────────────────────
  async function _patchImages(cards: DiscoveryCard[], city: string) {
    if (cards.length === 0) return;
    const queries = cards.map(c => ({ id: c.id, query: buildImageQuery(c, city) }));
    const batches: { id: string; query: string }[][] = [];
    for (let i = 0; i < queries.length; i += IMAGE_BATCH_SIZE) {
      batches.push(queries.slice(i, i + IMAGE_BATCH_SIZE));
    }
    const imageMaps = await Promise.all(
      batches.map(b => tripsApi.fetchCardImages(b).catch(() => ({} as Record<string, string[]>)))
    );
    const merged = Object.assign({}, ...imageMaps);
    if (Object.keys(merged).length > 0) {
      allCards.value = allCards.value.map(c => {
        const urls = merged[c.id];
        if (!urls?.length) return c;
        return { ...c, image: urls[0], imageFallbacks: urls.slice(1) };
      });
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  async function enrich() {
    if (!destinationInput.value.trim()) return;
    isEnriching.value = true;
    enrichError.value = "";
    try {
      const result = await tripsApi.enrichDestination(destinationInput.value.trim());
      destinationInfo.value = result.info;
      allCards.value = [];
      pinnedIds.value = new Set();
      visibleCount.value = PAGE_SIZE;
      activeFilter.value = "restaurant";
      loadedCategories.value = new Set();
      categoryOffsets.value = {};
      step.value = 2;
      // Fire-and-forget — skeleton cards shown while this loads
      _loadCategory("restaurant");
    } catch (err) {
      enrichError.value = err instanceof Error ? err.message : "Failed to load destination.";
    } finally {
      isEnriching.value = false;
    }
  }

  function setFilter(f: CardType) {
    activeFilter.value = f;
    visibleCount.value = PAGE_SIZE;
    // Lazy-load this category if not yet fetched
    if (!loadedCategories.value.has(f) && destinationInfo.value) {
      _loadCategory(f);
    }
  }

  async function _loadCategory(category: CardType) {
    if (!destinationInfo.value?.lat || !destinationInfo.value?.lng) return;
    if (isLoadingCategory.value) return;
    isLoadingCategory.value = true;

    let fetchedCards: DiscoveryCard[] = [];
    try {
      const { lat, lng, city } = destinationInfo.value;
      const existingTitles = allCards.value
        .filter(c => c.type === category)
        .map(c => c.title);

      fetchedCards = await tripsApi.fetchCategoryPlaces({
        lat: lat!,
        lng: lng!,
        city,
        category,
        offset: 0,
        existingTitles,
      });

      // Show cards immediately with gradient fallbacks — don't block on images
      allCards.value = [...allCards.value, ...fetchedCards];
      loadedCategories.value = new Set([...loadedCategories.value, category]);
      categoryOffsets.value[category] = 100;
    } finally {
      isLoadingCategory.value = false;
    }

    // Load images async — all batches fire at once for speed
    if (fetchedCards.length > 0 && destinationInfo.value?.city) {
      await _patchImages(fetchedCards, destinationInfo.value.city);
    }
  }

  function togglePin(id: string) {
    if (pinnedIds.value.has(id)) {
      pinnedIds.value.delete(id);
    } else {
      pinnedIds.value.add(id);
      if (savedTripId.value) pinJustAdded.value = true;
    }
    pinnedIds.value = new Set(pinnedIds.value);
  }

  async function loadMore() {
    if (isLoadingMore.value || isLoadingCategory.value) return;

    if (hasMoreToShow.value) {
      visibleCount.value += PAGE_SIZE;
      return;
    }

    if (!destinationInfo.value?.lat || !destinationInfo.value?.lng) return;
    isLoadingMore.value = true;
    try {
      const { lat, lng, city } = destinationInfo.value;
      const cat = activeFilter.value;
      const offset = categoryOffsets.value[cat] ?? 100;
      const existingTitles = allCards.value
        .filter(c => c.type === cat)
        .map(c => c.title);

      const more = await tripsApi.fetchCategoryPlaces({
        lat: lat!,
        lng: lng!,
        city,
        category: cat,
        offset,
        existingTitles,
      });

      // Show cards immediately, patch images async
      allCards.value = [...allCards.value, ...more];
      categoryOffsets.value[cat] = offset + 100;
      visibleCount.value += PAGE_SIZE;
      isLoadingMore.value = false;

      // Load images in parallel batches
      if (more.length > 0) {
        await _patchImages(more, city);
      }
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
        history: chatHistory.value.slice(-20),
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

    destinationInput.value = raw.destination ?? "";
    destinationInfo.value = raw.destinationInfo;
    allCards.value = raw.pinnedCards ?? [];
    pinnedIds.value = new Set((raw.pinnedCards ?? []).map((c: any) => c.id));
    activeFilter.value = "restaurant";
    visibleCount.value = PAGE_SIZE;
    chatHistory.value = raw.chatHistory ?? [];

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
    activeFilter.value = "restaurant";
    visibleCount.value = PAGE_SIZE;
    loadedCategories.value = new Set();
    isLoadingCategory.value = false;
    categoryOffsets.value = {};
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
    visibleCount, isLoadingMore, isLoadingCategory, loadedCategories,
    chatMessages, isChatting,
    isSaving, savedTripId, savedTripName, pinJustAdded,
    // computed
    filteredCards, displayedCards, pinnedCards, hasMoreToShow,
    // actions
    enrich, setFilter, togglePin, loadMore, goToBoard,
    sendMessage, createItinerary, save, loadSavedTrip, reset,
  };
});
