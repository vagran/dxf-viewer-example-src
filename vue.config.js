const { DefinePlugin } = require("webpack")
const dxfViewerPackageJson = require("dxf-viewer/package.json")

module.exports = {
    publicPath: process.env.NODE_ENV === "production"
        ? "/dxf-viewer-example/"
        : "/",
    transpileDependencies: [
        /[\\\/]node_modules[\\\/]dxf-viewer[\\\/]/
    ],
    devServer: {
        client: {
            /* This object REPLACES vue-cli's own client.overlay defaults rather than merging with
             * them (cli-service spreads `...projectDevServerOptions.client`), so `warnings` and
             * `errors` have to be restated here or they silently revert to webpack-dev-server's
             * defaults of true/true. */
            overlay: {
                warnings: false,
                errors: true,
                /* "ResizeObserver loop completed with undelivered notifications" is a benign
                 * browser notification, not an application error: the browser emits it whenever a
                 * ResizeObserver callback needs more than one delivery pass, which DxfViewer's
                 * canvas-resize observer routinely triggers. webpack-dev-server 4 added a global
                 * window "error" hook (wds 3 had none), so what was previously invisible now
                 * renders as a blocking full-screen overlay. Filter out just that one message;
                 * every other runtime error still surfaces.
                 * This function is stringified and rebuilt with `new Function` in the browser, so
                 * it must not reference anything outside its own body. */
                runtimeErrors: error =>
                    !(error && /^ResizeObserver loop/.test(error.message))
            }
        }
    },
    configureWebpack: {
        plugins: [
            /* Two classes of compile warning appeared with the webpack 5 upgrade. Both are
             * cosmetic, both come from code this project does not own, and neither existed under
             * webpack 4. They are filtered so that a warning in the build output stays a real
             * regression signal.
             *
             * 1. vue-loader 15 emits `import style0 from "...?vue&type=style..."` for every
             *    <style scoped> block, but that style module has no default export. Scoped styles
             *    are applied correctly regardless. Not fixable here: vue-loader-v15 is bundled by
             *    cli-service and already at its latest 15.11.x, and less-loader 7 -> 8 does not
             *    help.
             * 2. Quasar 1 imports a named `version` export from a default-exporting module.
             *
             * webpack's own `ignoreWarnings` option does NOT work under vue-cli: it filters via
             * `compilation.getWarnings()` / the `processWarnings` hook, but the warnings are
             * printed by @soda/friendly-errors-webpack-plugin, which reads the raw
             * `compilation.warnings` array and so never goes through that hook. Hence this plugin,
             * which rewrites the array itself, after seal and well before `done`. */
            {
                apply (compiler) {
                    const NAME = "FilterBenignWarnings"
                    const benign = [
                        /export 'default' \(imported as 'style0'\) was not found/,
                        /Should not import the named export 'version'/
                    ]
                    compiler.hooks.compilation.tap(NAME, compilation => {
                        compilation.hooks.afterSeal.tap(NAME, () => {
                            compilation.warnings = compilation.warnings.filter(
                                w => !benign.some(re => re.test(w.message)))
                        })
                    })
                }
            },

            new DefinePlugin({
                "DXF_VIEWER_VERSION": JSON.stringify(dxfViewerPackageJson.version)
            })
        ]
    }
}
