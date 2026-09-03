import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { test } from 'node:test'
import { render, renderUnavailable } from '../src/popup.js'

const popupDocument = () => new JSDOM(readFileSync(new URL('../src/popup.html', import.meta.url), 'utf8')).window.document

// Pinned six minutes after the observation and 66 minutes after the tendency's own window
// close, so the two ages in the footer are distinguishable from each other — and so the
// footer exercises both of describeElapsed's units at once.
const now = Date.parse('2026-08-26T13:06:00.000Z')

const model = {
    observation: {
        cloudBaseFeet: 2994,
        cloudLayers: [{ baseFeet: 25000, cover: 'SCT' }],
        dewpointFahrenheit: 58,
        observedAt: '2026-08-26T13:00:00.000Z',
        pressureHpa: 1019.1,
        stationName: 'Newark Intl, NJ, US',
        temperatureFahrenheit: 71,
        visibility: '10+',
        wind: { bearingDegrees: 340, direction: 'NNW', knots: 7, state: 'measured' },
    },
    tendency: { direction: 'rising', hPa: 1.5, observedAt: '2026-08-26T12:00:00.000Z', provenance: 'reported', windowHours: 3 },
    thunder: [{ hour: '2026-08-26T13:00:00.000Z', percent: 25 }],
}

const rendered = (overrides = {}) => {
    const document = popupDocument()
    render({ document, model: { ...model, ...overrides }, now })
    return document
}

const observed = observation => ({ observation: { ...model.observation, ...observation } })

const textOf = ({ document, selector }) => document.querySelector(selector).textContent

test('render leads with the temperature as a bare degree reading', () => {
    assert.equal(textOf({ document: rendered(), selector: '#temperature' }), '71°')
})

test('render lists the cloud layers high to low with thousands separators', () => {
    const document = rendered(
        observed({
            cloudLayers: [
                { baseFeet: 25000, cover: 'BKN' },
                { baseFeet: 4500, cover: 'SCT' },
            ],
        }),
    )

    assert.equal(textOf({ document, selector: '#clouds' }), 'BKN 25,000 · SCT 4,500')
})

test('render reads a sky with no layers as clear', () => {
    assert.equal(textOf({ document: rendered(observed({ cloudLayers: [] })), selector: '#clouds' }), 'clear')
})

test('render drops the unit from a visibility nobody measured', () => {
    // AWC never sends a word here: it sends "10+" or a number and omits visib when unmeasured.
    // 'unreported' is manufactured by observation.js, and appending "mi" to it reads as a unit.
    assert.equal(textOf({ document: rendered(), selector: '#visibility' }), '10+ mi')
    assert.equal(textOf({ document: rendered(observed({ visibility: 'unreported' })), selector: '#visibility' }), 'unreported')
})

test('render puts the dewpoint on its comfort chip in the band colours', () => {
    const document = rendered()
    const chip = document.querySelector('#comfort')

    assert.equal(textOf({ document, selector: '#dewpoint' }), '58°')
    assert.equal(chip.textContent, 'comfortable')
    assert.equal(chip.style.getPropertyValue('--chip-background'), '#008000')
    assert.equal(chip.style.getPropertyValue('--chip-foreground'), '#FFFFFF')
})

test('render separates the cloud base reading from its unit', () => {
    const document = rendered()

    assert.equal(textOf({ document, selector: '#cloud-base' }), '2,994 ft')
    assert.equal(document.querySelector('#cloud-base .unit').textContent, 'ft')
})

test('render names where the wind comes from, not where it is going', () => {
    const document = rendered()

    assert.equal(textOf({ document, selector: '#wind-speed' }), '7 kt')
    assert.equal(textOf({ document, selector: '#wind-direction' }), 'from NNW')
})

test('render puts the gust on the direction line beside the source', () => {
    const document = rendered(observed({ wind: { bearingDegrees: 315, direction: 'NW', gustKnots: 27, knots: 18, state: 'measured' } }))

    assert.equal(textOf({ document, selector: '#wind-speed' }), '18 kt')
    assert.equal(textOf({ document, selector: '#wind-direction' }), 'from NW · G 27')
})

