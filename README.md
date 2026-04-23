# Local Chat

Local Chat is a Laravel 12 + Vue 3 application for realtime group chat on a single Wi-Fi network.

Current scope:

- device-based onboarding with `display_name + device_uuid`
- group rooms
- realtime text messaging over WebSockets
- room file sharing
- room membership and unread counts
- room presence on the local network
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

## Identity Model

This app does not use internet accounts, registration, or passwords.

Each browser/device:

1. generates a local `device_uuid`
2. asks the user for a display name
3. stores that identity locally
4. reconnects to the LAN server with the same device identity later

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
2. Set `APP_URL` in `.env` to `http://192.168.0.15:8000`.
3. Keep `REVERB_PORT=8080`.
4. Rebuild frontend assets after env changes:

```bash
npm run build
```

The client websocket host follows the browser hostname by default, so opening the app through the LAN IP is usually enough as long as port `8080` is reachable on the network.

## HTTPS And Calls

Modern browsers treat `localhost` as secure, but not plain LAN IPs like `http://192.168.0.15:8000`. On phones, microphone and camera permissions usually fail unless the page is opened from a trusted HTTPS origin.

Practical options:

- Use the app over HTTP for text chat, file sharing, rooms, and notifications.
- Use a trusted local certificate and install/trust it on each device.
- Use a trusted hostname/certificate if you later decide to provide a domain.

Without trusted HTTPS, the app cannot force mobile browsers to allow camera or microphone access on a LAN IP.

## Voice/Video Reliability

Direct `1:1` WebRTC calls work best when both devices are on the same Wi-Fi and the browser allows media permissions.

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

## Test And Build

Run the backend test suite:

```bash
php artisan test
```

Build production assets:

```bash
npm run build
```

## Call Scope

Voice/video is currently implemented as direct browser-to-browser `1:1` WebRTC signaling over the existing LAN server.

- best suited for devices on the same Wi-Fi
- optional TURN support through `VITE_TURN_*` environment variables
- no internet login or SFU layer
- group voice/video is intentionally out of scope right now
