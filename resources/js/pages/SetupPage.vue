<script setup>
import { reactive } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();
const router = useRouter();

const form = reactive({
    display_name: authStore.savedIdentity?.display_name || "",
});

const resolveDisplayNameError = (error) =>
    error.response?.data?.errors?.display_name?.[0]
    || error.response?.data?.message
    || "Could not save your display name.";

const submit = async () => {
    try {
        await authStore.connect(form.display_name);
        ElMessage.success("Device connected to the local chat server.");
        await router.push({ name: "chat" });
    } catch (error) {
        ElMessage.error(resolveDisplayNameError(error));
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
                        Join instantly from any device on one Wi-Fi network.
                    </h1>
                    <p class="mt-5 max-w-xl text-lg leading-8 text-[var(--app-text-soft)]">
                        No accounts, no passwords, no internet identity. Pick a display name, keep a device identity on this browser, and start chatting over the local server.
                    </p>
                </div>

                <div class="mt-8 grid gap-4 md:grid-cols-3">
                    <div class="app-panel rounded-[28px] p-5">
                        <p class="brand-font text-lg font-bold">Display Name</p>
                        <p class="mt-2 text-sm text-[var(--app-text-soft)]">
                            Your device keeps a stable local identity, while you control the name everyone sees.
                        </p>
                    </div>
                    <div class="app-panel rounded-[28px] p-5">
                        <p class="brand-font text-lg font-bold">Single Wi-Fi</p>
                        <p class="mt-2 text-sm text-[var(--app-text-soft)]">
                            Everything stays on the local server for the current network without internet accounts.
                        </p>
                    </div>
                    <div class="app-panel rounded-[28px] p-5">
                        <p class="brand-font text-lg font-bold">Realtime Rooms</p>
                        <p class="mt-2 text-sm text-[var(--app-text-soft)]">
                            Join rooms, see live messages, and track presence as devices come online.
                        </p>
                    </div>
                </div>
            </section>

            <section class="app-card rounded-[36px] p-8 md:p-10">
                <p class="brand-font text-3xl font-bold">Set Your Display Name</p>
                <p class="mt-2 text-sm text-[var(--app-text-soft)]">
                    This name is stored for this device and can be changed later.
                </p>

                <form class="mt-8 space-y-4" @submit.prevent="submit">
                    <div>
                        <label class="mb-2 block text-sm font-semibold text-[var(--app-text)]">Display name</label>
                        <el-input
                            v-model="form.display_name"
                            size="large"
                            maxlength="60"
                            show-word-limit
                            placeholder="Dhrupo, Conference Room TV, Front Desk..."
                        />
                    </div>

                    <el-button
                        native-type="submit"
                        type="primary"
                        size="large"
                        class="!mt-6 w-full"
                        :loading="authStore.loading"
                        :disabled="form.display_name.trim().length < 2"
                    >
                        Join Local Chat
                    </el-button>
                </form>
            </section>
        </div>
    </main>
</template>