test('render calls a variable wind variable rather than giving it a source', () => {
    const document = rendered(observed({ wind: { direction: 'variable', knots: 3, state: 'measured' } }))

    assert.equal(textOf({ document, selector: '#wind-direction' }), 'variable')
})

test('render claims no heading for a measured wind whose station sent none', () => {
    // A speed with no wdir at all is measured air moving with no direction to name, which is
    // the same thing the calm line says — the design gives both the one wording.
    const document = rendered(observed({ wind: { knots: 6, state: 'measured' } }))

    assert.equal(textOf({ document, selector: '#wind-speed' }), '6 kt')
    assert.equal(textOf({ document, selector: '#wind-direction' }), 'no direction')
})

test('render distinguishes calm air from a wind nobody measured', () => {
    // Calm was measured and found still; an unreported wind was not measured at all, and
    // neither of them is "0 kt".
    const calm = rendered(observed({ wind: { state: 'calm' } }))
    const missing = rendered(observed({ wind: { state: 'unreported' } }))

    assert.equal(textOf({ document: calm, selector: '#wind-speed' }), 'calm')
    assert.equal(textOf({ document: calm, selector: '#wind-direction' }), 'no direction')
    assert.equal(textOf({ document: missing, selector: '#wind-speed' }), '—')
    assert.equal(textOf({ document: missing, selector: '#wind-direction' }), 'unreported')
})

test('render shows the pressure and its trend without repeating the unit', () => {
    const document = rendered()

    assert.equal(textOf({ document, selector: '#pressure' }), '1019.1')
    assert.equal(textOf({ document, selector: '#trend' }), '+1.5 / 3h')
})

test('render still shows the trend when the newest report carries no pressure', () => {
    // SPECI reports omit sea-level pressure and a SPECI can be the newest observation. The
    // trend comes from the series, not that one record, so it survives — never "undefined".
    const document = rendered(observed({ pressureHpa: undefined }))

    assert.equal(textOf({ document, selector: '#pressure' }), '—')
    assert.equal(textOf({ document, selector: '#trend' }), '+1.5 / 3h')
})

test('render dates the footer from the pinned instant and joins with a middle dot', () => {
    const document = rendered()

    assert.equal(textOf({ document, selector: '#age' }), 'Newark Intl, NJ, US · obs 6m ago')
    // 66 minutes is past describeElapsed's minute range, so the window's age rounds to hours.
    assert.equal(textOf({ document, selector: '#provenance' }), 'tendency: reported (3h), ended 1h ago')
})

test('render refuses to date the footer from a clock the caller never chose', () => {
    assert.throws(() => render({ document: popupDocument(), model }), /render requires now/)
})

test('render hides the thunder strip when the series is empty', () => {
    assert.equal(rendered({ thunder: [] }).querySelector('#thunder').hidden, true)
    assert.equal(rendered().querySelector('#thunder').hidden, false)
})

test('render labels each thunder bar with its hour and percentage', () => {
    const [bar] = rendered().querySelectorAll('.thunder-bar')

    assert.equal(bar.style.getPropertyValue('--percent'), '25')
    assert.match(bar.getAttribute('aria-label'), /25%$/)
})

test('renderUnavailable places every reading and states the reason in the footer', () => {
    // A user who has never successfully loaded data still sees why, rather than a blank popup.
    const document = popupDocument()
    renderUnavailable({ document, reason: 'no station configured yet' })

    assert.deepEqual(
        ['#dewpoint', '#cloud-base', '#wind-speed', '#pressure'].map(selector => textOf({ document, selector })),
        ['—', '—', '—', '—'],
    )
    assert.equal(document.querySelector('#comfort').hidden, true)
    assert.equal(textOf({ document, selector: '#age' }), 'no observation available — no station configured yet')
    assert.equal(textOf({ document, selector: '#provenance' }), 'tendency: unavailable')
    assert.equal(document.querySelector('#thunder').hidden, true)
})
