import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { toViewModel } from '../src/observation.js'

const fixture = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url)))

test('toViewModel converts temperature and dewpoint to Fahrenheit', () => {
    const view = toViewModel({ dewp: 14.4, name: 'Newark Intl, NJ, US', reportTime: '2026-08-26T13:00:00.000Z', slp: 1019.1, temp: 21.7 })
    assert.equal(view.temperatureFahrenheit, 71)
    assert.equal(view.dewpointFahrenheit, 58)
})

test('toViewModel computes cloud base in feet from the spread', () => {
    const view = toViewModel({ dewp: 14.4, reportTime: '2026-08-26T13:00:00.000Z', temp: 21.7 })
    // 125 * 7.3 = 912.5 m = 2994 ft
    assert.equal(view.cloudBaseFeet, 2994)
})

test('toViewModel preserves the visibility string verbatim', () => {
    // AWC reports unlimited visibility as the string '10+', not a number.
    const view = toViewModel({ dewp: 14.4, reportTime: '2026-08-26T13:00:00.000Z', temp: 21.7, visib: '10+' })
    assert.equal(view.visibility, '10+')
})

test('toViewModel describes calm wind rather than printing a zero', () => {
    const view = toViewModel({ dewp: 14.4, reportTime: '2026-08-26T13:00:00.000Z', temp: 21.7, wdir: 0, wspd: 0 })
    assert.equal(view.wind, 'calm')
})

test('toViewModel names a cardinal direction for the wind', () => {
    // 350 deg is 10 deg from due north: N spans 348.75-11.25, so this is N, not NNW.
    const view = toViewModel({ dewp: 14.4, reportTime: '2026-08-26T13:00:00.000Z', temp: 21.7, wdir: 350, wspd: 7 })
    assert.equal(view.wind, 'N 7 kt')
})

test('toViewModel rounds a mid-sector bearing to the nearest point', () => {
    // 340 deg sits inside NNW's 326.25-348.75 span.
    const view = toViewModel({ dewp: 14.4, reportTime: '2026-08-26T13:00:00.000Z', temp: 21.7, wdir: 340, wspd: 7 })
    assert.equal(view.wind, 'NNW 7 kt')
})

test('toViewModel describes an empty cloud layer list as clear', () => {
    const view = toViewModel({ clouds: [], dewp: 14.4, reportTime: '2026-08-26T13:00:00.000Z', temp: 21.7 })
    assert.equal(view.clouds, 'clear')
})

test('toViewModel renders the newest fixture observation', () => {
    // KEWR at 2026-08-26T14:00Z: 23.3C / 14.4C dewpoint, calm, three cloud layers.
    assert.deepEqual(toViewModel(fixture('kewr-rising')[0]), {
        cloudBaseFeet: 3650,
        clouds: 'FEW 7000 ft, FEW 20000 ft, BKN 25000 ft',
        dewpointFahrenheit: 58,
        observedAt: '2026-08-26T14:00:00.000Z',
        pressureHpa: 1018.9,
        stationName: 'Newark Intl, NJ, US',
        temperatureFahrenheit: 74,
        visibility: '10+',
        wind: 'calm',
    })
})
