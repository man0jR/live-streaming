FROM nginx:alpine

# Install Node.js
RUN apk add --no-cache nodejs npm

# Create cache directory
RUN mkdir -p /var/cache/nginx/hls_cache

# Copy nginx configuration
COPY apps/cache-server/config/nginx.conf /etc/nginx/nginx.conf

# Copy built application
COPY dist/apps/cache-server /app

WORKDIR /app

EXPOSE 8081

# Start both Nginx and Node.js API server
CMD nginx && node main.js 