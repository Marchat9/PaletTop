#!/bin/sh
set -eu

: "${API_BASE_URL:=http://localhost:3000}"
export API_BASE_URL

envsubst '${API_BASE_URL}' < /usr/share/nginx/html/assets/env.js > /tmp/env.js
mv /tmp/env.js /usr/share/nginx/html/assets/env.js
