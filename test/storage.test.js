import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createCache } from '../src/storage.js'

const fakeStorage = () => {
    const entries = {}
    return {
        get: async key => (key in entries ? { [key]: entries[key] } : {}),
        set: async record => Object.assign(entries, record),
    }
}

test('createCache returns a value written within its TTL', async () => {
    const cache = createCache({ now: () => 1_000_000, storage: fakeStorage() })
    await cache.write({ key: 'observations', value: { slp: 1019.1 } })
    assert.deepEqual(await cache.read({ key: 'observations', ttlMinutes: 10 }), { slp: 1019.1 })
})

test('createCache expires a value past its TTL', async () => {
    const storage = fakeStorage()
    const written = createCache({ now: () => 0, storage })
    await written.write({ key: 'observations', value: { slp: 1019.1 } })

    const elevenMinutesLater = createCache({ now: () => 11 * 60_000, storage })
    assert.equal(await elevenMinutesLater.read({ key: 'observations', ttlMinutes: 10 }), undefined)
})

test('createCache never expires an entry read without a TTL', async () => {
    const storage = fakeStorage()
    const written = createCache({ now: () => 0, storage })
    await written.write({ key: 'gridpoint', value: 'https://api.weather.gov/gridpoints/OKX/32,42' })

    const muchLater = createCache({ now: () => 400 * 24 * 60 * 60_000, storage })
    assert.equal(await muchLater.read({ key: 'gridpoint' }), 'https://api.weather.gov/gridpoints/OKX/32,42')
})

test('createCache returns undefined for a key never written', async () => {
    const cache = createCache({ now: () => 0, storage: fakeStorage() })
    assert.equal(await cache.read({ key: 'absent', ttlMinutes: 10 }), undefined)
})
