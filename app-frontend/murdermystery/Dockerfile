FROM node:24.22.2-alpine AS build
WORKDIR /usr/src/app

# Install deps (use cache-friendly layer keyed by lockfile)
COPY package*.json ./
RUN npm ci

# Build static site
COPY . .

# Accept build arguments for API configuration
ARG VITE_MMM_API_BASE_URL
ARG VITE_MMM_API_KEY

# Set environment variables for Vite build
ENV VITE_MMM_API_BASE_URL=$VITE_MMM_API_BASE_URL
ENV VITE_MMM_API_KEY=$VITE_MMM_API_KEY

RUN npm run build

# Runtime: serve static assets with nginx (gzip + long cache for hashed assets)
# Track the current stable nginx line (1.27 is EOL and carries known CVEs) and
# pull in the latest Alpine package fixes at build time.
FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime
USER root
# CVE-2026-111497 needs brotli-libs >= 1.2.1-r0; fail the build rather than ship a vulnerable layer.
RUN apk upgrade --no-cache \
 && apk add --no-cache --upgrade brotli-libs \
 && v="$(apk info -v brotli-libs | sed 's/^brotli-libs-//')" \
 && echo "brotli-libs $v" \
 && [ "$(apk version -t "$v" 1.2.1-r0)" != "<" ]
WORKDIR /usr/share/nginx/html

# Copy built assets
COPY --from=build /usr/src/app/dist ./

# Copy nginx config (disable envsubst by removing the script)
RUN rm -f /docker-entrypoint.d/20-envsubst-on-templates.sh
COPY nginx.conf /etc/nginx/conf.d/default.conf

USER nginx
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
