import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
    build: {
        sourcemap: false,
        chunkSizeWarningLimit: 700,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes("node_modules")) {
                        return;
                    }

                    if (id.includes("element-plus") || id.includes("@element-plus")) {
                        return "element-plus";
                    }

                    if (
                        id.includes("laravel-echo")
                        || id.includes("pusher-js")
                        || id.includes("axios")
                    ) {
                        return "realtime";
                    }

                    if (
                        id.includes("vue")
                        || id.includes("vue-router")
                        || id.includes("pinia")
                    ) {
                        return "vue-core";
                    }

                    return "vendor";
                },
            },
        },
    },
    plugins: [
        laravel({
            input: ["resources/css/app.css", "resources/js/app.js"],
            refresh: true,
        }),
        vue({
            template: {
                transformAssetUrls: {
                    base: null,
                    includeAbsolute: false,
                },
            },
        }),
    ],
});
