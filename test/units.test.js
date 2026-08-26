import assert from 'node:assert/strict'
import { test } from 'node:test'
import { celsiusToFahrenheit, metresToFeet } from '../src/units.js'

test('celsiusToFahrenheit converts the freezing point', () => {
    assert.equal(celsiusToFahrenheit(0), 32)
})

test('celsiusToFahrenheit converts the KEWR fixture temperature', () => {
    assert.equal(Math.round(celsiusToFahrenheit(21.7)), 71)
})

test('celsiusToFahrenheit handles negatives', () => {
    assert.equal(celsiusToFahrenheit(-40), -40)
})

test('metresToFeet converts the KEWR fixture cloud base', () => {
    assert.equal(Math.round(metresToFeet(912.5)), 2994)
})
