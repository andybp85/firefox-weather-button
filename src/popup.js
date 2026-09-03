import { beaufortColour, beaufortForce } from './beaufort.js'
import { cloudSky } from './cloud-sky.js'
import { comfortBand } from './comfort.js'
import { windBarbs } from './wind-barbs.js'

const HOUR_FORMAT = new Intl.DateTimeFormat(undefined, { hour: 'numeric' })
const MILLISECONDS_PER_MINUTE = 60_000
const PLACEHOLDER = '—'
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const WHOLE_FEET_FORMAT = new Intl.NumberFormat()

// The one place every element id popup.html carries is spelled out — render() and
// renderUnavailable() both write through this, rather than each holding its own copy of the
// selector strings, so a rename can't silently desync the two.
const SELECTORS = {
    age: '#age',
    barometer: '#barometer',
    cloudBase: '#cloud-base',
    clouds: '#clouds',
    comfort: '#comfort',
    dewpoint: '#dewpoint',
    pressure: '#pressure',
    provenance: '#provenance',
    sky: '#sky',
    temperature: '#temperature',
    thunder: '#thunder',
    thunderBars: '.thunder-bars',
    trend: '#trend',
    trendGlyph: '#trend-glyph',
    visibility: '#visibility',
    windDirection: '#wind-direction',
    windPlot: '#wind-plot',
    windSpeed: '#wind-speed',
}

const write = ({ document, selector, text }) => {
    document.querySelector(selector).textContent = text
}

// Every mark the three plots draw is one namespaced element with a handful of attributes, so
// this is the whole of their DOM vocabulary: the geometry modules say what to draw, this says
// how one of them becomes an element. createElement would build an HTML element of the same
// name, which lays out as nothing inside an <svg>.
const buildSvg = ({ attributes, document, name }) => {
    const element = document.createElementNS(SVG_NAMESPACE, name)
    for (const [attribute, value] of Object.entries(attributes)) element.setAttribute(attribute, value)
    return element
}

const buildUnit = ({ document, unit }) => {
    const span = document.createElement('span')
    span.className = 'unit'
    span.textContent = unit
    return span
}

// A reading and its unit are one line in two type sizes, so the unit is its own element. It is
// written rather than left in the markup because 'calm' and the placeholder carry no unit.
const writeReading = ({ document, selector, text, unit }) => {
    const element = document.querySelector(selector)
    element.replaceChildren(...(unit === undefined ? [text] : [`${text} `, buildUnit({ document, unit })]))
}

const describeElapsed = ({ now, observedAt }) => {
    const minutes = Math.round((now - Date.parse(observedAt)) / MILLISECONDS_PER_MINUTE)
    if (minutes < 60) return `${minutes}m ago`
    return `${Math.round(minutes / 60)}h ago`
}

// A reported or computed tendency already carries its sign for a fall (e.g. -1.2); only the
// positive case is missing one. Steady is exactly 0 and prints bare either way.
const describeHpaDelta = hPa => (hPa > 0 ? `+${hPa}` : `${hPa}`)

// windowHours is a display concern, not a domain one: resolveTendency's computed path rarely
// lands on an exact hour boundary (e.g. 2.98), and that decimal has no place in text meant to
// read as "3h" — round here rather than adding a defensive branch to tendency.js for it.
const describeWindowHours = tendency => Math.round(tendency.windowHours)

// No arrow in the words: the glyph beside them is the direction, drawn as a shape so it lands
// the same weight at every zoom level a font would have hinted differently.
const describeTrend = tendency => `${describeHpaDelta(tendency.hPa)} / ${describeWindowHours(tendency)}h`

// AWC never sends a word here: it sends "10+" or a number, and omits visib when unmeasured.
// 'unreported' is manufactured by observation.js's toViewModel for that omission (the coupling
// is flagged there too). Appending "mi" to it reads as a bogus unit, so the unit is dropped.
const describeVisibility = visibility => (visibility === 'unreported' ? visibility : `${visibility} mi`)

