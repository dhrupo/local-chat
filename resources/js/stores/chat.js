import { defineStore } from "pinia";

let roomsIntervalId = null;
let presenceIntervalId = null;

export const useChatStore = defineStore("chat", {
    state: () => ({
        rooms: [],
        activeRoomId: null,
        messagesByRoom: {},
        directory: [],
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
            return state.rooms.find((room) => room.id === state.activeRoomId) || null;
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
        },
        async loadRooms() {
            this.loadingRooms = true;

            try {
                const { data } = await window.axios.get("/api/chat/rooms");
                this.rooms = data.data;

                if (this.activeRoomId && !this.rooms.some((room) => room.id === this.activeRoomId)) {
                    this.activeRoomId = this.joinedRooms[0]?.id || this.rooms[0]?.id || null;
                }
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
        },
        async joinRoom(roomId) {
            await window.axios.post(`/api/chat/rooms/${roomId}/join`);
            await this.loadRooms();
            this.activeRoomId = roomId;
            await this.loadMessages(roomId);
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
                this.messagesByRoom = {
                    ...this.messagesByRoom,
                    [roomId]: [...current, data.data],
                };

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
        startPolling() {
            this.stopPolling();

            roomsIntervalId = window.setInterval(async () => {
                await this.loadRooms();

                if (this.activeRoomId && this.activeRoom?.joined) {
                    await this.loadMessages(this.activeRoomId);
                }
            }, 5000);

            presenceIntervalId = window.setInterval(async () => {
                await window.axios.post("/api/presence/ping");
            }, 30000);
        },
        stopPolling() {
            if (roomsIntervalId) {
                window.clearInterval(roomsIntervalId);
                roomsIntervalId = null;
            }

            if (presenceIntervalId) {
                window.clearInterval(presenceIntervalId);
                presenceIntervalId = null;
            }
        },
    },
});
