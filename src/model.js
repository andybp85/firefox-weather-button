import { thunderSeries } from './gridpoint.js'
import { toViewModel } from './observation.js'
import { resolveTendency } from './tendency.js'

// The spec's client cache TTL. METARs update hourly plus specials and both upstreams send
// short max-age values, so a popup reopened inside this window has nothing new to show.
const CACHE_TTL_MINUTES = 10

// A dozen hours is enough strip to read at a glance in a popup this narrow without the
// bars becoming too thin to see; thunderSeries itself has no opinion on how many to ask for.
const THUNDER_HOURS = 12

// Every station-scoped cache entry is namespaced by station id: without this, switching
// stations in the options page would keep serving the previous station's readings until
// the entry's implicit staleness is noticed, since createCache's keys are otherwise bare.
const forecastCacheKey = stationId => `forecast:${stationId}`
const observationsCacheKey = stationId => `observations:${stationId}`

// observations[0] is the newest reading because nws.js sorts the series newest-first at
// the boundary; this module never re-derives that ordering.
const buildModel = ({ observations, thunder }) => ({
    observation: toViewModel(observations[0]),
    tendency: resolveTendency(observations),
    thunder,
})

const fetchGridpoint = async ({ client, observations }) => {
    const [{ lat, lon }] = observations
    return client.fetchGridpoint(await client.resolveGridpointUrl({ lat, lon }))
}

const fetchFreshModel = async ({ cache, client, now, stationId }) => {
    const forecastKey = forecastCacheKey(stationId)
    const observationsKey = observationsCacheKey(stationId)

    // The happy path honours the TTL; fetchCachedModel below reads this same key with no TTL
    // on purpose. That asymmetry is the design: expiry exists to stop needless requests, but
    // once a fetch has failed, a stale reading that states its own age beats no reading at all.
    const cachedObservations = await cache.read({ key: observationsKey, ttlMinutes: CACHE_TTL_MINUTES })
    const observations = cachedObservations ?? (await client.fetchObservations(stationId))

    // The forecast is cached alongside the series so a cached open does not still spend two
    // requests on the thunder row — and so the row does not blink out on every reopen.
    const cachedGridpoint = await cache.read({ key: forecastKey, ttlMinutes: CACHE_TTL_MINUTES })

    // api.weather.gov is the flakier of the two upstreams, and it only supplies the thunder
    // row. Letting it throw here would discard the METAR series already fetched above and drop
    // the user on the error page over a missing strip, so its failure degrades to Task 5's
    // rule — omit the row — rather than failing the whole render.
    const gridpoint = cachedGridpoint ?? (await fetchGridpoint({ client, observations }).catch(() => undefined))

    const thunder = gridpoint === undefined ? [] : thunderSeries({ gridpoint, hours: THUNDER_HOURS, now })
    const model = buildModel({ observations, thunder })

    // Written only once buildModel has proven the data renders. Writing the series the moment
    // it arrived overwrote the last good cache with the very records about to throw, so the
    // degraded path read them back, threw again, and left the user on the error page with the
    // reading it exists to preserve already destroyed. A cache hit is deliberately not
    // rewritten: refreshing writtenAt on every read would keep an entry alive forever.
    if (cachedObservations === undefined) await cache.write({ key: observationsKey, value: observations })
    if (cachedGridpoint === undefined && gridpoint !== undefined) await cache.write({ key: forecastKey, value: gridpoint })

    return model
}

// The cached forecast is deliberately not read here. Reaching this path means the TTL already
// missed, so any cached gridpoint is stale too, and Task 5's rule is to omit the thunder row
// rather than draw a stale or zeroed strip. Passing the empty series straight through, rather
// than fabricating a { properties: {} } gridpoint just to make thunderSeries produce one,
// keeps this path from inventing a fake domain object.
const fetchCachedModel = async ({ cache, stationId }) => {
    const observations = await cache.read({ key: observationsCacheKey(stationId) })
    if (observations === undefined) throw new Error(`no cached observations for station ${stationId}`)
    return buildModel({ observations, thunder: [] })
}

// The one reading pipeline, shared by the popup and by the toolbar button's background page
// so the two can never disagree about what the current observation is. Both go through the
// same cache, so the button's refresh and a popup open inside the TTL cost one fetch between
// them rather than one each.
export const resolveModel = async ({ cache, client, now, stationId }) => {
    try {
        return await fetchFreshModel({ cache, client, now, stationId })
    } catch {
        // Broad on purpose: a network error, an HTTP failure, and toViewModel throwing on a
        // temp/dewp-less newest record are all handled the same way — fall back to the cached
        // series with its real age rather than an error page (Task 9 brief's degraded path).
        return await fetchCachedModel({ cache, stationId })
    }
}
