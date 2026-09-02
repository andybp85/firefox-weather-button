import { comfortBand } from './comfort.js'

// Every dimension is a fraction of the icon's edge. Firefox asks for this icon at both 16
// and 32 device pixels and the two have to be the same drawing scaled, not two separately
// hand-tuned ones that drift apart.
const CORNER_RADIUS = 0.15
const FONT_STACK = 'system-ui, sans-serif'
const READING_CENTRE = { x: 0.5, y: 0.35 }
const TREND_CENTRE_Y = 0.8
const TREND_HALF_WIDTH = 0.25

// Glyph outlines in unit coordinates about their own centre, scaled by the half-width and
// half-height below. They are drawn as paths rather than typed as ↑ ↓ —, because at this
// size a font's hinting decides how much ink lands on the three device pixels the band is
// tall, and the three characters do not come out the same weight as each other. Steady is
// the chart's dash: an arrow with no direction to point reads as a broken up-arrow.
const TREND_GLYPHS = {
    falling: {
        halfHeight: 0.11,
        points: [
            [-1, -1],
            [1, -1],
            [0, 1],
        ],
    },
    rising: {
        halfHeight: 0.11,
        points: [
            [-1, 1],
            [1, 1],
            [0, -1],
        ],
    },
    steady: {
        halfHeight: 0.05,
        points: [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1],
        ],
    },
}

// Two digits is the ordinary reading and gets the largest type the square holds. A third
// character — a subfreezing '-4' rounds to two, but '-12' does not — shrinks the type in
// proportion instead of overflowing. Measuring the string would fit each one tighter, but
// then consecutive readings render at visibly different sizes, which looks like a bug.
const READING_EM = 0.6
const readingEm = characters => (characters <= 2 ? READING_EM : (READING_EM * 2) / characters)

const drawTrend = ({ context, direction, size }) => {
    const glyph = TREND_GLYPHS[direction]
    // resolveTendency only ever names these three, so an unknown one is a wiring error and
    // not a reading the button should quietly draw without its trend.
    if (glyph === undefined) throw new Error(`cannot draw an unknown pressure trend: ${direction}`)

    const [start, ...rest] = glyph.points.map(([x, y]) => [
        size * (0.5 + x * TREND_HALF_WIDTH),
        size * (TREND_CENTRE_Y + y * glyph.halfHeight),
    ])

    context.beginPath()
    context.moveTo(...start)
    for (const point of rest) context.lineTo(...point)
    context.closePath()
    context.fill()
}

// Paints one square of the toolbar icon at the given edge length. The caller owns the
// canvas: this draws, and never reads the context back, so the same code serves both the
// extension's OffscreenCanvas and the preview page.
export const drawButtonIcon = ({ context, dewpointFahrenheit, direction, size }) => {
    const { background, foreground } = comfortBand(dewpointFahrenheit)
    const reading = String(dewpointFahrenheit)

    context.clearRect(0, 0, size, size)
    context.fillStyle = background
    context.beginPath()
    context.roundRect(0, 0, size, size, size * CORNER_RADIUS)
    context.fill()

    context.fillStyle = foreground
    context.font = `bold ${size * readingEm(reading.length)}px ${FONT_STACK}`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(reading, size * READING_CENTRE.x, size * READING_CENTRE.y)

    drawTrend({ context, direction, size })
}
