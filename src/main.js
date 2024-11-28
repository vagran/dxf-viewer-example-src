import Vue from "vue"
import App from "@/App"
import "@/assets/styles/global.less"

import quasarConfig from "@/Quasar"
Vue.use(...quasarConfig)

console.log(`DXF viewer version: ${DXF_VIEWER_VERSION}`);

new Vue({
    el: "#app",
    render: h => h(App)
})
