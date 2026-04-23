import _ from "lodash";
window._ = _;

/**
 * We'll load the axios HTTP library which allows us to easily issue requests
 * to our Laravel back-end. This library automatically handles sending the
 * CSRF token as a header based on the value of the "XSRF" token cookie.
 */

import axios from "axios";
import Echo from "laravel-echo";
import Pusher from "pusher-js";

window.axios = axios;
window.Pusher = Pusher;

window.axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";
window.axios.defaults.withCredentials = true;
window.axios.defaults.headers.common.Accept = "application/json";

const reverbScheme =
    import.meta.env.VITE_REVERB_SCHEME || window.location.protocol.replace(":", "");
const reverbHost = import.meta.env.VITE_REVERB_HOST || window.location.hostname;
const reverbPort = import.meta.env.VITE_REVERB_PORT
    || window.location.port
    || (reverbScheme === "https" ? 443 : 80);

window.Echo = new Echo({
    broadcaster: "reverb",
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: reverbHost,
    wsPort: reverbPort,
    wssPort: reverbPort,
    forceTLS: reverbScheme === "https",
    enabledTransports: ["ws", "wss"],
});

window.LocalChatRealtimeState = "connecting";

window.Echo.connector?.pusher?.connection?.bind("state_change", ({ current }) => {
    window.LocalChatRealtimeState = current;
    window.dispatchEvent(new CustomEvent("local-chat:realtime-state", {
        detail: { state: current },
    }));
});

window.axios.interceptors.request.use((config) => {
    const socketId = window.Echo?.socketId?.();

    if (socketId) {
        config.headers["X-Socket-Id"] = socketId;
    }

    return config;
});
