# Use the official Node.js image
FROM node:20

# Create and change to the app directory
WORKDIR /usr/src/app

# Copy application dependency manifests
COPY package*.json ./

# Install all dependencies including dev dependencies for TypeScript build
RUN npm install

# Copy local code to the container image
COPY . .

# Build TypeScript code
RUN npm run build

# Run the web service on container startup
CMD [ "node", "build/index.js" ]