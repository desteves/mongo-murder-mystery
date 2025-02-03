# Use the official Node.js image as the base image
FROM node:lts-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available) to the working directory
COPY package*.json ./

# Install the application dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Set environment variables from Docker build arguments
ARG API_BASE_URL

# Expose the variables at runtime
ENV VITE_MMM_API_BASE_URL=$API_BASE_URL

# Build the Vue.js app
RUN npm run build

# Install a simple server to serve the static files
RUN npm install -g serve

# Run the web service on container startup.
CMD ["serve", "-s", "dist", "-l", "8080"]


# docker run -p 8080:8080 --env-file .env mm-web
