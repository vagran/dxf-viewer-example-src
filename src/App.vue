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
            <div>
                <a class="github-button" href="https://github.com/vagran/dxf-viewer"
                   data-color-scheme="no-preference: dark; light: light; dark: dark;"
                   data-size="large"
                   data-show-count="true"
                   aria-label="Star vagran/dxf-viewer on GitHub">dxf-viewer on GitHub</a>
            </div>
            <div class="q-mx-lg">
                <a class="github-button" href="https://github.com/vagran/dxf-viewer-example-src"
                   data-color-scheme="no-preference: dark; light: light; dark: dark;"
                   data-size="large"
                   data-show-count="true"
                   aria-label="Star vagran/dxf-viewer-example-src on GitHub">This example on GitHub</a>
            </div>
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