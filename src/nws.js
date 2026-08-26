const AWC_METAR_URL = 'https://aviationweather.gov/api/data/metar'
const NWS_POINTS_URL = 'https://api.weather.gov/points'
const OBSERVATION_HOURS = 5

// The station never moves, so its gridpoint resolution is stable for as long as NWS keeps the
// same grid. NWS does occasionally re-grid, though, and this entry was written with no TTL at
// all: a stale URL then dropped the thunder row permanently, with no error and no way for the
// user to clear it. A month costs about one extra /points request a month and lets a re-grid
// heal itself without anyone noticing.
const GRIDPOINT_URL_TTL_MINUTES = 30 * 24 * 60

// User-Agent cannot be set from fetch (forbidden header) and does not need to be:
// api.weather.gov 403s only when no UA is sent at all, and the browser always sends one.
const getJson = async (fetch, url) => {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`${url} responded ${response.status}`)
    return response.json()
}

export const createNwsClient = ({ cache, fetch }) => {
    const fetchObservations = async stationId => {
        const url = `${AWC_METAR_URL}?ids=${encodeURIComponent(stationId)}&format=json&hours=${OBSERVATION_HOURS}`
        const observations = await getJson(fetch, url)
        // station.js destructures the first observation and depends on this throw, because
        // AWC signals an unknown station with an empty array rather than an error status.
        if (observations.length === 0) throw new Error(`no observations for station ${stationId}`)

        // Parse, don't validate: station.js, popup-main.js, and tendency.js all read
        // observations[0] as "the newest" and walk the series from there. AWC happens to
        // answer newest-first, but its contract does not promise it, so the ordering is
        // established once here at the boundary rather than assumed three modules downstream.
        return [...observations].sort((a, b) => Date.parse(b.reportTime) - Date.parse(a.reportTime))
    }

    // Cached for a long but finite window rather than re-resolved on every popup open; see
    // GRIDPOINT_URL_TTL_MINUTES for why the window has an end.
    const resolveGridpointUrl = async ({ lat, lon }) => {
        const key = `gridpoint:${lat},${lon}`
        const cached = await cache.read({ key, ttlMinutes: GRIDPOINT_URL_TTL_MINUTES })
        if (cached !== undefined) return cached

        const pointUrl = `${NWS_POINTS_URL}/${lat},${lon}`
        const point = await getJson(fetch, pointUrl)
        const url = point?.properties?.forecastGridData
        // The TTL here is a month, so caching a malformed response would silently drop the
        // thunder row on every open until it expired. Throw rather than write a bad entry.
        if (url === undefined) throw new Error(`${pointUrl} returned no forecastGridData`)

        await cache.write({ key, value: url })
        return url
    }

    return {
        fetchGridpoint: url => getJson(fetch, url),
        fetchObservations,
        resolveGridpointUrl,
    }
}
