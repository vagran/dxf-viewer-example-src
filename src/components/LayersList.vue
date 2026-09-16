<template>

<q-scroll-area class="root">
    <q-list dense>
        <q-item-label header>Layers</q-item-label>
        <template v-if="layers !== null">
            <q-item tag="label">
                <q-item-section side top>
                    <q-checkbox :model-value="showAll" @update:model-value="_ToggleAll"/>
                </q-item-section>
                <q-item-section>
                    <q-item-label class="text-italic">All layers</q-item-label>
                </q-item-section>
            </q-item>
            <q-item v-for="layer in layers" :key="layer.name" tag="label">
                <q-item-section side class="q-pa-none">
                    <q-icon name="label" :style="{color: _GetCssColor(layer.color)}" />
                </q-item-section>
                <q-item-section side top>
                    <q-checkbox :model-value="layer.isVisible"
                                @update:model-value="e => _ToggleLayer(layer, e)"/>
                </q-item-section>
                <q-item-section>
                    <q-item-label>{{layer.displayName}}</q-item-label>
                </q-item-section>
            </q-item>
        </template>
    </q-list>
</q-scroll-area>

</template>

<script setup>

import { ref, watch } from "vue"

const props = defineProps({
    layers: {
        /* Expecting array of {name: string, color: number, isVisible: boolean} */
        type: Array,
        default: null
    }
})

const emit = defineEmits(["toggleLayer", "toggleAll"])

const showAll = ref(null)

/* Shallow, like the options-API watcher it replaces: it fires when a new layer list arrives, not
 * when a visibility flag inside the current one is flipped. */
watch(() => props.layers, () => {
    showAll.value = null
})

function _ToggleLayer(layer, newState) {
    emit("toggleLayer", layer, newState)
    showAll.value = null
}

function _ToggleAll(newState) {
    showAll.value = newState
    emit("toggleAll", newState)
}

function _GetCssColor(value) {
    let s = value.toString(16)
    while (s.length < 6) {
        s = "0" + s
    }
    return "#" + s
}

</script>

<style scoped lang="less">

.root {
    height: 100%;
    max-height: 100%;
    width: 300px;
}

</style>
