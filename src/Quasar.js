import "quasar/dist/quasar.css"
import "@quasar/extras/material-icons/material-icons.css"

//XXX
import Quasar, {
    ClosePopup,

    Notify,

    QBadge,
    QBanner,
    QBar,
    QBtn,
    QBtnDropdown,
    QCard,
    QCardSection,
    QCheckbox,
    QDialog,
    QDrawer,
    QFile,
    QFooter,
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
    QMenu,
    QPage,
    QPageContainer,
    QPageScroller,
    QPageSticky,
    QScrollArea,
    QSelect,
    QSeparator,
    QSpace,
    QSpinner,
    QToggle,
    QToolbar,
    QToolbarTitle,
    QTooltip,
} from "quasar"


export default [Quasar, {
    config: {
        notify: { /* Notify defaults */}
    },
    components: {
        QBadge,
        QBanner,
        QBar,
        QBtn,
        QBtnDropdown,
        QCard,
        QCardSection,
        QCheckbox,
        QDialog,
        QDrawer,
        QFile,
        QFooter,
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
        QMenu,
        QPage,
        QPageContainer,
        QPageScroller,
        QPageSticky,
        QScrollArea,
        QSelect,
        QSeparator,
        QSpace,
        QSpinner,
        QToggle,
        QToolbar,
        QToolbarTitle,
        QTooltip,
    },
    directives: {
        ClosePopup
    },
    plugins: {
        Notify
    }
}]
