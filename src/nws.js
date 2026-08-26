const AWC_METAR_URL = 'https://aviationweather.gov/api/data/metar'
const NWS_POINTS_URL = 'https://api.weather.gov/points'
const OBSERVATION_HOURS = 5

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
        if (observations.length === 0) throw new Error(`no observations for station ${stationId}`)
        return observations
    }

    // A configured station never moves, so its gridpoint never changes. Cache the
    // resolution with no TTL rather than spending a request on it every popup open.
    const resolveGridpointUrl = async ({ lat, lon }) => {
        const key = `gridpoint:${lat},${lon}`
        const cached = await cache.read({ key })
        if (cached !== undefined) return cached

        const point = await getJson(fetch, `${NWS_POINTS_URL}/${lat},${lon}`)
        const url = point.properties.forecastGridData
        await cache.write({ key, value: url })
        return url
    }

    return {
        fetchGridpoint: url => getJson(fetch, url),
        fetchObservations,
        resolveGridpointUrl,
    }
}
