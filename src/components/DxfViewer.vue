<template>
<div class="canvasContainer" ref="canvasContainer">
    <q-inner-loading :showing="isLoading" color="primary" style="z-index: 10"/>
    <div v-if="progress !== null" class="progress">
        <q-linear-progress color="primary" :indeterminate="progress < 0" :value="progress" />
        <div v-if="progressText !== null" class="progressText">{{progressText}}</div>
    </div>
    <div v-if="error !== null" class="error" :title="error">
        <q-icon name="warning" class="text-red" style="font-size: 4rem;" /> Error occurred: {{error}}
    </div>
    <div v-if="showHarness && (stats !== null || diagnostics.messages.length > 0)"
         class="harness row items-center no-wrap">
        <span v-if="stats !== null" class="statsText" :title="statsDetails">{{statsText}}</span>
        <q-badge v-if="diagnostics.messages.length > 0" color="warning" class="q-ml-sm"
                 :title="warningsDetails">
            {{diagnostics.messages.length}}{{diagnostics.overflowed ? "+" : ""}} warned
        </q-badge>
        <q-btn dense flat size="sm" icon="fit_screen" class="q-ml-xs" @click="FitToBounds">
            <q-tooltip>Fit the whole drawing</q-tooltip>
        </q-btn>
        <q-btn dense flat size="sm" icon="photo_camera" @click="SaveScreenshot">
            <q-tooltip>Save the canvas as PNG</q-tooltip>
        </q-btn>
    </div>
</div>
</template>

<script>
/** All DxfViewer supported events (see DxfViewer.Subscribe()). Each is re-emitted by this
 * component prefixed with "dxf-".
 *
 * This lives in a companion plain <script> because defineEmits() is hoisted out of setup() and
 * so may not reference anything declared inside <script setup>; the compiler rejects it outright.
 * A plain <script> alongside <script setup> is evaluated once at module scope, which is exactly
 * what is needed here. */
const VIEWER_EVENTS = ["loaded", "cleared", "destroyed", "resized", "pointerdown", "pointerup",
                       "viewChanged", "message"]

/** Query parameters of the page, read once. Several viewer options are overridable from the URL so
 * that alternative code paths can be exercised without editing this file — see UrlFlag() below for
 * the list. They are deliberately read here, at module scope, rather than watched: switching one
 * mid-session would need the viewer rebuilt anyway. */
const urlParams = new URL(location.href).searchParams

/** A 0/1-style flag from the page URL.
 *
 * Recognized across this component:
 *   ?worker=0               build the scene on the main thread instead of in a worker. Slower and
 *                           it blocks the UI, but it is breakpoint-friendly, its console output
 *                           lands on the main thread where `diagnostics` can count it, and it is
 *                           the only way to render anything in headless Chromium, which runs no
 *                           workers at all.
 *   ?colorCorrection=0      leave entity colors alone (library default)
 *   ?blackWhiteInversion=0  do not invert pure black/white against the background
 *   ?wireframe=0            fill hatches and solids instead of drawing them as wireframe
 *   ?antialias=0
 *   ?clearColor=<css>       e.g. `black`, `#222`. Exercises the inversion/correction paths
 *   ?pointSize=<px>
 *   ?stats=1                show the harness overlay even when running the package from npm
 */
function UrlFlag(name, defValue) {
    const value = urlParams.get(name)
    if (value === null) {
        return defValue
    }
    return value !== "0" && value !== "false"
}

function UrlNumber(name, defValue) {
    const value = Number(urlParams.get(name))
    return Number.isFinite(value) && value > 0 ? value : defValue
}

/* One worker decision per page load, shared by Load() and the stats line. */
const USE_WORKER = UrlFlag("worker", true)

/* Marks that the Vite client is about to apply an update, so that the page which comes back can
 * tell an update apart from a reload someone asked for. See IS_HOT_RELOAD. */
const HOT_RELOAD_KEY = "dxfView:hotReload"
/* A page coming back from an update is up within a second or two. An older mark is one nobody
 * consumed — an update to a module this component never imports, say. */
const HOT_RELOAD_MAX_AGE = 10000

