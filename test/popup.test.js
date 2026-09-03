import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { test } from 'node:test'
import { render, renderUnavailable } from '../src/popup.js'

const popupDocument = () => new JSDOM(readFileSync(new URL('../src/popup.html', import.meta.url), 'utf8')).window.document

// Pinned six minutes after the observation and 66 minutes after the tendency's own window
// close, so the two ages in the footer are distinguishable from each other.
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
        wind: { direction: 'NNW', knots: 7, state: 'measured' },
    },
    tendency: { direction: 'rising', hPa: 1.5, observedAt: '2026-08-26T12:00:00.000Z', provenance: 'reported', windowHours: 3 },
    thunder: [{ hour: '2026-08-26T13:00:00.000Z', percent: 25 }],
}

test('render shows the dewpoint', () => {
    const document = popupDocument()
    render({ document, model, now })
    assert.match(document.querySelector('#dewpoint').textContent, /58/)
})

test('render shows the pressure and its trend magnitude', () => {
    const document = popupDocument()
    render({ document, model, now })
    const pressure = document.querySelector('#pressure').textContent
    assert.match(pressure, /1019\.1/)
    assert.match(pressure, /1\.5/)
})

const windOf = ({ observation, ...rest }, wind) => ({ ...rest, observation: { ...observation, wind } })
const socks = document => document.querySelectorAll('.windsock polygon')

test('render gives the wind its own row, with the gust beside the sustained speed', () => {
    const document = popupDocument()
    render({ document, model: windOf(model, { direction: 'NW', gustKnots: 27, knots: 18, state: 'measured' }), now })
    assert.equal(document.querySelector('#wind').textContent, 'NW 18 kt G 27')
})

test('render names a variable wind rather than a bearing it does not have', () => {
    const document = popupDocument()
    render({ document, model: windOf(model, { direction: 'variable', knots: 3, state: 'measured' }), now })
    assert.equal(document.querySelector('#wind').textContent, 'variable 3 kt')
})

test('render writes calm rather than a zero speed, and still draws the sock at rest', () => {
    const document = popupDocument()
    render({ document, model: windOf(model, { state: 'calm' }), now })
    assert.equal(document.querySelector('#wind').textContent, 'calm')
    assert.ok(socks(document).length > 0, 'calm air is a reading, and a limp sock is how it reads')
})

// An unreported wind is not a calm one, and a sock at rest is exactly what calm looks like.
// Drawing one for a wind nobody measured would assert the reading the value refuses to make.
test('render draws no sock at all for a wind nobody measured', () => {
    const document = popupDocument()
    render({ document, model: windOf(model, { state: 'unreported' }), now })
    assert.equal(document.querySelector('#wind').textContent, 'unreported')
    assert.equal(socks(document).length, 0)
})

test('render flies a gust tick only when the wind is gusting', () => {
    const steady = popupDocument()
    const gusting = popupDocument()
    render({ document: steady, model: windOf(model, { knots: 18, state: 'measured' }), now })
    render({ document: gusting, model: windOf(model, { gustKnots: 27, knots: 18, state: 'measured' }), now })

    assert.equal(socks(gusting).length, socks(steady).length + 1)
})

// The ambient line is the accent-filled headline and was already three fields wide at 19rem.
// Wind moved out of it rather than growing it, so a gust cannot push the line into wrapping.
test('render keeps the wind out of the ambient line', () => {
    const document = popupDocument()
    render({ document, model, now })
    assert.doesNotMatch(document.querySelector('.ambient-primary').textContent, /kt/)
})

// The header writes the layers itself, from the same list the cloud plaque paints, so the two
// cannot disagree about what the station reported.
test('render writes the cloud layers high to low with thousands separators', () => {
    const document = popupDocument()
    const lowerDeck = { baseFeet: 4500, cover: 'BKN' }
    const twoLayers = { ...model, observation: { ...model.observation, cloudLayers: [...model.observation.cloudLayers, lowerDeck] } }

    render({ document, model: twoLayers, now })

    assert.equal(document.querySelector('.ambient-clouds').textContent, 'SCT 25,000 · BKN 4,500')
})

test('render calls a sky with no reported layers clear', () => {
    const document = popupDocument()

    render({ document, model: { ...model, observation: { ...model.observation, cloudLayers: [] } }, now })

    assert.equal(document.querySelector('.ambient-clouds').textContent, 'clear')
})

test('render shows the computed cloud base', () => {
    const document = popupDocument()
    render({ document, model, now })
    assert.match(document.querySelector('#cloud-base').textContent, /2994/)
})

test('render always states the tendency provenance', () => {
    const document = popupDocument()
    render({ document, model, now })
    assert.match(document.querySelector('#provenance').textContent, /reported/)
})

