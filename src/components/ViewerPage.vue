<template>
    <q-page class="row items-stretch root">
        <div class="col relative-position">
            <slot></slot>
            <DxfViewer ref="viewer" :dxfUrl="dxfUrl" :fonts="fonts"
                       @dxf-loaded="_OnLoaded" @dxf-cleared="_OnCleared" @dxf-message="_OnMessage" />
        </div>
        <div class="col-auto layersCol">
            <LayersList :layers="layers" @toggleLayer="_OnToggleLayer" @toggleAll="_OnToggleAll"/>
        </div>
    </q-page>
</template>

<script setup>
import { ref, useTemplateRef, watch } from "vue"
import { useQuasar } from "quasar"
import DxfViewer from "@/components/DxfViewer.vue"
import {DxfViewer as _DxfViewer} from "dxf-viewer"
import mainFont from "@/assets/fonts/Roboto-LightItalic.ttf"
import aux1Font from "@/assets/fonts/NotoSansDisplay-SemiCondensedLightItalic.ttf"
import aux2Font from "@/assets/fonts/HanaMinA.ttf"
import aux3Font from "@/assets/fonts/NanumGothic-Regular.ttf"
import LayersList from "@/components/LayersList.vue"

defineProps({
    dxfUrl: {
        type: String
    }
})

const $q = useQuasar()

const viewer = useTemplateRef("viewer")

const layers = ref(null)

/* Fixed for the lifetime of the component, so a plain array rather than reactive state. */
const fonts = [mainFont, aux1Font, aux2Font, aux3Font]

function _OnLoaded() {
    const loaded = viewer.value.GetViewer().GetLayers(true)
    /* A layer the drawing has switched off starts hidden, so its checkbox has to start clear
     * rather than contradict the canvas.
     */
    loaded.forEach(lyr => lyr.isVisible = lyr.visible)
    layers.value = loaded
}

function _OnCleared() {
    layers.value = null
}

function _OnToggleLayer(layer, newState) {
    layer.isVisible = newState
    viewer.value.GetViewer().ShowLayer(layer.name, newState)
}

function _OnToggleAll(newState) {
    if (layers.value) {
        for (const layer of layers.value) {
            if (layer.isVisible !== newState) {
                _OnToggleLayer(layer, newState)
            }
        }
    }
}

/* Layer swatch colors come from GetLayers(), which applies the same contrast correction as the
 * canvas, so a theme switch changes them and they have to be read again. The colors are updated in
 * place rather than by replacing the list: LayersList resets its "all layers" checkbox whenever a
 * new list arrives, and a theme switch is not a new list of layers. `flush: "post"` keeps this
 * behind the child's own watcher, which is what changes the background the colors are corrected
 * against.
 */
watch(() => $q.dark.isActive, _RefreshLayerColors, {flush: "post"})

function _RefreshLayerColors() {
    const api = viewer.value?.GetViewer()
    if (layers.value === null || !api) {
        return
    }
    const colors = new Map(api.GetLayers(true).map(lyr => [lyr.name, lyr.color]))
    for (const lyr of layers.value) {
        const color = colors.get(lyr.name)
        if (color !== undefined && color !== lyr.color) {
            lyr.color = color
        }
    }
}

function _OnMessage(e) {
    let type = "info"
    switch (e.detail.level) {
    case _DxfViewer.MessageLevel.WARN:
        type = "warning"
        break
    case _DxfViewer.MessageLevel.ERROR:
        type = "negative"
        break
    }
    $q.notify({ type, message: e.detail.message })
}
</script>

<style scoped lang="less">

.root {
    .layersCol {
        border-left: #DBDBDB solid 1px;
    }
}

/* Global for the same reason as in DxfViewer.vue: the ancestor carrying the theme is <body>, and
 * the whole selector has to go inside one :global(). */
:global(body.body--dark .root .layersCol) {
    border-left-color: #4a4a4a;
}

</style>
