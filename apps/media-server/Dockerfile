# Build stage for Node.js app
FROM node:20-alpine as builder

WORKDIR /app
COPY . .

RUN npm ci
RUN npx nx build media-server

# Final stage
FROM alpine:3.18

# Install only necessary dependencies
RUN apk add --no-cache \
    nodejs \
    npm \
    ffmpeg \
    netcat-openbsd \
    nginx \
    nginx-mod-rtmp \
    nginx-mod-stream && \
    mkdir -p /etc/nginx/modules && \
    ln -sf /usr/lib/nginx/modules/ngx_rtmp_module.so /etc/nginx/modules/ && \
    ln -sf /usr/lib/nginx/modules/ngx_stream_module.so /etc/nginx/modules/

# Create directories and symlink logs
RUN mkdir -p /var/lib/nginx/hls && \
    mkdir -p /var/log/nginx && \
    ln -sf /dev/stdout /var/log/nginx/access.log && \
    ln -sf /dev/stderr /var/log/nginx/error.log && \
    chown -R nginx:nginx /var/lib/nginx

# Copy built Node.js app and install production dependencies
COPY --from=builder /app/dist/apps/media-server /app
COPY package*.json /app/
WORKDIR /app
RUN npm ci --only=production

# Copy nginx configs
COPY apps/media-server/nginx/rtmp.conf /etc/nginx/nginx.conf
COPY apps/media-server/nginx/http.conf /etc/nginx/http.d/default.conf

EXPOSE 1935 8080 3001

# Copy and set up start script
COPY apps/media-server/start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"] 