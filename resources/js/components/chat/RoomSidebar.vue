<script setup>
import { Plus, RefreshRight } from "@element-plus/icons-vue";

defineProps({
    user: {
        type: Object,
        required: true,
    },
    participants: {
        type: Array,
        default: () => [],
    },
    directChats: {
        type: Array,
        default: () => [],
    },
    joinedRooms: {
        type: Array,
        default: () => [],
    },
    discoverableRooms: {
        type: Array,
        default: () => [],
    },
    activeRoomId: {
        type: Number,
        default: null,
    },
});

defineEmits(["refresh", "select-room", "join-room", "open-create", "open-direct-chat"]);
</script>

<template>
    <aside class="app-card flex h-full flex-col rounded-[28px] p-4 lg:p-5">
        <div class="mb-5 flex items-center justify-between gap-3">
            <div>
                <p class="brand-font text-2xl font-bold tracking-tight text-[var(--app-text)]">Local Chat</p>
                <p class="text-sm text-[var(--app-text-soft)]">
                    LAN-only rooms for your current Wi-Fi network
                </p>
            </div>
            <div class="flex items-center gap-2">
                <el-button circle :icon="RefreshRight" @click="$emit('refresh')" />
                <el-button type="primary" circle :icon="Plus" @click="$emit('open-create')" />
            </div>
        </div>

        <div class="mb-5 rounded-3xl bg-[var(--app-accent-soft)] p-4">
            <p class="text-xs uppercase tracking-[0.24em] text-[var(--app-text-soft)]">Signed in</p>
            <div class="mt-2 flex items-center gap-3">
                <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--app-accent)] text-sm font-bold text-white">
                    {{ user.initials }}
                </div>
                <div>
                    <p class="font-semibold text-[var(--app-text)]">{{ user.display_name }}</p>
                    <p class="text-sm text-[var(--app-text-soft)]">This device identity is local to the current browser.</p>
                </div>
            </div>
        </div>

        <div class="room-scroll flex-1 space-y-6 overflow-y-auto pr-1">
            <section>
                <div class="mb-3 flex items-center justify-between">
                    <h2 class="brand-font text-sm font-bold uppercase tracking-[0.16em] text-[var(--app-text-soft)]">
                        Devices On Network
                    </h2>
                    <span class="text-xs text-[var(--app-text-soft)]">{{ participants.length }}</span>
                </div>

                <div class="space-y-3">
                    <button
                        v-for="participant in participants"
                        :key="participant.id"
                        class="w-full rounded-[24px] border border-[var(--app-border)] bg-white/80 p-4 text-left transition duration-200 hover:border-[var(--app-border-strong)] hover:bg-white"
                        @click="$emit('open-direct-chat', participant.id)"
                    >
                        <div class="flex items-center gap-3">
                            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--app-accent-soft)] font-semibold text-[var(--app-accent-deep)]">
                                {{ participant.initials }}
                            </div>
                            <div class="min-w-0 flex-1">
                                <div class="flex items-center gap-2">
                                    <p class="truncate font-semibold text-[var(--app-text)]">
                                        {{ participant.display_name }}
                                    </p>
                                    <el-tag
                                        size="small"
                                        :type="participant.is_online ? 'success' : 'info'"
                                        effect="light"
                                    >
                                        {{ participant.is_online ? "Online" : "Away" }}
                                    </el-tag>
                                </div>
                                <p class="truncate text-sm text-[var(--app-text-soft)]">
                                    {{ participant.is_online ? "Available on this Wi-Fi" : "Recently seen on this Wi-Fi" }}
                                </p>
                            </div>
                        </div>
                    </button>

                    <div
                        v-if="!participants.length"
                        class="rounded-[24px] border border-dashed border-[var(--app-border-strong)] bg-white/55 p-4 text-sm text-[var(--app-text-soft)]"
                    >
                        No other devices are visible on this Wi-Fi yet.
                    </div>
                </div>
            </section>

            <section>
                <div class="mb-3 flex items-center justify-between">
                    <h2 class="brand-font text-sm font-bold uppercase tracking-[0.16em] text-[var(--app-text-soft)]">
                        Direct Chats
                    </h2>
                    <span class="text-xs text-[var(--app-text-soft)]">{{ directChats.length }}</span>
                </div>

                <div class="space-y-3">
                    <button
                        v-for="room in directChats"
                        :key="room.id"
                        class="w-full rounded-[24px] border p-4 text-left transition duration-200"
                        :class="
                            room.id === activeRoomId
                                ? 'border-[var(--app-accent)] bg-[var(--app-accent-soft)] shadow-[0_10px_30px_rgba(194,97,55,0.16)]'
                                : 'border-[var(--app-border)] bg-white/80 hover:border-[var(--app-border-strong)] hover:bg-white'
                        "
                        @click="$emit('select-room', room.id)"
                    >
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0">
                                <p class="truncate font-semibold text-[var(--app-text)]">{{ room.name }}</p>
                                <p class="mt-1 line-clamp-2 text-sm text-[var(--app-text-soft)]">
                                    {{ room.latest_message?.body || "Private conversation" }}
                                </p>
                            </div>
                            <div class="flex flex-col items-end gap-2">
                                <span class="text-xs text-[var(--app-text-soft)]">1:1</span>
                                <el-badge v-if="room.unread_count" :value="room.unread_count" />
                            </div>
                        </div>
                    </button>
                </div>
            </section>

            <section>
                <div class="mb-3 flex items-center justify-between">
                    <h2 class="brand-font text-sm font-bold uppercase tracking-[0.16em] text-[var(--app-text-soft)]">
                        Joined Rooms
                    </h2>
                    <span class="text-xs text-[var(--app-text-soft)]">{{ joinedRooms.length }}</span>
                </div>

                <div class="space-y-3">
                    <button
                        v-for="room in joinedRooms"
                        :key="room.id"
                        class="w-full rounded-[24px] border p-4 text-left transition duration-200"
                        :class="
                            room.id === activeRoomId
                                ? 'border-[var(--app-accent)] bg-[var(--app-accent-soft)] shadow-[0_10px_30px_rgba(194,97,55,0.16)]'
                                : 'border-[var(--app-border)] bg-white/80 hover:border-[var(--app-border-strong)] hover:bg-white'
                        "
                        @click="$emit('select-room', room.id)"
                    >
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0">
                                <p class="truncate font-semibold text-[var(--app-text)]">{{ room.name }}</p>
                                <p class="mt-1 line-clamp-2 text-sm text-[var(--app-text-soft)]">
                                    {{ room.latest_message?.body || room.description || "No messages yet." }}
                                </p>
                            </div>
                            <div class="flex flex-col items-end gap-2">
                                <span class="text-xs text-[var(--app-text-soft)]">{{ room.member_count }} members</span>
                                <el-badge v-if="room.unread_count" :value="room.unread_count" />
                            </div>
                        </div>
                    </button>
                </div>
            </section>

            <section>
                <div class="mb-3 flex items-center justify-between">
                    <h2 class="brand-font text-sm font-bold uppercase tracking-[0.16em] text-[var(--app-text-soft)]">
                        Discover Rooms
                    </h2>
                    <span class="text-xs text-[var(--app-text-soft)]">{{ discoverableRooms.length }}</span>
                </div>

                <div class="space-y-3">
                    <div
                        v-for="room in discoverableRooms"
                        :key="room.id"
                        class="rounded-[24px] border border-dashed border-[var(--app-border-strong)] bg-white/55 p-4"
                    >
                        <div class="flex items-start justify-between gap-3">
                            <div>
                                <p class="font-semibold text-[var(--app-text)]">{{ room.name }}</p>
                                <p class="mt-1 text-sm text-[var(--app-text-soft)]">
                                    {{ room.description || "Open room on this network." }}
                                </p>
                            </div>
                            <el-button type="primary" plain @click="$emit('join-room', room.id)">
                                Join
                            </el-button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    </aside>
</template>