// The header's own wording of the layers, built from the same list the cloud plaque paints, so
// the sentence and the picture can never disagree about what the station reported.
const describeCloudLayers = cloudLayers =>
    cloudLayers.length === 0
        ? 'clear'
        : cloudLayers.map(({ baseFeet, cover }) => `${cover} ${WHOLE_FEET_FORMAT.format(baseFeet)}`).join(' · ')

// The tendency's window can close well before the newest observation: a reported value comes
// from the 3-hourly synoptic METAR, which nws.js's 5-hour fetch can trail by more than the
// window is long. The design deliberately does not correct the trend for the semidiurnal tide;
// disclosing when the window actually closed is what it offers in place of that correction, so
// the age belongs beside the provenance rather than being inferred from the observation's.
const describeProvenance = ({ now, tendency }) =>
    `tendency: ${tendency.provenance} (${describeWindowHours(tendency)}h), ended ${describeElapsed({ now, observedAt: tendency.observedAt })}`

// Whether the direction line names a point on the compass. Calm air and a measured wind whose
// station sent no wdir read alike: there is no heading to name, and the plot says the same thing
// by laying its marks out with no shaft. toWind names a VRB report 'variable', which is a state
// of the wind rather than a place — 'from variable' would read as one.
const namesAHeading = direction => direction !== undefined && direction !== 'variable'

// The two non-headings are the only values left once namesAHeading has rejected one, so the
// wording for each is the value itself or the words for its absence.
const describeSource = direction => (namesAHeading(direction) ? `from ${direction}` : (direction ?? 'no direction'))

// The chip's two colours come from comfort.js beside the reading, so they are set inline: the
// seven bands are a data table, and seven CSS classes would be a second copy of it to keep in
// step with it. The label is capitalised in CSS rather than here.
const renderComfort = ({ dewpointFahrenheit, document }) => {
    const { background, foreground, label } = comfortBand(dewpointFahrenheit)
    const chip = document.querySelector(SELECTORS.comfort)

    chip.hidden = false
    // Custom properties rather than `background` and `color` directly: a value written to a
    // custom property is handed to CSS verbatim, so a light-dark() pair or any other function
    // the parser does not recognise still lands. The wind plaque sets its colours the same way.
    chip.style.setProperty('--chip-background', background)
    chip.style.setProperty('--chip-foreground', foreground)
    chip.textContent = label
}

// One layer's shapes, all three lists always present, so this never branches on which kind of
// layer it was handed: an overcast lid is rects and circles, a puff row is ellipses and circles,
// and both are just shapes at a height by the time they get here.
const buildLayer = ({ circles, document, ellipses, far, rects }) => {
    const className = far ? 'layer-far' : 'layer-near'

    return [
        ...rects.map(attributes => buildSvg({ attributes: { class: className, ...attributes }, document, name: 'rect' })),
        ...ellipses.map(attributes => buildSvg({ attributes: { class: className, ...attributes }, document, name: 'ellipse' })),
        ...circles.map(attributes => buildSvg({ attributes: { class: className, ...attributes }, document, name: 'circle' })),
    ]
}

// The computed base is drawn on every sky, including a clear one: it is the plaque's own
// reading, and hiding it when nothing was reported would hide it exactly when it is the only
// cloud information there is. The layers go down first, high to low so the near deck paints over
// the far one, and the base goes over all of them — an overcast lid runs from its own height to
// the foot of the plot, and would otherwise bury the one line the plaque is named for.
const renderSky = ({ cloudBaseFeet, cloudLayers, document }) => {
    const { base, layers } = cloudSky({ baseFeet: cloudBaseFeet, layers: cloudLayers })
    const dash = buildSvg({
        attributes: { class: 'computed-base', x1: 0, x2: 136, y1: base.y, y2: base.y },
        document,
        name: 'line',
    })

    document.querySelector(SELECTORS.sky).replaceChildren(...layers.flatMap(layer => buildLayer({ ...layer, document })), dash)
}

