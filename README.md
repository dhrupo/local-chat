# Local Chat

Local Chat is a Laravel 12 + Vue 3 application for text-based group chat on a single Wi-Fi network.

Current scope:

- session-based login
- group rooms
- realtime text messaging over WebSockets
- room membership and unread counts
- live room updates and room presence

The app uses:

- `Laravel 12`
- `Vue 3`
- `Tailwind CSS`
- `Element Plus`
- `MySQL`
- `Laravel Reverb`
- `Laravel Echo`

## Demo Users

After seeding, these demo accounts are available:

- `admin@localchat.test`
- `aisha@localchat.test`
- `nafis@localchat.test`
- `tania@localchat.test`

All seeded demo users use the password:

```text
password
```

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

5. Run migrations and seed the demo users:

```bash
php artisan migrate --seed
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

If you want phones or other laptops on the same Wi-Fi to connect:

1. Find the host machine's LAN IP, for example `192.168.0.15`.
2. Set `APP_URL` in `.env` to `http://192.168.0.15:8000`.
3. Keep `REVERB_PORT=8080`.
4. Rebuild frontend assets after changing the env values:

```bash
npm run build
```

The client websocket host follows the browser hostname by default, so opening the app via the LAN IP is usually enough for websocket connections as long as port `8080` is reachable from the same Wi-Fi network.

## Test And Build

Run the backend test suite:

```bash
php artisan test
```

Build production assets:

```bash
npm run build
```

## Current Next Step

The text chat and group room foundation is in place. The next logical feature is `1:1 voice/video signaling` on top of the existing realtime and user presence layer.
