import "quasar/dist/quasar.css"
import "@quasar/extras/material-icons/material-icons.css"
import "@quasar/extras/fontawesome-v5/fontawesome-v5.css"

import Quasar, {
    Notify,
    ClosePopup,

    QBtn,
    QCard,
    QCardSection,
    QCheckbox,
    QDialog,
    QFile,
    QFooter,
    QForm,
    QHeader,
    QIcon,
    QInnerLoading,
    QInput,
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
    components: {
        QBtn,
        QCard,
        QCardSection,
        QCheckbox,
        QDialog,
        QFile,
        QFooter,
        QForm,
        QHeader,
        QIcon,
        QInnerLoading,
        QInput,
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
        Notify,
        ClosePopup
    }
}]
