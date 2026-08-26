import { thunderSeries } from './gridpoint.js'
import { toViewModel } from './observation.js'
import { render } from './popup.js'
import { createNwsClient } from './nws.js'
import { createCache } from './storage.js'
import { resolveTendency } from './tendency.js'

// A dozen hours is enough strip to read at a glance in a popup this narrow without the
// bars becoming too thin to see; thunderSeries itself has no opinion on how many to ask for.
const THUNDER_HOURS = 12
const PLACEHOLDER = '—'

// Every station-scoped cache entry is namespaced by station id: without this, switching
// stations in the options page would keep serving the previous station's readings until
// the entry's implicit staleness is noticed, since createCache's keys are otherwise bare.
const observationsCacheKey = stationId => `observations:${stationId}`

const buildModel = ({ gridpoint, now, observations }) => ({
    observation: toViewModel(observations[0]),
    tendency: resolveTendency(observations),
    thunder: thunderSeries({ gridpoint, hours: THUNDER_HOURS, now }),
})

const fetchFreshModel = async ({ cache, client, now, stationId }) => {
    const observations = await client.fetchObservations(stationId)
    await cache.write({ key: observationsCacheKey(stationId), value: observations })

    const [{ lat, lon }] = observations
    const gridpointUrl = await client.resolveGridpointUrl({ lat, lon })
    const gridpoint = await client.fetchGridpoint(gridpointUrl)

    return buildModel({ gridpoint, now, observations })
}

// No gridpoint is cached alongside the observation series — nws.js caches only the /points
// URL resolution, not a forecast fetch — so a degraded render always drops the thunder row.
// That matches Task 5's rule to omit it rather than draw a stale or zeroed strip.
const fetchCachedModel = async ({ cache, now, stationId }) => {
    const observations = await cache.read({ key: observationsCacheKey(stationId) })
    if (observations === undefined) throw new Error(`no cached observations for station ${stationId}`)
    return buildModel({ gridpoint: { properties: {} }, now, observations })
}

const resolveModel = async ({ cache, client, now, stationId }) => {
    try {
        return await fetchFreshModel({ cache, client, now, stationId })
    } catch {
        // Broad on purpose: a network error, an HTTP failure, and toViewModel throwing on a
        // temp/dewp-less newest record are all handled the same way — fall back to the cached
        // series with its real age rather than an error page (Task 9 brief's degraded path).
        return await fetchCachedModel({ cache, now, stationId })
    }
}

// The footer is a requirement on every code path, including this one: a user who has never
// successfully loaded data still sees why, rather than a blank popup.
const renderUnavailable = ({ document, reason }) => {
    const write = (selector, text) => {
        document.querySelector(selector).textContent = text
    }

    write('.ambient-primary', PLACEHOLDER)
    write('.ambient-clouds', '')
    write('#dewpoint', PLACEHOLDER)
    write('#pressure', PLACEHOLDER)
    write('#cloud-base', PLACEHOLDER)
    write('#age', `no observation available — ${reason}`)
    write('#provenance', 'tendency: unavailable')
    document.querySelector('#thunder').hidden = true
}

const main = async () => {
    const { station } = await browser.storage.local.get('station')
    if (station === undefined) {
        renderUnavailable({ document, reason: 'no station configured yet' })
        return
    }

    const cache = createCache({ now: Date.now, storage: browser.storage.local })
    const client = createNwsClient({ cache, fetch })

    try {
        const model = await resolveModel({ cache, client, now: Date.now(), stationId: station.stationId })
        render({ document, model })
    } catch (error) {
        renderUnavailable({ document, reason: error.message })
    }
}

main()
