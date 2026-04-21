<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import RoomSidebar from "../components/chat/RoomSidebar.vue";
import ChatWindow from "../components/chat/ChatWindow.vue";
import CreateRoomDialog from "../components/chat/CreateRoomDialog.vue";
import { useAuthStore } from "../stores/auth";
import { useChatStore } from "../stores/chat";

const router = useRouter();
const authStore = useAuthStore();
const chatStore = useChatStore();
const createDialogOpen = ref(false);

const currentUser = computed(() => authStore.user);
const activeRoom = computed(() => chatStore.activeRoom);

const refreshRooms = async () => {
    await chatStore.loadRooms();

    if (chatStore.activeRoomId && chatStore.activeRoom?.joined) {
        await chatStore.loadMessages(chatStore.activeRoomId);
    }
};

const handleCreateRoom = async (payload) => {
    try {
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
        ElMessage.success("You joined the room.");
    } catch (error) {
        ElMessage.error(error.response?.data?.message || "Unable to join room.");
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

const logout = async () => {
    await authStore.logout();
    chatStore.stopRealtime(currentUser.value?.id);
    router.push({ name: "login" });
};

onMounted(async () => {
    await chatStore.hydrate();
    chatStore.startRealtime(currentUser.value?.id);
});

onUnmounted(() => {
    chatStore.stopRealtime(currentUser.value?.id);
});
</script>

<template>
    <main class="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">
        <div class="mb-4 flex flex-col gap-3 rounded-[28px] bg-white/45 px-5 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
            <div>
                <p class="brand-font text-2xl font-bold text-[var(--app-text)]">Network Status: Online</p>
                <p class="text-sm text-[var(--app-text-soft)]">
                    Keep this device on the same Wi-Fi network as everyone else.
                </p>
            </div>

            <div class="flex items-center gap-3">
                <el-tag type="success" effect="light">{{ chatStore.joinedRooms.length }} joined rooms</el-tag>
                <el-button plain @click="logout">Logout</el-button>
            </div>
        </div>

        <div class="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
            <RoomSidebar
                :user="currentUser"
                :joined-rooms="chatStore.joinedRooms"
                :discoverable-rooms="chatStore.discoverableRooms"
                :active-room-id="chatStore.activeRoomId"
                @refresh="refreshRooms"
                @select-room="chatStore.selectRoom"
                @join-room="handleJoinRoom"
                @open-create="createDialogOpen = true"
            />

            <ChatWindow
                :current-user="currentUser"
                :room="activeRoom"
                :messages="chatStore.activeMessages"
                :sending="chatStore.sendingMessage"
                :loading="chatStore.loadingMessages"
                @send-message="handleSendMessage"
                @leave-room="handleLeaveRoom"
            />
        </div>

        <CreateRoomDialog
            v-model="createDialogOpen"
            :users="chatStore.directory"
            :current-user-id="currentUser.id"
            @submit="handleCreateRoom"
        />
    </main>
</template>
