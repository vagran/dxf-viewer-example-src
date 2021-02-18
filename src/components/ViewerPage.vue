<template>
    <q-page class="row items-stretch root">
        <div class="col">
            <DxfViewer ref="viewer" :dxfUrl="dxfUrl" :fonts="[mainFont, auxFont]"
                       @dxf-loaded="_OnLoaded" @dxf-cleared="_OnCleared"/>
        </div>
        <div class="col-auto layersCol">
            <LayersList :layers="layers" @toggleLayer="_OnToggleLayer" @toggleAll="_OnToggleAll"/>
        </div>
    </q-page>
</template>

<script>
import DxfViewer from "@/components/DxfViewer"
import Vue from "vue"
import mainFont from "@/assets/fonts/Roboto-LightItalic.ttf"
import auxFont from "@/assets/fonts/NanumGothic-Regular.ttf"
import LayersList from "@/components/LayersList";

export default {
    name: "ViewerPage",
    components: {LayersList, DxfViewer},

    props: {
        dxfUrl: {
            type: String
        }
    },

    data() {
        return {
            layers: null
        }
    },

    methods: {
        _OnLoaded() {
            const layers = this.$refs.viewer.GetViewer().GetLayers()
            layers.forEach(lyr => Vue.set(lyr, "isVisible", true))
            this.layers = layers
        },

        _OnCleared() {
            this.layers = null
        },

        _OnToggleLayer(layer, newState) {
            layer.isVisible = newState
            this.$refs.viewer.GetViewer().ShowLayer(layer.name, newState)
        },

        _OnToggleAll(newState) {
            if (this.layers) {
                for (const layer of this.layers) {
                    if (layer.isVisible !== newState) {
                        this._OnToggleLayer(layer, newState)
                    }
                }
            }
        }
    },

    created() {
        this.mainFont = mainFont
        this.auxFont = auxFont
    }
}
</script>

<style scoped lang="less">

.root {
    .layersCol {
        border-left: #DBDBDB solid 1px;
    }
}

</style>
