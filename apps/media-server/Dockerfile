# Build stage for Node.js app
FROM node:18-alpine as builder

WORKDIR /app
COPY . .

RUN npm ci
RUN npx nx build media-server

# Final stage with Nginx-RTMP and FFmpeg
FROM alpine:3.18

# Install dependencies including FFmpeg
RUN apk add --no-cache \
    build-base \
    pcre-dev \
    openssl-dev \
    zlib-dev \
    linux-headers \
    wget \
    git \
    nodejs \
    npm \
    ffmpeg

# Download and build Nginx with RTMP module
ARG NGINX_VERSION=1.24.0
RUN wget https://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz && \
    tar zxf nginx-${NGINX_VERSION}.tar.gz && \
    rm nginx-${NGINX_VERSION}.tar.gz && \
    git clone https://github.com/arut/nginx-rtmp-module.git && \
    cd nginx-${NGINX_VERSION} && \
    ./configure \
        --prefix=/opt/nginx \
        --with-http_ssl_module \
        --add-module=../nginx-rtmp-module && \
    make && \
    make install && \
    rm -rf /var/cache/apk/* nginx-${NGINX_VERSION} nginx-rtmp-module

# Create directories for HLS and dash streaming
RUN mkdir -p /opt/nginx/hls && \
    mkdir -p /opt/nginx/dash && \
    ln -sf /dev/stdout /opt/nginx/logs/access.log && \
    ln -sf /dev/stderr /opt/nginx/logs/error.log

# Copy built Node.js app
COPY --from=builder /app/dist/apps/media-server /app
COPY apps/media-server/config/nginx.conf /etc/nginx/nginx.conf

EXPOSE 1935 8080 3001

# Start script
COPY apps/media-server/start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"] 