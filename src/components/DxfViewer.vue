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
</script>

<script setup>
import { ref, useTemplateRef, watch, onMounted, onUnmounted } from "vue"
import {DxfViewer} from "dxf-viewer"
import * as three from "three"

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
                clearColor: new three.Color("#fff"),
                autoResize: true,
                colorCorrection: true,
                sceneOptions: {
                    wireframeMesh: true
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

/* Deliberately plain bindings rather than refs. `curProgressPhase` is only ever compared against,
 * and `dxfViewer` owns the three.js scene — wrapping that in a ref would hand out a reactive
 * proxy of the whole scene graph. Under the options API both were undeclared properties stashed
 * on the instance, which landed on the non-reactive `ctx` and so behaved the same way, but only
 * by accident; here it is a stated choice. */
let curProgressPhase = null
let dxfViewer = null

async function Load(url) {
    isLoading.value = true
    error.value = null
    try {
        await dxfViewer.Load({
            url,
            fonts: props.fonts,
            progressCbk: _OnProgress,
            workerFactory: () => new Worker(
                new URL("./DxfViewerWorker.js", import.meta.url), {type: "module"})
        })
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
        curProgressPhase = phase
    }
    if (totalSize === null) {
        progress.value = -1
    } else {
        progress.value = size / totalSize
    }
}

watch(() => props.dxfUrl, async dxfUrl => {
    if (dxfUrl !== null) {
        await Load(dxfUrl)
    } else {
        dxfViewer.Clear()
        error.value = null
        isLoading.value = false
        progress.value = null
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
})

onUnmounted(() => {
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
