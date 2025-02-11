#!/bin/sh

# Start NGINX first
echo "Starting NGINX..."
nginx
NGINX_START_RESULT=$?

if [ $NGINX_START_RESULT -ne 0 ]; then
    echo "Failed to start NGINX. Exit code: $NGINX_START_RESULT"
    echo "NGINX error log:"
    cat /var/log/nginx/error.log
    exit 1
fi

# Wait for NGINX to be ready with timeout
echo "Waiting for NGINX RTMP..."
TIMEOUT=30  # 30 seconds timeout
COUNTER=0

while ! nc -z 127.0.0.1 1935; do
    if [ $COUNTER -ge $TIMEOUT ]; then
        echo "Error: NGINX RTMP failed to start within $TIMEOUT seconds"
        echo "NGINX error log:"
        cat /var/log/nginx/error.log
        exit 1
    fi
    COUNTER=$((COUNTER + 1))
    echo "Attempt $COUNTER of $TIMEOUT..."
    sleep 1
done

echo "NGINX RTMP is ready"

# Start Node.js application
node /app/main.js 