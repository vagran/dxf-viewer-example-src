import { createApp } from "vue"
import { Quasar } from "quasar"

import App from "@/App.vue"
import quasarConfig from "@/Quasar"
import "@/assets/styles/global.less"

/* Says which dxf-viewer the page is actually running, since a linked working copy and the
 * published package usually carry the same version number.
 */
console.log(`DXF viewer version: ${DXF_VIEWER_VERSION}` +
            (DXF_VIEWER_LINKED
                ? ` (npm link -> ${DXF_VIEWER_DIR}${DXF_VIEWER_REV === null
                    ? "" : `, ${DXF_VIEWER_REV}`})`
                : " (from npm)"))

createApp(App)
    .use(Quasar, quasarConfig)
    .mount("#app")
