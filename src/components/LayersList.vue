<template>

<q-scroll-area class="root">
    <q-list dense>
        <q-item-label header>Layers</q-item-label>
        <q-item v-if="layers !== null" tag="label">
            <q-item-section side top>
                <q-checkbox :value="showAll" @input="_ToggleAll"/>
            </q-item-section>
            <q-item-section>
                <q-item-label class="text-italic">All layers</q-item-label>
            </q-item-section>
        </q-item>
        <q-item v-if="layers !== null" v-for="layer in layers" :key="layer.name" tag="label">
            <q-item-section side class="q-pa-none">
                <q-icon name="label" :style="{color: _GetCssColor(layer.color)}" />
            </q-item-section>
            <q-item-section side top>
                <q-checkbox :value="layer.isVisible" @input="e => _ToggleLayer(layer, e)"/>
            </q-item-section>
            <q-item-section>
                <q-item-label>{{layer.displayName}}</q-item-label>
            </q-item-section>
        </q-item>
    </q-list>
</q-scroll-area>

</template>

<script>

export default {
    name: "LayersList",

    props: {
        layers: {
            /* Expecting array of {name: string, color: number, isVisible: boolean} */
            type: Array,
            default: null
        }
    },

    watch: {
        layers() {
            this.showAll = null
        }
    },

    data() {
        return {
            showAll: null
        }
    },

    methods: {
        _ToggleLayer(layer, newState) {
            this.$emit("toggleLayer", layer, newState)
            this.showAll = null
        },

        _ToggleAll(newState) {
            this.showAll = newState
            this.$emit("toggleAll", newState)
        },

        _GetCssColor(value) {
            let s = value.toString(16)
            while (s.length < 6) {
                s = "0" + s
            }
            return "#" + s
        }
    }
}

</script>

<style scoped lang="less">

.root {
    height: 100%;
    max-height: 100%;
    width: 300px;
}

</style>
