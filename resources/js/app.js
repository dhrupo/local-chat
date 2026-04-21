import "./bootstrap";
import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import ElementPlus from "element-plus";
import { createPinia } from "pinia";
import App from "./App.vue";
import Routes from "./routes.js";
import { useAuthStore } from "./stores/auth";

const pinia = createPinia();
const router = createRouter({
    routes: Routes,
    history: createWebHistory(),
});

router.beforeEach(async (to) => {
    const authStore = useAuthStore(pinia);

    if (!authStore.bootstrapped) {
        await authStore.bootstrap();
    }

    if (to.meta.requiresAuth && !authStore.user) {
        return { name: "login" };
    }

    if (to.meta.guestOnly && authStore.user) {
        return { name: "chat" };
    }

    return true;
});

const app = createApp(App);
app.use(router);
app.use(pinia);
app.use(ElementPlus, {
    size: "default",
    zIndex: 3000,
});
app.mount("#app");
