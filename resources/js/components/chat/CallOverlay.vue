<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { Phone, VideoCameraFilled, PhoneFilled, CloseBold, Microphone } from "@element-plus/icons-vue";

const props = defineProps({
    incomingCall: {
        type: Object,
        default: null,
    },
    activeCall: {
        type: Object,
        default: null,
    },
    localStream: {
        type: Object,
        default: null,
    },
    remoteStream: {
        type: Object,
        default: null,
    },
    busy: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(["answer", "reject", "end"]);

const localVideo = ref(null);
const remoteVideo = ref(null);
const remoteAudio = ref(null);
const remotePlaybackBlocked = ref(false);

let ringtoneTimer = null;
let ringtoneContext = null;
let browserNotification = null;

const isVideoCall = computed(
    () => props.activeCall?.mode === "video" || props.incomingCall?.mode === "video"
);

const callerName = computed(
    () => props.incomingCall?.from?.display_name || props.activeCall?.participant?.display_name || "Unknown device"
);

const callModeLabel = computed(() => (isVideoCall.value ? "Video" : "Voice"));

const playRingtoneTick = async () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) {
        return;
    }

    try {
        ringtoneContext = ringtoneContext || new AudioContext();
        await ringtoneContext.resume();

        const oscillator = ringtoneContext.createOscillator();
        const gain = ringtoneContext.createGain();
        const now = ringtoneContext.currentTime;

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, now);
        oscillator.frequency.setValueAtTime(660, now + 0.16);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.08, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);

        oscillator.connect(gain);
        gain.connect(ringtoneContext.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.38);
    } catch {
        // Browsers may block audio until the next user gesture.
    }
};

const stopIncomingAlerts = () => {
    if (ringtoneTimer) {
        clearInterval(ringtoneTimer);
        ringtoneTimer = null;
    }

    browserNotification?.close?.();
    browserNotification = null;
};

const showBrowserNotification = async (call) => {
    if (!("Notification" in window) || !call) {
        return;
    }

    try {
        let permission = Notification.permission;

        if (permission === "default") {
            permission = await Notification.requestPermission();
        }

        if (permission !== "granted" || !props.incomingCall) {
            return;
        }

        browserNotification?.close?.();
        browserNotification = new Notification(`Incoming ${callModeLabel.value.toLowerCase()} call`, {
            body: `${call.from?.display_name || "A device"} is calling you on Local Chat.`,
            tag: "local-chat-incoming-call",
            renotify: true,
        });
    } catch {
        // System notifications are optional; the in-app modal still appears.
    }
};

const startIncomingAlerts = (call) => {
    stopIncomingAlerts();
    playRingtoneTick();
    ringtoneTimer = window.setInterval(playRingtoneTick, 1200);
    showBrowserNotification(call);
};

const syncMediaElement = async (element, stream, muted = false) => {
    if (!element) {
        return;
    }

    element.srcObject = stream || null;
    element.muted = muted;
    element.volume = muted ? 0 : 1;

    if (!stream) {
        remotePlaybackBlocked.value = false;
        return;
    }

    try {
        await element.play?.();
        if (!muted) {
            remotePlaybackBlocked.value = false;
        }
    } catch {
        if (!muted) {
            remotePlaybackBlocked.value = true;
        }
    }
};

const enableRemoteSound = () => {
    syncMediaElement(remoteAudio.value, props.remoteStream, false);
};

watch(
    () => props.localStream,
    (stream) => {
        syncMediaElement(localVideo.value, stream, true);
    },
    { immediate: true }
);

watch(
    () => props.remoteStream,
    (stream) => {
        syncMediaElement(remoteVideo.value, stream, true);
        syncMediaElement(remoteAudio.value, stream, false);
    },
    { immediate: true }
);

watch(localVideo, (element) => {
    syncMediaElement(element, props.localStream, true);
});

watch(remoteVideo, (element) => {
    syncMediaElement(element, props.remoteStream, true);
});

watch(remoteAudio, (element) => {
    syncMediaElement(element, props.remoteStream, false);
});

watch(
    () => props.incomingCall,
    (call) => {
        if (call) {
            startIncomingAlerts(call);
            return;
        }

        stopIncomingAlerts();
    },
    { immediate: true }
);

onBeforeUnmount(() => {
    stopIncomingAlerts();
});
</script>

