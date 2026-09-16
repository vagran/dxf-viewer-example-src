/* Styles, icon fonts and the Quasar plugins used by this application.
 *
 * Components and directives are deliberately absent: @quasar/vite-plugin scans the templates and
 * auto-imports exactly what they use, which is what the explicit registration list here used to do
 * by hand under Quasar 1. */

import "@quasar/extras/material-icons/material-icons.css"
import "@quasar/extras/fontawesome-v7/fontawesome-v7.css"
import "quasar/src/css/index.sass"

import { Notify } from "quasar"

export default {
    plugins: { Notify }
}
