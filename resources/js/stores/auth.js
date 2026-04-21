import { defineStore } from "pinia";

export const useAuthStore = defineStore("auth", {
    state: () => ({
        user: null,
        bootstrapped: false,
        loading: false,
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
                this.user = null;
            } finally {
                this.bootstrapped = true;
            }
        },
        async ensureCsrfCookie() {
            await window.axios.get("/sanctum/csrf-cookie");
        },
        async login(payload) {
            this.loading = true;

            try {
                await this.ensureCsrfCookie();
                await window.axios.post("/login", payload);
                const { data } = await window.axios.get("/api/me");
                this.user = data.data;
            } finally {
                this.loading = false;
                this.bootstrapped = true;
            }
        },
        async logout() {
            await window.axios.post("/logout");
            this.user = null;
            this.bootstrapped = true;
        },
    },
});