// The plot's own furniture, in the 88-unit box. calmRadius draws the station model's symbol for
// calm — two rings, no shaft. A shaft of no length at some arbitrary heading would be a claim
// about a direction calm does not have.
const STATION = { calmRadius: 7.92, centre: { x: 44, y: 44 }, radius: 3.6 }

const windColour = knots => beaufortColour(beaufortForce(knots))

const buildStationRing = ({ colour, document, radius }) =>
    buildSvg({
        attributes: { class: 'station', cx: STATION.centre.x, cy: STATION.centre.y, r: radius, stroke: colour },
        document,
        name: 'circle',
    })

const buildShaft = ({ colour, document, shaft }) =>
    buildSvg({
        attributes: { class: 'shaft', stroke: colour, x1: shaft.from.x, x2: shaft.to.x, y1: shaft.from.y, y2: shaft.to.y },
        document,
        name: 'line',
    })

// Colour goes on both fill and stroke: the CSS zeroes whichever one the shape does not use, so
// this never has to know a pennant from a barb.
const buildMark = ({ colour, document, mark }) =>
    buildSvg({
        attributes: {
            class: mark.gust ? 'mark mark-gust' : 'mark mark-sustained',
            fill: colour,
            points: mark.points.map(({ x, y }) => `${x},${y}`).join(' '),
            stroke: colour,
        },
        document,
        name: mark.filled ? 'polygon' : 'polyline',
    })

const renderWindPlot = ({ document, wind }) => {
    const plot = document.querySelector(SELECTORS.windPlot)

    // An unreported wind draws nothing at all: the bare compass ring in the markup is what
    // "nobody measured this" looks like, and a station circle would assert a station reading.
    if (wind.state === 'unreported') {
        plot.replaceChildren()
        return
    }

    const colour = windColour(wind.state === 'calm' ? 0 : wind.knots)
    const station = buildStationRing({ colour, document, radius: STATION.radius })

    if (wind.state === 'calm') {
        plot.replaceChildren(station, buildStationRing({ colour, document, radius: STATION.calmRadius }))
        return
    }

    const { marks, shaft } = windBarbs(wind)
    const gustColour = wind.gustKnots === undefined ? colour : windColour(wind.gustKnots)

    plot.replaceChildren(
        station,
        ...(shaft === undefined ? [] : [buildShaft({ colour, document, shaft })]),
        // windBarbs already puts the gust's marks first, so they land under the sustained ones.
        ...marks.map(mark => buildMark({ colour: mark.gust ? gustColour : colour, document, mark })),
    )
}

const buildGust = ({ document, gustKnots }) => {
    const gust = document.createElement('span')

    gust.className = 'gust'
    gust.style.setProperty('--wind-colour', windColour(gustKnots))
    gust.textContent = `G ${gustKnots}`
    return gust
}

const renderWindDirection = ({ document, wind }) => {
    const element = document.querySelector(SELECTORS.windDirection)
    // A wind nobody measured has no direction to report either, and saying so is not the same
    // claim as a measured wind whose station sent no wdir.
    const source = wind.state === 'unreported' ? 'unreported' : describeSource(wind.direction)

    element.classList.toggle('no-heading', !namesAHeading(wind.direction))
    element.replaceChildren(
        ...(wind.gustKnots === undefined ? [source] : [`${source} · `, buildGust({ document, gustKnots: wind.gustKnots })]),
    )
}

// Calm and unreported each have to read as itself: calm air was measured and found still, an
// unreported wind was not measured at all, and neither of them is "0 kt".
const renderWind = ({ document, wind }) => {
    const speed = document.querySelector(SELECTORS.windSpeed)

    renderWindPlot({ document, wind })
    renderWindDirection({ document, wind })

    if (wind.state === 'unreported') {
        writeReading({ document, selector: SELECTORS.windSpeed, text: PLACEHOLDER })
        // A colour a successful render left here would paint the placeholder in the last good
        // wind's force.
        speed.style.removeProperty('--wind-colour')
        return
    }

    // Calm carries no speed to put a unit on, and takes force 0's colour rather than the
    // plaque's ink: it is the bottom of the same ramp the plot is drawn in, not the absence of
    // a reading.
    const calm = wind.state === 'calm'

    writeReading({ document, selector: SELECTORS.windSpeed, ...(calm ? { text: 'calm' } : { text: String(wind.knots), unit: 'kt' }) })
    speed.style.setProperty('--wind-colour', windColour(calm ? 0 : wind.knots))
}