<template>
    <transition name="call-overlay">
        <div
            v-if="incomingCall || activeCall"
            class="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(16,24,40,0.56)] p-0 backdrop-blur sm:px-4 sm:py-4 md:items-center"
        >
            <div class="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-t-[30px] border border-white/35 bg-[rgba(255,248,240,0.97)] p-3 shadow-[0_32px_90px_rgba(15,23,42,0.28)] sm:rounded-[32px] sm:p-4 md:p-6">
                <div class="flex flex-col gap-3 sm:gap-5 lg:grid lg:grid-cols-[340px_minmax(0,1fr)]">
                    <div class="rounded-[24px] bg-[var(--app-accent-soft)] p-4 sm:rounded-[28px] sm:p-5">
                        <div
                            v-if="incomingCall"
                            class="mb-4 flex items-center gap-3 rounded-2xl bg-white/70 px-3 py-2 text-sm font-semibold text-[var(--app-accent-deep)]"
                        >
                            <span class="relative flex h-3 w-3">
                                <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"></span>
                                <span class="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
                            </span>
                            Ringing on this device
                        </div>

                        <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--app-accent-deep)] sm:text-xs sm:tracking-[0.24em]">
                            {{ incomingCall ? "Incoming call" : "Active call" }}
                        </p>
                        <h2 class="mt-2 brand-font text-2xl font-bold leading-tight text-[var(--app-text)] sm:mt-3 sm:text-3xl">
                            {{ callerName }}
                        </h2>
                        <p class="mt-2 text-sm text-[var(--app-text-soft)]">
                            {{
                                isVideoCall
                                    ? "Direct video call over your current Wi-Fi network."
                                    : "Direct voice call over your current Wi-Fi network."
                            }}
                        </p>

                        <div class="mt-4 flex items-center gap-2 sm:mt-5">
                            <el-tag round effect="light" :type="isVideoCall ? 'warning' : 'success'">
                                {{ callModeLabel }}
                            </el-tag>
                            <el-tag round effect="plain">
                                {{ activeCall?.status || incomingCall?.status || "ringing" }}
                            </el-tag>
                        </div>

                        <div class="mt-5 grid grid-cols-2 gap-3 sm:mt-8 sm:flex sm:flex-wrap">
                            <el-button
                                v-if="incomingCall"
                                class="!ml-0 w-full sm:w-auto"
                                type="success"
                                size="large"
                                :icon="PhoneFilled"
                                :loading="busy"
                                @click="$emit('answer')"
                            >
                                Answer
                            </el-button>
                            <el-button
                                v-if="incomingCall"
                                class="!ml-0 w-full sm:w-auto"
                                type="danger"
                                plain
                                size="large"
                                :icon="CloseBold"
                                :disabled="busy"
                                @click="$emit('reject')"
                            >
                                Reject
                            </el-button>
                            <el-button
                                v-if="activeCall"
                                class="!ml-0 w-full sm:w-auto"
                                type="danger"
                                size="large"
                                :icon="PhoneFilled"
                                :disabled="busy"
                                @click="$emit('end')"
                            >
                                End Call
                            </el-button>
                        </div>
                    </div>

                    <div class="grid gap-3 sm:gap-4 md:grid-cols-2">
                        <div class="relative overflow-hidden rounded-[24px] bg-[var(--app-text)] p-3 text-white sm:rounded-[28px]">
                            <div class="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-white/70 sm:mb-3 sm:text-xs sm:tracking-[0.22em]">
                                <span>Your device</span>
                                <el-icon>
                                    <component :is="isVideoCall ? VideoCameraFilled : Microphone" />
                                </el-icon>
                            </div>

                            <video
                                v-if="isVideoCall"
                                ref="localVideo"
                                playsinline
                                autoplay
                                muted
                                class="h-[150px] w-full rounded-[20px] bg-black object-cover sm:h-[220px] sm:rounded-[22px]"
                            />
                            <div
                                v-else
                                class="flex h-[104px] items-center justify-center rounded-[20px] bg-white/10 sm:h-[220px] sm:rounded-[22px]"
                            >
                                <el-icon size="42">
                                    <Phone />
                                </el-icon>
                            </div>
                        </div>

                        <div class="relative overflow-hidden rounded-[24px] bg-[var(--app-text)] p-3 text-white sm:rounded-[28px]">
                            <div class="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-white/70 sm:mb-3 sm:text-xs sm:tracking-[0.22em]">
                                <span>{{ callerName }}</span>
                                <el-icon>
                                    <component :is="isVideoCall ? VideoCameraFilled : Microphone" />
                                </el-icon>
                            </div>

                            <video
                                v-if="isVideoCall"
                                ref="remoteVideo"
                                playsinline
                                autoplay
                                muted
                                class="h-[150px] w-full rounded-[20px] bg-black object-cover sm:h-[220px] sm:rounded-[22px]"
                            />
                            <div
                                v-else
                                class="flex h-[104px] items-center justify-center rounded-[20px] bg-white/10 sm:h-[220px] sm:rounded-[22px]"
                            >
                                <audio
                                    ref="remoteAudio"
                                    autoplay
                                    playsinline
                                />
                                <el-icon size="42">
                                    <Phone />
                                </el-icon>
                            </div>
                            <audio
                                v-if="isVideoCall"
                                ref="remoteAudio"
                                autoplay
                                playsinline
                            />
                            <el-button
                                v-if="remotePlaybackBlocked"
                                class="mt-3"
                                type="primary"
                                plain
                                @click="enableRemoteSound"
                            >
                                Enable Sound
                            </el-button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </transition>
</template>

<style scoped>
.call-overlay-enter-active,
.call-overlay-leave-active {
    transition: opacity 0.2s ease;
}

.call-overlay-enter-from,
.call-overlay-leave-to {
    opacity: 0;
}
</style>
