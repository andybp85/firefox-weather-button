import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { test } from 'node:test'
import { render } from '../src/popup.js'

const popupDocument = () => new JSDOM(readFileSync(new URL('../src/popup.html', import.meta.url), 'utf8')).window.document

const model = {
    observation: {
        cloudBaseFeet: 2994,
        clouds: 'SCT 25000 ft',
        dewpointFahrenheit: 58,
        observedAt: '2026-08-26T13:00:00.000Z',
        pressureHpa: 1019.1,
        stationName: 'Newark Intl, NJ, US',
        temperatureFahrenheit: 71,
        visibility: '10+',
        wind: 'NNW 7 kt',
    },
    tendency: { direction: 'rising', hPa: 1.5, observedAt: '2026-08-26T12:00:00.000Z', provenance: 'reported', windowHours: 3 },
    thunder: [{ hour: '2026-08-26T13:00:00.000Z', percent: 25 }],
}

test('render shows the dewpoint', () => {
    const document = popupDocument()
    render({ document, model })
    assert.match(document.querySelector('#dewpoint').textContent, /58/)
})

test('render shows the pressure and its trend magnitude', () => {
    const document = popupDocument()
    render({ document, model })
    const pressure = document.querySelector('#pressure').textContent
    assert.match(pressure, /1019\.1/)
    assert.match(pressure, /1\.5/)
})

test('render shows the computed cloud base', () => {
    const document = popupDocument()
    render({ document, model })
    assert.match(document.querySelector('#cloud-base').textContent, /2994/)
})

test('render always states the tendency provenance', () => {
    const document = popupDocument()
    render({ document, model })
    assert.match(document.querySelector('#provenance').textContent, /reported/)
})

test('render states provenance for a computed tendency too', () => {
    const document = popupDocument()
    const computed = { ...model, tendency: { ...model.tendency, provenance: 'computed' } }
    render({ document, model: computed })
    assert.match(document.querySelector('#provenance').textContent, /computed/)
})

test('render always states the observation age', () => {
    const document = popupDocument()
    render({ document, model })
    assert.ok(document.querySelector('#age').textContent.length > 0)
})

test('render omits the thunder row rather than drawing an empty strip', () => {
    const document = popupDocument()
    render({ document, model: { ...model, thunder: [] } })
    assert.equal(document.querySelector('#thunder').hidden, true)
})

// Carried forward from Task 6: SPECI reports omit sea-level pressure, and a SPECI can be
// the newest observation. The trend still resolves from the series, so #pressure must keep
// showing it rather than going blank — it just must not print the literal string "undefined".
test('render omits the absolute pressure but keeps the trend when pressureHpa is absent', () => {
    const document = popupDocument()
    const speci = { ...model, observation: { ...model.observation, pressureHpa: undefined } }
    render({ document, model: speci })
    const pressure = document.querySelector('#pressure').textContent
    assert.doesNotMatch(pressure, /undefined/)
    assert.match(pressure, /1\.5/)
})

test('render pins the observation age to a fixed clock via the injected now', () => {
    const document = popupDocument()
    const now = Date.parse('2026-08-26T13:06:00.000Z')
    render({ document, model, now })
    assert.match(document.querySelector('#age').textContent, /6m ago/)
})
