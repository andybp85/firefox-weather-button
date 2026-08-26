import assert from 'node:assert/strict'
import { test } from 'node:test'
import { lclMetres } from '../src/lcl.js'

test('lclMetres computes the KEWR fixture cloud base', () => {
    // temp 21.7C, dewpoint 14.4C -> 7.3C spread -> 125 * 7.3 = 912.5 m.
    // Asserted with a tolerance rather than rounded: 21.7 - 14.4 is
    // 7.299999999999999 in IEEE 754, so the product is 912.4999999999999
    // and Math.round would give 912, not the 913 exact arithmetic implies.
    assert.ok(Math.abs(lclMetres({ dewpointCelsius: 14.4, temperatureCelsius: 21.7 }) - 912.5) < 1e-9)
})

test('lclMetres is zero at saturation', () => {
    assert.equal(lclMetres({ dewpointCelsius: 14.4, temperatureCelsius: 14.4 }), 0)
})

test('lclMetres rises with a wider spread', () => {
    const humid = lclMetres({ dewpointCelsius: 20, temperatureCelsius: 22 })
    const dry = lclMetres({ dewpointCelsius: 5, temperatureCelsius: 22 })
    assert.ok(dry > humid)
})
