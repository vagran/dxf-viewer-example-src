module.exports = {
    publicPath: process.env.NODE_ENV === "production"
        ? "/dxf-viewer-example/"
        : "/",
    transpileDependencies: [
        /[\\\/]node_modules[\\\/]dxf-viewer[\\\/]/
    ]
}
