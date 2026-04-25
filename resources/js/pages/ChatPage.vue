<script setup>
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { Menu, Plus, RefreshRight } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import RoomSidebar from "../components/chat/RoomSidebar.vue";
import ChatWindow from "../components/chat/ChatWindow.vue";
import { useAuthStore } from "../stores/auth";
import { useChatStore } from "../stores/chat";
import { canUseMediaCalling, mediaCallingUnavailableReason, useCallStore } from "../stores/call";

const CallOverlay = defineAsyncComponent(() => import("../components/chat/CallOverlay.vue"));
const CreateRoomDialog = defineAsyncComponent(() => import("../components/chat/CreateRoomDialog.vue"));
const RuntimeStatusPanel = defineAsyncComponent(() => import("../components/chat/RuntimeStatusPanel.vue"));

const router = useRouter();
const authStore = useAuthStore();
const chatStore = useChatStore();
const callStore = useCallStore();
const createDialogOpen = ref(false);
const sidebarOpen = ref(false);
const isDesktop = ref(window.innerWidth >= 1280);

const currentUser = computed(() => authStore.user);
const activeRoom = computed(() => chatStore.activeRoom);
const callSupport = computed(() => ({
    voice: canUseMediaCalling(),
    video: canUseMediaCalling(),
    voiceReason: mediaCallingUnavailableReason("voice"),
    videoReason: mediaCallingUnavailableReason("video"),
}));

const syncViewport = () => {
    isDesktop.value = window.innerWidth >= 1280;

    if (isDesktop.value) {
        sidebarOpen.value = false;
    }
};

const refreshRooms = async () => {
    await Promise.all([chatStore.loadRooms(), chatStore.loadDirectory()]);

    if (chatStore.activeRoomId && chatStore.activeRoom?.joined) {
        await chatStore.loadMessages(chatStore.activeRoomId);
    }
};

const handleCreateRoom = async (payload) => {
    try {
        await authStore.bootstrap();
        await chatStore.createRoom(payload);
        createDialogOpen.value = false;
        ElMessage.success("Room created.");
    } catch (error) {
        ElMessage.error(error.response?.data?.message || "Unable to create room.");
    }
};

const handleJoinRoom = async (roomId) => {
    try {
        await chatStore.joinRoom(roomId);
        sidebarOpen.value = false;
        ElMessage.success("You joined the room.");
    } catch (error) {
        ElMessage.error(error.response?.data?.message || "Unable to join room.");
    }
};

const handleOpenDirectChat = async (participantId) => {
    try {
        await chatStore.openDirectChat(participantId);
        sidebarOpen.value = false;
    } catch (error) {
        ElMessage.error(error.response?.data?.message || "Unable to open direct chat.");
    }
};

const handleLeaveRoom = async (roomId) => {
    try {
        await ElMessageBox.confirm(
            "You will stop receiving messages from this room until you join again.",
            "Leave room?",
            {
                confirmButtonText: "Leave",
                cancelButtonText: "Stay",
                type: "warning",
            }
        );

        await chatStore.leaveRoom(roomId);
        ElMessage.success("Room left.");
    } catch (error) {
        if (error !== "cancel") {
            ElMessage.error(error.response?.data?.message || "Unable to leave room.");
        }
    }
};

const handleSendMessage = async (body) => {
    try {
        await chatStore.sendMessage(chatStore.activeRoomId, body);
    } catch (error) {
        ElMessage.error(error.response?.data?.message || "Message could not be sent.");
    }
};

const handleUploadFile = async (file) => {
    try {
        await chatStore.uploadFile(chatStore.activeRoomId, file);
        ElMessage.success("File shared.");
    } catch (error) {
        ElMessage.error(error.response?.data?.message || "File could not be shared.");
    }
};

const handleStartCall = async ({ participant, mode }) => {
    try {
        await callStore.startCall(participant, mode, chatStore.activeRoomId);
        ElMessage.success(`${mode === "video" ? "Video" : "Voice"} call started.`);
    } catch (error) {
        ElMessage.error(error.response?.data?.message || error.message || "Unable to start the call.");
    }
};

const handleAnswerCall = async () => {
    try {
        await callStore.answerIncomingCall();
        ElMessage.success("Call connected.");
    } catch (error) {
        ElMessage.error(error.response?.data?.message || error.message || "Unable to answer the call.");
    }
};

const handleRejectCall = async () => {
    try {
        await callStore.rejectIncomingCall();
    } catch (error) {
        ElMessage.error(error.response?.data?.message || error.message || "Unable to reject the call.");
    }
};

const handleEndCall = async () => {
    try {
        await callStore.endCall();
    } catch (error) {
        ElMessage.error(error.response?.data?.message || error.message || "Unable to end the call.");
    }
};

const resetDevice = async () => {
    await callStore.endCall().catch(() => {});
    await authStore.disconnect();
    chatStore.stopRealtime(currentUser.value?.id);
    callStore.stopRealtime();
    router.push({ name: "setup" });
};

