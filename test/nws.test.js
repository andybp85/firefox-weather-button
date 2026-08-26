import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createNwsClient } from '../src/nws.js'

const recordingFetch = responses => {
    const calls = []
    const fetch = async url => {
        calls.push(url)
        return { json: async () => responses[calls.length - 1], ok: true, status: 200 }
    }
    return { calls, fetch }
}

const noopCache = () => {
    const entries = {}
    return {
        read: async ({ key }) => entries[key],
        write: async ({ key, value }) => {
            entries[key] = value
        },
    }
}

test('fetchObservations requests the AWC JSON endpoint for the station', async () => {
    const { calls, fetch } = recordingFetch([[{ slp: 1019.1 }]])
    const client = createNwsClient({ cache: noopCache(), fetch })
    await client.fetchObservations('KEWR')

    assert.ok(calls[0].startsWith('https://aviationweather.gov/api/data/metar'))
    assert.ok(calls[0].includes('ids=KEWR'))
    assert.ok(calls[0].includes('format=json'))
})

test('fetchObservations throws on the empty array AWC returns for a bad station', async () => {
    const { fetch } = recordingFetch([[]])
    const client = createNwsClient({ cache: noopCache(), fetch })
    await assert.rejects(() => client.fetchObservations('XXXX'), /no observations/)
})

test('resolveGridpointUrl resolves through the points endpoint once, then caches', async () => {
    const point = { properties: { forecastGridData: 'https://api.weather.gov/gridpoints/OKX/32,42' } }
    const { calls, fetch } = recordingFetch([point, point])
    const client = createNwsClient({ cache: noopCache(), fetch })

    const first = await client.resolveGridpointUrl({ lat: 40.6828, lon: -74.1692 })
    const second = await client.resolveGridpointUrl({ lat: 40.6828, lon: -74.1692 })

    assert.equal(first, second)
    assert.equal(calls.length, 1, 'the station never moves, so /points must not be re-resolved')
})

test('resolveGridpointUrl throws when the points response has no gridpoint URL', async () => {
    const client = createNwsClient({
        cache: noopCache(),
        fetch: async () => ({ json: async () => ({ properties: {} }), ok: true, status: 200 }),
    })
    await assert.rejects(() => client.resolveGridpointUrl({ lat: 40.68, lon: -74.17 }), /forecastGridData/)
})

test('resolveGridpointUrl throws on a points response with no properties', async () => {
    const client = createNwsClient({ cache: noopCache(), fetch: async () => ({ json: async () => ({}), ok: true, status: 200 }) })
    await assert.rejects(() => client.resolveGridpointUrl({ lat: 40.68, lon: -74.17 }), /forecastGridData/)
})

test('a malformed points response is not cached', async () => {
    // The gridpoint entry has no TTL, so caching a bad value would never expire.
    const cache = noopCache()
    const client = createNwsClient({ cache, fetch: async () => ({ json: async () => ({ properties: {} }), ok: true, status: 200 }) })
    await assert.rejects(() => client.resolveGridpointUrl({ lat: 40.68, lon: -74.17 }))
    assert.equal(await cache.read({ key: 'gridpoint:40.68,-74.17' }), undefined)
})

test('a non-ok response throws rather than yielding undefined', async () => {
    const client = createNwsClient({
        cache: noopCache(),
        fetch: async () => ({ json: async () => ({}), ok: false, status: 503 }),
    })
    await assert.rejects(() => client.fetchObservations('KEWR'), /503/)
})
