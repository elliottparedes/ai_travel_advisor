import { ref, computed } from "vue";
import { defineStore } from "pinia";
import * as listsApi from "../api/listsApi";
import type { UserList, ListItem } from "../types/lists";
import type { DiscoveryCard } from "../types/trips";

export const useListStore = defineStore("lists", () => {
  const lists = ref<UserList[]>([]);
  const isLoading = ref(false);

  // O(1) lookup — used to highlight matching discovery cards
  const listedFsqIds = computed(() =>
    new Set(lists.value.flatMap((l) => l.items.map((i) => i.fsqId).filter(Boolean) as string[]))
  );

  async function load(token: string) {
    isLoading.value = true;
    try {
      lists.value = await listsApi.getUserLists(token);
    } catch {
      // ignore — non-blocking
    } finally {
      isLoading.value = false;
    }
  }

  async function createList(token: string, name: string, emoji: string) {
    const id = await listsApi.createList(token, name, emoji);
    lists.value = [{ id, name, emoji, items: [], createdAt: Date.now() }, ...lists.value];
    return id;
  }

  async function deleteList(token: string, listId: string) {
    await listsApi.deleteList(token, listId);
    lists.value = lists.value.filter((l) => l.id !== listId);
  }

  async function addItem(
    token: string,
    listId: string,
    card: DiscoveryCard,
    city: string,
    country: string,
  ) {
    const item: ListItem = {
      fsqId:          card.fsqId,
      title:          card.title,
      type:           card.type,
      city,
      country,
      image:          card.image,
      imageFallbacks: card.imageFallbacks,
      neighborhood:   card.neighborhood,
      rating:         card.rating,
      priceRange:     card.priceRange,
      lat:            card.lat,
      lng:            card.lng,
      addedAt:        Date.now(),
    };
    await listsApi.addToList(token, listId, item);
    // optimistic update
    const list = lists.value.find((l) => l.id === listId);
    if (list && !list.items.some((i) => (card.fsqId ? i.fsqId === card.fsqId : i.title === card.title))) {
      list.items = [...list.items, item];
    }
  }

  async function removeItem(token: string, listId: string, fsqId?: string, title?: string) {
    await listsApi.removeFromList(token, listId, fsqId, title);
    const list = lists.value.find((l) => l.id === listId);
    if (list) {
      list.items = list.items.filter((i) =>
        fsqId ? i.fsqId !== fsqId : i.title !== title,
      );
    }
  }

  async function renameList(token: string, listId: string, name: string, emoji: string) {
    await listsApi.renameList(token, listId, name, emoji);
    const list = lists.value.find((l) => l.id === listId);
    if (list) { list.name = name; list.emoji = emoji; }
  }

  return { lists, isLoading, listedFsqIds, load, createList, deleteList, addItem, removeItem, renameList };
});
