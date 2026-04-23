import { defineStore } from "pinia";

const STORAGE_KEY = "local-chat-device-identity";
const AVATAR_COLORS = ["sunset", "lagoon", "forest", "ember", "violet", "sand"];

const isUuid = (value) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value || ""
    );

const fallbackUuid = () =>
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
        const randomValue = Math.floor(Math.random() * 16);
        const value = character === "x" ? randomValue : (randomValue & 0x3) | 0x8;

        return value.toString(16);
    });

const normalizeIdentity = (identity = null) => {
    const deviceUuid = isUuid(identity?.device_uuid)
        ? identity.device_uuid
        : window.crypto?.randomUUID?.() || fallbackUuid();

    const avatarColor = AVATAR_COLORS.includes(identity?.avatar_color)
        ? identity.avatar_color
        : AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    return {
        device_uuid: deviceUuid,
        avatar_color: avatarColor,
        ...(identity?.display_name ? { display_name: identity.display_name } : {}),
    };
};

const generateDeviceIdentity = () => ({
    ...normalizeIdentity(),
});

const readSavedIdentity = () => {
    try {
        return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    } catch {
        window.localStorage.removeItem(STORAGE_KEY);
        return null;
    }
};

export const useAuthStore = defineStore("auth", {
    state: () => ({
        user: null,
        bootstrapped: false,
        loading: false,
        savedIdentity: normalizeIdentity(readSavedIdentity()),
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
                const identity = normalizeIdentity(this.savedIdentity) || generateDeviceIdentity();
                const payload = {
                    ...identity,
                    display_name: displayName.trim(),
                };

                await this.ensureCsrfCookie();
                await window.axios.post("/session/device", payload);
                const { data } = await window.axios.get("/api/me");
                this.user = data.data;
                this.savedIdentity = {
                    ...identity,
                    display_name: displayName.trim(),
                };
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
                    ...identity,
                    display_name: displayName.trim(),
                }));
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
