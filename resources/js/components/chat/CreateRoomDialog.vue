<script setup>
import { computed, reactive, watch } from "vue";

const props = defineProps({
    modelValue: {
        type: Boolean,
        required: true,
    },
    users: {
        type: Array,
        default: () => [],
    },
    currentUserId: {
        type: Number,
        required: true,
    },
});

const emit = defineEmits(["update:modelValue", "submit"]);

const form = reactive({
    name: "",
    description: "",
    member_ids: [],
});

const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit("update:modelValue", value),
});

const availableUsers = computed(() =>
    props.users.filter((user) => user.id !== props.currentUserId)
);

watch(
    () => props.modelValue,
    (value) => {
        if (!value) {
            form.name = "";
            form.description = "";
            form.member_ids = [];
        }
    }
);

const submit = () => {
    emit("submit", {
        name: form.name,
        description: form.description,
        member_ids: form.member_ids,
    });
};
</script>

<template>
    <el-dialog
        v-model="visible"
        width="560px"
        title="Create Group Room"
        class="create-room-dialog"
        append-to-body
    >
        <div class="space-y-4">
            <div>
                <label class="mb-2 block text-sm font-semibold text-[var(--app-text)]">
                    Group name
                </label>
                <el-input
                    v-model="form.name"
                    size="large"
                    maxlength="80"
                    show-word-limit
                    placeholder="Design squad, Family, Game night..."
                />
            </div>

            <div>
                <label class="mb-2 block text-sm font-semibold text-[var(--app-text)]">
                    Description
                </label>
                <el-input
                    v-model="form.description"
                    type="textarea"
                    :rows="3"
                    maxlength="255"
                    show-word-limit
                    placeholder="What is this room for?"
                />
            </div>

            <div>
                <label class="mb-2 block text-sm font-semibold text-[var(--app-text)]">
                    Invite members
                </label>
                <el-select
                    v-model="form.member_ids"
                    multiple
                    collapse-tags
                    collapse-tags-tooltip
                    filterable
                    size="large"
                    class="w-full"
                    placeholder="Choose people to invite"
                >
                    <el-option
                        v-for="user in availableUsers"
                        :key="user.id"
                        :label="user.display_name"
                        :value="user.id"
                    />
                </el-select>
                <p class="mt-2 text-xs text-[var(--app-text-soft)]">
                    You can also create the group now and let others join later.
                </p>
            </div>
        </div>

        <template #footer>
            <div class="grid grid-cols-2 gap-3 sm:flex sm:justify-end">
                <el-button class="!ml-0 w-full sm:w-auto" size="large" @click="visible = false">
                    Cancel
                </el-button>
                <el-button
                    class="!ml-0 w-full sm:w-auto"
                    type="primary"
                    size="large"
                    :disabled="!form.name.trim()"
                    @click="submit"
                >
                    Create Room
                </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<style scoped>
:global(.create-room-dialog) {
    border-radius: 28px;
    overflow: hidden;
}

:global(.create-room-dialog .el-dialog__header) {
    padding: 22px 24px 12px;
}

:global(.create-room-dialog .el-dialog__title) {
    font-family: var(--app-brand-font, inherit);
    font-size: 24px;
    font-weight: 800;
    color: var(--app-text);
}

:global(.create-room-dialog .el-dialog__body) {
    padding: 12px 24px 18px;
}

:global(.create-room-dialog .el-dialog__footer) {
    padding: 0 24px 24px;
}

@media (max-width: 640px) {
    :global(.create-room-dialog) {
        --el-dialog-width: 100%;
        position: fixed;
        right: 0;
        bottom: 0;
        left: 0;
        width: 100% !important;
        max-height: 92vh;
        margin: 0 !important;
        border-radius: 28px 28px 0 0;
        display: flex;
        flex-direction: column;
    }

    :global(.create-room-dialog .el-dialog__header) {
        padding: 20px 18px 10px;
    }

    :global(.create-room-dialog .el-dialog__body) {
        overflow-y: auto;
        padding: 10px 18px 16px;
    }

    :global(.create-room-dialog .el-dialog__footer) {
        border-top: 1px solid rgba(15, 23, 42, 0.08);
        padding: 14px 18px calc(18px + env(safe-area-inset-bottom));
    }

    :global(.create-room-dialog .el-dialog__title) {
        font-size: 22px;
    }
}
</style>
