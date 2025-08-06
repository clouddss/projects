# syntax = docker/dockerfile:1

# Use Node.js LTS version
ARG NODE_VERSION=20.11.0
FROM node:${NODE_VERSION}-alpine AS base

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"

# Install packages needed for bcrypt and other native modules
FROM base AS build

RUN apk add --no-cache python3 make g++

# Install node modules
COPY package*.json ./
RUN npm install --omit=dev

# Copy application code
COPY . .

# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app /app

# Expose port 5000 (your backend port)
EXPOSE 5000

# Start the server - directly with node, not nodemon (production)
CMD [ "node", "index.js" ]