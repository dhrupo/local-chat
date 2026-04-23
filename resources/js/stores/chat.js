import { defineStore } from "pinia";
import { ElNotification } from "element-plus";

let presenceIntervalId = null;
let directorySyncIntervalId = null;
let roomChannels = new Map();
let activePresenceChannel = null;
let participantDirectoryChannel = null;
let roomCatalogChannel = null;
let participantRoomsChannelName = null;
let messageAudioContext = null;
let lastMessageAlertAt = 0;
let audioUnlockRegistered = false;

const ACTIVE_ROOM_STORAGE_KEY = "local-chat-active-room-id";

const readActiveRoomId = () => {
    const value = Number(window.localStorage.getItem(ACTIVE_ROOM_STORAGE_KEY));

    return Number.isInteger(value) && value > 0 ? value : null;
};

const writeActiveRoomId = (roomId) => {
    if (!roomId) {
        window.localStorage.removeItem(ACTIVE_ROOM_STORAGE_KEY);
        return;
    }

    window.localStorage.setItem(ACTIVE_ROOM_STORAGE_KEY, String(roomId));
};

const playMessageSound = async () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) {
        return;
    }

    try {
        messageAudioContext = messageAudioContext || new AudioContext();
        await messageAudioContext.resume();

        const oscillator = messageAudioContext.createOscillator();
        const gain = messageAudioContext.createGain();
        const now = messageAudioContext.currentTime;

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(740, now);
        oscillator.frequency.setValueAtTime(980, now + 0.08);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.07, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

        oscillator.connect(gain);
        gain.connect(messageAudioContext.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.24);
    } catch {
        // Some mobile browsers require a user gesture before audio can play.
    }
};

const unlockMessageSound = async () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) {
        return;
    }

    try {
        messageAudioContext = messageAudioContext || new AudioContext();
        await messageAudioContext.resume();
    } catch {
        // Best effort only.
    }
};

const registerMessageSoundUnlock = () => {
    if (audioUnlockRegistered) {
        return;
    }

    audioUnlockRegistered = true;

    const unlock = () => {
        unlockMessageSound();
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("keydown", unlock);
        window.removeEventListener("touchstart", unlock);
    };

    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
};

const showBrowserMessageNotification = (title, body) => {
    if (!("Notification" in window) || Notification.permission !== "granted") {
        return;
    }

    try {
        new Notification(title, {
            body,
            tag: `local-chat-message-${Date.now()}`,
        });
    } catch {
        // Browser notifications are best effort; in-app toast still appears.
    }
};

const requestMessageNotificationPermission = () => {
    if (!("Notification" in window) || Notification.permission !== "default") {
        return;
    }

    Notification.requestPermission().catch(() => {});
};

