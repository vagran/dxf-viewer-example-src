import "quasar/dist/quasar.css"
import "@quasar/extras/material-icons/material-icons.css"
import "@quasar/extras/fontawesome-v5/fontawesome-v5.css"

import Quasar, {
    Notify,

    QBtn,
    QCheckbox,
    QFile,
    QFooter,
    QHeader,
    QIcon,
    QInnerLoading,
    QItem,
    QItemLabel,
    QItemSection,
    QLayout,
    QLinearProgress,
    QList,
    QPage,
    QPageContainer,
    QScrollArea,
    QSeparator,
    QSpace,
    QSpinner,
    QToggle,
    QToolbar,
    QToolbarTitle,
} from "quasar"


export default [Quasar, {
    config: {
        notify: { /* Notify defaults */}
    },
    components: {
        QBtn,
        QCheckbox,
        QFile,
        QFooter,
        QHeader,
        QIcon,
        QInnerLoading,
        QItem,
        QItemLabel,
        QItemSection,
        QLayout,
        QLinearProgress,
        QList,
        QPage,
        QPageContainer,
        QScrollArea,
        QSeparator,
        QSpace,
        QSpinner,
        QToggle,
        QToolbar,
        QToolbarTitle,
    },
    plugins: {
        Notify
    }
}]
