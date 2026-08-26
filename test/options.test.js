import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateStation } from '../src/station.js'

const clientReturning = observations => ({
    fetchObservations: async () => {
        if (observations.length === 0) throw new Error('no observations for station XXXX')
        return observations
    },
})

test('validateStation accepts a station that reports', async () => {
    const client = clientReturning([{ name: 'Newark Intl, NJ, US' }])
    assert.deepEqual(await validateStation({ client, stationId: 'kewr' }), { name: 'Newark Intl, NJ, US', stationId: 'KEWR' })
})

test('validateStation upper-cases the station id', async () => {
    const client = clientReturning([{ name: 'Newark Intl, NJ, US' }])
    const { stationId } = await validateStation({ client, stationId: '  kewr  ' })
    assert.equal(stationId, 'KEWR')
})

test('validateStation rejects a station that reports nothing', async () => {
    await assert.rejects(() => validateStation({ client: clientReturning([]), stationId: 'XXXX' }), /XXXX/)
})
