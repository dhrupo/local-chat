export default [
    {
        path: "/",
        redirect: "/chat",
    },
    {
        path: "/setup",
        name: "setup",
        component: () => import("./pages/SetupPage.vue"),
        meta: {
            guestOnly: true,
        },
    },
    {
        path: "/chat",
        name: "chat",
        component: () => import("./pages/ChatPage.vue"),
        meta: {
            requiresAuth: true,
        },
    },
];
