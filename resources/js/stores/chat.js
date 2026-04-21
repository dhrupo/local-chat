import { defineStore } from "pinia";

let presenceIntervalId = null;
let roomChannels = new Map();
let activePresenceChannel = null;

export const useChatStore = defineStore("chat", {
    state: () => ({
        rooms: [],
        activeRoomId: null,
        messagesByRoom: {},
        directory: [],
        activePresenceMembers: [],
        loadingRooms: false,
        loadingMessages: false,
        sendingMessage: false,
    }),
    getters: {
        joinedRooms(state) {
            return state.rooms.filter((room) => room.joined);
        },
        discoverableRooms(state) {
            return state.rooms.filter((room) => !room.joined);
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
        async hydrate() {
            await Promise.all([this.loadRooms(), this.loadDirectory()]);

            if (!this.activeRoomId) {
                this.activeRoomId = this.joinedRooms[0]?.id || this.rooms[0]?.id || null;
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
                    this.activeRoomId = this.joinedRooms[0]?.id || this.rooms[0]?.id || null;
                }

                this.syncRoomSubscriptions();
                this.syncActivePresenceChannel();
            } finally {
                this.loadingRooms = false;
            }
        },
        async loadDirectory(search = "") {
            const { data } = await window.axios.get("/api/users", {
                params: { query: search || undefined },
            });

            this.directory = data.data;
        },
        async selectRoom(roomId) {
            this.activeRoomId = roomId;
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
                this.activeRoomId = newestJoinedRoom.id;
                await this.loadMessages(newestJoinedRoom.id);
            }

            this.syncActivePresenceChannel();
        },
        async joinRoom(roomId) {
            await window.axios.post(`/api/chat/rooms/${roomId}/join`);
            await this.loadRooms();
            this.activeRoomId = roomId;
            await this.loadMessages(roomId);
            this.syncActivePresenceChannel();
        },
        async leaveRoom(roomId) {
            await window.axios.delete(`/api/chat/rooms/${roomId}/leave`);
            delete this.messagesByRoom[roomId];
            await this.loadRooms();

            if (this.activeRoomId === roomId) {
                this.activeRoomId = this.joinedRooms[0]?.id || this.rooms[0]?.id || null;
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

            if (userId) {
                window.Echo.private(`user.${userId}`).listen(".chat.rooms.updated", async (event) => {
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
            if (userId) {
                window.Echo.leave(`user.${userId}`);
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
        },
        syncRoomSubscriptions() {
            const joinedRoomIds = new Set(this.joinedRooms.map((room) => room.id));

            for (const roomId of roomChannels.keys()) {
                if (!joinedRoomIds.has(roomId)) {
                    window.Echo.leave(`private-chat.room.${roomId}`);
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

                        if (!current.some((item) => item.id === message.id)) {
                            this.messagesByRoom = {
                                ...this.messagesByRoom,
                                [roomId]: [...current, message],
                            };
                        }

                        await this.loadRooms();

                        if (roomId === this.activeRoomId) {
                            await this.markAsRead(roomId, message.id);
                        }
                    }
                );

                roomChannels.set(room.id, channel);
            }
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
