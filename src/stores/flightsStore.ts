import { defineStore } from "pinia";
import { ref } from "vue";
import type { FlightSearchParams, FlightSearchResponse } from "../types/flights";
import { searchFlights } from "../api/flightsApi";

export const useFlightsStore = defineStore("flights", () => {
  const results = ref<FlightSearchResponse | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastParams = ref<FlightSearchParams | null>(null);

  async function search(params: FlightSearchParams) {
    loading.value = true;
    error.value = null;
    lastParams.value = params;

    try {
      results.value = await searchFlights(params);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      results.value = null;
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    results.value = null;
    error.value = null;
    lastParams.value = null;
  }

  return { results, loading, error, lastParams, search, reset };
});
