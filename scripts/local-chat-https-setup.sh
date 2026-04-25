#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_PORT="${APP_PORT:-8000}"
HTTPS_PORT="${HTTPS_PORT:-8443}"
LAN_IP="${LAN_IP:-}"
LOCAL_HOSTNAME="${LOCAL_HOSTNAME:-}"
CERT_DIR="${ROOT_DIR}/certs"
CERT_FILE="${CERT_DIR}/local-chat.pem"
KEY_FILE="${CERT_DIR}/local-chat-key.pem"
ROOT_CA_PEM="${CERT_DIR}/local-chat-rootCA.pem"
ROOT_CA_CRT="${CERT_DIR}/local-chat-rootCA.crt"

detect_lan_ip() {
    if command -v ipconfig >/dev/null 2>&1; then
        ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true
        return
    fi

    hostname -I 2>/dev/null | awk '{print $1}'
}

detect_local_hostname() {
    if command -v scutil >/dev/null 2>&1; then
        scutil --get LocalHostName 2>/dev/null || true
        return
    fi

    hostname 2>/dev/null | cut -d. -f1
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

ensure_env_file() {
    cd "${ROOT_DIR}"

    if [ ! -f .env ]; then
        cp .env.example .env
    fi
}

ensure_mkcert() {
    if ! command -v mkcert >/dev/null 2>&1; then
        echo "mkcert is required. Install it first, then rerun this script."
        echo "macOS: brew install mkcert nss"
        echo "Windows: choco install mkcert"
        echo "Linux: https://github.com/FiloSottile/mkcert"
        exit 1
    fi
}

main() {
    ensure_env_file
    ensure_mkcert

    LAN_IP="${LAN_IP:-$(detect_lan_ip)}"
    LOCAL_HOSTNAME="${LOCAL_HOSTNAME:-$(detect_local_hostname)}"

    if [ -z "${LAN_IP}" ]; then
        echo "Could not detect LAN IP. Re-run with LAN_IP=192.168.x.x scripts/local-chat-https-setup.sh"
        exit 1
    fi

    mkdir -p "${CERT_DIR}"

    if ! mkcert -install >/dev/null 2>&1; then
        echo "mkcert could not auto-install the local CA into this computer's trust store."
        echo "The certificate files will still be generated. You can trust the CA manually if needed."
    fi

    local hostnames=("${LAN_IP}" "localhost" "127.0.0.1")

    if [ -n "${LOCAL_HOSTNAME}" ]; then
        hostnames+=("${LOCAL_HOSTNAME}.local")
    fi

    mkcert -cert-file "${CERT_FILE}" -key-file "${KEY_FILE}" "${hostnames[@]}"

    local ca_root
    ca_root="$(mkcert -CAROOT)"
    cp "${ca_root}/rootCA.pem" "${ROOT_CA_PEM}"
    openssl x509 -in "${ROOT_CA_PEM}" -outform DER -out "${ROOT_CA_CRT}" >/dev/null 2>&1

    set_env_value HTTPS_PORT "${HTTPS_PORT}"
    set_env_value APP_URL "https://${LAN_IP}:${HTTPS_PORT}"
    set_env_value SANCTUM_STATEFUL_DOMAINS "localhost,localhost:${APP_PORT},127.0.0.1,127.0.0.1:${APP_PORT},localhost:${HTTPS_PORT},127.0.0.1:${HTTPS_PORT},${LAN_IP}:${APP_PORT},${LAN_IP}:${HTTPS_PORT}${LOCAL_HOSTNAME:+,${LOCAL_HOSTNAME}.local:${HTTPS_PORT}}"
    set_env_value SESSION_DOMAIN ""
    set_env_value VITE_REVERB_HOST ""
    set_env_value VITE_REVERB_PORT "${HTTPS_PORT}"
    set_env_value VITE_REVERB_SCHEME "https"

    cat <<EOF

Local HTTPS is configured.

Server URL:
https://${LAN_IP}:${HTTPS_PORT}

Generated files:
- ${CERT_FILE}
- ${KEY_FILE}
- ${ROOT_CA_PEM}
- ${ROOT_CA_CRT}

Next steps:
1. Start the stack with HTTPS enabled:
   docker compose --profile https up --build -d
2. Open https://${LAN_IP}:${HTTPS_PORT}
3. Install and trust ${ROOT_CA_CRT} on each Android device before testing calls.

If your LAN IP changes later, rerun this script.
EOF
}

main "$@"
