#!/bin/sh
set -eu

HTML_DIR=/usr/share/nginx/html

: "${API_BASE_URL:=http://localhost:3000}"
export API_BASE_URL

envsubst '${API_BASE_URL}' < "$HTML_DIR/assets/env.js" > /tmp/env.js
mv /tmp/env.js "$HTML_DIR/assets/env.js"

# Public URL of the site (ex: https://palettop.fr), written into index.html for the crawlers.
# Unset, the placeholder stays and the page falls back to window.location.origin at runtime.
# Files are rewritten in place (cat >), not renamed: the nginx user owns them but not their
# root-owned folder, where it cannot create or rename a file.
if [ -n "${SITE_URL:-}" ]; then
    export SITE_URL
    envsubst '${SITE_URL}' < "$HTML_DIR/index.html" > /tmp/index.html
    cat /tmp/index.html > "$HTML_DIR/index.html"

    # The service worker checks index.html against its hash in ngsw.json: a file changed after the
    # build would look corrupted and disable the offline mode. The hash is brought up to date.
    if [ -f "$HTML_DIR/ngsw.json" ]; then
        hash=$(sha1sum "$HTML_DIR/index.html" | cut -d ' ' -f 1)
        sed "s#\"/index.html\": \"[0-9a-f]*\"#\"/index.html\": \"$hash\"#" "$HTML_DIR/ngsw.json" > /tmp/ngsw.json
        cat /tmp/ngsw.json > "$HTML_DIR/ngsw.json"
    fi
fi
