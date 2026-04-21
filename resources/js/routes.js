import SetupPage from "./pages/SetupPage.vue";
import ChatPage from "./pages/ChatPage.vue";

export default [
    {
        path: "/",
        redirect: "/chat",
    },
    {
        path: "/setup",
        name: "setup",
        component: SetupPage,
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