// The barometer's scale, in hPa. 980 to 1050 covers everything a sea-level station reports
// short of a landfalling hurricane, and the clamp is what keeps the needle on the dial when one
// arrives: a needle that keeps swinging wraps past the top and reads as a high, which is the
// most dangerous thing this plaque could say.
const BAROMETER = { high: 1050, low: 980 }
const NEEDLE = { centre: { x: 56, y: 56 }, hubRadius: 4.5, length: 38.7 }

// The three trend glyphs in the 10-unit box the plaque gives them — the same shapes the toolbar
// button cuts into its comfort band. Steady is a dash rather than a flat arrow: an arrow with no
// direction to point reads as a broken up-arrow.
const TREND_POINTS = {
    falling: '5,8.5 9.5,1 0.5,1',
    rising: '5,1 9.5,8.5 0.5,8.5',
    steady: '0.5,4 9.5,4 9.5,6 0.5,6',
}

const clamp = ({ high, low, value }) => Math.min(Math.max(value, low), high)

// Left is the low end of the scale, so the angle runs backwards from pi to zero.
const needleAngle = hPa => {
    const span = BAROMETER.high - BAROMETER.low
    return Math.PI * (1 - (clamp({ ...BAROMETER, value: hPa }) - BAROMETER.low) / span)
}

const renderBarometer = ({ document, pressureHpa }) => {
    const dial = document.querySelector(SELECTORS.barometer)

    // A hub with no needle reads as a broken instrument rather than as a missing reading, so a
    // SPECI with no sea-level pressure gets neither of them.
    if (pressureHpa === undefined) {
        dial.replaceChildren()
        return
    }

    const angle = needleAngle(pressureHpa)
    dial.replaceChildren(
        buildSvg({
            attributes: {
                class: 'needle',
                x1: NEEDLE.centre.x,
                x2: NEEDLE.centre.x + NEEDLE.length * Math.cos(angle),
                y1: NEEDLE.centre.y,
                y2: NEEDLE.centre.y - NEEDLE.length * Math.sin(angle),
            },
            document,
            name: 'line',
        }),
        buildSvg({
            attributes: { class: 'hub', cx: NEEDLE.centre.x, cy: NEEDLE.centre.y, r: NEEDLE.hubRadius },
            document,
            name: 'circle',
        }),
    )
}

const renderTrendGlyph = ({ direction, document }) => {
    const points = TREND_POINTS[direction]
    // resolveTendency only ever names these three, so an unknown one is a wiring error and not a
    // reading the plaque should quietly render blank.
    if (points === undefined) throw new Error(`cannot draw an unknown pressure trend: ${direction}`)

    document.querySelector(SELECTORS.trendGlyph).replaceChildren(buildSvg({ attributes: { points }, document, name: 'polygon' }))
}

// SPECI reports omit sea-level pressure, and a SPECI can be the newest observation. The trend
// still resolves because it comes from the series, not the newest record alone, so it must
// render even when the absolute reading cannot — never the literal string "undefined".
const renderPressure = ({ document, observation, tendency }) => {
    const reading = observation.pressureHpa === undefined ? PLACEHOLDER : String(observation.pressureHpa)

    renderBarometer({ document, pressureHpa: observation.pressureHpa })
    writeReading({ document, selector: SELECTORS.pressure, text: reading })
    renderTrendGlyph({ direction: tendency.direction, document })
    write({ document, selector: SELECTORS.trend, text: describeTrend(tendency) })
}