/** Whether this page came up because Vite applied an update rather than because someone opened or
 * reloaded it. That is the one case where the view that was on screen should be put back instead
 * of fitting the drawing — see the view-parking comment in <script setup>.
 *
 * Editing library code nearly always makes Vite reload the whole page rather than patch it in
 * place: the worker imports the same modules, its graph has no HMR boundary to stop the update
 * at, and once any page has started the worker the server knows it. So this cannot be answered
 * from anything held in memory, `import.meta.hot.data` included — the page is gone. Whatever
 * survives that reload survives a deliberate one too, hence the marker: the Vite client announces
 * an update before applying it, and the announcement is written down and read back exactly once,
 * here.
 *
 * False in a build, where `import.meta.hot` does not exist and nothing is ever remembered.
 */
const IS_HOT_RELOAD = (() => {
    if (!import.meta.hot) {
        return false
    }
    let mark
    try {
        mark = sessionStorage.getItem(HOT_RELOAD_KEY)
        sessionStorage.removeItem(HOT_RELOAD_KEY)
    } catch {
        /* Private mode, or storage is blocked. Nothing is remembered, so nothing is restored. */
        return false
    }
    /* Both kinds of update: a full reload for anything the worker also imports, an in-place patch
     * for the rest — the second only needs the mark because the module re-evaluates and loses it
     * either way.
     */
    for (const event of ["vite:beforeFullReload", "vite:beforeUpdate"]) {
        import.meta.hot.on(event, () => {
            try {
                sessionStorage.setItem(HOT_RELOAD_KEY, String(Date.now()))
            } catch {}
        })
    }
    const at = Number(mark)
    if (!mark || !Number.isFinite(at) || at <= 0) {
        /* Opened, reloaded by hand, or a new tab. Fit, which is what the viewer does anyway. */
        return false
    }
    const age = Date.now() - at
    if (age >= HOT_RELOAD_MAX_AGE) {
        console.log(`Hot reload mark is ${Math.round(age / 1000)} s old, so this page is not the ` +
                    "one an update replaced: fitting the drawing rather than restoring the view.")
        return false
    }
    return true
})()
</script>

<script setup>
import { ref, computed, useTemplateRef, watch, onMounted, onUnmounted } from "vue"
import {DxfViewer} from "dxf-viewer"
import * as three from "three"
import { diagnostics, ResetDiagnostics } from "@/diagnostics.js"

const props = defineProps({
    dxfUrl: {
        default: null
    },
    /** List of font URLs. Files should have TTF format. Fonts are used in the specified order,
     * each one is checked until necessary glyph is found. Text is not rendered if fonts are not
     * specified.
     */
    fonts: {
        default: null
    },
    options: {
        default() {
            return {
                clearColor: new three.Color(urlParams.get("clearColor") ?? "#fff"),
                autoResize: true,
                colorCorrection: UrlFlag("colorCorrection", true),
                blackWhiteInversion: UrlFlag("blackWhiteInversion", true),
                antialias: UrlFlag("antialias", true),
                pointSize: UrlNumber("pointSize", 2),
                sceneOptions: {
                    wireframeMesh: UrlFlag("wireframe", true)
                }
            }
        }
    }
})

/* Declared so that the listeners the parent binds do not also fall through onto the
 * container div as native DOM listeners. */
const emit = defineEmits(VIEWER_EVENTS.map(name => "dxf-" + name))

const canvasContainer = useTemplateRef("canvasContainer")

const isLoading = ref(false)
const progress = ref(null)
const progressText = ref(null)
const error = ref(null)
/** @type {Ref<?{phases: {name: string, ms: number}[], totalMs: number, objects: number,
 *      layers: number}>} Null until a load finishes. */
const stats = ref(null)

/* The overlay is a development aid, so it is off in the published demo unless asked for. */
const showHarness = DXF_VIEWER_LINKED || UrlFlag("stats", false)

/* Deliberately plain bindings rather than refs. `curProgressPhase` is only ever compared against,
 * and `dxfViewer` owns the three.js scene — wrapping that in a ref would hand out a reactive
 * proxy of the whole scene graph. Under the options API both were undeclared properties stashed
 * on the instance, which landed on the non-reactive `ctx` and so behaved the same way, but only
 * by accident; here it is a stated choice. */
