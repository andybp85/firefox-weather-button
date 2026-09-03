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

test('toViewModel throws when the observation has no temperature', () => {
    assert.throws(() => toViewModel({ dewp: 14.4, reportTime: '2026-08-26T13:00:00.000Z' }), /temperature or dewpoint/)
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

// wind.test.js owns the decoding matrix (absent versus calm, VRB, gusts). What belongs here is
// that toViewModel hands the record over and carries the value out whole, rather than a sentence.
test('toViewModel carries the decoded wind value rather than a description of it', () => {
    const view = toViewModel({ dewp: 14.4, reportTime: '2026-08-26T13:00:00.000Z', temp: 21.7, wdir: 320, wgst: 27, wspd: 18 })
    assert.deepEqual(view.wind, { bearingDegrees: 320, direction: 'NW', gustKnots: 27, knots: 18, state: 'measured' })
})

test('toViewModel describes an empty cloud layer list as clear', () => {
    const view = toViewModel({ clouds: [], dewp: 14.4, reportTime: '2026-08-26T13:00:00.000Z', temp: 21.7 })
    assert.equal(view.clouds, 'clear')
})

test('toViewModel renders a cloud layer that reports no base', () => {
    // A clear sky is reported as a cover with no base; "CLR undefined ft" is not a cloud report.
    const view = toViewModel({ clouds: [{ cover: 'CLR' }], dewp: 14.4, reportTime: '2026-08-26T13:00:00.000Z', temp: 21.7 })
    assert.equal(view.clouds, 'CLR')
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
        wind: { state: 'calm' },
    })
})

test('toViewModel leaves pressure undefined when the report omits it', () => {
    // SPECI reports are issued off-cycle and carry altim rather than slp.
    const speci = fixture('kord-falling').find(o => o.metarType === 'SPECI')
    assert.equal(toViewModel(speci).pressureHpa, undefined)
})

// The station id is always present and identifies the station; 'unknown station' identifies
// nothing. station.js already falls back this way when AWC omits the name.
test('toViewModel falls back to the station id when the record carries no name', () => {
    const view = toViewModel({ dewp: 14.4, icaoId: 'KEWR', reportTime: '2026-08-26T13:00:00.000Z', temp: 21.7 })
    assert.equal(view.stationName, 'KEWR')
})
