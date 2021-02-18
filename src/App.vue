<template>
<q-layout view="hHh lpr fff">
    <q-header>
        <q-toolbar>
            <q-toolbar-title :shrink="true" >DXF viewer</q-toolbar-title>
            <q-file color="white" label-color="white" filled bottom-slots clearable dense
                    :value="inputFile" label="Select file" style="max-width: 300px;"
                    accept=".dxf"
                    class="q-ml-xl" dark @input="_OnFileSelected" @clear="_OnFileCleared">
                <template v-slot:before>
                    <q-icon name="folder_open" color="white" />
                </template>
                <template v-slot:hint>
                    <span class="text-white">File is processed locally in your browser</span>
                </template>
            </q-file>
            <q-space />
            <q-btn icon="fab fa-github" color="primary" label="dxf-viewer on GitHub" no-caps
                   class="q-mx-sm" type="a" href="https://github.com/vagran/dxf-viewer" />
            <q-btn icon="fab fa-github" color="primary" label="This example on GitHub" no-caps
                   class="q-mx-sm" type="a" href="https://github.com/vagran/dxf-viewer-example-src" />
        </q-toolbar>
    </q-header>
    <q-page-container>
        <ViewerPage :dxfUrl="dxfUrl" />
    </q-page-container>
</q-layout>
</template>
<script>
import ViewerPage from "@/components/ViewerPage";
export default {
    components: {ViewerPage},

    data() {
        return {
            dxfUrl: null,
            inputFile: null
        }
    },

    methods: {
        _OnFileSelected(file) {
            if (!file) {
                this._OnFileCleared()
                return
            }
            this.inputFile = file
            this.dxfUrl = URL.createObjectURL(file)
        },

        _OnFileCleared() {
            if (this.inputFile) {
                this.inputFile = null
                URL.revokeObjectURL(this.dxfUrl)
                this.dxfUrl = null
                this.$q.notify({
                    type: "info",
                    message: "File cleared"
                })
            }
        }
    }
}
</script>