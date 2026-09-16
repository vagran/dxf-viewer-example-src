import { createApp } from "vue"
import { Quasar } from "quasar"

import App from "@/App.vue"
import quasarConfig from "@/Quasar"
import "@/assets/styles/global.less"

console.log(`DXF viewer version: ${DXF_VIEWER_VERSION}`);

createApp(App)
    .use(Quasar, quasarConfig)
    .mount("#app")
