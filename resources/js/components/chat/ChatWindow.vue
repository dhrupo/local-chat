<script setup>
import { computed, nextTick, ref, watch } from "vue";
import {
    ChatDotRound,
    Paperclip,
    SwitchButton,
    PhoneFilled,
    VideoCameraFilled,
} from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";

const props = defineProps({
    currentUser: {
        type: Object,
        required: true,
    },
    room: {
        type: Object,
        default: null,
    },
    messages: {
        type: Array,
        default: () => [],
    },
    sending: {
        type: Boolean,
        default: false,
    },
    loading: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(["send-message", "leave-room", "upload-file", "start-call"]);

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const draft = ref("");
const messageContainer = ref(null);
const fileInput = ref(null);

const onlineMembers = computed(() =>
    (props.room?.members || []).filter((member) => member.is_online)
);

const firstUnreadMessageId = computed(() => {
    const unreadCount = props.room?.unread_count || 0;

    if (!unreadCount || unreadCount > props.messages.length) {
        return null;
    }

    return props.messages[props.messages.length - unreadCount]?.id || null;
});

const roomDescription = computed(() => {
    if (!props.room) {
        return "";
    }

    if (props.room.is_direct) {
        return "Private 1:1 conversation on the same Wi-Fi network.";
    }

    return props.room.description || "Use this room for quick coordination on the same network.";
});

const submit = () => {
    if (!draft.value.trim()) {
        return;
    }

    emit("send-message", draft.value);
    draft.value = "";
};

const chooseFile = () => {
    fileInput.value?.click();
};

const onFileChange = (event) => {
    const [file] = event.target.files || [];

    if (file) {
        if (file.size > MAX_FILE_SIZE) {
            ElMessage.error("Files must be 5 MB or smaller.");
            event.target.value = "";
            return;
        }

        emit("upload-file", file);
    }

    event.target.value = "";
};

const formatBytes = (bytes) => {
    if (!bytes) {
        return "0 B";
    }

    const units = ["B", "KB", "MB", "GB"];
    const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / 1024 ** unitIndex;

    return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

watch(
    () => props.messages.length,
    async () => {
        await nextTick();

        if (messageContainer.value) {
            messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
        }
    }
);
</script>

<template>
    <section v-if="room" class="grid h-full gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div class="app-card flex min-h-[70vh] flex-col rounded-[28px] p-4 md:p-5">
            <header class="mb-4 flex flex-col gap-4 border-b border-[var(--app-border)] pb-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p class="brand-font text-3xl font-bold tracking-tight text-[var(--app-text)]">{{ room.name }}</p>
                    <p class="mt-1 text-sm text-[var(--app-text-soft)]">
                        {{ roomDescription }}
                    </p>
                </div>

                <div class="flex items-center gap-3">
                    <el-tag type="success" effect="light">{{ onlineMembers.length }} online</el-tag>
                    <el-button
                        v-if="room.joined && !room.is_direct"
                        :icon="SwitchButton"
                        plain
                        @click="$emit('leave-room', room.id)"
                    >
                        Leave Room
                    </el-button>
                </div>
            </header>

            <div ref="messageContainer" class="message-scroll flex-1 space-y-4 overflow-y-auto pr-1">
                <div v-if="loading" class="flex h-full items-center justify-center py-12">
                    <el-skeleton animated :rows="6" />
                </div>

                <div
                    v-for="message in messages"
                    :key="message.id"
                    class="space-y-2"
                >
                    <div
                        v-if="message.id === firstUnreadMessageId"
                        class="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--app-accent-deep)]"
                    >
                        <span class="h-px flex-1 bg-[var(--app-border-strong)]"></span>
                        New messages
                        <span class="h-px flex-1 bg-[var(--app-border-strong)]"></span>
                    </div>

                    <div
                        class="flex"
                        :class="message.sender.id === currentUser.id ? 'justify-end' : 'justify-start'"
                    >
                        <el-card
                            class="max-w-[85%] rounded-[24px] border-0"
                            :class="
                                message.sender.id === currentUser.id
                                    ? 'message-bubble-self bg-[var(--app-accent)] text-white'
                                    : 'message-bubble-other bg-white text-[var(--app-text)]'
                            "
                        >
                            <div class="flex items-center gap-3 text-xs opacity-80">
                                <span class="font-semibold">{{ message.sender.display_name }}</span>
                                <span>{{ message.created_at_human }}</span>
                            </div>
                            <p
                                v-if="message.body"
                                class="mt-2 whitespace-pre-wrap break-words text-sm leading-6"
                            >
                                {{ message.body }}
                            </p>
                            <a
                                v-if="message.type === 'file' && message.file"
                                :href="message.file.download_url"
                                class="mt-3 flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-sm no-underline transition"
                                :class="
                                    message.sender.id === currentUser.id
                                        ? 'border-white/20 bg-black/10 text-white hover:bg-black/15'
                                        : 'border-[var(--app-border)] bg-[var(--app-accent-soft)] text-[var(--app-text)] hover:bg-[var(--app-accent-soft)]/80'
                                "
                            >
                                <div class="min-w-0">
                                    <p class="truncate font-semibold">{{ message.file.name }}</p>
                                    <p class="mt-1 text-xs opacity-80">
                                        {{ message.file.mime_type }} • {{ formatBytes(message.file.size) }}
                                    </p>
                                </div>
                                <span class="shrink-0 text-xs font-semibold uppercase tracking-[0.18em]">
                                    Download
                                </span>
                            </a>
                            <p
                                v-if="message.sender.id === currentUser.id"
                                class="mt-2 text-right text-[11px] font-semibold uppercase tracking-[0.16em] opacity-70"
                            >
                                Sent
                            </p>
                        </el-card>
                    </div>
                </div>

                <div
                    v-if="!loading && !messages.length"
                    class="flex h-full min-h-[240px] items-center justify-center rounded-[28px] border border-dashed border-[var(--app-border-strong)] bg-white/65 p-8 text-center"
                >
                    <div>
                        <el-icon size="34" class="text-[var(--app-accent)]">
                            <ChatDotRound />
                        </el-icon>
                        <p class="mt-4 brand-font text-xl font-bold">No messages yet</p>
                        <p class="mt-2 text-sm text-[var(--app-text-soft)]">
                            {{
                                room.is_direct
                                    ? "Start the conversation with this device on the same Wi-Fi network."
                                    : "Start the conversation and everyone in this room will see it on the same Wi-Fi network."
                            }}
                        </p>
                    </div>
                </div>
            </div>

            <footer v-if="room.joined" class="mt-4 border-t border-[var(--app-border)] pt-4">
                <div class="flex flex-col gap-3 md:flex-row">
                    <input
                        ref="fileInput"
                        type="file"
                        class="hidden"
                        @change="onFileChange"
                    />
                    <el-button plain :icon="Paperclip" class="md:self-end" @click="chooseFile">
                        Share File (5 MB)
                    </el-button>
                    <el-input
                        v-model="draft"
                        type="textarea"
                        :rows="3"
                        resize="none"
                        placeholder="Write a message..."
                        @keydown.enter.exact.prevent="submit"
                    />
                    <el-button
                        type="primary"
                        class="md:self-end"
                        :loading="sending"
                        :disabled="!draft.trim()"
                        @click="submit"
                    >
                        Send
                    </el-button>
                </div>
            </footer>
        </div>

        <aside class="app-card rounded-[28px] p-4 md:p-5">
            <div class="flex items-center justify-between">
                <h2 class="brand-font text-xl font-bold">Members</h2>
                <el-tag effect="plain">{{ room.member_count }}</el-tag>
            </div>

            <div class="mt-4 space-y-3">
                <div
                    v-for="member in room.members"
                    :key="member.id"
                    class="app-panel rounded-[22px] p-3"
                >
                    <div class="flex items-center gap-3">
                        <div
                            class="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--app-accent-soft)] font-semibold text-[var(--app-accent-deep)]"
                        >
                            {{ member.initials }}
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2">
                                <p class="truncate font-semibold text-[var(--app-text)]">{{ member.display_name }}</p>
                                <el-tag
                                    size="small"
                                    :type="member.is_online ? 'success' : 'info'"
                                    effect="light"
                                >
                                    {{ member.is_online ? "Online" : "Away" }}
                                </el-tag>
                            </div>
                            <p class="truncate text-sm text-[var(--app-text-soft)]">
                                {{ member.membership_role === "owner" ? "Room owner" : "Room member" }}
                            </p>
                        </div>
                        <div
                            v-if="room.joined && member.id !== currentUser.id"
                            class="flex items-center gap-2"
                        >
                            <el-button
                                circle
                                plain
                                :icon="PhoneFilled"
                                @click="$emit('start-call', { participant: member, mode: 'voice' })"
                            />
                            <el-button
                                circle
                                type="primary"
                                plain
                                :icon="VideoCameraFilled"
                                @click="$emit('start-call', { participant: member, mode: 'video' })"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    </section>

    <section v-else class="app-card flex min-h-[70vh] items-center justify-center rounded-[28px] p-8 text-center">
        <div>
            <p class="brand-font text-3xl font-bold">Choose a room</p>
            <p class="mt-3 text-[var(--app-text-soft)]">
                Open an existing room from the sidebar or create a new group to start chatting.
            </p>
        </div>
    </section>
</template>
