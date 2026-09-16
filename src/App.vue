<template>
<q-layout view="hHh lpr fff" data-nosnippet>
    <q-header>
        <q-toolbar>
            <q-toolbar-title :shrink="true" >
                DXF viewer
                <a href="https://www.npmjs.com/package/dxf-viewer">
                    <q-badge align="top" color="secondary">{{version}}</q-badge>
                </a>
                <q-badge v-if="libraryIsLinked" align="top" color="warning" class="q-ml-xs"
                         :title="`dxf-viewer resolved through npm link: ${libraryDir}`">
                    linked{{libraryRev === null ? "" : ` ${libraryRev}`}}
                </q-badge>
            </q-toolbar-title>

            <q-file color="white" label-color="white" filled bottom-slots clearable dense
                    :model-value="inputFile" label="Select file or drag here"
                    style="max-width: 300px;" accept=".dxf" class="q-ml-xl" dark
                    @update:model-value="_OnFileSelected" @clear="_OnFileCleared">
                <template v-slot:before>
                    <q-icon name="folder_open" color="white" />
                </template>
                <template v-slot:hint>
                    <span class="text-white">File is processed locally in your browser</span>
                </template>
                <template v-slot:after>
                    <q-btn dense flat label="URL" @click="urlDialog = true"/>
                </template>
            </q-file>
            <q-btn icon="help" label="About" class="q-ml-lg" @click="aboutDialog = true"></q-btn>
            <q-space />
            <q-btn icon="fa-brands fa-github" color="primary" label="dxf-viewer on GitHub" no-caps
                   class="q-mx-sm github" type="a"
                   href="https://github.com/vagran/dxf-viewer" />
            <q-btn icon="fa-brands fa-github" color="primary" label="This example on GitHub" no-caps
                   class="q-mx-sm github" type="a"
                   href="https://github.com/vagran/dxf-viewer-example-src" />
        </q-toolbar>
    </q-header>
    <q-page-container>
        <ViewerPage :dxfUrl="dxfUrl">
            <div v-if="inputFile === null"
                 class="centralUploader row justify-center items-center" >
                <div class="col-auto" style="width: 300px;">
                    <q-file filled bottom-slots clearable
                            :model-value="inputFile" label="Select file or drag here"
                            accept=".dxf" class="col"
                            @update:model-value="_OnFileSelected" @clear="_OnFileCleared">
                        <template v-slot:before>
                            <q-icon name="folder_open" size="xl" />
                        </template>
                        <template v-slot:hint>
                            <span>File is processed locally in your browser</span>
                        </template>
                    </q-file>
                </div>
                <div class="col-auto q-mx-lg q-pb-lg">
                    <q-btn label="Load URL" @click="urlDialog = true"/>
                </div>
            </div>
        </ViewerPage>
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

    <q-dialog v-model="urlDialog">
        <q-card>
            <q-card-section class="row items-center q-pb-sm">
                <div class="text-h6">Load URL</div>
                <q-space />
                <q-btn icon="close" flat round dense v-close-popup />
            </q-card-section>
            <q-separator />
            <q-card-section>
                <div class="q-mb-lg">
                    <a href="https://startpage.com/sp/search?q=SECTION%20HEADER%20filetype:dxf"
                       target="_blank">Find some examples</a>
                </div>
                <q-form @submit="_OnUrl" class="q-gutter-md" style="width: 400px;">
                    <q-input filled v-model="inputUrl" label="Input URL here" bottom-slots>
                      <template v-slot:hint>
                        <span>Uses <a href="https://allorigins.win">AllOrigins</a> CORS proxy</span>
                      </template>
                    </q-input>
                    <div>
                        <q-btn label="Submit" type="submit" color="primary" v-close-popup />
                    </div>
                </q-form>
            </q-card-section>
        </q-card>
    </q-dialog>
</q-layout>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue"
import { useQuasar } from "quasar"
import ViewerPage from "@/components/ViewerPage.vue"

const $q = useQuasar()

const version = DXF_VIEWER_VERSION
/* Whether the page is exercising a working copy reached through `npm link` or the published
 * package — see GetLibraryInfo() in vite.config.js. Constants, not state; they are fixed when the
 * dev server loads its config.
 */
const libraryIsLinked = DXF_VIEWER_LINKED
const libraryRev = DXF_VIEWER_REV
const libraryDir = DXF_VIEWER_DIR
const dxfUrl = ref(null)
const inputFile = ref(null)
const aboutDialog = ref(false)
const urlDialog = ref(false)
const inputUrl = ref(null)

/* Read back by the handlers below but never rendered, so it stays out of reactive state. */
let isLocalFile = false

/* The setup body runs where created() used to. The About copy is authored as static markup in
 * index.html so that crawlers see it without running the app; lift it into the dialog and hide
 * the original. */
const aboutBlock = document.getElementById("about")
const aboutHtml = aboutBlock.innerHTML
aboutBlock.style.display = "none"
/* For web crawler. */
document.getElementById("noscript").innerText = aboutBlock.innerText

function _OnFileSelected(file) {
    if (!file) {
        _OnFileCleared()
        return
    }
    if (dxfUrl.value && isLocalFile) {
        URL.revokeObjectURL(dxfUrl.value)
    }
    isLocalFile = true
    inputFile.value = file
    dxfUrl.value = URL.createObjectURL(file)
}

function _OnFileCleared() {
    if (inputFile.value) {
        inputFile.value = null
        URL.revokeObjectURL(dxfUrl.value)
        dxfUrl.value = null
        $q.notify({
            type: "info",
            message: "File cleared"
        })
    }
}

function _OnUrl() {
    if (inputUrl.value === null) {
        return
    }
    const url = inputUrl.value.trim()
    if (url === "") {
        return
    }
    _SetExternalUrl(url)
}

/** Same-origin URLs are fetched directly; the CORS proxy is only there to reach foreign hosts.
 * This is what makes `?dxfUrl=/test-data/city.dxf` work against the dev server — the proxy cannot
 * see localhost, so routing everything through it would break the local case.
 *
 * @param url {string} Absolute, or relative to the current page.
 */
function _IsSameOrigin(url) {
    if (!URL.canParse(url)) {
        /* Relative, so it resolves against this page and is same-origin by construction. */
        return true
    }
    return new URL(url).origin === location.origin
}

function _SetExternalUrl(url) {
    if (dxfUrl.value && isLocalFile) {
        URL.revokeObjectURL(dxfUrl.value)
    }
    isLocalFile = false
    inputFile.value = new File(["remote_file"], url, { type: "text/plain" })
    dxfUrl.value = _IsSameOrigin(url)
        ? url
        : "https://api.allorigins.win/raw?url=" + encodeURIComponent(url)
}

onMounted(() => {
    /* Named `url`, not `dxfUrl`, so it does not shadow the ref of that name. */
    const url = new URL(location.href).searchParams.get("dxfUrl")
    if (url?.length) {
        /* Relative URLs are accepted, so `?dxfUrl=/test-data/city.dxf` addresses the tree the dev
         * server exposes; the base makes canParse() judge those the same way the browser will. */
        if (!URL.canParse(url, location.href)) {
            $q.notify({
                type: "negative",
                message: "Bad URL specified"
            })
            return
        }
        _SetExternalUrl(url)
    }
})

onUnmounted(() => {
    if (dxfUrl.value) {
        URL.revokeObjectURL(dxfUrl.value)
    }
})
</script>

<style scoped lang="less">

a.github:hover {
    text-decoration: none;
}

.centralUploader {
    width: 100%;
    height: 100%;
    position: absolute;
    z-index: 10;
}

</style>
