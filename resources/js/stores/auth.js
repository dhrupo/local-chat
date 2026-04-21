import { defineStore } from "pinia";

const STORAGE_KEY = "local-chat-device-identity";

const generateDeviceIdentity = () => ({
    device_uuid: window.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    avatar_color: ["sunset", "lagoon", "forest", "ember", "violet", "sand"][
        Math.floor(Math.random() * 6)
    ],
});

export const useAuthStore = defineStore("auth", {
    state: () => ({
        user: null,
        bootstrapped: false,
        loading: false,
        savedIdentity: JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null"),
    }),
    actions: {
        async bootstrap() {
            if (this.bootstrapped) {
                return;
            }

            try {
                const { data } = await window.axios.get("/api/me");
                this.user = data.data;
            } catch (error) {
                if (this.savedIdentity?.device_uuid && this.savedIdentity?.display_name) {
                    try {
                        await this.connect(this.savedIdentity.display_name, true);
                    } catch (restoreError) {
                        this.user = null;
                    }
                } else {
                    this.user = null;
                }
            } finally {
                this.bootstrapped = true;
            }
        },
        async ensureCsrfCookie() {
            await window.axios.get("/sanctum/csrf-cookie");
        },
        async connect(displayName, silent = false) {
            this.loading = true;

            try {
                const identity = this.savedIdentity || generateDeviceIdentity();
                const payload = {
                    ...identity,
                    display_name: displayName.trim(),
                };

                await this.ensureCsrfCookie();
                await window.axios.post("/session/device", payload);
                const { data } = await window.axios.get("/api/me");
                this.user = data.data;
                this.savedIdentity = payload;
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
            } finally {
                this.loading = false;
                this.bootstrapped = true;
            }
        },
        async disconnect() {
            await window.axios.delete("/session/device");
            this.user = null;
            this.savedIdentity = null;
            window.localStorage.removeItem(STORAGE_KEY);
            this.bootstrapped = true;
        },
    },
});
