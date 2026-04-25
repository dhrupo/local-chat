# Local Chat

Local Chat is a Laravel 12 + Vue 3 application for realtime chat between nearby devices on the same Wi-Fi network.

Current scope:

- device-based onboarding with `display_name + device_uuid`
- reusable direct `1:1` chats
- group rooms
- realtime text messaging over WebSockets
- in-app toast alerts and browser notifications for incoming messages/calls
- built-in notification sounds for messages and incoming calls
- room file sharing up to `5 MB`
- room membership and unread counts
- active room persistence across page reloads
- room presence on the local network
- mobile-friendly room creation and incoming call UI
- mobile-first chat toolbar and small-screen room/message layout
- runtime network/media status panel
- direct `1:1` voice/video signaling over WebRTC

The app uses:

- `Laravel 12`
- `Vue 3`
- `Tailwind CSS`
- `Element Plus`
- `MySQL`
- `Laravel Reverb`
- `Laravel Echo`

## Easiest Local Run

For one-machine hosting on your Wi-Fi, use the helper script:

```bash
./scripts/local-chat-start.sh
```

It detects your LAN IP, prepares `.env`, runs migrations, builds assets, starts Laravel, and starts Reverb. Other devices on the same Wi-Fi can open the printed `http://<your-lan-ip>:8000` URL.

This is still a local HTTP URL. Text chat, rooms, files, realtime updates, and notifications can work there. Camera and microphone access on phones usually requires trusted HTTPS, so voice/video may need a trusted local certificate or a real trusted hostname.

If the script cannot detect your LAN address, run it with an override:

```bash
LAN_IP=192.168.0.15 ./scripts/local-chat-start.sh
```

## Local HTTPS For Android Calls

If you want Android voice/video calls without buying a real domain, use a locally trusted CA and the built-in HTTPS proxy setup:

```bash
./scripts/local-chat-https-setup.sh
docker compose --profile https up --build -d
```

That setup:

- generates a local CA with `mkcert`
- creates a LAN certificate for your current IP and local hostname
- copies the CA certificate into `certs/`
- updates `.env` for `https://<your-lan-ip>:8443`
- starts an HTTPS reverse proxy in front of Laravel and Reverb

Then open:

```text
https://<your-lan-ip>:8443
```

Before testing calls on Android, you must install and trust `certs/local-chat-rootCA.crt` on each device.

## Android Trust Steps

These steps are required for browser-based microphone/camera access on Android when you do not have a real public certificate.

1. Run `./scripts/local-chat-https-setup.sh` on the host machine.
2. Copy `certs/local-chat-rootCA.crt` to the Android device.
3. On Android, open:
   `Settings -> Security -> Encryption & credentials -> Install a certificate -> CA certificate`
4. Select `local-chat-rootCA.crt` and accept the warning.
5. If Android asks for a screen lock before installing credentials, set one.
6. Open `https://<your-lan-ip>:8443` in Chrome on the same Wi-Fi.

Notes:

- If the host LAN IP changes, rerun `./scripts/local-chat-https-setup.sh`.
- Other people on the network need the CA certificate installed on their Android device too.
- The generated CA is local to your machine. Do not reuse it as a public certificate.

## Docker Run

If Docker is easier for sharing the app with another machine:

```bash
docker compose up --build
```

Then open:

```text
http://localhost:8000
```

From another device on the same Wi-Fi, replace `localhost` with the host machine's LAN IP. Docker exposes the app on port `8000`, Reverb on port `8080`, and MySQL on host port `3307`.

Important for phones and other devices:

- do not use `localhost` or `127.0.0.1`
- use the host machine LAN IP instead, for example `http://192.168.0.15:8000`
- for HTTPS mode, use `https://192.168.0.15:8443`

For HTTPS mode, use:

```bash
docker compose --profile https up --build -d
```

That adds an HTTPS proxy on host port `8443`.

## What Users Get

- direct chats and group rooms in the same interface
- unread markers and unread room counts
- mobile-optimized setup/join flow and chat toolbar
- incoming message toast alerts with notification sound
- browser notifications for messages and incoming calls when permission is granted
- file sharing capped at `5 MB` per upload
- active room restored after page reload
- installable app metadata for supported browsers
- a runtime status panel that shows realtime connection, notification permission, secure-context state, media support, and TURN availability

## Identity Model

This app does not use internet accounts, registration, or passwords.

Each browser/device:

1. generates a local `device_uuid`
2. asks the user for a display name
3. stores that identity locally
4. reconnects to the LAN server with the same device identity later

