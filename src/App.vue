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
            <q-btn icon="help" label="About" class="q-ml-lg" @click="aboutDialog = true"></q-btn>
            <q-space />
            <q-btn icon="fab fa-github" color="primary" label="dxf-viewer on GitHub" no-caps
                   class="q-mx-sm github" type="a"
                   href="https://github.com/vagran/dxf-viewer" />
            <q-btn icon="fab fa-github" color="primary" label="This example on GitHub" no-caps
                   class="q-mx-sm github" type="a"
                   href="https://github.com/vagran/dxf-viewer-example-src" />
        </q-toolbar>
    </q-header>
    <q-page-container>
        <ViewerPage :dxfUrl="dxfUrl" />
    </q-page-container>

    <q-dialog v-model="aboutDialog">
        <q-card>
            <q-card-section class="row items-center q-pb-sm">
                <div class="text-h6">About</div>
                <q-space />
                <q-btn icon="close" flat round dense v-close-popup />
            </q-card-section>
            <q-separator />
            <q-card-section style="max-height: 50vh" class="scroll" v-html="aboutHtml" />
        </q-card>
    </q-dialog>
</q-layout>
</template>
<script>
import ViewerPage from "@/components/ViewerPage";
export default {
    components: {ViewerPage},

    data() {
        return {
            dxfUrl: null,
            inputFile: null,
            aboutDialog: false
        }
    },

    methods: {
        _OnFileSelected(file) {
            if (!file) {
                this._OnFileCleared()
                return
            }
            if (this.dxfUrl) {
                URL.revokeObjectURL(this.dxfUrl)
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
    },

    created() {
        const aboutBlock = document.getElementById("about")
        this.aboutHtml = aboutBlock.innerHTML
        aboutBlock.style.display = "none"
        /* For web crawler. */
        document.getElementById("noscript").innerText = aboutBlock.innerText
    },
    destroyed() {
        if (this.dxfUrl) {
            URL.revokeObjectURL(this.dxfUrl)
        }
    }
}
</script>

<style scoped lang="less">

a.github:hover {
    text-decoration: none;
}

</style>