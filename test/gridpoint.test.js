import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { durationHours, thunderSeries } from '../src/gridpoint.js'

const fixture = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url)))

test('durationHours parses plain hour durations', () => {
    assert.equal(durationHours('PT1H'), 1)
    assert.equal(durationHours('PT12H'), 12)
})

test('durationHours parses a duration carrying a day component', () => {
    assert.equal(durationHours('P1DT3H'), 27)
})

test('durationHours parses a bare day duration', () => {
    assert.equal(durationHours('P1D'), 24)
})

test('durationHours throws on an unsupported duration', () => {
    assert.throws(() => durationHours('PT30M'), /unsupported/)
})

test('durationHours throws on a duration with no components', () => {
    assert.throws(() => durationHours('P'), /unsupported/)
})

test('thunderSeries expands variable-length blocks into one entry per hour', () => {
    const series = thunderSeries({ gridpoint: fixture('tbw-gridpoint'), hours: 12 })
    assert.equal(series.length, 12)
    assert.equal(series[0].hour, '2026-08-26T01:00:00.000Z')
    // TBW opens with PT2H=0, then PT1H blocks of 8, 2, 3, then a PT6H run of 0.
    assert.deepEqual(
        series.map(entry => entry.percent),
        [0, 0, 8, 2, 3, 0, 0, 0, 0, 0, 0, 0],
    )
})

test('thunderSeries expands a P1DT3H block across all 27 of its hours', () => {
    const series = thunderSeries({ gridpoint: fixture('okx-gridpoint'), hours: 27 })
    assert.equal(series.length, 27)
    assert.equal(series[0].hour, '2026-08-26T00:00:00.000Z')
    assert.ok(
        series.every(entry => entry.percent === 0),
        'all 27 hours come from the single leading block',
    )
})

test('thunderSeries starts the following block at the right hour', () => {
    // The 28th entry is the first hour after the 27-hour block, and carries the next value.
    const series = thunderSeries({ gridpoint: fixture('okx-gridpoint'), hours: 28 })
    assert.deepEqual(series[27], { hour: '2026-08-27T03:00:00.000Z', percent: 1 })
})

test('thunderSeries returns empty when the element is absent', () => {
    assert.deepEqual(thunderSeries({ gridpoint: { properties: {} }, hours: 12 }), [])
})
