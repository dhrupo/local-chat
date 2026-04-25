<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { Bell, Connection, Lock, Microphone, WarningFilled } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { canUseMediaCalling, hasTurnServer } from "../../stores/call";

const props = defineProps({
    directChatCount: {
        type: Number,
        default: 0,
    },
    groupRoomCount: {
        type: Number,
        default: 0,
    },
});

const notificationPermission = ref("Notification" in window ? Notification.permission : "unsupported");
const realtimeState = ref(window.LocalChatRealtimeState || "connecting");
const online = ref(navigator.onLine);

const isSecureContext = computed(() => window.isSecureContext);
const secureContextStatus = computed(() => (window.isSecureContext ? "Secure" : "Not secure"));
const mediaStatus = computed(() => (
    navigator.mediaDevices?.getUserMedia ? "Available" : "Unavailable"
));
const callStatus = computed(() => (canUseMediaCalling() ? "Ready" : "Limited"));
const notificationStatus = computed(() => {
    if (notificationPermission.value === "granted") {
        return "Allowed";
    }

    if (notificationPermission.value === "denied") {
        return "Blocked";
    }

    if (notificationPermission.value === "unsupported") {
        return "Unsupported";
    }

    return "Ask";
});

const realtimeTagType = computed(() => {
    if (!online.value) {
        return "danger";
    }

    if (realtimeState.value === "connected") {
        return "success";
    }

    return ["failed", "unavailable", "disconnected"].includes(realtimeState.value) ? "danger" : "warning";
});

const requestNotifications = async () => {
    if (!("Notification" in window)) {
        ElMessage.warning("This browser does not support system notifications.");
        return;
    }

    try {
        notificationPermission.value = await Promise.resolve(Notification.requestPermission());
        ElMessage[notificationPermission.value === "granted" ? "success" : "warning"](
            notificationPermission.value === "granted"
                ? "Message notifications enabled."
                : "Message notifications are not enabled."
        );
    } catch {
        ElMessage.error("Unable to request notification permission.");
    }
};

const playTestSound = async () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) {
        ElMessage.warning("This browser does not support notification sounds.");
        return;
    }

    try {
        const context = new AudioContext();
        await context.resume();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const now = context.currentTime;

        oscillator.frequency.setValueAtTime(740, now);
        oscillator.frequency.setValueAtTime(980, now + 0.08);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.24);
        window.setTimeout(() => context.close(), 500);
    } catch {
        ElMessage.error("Sound is blocked by the browser until you interact with the page.");
    }
};

const onRealtimeState = (event) => {
    realtimeState.value = event.detail?.state || "unknown";
};

const onOnline = () => {
    online.value = true;
};

const onOffline = () => {
    online.value = false;
};

onMounted(() => {
    window.addEventListener("local-chat:realtime-state", onRealtimeState);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
});

onUnmounted(() => {
    window.removeEventListener("local-chat:realtime-state", onRealtimeState);
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
});
</script>

<template>
    <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
            <p class="brand-font text-2xl font-bold text-[var(--app-text)]">Network Status</p>
            <p class="text-sm text-[var(--app-text-soft)]">
                {{ online ? "Connected to this browser network." : "This browser is offline." }}
                Keep devices on the same Wi-Fi.
            </p>
        </div>

        <div class="flex flex-wrap gap-2">
            <el-tag :type="realtimeTagType" effect="light">
                <el-icon class="mr-1"><Connection /></el-icon>
                Realtime: {{ online ? realtimeState : "offline" }}
            </el-tag>
            <el-tag :type="isSecureContext ? 'success' : 'danger'" effect="light">
                <el-icon class="mr-1"><Lock /></el-icon>
                {{ secureContextStatus }}
            </el-tag>
            <el-tag :type="mediaStatus === 'Available' ? 'success' : 'danger'" effect="light">
                <el-icon class="mr-1"><Microphone /></el-icon>
                Media: {{ mediaStatus }}
            </el-tag>
            <el-tag :type="callStatus === 'Ready' ? 'success' : 'warning'" effect="light">
                Calls: {{ callStatus }}
            </el-tag>
            <el-tag :type="notificationPermission === 'granted' ? 'success' : 'warning'" effect="light">
                <el-icon class="mr-1"><Bell /></el-icon>
                Notifications: {{ notificationStatus }}
            </el-tag>
            <el-tag :type="hasTurnServer() ? 'success' : 'info'" effect="plain">
                TURN: {{ hasTurnServer() ? "configured" : "not set" }}
            </el-tag>
            <el-tag type="success" effect="light">{{ directChatCount }} direct</el-tag>
            <el-tag type="warning" effect="light">{{ groupRoomCount }} groups</el-tag>
        </div>

        <div
            v-if="!isSecureContext"
            class="rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 lg:col-span-2"
        >
            <el-icon class="mr-1 align-middle"><WarningFilled /></el-icon>
            Chat works on HTTP, but camera and microphone usually require trusted HTTPS on phones.
            Calls are best on desktop localhost or trusted HTTPS. Use a trusted cert/domain, or manually trust your local certificate.
        </div>

        <div class="flex flex-wrap gap-2 lg:col-span-2">
            <el-button size="small" plain :icon="Bell" @click="requestNotifications">
                Enable Notifications
            </el-button>
            <el-button size="small" plain @click="playTestSound">
                Test Sound
            </el-button>
        </div>
    </div>
</template>
