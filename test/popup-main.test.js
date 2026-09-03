import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { test } from 'node:test'

const MILLISECONDS_PER_MINUTE = 60_000

const popupMarkup = readFileSync(new URL('../src/popup.html', import.meta.url), 'utf8')
const fixture = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url)))

const minutesAgo = minutes => new Date(Date.now() - minutes * MILLISECONDS_PER_MINUTE).toISOString()

// popup-main.js is the extension's entry point: it runs on import, reads globals the browser
// supplies (document, browser, fetch), and exports `ready` so a test can await that run. Each
// case gets its own module instance via a distinct import specifier, because the run happens
// once per instance and must see that case's globals.
const runPopup = async ({ fetch, storage }) => {
    const { document } = new JSDOM(popupMarkup).window
    globalThis.browser = { storage: { local: storage } }
    globalThis.document = document
    globalThis.fetch = fetch

    const { ready } = await import(`../src/popup-main.js?instance=${randomUUID()}`)
    await ready
    return document
}

const fakeStorage = (entries = {}) => {
    const records = { ...entries }
    return {
        get: async key => (key in records ? { [key]: records[key] } : {}),
        records,
        set: async record => Object.assign(records, record),
    }
}

const cacheEntry = ({ ageMinutes, value }) => ({ value, writtenAt: Date.now() - ageMinutes * MILLISECONDS_PER_MINUTE })

const station = { name: 'Newark Intl, NJ, US', stationId: 'KEWR' }

// A gridpoint anchored to the wall clock rather than a fixture date: thunderSeries drops
// buckets that have already elapsed, so a fixture captured on any other day renders nothing.
// Interval expansion itself is covered by gridpoint.test.js against the real fixtures.
const gridpointStartingNow = () => ({
    properties: { probabilityOfThunder: { values: [{ validTime: `${new Date().toISOString()}/PT3H`, value: 40 }] } },
})

const gridpointUrl = 'https://api.weather.gov/gridpoints/OKX/32,42'

const stubFetch = routes => {
    const calls = []
    const fetch = async url => {
        calls.push(url)
        const route = Object.keys(routes).find(prefix => url.startsWith(prefix))
        if (route === undefined) throw new Error(`unstubbed fetch: ${url}`)
        return { json: async () => routes[route], ok: true, status: 200 }
    }
    return { calls, fetch }
}

const liveRoutes = observations => ({
    'https://api.weather.gov/gridpoints': gridpointStartingNow(),
    'https://api.weather.gov/points': { properties: { forecastGridData: gridpointUrl } },
    'https://aviationweather.gov': observations,
})

// Two records three hours apart, timed off the wall clock so the rendered age is stable
// whatever day the suite runs. No presTend, so the tendency resolves from the slp series.
const goodSeries = () => [
    { dewp: 14.4, lat: 40.6828, lon: -74.1692, name: 'Newark Intl, NJ, US', reportTime: minutesAgo(240), slp: 1015, temp: 21.7 },
    { dewp: 15, lat: 40.6828, lon: -74.1692, name: 'Newark Intl, NJ, US', reportTime: minutesAgo(420), slp: 1013.5, temp: 18.9 },
]

test('the popup states why it is empty when no station is configured yet', async () => {
    const { calls, fetch } = stubFetch({})
    const document = await runPopup({ fetch, storage: fakeStorage() })

    assert.match(document.querySelector('#age').textContent, /no station configured yet/)
    assert.equal(calls.length, 0, 'an unconfigured popup must not reach the network')
})

test('the popup renders a live series and caches it for the next open', async () => {
    const storage = fakeStorage({ station })
    const { fetch } = stubFetch(liveRoutes(fixture('kewr-rising')))
    const document = await runPopup({ fetch, storage })

    assert.match(document.querySelector('#dewpoint').textContent, /58°/)
    assert.deepEqual(storage.records['observations:KEWR'].value, fixture('kewr-rising'))
    assert.equal(document.querySelector('#thunder').hidden, false)
})

