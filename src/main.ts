import { createApp } from "vue"
import App from "@/App.vue"

import "@/assets/styles/global.less"

import quasarConfig from "@/Quasar"


createApp(App)
    .use(...quasarConfig)
    .mount("#app")
