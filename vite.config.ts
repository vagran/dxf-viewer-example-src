import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import { quasar, transformAssetUrls } from "@quasar/vite-plugin"
import { resolve } from "path"
import pkg from "./package.json"

// https://vitejs.dev/config/
export default defineConfig({
    root: "src",

    resolve: {
        alias: {
            "@": resolve(__dirname, "src"),
        },
        extensions: [".js", ".ts"]
    },

    build: {
        outDir: resolve(__dirname, "dist"),
    },

    plugins: [
        vue({
            template: { transformAssetUrls }
        }),
        quasar()
    ],

    server: process.env.VSCODE_DEBUG ? (() => {
        const url = new URL(pkg.debug.env.VITE_DEV_SERVER_URL)
        return {
            host: url.hostname,
            port: +url.port,
        }
    })() : undefined,

    clearScreen: false
})
