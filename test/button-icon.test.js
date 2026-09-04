import assert from 'node:assert/strict'
import { test } from 'node:test'
import { drawButtonIcon } from '../src/button-icon.js'

// 64 is the face's own unit square, so every expected number below is the artboard's number
// with no scaling arithmetic in the way. The 16 px case is a size question, not a geometry
// one, and lives on docs/icon-preview.html where it can be looked at.
const SIZE = 64

const CHIP_INK = '#03083f'
const CHROME_INK = '#e6e8ff'

// A canvas context that records what was asked of it. The extension's real context lives in an
// OffscreenCanvas the test environment has no implementation of, and the thing worth asserting
// is the drawing, not the raster. Every style is captured at each call because the context
// carries them as mutable state, and a later assignment would rewrite the earlier answers.
const recordingContext = () => {
    const calls = []
    const record = (call, fields) =>
        calls.push({
            call,
            fillStyle: context.fillStyle,
            font: context.font,
            lineJoin: context.lineJoin,
            lineWidth: context.lineWidth,
            strokeStyle: context.strokeStyle,
            ...fields,
        })
    const context = {
        arc: (x, y, radius) => record('arc', { radius, x, y }),
        beginPath: () => record('beginPath'),
        clearRect: (x, y, width, height) => record('clearRect', { height, width, x, y }),
        closePath: () => record('closePath'),
        fill: () => record('fill'),
        fillText: (text, x, y) => record('fillText', { text, x, y }),
        lineTo: (x, y) => record('lineTo', { x, y }),
        moveTo: (x, y) => record('moveTo', { x, y }),
        roundRect: (x, y, width, height, radius) => record('roundRect', { height, radius, width, x, y }),
        stroke: () => record('stroke'),
    }
    return { calls, context }
}

const CALM = { state: 'calm' }
const SSW_15 = { bearingDegrees: 202.5, knots: 15, state: 'measured' }

const draw = ({ dewpointFahrenheit = 68, direction = 'steady', size = SIZE, wind = CALM } = {}) => {
    const { calls, context } = recordingContext()
    drawButtonIcon({ context, dewpointFahrenheit, direction, size, wind })
    return calls
}

const only = ({ calls, name }) => calls.filter(({ call }) => call === name)
const points = calls => calls.filter(({ call }) => call === 'moveTo' || call === 'lineTo').map(({ x, y }) => [x, y])

// Which path a point belongs to is the whole question once the face has more than one glyph on
// it: beginPath is where one shape ends and the next starts. Paths with no points of their own
// (the chip and the band, drawn as roundRects) are left out.
const paths = calls =>
    calls
        .reduce((built, call) => (call.call === 'beginPath' ? [...built, []] : [...built.slice(0, -1), [...built.at(-1), call]]), [[]])
        .map(points)
        .filter(path => path.length > 0)

test('drawButtonIcon lays the chip in the toolbar field indigo, not the comfort colour', () => {
    // The comfort colour moved to the bottom band when the wind mark took the face. Flooding
    // the whole chip with it again would put the dart on seven different grounds.
    const [chip] = only({ calls: draw({ dewpointFahrenheit: 68 }), name: 'roundRect' })

    assert.deepEqual({ height: chip.height, width: chip.width, x: chip.x, y: chip.y }, { height: SIZE, width: SIZE, x: 0, y: 0 })
    assert.equal(chip.fillStyle, CHIP_INK)
})

test('drawButtonIcon fills the bottom band with the comfort colour, rounding only its lower corners', () => {
    const [, band] = only({ calls: draw({ dewpointFahrenheit: 68 }), name: 'roundRect' })

    assert.deepEqual({ height: band.height, width: band.width, x: band.x, y: band.y }, { height: 14, width: 64, x: 0, y: 50 })
    assert.deepEqual(band.radius, [0, 0, 9.6, 9.6])
    assert.equal(band.fillStyle, '#FF6600')
})

test('drawButtonIcon cuts the trend into the band in the chip ink', () => {
    const calls = draw({ direction: 'rising' })
    const [notch] = paths(calls)

    assert.deepEqual(notch, [
        [32, 52.5],
        [40, 61.5],
        [24, 61.5],
    ])
    assert.equal(only({ calls, name: 'moveTo' })[0].fillStyle, CHIP_INK)
})

test('drawButtonIcon points the falling notch the other way and flattens the steady one', () => {
    assert.deepEqual(paths(draw({ direction: 'falling' }))[0], [
        [24, 52.5],
        [40, 52.5],
        [32, 61.5],
    ])
    assert.deepEqual(paths(draw({ direction: 'steady' }))[0], [
        [24, 55],
        [40, 55],
        [40, 59],
        [24, 59],
    ])
})

test('drawButtonIcon refuses a trend it has no glyph for', () => {
    // resolveTendency only ever names these three, so an unknown one is a wiring error, not a
    // reading the button should quietly draw without its trend.
    assert.throws(() => draw({ direction: 'sideways' }), /unknown pressure trend: sideways/)
})

