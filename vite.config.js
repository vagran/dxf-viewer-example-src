import { fileURLToPath, URL } from "node:url"
import { createRequire } from "node:module"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import { quasar, transformAssetUrls } from "@quasar/vite-plugin"

const require = createRequire(import.meta.url)
const dxfViewerPackageJson = require("dxf-viewer/package.json")

/** Where the `dxf-viewer` import actually resolves, and whether that is a working copy reached
 * through `npm link` or an ordinary install from the registry. Node resolves symlinks during
 * resolution, so a linked package reports its real path, which lies outside this project's
 * `node_modules`.
 *
 * This exists because the two are otherwise indistinguishable from the running page: the version
 * badge reads the resolved package's `package.json`, and a working copy usually carries the same
 * version as the last publish. `npm install` here quietly replaces the link with the registry
 * tarball, and nothing says so.
 *
 * @return {{dir: string, isLinked: boolean, rev: ?string}}
 */
function GetLibraryInfo() {
    const dir = path.dirname(require.resolve("dxf-viewer/package.json"))
    const isLinked = !dir.startsWith(path.resolve("node_modules") + path.sep)
    let rev = null
    if (isLinked) {
        try {
            rev = execFileSync("git", ["-C", dir, "describe", "--always", "--dirty"],
                               {encoding: "utf8", stdio: ["ignore", "pipe", "ignore"]}).trim()
        } catch {
            /* Not a git checkout, or no git on PATH. The link itself is still worth reporting. */
        }
    }
    return {dir, isLinked, rev}
}

const library = GetLibraryInfo()

/* Mount point of the test data tree, and the prefix `?dxfUrl=` values are written against. */
const TEST_DATA_URL_PREFIX = "/test-data"

/** The library keeps its sample drawings in `test-data/`, gitignored and local. When the library
 * is linked that is the working copy's own directory; otherwise fall back to a sibling checkout,
 * since an installed package carries no test data. */
function GetTestDataDir() {
    const linkedDir = path.join(library.dir, "test-data")
    if (fs.existsSync(linkedDir)) {
        return linkedDir
    }
    return fileURLToPath(new URL("../dxf-viewer/test-data", import.meta.url))
}

/** Expose the library's `test-data/` tree over the dev server.
 *
 * The point is to make a drawing addressable. `?dxfUrl=/test-data/city.dxf` survives a reload and
 * an HMR update, so a change can be re-checked by refreshing the tab; the file input cannot, since
 * it is cleared every time the component remounts. Browsing to /test-data/ lists the tree, with
 * links that open each drawing in the viewer.
 *
 * Dev only (`apply: "serve"`) — nothing here reaches a production build, which is why this is a
 * middleware rather than a symlink under `public/`.
 */
function TestDataPlugin(rootDir) {
    return {
        name: "dxf-test-data",
        apply: "serve",

        configureServer(server) {
            if (!fs.existsSync(rootDir)) {
                server.config.logger.warn(
                    `[dxf-test-data] not serving ${TEST_DATA_URL_PREFIX}/, no such directory: ` +
                    rootDir)
                return
            }
            server.config.logger.info(`[dxf-test-data] ${TEST_DATA_URL_PREFIX}/ -> ${rootDir}`)

            server.middlewares.use(TEST_DATA_URL_PREFIX, (req, res, next) => {
                /* connect has stripped the mount prefix from req.url, but the query string is
                 * still there; parsing against a dummy base is the cheapest way to drop it. */
                const relPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname)
                const filePath = path.join(rootDir, relPath)
                /* path.join() has already collapsed any "..", so this rejects traversal out of the
                 * tree. Symlinks *inside* it (test-data/sample-files) are followed on purpose —
                 * this server is local and reaching that data is the whole point. */
                if (filePath !== rootDir && !filePath.startsWith(rootDir + path.sep)) {
                    res.statusCode = 403
                    res.end("Forbidden")
                    return
                }

                let stat
                try {
                    stat = fs.statSync(filePath)
                } catch {
                    /* Answer here rather than calling next(): Vite's SPA fallback would serve
                     * index.html with a 200, and the viewer would report a parse error on HTML
                     * instead of saying that the path is wrong. Mistyping a drawing name in a
                     * hand-written URL is the single likeliest mistake in this workflow. */
                    res.statusCode = 404
                    res.end(`No such file under ${TEST_DATA_URL_PREFIX}/: ${relPath}`)
                    return
                }

                if (stat.isDirectory()) {
                    res.setHeader("Content-Type", "text/html; charset=utf-8")
                    res.end(RenderListing(filePath, relPath))
                    return
                }

                res.setHeader("Content-Type", "application/octet-stream")
                /* DxfFetcher drives the progress bar from Content-Length. */
                res.setHeader("Content-Length", stat.size)
                /* A test harness should never leave you wondering whether the drawing on screen
                 * came from the cache. */
                res.setHeader("Cache-Control", "no-store")
                fs.createReadStream(filePath).pipe(res)
            })
        }
    }
}

/** Directory index for the test data tree. Files link into the viewer rather than to themselves,
 * so a drawing is one click from the listing. */
