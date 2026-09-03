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

// The needle is read back as the angle it stands at rather than as its endpoint: an endpoint
// assertion is the design's own arithmetic restated, and would pass whatever popup.js computed.
const angleOf = ({ document, selector }) => {
    const needle = document.querySelector(selector)
    const run = Number(needle.getAttribute('x2')) - Number(needle.getAttribute('x1'))
    const rise = Number(needle.getAttribute('y1')) - Number(needle.getAttribute('y2'))
    return Math.round((Math.atan2(rise, run) * 180) / Math.PI)
}

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

test('render stands the needle upright at the middle of the barometer scale', () => {
    // The dial runs 980 to 1050, so 1015 is straight up: 90 degrees off the horizontal.
    const document = rendered(observed({ pressureHpa: 1015 }))

    assert.equal(angleOf({ document, selector: '#barometer line' }), 90)
})

test('render swings the needle to the ends of the scale', () => {
    assert.equal(angleOf({ document: rendered(observed({ pressureHpa: 980 })), selector: '#barometer line' }), 180)
    assert.equal(angleOf({ document: rendered(observed({ pressureHpa: 1050 })), selector: '#barometer line' }), 0)
})

test('render clamps a reading off the end of the scale rather than swinging past it', () => {
    // A landfalling hurricane reads under 950. A needle that keeps going wraps around the dial
    // and reads as a high, which is the most dangerous thing this plaque could say.
    assert.equal(angleOf({ document: rendered(observed({ pressureHpa: 940 })), selector: '#barometer line' }), 180)
})

test('render draws no needle and no hub when the newest report carries no pressure', () => {
    // A hub with no needle reads as a broken instrument rather than as a missing reading.
    const document = rendered(observed({ pressureHpa: undefined }))

    assert.equal(document.querySelector('#barometer').children.length, 0)
})

test('render points the trend glyph the way the tendency does', () => {
    const rising = rendered().querySelector('#trend-glyph polygon')
    const falling = rendered({ tendency: { ...model.tendency, direction: 'falling' } }).querySelector('#trend-glyph polygon')

    assert.equal(rising.getAttribute('points'), '5,1 9.5,8.5 0.5,8.5')
    assert.equal(falling.getAttribute('points'), '5,8.5 9.5,1 0.5,1')
})

