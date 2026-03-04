import { ref } from "vue";
import type { DiscoveryCard, PlaceDetails } from "../types/trips";
import * as tripsApi from "../api/tripsApi";

export function usePlaceDetail() {
  const selectedCard = ref<DiscoveryCard | null>(null);
  const placeDetails = ref<PlaceDetails | null>(null);
  const isLoadingDetails = ref(false);

  async function openCard(card: DiscoveryCard) {
    selectedCard.value = card;
    placeDetails.value = null;
    if (card.fsqId) {
      isLoadingDetails.value = true;
      try {
        placeDetails.value = await tripsApi.getPlaceDetails(card.fsqId);
      } catch {
        placeDetails.value = null;
      } finally {
        isLoadingDetails.value = false;
      }
    }
  }

  return { selectedCard, placeDetails, isLoadingDetails, openCard };
}
