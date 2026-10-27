# syntax=docker/dockerfile:1

# Pinned to a Node release patched for CVE-2026-111497 (Brotli)
FROM node:24.22.1-slim

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
