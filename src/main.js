import Vue from "vue"
import App from "@/App"
import "@/assets/styles/global.less"

import quasarConfig from "@/Quasar"
Vue.use(...quasarConfig)

new Vue({
    el: "#app",
    render: h => h(App)
})