function RenderListing(dirPath, relPath) {
    const entries = []
    for (const name of fs.readdirSync(dirPath)) {
        if (name.startsWith(".")) {
            continue
        }
        let isDir
        try {
            /* statSync rather than withFileTypes: `test-data/sample-files` is a symlink to a
             * directory and has to be listed as one. */
            isDir = fs.statSync(path.join(dirPath, name)).isDirectory()
        } catch {
            /* Broken symlink. */
            continue
        }
        entries.push({name, isDir})
    }
    entries.sort((a, b) => (b.isDir - a.isDir) || a.name.localeCompare(b.name))

    const base = path.posix.join(TEST_DATA_URL_PREFIX, relPath)
    const rows = entries.map(({name, isDir}) => {
        const entryPath = path.posix.join(base, name)
        if (isDir) {
            return `<li><a href="${entryPath}">${name}/</a></li>`
        }
        /* Only plain DXF is linked into the viewer. The directory also holds screenshots and
         * xz-compressed drawings, which the viewer cannot read; listing them unlinked beats
         * offering a click that fails. */
        if (!name.toLowerCase().endsWith(".dxf")) {
            return `<li>${name}</li>`
        }
        return `<li><a href="/?dxfUrl=${encodeURIComponent(entryPath)}">${name}</a></li>`
    })
    const parent = relPath === "/" ? "" : `<li><a href="${path.posix.dirname(base)}">../</a></li>`

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${base}</title></head>
<body style="font-family: monospace;">
<h3>${base}</h3>
<ul>${parent}${rows.join("")}</ul>
</body>
</html>`
}

/** The sites this project is published to. `mode` picks one; any other mode -- the dev server --
 * serves from the root.
 *
 * Two of them, because a release is previewed publicly before it is published: `production` is the
 * stable site built against the package from npm, `rc` is an unreleased working copy on a separate
 * GitHub Pages site. They must stay separate deployments rather than one site with two paths,
 * since deploy.sh force-pushes dist/ as the target repository's entire tree.
 *
 * `indexed` says whether this is the site search engines should find. Only one deployment can be,
 * so the other drops the sitemap, asks not to be crawled, and leaves the analytics property to the
 * stable site -- see DeploymentAssets().
 */
const DEPLOYMENTS = {
    production: {repo: "dxf-viewer-example", indexed: true},
    rc:         {repo: "dxf-viewer-example-preview", indexed: false}
}

/** The base path a deployment is served under, or "/" for the dev server.
 *
 * A GitHub Pages project site lives at https://<user>.github.io/<repo>/, so the repository name is
 * the base path; deriving one from the other is what stops them drifting apart, which matters
 * because deploy.sh decides where a bundle may be pushed by reading the base back out of it.
 */
function DeploymentBase(deployment) {
    return deployment === undefined ? "/" : `/${deployment.repo}/`
}

/** Everything that differs between deployments once the bundle itself is built.
 *
 * Both halves exist because `public/` is copied verbatim into every build and `index.html` is
 * shared, so a second deployment inherits assets written for the first one.
 */
function DeploymentAssets(deployment) {
    /* The dev server never reaches this plugin (`apply: "build"`), so an unknown mode -- which is
     * nothing anyone deploys -- is treated as the indexed site and left alone. */
    const indexed = deployment === undefined || deployment.indexed
    let outDir
    return {
        name: "dxf-deployment-assets",
        apply: "build",

        configResolved(config) {
            outDir = path.resolve(config.root, config.build.outDir)
        },

        transformIndexHtml(html) {
            if (indexed) {
                return html
            }
            /* One analytics property is shared by both sites, and a preview reporting into it
             * would contaminate the stable site's statistics with traffic that is mostly mine. */
            return html.replace(/[ \t]*<!-- analytics -->[\s\S]*?<!-- \/analytics -->\n?/, "")
        },

        closeBundle() {
            if (indexed) {
                return
            }
            /* public/sitemap.xml names the stable site by absolute URL, so shipping it here would
             * point crawlers at the other deployment. Drop it and ask not to be indexed at all:
             * two near-identical sites is exactly the duplicate content that gets both demoted. */
            fs.rmSync(path.join(outDir, "sitemap.xml"), {force: true})
            fs.writeFileSync(path.join(outDir, "robots.txt"), "User-agent: *\nDisallow: /\n")
        }
    }
}

/* Keyed on `mode`, not `command`: `vite preview` runs with command === "serve" but the mode of the
 * build it is serving, and it has to serve under the same base that build baked into index.html. */
export default defineConfig(({ command, mode }) => ({
    base: DeploymentBase(DEPLOYMENTS[mode]),

    plugins: [
        /* transformAssetUrls teaches the Vue compiler which Quasar component props hold asset
         * URLs, so they are rewritten and hashed like any other import. */
        vue({ template: { transformAssetUrls } }),
        quasar(),
        TestDataPlugin(GetTestDataDir()),
        DeploymentAssets(DEPLOYMENTS[mode])
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

    /* All snapshots taken when the config is loaded: re-linking, or committing, needs a dev server
     * restart before they catch up. Vite restarts itself only when this file changes. */
    define: {
        "DXF_VIEWER_VERSION": JSON.stringify(dxfViewerPackageJson.version),
        "DXF_VIEWER_LINKED": JSON.stringify(library.isLinked),
        "DXF_VIEWER_REV": JSON.stringify(library.rev),
        /* Only ever useful on the dev server, where it says which working copy the page is
         * exercising. A build is published, so the path is someone's home directory on a public
         * site; the `linked` badge and the revision carry the part that is worth keeping. */
        "DXF_VIEWER_DIR": JSON.stringify(command === "build" ? null : library.dir)
    },

    build: {
        outDir: "dist"
    }
}))