test('drawButtonIcon writes the dewpoint numerals in the chrome ink when the wind is quiet', () => {
    const [reading] = only({ calls: draw({ dewpointFahrenheit: 58 }), name: 'fillText' })

    assert.deepEqual({ text: reading.text, x: reading.x, y: reading.y }, { text: '58', x: 32, y: 25 })
    assert.equal(reading.fillStyle, CHROME_INK)
    assert.equal(reading.font, 'bold 34px system-ui, sans-serif')
})

test('drawButtonIcon shrinks the type for a three-character reading', () => {
    // A subfreezing -4 rounds to two characters, but -12 does not. Measuring each string would
    // fit it tighter and make consecutive readings render at visibly different sizes.
    const [reading] = only({ calls: draw({ dewpointFahrenheit: -12 }), name: 'fillText' })

    assert.match(reading.font, /^bold 22\.6/)
})

test('drawButtonIcon gives the face to the dart once the wind is notable', () => {
    const calls = draw({ wind: SSW_15 })

    assert.equal(only({ calls, name: 'fillText' }).length, 0)
    assert.deepEqual(
        paths(calls)[1].map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]),
        [
            [38.12, 10.22],
            [38.65, 42.91],
            [29.32, 31.47],
            [14.63, 32.96],
        ],
    )
})

test('drawButtonIcon draws the dart for a wind out of due north', () => {
    // A bearing of 0 is a heading the station reported, not a missing one. The guard reads
    // `=== undefined` for exactly this: a truthiness test hands due north the directionless
    // ring and throws away a heading the observation carries.
    const calls = draw({ wind: { bearingDegrees: 0, direction: 'N', knots: 20, state: 'measured' } })
    const [tip] = paths(calls)[1]

    assert.equal(only({ calls, name: 'arc' }).length, 0)
    // A north wind blows south, so the tip sits below the plot centre.
    assert.deepEqual(tip, [32, 41])
})

test('drawButtonIcon strokes the dart at width 2 with round joins', () => {
    // The round joins take the corners off the vertices; without them the dart reads as a paper
    // aeroplane at 16 pixels, and a stroke several times wider closes the notch into a blob.
    const [dart] = only({ calls: draw({ wind: SSW_15 }), name: 'stroke' })

    assert.equal(dart.lineJoin, 'round')
    assert.equal(dart.lineWidth, 2)
})

test('drawButtonIcon keeps the band and the trend when the dart takes the face', () => {
    // The dewpoint is still readable from the colour, which is the whole reason the numerals
    // can go: the button never stops reporting it.
    const calls = draw({ direction: 'rising', wind: SSW_15 })

    assert.equal(only({ calls, name: 'roundRect' }).length, 2)
    assert.equal(paths(calls).length, 2)
})

test('drawButtonIcon colours the dart by the announced speed', () => {
    // Both sides of the 10 kt gust margin, and the case sitting exactly on it.
    const colourOf = wind => only({ calls: draw({ wind }), name: 'stroke' })[0].strokeStyle
    const measured = ({ bearingDegrees, gustKnots, knots }) => ({ bearingDegrees, gustKnots, knots, state: 'measured' })

    assert.equal(colourOf(SSW_15), '#6cf640')
    assert.equal(colourOf(measured({ bearingDegrees: 292.5, gustKnots: 31, knots: 22 })), '#dcf59d')
    assert.equal(colourOf(measured({ bearingDegrees: 270, gustKnots: 32, knots: 18 })), '#f5f69c')
    assert.equal(colourOf(measured({ bearingDegrees: 180, gustKnots: 65, knots: 55 })), '#f69c6e')
})

test('drawButtonIcon rings the centre for a notable wind with no bearing', () => {
    // A VRB gust has a speed and no heading. A dart pointed anywhere would assert the heading
    // the station explicitly refused to give.
    const calls = draw({ wind: { gustKnots: 21, knots: 6, state: 'measured' } })
    const [ring] = only({ calls, name: 'arc' })

    assert.deepEqual({ radius: ring.radius, x: ring.x, y: ring.y }, { radius: 10, x: 32, y: 25 })
    // The gust is 15 over the sustained 6, so the announced speed is 21 and the ring takes force
    // 5. The ring reports the same speed the dart would have; only the heading is withheld.
    assert.equal(ring.strokeStyle, '#c8f640')
    assert.equal(ring.lineWidth, 6)
    assert.equal(paths(calls).length, 1)
})

test('drawButtonIcon scales the whole face, so 16 and 32 are one drawing at two sizes', () => {
    const [chip] = only({ calls: draw({ size: 16, wind: CALM }), name: 'roundRect' })
    const [, band] = only({ calls: draw({ size: 16, wind: CALM }), name: 'roundRect' })

    assert.equal(chip.radius, 2.4)
    assert.deepEqual({ height: band.height, y: band.y }, { height: 3.5, y: 12.5 })
})
