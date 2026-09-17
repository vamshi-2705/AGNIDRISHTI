# Stage 1: Build production assets
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Build-time environment variables for Vite bundle
ARG VITE_API_BASE_URL=http://localhost:8000
ARG VITE_CESIUM_ION_TOKEN=""
ARG VITE_GOOGLE_MAPS_API_KEY=""

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_CESIUM_ION_TOKEN=$VITE_CESIUM_ION_TOKEN
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Serve with lightweight high-performance Nginx Alpine
FROM nginx:alpine

# Copy built static bundle
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration for SPA routing & caching
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Health check to ensure Nginx is actively responding
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
