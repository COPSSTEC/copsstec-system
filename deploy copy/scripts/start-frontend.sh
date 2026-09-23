#!/bin/bash
set -euo pipefail

# Nunca usar nvm de /root: el servicio corre como copsstec y no puede leer esa ruta.
NODE_BIN="/usr/bin/node"
FRONTEND_DIR="${FRONTEND_DIR:-/var/www/copsstec-system/frontend}"
NEXT_BIN="${FRONTEND_DIR}/node_modules/next/dist/bin/next"

if [ ! -x "${NODE_BIN}" ]; then
  echo "No existe ${NODE_BIN}. Instala Node del sistema (no nvm)." >&2
  exit 127
fi

if [ ! -f "${NEXT_BIN}" ]; then
  echo "No se encontró Next.js en ${NEXT_BIN}. Ejecuta npm ci en frontend/." >&2
  exit 127
fi

if [ ! -d "${FRONTEND_DIR}/.next" ]; then
  echo "No existe ${FRONTEND_DIR}/.next. Ejecuta npm run build antes de arrancar." >&2
  exit 1
fi

cd "${FRONTEND_DIR}"
exec "${NODE_BIN}" "${NEXT_BIN}" start --hostname 127.0.0.1 --port 3000
