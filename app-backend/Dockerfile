# Pinned to a Node release patched for CVE-2026-111497 (Brotli); bump via Renovate/Dependabot
FROM node:24.22.1-alpine AS base
WORKDIR /usr/src/app

# Install only production dependencies for the final image.
FROM base AS prod-deps
COPY package*.json ./
RUN npm ci --omit=dev

# Install all dependencies for running tests.
FROM base AS dev-deps
COPY package*.json ./
RUN npm ci

# Run tests in an isolated stage (caches dev deps separately).
FROM base AS test
ENV NODE_ENV=test
COPY --from=dev-deps /usr/src/app/node_modules ./node_modules
COPY . .
RUN npm test

# Lightweight runtime image with just app code + prod deps.
FROM base AS runtime
ENV NODE_ENV=production
COPY --chown=node:node package*.json ./
COPY --from=prod-deps --chown=node:node /usr/src/app/node_modules ./node_modules
COPY --chown=node:node . .
USER node
EXPOSE 8080
CMD ["node", "index.js"]
