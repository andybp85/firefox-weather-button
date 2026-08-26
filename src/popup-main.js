import { thunderSeries } from './gridpoint.js'
import { createNwsClient } from './nws.js'
import { toViewModel } from './observation.js'
import { render, renderUnavailable } from './popup.js'
import { createCache } from './storage.js'
import { resolveTendency } from './tendency.js'

// A dozen hours is enough strip to read at a glance in a popup this narrow without the
// bars becoming too thin to see; thunderSeries itself has no opinion on how many to ask for.
const THUNDER_HOURS = 12

// Every station-scoped cache entry is namespaced by station id: without this, switching
// stations in the options page would keep serving the previous station's readings until
// the entry's implicit staleness is noticed, since createCache's keys are otherwise bare.
const observationsCacheKey = stationId => `observations:${stationId}`

const buildModel = ({ observations, thunder }) => ({
    observation: toViewModel(observations[0]),
    tendency: resolveTendency(observations),
    thunder,
})

const fetchFreshModel = async ({ cache, client, now, stationId }) => {
    const observations = await client.fetchObservations(stationId)
    await cache.write({ key: observationsCacheKey(stationId), value: observations })

    const [{ lat, lon }] = observations
    const gridpointUrl = await client.resolveGridpointUrl({ lat, lon })
    const gridpoint = await client.fetchGridpoint(gridpointUrl)
    const thunder = thunderSeries({ gridpoint, hours: THUNDER_HOURS, now })

    return buildModel({ observations, thunder })
}

// No gridpoint is cached alongside the observation series — nws.js caches only the /points
// URL resolution, not a forecast fetch — so a degraded render always drops the thunder row.
// That matches Task 5's rule to omit it rather than draw a stale or zeroed strip. Passing the
// empty series straight through, rather than fabricating a { properties: {} } gridpoint just
// to make thunderSeries produce one, keeps this path from inventing a fake domain object.
const fetchCachedModel = async ({ cache, stationId }) => {
    const observations = await cache.read({ key: observationsCacheKey(stationId) })
    if (observations === undefined) throw new Error(`no cached observations for station ${stationId}`)
    return buildModel({ observations, thunder: [] })
}

const resolveModel = async ({ cache, client, now, stationId }) => {
    try {
        return await fetchFreshModel({ cache, client, now, stationId })
    } catch {
        // Broad on purpose: a network error, an HTTP failure, and toViewModel throwing on a
        // temp/dewp-less newest record are all handled the same way — fall back to the cached
        // series with its real age rather than an error page (Task 9 brief's degraded path).
        return await fetchCachedModel({ cache, stationId })
    }
}

const main = async () => {
    const { station } = await browser.storage.local.get('station')
    if (station === undefined) {
        renderUnavailable({ document, reason: 'no station configured yet' })
        return
    }

    const cache = createCache({ now: Date.now, storage: browser.storage.local })
    const client = createNwsClient({ cache, fetch })
    const model = await resolveModel({ cache, client, now: Date.now(), stationId: station.stationId })
    render({ document, model })
}

main().catch(error => {
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
