<template>
  <div class="skeleton-card">
    <div class="skeleton-hero" />
    <div class="skeleton-body">
      <div class="skeleton-line skeleton-line--title" />
      <div class="skeleton-line skeleton-line--short" />
      <div class="skeleton-line" />
    </div>
  </div>
</template>

<style scoped>
.skeleton-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  margin-bottom: 14px;
}

.skeleton-hero {
  height: 130px;
  background: linear-gradient(90deg, var(--bg-input) 25%, var(--bg-card-hover) 50%, var(--bg-input) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.skeleton-body {
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.skeleton-line {
  height: 11px;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--bg-input) 25%, var(--bg-card-hover) 50%, var(--bg-input) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.skeleton-line--title {
  height: 15px;
  width: 68%;
}

.skeleton-line--short {
  width: 42%;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
