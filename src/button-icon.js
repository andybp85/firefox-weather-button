import { comfortBand } from './comfort.js'
import { isNotable } from './wind.js'
import { windsockPolygons } from './windsock.js'

// Every dimension is a fraction of the icon's edge. Firefox asks for this icon at both 16
// and 32 device pixels and the two have to be the same drawing scaled, not two separately
// hand-tuned ones that drift apart.
const CORNER_RADIUS = 0.15
const FONT_STACK = 'system-ui, sans-serif'

// The two layouts the square is drawn in. A wind worth announcing takes the bottom band for the
// sock and pushes the trend into the top-right corner; anything less leaves the icon exactly as
// it was, down to the call, because the ordinary icon is the one people learn to read.
const BAND_LAYOUT = {
    reading: { em: 0.6, x: 0.5, y: 0.35 },
    trend: { halfWidth: 0.25, heightScale: 1, x: 0.5, y: 0.8 },
}
// Every figure here is the toolbar's 16px square talking, not taste: the reading gives up a
// little size and shifts left to clear the corner mark, the corner mark stays inboard of the
// chip's rounded corner, and the sock's pivot and reach keep the mast, the cone at every lift,
// and the gust tick that flies past it inside the square. The test at 16px holds the last of it.
const WIND_LAYOUT = {
    reading: { em: 0.5, x: 0.4, y: 0.28 },
    sock: { origin: { x: 0.1, y: 0.54 }, scale: 0.35 },
    // The corner mark keeps more of its height than of its width. Scaled down in proportion, the
    // steady dash came out three quarters of a device pixel tall at 16px and rendered as a smudge;
    // a slightly chunkier arrow is the price of the three glyphs still being told apart.
    trend: { halfWidth: 0.12, heightScale: 0.7, x: 0.8, y: 0.16 },
}

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

// Two digits is the ordinary reading and gets the largest type the layout holds. A third
// character — a subfreezing '-4' rounds to two, but '-12' does not — shrinks the type in
// proportion instead of overflowing. Measuring the string would fit each one tighter, but
// then consecutive readings render at visibly different sizes, which looks like a bug.
const readingEm = ({ characters, em }) => (characters <= 2 ? em : (em * 2) / characters)

const fillPolygon = ({ context, points }) => {
    const [start, ...rest] = points
    context.beginPath()
    context.moveTo(start.x, start.y)
    for (const point of rest) context.lineTo(point.x, point.y)
    context.closePath()
    context.fill()
}

const drawTrend = ({ context, direction, size, trend }) => {
    const glyph = TREND_GLYPHS[direction]
    // resolveTendency only ever names these three, so an unknown one is a wiring error and
    // not a reading the button should quietly draw without its trend.
    if (glyph === undefined) throw new Error(`cannot draw an unknown pressure trend: ${direction}`)

    const points = glyph.points.map(([x, y]) => ({
        x: size * (trend.x + x * trend.halfWidth),
        y: size * (trend.y + y * glyph.halfHeight * trend.heightScale),
    }))

    fillPolygon({ context, points })
}

// Drawn in the same order every time — gust tick, mast, then cone — so the shapes a test reads
// back off the context are identified by their position in the sequence.
const drawWindsock = ({ context, size, wind }) => {
    const { origin, scale } = WIND_LAYOUT.sock
    const polygons = windsockPolygons({
        gusting: wind.gustKnots !== undefined,
        knots: wind.knots,
        origin: { x: size * origin.x, y: size * origin.y },
        scale: size * scale,
    })

    for (const points of Object.values(polygons)) fillPolygon({ context, points })
}

// Paints one square of the toolbar icon at the given edge length. The caller owns the
// canvas: this draws, and never reads the context back, so the same code serves both the
// extension's OffscreenCanvas and the preview page.
export const drawButtonIcon = ({ context, dewpointFahrenheit, direction, size, wind }) => {
    const { background, foreground } = comfortBand(dewpointFahrenheit)
    const windy = isNotable(wind)
    const { reading: readingLayout, trend } = windy ? WIND_LAYOUT : BAND_LAYOUT
    const reading = String(dewpointFahrenheit)

    context.clearRect(0, 0, size, size)
    context.fillStyle = background
    context.beginPath()
    context.roundRect(0, 0, size, size, size * CORNER_RADIUS)
    context.fill()

    context.fillStyle = foreground
    context.font = `bold ${size * readingEm({ characters: reading.length, em: readingLayout.em })}px ${FONT_STACK}`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(reading, size * readingLayout.x, size * readingLayout.y)

    drawTrend({ context, direction, size, trend })
    if (windy) drawWindsock({ context, size, wind })
}