const buildThunderBar = ({ document, hour, percent }) => {
    const bar = document.createElement('li')

    bar.className = 'thunder-bar'
    bar.style.setProperty('--percent', percent)
    bar.setAttribute('aria-label', `${HOUR_FORMAT.format(new Date(hour))} — ${percent}%`)
    return bar
}

const renderThunderBars = ({ document, thunder }) => {
    const bars = thunder.map(({ hour, percent }) => buildThunderBar({ document, hour, percent }))
    document.querySelector(SELECTORS.thunderBars).replaceChildren(...bars)
}

export const render = ({ document, model, now }) => {
    // now is required rather than defaulted to Date.now(), exactly as thunderSeries requires
    // it: a default keeps this module impure and, worse, silently dates the footer from a
    // clock the caller never chose. Every age in the popup must come from one pinned instant.
    if (now === undefined) throw new Error('render requires now')

    const { observation, tendency, thunder } = model

    write({ document, selector: SELECTORS.temperature, text: `${observation.temperatureFahrenheit}°` })
    write({ document, selector: SELECTORS.clouds, text: describeCloudLayers(observation.cloudLayers) })
    write({ document, selector: SELECTORS.visibility, text: describeVisibility(observation.visibility) })

    writeReading({ document, selector: SELECTORS.dewpoint, text: `${observation.dewpointFahrenheit}°` })
    renderComfort({ dewpointFahrenheit: observation.dewpointFahrenheit, document })

    renderSky({ cloudBaseFeet: observation.cloudBaseFeet, cloudLayers: observation.cloudLayers, document })
    writeReading({ document, selector: SELECTORS.cloudBase, text: WHOLE_FEET_FORMAT.format(observation.cloudBaseFeet), unit: 'ft' })
    renderWind({ document, wind: observation.wind })
    renderPressure({ document, observation, tendency })

    write({
        document,
        selector: SELECTORS.age,
        text: `${observation.stationName} · obs ${describeElapsed({ now, observedAt: observation.observedAt })}`,
    })
    write({ document, selector: SELECTORS.provenance, text: describeProvenance({ now, tendency }) })

    renderThunderBars({ document, thunder })
    document.querySelector(SELECTORS.thunder).hidden = thunder.length === 0
}

// The footer is a requirement on every code path, including this one: a user who has never
// successfully loaded data still sees why, rather than a blank popup. Shares SELECTORS with
// render() above so the two can't drift — see the comment on SELECTORS for why that matters.
export const renderUnavailable = ({ document, reason }) => {
    write({ document, selector: SELECTORS.temperature, text: PLACEHOLDER })
    write({ document, selector: SELECTORS.clouds, text: PLACEHOLDER })
    write({ document, selector: SELECTORS.visibility, text: '' })

    writeReading({ document, selector: SELECTORS.dewpoint, text: PLACEHOLDER })
    // Hidden rather than emptied: an empty pill is a coloured gap under the reading, and the
    // band it would name is exactly what is unknown here.
    document.querySelector(SELECTORS.comfort).hidden = true

    // The sky is emptied rather than drawn: cloudSky needs a base and a layer list to place its
    // shapes, and neither exists here. That leaves the plot's own furniture, which for this
    // plaque is none — the dashed base is the only thing it ever draws.
    document.querySelector(SELECTORS.sky).replaceChildren()
    writeReading({ document, selector: SELECTORS.cloudBase, text: PLACEHOLDER })
    renderWind({ document, wind: { state: 'unreported' } })
    // A needle and a glyph a successful render left standing would be the last good reading
    // dressed as the current one, so both are struck rather than left in place.
    document.querySelector(SELECTORS.barometer).replaceChildren()
    document.querySelector(SELECTORS.trendGlyph).replaceChildren()
    writeReading({ document, selector: SELECTORS.pressure, text: PLACEHOLDER })
    write({ document, selector: SELECTORS.trend, text: PLACEHOLDER })

    write({ document, selector: SELECTORS.age, text: `no observation available — ${reason}` })
    write({ document, selector: SELECTORS.provenance, text: 'tendency: unavailable' })
    document.querySelector(SELECTORS.thunder).hidden = true
}
