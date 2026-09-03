import { BEAUFORT, beaufortForce } from './beaufort.js'
import { comfortBand } from './comfort.js'
import { DIRECTIONLESS_RING, dartPoints } from './wind-dart.js'
import { announcedKnots, isNotable } from './wind.js'

// Every dimension below is in the 64-unit square the artboards were drawn in, scaled to the
// edge Firefox asks for. Working in the artboard's own units keeps each number checkable
// against the canvas, which fractions of the edge did not.
const FACE = 64

// Kit's toolbar-field indigo and its chrome text. The toolbar does not follow the page's colour
// scheme, so these two are fixed literals rather than light-dark() pairs — and the button takes
// the Beaufort ramp's dark side in both schemes for the same reason.
const CHIP_INK = '#03083f'
const CHROME_INK = '#e6e8ff'

const CORNER_RADIUS = 9.6
const FONT_STACK = 'system-ui, sans-serif'

// The comfort colour takes the bottom strip rather than the whole chip. It still reads at a
// glance, and the rest of the face is free for the reading or the wind mark — which is what
// lets the numerals give way to the dart without the dewpoint going unreported.
const BAND = { height: 14, top: 50 }

const READING = { em: 34, x: 32, y: 25 }

// Cut into the band in the chip's own ink, so the glyph is the band showing through. Paths, not
// the characters up-arrow, down-arrow, dash: at 16 device pixels a font's hinting decides how
// much ink lands on the three pixels the band is tall, and the three do not come out the same
// weight as each other. The steady dash keeps 0.4545 of the triangles' height, the ratio the
// shipped corner mark used — in proportion it came out under a pixel tall and read as a smudge.
const TREND_GLYPHS = {
    falling: [
        [24, 52.5],
        [40, 52.5],
        [32, 61.5],
    ],
    rising: [
        [32, 52.5],
        [40, 61.5],
        [24, 61.5],
    ],
    steady: [
        [24, 55],
        [40, 55],
        [40, 59],
        [24, 59],
    ],
}

// Filled and stroked in the same colour: the stroke's round joins take the corners off the
// vertices, which is what keeps the dart from reading as a paper aeroplane at 16 pixels.
const DART_STROKE = 2

// Two digits is the ordinary reading and gets the largest type the layout holds. A third
// character — a subfreezing '-4' rounds to two, but '-12' does not — shrinks the type in
// proportion instead of overflowing. Measuring the string would fit each one tighter, but then
// consecutive readings render at visibly different sizes, which looks like a bug.
const readingEm = ({ characters, em }) => (characters <= 2 ? em : (em * 2) / characters)

const tracePolygon = ({ context, points }) => {
    const [start, ...rest] = points
    context.beginPath()
    context.moveTo(start.x, start.y)
    for (const point of rest) context.lineTo(point.x, point.y)
    context.closePath()
}

const fillPolygon = ({ context, points }) => {
    tracePolygon({ context, points })
    context.fill()
}

const drawBand = ({ background, context, size, unit }) => {
    context.fillStyle = background
    context.beginPath()
    // Only the lower corners are rounded: the band follows the chip's own corner there and sits
    // flush against the face above it.
    context.roundRect(0, BAND.top * unit, size, BAND.height * unit, [0, 0, CORNER_RADIUS * unit, CORNER_RADIUS * unit])
    context.fill()
}

const drawTrend = ({ context, direction, unit }) => {
    const glyph = TREND_GLYPHS[direction]
    // resolveTendency only ever names these three, so an unknown one is a wiring error and not
    // a reading the button should quietly draw without its trend.
    if (glyph === undefined) throw new Error(`cannot draw an unknown pressure trend: ${direction}`)

    context.fillStyle = CHIP_INK
    fillPolygon({ context, points: glyph.map(([x, y]) => ({ x: x * unit, y: y * unit })) })
}

const drawReading = ({ context, dewpointFahrenheit, unit }) => {
    const reading = String(dewpointFahrenheit)

    context.fillStyle = CHROME_INK
    context.font = `bold ${unit * readingEm({ characters: reading.length, em: READING.em })}px ${FONT_STACK}`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(reading, READING.x * unit, READING.y * unit)
}

// A wind with no bearing still has a speed, so the colour still reports it and nothing on the
// face claims a heading the station never sent. The panel answers the same case with barbs and
// no shaft; the two surfaces say "speed, no direction" in their own grammars.
const drawWindRing = ({ colour, context, unit }) => {
    context.strokeStyle = colour
    context.lineWidth = DIRECTIONLESS_RING.stroke * unit
    context.beginPath()
    context.arc(READING.x * unit, READING.y * unit, DIRECTIONLESS_RING.radius * unit, 0, 2 * Math.PI)
    context.stroke()
}

const drawDart = ({ colour, context, fromDegrees, unit }) => {
    context.fillStyle = colour
    context.strokeStyle = colour
    context.lineJoin = 'round'
    context.lineWidth = DART_STROKE * unit
    tracePolygon({
        context,
        points: dartPoints({ centre: { x: READING.x * unit, y: READING.y * unit }, fromDegrees, scale: unit }),
    })
    context.fill()
    context.stroke()
}

const drawWind = ({ context, unit, wind }) => {
    const colour = BEAUFORT[beaufortForce(announcedKnots(wind))].dark

    if (wind.bearingDegrees === undefined) drawWindRing({ colour, context, unit })
    else drawDart({ colour, context, fromDegrees: wind.bearingDegrees, unit })
}

// Paints one square of the toolbar icon at the given edge length. The caller owns the canvas:
// this draws, and never reads the context back, so the same code serves both the extension's
// OffscreenCanvas and the preview page.
export const drawButtonIcon = ({ context, dewpointFahrenheit, direction, size, wind }) => {
    const { background } = comfortBand(dewpointFahrenheit)
    const unit = size / FACE

    context.clearRect(0, 0, size, size)
    context.fillStyle = CHIP_INK
    context.beginPath()
    context.roundRect(0, 0, size, size, CORNER_RADIUS * unit)
    context.fill()

    drawBand({ background, context, size, unit })
    drawTrend({ context, direction, unit })

    if (isNotable(wind)) drawWind({ context, unit, wind })
    else drawReading({ context, dewpointFahrenheit, unit })
}
