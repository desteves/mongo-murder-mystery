FROM node:24.22.3-alpine AS build
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
# Official nginx image pinned to a release that fixes the Nov 2026 nginx advisories
# (fixed in 1.30.7+ / 1.31.9+). nginx-unprivileged lagged behind, so we drop root
# ourselves below. Bump via Renovate/Dependabot.
FROM nginx:1.30.7-alpine AS runtime

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
COPY security-headers.conf /etc/nginx/security-headers.conf

# Run as the unprivileged nginx user: pid file in /tmp, writable cache/log dirs,
# no `user` directive (only meaningful for root). Validate the config at build time and
# remove any root-owned pid file that validation leaves behind, or the nginx user can't open it.
RUN sed -i -e 's,^pid .*;,pid /tmp/nginx.pid;,' -e '/^user /d' /etc/nginx/nginx.conf \
 && grep -q '^pid /tmp/nginx.pid;' /etc/nginx/nginx.conf \
 && chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx/conf.d \
 && nginx -t \
 && rm -f /tmp/nginx.pid

USER nginx
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
