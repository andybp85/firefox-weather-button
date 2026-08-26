import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { test } from 'node:test'
import { render, renderUnavailable } from '../src/popup.js'

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

// renderUnavailable used to live only in popup-main.js, untested and hand-copying render()'s
// selector strings — a rename would break it silently at the exact moment it's meant to be
// the safety net. It's a second export of popup.js now, sharing SELECTORS with render().
test('renderUnavailable still states the footer, with the reason in the age line', () => {
    const document = popupDocument()
    renderUnavailable({ document, reason: 'no station configured yet' })
    assert.match(document.querySelector('#age').textContent, /no station configured yet/)
    assert.match(document.querySelector('#provenance').textContent, /unavailable/)
    assert.equal(document.querySelector('#thunder').hidden, true)
})

test('renderUnavailable never prints the literal string "undefined" in any field it writes', () => {
    const document = popupDocument()
    renderUnavailable({ document, reason: 'simulated network failure' })
    for (const selector of ['#dewpoint', '#pressure', '#cloud-base', '#age', '#provenance'])
        assert.doesNotMatch(document.querySelector(selector).textContent, /undefined/)
})

// windowHours is interpolated straight into two lines of UI text; resolveTendency's computed
// path can produce a value like 2.98 (the observation series rarely lands exactly on an hour
// boundary), and that decimal has no place in a display string meant to read as "3h".
test('render rounds a fractional windowHours for display', () => {
    const document = popupDocument()
    const fractional = { ...model, tendency: { ...model.tendency, provenance: 'computed', windowHours: 2.98 } }
    render({ document, model: fractional })
    assert.match(document.querySelector('#pressure').textContent, /3h/)
    assert.match(document.querySelector('#provenance').textContent, /3h/)
    assert.doesNotMatch(document.querySelector('#pressure').textContent, /2\.98/)
    assert.doesNotMatch(document.querySelector('#provenance').textContent, /2\.98/)
})

test('render drops the unit rather than printing "unreported mi"', () => {
    const document = popupDocument()
    const noVisibility = { ...model, observation: { ...model.observation, visibility: 'unreported' } }
    render({ document, model: noVisibility })
    assert.doesNotMatch(document.querySelector('.ambient-primary').textContent, /unreported mi/)
})
