import { fileURLToPath, URL } from "node:url"
import { createRequire } from "node:module"

import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import { quasar, transformAssetUrls } from "@quasar/vite-plugin"

const require = createRequire(import.meta.url)
const dxfViewerPackageJson = require("dxf-viewer/package.json")

/* Keyed on `mode`, not `command`: `vite preview` runs with command === "serve" but mode
 * "production", and it has to serve under the same base the build baked into index.html. */
export default defineConfig(({ mode }) => ({
    base: mode === "production" ? "/dxf-viewer-example/" : "/",

    plugins: [
        /* transformAssetUrls teaches the Vue compiler which Quasar component props hold asset
         * URLs, so they are rewritten and hashed like any other import. */
        vue({ template: { transformAssetUrls } }),
        quasar()
    ],

    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url))
        },
        /* Vite does not resolve .vue implicitly; component imports spell the extension out.
         *
         * `dedupe` is load-bearing while dxf-viewer is consumed through `npm link`: Vite resolves
         * the symlink to its real path, so the library's `import "three"` would otherwise be
         * satisfied from ../dxf-viewer/node_modules and two copies of three.js would end up in the
         * bundle. Harmless today (three duck-types Color via `isColor`), fatal as soon as the two
         * versions diverge or `options.renderer` is used. */
        dedupe: ["three"]
    },

    /* The worker is loaded as `new Worker(new URL(...), {type: "module"})`, which needs ES module
     * output from the build as well; the default here would be "iife". */
    worker: {
        format: "es"
    },

    define: {
        "DXF_VIEWER_VERSION": JSON.stringify(dxfViewerPackageJson.version)
    },

    build: {
        outDir: "dist"
    }
}))