onMounted(async () => {
    syncViewport();
    window.addEventListener("resize", syncViewport);
    await chatStore.hydrate();
    chatStore.startRealtime(currentUser.value?.id);
    callStore.startRealtime(currentUser.value?.id);
});

onUnmounted(() => {
    window.removeEventListener("resize", syncViewport);
    chatStore.stopRealtime(currentUser.value?.id);
    callStore.stopRealtime();
});
</script>

<template>
    <main class="mx-auto max-w-[1600px] px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div class="mb-4 rounded-[28px] bg-white/45 px-4 py-4 backdrop-blur sm:px-5">
            <RuntimeStatusPanel
                :direct-chat-count="chatStore.directChats.length"
                :group-room-count="chatStore.joinedRooms.length"
            />
            <div class="mt-3 flex justify-end max-sm:justify-stretch">
                <el-button plain class="max-sm:!ml-0 max-sm:w-full" @click="resetDevice">Reset Device</el-button>
            </div>
        </div>

        <div class="mobile-chat-toolbar mb-4 xl:hidden">
            <div class="grid grid-cols-3 gap-2">
                <el-button plain :icon="Menu" class="!ml-0 w-full" @click="sidebarOpen = true">
                    Rooms
                </el-button>
                <el-button plain :icon="RefreshRight" class="!ml-0 w-full" @click="refreshRooms">
                    Refresh
                </el-button>
                <el-button type="primary" plain :icon="Plus" class="!ml-0 w-full" @click="createDialogOpen = true">
                    New Group
                </el-button>
            </div>
            <div
                v-if="activeRoom"
                class="mt-2 min-w-0 rounded-[22px] border border-[var(--app-border)] bg-white/70 px-3 py-3 text-left"
            >
                <p class="truncate text-sm font-semibold text-[var(--app-text)]">{{ activeRoom.name }}</p>
                <p class="truncate text-xs text-[var(--app-text-soft)]">
                    {{ activeRoom.is_direct ? "Direct chat" : `${activeRoom.member_count} members` }}
                </p>
            </div>
        </div>

        <div class="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
            <div class="hidden xl:block">
                <RoomSidebar
                    :user="currentUser"
                    :participants="chatStore.directory.filter((participant) => participant.id !== currentUser?.id)"
                    :direct-chats="chatStore.directChats"
                    :joined-rooms="chatStore.joinedRooms"
                    :discoverable-rooms="chatStore.discoverableRooms"
                    :active-room-id="chatStore.activeRoomId"
                    @refresh="refreshRooms"
                    @select-room="chatStore.selectRoom"
                    @join-room="handleJoinRoom"
                    @open-direct-chat="handleOpenDirectChat"
                    @open-create="createDialogOpen = true"
                />
            </div>

            <ChatWindow
                :current-user="currentUser"
                :room="activeRoom"
                :messages="chatStore.activeMessages"
                :sending="chatStore.sendingMessage || chatStore.uploadingFile"
                :loading="chatStore.loadingMessages"
                :call-support="callSupport"
                @send-message="handleSendMessage"
                @leave-room="handleLeaveRoom"
                @upload-file="handleUploadFile"
                @start-call="handleStartCall"
            />
        </div>

        <el-drawer
            v-model="sidebarOpen"
            direction="ltr"
            size="92%"
            :with-header="false"
            append-to-body
            class="mobile-room-drawer"
        >
            <RoomSidebar
                :user="currentUser"
                :participants="chatStore.directory.filter((participant) => participant.id !== currentUser?.id)"
                :direct-chats="chatStore.directChats"
                :joined-rooms="chatStore.joinedRooms"
                :discoverable-rooms="chatStore.discoverableRooms"
                :active-room-id="chatStore.activeRoomId"
                @refresh="refreshRooms"
                @select-room="(roomId) => { chatStore.selectRoom(roomId); sidebarOpen = false; }"
                @join-room="handleJoinRoom"
                @open-direct-chat="handleOpenDirectChat"
                @open-create="() => { createDialogOpen = true; sidebarOpen = false; }"
            />
        </el-drawer>

        <CallOverlay
            :incoming-call="callStore.incomingCall"
            :active-call="callStore.activeCall"
            :local-stream="callStore.localStream"
            :remote-stream="callStore.remoteStream"
            :busy="callStore.initializing"
            :call-support="callSupport"
            @answer="handleAnswerCall"
            @reject="handleRejectCall"
            @end="handleEndCall"
        />

        <CreateRoomDialog
            v-model="createDialogOpen"
            :users="chatStore.directory"
            :current-user-id="currentUser.id"
            @submit="handleCreateRoom"
        />
    </main>
</template>

<style scoped>
:global(.mobile-room-drawer) {
    background: rgba(244, 239, 230, 0.96);
}

:global(.mobile-room-drawer .el-drawer__body) {
    padding: 12px;
}

.mobile-chat-toolbar {
    position: sticky;
    top: 0.75rem;
    z-index: 15;
}
</style>
