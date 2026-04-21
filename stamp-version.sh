#!/bin/bash
# Stamps the git short hash into js/config.js before deploy.
# Run after committing but before pushing:
#   bash stamp-version.sh
HASH=$(git rev-parse --short HEAD)
sed -i "s/const APP_BUILD = '.*'/const APP_BUILD = '$HASH'/" js/config.js
echo "Stamped build: $HASH"
