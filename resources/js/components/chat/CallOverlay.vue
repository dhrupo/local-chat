<script setup>
import { computed, ref, watch } from "vue";
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

const isVideoCall = computed(
    () => props.activeCall?.mode === "video" || props.incomingCall?.mode === "video"
);

const syncMediaElement = (element, stream, muted = false) => {
    if (!element) {
        return;
    }

    element.srcObject = stream || null;
    element.muted = muted;

    if (stream) {
        element.play?.().catch(() => {});
    }
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
        syncMediaElement(remoteVideo.value, stream, false);
    },
    { immediate: true }
);

watch(localVideo, (element) => {
    syncMediaElement(element, props.localStream, true);
});

watch(remoteVideo, (element) => {
    syncMediaElement(element, props.remoteStream, false);
});
</script>

<template>
    <transition name="call-overlay">
        <div
            v-if="incomingCall || activeCall"
            class="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(16,24,40,0.56)] px-4 py-4 backdrop-blur md:items-center"
        >
            <div class="w-full max-w-5xl rounded-[32px] border border-white/35 bg-[rgba(255,248,240,0.96)] p-4 shadow-[0_32px_90px_rgba(15,23,42,0.28)] md:p-6">
                <div class="flex flex-col gap-6 lg:grid lg:grid-cols-[340px_minmax(0,1fr)]">
                    <div class="rounded-[28px] bg-[var(--app-accent-soft)] p-5">
                        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--app-accent-deep)]">
                            {{ incomingCall ? "Incoming call" : "Active call" }}
                        </p>
                        <h2 class="mt-3 brand-font text-3xl font-bold text-[var(--app-text)]">
                            {{ incomingCall?.from?.display_name || activeCall?.participant?.display_name }}
                        </h2>
                        <p class="mt-2 text-sm text-[var(--app-text-soft)]">
                            {{
                                isVideoCall
                                    ? "Direct video call over your current Wi-Fi network."
                                    : "Direct voice call over your current Wi-Fi network."
                            }}
                        </p>

                        <div class="mt-5 flex items-center gap-2">
                            <el-tag round effect="light" :type="isVideoCall ? 'warning' : 'success'">
                                {{ isVideoCall ? "Video" : "Voice" }}
                            </el-tag>
                            <el-tag round effect="plain">
                                {{ activeCall?.status || incomingCall?.status || "ringing" }}
                            </el-tag>
                        </div>

                        <div class="mt-8 flex flex-wrap gap-3">
                            <el-button
                                v-if="incomingCall"
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

                    <div class="grid gap-4 md:grid-cols-2">
                        <div class="relative overflow-hidden rounded-[28px] bg-[var(--app-text)] p-3 text-white">
                            <div class="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.22em] text-white/70">
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
                                class="h-[220px] w-full rounded-[22px] bg-black object-cover"
                            />
                            <div
                                v-else
                                class="flex h-[220px] items-center justify-center rounded-[22px] bg-white/10"
                            >
                                <el-icon size="42">
                                    <Phone />
                                </el-icon>
                            </div>
                        </div>

                        <div class="relative overflow-hidden rounded-[28px] bg-[var(--app-text)] p-3 text-white">
                            <div class="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.22em] text-white/70">
                                <span>{{ incomingCall?.from?.display_name || activeCall?.participant?.display_name }}</span>
                                <el-icon>
                                    <component :is="isVideoCall ? VideoCameraFilled : Microphone" />
                                </el-icon>
                            </div>

                            <video
                                v-if="isVideoCall"
                                ref="remoteVideo"
                                playsinline
                                autoplay
                                class="h-[220px] w-full rounded-[22px] bg-black object-cover"
                            />
                            <div
                                v-else
                                class="flex h-[220px] items-center justify-center rounded-[22px] bg-white/10"
                            >
                                <el-icon size="42">
                                    <Phone />
                                </el-icon>
                            </div>
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
