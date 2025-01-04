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


# Build the Vue.js app
RUN npm run build

# Install a simple server to serve the static files
RUN npm install -g serve

# Run the web service on container startup.
CMD ["serve", "-s", "dist", "-l", "8080"]


# docker run -p 8080:8080 --env-file .env mm-web
