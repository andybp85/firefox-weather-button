import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { createCache } from '../src/storage.js'
import { createNwsClient } from '../src/nws.js'
import { updateButton } from '../src/button.js'

const fixture = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url)))

const fakeStorage = (entries = {}) => {
    const records = { ...entries }
    return {
        get: async key => (key in records ? { [key]: records[key] } : {}),
        records,
        set: async record => Object.assign(records, record),
    }
}

// Records what the button was told to become. Firefox's browser.action is the whole output of
// this module, so the assertions are about these two calls and nothing else.
const fakeAction = () => {
    const icons = []
    const titles = []
    return { icons, setIcon: async icon => icons.push(icon), setTitle: async ({ title }) => titles.push(title), titles }
}

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

// Stands in for the OffscreenCanvas raster: the drawing itself is button-icon.test.js's
// subject, so here it only has to prove which reading and trend were handed to it.
const fakePaintIcon = () => {
    const painted = []
    return { painted, paintIcon: request => (painted.push(request), { 16: `icon-${request.dewpointFahrenheit}` }) }
}

// stationId is passed by every case rather than defaulted, because the unconfigured case
// passes undefined and a default parameter would quietly substitute a station for it.
const run = async ({ fetch, stationId, storage = fakeStorage() }) => {
    const action = fakeAction()
    const cache = createCache({ now: Date.now, storage })
    const { paintIcon, painted } = fakePaintIcon()
    await updateButton({ action, cache, client: createNwsClient({ cache, fetch }), now: Date.now(), paintIcon, stationId })
    return { action, painted, storage }
}

test('the button draws the dewpoint, the pressure trend, and the wind from a live series', async () => {
    const { calls, fetch } = stubFetch({ 'https://aviationweather.gov': fixture('kewr-rising') })
    const { action, painted } = await run({ fetch, stationId: 'KEWR' })

    assert.deepEqual(painted, [{ dewpointFahrenheit: 58, direction: 'rising', wind: { state: 'calm' } }])
    assert.deepEqual(action.icons, [{ imageData: { 16: 'icon-58' } }])
    assert.equal(action.titles.at(-1), 'Newark Intl, NJ, US — 58F dewpoint (comfortable), pressure rising, wind calm')
    assert.ok(calls.length > 0)
})

// No recorded fixture carries a gust, so the newest record of one is given the wind this case is
// about. The rest of the series is left alone: the tendency still has to resolve from real data.
test('the tooltip names the wind and its gust, whether or not the icon has room to draw it', async () => {
    const series = fixture('kewr-rising')
    const gusting = [{ ...series[0], wdir: 320, wgst: 27, wspd: 18 }, ...series.slice(1)]
    const { fetch } = stubFetch({ 'https://aviationweather.gov': gusting })
    const { action, painted } = await run({ fetch, stationId: 'KEWR' })

    assert.match(action.titles.at(-1), /wind NW 18 kt G 27$/)
    assert.deepEqual(painted.at(-1).wind, { direction: 'NW', gustKnots: 27, knots: 18, state: 'measured' })
})

test('the button says so rather than showing a colour when no station is configured yet', async () => {
    const { calls, fetch } = stubFetch({})
    const { action, painted } = await run({ fetch, stationId: undefined })

    assert.deepEqual(painted, [], 'nothing has been measured, so there is no chip to paint')
    assert.deepEqual(action.icons, [{ path: { 48: 'icons/icon.svg' } }])
    assert.match(action.titles.at(-1), /no station configured yet/)
    assert.equal(calls.length, 0, 'an unconfigured button must not reach the network')
})

test('the button falls back to the plain icon when no reading exists at all', async () => {
    const fetch = async () => {
        throw new Error('offline')
    }
    const { action, painted } = await run({ fetch, stationId: 'KEWR' })

    assert.deepEqual(painted, [])
    assert.deepEqual(action.icons, [{ path: { 48: 'icons/icon.svg' } }])
    // resolveModel swallows the network error to try the cache, so what surfaces is the
    // cache's own emptiness. That is the honest report: offline with a cached series is not
    // a failure, and this case is only a failure because there was never a reading.
    assert.match(action.titles.at(-1), /no cached observations/, 'the title has to name the cause; nothing else can')
})

// The popup and the button share model.js and its cache, so the button's ten-minute refresh
// and a popup open inside that window cost one fetch between them rather than one each.
test('the button reads the cached series the popup left rather than fetching it again', async () => {
    const storage = fakeStorage({
        'forecast:KEWR': { value: { properties: {} }, writtenAt: Date.now() },
        'observations:KEWR': { value: fixture('kewr-rising'), writtenAt: Date.now() },
    })
    const { calls, fetch } = stubFetch({})
    const { painted } = await run({ fetch, stationId: 'KEWR', storage })

    assert.deepEqual(painted, [{ dewpointFahrenheit: 58, direction: 'rising', wind: { state: 'calm' } }])
    assert.deepEqual(calls, [], 'a warm cache must not be re-fetched')
})

// The button needs no thunder forecast, but it refreshes through the same pipeline the popup
// reads, so its refresh leaves the forecast cached too and the popup opens with a full strip
// instead of fetching one on every open.
test('the button refresh warms the forecast cache the popup will want', async () => {
    const { calls, fetch } = stubFetch({
        'https://api.weather.gov/gridpoints': { properties: {} },
        'https://api.weather.gov/points': { properties: { forecastGridData: 'https://api.weather.gov/gridpoints/OKX/32,42' } },
        'https://aviationweather.gov': fixture('kewr-rising'),
    })
    const { storage } = await run({ fetch, stationId: 'KEWR', storage: fakeStorage() })

    assert.ok(calls.some(url => url.startsWith('https://api.weather.gov/gridpoints')))
    assert.deepEqual(storage.records['forecast:KEWR'].value, { properties: {} })
})
