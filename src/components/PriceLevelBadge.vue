<script setup lang="ts">
import type { PriceLevel } from "../types/flights";

defineProps<{ level: PriceLevel }>();

const config: Record<PriceLevel, { label: string; css: string }> = {
  low: { label: "Low prices", css: "badge--low" },
  typical: { label: "Typical prices", css: "badge--typical" },
  high: { label: "High prices", css: "badge--high" },
};
</script>

<template>
  <span class="badge" :class="config[level].css">
    <span class="badge__dot" />
    {{ config[level].label }}
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.badge--low {
  background: var(--success-bg);
  color: var(--success);
}
.badge--low .badge__dot { background: var(--success); }

.badge--typical {
  background: rgba(148, 163, 184, 0.12);
  color: var(--text-secondary);
}
.badge--typical .badge__dot { background: var(--text-secondary); }

.badge--high {
  background: var(--danger-bg);
  color: var(--danger);
}
.badge--high .badge__dot { background: var(--danger); }
</style>
