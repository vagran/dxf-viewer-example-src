import { reactive } from "vue"

/** Console warnings and errors seen since the last ResetDiagnostics(), so that a load can be
 * judged from the page instead of from a console that has already scrolled away.
 *
 * **Main thread only.** With the worker enabled — the default — `DxfScene` runs in the worker,
 * which has its own `console`, so the warnings that matter most (unresolved block references,
 * unhandled entity types, hatch limits) never pass through here. The browser still prints them
 * under the worker's context; it is only the count that cannot see them. Load with `?worker=0`
 * when the count has to be complete.
 */
export const diagnostics = reactive({
    /** @type {{level: string, text: string}[]} */
    messages: []
})

/* A malformed file can warn per hatch line, and MAX_HATCH_LINES alone is 20000. Keep the list
 * bounded; the count is what matters past the first few. */
const MAX_MESSAGES = 100

export function ResetDiagnostics() {
    diagnostics.messages.length = 0
    diagnostics.overflowed = false
}

/** Wrap console.warn/error so they are recorded as well as printed. Call once, before the app is
 * mounted. */
export function InstallDiagnostics() {
    for (const level of ["warn", "error"]) {
        const original = console[level].bind(console)
        console[level] = (...args) => {
            if (diagnostics.messages.length < MAX_MESSAGES) {
                diagnostics.messages.push({level, text: args.map(_Describe).join(" ")})
            } else {
                diagnostics.overflowed = true
            }
            original(...args)
        }
    }
}

function _Describe(arg) {
    if (typeof arg === "string") {
        return arg
    }
    if (arg instanceof Error) {
        return arg.message
    }
    try {
        return JSON.stringify(arg)
    } catch {
        /* Cyclic, or a host object. */
        return String(arg)
    }
}
