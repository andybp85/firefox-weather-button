import { BEAUFORT, beaufortForce } from './beaufort.js'
import { comfortBand } from './comfort.js'
import { announcedKnots } from './wind.js'

// Every dimension below is in the 64-unit square the artboards were drawn in, scaled to the
// edge Firefox asks for. Working in the artboard's own units keeps each number checkable
// against the canvas, which fractions of the edge did not.
const FACE = 64
const CENTRE = 32

// Kit's toolbar-field indigo. The toolbar does not follow the page's colour scheme, so this is a
// fixed literal rather than a light-dark() pair, and the ring takes the Beaufort ramp's dark side
// in both schemes for the same reason.
const CHIP_INK = '#03083f'

const CORNER_RADIUS = 9.6
const FONT_STACK = 'system-ui, sans-serif'

// The canvas defaults for direction C (a bead on the ring), in the 64-unit face. Radii and stroke
// widths, except the bead, which is a diameter: it is the one mark a reader sizes as a dot. Frozen
// because the toolbar pass tunes the face by editing these seven numbers and nothing else.
//
// At 16 device pixels the bead is 2.25 px, the floor the 0.3.0 dart failed at. That mark failed on
// direction; the bead carries only position, which the canvas sweep showed distinct at every
// compass point. If it fails through setIcon, the fallback is a 90° heavy sweep in place of the
// bead: same ring, same three no-heading states, one different mark.
export const FACE_GEOMETRY = Object.freeze({
    baseline: 1,
    bead: 9,
    em: 28,
    heavy: 6,
    light: 2.5,
    moat: 3,
    ring: 27,
})

// Measured from the heavy stroke's inner edge, so the disc keeps the same clearance under a VRB
// ring as under a light one.
const DISC_RADIUS = FACE_GEOMETRY.ring - FACE_GEOMETRY.heavy / 2 - FACE_GEOMETRY.moat

// Two digits is the ordinary reading and gets the largest type the disc holds. A third
// character — a subfreezing '-4' rounds to two, but '-12' does not — shrinks the type in
// proportion instead of overflowing. Measuring the string would fit each one tighter, but then
// consecutive readings render at visibly different sizes, which looks like a bug.
const readingEm = ({ characters, em }) => (characters <= 2 ? em : (em * 2) / characters)

const radians = degrees => (degrees * Math.PI) / 180

// The point on the ring at a compass bearing, upwind: the bead sits where the wind comes from,
// the station-model convention the popup's barbs already follow. North is up the face, so the
// bearing is measured clockwise from the negative y axis.
const onRing = ({ bearingDegrees, unit }) => ({
    x: (CENTRE + FACE_GEOMETRY.ring * Math.sin(radians(bearingDegrees))) * unit,
    y: (CENTRE - FACE_GEOMETRY.ring * Math.cos(radians(bearingDegrees))) * unit,
})

const drawChip = ({ context, size, unit }) => {
    context.fillStyle = CHIP_INK
    context.beginPath()
    context.roundRect(0, 0, size, size, CORNER_RADIUS * unit)
    context.fill()
}

const drawDisc = ({ background, context, unit }) => {
    context.fillStyle = background
    context.beginPath()
    context.arc(CENTRE * unit, CENTRE * unit, DISC_RADIUS * unit, 0, 2 * Math.PI)
    context.fill()
}

const drawFigures = ({ context, foreground, temperatureFahrenheit, unit }) => {
    const figures = String(temperatureFahrenheit)

    context.fillStyle = foreground
    context.font = `bold ${unit * readingEm({ characters: figures.length, em: FACE_GEOMETRY.em })}px ${FONT_STACK}`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(figures, CENTRE * unit, (CENTRE + FACE_GEOMETRY.baseline) * unit)
}

const drawRing = ({ colour, context, stroke, unit }) => {
    context.strokeStyle = colour
    context.lineWidth = stroke * unit
    // There are no arc ends on this face, so the cap never shows; butt is set so that stays true
    // if a sweep ever replaces the bead.
    context.lineCap = 'butt'
    context.beginPath()
    context.arc(CENTRE * unit, CENTRE * unit, FACE_GEOMETRY.ring * unit, 0, 2 * Math.PI)
    context.stroke()
}

const drawBead = ({ bearingDegrees, colour, context, unit }) => {
    const { x, y } = onRing({ bearingDegrees, unit })

    context.fillStyle = colour
    context.beginPath()
    context.arc(x, y, (FACE_GEOMETRY.bead / 2) * unit, 0, 2 * Math.PI)
    context.fill()
}

// Calm carries no speed on the value, and 0 kt is force 0 by the chart's own first row.
const windColour = wind => BEAUFORT[beaufortForce(wind.state === 'calm' ? 0 : announcedKnots(wind))].dark

// The ring says how hard and the bead says from where. Calm is the light ring alone, a wind with
// no bearing is the heavy ring alone, and a wind nobody measured is no ring: three states a
// glance can tell apart, none of them claiming a heading the station never sent.
const drawWind = ({ context, unit, wind }) => {
    if (wind.state === 'unreported') return

    if (wind.state === 'calm') return drawRing({ colour: windColour(wind), context, stroke: FACE_GEOMETRY.light, unit })
    // Before the bearing test, so a state that is none of the three throws whether or not it
    // carries a bearing, instead of passing for a VRB wind when it happens to lack one.
    if (wind.state !== 'measured') throw new Error(`cannot draw an unknown wind state: ${wind.state}`)

    const colour = windColour(wind)
    if (wind.bearingDegrees === undefined) return drawRing({ colour, context, stroke: FACE_GEOMETRY.heavy, unit })

    drawRing({ colour, context, stroke: FACE_GEOMETRY.light, unit })
    drawBead({ bearingDegrees: wind.bearingDegrees, colour, context, unit })
}

// Paints one square of the toolbar icon at the given edge length: the temperature in figures on
// a disc in the dewpoint's comfort colour, ringed by the wind in its Beaufort colour. The caller
// owns the canvas: this draws, and never reads the context back, so the same code serves both
// the extension's OffscreenCanvas and the preview page.
export const drawButtonIcon = ({ context, dewpointFahrenheit, size, temperatureFahrenheit, wind }) => {
    const { background, foreground } = comfortBand(dewpointFahrenheit)
    const unit = size / FACE

    context.clearRect(0, 0, size, size)
    drawChip({ context, size, unit })
    drawDisc({ background, context, unit })
    drawFigures({ context, foreground, temperatureFahrenheit, unit })
    drawWind({ context, unit, wind })
}