let curProgressPhase = null
let dxfViewer = null

/* Wall-clock duration of each progressCbk phase of the current load, and when the running one
 * started. Timings only, so nothing the view renders directly. */
let phases = []
let phaseStart = 0

async function Load(url) {
    if (saveViewTimer !== null) {
        clearTimeout(saveViewTimer)
        saveViewTimer = null
        _SaveView()
    }
    isLoading.value = true
    error.value = null
    stats.value = null
    ResetDiagnostics()
    phases = []
    curProgressPhase = null
    const loadStart = performance.now()
    try {
        await dxfViewer.Load({
            url,
            fonts: props.fonts,
            progressCbk: _OnProgress,
            workerFactory: USE_WORKER
                ? () => new Worker(new URL("./DxfViewerWorker.js", import.meta.url),
                                   {type: "module"})
                : null
        })
        _EndPhase()
        /* Load() fits the view as its last act, so restoring has to happen after it returns —
         * the "loaded" event is emitted before that fit and would be overridden by it. */
        _RestoreView()
        stats.value = _CollectStats(performance.now() - loadStart)
    } catch (e) {
        console.warn(e)
        error.value = e.toString()
    } finally {
        isLoading.value = false
        progressText.value = null
        progress.value = null
        curProgressPhase = null
    }
}

/** @return {DxfViewer} */
function GetViewer() {
    return dxfViewer
}

function _OnProgress(phase, size, totalSize) {
    if (phase !== curProgressPhase) {
        switch(phase) {
        case "font":
            progressText.value = "Fetching fonts..."
            break
        case "fetch":
            progressText.value = "Fetching file..."
            break
        case "parse":
            progressText.value = "Parsing file..."
            break
        case "prepare":
            progressText.value = "Preparing rendering data..."
            break
        }
        _EndPhase()
        phaseStart = performance.now()
        curProgressPhase = phase
    }
    if (totalSize === null) {
        progress.value = -1
    } else {
        progress.value = size / totalSize
    }
}

/** Close the phase that is currently running, if any, and record how long it took. */
function _EndPhase() {
    if (curProgressPhase !== null) {
        phases.push({name: curProgressPhase, ms: performance.now() - phaseStart})
    }
}

/** What a finished load cost, from the public API only.
 *
 * `objects` counts the scene's direct children, which is one three.js object per render batch —
 * i.e. roughly the draw call count, the number the whole batching design exists to keep down. A
 * change that leaves the drawing looking identical but moves this number has changed the batching.
 */
function _CollectStats(totalMs) {
    return {
        phases: phases.slice(),
        totalMs,
        objects: dxfViewer.GetScene().children.length,
        layers: Array.from(dxfViewer.GetLayers(true)).length
    }
}