test('render refuses a trend it has no glyph for', () => {
    assert.throws(() => rendered({ tendency: { ...model.tendency, direction: 'sideways' } }), /unknown pressure trend: sideways/)
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

test('renderUnavailable strikes the instruments a successful render left standing', () => {
    // The popup renders, a later refresh fails, and both run against the same document: a needle
    // and a trend glyph that survive that are the last good reading dressed as the current one.
    const document = rendered()
    renderUnavailable({ document, reason: 'the network went away' })

    assert.equal(document.querySelector('#barometer').children.length, 0)
    assert.equal(document.querySelector('#trend-glyph').children.length, 0)
    // The sky and the wind plot go with them: shapes left standing are a reading the popup no
    // longer has.
    assert.equal(document.querySelector('#sky').children.length, 0)
    assert.equal(document.querySelector('#wind-plot').children.length, 0)
})

test('render dashes the computed base across the sky at its own height', () => {
    const base = rendered(observed({ cloudBaseFeet: 2990 })).querySelector('#sky line')

    assert.equal(Math.round(Number(base.getAttribute('y1')) * 100) / 100, 93.37)
    assert.deepEqual([base.getAttribute('x1'), base.getAttribute('x2')], ['0', '136'])
})

test('render draws the computed base on a clear sky too', () => {
    // It is the plaque's own reading. Drawing it only when a layer was reported would hide it
    // exactly when it is the only cloud information there is.
    const document = rendered(observed({ cloudLayers: [] }))

    assert.equal(document.querySelectorAll('#sky line').length, 1)
    assert.equal(document.querySelectorAll('#sky ellipse').length, 0)
})

test('render paints the near layers over the far ones', () => {
    // The list is high to low and SVG paints in document order, so the last layer written is
    // the lowest — which is what a sky looks like from underneath.
    const document = rendered(
        observed({
            cloudLayers: [
                { baseFeet: 25000, cover: 'BKN' },
                { baseFeet: 4500, cover: 'SCT' },
            ],
        }),
    )
    const heights = [...document.querySelectorAll('#sky ellipse')].map(ellipse => Math.round(Number(ellipse.getAttribute('cy'))))

    assert.deepEqual(heights, [72, 72, 93, 93])
})

test('render paints the computed base over the layers rather than under them', () => {
    // An overcast lid runs from its own height down to the foot, so a base drawn under the
    // layers would be buried by one — and the base is the reading the plaque is named for.
    const document = rendered(observed({ cloudBaseFeet: 400, cloudLayers: [{ baseFeet: 400, cover: 'OVC' }] }))

    assert.equal(document.querySelector('#sky').lastElementChild.getAttribute('class'), 'computed-base')
})

test('render colours a high layer a step further away than a low one', () => {
    const document = rendered(
        observed({
            cloudLayers: [
                { baseFeet: 12000, cover: 'FEW' },
                { baseFeet: 4500, cover: 'FEW' },
            ],
        }),
    )
    const [high, low] = [...document.querySelectorAll('#sky ellipse')].map(ellipse => ellipse.getAttribute('class'))

    assert.deepEqual({ high, low }, { high: 'layer-far', low: 'layer-near' })
})

const plotOf = ({ document, selector }) => [...document.querySelectorAll(`#wind-plot ${selector}`)]

const coordinatesOf = element =>
    Object.fromEntries(['x1', 'x2', 'y1', 'y2'].map(name => [name, Math.round(Number(element.getAttribute(name)) * 100) / 100]))

test('render wires the plot shaft to point at where the wind comes from', () => {
    // The station-model convention, and the opposite of the toolbar button's dart: a north wind
    // puts the shaft above the station. Read as all four coordinates because the wiring this
    // checks is windBarbs' from/to reaching the right pair of attributes.
    const [shaft] = plotOf({
        document: rendered(observed({ wind: { bearingDegrees: 0, direction: 'N', knots: 20, state: 'measured' } })),
        selector: 'line',
    })

    assert.deepEqual(coordinatesOf(shaft), { x1: 44, x2: 44, y1: 40.4, y2: 14 })
})

test('render draws the station-model calm symbol rather than a wind of zero speed', () => {
    // Two rings, no shaft. A shaft of no length at some arbitrary heading is not what calm
    // looks like, and calm has no heading to draw one at.
    const document = rendered(observed({ wind: { state: 'calm' } }))

    assert.equal(plotOf({ document, selector: 'circle' }).length, 2)
    assert.equal(plotOf({ document, selector: 'line' }).length, 0)
})

test('render strikes the plot a measured wind left standing when the next one is unreported', () => {
    // The bare compass ring in the markup is what "nobody measured this" looks like. A plot
    // left standing across a refresh is the last good wind dressed as the current one.
    const document = rendered()
    render({ document, model: { ...model, ...observed({ wind: { state: 'unreported' } }) }, now })

    assert.equal(document.querySelector('#wind-plot').children.length, 0)
})

test('render draws no shaft when the wind has a speed but no bearing', () => {
    const document = rendered(observed({ wind: { direction: 'variable', knots: 20, state: 'measured' } }))

    assert.equal(plotOf({ document, selector: 'line' }).length, 0)
    assert.equal(plotOf({ document, selector: 'polyline' }).length, 2)
})

test('render puts the gust marks behind the sustained ones, each in its own force colour', () => {
    // WNW 22 gusting 31: three force-7 barbs behind, two force-6 barbs in front. SVG paints in
    // document order, so the gust marks written first are what shows past the sustained ones.
    const document = rendered(observed({ wind: { bearingDegrees: 292.5, direction: 'WNW', gustKnots: 31, knots: 22, state: 'measured' } }))
    const marks = plotOf({ document, selector: 'polyline' })

    assert.deepEqual(
        marks.map(mark => mark.getAttribute('class')),
        ['mark mark-gust', 'mark mark-gust', 'mark mark-gust', 'mark mark-sustained', 'mark mark-sustained'],
    )
    assert.equal(marks[0].getAttribute('stroke'), 'light-dark(#6f6d03, #f5f69c)')
    assert.equal(marks.at(-1).getAttribute('stroke'), 'light-dark(#5e7216, #dcf59d)')
})

test('render fills a pennant rather than stroking it', () => {
    const [pennant] = plotOf({
        document: rendered(observed({ wind: { bearingDegrees: 180, direction: 'S', knots: 55, state: 'measured' } })),
        selector: 'polygon',
    })

    assert.equal(pennant.getAttribute('points').split(' ').length, 3)
    assert.equal(pennant.getAttribute('fill'), 'light-dark(#a65324, #f69c6e)')
})

test('render colours the speed by the sustained force and the gust by its own', () => {
    const document = rendered(observed({ wind: { bearingDegrees: 270, direction: 'W', gustKnots: 32, knots: 18, state: 'measured' } }))

    assert.equal(document.querySelector('#wind-speed').style.getPropertyValue('--wind-colour'), 'light-dark(#5a7203, #c8f640)')
    assert.equal(document.querySelector('#wind-direction .gust').style.getPropertyValue('--wind-colour'), 'light-dark(#6f6d03, #f5f69c)')
})

test('render reads calm in the calm force colour rather than in the plaque ink', () => {
    const document = rendered(observed({ wind: { state: 'calm' } }))

    assert.equal(document.querySelector('#wind-speed').style.getPropertyValue('--wind-colour'), 'light-dark(#056eb2, #129bf7)')
})

test('render drops the force colour from a speed nobody measured', () => {
    // A colour a successful render left on the speed would paint the placeholder in the last
    // good wind's force.
    const document = rendered()
    render({ document, model: { ...model, ...observed({ wind: { state: 'unreported' } }) }, now })

    assert.equal(document.querySelector('#wind-speed').style.getPropertyValue('--wind-colour'), '')
})

test('render mutes a direction line that names no heading', () => {
    // 'variable', 'no direction' and 'unreported' are the absence of a heading rather than a
    // heading of their own. Re-rendered onto one that names a point, the line has to come back.
    const document = rendered(observed({ wind: { direction: 'variable', knots: 3, state: 'measured' } }))
    const line = document.querySelector('#wind-direction')

    assert.equal(line.classList.contains('no-heading'), true)

    render({ document, model, now })
    assert.equal(line.classList.contains('no-heading'), false)
})
