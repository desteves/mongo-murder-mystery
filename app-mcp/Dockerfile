# syntax=docker/dockerfile:1

# Pinned to a Node release patched for CVE-2026-111497 (Brotli)
FROM node:24.22.2-slim

# Debian ships its own libbrotli (CVE-2026-111497 fixed in 1.1.0-2+deb13u1); pull OS security updates
RUN apt-get update \
 && apt-get upgrade -y --no-install-recommends \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

ENV NODE_ENV=production
# mongodb-mcp-server >= 2 refuses non-loopback binds unless told otherwise;
# Cloud Run needs 0.0.0.0. Restrict access at the service level (private ingress/IAM).
ENV MDB_MCP_DANGEROUS_HOST_BINDING=true

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --chown=node:node . .
USER node

EXPOSE 8080
CMD ["npm", "start"]
