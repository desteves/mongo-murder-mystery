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

# Run tests (this step will fail the build if tests fail)
RUN npm test

# Expose the port the app runs on
EXPOSE 8080

# Define the command to run the application
CMD ["node", "index.js"]

# docker build -t my-node-app .
# docker run -p 3000:3000 --env-file .env my-node-app