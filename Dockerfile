# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# VITE_CONVEX_URL is baked into the bundle at build time.
# CONVEX_DEPLOY_KEY is used to deploy Convex functions to production.
# Pass both via Build Args in Coolify (Settings → Build Args).
ARG VITE_CONVEX_URL
ENV VITE_CONVEX_URL=$VITE_CONVEX_URL

ARG CONVEX_DEPLOY_KEY
ENV CONVEX_DEPLOY_KEY=$CONVEX_DEPLOY_KEY

# Deploy Convex functions to prod, then build the frontend
RUN npx convex deploy && npm run build-only

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:stable-alpine

# SPA routing config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
