FROM node:lts-alpine AS build
WORKDIR /usr/src/app

# Install deps (use cache-friendly layer keyed by lockfile)
COPY package*.json ./
RUN npm ci

# Build static site
COPY . .
# ARG VITE_MMM_API_BASE_URL
# ENV VITE_MMM_API_BASE_URL=$VITE_MMM_API_BASE_URL
# ARG VITE_MMM_API_KEY
# ENV VITE_MMM_API_KEY=$VITE_MMM_API_KEY
RUN npm run build

# Runtime: serve static assets with nginx (gzip + long cache for hashed assets)
FROM nginx:1.27-alpine AS runtime
WORKDIR /usr/share/nginx/html
COPY --from=build /usr/src/app/dist ./
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
