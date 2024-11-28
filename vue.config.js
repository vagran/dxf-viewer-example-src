const { DefinePlugin } = require("webpack")
const dxfViewerPackageJson = require("dxf-viewer/package.json")

module.exports = {
    publicPath: process.env.NODE_ENV === "production"
        ? "/dxf-viewer-example/"
        : "/",
    transpileDependencies: [
        /[\\\/]node_modules[\\\/]dxf-viewer[\\\/]/
    ],
    configureWebpack: {
        plugins: [
            new DefinePlugin({
                "DXF_VIEWER_VERSION": JSON.stringify(dxfViewerPackageJson.version)
            })
        ]
    }
}
