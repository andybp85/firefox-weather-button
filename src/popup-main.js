import { resolveModel } from './model.js'
import { createNwsClient } from './nws.js'
import { render, renderUnavailable } from './popup.js'
import { createCache } from './storage.js'

const main = async () => {
    const { station } = await browser.storage.local.get('station')
    if (station === undefined) {
        renderUnavailable({ document, reason: 'no station configured yet' })
        return
    }

    const now = Date.now()
    const cache = createCache({ now: Date.now, storage: browser.storage.local })
    const client = createNwsClient({ cache, fetch })
    const model = await resolveModel({ cache, client, now, stationId: station.stationId })
    render({ document, model, now })
}

// Exported so the run is awaitable: test/popup-main.test.js drives this entry point against a
// jsdom document and a fake browser.storage.local, and needs a handle on the run before it can
// assert against the rendered DOM. Firefox itself only needs the import's side effect.
export const ready = main().catch(error => {
    // Terminal boundary: the storage read, resolveModel's own fresh/cached fallback, and
    // render() itself can all still throw (a network error before any cache exists, or a
    // markup rename breaking a selector) — this is what turns that into the "unavailable"
    // footer instead of an unhandled rejection and a blank popup.
    try {
        renderUnavailable({ document, reason: error.message })
    } catch {
        // Deliberately silent: renderUnavailable failing here means even the placeholder
        // render is broken, and there is nothing further left to fall back to.
    }
})
