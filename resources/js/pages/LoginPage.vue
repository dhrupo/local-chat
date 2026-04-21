<script setup>
import { reactive } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();
const router = useRouter();

const form = reactive({
    login: "admin@localchat.test",
    password: "password",
});

const demoAccounts = [
    "admin@localchat.test",
    "aisha@localchat.test",
    "nafis@localchat.test",
    "tania@localchat.test",
];

const submit = async () => {
    try {
        await authStore.login(form);
        ElMessage.success("Connected to the local chat server.");
        await router.push({ name: "chat" });
    } catch (error) {
        ElMessage.error(
            error.response?.data?.message || "Login failed. Check the demo credentials."
        );
    }
};
</script>

<template>
    <main class="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div class="grid w-full gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section class="app-card rounded-[36px] p-8 md:p-10">
                <div class="max-w-2xl">
                    <p class="brand-font text-sm font-bold uppercase tracking-[0.3em] text-[var(--app-accent)]">
                        Local Network Messaging
                    </p>
                    <h1 class="brand-font mt-4 text-5xl font-bold tracking-tight text-[var(--app-text)] md:text-6xl">
                        Chat with every device on one Wi-Fi network.
                    </h1>
                    <p class="mt-5 max-w-xl text-lg leading-8 text-[var(--app-text-soft)]">
                        Create group rooms, see who is online, and keep everything inside your local network.
                        This first build is text-first and room-based, ready for 1:1 voice and video later.
                    </p>
                </div>

                <div class="mt-8 grid gap-4 md:grid-cols-3">
                    <div class="app-panel rounded-[28px] p-5">
                        <p class="brand-font text-lg font-bold">Rooms</p>
                        <p class="mt-2 text-sm text-[var(--app-text-soft)]">
                            Create group channels for teams, families, or game nights.
                        </p>
                    </div>
                    <div class="app-panel rounded-[28px] p-5">
                        <p class="brand-font text-lg font-bold">Presence</p>
                        <p class="mt-2 text-sm text-[var(--app-text-soft)]">
                            See who is online and active on the LAN without relying on the public internet.
                        </p>
                    </div>
                    <div class="app-panel rounded-[28px] p-5">
                        <p class="brand-font text-lg font-bold">Unread State</p>
                        <p class="mt-2 text-sm text-[var(--app-text-soft)]">
                            Track room activity with per-user unread counts and recent message previews.
                        </p>
                    </div>
                </div>
            </section>

            <section class="app-card rounded-[36px] p-8 md:p-10">
                <p class="brand-font text-3xl font-bold">Sign in to Local Chat</p>
                <p class="mt-2 text-sm text-[var(--app-text-soft)]">
                    Seeded demo users use the shared password <strong>password</strong>.
                </p>

                <form class="mt-8 space-y-4" @submit.prevent="submit">
                    <div>
                        <label class="mb-2 block text-sm font-semibold text-[var(--app-text)]">Email or Name</label>
                        <el-input v-model="form.login" size="large" placeholder="admin@localchat.test" />
                    </div>

                    <div>
                        <label class="mb-2 block text-sm font-semibold text-[var(--app-text)]">Password</label>
                        <el-input
                            v-model="form.password"
                            size="large"
                            type="password"
                            show-password
                            placeholder="password"
                        />
                    </div>

                    <el-button
                        native-type="submit"
                        type="primary"
                        size="large"
                        class="!mt-6 w-full"
                        :loading="authStore.loading"
                    >
                        Enter Chat
                    </el-button>
                </form>

                <div class="mt-8 rounded-[28px] bg-[var(--app-accent-soft)] p-5">
                    <p class="text-xs font-bold uppercase tracking-[0.24em] text-[var(--app-text-soft)]">
                        Demo Accounts
                    </p>
                    <div class="mt-3 flex flex-wrap gap-2">
                        <el-tag
                            v-for="account in demoAccounts"
                            :key="account"
                            effect="light"
                            type="info"
                            class="cursor-pointer"
                            @click="form.login = account"
                        >
                            {{ account }}
                        </el-tag>
                    </div>
                </div>
            </section>
        </div>
    </main>
</template>
