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
    <el-dialog v-model="visible" width="560px" title="Create Group Room">
        <div class="space-y-4">
            <el-input v-model="form.name" placeholder="Design squad, Family, Game night..." />
            <el-input
                v-model="form.description"
                type="textarea"
                :rows="3"
                placeholder="What is this room for?"
            />
            <el-select
                v-model="form.member_ids"
                multiple
                collapse-tags
                collapse-tags-tooltip
                class="w-full"
                placeholder="Invite members"
            >
                <el-option
                    v-for="user in availableUsers"
                    :key="user.id"
                    :label="`${user.name} (${user.email})`"
                    :value="user.id"
                />
            </el-select>
        </div>

        <template #footer>
            <div class="flex justify-end gap-3">
                <el-button @click="visible = false">Cancel</el-button>
                <el-button type="primary" :disabled="!form.name.trim()" @click="submit">
                    Create Room
                </el-button>
            </div>
        </template>
    </el-dialog>
</template>