// api.weather.gov supplies only the thunder row, and it is the flakier of the two upstreams.
// Fixing the cache-ordering defect above moved the series write past the gridpoint fetch, so an
// outage there briefly discarded a METAR series that had already arrived and put the user on the
// error page over a missing strip. The forecast's failure must cost the row, not the reading.
test('a forecast outage costs the thunder row, not the observation series', async () => {
    const storage = fakeStorage({ station })
    const observations = fixture('kewr-rising')
    const { fetch } = stubFetch({ 'https://aviationweather.gov': observations })

    const document = await runPopup({ fetch, storage })

    assert.match(document.querySelector('#dewpoint').textContent, /58°/)
    assert.equal(document.querySelector('#thunder').hidden, true, 'no forecast means no thunder row')
    assert.deepEqual(storage.records['observations:KEWR'].value, observations, 'the series must still be cached')
    assert.equal(storage.records['forecast:KEWR'], undefined, 'a forecast that never arrived must not be cached')
})

// The cache write used to happen the moment the series arrived, before buildModel had a say.
// A newest record that toViewModel rejects then overwrote the last good series with the very
// records about to throw, so the degraded path read them back, threw again, and put the user
// on the error page having destroyed the only reading it existed to preserve.
test('a live series that cannot build a model leaves the cached reading intact and rendered', async () => {
    const cached = goodSeries()
    const storage = fakeStorage({
        'observations:KEWR': cacheEntry({ ageMinutes: 20, value: cached }),
        station,
    })
    const [newest, ...rest] = fixture('kewr-rising')
    const { dewp, temp, ...unrenderable } = newest
    const { fetch } = stubFetch(liveRoutes([unrenderable, ...rest]))

    const document = await runPopup({ fetch, storage })

    assert.match(document.querySelector('#dewpoint').textContent, /58°/)
    assert.match(document.querySelector('#age').textContent, /obs 4h ago/)
    assert.doesNotMatch(document.querySelector('#age').textContent, /no observation available/)
    assert.deepEqual(storage.records['observations:KEWR'].value, cached, 'the last good series must survive a bad live fetch')
})

test('the degraded render omits the thunder row rather than drawing a stale strip', async () => {
    const storage = fakeStorage({
        'observations:KEWR': cacheEntry({ ageMinutes: 20, value: goodSeries() }),
        station,
    })
    const fetch = async () => {
        throw new Error('simulated network failure')
    }

    const document = await runPopup({ fetch, storage })
    assert.equal(document.querySelector('#thunder').hidden, true)
})

test('the popup falls back to the unavailable footer when nothing is cached and the fetch fails', async () => {
    const storage = fakeStorage({ station })
    const fetch = async () => {
        throw new Error('simulated network failure')
    }

    const document = await runPopup({ fetch, storage })
    assert.match(document.querySelector('#age').textContent, /no observation available/)
    assert.match(document.querySelector('#provenance').textContent, /unavailable/)
})

test('a popup reopened inside the TTL serves both the series and the forecast from cache', async () => {
    const storage = fakeStorage({
        'forecast:KEWR': cacheEntry({ ageMinutes: 2, value: gridpointStartingNow() }),
        'observations:KEWR': cacheEntry({ ageMinutes: 2, value: goodSeries() }),
        station,
    })
    const { calls, fetch } = stubFetch({})

    const document = await runPopup({ fetch, storage })

    assert.equal(calls.length, 0, 'a cache hit inside the TTL must spend no requests')
    assert.match(document.querySelector('#dewpoint').textContent, /58°/)
    // The forecast is cached alongside the series precisely so the thunder row survives a
    // cached open; caching only the observations would make the row blink out every reopen.
    assert.equal(document.querySelector('#thunder').hidden, false)
})

test('a cache older than the TTL is refetched rather than served', async () => {
    const storage = fakeStorage({
        'observations:KEWR': cacheEntry({ ageMinutes: 20, value: goodSeries() }),
        station,
    })
    const { calls, fetch } = stubFetch(liveRoutes(fixture('kewr-rising')))

    await runPopup({ fetch, storage })

    assert.ok(
        calls.some(url => url.startsWith('https://aviationweather.gov')),
        'a stale entry must not be served on the happy path',
    )
    assert.deepEqual(storage.records['observations:KEWR'].value, fixture('kewr-rising'))
})

test('a cache hit is not rewritten, so its TTL still expires on schedule', async () => {
    const written = cacheEntry({ ageMinutes: 2, value: goodSeries() })
    const storage = fakeStorage({
        'forecast:KEWR': cacheEntry({ ageMinutes: 2, value: gridpointStartingNow() }),
        'observations:KEWR': written,
        station,
    })

    await runPopup({ fetch: stubFetch({}).fetch, storage })
    assert.equal(storage.records['observations:KEWR'].writtenAt, written.writtenAt)
})
