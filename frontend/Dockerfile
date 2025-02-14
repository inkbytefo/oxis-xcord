# Use Node.js as base image for building
FROM node:18-alpine as build

# Install serve for production serving
RUN npm install -g serve

# Set working directory
WORKDIR /app

# Copy frontend files
COPY . .

# Command to run the app
CMD ["serve", "-s", ".", "-l", "3000"]
