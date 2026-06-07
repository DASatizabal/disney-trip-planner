#!/bin/bash
# Stamps the current git short hash into the build:
#   1. js/config.js  -> const APP_BUILD = '<hash>'
#   2. every local <script src="js/*.js"> and <link href="css/*.css"> in the
#      HTML files gets a ?v=<hash> query string so browsers fetch the new code
#      instead of serving a stale cached copy (GitHub Pages caches assets for
#      10 minutes and the files are otherwise unversioned).
# Run after committing but before pushing:
#   bash stamp-version.sh
set -e
HASH=$(git rev-parse --short HEAD)

# 1. Build hash in config.js
sed -i "s/const APP_BUILD = '.*'/const APP_BUILD = '$HASH'/" js/config.js

# 2. Cache-bust local js/css references across all HTML files. The regex
#    matches an optional existing ?v=... and replaces it, so re-running is
#    idempotent.
for f in *.html; do
  [ -e "$f" ] || continue
  sed -i -E "s#(src=\"js/[A-Za-z0-9_-]+\.js)(\?v=[A-Za-z0-9]+)?\"#\1?v=$HASH\"#g" "$f"
  sed -i -E "s#(href=\"css/[A-Za-z0-9_-]+\.css)(\?v=[A-Za-z0-9]+)?\"#\1?v=$HASH\"#g" "$f"
done

echo "Stamped build: $HASH (config.js + HTML asset URLs)"
