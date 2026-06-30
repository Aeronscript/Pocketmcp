#!/bin/bash
# ════════════════════════════════════════════════════════════
# Rebuild index.min.js depuis index.ts
# Utilise bun build --minify puis ajoute le header anti-fork
# ════════════════════════════════════════════════════════════
set -e

SERVER_DIR="/home/z/my-project/mini-services/pocketmcp-server"
cd "$SERVER_DIR"

# Build temporaire (sans header)
TMP_FILE=$(mktemp)
bun build index.ts --minify --outfile="$TMP_FILE" --target=bun

# Header anti-fork
HEADER='// ════════════════════════════════════════════════════════════
// PocketMCP Server v0.3.0 · Copyright (c) 2026 Aeronscript
// ALL RIGHTS RESERVED.
// ⚠ FORK, COPIE, REDISTRIBUTION INTERDITS SANS AUTORISATION.
// Contact: aeronscriptlabs@gmail.com
// ════════════════════════════════════════════════════════════
// @bun'

# Concatène header + code minifié
{
  echo "$HEADER"
  cat "$TMP_FILE"
} > index.min.js

rm -f "$TMP_FILE"

echo "✓ index.min.js rebuilt ($(wc -c < index.min.js) bytes)"
echo "  source: index.ts ($(wc -l < index.ts) lines)"
echo "  minified: index.min.js ($(wc -l < index.min.js) lines)"
