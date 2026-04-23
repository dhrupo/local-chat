#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PHP_BIN="${PHP_BIN:-php}"
APP_HOST="${APP_HOST:-0.0.0.0}"
APP_PORT="${APP_PORT:-8000}"
REVERB_HOST="${REVERB_HOST:-0.0.0.0}"
REVERB_PORT="${REVERB_PORT:-8080}"
LAN_IP="${LAN_IP:-}"

detect_lan_ip() {
    if command -v ipconfig >/dev/null 2>&1; then
        ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true
        return
    fi

    hostname -I 2>/dev/null | awk '{print $1}'
}

set_env_value() {
    local key="$1"
    local value="$2"

    if grep -q "^${key}=" "${ROOT_DIR}/.env"; then
        perl -0pi -e "s#^${key}=.*#${key}=${value}#m" "${ROOT_DIR}/.env"
        return
    fi

    printf '%s=%s\n' "${key}" "${value}" >> "${ROOT_DIR}/.env"
}

cd "${ROOT_DIR}"

if [ ! -f .env ]; then
    cp .env.example .env
fi

if ! grep -q "^APP_KEY=base64:" .env; then
    "${PHP_BIN}" artisan key:generate --force
fi

LAN_IP="${LAN_IP:-$(detect_lan_ip)}"

if [ -z "${LAN_IP}" ]; then
    echo "Could not detect LAN IP. Re-run with LAN_IP=192.168.x.x scripts/local-chat-start.sh"
    exit 1
fi

APP_URL="http://${LAN_IP}:${APP_PORT}"

set_env_value APP_URL "${APP_URL}"
set_env_value SANCTUM_STATEFUL_DOMAINS "localhost,localhost:${APP_PORT},127.0.0.1,127.0.0.1:${APP_PORT},${LAN_IP}:${APP_PORT}"
set_env_value REVERB_SERVER_HOST "0.0.0.0"
set_env_value REVERB_SERVER_PORT "${REVERB_PORT}"
set_env_value REVERB_HOST "${LAN_IP}"
set_env_value REVERB_PORT "${REVERB_PORT}"
set_env_value REVERB_SCHEME "http"
set_env_value VITE_REVERB_HOST ""
set_env_value VITE_REVERB_PORT "${REVERB_PORT}"
set_env_value VITE_REVERB_SCHEME "http"

"${PHP_BIN}" artisan config:clear
"${PHP_BIN}" artisan migrate --force
npm run build

cleanup() {
    jobs -p | xargs -r kill 2>/dev/null || true
}

trap cleanup EXIT INT TERM

"${PHP_BIN}" artisan reverb:start --host="${REVERB_HOST}" --port="${REVERB_PORT}" &
"${PHP_BIN}" artisan serve --host="${APP_HOST}" --port="${APP_PORT}" &

cat <<EOF

Local Chat is running.

Open this URL on devices connected to the same Wi-Fi:
${APP_URL}

Note: browser camera/mic access on phones requires trusted HTTPS. HTTP is fine for chat, files, and presence.

Press Ctrl+C to stop.
EOF

wait
