FROM node:lts-alpine AS base
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
COPY package*.json ./
COPY --from=prod-deps /usr/src/app/node_modules ./node_modules
COPY . .
EXPOSE 8080
CMD ["node", "index.js"]