export const useChatStore = defineStore("chat", {
    state: () => ({
        rooms: [],
        activeRoomId: readActiveRoomId(),
        messagesByRoom: {},
        directory: [],
        activePresenceMembers: [],
        loadingRooms: false,
        loadingMessages: false,
        sendingMessage: false,
        uploadingFile: false,
    }),
    getters: {
        directChats(state) {
            return state.rooms.filter((room) => room.joined && room.is_direct);
        },
        joinedRooms(state) {
            return state.rooms.filter((room) => room.joined && !room.is_direct);
        },
        discoverableRooms(state) {
            return state.rooms.filter((room) => !room.joined && !room.is_direct);
        },
        activeRoom(state) {
            const room = state.rooms.find((item) => item.id === state.activeRoomId) || null;

            if (!room) {
                return null;
            }

            if (!room.joined || !state.activePresenceMembers.length) {
                return room;
            }

            const onlineIds = new Set(state.activePresenceMembers.map((member) => member.id));

            return {
                ...room,
                members: room.members.map((member) => ({
                    ...member,
                    is_online: onlineIds.has(member.id),
                })),
            };
        },
        activeMessages(state) {
            return state.messagesByRoom[state.activeRoomId] || [];
        },
    },
    actions: {
        fallbackRoomId() {
            return this.rooms.find((room) => room.joined)?.id || this.rooms[0]?.id || null;
        },
        setActiveRoomId(roomId) {
            this.activeRoomId = roomId || null;
            writeActiveRoomId(this.activeRoomId);
        },
        async hydrate() {
            await Promise.all([this.loadRooms(), this.loadDirectory()]);

            if (!this.activeRoomId) {
                this.setActiveRoomId(this.fallbackRoomId());
            }

            if (this.activeRoomId && this.activeRoom?.joined) {
                await this.loadMessages(this.activeRoomId);
            }

            this.syncRoomSubscriptions();
            this.syncActivePresenceChannel();
        },
        async loadRooms() {
            this.loadingRooms = true;

            try {
                const { data } = await window.axios.get("/api/chat/rooms");
                this.rooms = data.data;

                if (this.activeRoomId && !this.rooms.some((room) => room.id === this.activeRoomId)) {
                    this.setActiveRoomId(this.fallbackRoomId());
                }

                this.syncRoomSubscriptions();
                this.syncActivePresenceChannel();
            } finally {
                this.loadingRooms = false;
            }
        },
        async loadDirectory(search = "") {
            const { data } = await window.axios.get("/api/participants", {
                params: { query: search || undefined },
            });

            this.directory = data.data;
        },
        async selectRoom(roomId) {
            this.setActiveRoomId(roomId);
            this.syncActivePresenceChannel();

            if (this.activeRoom?.joined) {
                await this.loadMessages(roomId);
            }
        },
        async createRoom(payload) {
            await window.axios.post("/api/chat/rooms", payload);
            await this.loadRooms();

            const newestJoinedRoom = this.joinedRooms[0];

            if (newestJoinedRoom) {
                this.setActiveRoomId(newestJoinedRoom.id);
                await this.loadMessages(newestJoinedRoom.id);
            }

            this.syncActivePresenceChannel();
        },
        async openDirectChat(participantId) {
            const { data } = await window.axios.post(`/api/chat/direct/${participantId}`);

            await this.loadRooms();
            this.setActiveRoomId(data.data.id);
            await this.loadMessages(data.data.id);
            this.syncActivePresenceChannel();
        },
        async joinRoom(roomId) {
            await window.axios.post(`/api/chat/rooms/${roomId}/join`);
            await this.loadRooms();
            this.setActiveRoomId(roomId);
            await this.loadMessages(roomId);
            this.syncActivePresenceChannel();
        },
        async leaveRoom(roomId) {
            await window.axios.delete(`/api/chat/rooms/${roomId}/leave`);
            delete this.messagesByRoom[roomId];
            await this.loadRooms();

            if (this.activeRoomId === roomId) {
                this.setActiveRoomId(this.fallbackRoomId());
            }

            if (this.activeRoomId && this.activeRoom?.joined) {
                await this.loadMessages(this.activeRoomId);
            }

            this.syncActivePresenceChannel();
        },
        async loadMessages(roomId) {
            if (!roomId) {
                return;
            }

            this.loadingMessages = true;

            try {
                const { data } = await window.axios.get(`/api/chat/rooms/${roomId}/messages`);
                this.messagesByRoom = {
                    ...this.messagesByRoom,
                    [roomId]: data.data,
                };

                const lastMessage = data.data[data.data.length - 1];

                if (lastMessage) {
                    await this.markAsRead(roomId, lastMessage.id);
                }
            } finally {
                this.loadingMessages = false;
            }
        },
        async sendMessage(roomId, body) {
            if (!body?.trim()) {
                return;
            }

            this.sendingMessage = true;

            try {
                const { data } = await window.axios.post(`/api/chat/rooms/${roomId}/messages`, {
                    body,
                });

                const current = this.messagesByRoom[roomId] || [];

                if (!current.some((item) => item.id === data.data.id)) {
                    this.messagesByRoom = {
                        ...this.messagesByRoom,
                        [roomId]: [...current, data.data],
                    };
                }

                await Promise.all([this.loadRooms(), this.markAsRead(roomId, data.data.id)]);
            } finally {
                this.sendingMessage = false;
            }
        },
        async uploadFile(roomId, file, body = "") {
            if (!file) {
                return;
            }

            this.uploadingFile = true;

            try {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("body", body);

                const { data } = await window.axios.post(`/api/chat/rooms/${roomId}/files`, formData, {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                });

                const current = this.messagesByRoom[roomId] || [];

                if (!current.some((item) => item.id === data.data.id)) {
                    this.messagesByRoom = {
                        ...this.messagesByRoom,
                        [roomId]: [...current, data.data],
                    };
                }

                await Promise.all([this.loadRooms(), this.markAsRead(roomId, data.data.id)]);
            } finally {
                this.uploadingFile = false;
            }
        },
        async markAsRead(roomId, messageId) {
            if (!messageId || !this.activeRoom?.joined) {
                return;
            }

            await window.axios.post(`/api/chat/rooms/${roomId}/read`, {
                last_read_message_id: messageId,
            });

            this.rooms = this.rooms.map((room) =>
                room.id === roomId
                    ? {
                          ...room,
                          unread_count: 0,
                      }
                    : room
            );
        },
        startRealtime(userId) {
            this.stopRealtime();
            window.LocalChatCurrentUserId = userId || null;
            registerMessageSoundUnlock();
            requestMessageNotificationPermission();

            participantDirectoryChannel = window.Echo.channel("participants").listen(
                ".participants.updated",
                async () => {
                    await this.loadDirectory();
                    await this.loadRooms();
                }
            );

            roomCatalogChannel = window.Echo.channel("rooms.catalog").listen(
                ".rooms.catalog.updated",
                async () => {
                    await this.loadRooms();
                }
            );

            directorySyncIntervalId = window.setInterval(async () => {
                await Promise.all([this.loadDirectory(), this.loadRooms()]);
            }, 5000);

            if (userId) {
                participantRoomsChannelName = `participant.${userId}`;

                window.Echo.private(participantRoomsChannelName).listen(".chat.rooms.updated", async (event) => {
                    await this.loadRooms();

                    if (event.room_id && event.room_id === this.activeRoomId && this.activeRoom?.joined) {
                        await this.loadMessages(this.activeRoomId);
                    }
                });
            }

            presenceIntervalId = window.setInterval(async () => {
                await window.axios.post("/api/presence/ping");
            }, 30000);
        },
        stopRealtime(userId = null) {
            window.LocalChatCurrentUserId = null;

            if (participantDirectoryChannel) {
                window.Echo.leave("participants");
                participantDirectoryChannel = null;
            }

            if (roomCatalogChannel) {
                window.Echo.leave("rooms.catalog");
                roomCatalogChannel = null;
            }

            if (participantRoomsChannelName) {
                window.Echo.leave(participantRoomsChannelName);
                participantRoomsChannelName = null;
            } else if (userId) {
                window.Echo.leave(`participant.${userId}`);
            }

            for (const roomId of roomChannels.keys()) {
                window.Echo.leave(`chat.room.${roomId}`);
            }

            roomChannels = new Map();
            this.leaveActivePresenceChannel();

            if (presenceIntervalId) {
                window.clearInterval(presenceIntervalId);
                presenceIntervalId = null;
            }

            if (directorySyncIntervalId) {
                window.clearInterval(directorySyncIntervalId);
                directorySyncIntervalId = null;
            }
        },
        syncRoomSubscriptions() {
            const joinedRoomIds = new Set(this.joinedRooms.map((room) => room.id));

            for (const roomId of roomChannels.keys()) {
                if (!joinedRoomIds.has(roomId)) {
                    window.Echo.leave(`chat.room.${roomId}`);
                    roomChannels.delete(roomId);
                }
            }

            for (const room of this.joinedRooms) {
                if (roomChannels.has(room.id)) {
                    continue;
                }

                const channel = window.Echo.private(`chat.room.${room.id}`).listen(
                    ".chat.message.created",
                    async ({ message, room_id: roomId }) => {
                        const current = this.messagesByRoom[roomId] || [];
                        const isCurrentRoom = roomId === this.activeRoomId;
                        const isOwnMessage = message.sender?.id === window.LocalChatCurrentUserId;

                        if (!current.some((item) => item.id === message.id)) {
                            this.messagesByRoom = {
                                ...this.messagesByRoom,
                                [roomId]: [...current, message],
                            };
                        }

                        await this.loadRooms();

                        if (!isOwnMessage) {
                            this.notifyIncomingMessage(roomId, message);
                        }

                        if (isCurrentRoom) {
                            await this.markAsRead(roomId, message.id);
                        }
                    }
                );

                roomChannels.set(room.id, channel);
            }
        },
        notifyIncomingMessage(roomId, message) {
            const now = Date.now();

            if (!message?.id || now - lastMessageAlertAt < 500) {
                return;
            }

            lastMessageAlertAt = now;

            const room = this.rooms.find((item) => item.id === roomId);
            const senderName = message.sender?.display_name || message.sender?.name || "New message";
            const title = room?.name ? `${senderName} in ${room.name}` : senderName;
            const body = message.type === "file"
                ? `${senderName} shared a file`
                : (message.body || "New message").slice(0, 120);

            playMessageSound();
            ElNotification({
                title,
                message: body,
                type: "info",
                position: window.innerWidth < 640 ? "bottom-right" : "top-right",
                duration: 5000,
            });
            showBrowserMessageNotification(title, body);
        },
        syncActivePresenceChannel() {
            if (!this.activeRoom?.joined) {
                this.leaveActivePresenceChannel();
                return;
            }

            if (activePresenceChannel?.roomId === this.activeRoomId) {
                return;
            }

            this.leaveActivePresenceChannel();

            const channel = window.Echo.join(`chat.presence.${this.activeRoomId}`)
                .here((members) => {
                    this.activePresenceMembers = members;
                })
                .joining((member) => {
                    if (!this.activePresenceMembers.some((item) => item.id === member.id)) {
                        this.activePresenceMembers = [...this.activePresenceMembers, member];
                    }
                })
                .leaving((member) => {
                    this.activePresenceMembers = this.activePresenceMembers.filter(
                        (item) => item.id !== member.id
                    );
                });

            activePresenceChannel = {
                roomId: this.activeRoomId,
                channel,
            };
        },
        leaveActivePresenceChannel() {
            if (!activePresenceChannel) {
                this.activePresenceMembers = [];
                return;
            }

            window.Echo.leave(`chat.presence.${activePresenceChannel.roomId}`);
            activePresenceChannel = null;
            this.activePresenceMembers = [];
        },
    },
});