Authentication is local-session based. There are no remote user accounts, email logins, or passwords.

## Local Setup

1. Install PHP dependencies:

```bash
composer install
```

2. Install frontend dependencies:

```bash
npm install
```

3. Create your environment file if needed:

```bash
cp .env.example .env
php artisan key:generate
```

4. Configure MySQL credentials in `.env`.

5. Run the schema:

```bash
php artisan migrate
```

## Run The App

You need three processes during development:

1. Laravel app server:

```bash
php artisan serve --host=0.0.0.0 --port=8000
```

2. Vite dev server:

```bash
npm run dev -- --host
```

3. Reverb websocket server:

```bash
php artisan reverb:start --host=0.0.0.0 --port=8080
```

## LAN Access

If phones or other laptops on the same Wi-Fi should connect:

1. Find the host machine's LAN IP, for example `192.168.0.15`.
2. Open the app from other devices using that LAN IP, not `localhost` or `127.0.0.1`.
3. Set `APP_URL` in `.env` to `http://192.168.0.15:8000`.
4. Keep `REVERB_PORT=8080`.
5. Rebuild frontend assets after env changes:

```bash
npm run build
```

The client websocket host follows the browser hostname by default, so opening the app through the LAN IP is usually enough as long as port `8080` is reachable on the network.

For local HTTPS experiments, make sure the page origin and websocket origin stay aligned. If you open the app on `https://192.168.x.x:8443`, the frontend should also be built with matching `VITE_REVERB_*` values.

The helper HTTPS script handles those values for you:

```bash
./scripts/local-chat-https-setup.sh
```

## HTTPS And Calls

Modern browsers treat `localhost` as secure, but not plain LAN IPs like `http://192.168.0.15:8000`. On phones, microphone and camera permissions usually fail unless the page is opened from a trusted HTTPS origin.

Practical options:

- Use the app over HTTP for text chat, file sharing, rooms, and notifications.
- Use a trusted local certificate and install/trust it on each device.
- Use a trusted hostname/certificate if you later decide to provide a domain.

Without trusted HTTPS, the app cannot force mobile browsers to allow camera or microphone access on a LAN IP.

### Full Local HTTPS Checklist

1. Install `mkcert` on the host machine.
   macOS:
   `brew install mkcert nss`
   `mkcert -install` may prompt for administrator access on the host machine.
2. Run `./scripts/local-chat-https-setup.sh`
3. Start the HTTPS stack:
   `docker compose --profile https up --build -d`
4. Install `certs/local-chat-rootCA.crt` on every Android device that should place calls.
5. Open `https://<host-lan-ip>:8443`
6. Verify the runtime status panel shows `Secure`.
7. Test voice/video calling.

If the runtime status still shows `Not secure`, the Android device has not trusted the generated CA correctly.

## Voice/Video Reliability

Direct `1:1` WebRTC calls work best when both devices are on the same Wi-Fi and the browser allows media permissions.

The current call flow includes:

- incoming call modal with ringtone
- optional browser notification for incoming calls
- voice and video call modes
- direct peer-to-peer media after signaling
- TURN fallback when configured

If calls need to work across stricter networks, configure a TURN server in `.env` before building assets:

```env
VITE_TURN_URLS=turn:your-turn-host:3478
VITE_TURN_USERNAME=your-turn-user
VITE_TURN_CREDENTIAL=your-turn-password
```

Multiple TURN URLs can be comma-separated. Rebuild after changing these values:

```bash
npm run build
```

## Installable App

The app includes a basic web manifest, so browsers that support installation can add it to the home screen or app launcher. This is still the same local web app and uses the same LAN URL.

## Limits And Tradeoffs

- file uploads are limited to `5 MB` each
- group voice/video calling is not implemented
- calls are optimized for same-LAN use first
- mobile browsers still require trusted HTTPS for reliable microphone/camera access
- trusted HTTPS is still required for reliable mobile microphone/camera permissions
- browser notifications and audio playback remain best-effort because browsers can block them until the user interacts with the page

## Test And Build

Run the backend test suite:

```bash
php artisan test
```

Build production assets:

```bash
npm run build
```

Validate Docker config:

```bash
docker compose config
```

## Call Scope

Voice/video is currently implemented as direct browser-to-browser `1:1` WebRTC signaling over the existing LAN server.

- best suited for devices on the same Wi-Fi
- optional TURN support through `VITE_TURN_*` environment variables
- no internet login or SFU layer
- group voice/video is intentionally out of scope right now
