#!/bin/sh
node /app/main.js &
/opt/nginx/sbin/nginx -g 'daemon off;' 