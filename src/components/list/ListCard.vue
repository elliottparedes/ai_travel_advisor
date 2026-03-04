<script setup lang="ts">
import type { UserList, ListItem } from "../../types/lists";

const props = defineProps<{
  list: UserList;
  expanded: boolean;
}>();

const emit = defineEmits<{
  toggle: [];
  removeItem: [listId: string, item: ListItem];
  deleteList: [listId: string];
  selectItem: [listId: string, item: ListItem];
}>();

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(ts));
}

const collageImages = () =>
  props.list.items
    .filter((i) => i.image)
    .slice(0, 4)
    .map((i) => i.image as string);
</script>

<template>
  <div class="list-card" :class="{ 'list-card--expanded': expanded }">
    <!-- Clickable header -->
    <div class="list-card__header" @click="emit('toggle')">
      <!-- Hero collage -->
      <div class="list-card__hero">
        <div
          v-if="collageImages().length"
          :class="['collage', `collage--${Math.min(collageImages().length, 4)}`]"
        >
          <img
            v-for="(url, i) in collageImages()"
            :key="i"
            :src="url"
            referrerpolicy="no-referrer"
            class="collage-img"
            @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
          />
        </div>
        <div v-else class="list-card__hero-empty">
          <span class="hero-emoji">{{ list.emoji }}</span>
        </div>
        <div class="list-card__scrim" />
      </div>

      <!-- Body -->
      <div class="list-card__body">
        <div class="list-card__title-row">
          <span class="list-card__emoji">{{ list.emoji }}</span>
          <h3 class="list-card__name">{{ list.name }}</h3>
        </div>
        <div class="list-card__meta">
          <span class="meta-pill">{{ list.items.length }} place{{ list.items.length !== 1 ? 's' : '' }}</span>
          <span class="meta-date">{{ formatDate(list.createdAt) }}</span>
        </div>
      </div>

      <!-- Chevron -->
      <svg
        class="chevron"
        :class="{ 'chevron--open': expanded }"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>

    <!-- Expanded items -->
    <Transition name="accordion">
      <div v-if="expanded" class="list-card__items">
        <div v-if="list.items.length === 0" class="items-empty">
          No places saved yet. Open a place detail in the trip explorer to save it here.
        </div>
        <div v-else class="items-grid">
          <div
            v-for="item in list.items"
            :key="item.fsqId ?? item.title"
            class="item-tile"
            @click="emit('selectItem', list.id, item)"
          >
            <div class="item-tile__hero">
              <img
                v-if="item.image"
                :src="item.image"
                referrerpolicy="no-referrer"
                class="item-tile__img"
                @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
              />
              <div v-else class="item-tile__fallback">{{ item.type[0]?.toUpperCase() }}</div>
            </div>
            <div class="item-tile__info">
              <span class="item-tile__title">{{ item.title }}</span>
              <span class="item-tile__city">{{ item.city }}</span>
              <span class="item-tile__type">{{ item.type }}</span>
            </div>
            <button
              class="item-tile__remove"
              title="Remove from list"
              @click.stop="emit('removeItem', list.id, item)"
            >×</button>
          </div>
        </div>

        <!-- Delete list -->
        <div class="list-card__footer">
          <button class="btn-delete-list" @click.stop="emit('deleteList', list.id)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            </svg>
            Delete list
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.list-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: border-color var(--transition), box-shadow var(--transition);
}

.list-card:hover,
.list-card--expanded {
  border-color: rgba(99, 102, 241, 0.3);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.list-card__header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  cursor: pointer;
  user-select: none;
}

/* ── Hero ── */
.list-card__hero {
  width: 72px;
  height: 72px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  flex-shrink: 0;
  position: relative;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
}

.list-card__hero-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-emoji { font-size: 1.8rem; }

.list-card__scrim {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.1);
}

/* Collage */
.collage {
  position: absolute;
  inset: 0;
  display: grid;
  gap: 1px;
}

.collage--1 { grid-template-columns: 1fr; }
.collage--2 { grid-template-columns: 1fr 1fr; }
.collage--3 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
.collage--4 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
.collage--3 .collage-img:first-child { grid-row: 1 / span 2; }

.collage-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* ── Body ── */
.list-card__body { flex: 1; min-width: 0; }

.list-card__title-row {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 6px;
}

.list-card__emoji { font-size: 1.1rem; }

.list-card__name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.list-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.meta-pill {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-dim);
  padding: 2px 8px;
  border-radius: 999px;
}

.meta-date {
  font-size: 0.72rem;
  color: var(--text-muted);
}

/* ── Chevron ── */
.chevron {
  flex-shrink: 0;
  color: var(--text-muted);
  transition: transform 250ms ease;
}

.chevron--open { transform: rotate(180deg); }

/* ── Items grid ── */
.list-card__items {
  border-top: 1px solid var(--border);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.items-empty {
  font-size: 0.82rem;
  color: var(--text-muted);
  text-align: center;
  padding: 20px 0;
  line-height: 1.5;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

@media (max-width: 480px) {
  .items-grid { grid-template-columns: repeat(2, 1fr); }
}

.item-tile {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  position: relative;
  transition: border-color var(--transition);
}

.item-tile:hover { border-color: rgba(99,102,241,0.3); }

.item-tile__hero {
  height: 72px;
  background: linear-gradient(135deg, #374151, #1f2937);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-tile__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-tile__fallback {
  font-size: 1.4rem;
  font-weight: 800;
  color: rgba(255,255,255,0.4);
}

.item-tile__info {
  padding: 7px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-tile__title {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-tile__city {
  font-size: 0.65rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-tile__type {
  font-size: 0.62rem;
  font-weight: 600;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.item-tile__remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: rgba(0,0,0,0.45);
  backdrop-filter: blur(4px);
  color: white;
  font-size: 0.85rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--transition), background var(--transition);
}

.item-tile:hover .item-tile__remove { opacity: 1; }
.item-tile__remove:hover { background: rgba(239, 68, 68, 0.8); }

/* ── Footer ── */
.list-card__footer {
  display: flex;
  justify-content: flex-end;
}

.btn-delete-list {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border: 1px solid var(--border);
  background: transparent;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  transition: background var(--transition), color var(--transition), border-color var(--transition);
}

.btn-delete-list:hover {
  background: var(--danger-bg);
  color: var(--danger);
  border-color: rgba(239, 68, 68, 0.3);
}

/* ── Accordion transition ── */
.accordion-enter-active, .accordion-leave-active {
  transition: max-height 280ms ease, opacity 200ms ease;
  max-height: 800px;
  overflow: hidden;
}

.accordion-enter-from, .accordion-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
