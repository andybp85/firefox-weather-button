import assert from 'node:assert/strict'
import { test } from 'node:test'
import { comfortBand } from '../src/comfort.js'

const label = dewpointFahrenheit => comfortBand(dewpointFahrenheit).label

test('comfortBand names every band the chart draws', () => {
    assert.equal(label(42), 'dry')
    assert.equal(label(52), 'pleasant')
    assert.equal(label(58), 'comfortable')
    assert.equal(label(63), 'sticky')
    assert.equal(label(68), 'uncomfortable')
    assert.equal(label(73), 'oppressive')
    assert.equal(label(80), 'miserable')
})

// The chart writes its bands as "50 - 55" then "56-60", so the boundaries are the cases
// that a transcription error lands on.
test('comfortBand puts each boundary degree in the band the chart prints it in', () => {
    assert.equal(label(49), 'dry')
    assert.equal(label(50), 'pleasant')
    assert.equal(label(55), 'pleasant')
    assert.equal(label(56), 'comfortable')
    assert.equal(label(60), 'comfortable')
    assert.equal(label(61), 'sticky')
    assert.equal(label(65), 'sticky')
    assert.equal(label(66), 'uncomfortable')
    assert.equal(label(70), 'uncomfortable')
    assert.equal(label(71), 'oppressive')
    assert.equal(label(75), 'oppressive')
    assert.equal(label(76), 'miserable')
})

// A subfreezing dewpoint is ordinary in winter and sits below every band the chart draws.
test('comfortBand reads a negative dewpoint as dry rather than falling off the chart', () => {
    assert.equal(label(-4), 'dry')
})

test('comfortBand carries a background and a foreground for every band', () => {
    for (const dewpointFahrenheit of [42, 52, 58, 63, 68, 73, 80]) {
        const band = comfortBand(dewpointFahrenheit)
        assert.match(band.background, /^#[0-9A-F]{6}$/)
        assert.match(band.foreground, /^#[0-9A-F]{6}$/)
    }
})
