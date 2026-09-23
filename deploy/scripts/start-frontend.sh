#!/bin/bash
set -euo pipefail
NODE_BIN=/usr/bin/node
FRONTEND_DIR=/var/www/copsstec-system/frontend
NEXT_BIN=$FRONTEND_DIR/node_modules/next/dist/bin/next
cd "$FRONTEND_DIR"
exec "$NODE_BIN" "$NEXT_BIN" start --hostname 127.0.0.1 --port 3000