test('render states provenance for a computed tendency too', () => {
    const document = popupDocument()
    const computed = { ...model, tendency: { ...model.tendency, provenance: 'computed' } }
    render({ document, model: computed, now })
    assert.match(document.querySelector('#provenance').textContent, /computed/)
})

test('render always states the observation age', () => {
    const document = popupDocument()
    render({ document, model, now })
    assert.ok(document.querySelector('#age').textContent.length > 0)
})

test('render omits the thunder row rather than drawing an empty strip', () => {
    const document = popupDocument()
    render({ document, model: { ...model, thunder: [] }, now })
    assert.equal(document.querySelector('#thunder').hidden, true)
})

// Carried forward from Task 6: SPECI reports omit sea-level pressure, and a SPECI can be
// the newest observation. The trend still resolves from the series, so #pressure must keep
// showing it rather than going blank — it just must not print the literal string "undefined".
test('render omits the absolute pressure but keeps the trend when pressureHpa is absent', () => {
    const document = popupDocument()
    const speci = { ...model, observation: { ...model.observation, pressureHpa: undefined } }
    render({ document, model: speci, now })
    const pressure = document.querySelector('#pressure').textContent
    assert.doesNotMatch(pressure, /undefined/)
    assert.match(pressure, /1\.5/)
})

test('render pins the observation age to a fixed clock via the injected now', () => {
    const document = popupDocument()
    render({ document, model, now })
    assert.match(document.querySelector('#age').textContent, /6m ago/)
})

// renderUnavailable used to live only in popup-main.js, untested and hand-copying render()'s
// selector strings — a rename would break it silently at the exact moment it's meant to be
// the safety net. It's a second export of popup.js now, sharing SELECTORS with render().
test('renderUnavailable blanks the wind row and takes the sock down with it', () => {
    const document = popupDocument()
    render({ document, model, now })
    renderUnavailable({ document, reason: 'offline' })

    assert.equal(document.querySelector('#wind').textContent, '\u2014')
    assert.equal(socks(document).length, 0, 'a sock left flying would claim a wind the popup just said it has no reading for')
})

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
    render({ document, model: fractional, now })
    assert.match(document.querySelector('#pressure').textContent, /3h/)
    assert.match(document.querySelector('#provenance').textContent, /3h/)
    assert.doesNotMatch(document.querySelector('#pressure').textContent, /2\.98/)
    assert.doesNotMatch(document.querySelector('#provenance').textContent, /2\.98/)
})

test('render drops the unit rather than printing "unreported mi"', () => {
    const document = popupDocument()
    const noVisibility = { ...model, observation: { ...model.observation, visibility: 'unreported' } }
    render({ document, model: noVisibility, now })
    assert.doesNotMatch(document.querySelector('.ambient-primary').textContent, /unreported mi/)
})

// resolveTendency has always carried the tendency's own observedAt, and the popup dropped it:
// a reported value can describe a window that closed up to three hours before the newest
// observation (five, at the width nws.js fetches), so a stale trend rendered as a current one.
// The design deliberately does not de-tide the trend — disclosure of age and provenance is
// what it offers instead, so dropping this age broke the bargain rather than trimming a nicety.
test('render states when the tendency window closed, not only how long it was', () => {
    const document = popupDocument()
    render({ document, model, now })
    const provenance = document.querySelector('#provenance').textContent
    assert.match(provenance, /reported/)
    assert.match(provenance, /3h/)
    assert.match(provenance, /1h ago/)
})

test('render states the computed tendency window close too, from the tendency and not the observation', () => {
    const document = popupDocument()
    const computed = {
        ...model,
        tendency: { ...model.tendency, observedAt: '2026-08-26T09:00:00.000Z', provenance: 'computed' },
    }
    render({ document, model: computed, now })
    const provenance = document.querySelector('#provenance').textContent
    assert.match(provenance, /computed/)
    assert.match(provenance, /4h ago/)
    // The observation is six minutes old; reading the tendency's age off it would say so.
    assert.doesNotMatch(provenance, /6m ago/)
})

// Every field render writes is plain text in the markup popup.html already carries: amendment 2
// rules out a tooltip, a title attribute, or a <details> for disclosure this load-bearing.
test('render keeps the tendency age in the provenance text rather than an attribute', () => {
    const document = popupDocument()
    render({ document, model, now })
    const provenance = document.querySelector('#provenance')
    assert.equal(provenance.children.length, 0)
    assert.equal(provenance.getAttribute('title'), null)
})

// now used to default to Date.now() inside a module that is meant to be pure, and production
// omitted the argument — so the age the popup showed came from a clock no caller chose.
test('render requires now rather than reaching for the clock itself', () => {
    assert.throws(() => render({ document: popupDocument(), model }), /requires now/)
})