function _FormatMs(ms) {
    return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`
}

const statsText = computed(() => {
    if (stats.value === null) {
        return ""
    }
    const parts = [
        _FormatMs(stats.value.totalMs),
        `${stats.value.objects} obj`,
        `${stats.value.layers} layers`
    ]
    if (!USE_WORKER) {
        parts.push("inline")
    }
    return parts.join(" · ")
})

const statsDetails = computed(() => {
    if (stats.value === null) {
        return ""
    }
    const phaseText = stats.value.phases.map(p => `${p.name} ${_FormatMs(p.ms)}`).join(", ")
    return `${phaseText}\n${stats.value.objects} scene objects (~draw calls), ` +
           `${stats.value.layers} non-empty layers` +
           (USE_WORKER ? "" : "\nscene built inline on the main thread (?worker=0)")
})

const warningsDetails = computed(
    () => diagnostics.messages.map(m => `[${m.level}] ${m.text}`).join("\n") +
          (diagnostics.overflowed ? "\n… further messages not recorded" : "") +
          (USE_WORKER ? "\n\nMain thread only — DxfScene warnings go to the worker's console. " +
                        "Reload with ?worker=0 for a complete count." : ""))

/* The view is parked in sessionStorage — per tab, keyed by drawing URL, in model space so that it
 * does not depend on wherever DxfScene happened to put the scene origin for this file. It has to
 * outlive the page, because applying a library edit usually means reloading it (see
 * IS_HOT_RELOAD), and nothing held in memory gets to see the other side of that.
 *
 * Outliving the page is also the whole difficulty: reading it back unconditionally is what made
 * every load after the first skip the fit. So it is written whenever the view changes, and read
 * back only when IS_HOT_RELOAD says this page is the continuation of the one that wrote it.
 * Opening a drawing, reloading the tab and opening a second tab all fit the whole drawing.
 *
 * Dev server only: with no updates to survive there is nothing to remember.
 */
const REMEMBER_VIEW = Boolean(import.meta.hot)

function _ViewKey() {
    return `dxfView:${props.dxfUrl}`
}

function _SaveView() {
    if (!REMEMBER_VIEW || dxfViewer === null || props.dxfUrl === null) {
        return
    }
    const camera = dxfViewer.GetCamera()
    const origin = dxfViewer.GetOrigin()
    if (!camera || !origin) {
        return
    }
    const view = {
        x: camera.position.x + origin.x,
        y: camera.position.y + origin.y,
        /* SetView() sizes the frustum and pins zoom at 1, but OrbitControls zooms by changing
         * `zoom` alone and never touches the frustum — so what is on screen is the one divided by
         * the other. Reading `right - left` by itself records the width of the last SetView(),
         * i.e. the fit, and throws away every zoom made since.
         */
        width: (camera.right - camera.left) / camera.zoom
    }
    try {
        sessionStorage.setItem(_ViewKey(), JSON.stringify(view))
    } catch {
        /* Private mode, or the quota is full. Losing the view is not worth a message. */
    }
}

/** Put the camera back where the page this one replaces left it, when that is what this load is.
 * Otherwise do nothing and the fit done by Load() stands.
 */
/* IS_HOT_RELOAD is a fact about the page, but the restore is a one-off: it belongs to the load
 * that replaces what the update interrupted, and to nothing after it. Left armed it makes every
 * later load in the same page restore too — pick another drawing from the file dialog and it comes
 * up wearing whatever camera is stored under its name instead of being fitted.
 */
let restorePending = IS_HOT_RELOAD

function _RestoreView() {
    if (!restorePending || props.dxfUrl === null) {
        return
    }
    restorePending = false
    let view
    try {
        view = JSON.parse(sessionStorage.getItem(_ViewKey()))
    } catch {
        return
    }
    if (!view || !Number.isFinite(view.x) || !Number.isFinite(view.y) ||
        !Number.isFinite(view.width) || view.width <= 0) {
        return
    }
    const origin = dxfViewer.GetOrigin()
    dxfViewer.SetView({x: view.x - origin.x, y: view.y - origin.y}, view.width)
    /* Says which of the two things happened, since a restored view and a fitted one are only
     * distinguishable by eye when you remember where you were looking. */
    console.log(`View restored across the update: x=${view.x.toFixed(2)}, y=${view.y.toFixed(2)},`,
                `width=${view.width.toFixed(2)}.`)
}


/* "viewChanged" fires for every frame of a pan or zoom, so the write is coalesced. The camera is
 * read when the timer fires rather than when it is scheduled, which is also what lets the fit
 * performed inside Load() be superseded by _RestoreView() before anything is stored. */
let saveViewTimer = null

function _OnViewChanged() {
    /* Load() clears the viewer first, and Clear() parks the camera at the origin with a width of
     * 2 — a state the drawing is never seen in, but one that emits "viewChanged" like any other
     * and, on a viewer that already holds a scene, passes _SaveView()'s guards. Without this the
     * drawing being opened gets that camera written under its name.
     */
    if (isLoading.value || saveViewTimer !== null) {
        return
    }
    saveViewTimer = setTimeout(() => {
        saveViewTimer = null
        _SaveView()
    }, 250)
}

/** Fit the whole drawing, discarding the remembered view. */
function FitToBounds() {
    const bounds = dxfViewer.GetBounds()
    if (!bounds) {
        return
    }
    const origin = dxfViewer.GetOrigin()
    dxfViewer.FitView(bounds.minX - origin.x, bounds.maxX - origin.x,
                      bounds.minY - origin.y, bounds.maxY - origin.y)
}

/** Download the canvas as a PNG, named after the drawing and the library revision, so that two
 * shots taken across a change can be told apart and flipped side by side. */
function SaveScreenshot() {
    /* The drawing buffer is not preserved (the library's default), so it is only guaranteed to
     * still hold the frame within the task that rendered it. */
    dxfViewer.Render()
    const link = document.createElement("a")
    link.download = _ScreenshotName()
    link.href = dxfViewer.GetCanvas().toDataURL("image/png")
    link.click()
}

function _ScreenshotName() {
    const url = props.dxfUrl
    let name = "drawing"
    if (url !== null && !url.startsWith("blob:")) {
        name = decodeURIComponent(url.split("?")[0].split("/").pop() || name)
            .replace(/\.dxf$/i, "") || name
    }
    return `${name}-${DXF_VIEWER_REV ?? DXF_VIEWER_VERSION}.png`
}

watch(() => props.dxfUrl, async dxfUrl => {
    if (dxfUrl !== null) {
        await Load(dxfUrl)
    } else {
        dxfViewer.Clear()
        error.value = null
        isLoading.value = false
        progress.value = null
        stats.value = null
    }
})

onMounted(() => {
    dxfViewer = new DxfViewer(canvasContainer.value, props.options)
    const Subscribe = eventName => {
        dxfViewer.Subscribe(eventName, e => emit("dxf-" + eventName, e))
    }
    for (const eventName of VIEWER_EVENTS) {
        Subscribe(eventName)
    }
    if (REMEMBER_VIEW) {
        dxfViewer.Subscribe("viewChanged", _OnViewChanged)
    }
    /* For the updates Vite does patch in place rather than reload the page for: they unmount and
     * re-create this component, destroying the viewer and the drawing it held, while the URL prop
     * stays as it was — so the watcher above never fires and nothing would load the drawing
     * again. Fetching it here is what leaves an updated drawing on screen instead of an empty
     * canvas.
     *
     * On a normal startup this is a no-op: the child mounts before the parent, so App has not yet
     * read `?dxfUrl=` and the prop is still null.
     */
    if (props.dxfUrl !== null) {
        Load(props.dxfUrl)
    }
})

onUnmounted(() => {
    if (saveViewTimer !== null) {
        /* An in-place update unmounts us, possibly within milliseconds of the pan that scheduled
         * this, so flush it rather than dropping it — otherwise the view that comes back is one
         * debounce stale. (A reloading page never gets here, but it has had seconds to settle.)
         */
        clearTimeout(saveViewTimer)
        saveViewTimer = null
        _SaveView()
    }
    dxfViewer.Destroy()
    dxfViewer = null
})

/* A <script setup> component is closed by default; ViewerPage reaches GetViewer() through a
 * template ref, so it has to be published explicitly. */
defineExpose({Load, GetViewer})
</script>

<style scoped lang="less">

.canvasContainer {
    position: relative;
    width: 100%;
    height: 100%;
    min-width: 100px;
    min-height: 100px;

    .progress {
        position: absolute;
        z-index: 20;
        width: 90%;
        margin: 20px 5%;

        .progressText {
            margin: 10px 20px;
            font-size: 14px;
            color: #262d33;
            text-align: center;
        }
    }

    /* Load stats and the harness buttons, pinned out of the way in a corner of the canvas. Above
     * the error panel, which covers the whole container: a failed load is exactly when the warning
     * count is worth reading. */
    .harness {
        position: absolute;
        z-index: 25;
        left: 8px;
        bottom: 8px;
        padding: 2px 6px;
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.85);
        border: #DBDBDB solid 1px;
        font-size: 12px;
        color: #262d33;

        .statsText {
            white-space: nowrap;
            cursor: default;
        }
    }

    .error {
        width: 100%;
        height: 100%;
        position: absolute;
        z-index: 20;
        padding: 30px;

        img {
            width: 24px;
            height: 24px;
            vertical-align: middle;
            margin: 4px;
        }
    }
}

</style>
