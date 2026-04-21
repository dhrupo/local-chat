import LoginPage from "./pages/LoginPage.vue";
import ChatPage from "./pages/ChatPage.vue";

export default [
    {
        path: "/",
        redirect: "/chat",
    },
    {
        path: "/login",
        name: "login",
        component: LoginPage,
        meta: {
            guestOnly: true,
        },
    },
    {
        path: "/chat",
        name: "chat",
        component: ChatPage,
        meta: {
            requiresAuth: true,
        },
    },
];
