import assert from 'node:assert/strict'
import { test } from 'node:test'
import { drawButtonIcon } from '../src/button-icon.js'

const SIZE = 32

// A canvas context that records what was asked of it. The extension's real context lives in
// an OffscreenCanvas the test environment has no implementation of, and the thing worth
// asserting is the drawing, not the raster: which colours were in force for which shape, and
// where the points landed. fillStyle is captured at each call because the context carries it
// as mutable state, and a later assignment would otherwise rewrite the earlier shapes' answers.
const recordingContext = () => {
    const calls = []
    const record = (call, fields) => calls.push({ call, fillStyle: context.fillStyle, ...fields })
    const context = {
        beginPath: () => record('beginPath'),
        clearRect: (x, y, width, height) => record('clearRect', { height, width, x, y }),
        closePath: () => record('closePath'),
        fill: () => record('fill'),
        fillText: (text, x, y) => record('fillText', { text, x, y }),
        lineTo: (x, y) => record('lineTo', { x, y }),
        moveTo: (x, y) => record('moveTo', { x, y }),
        roundRect: (x, y, width, height, radius) => record('roundRect', { height, radius, width, x, y }),
    }
    return { calls, context }
}

const CALM = { state: 'calm' }
const GALE = { knots: 34, state: 'measured' }

const draw = ({ dewpointFahrenheit = 68, direction = 'steady', size = SIZE, wind = CALM } = {}) => {
    const { calls, context } = recordingContext()
    drawButtonIcon({ context, dewpointFahrenheit, direction, size, wind })
    return calls
}

const only = ({ calls, name }) => calls.filter(({ call }) => call === name)
const points = calls => calls.filter(({ call }) => call === 'moveTo' || call === 'lineTo').map(({ x, y }) => [x, y])

// The drawing is a sequence of paths, and which path a point belongs to is the whole question
// once the icon has more than one glyph on it: beginPath is where one shape ends and the next
// starts. Paths with no points of their own (the chip, drawn as a roundRect) are left out.
const paths = calls =>
    calls
        .reduce((built, call) => (call.call === 'beginPath' ? [...built, []] : [...built.slice(0, -1), [...built.at(-1), call]]), [[]])
        .map(points)
        .filter(path => path.length > 0)

test('drawButtonIcon fills the whole square with the reading band colour', () => {
    const calls = draw({ dewpointFahrenheit: 68 })
    const [square] = only({ calls, name: 'roundRect' })

    assert.deepEqual({ height: square.height, width: square.width, x: square.x, y: square.y }, { height: SIZE, width: SIZE, x: 0, y: 0 })
    assert.equal(square.fillStyle, '#FF6600')
})

test('drawButtonIcon writes the reading in the band foreground', () => {
    const [reading] = only({ calls: draw({ dewpointFahrenheit: 58 }), name: 'fillText' })

    assert.equal(reading.text, '58')
    assert.equal(reading.fillStyle, '#FFFFFF')
})

test('drawButtonIcon clears the square before painting, so a shorter reading cannot leave a digit behind', () => {
    const [cleared] = draw()

    assert.deepEqual(cleared, { call: 'clearRect', fillStyle: undefined, height: SIZE, width: SIZE, x: 0, y: 0 })
})

test('drawButtonIcon points the trend glyph up for a rise and down for a fall', () => {
    const risingApex = points(draw({ direction: 'rising' })).reduce((lowest, point) => (point[1] < lowest[1] ? point : lowest))
    const fallingApex = points(draw({ direction: 'falling' })).reduce((lowest, point) => (point[1] > lowest[1] ? point : lowest))

    // The apex is the one point alone on its side of the glyph; both sit on its centre line.
    assert.equal(risingApex[0], SIZE / 2)
    assert.equal(fallingApex[0], SIZE / 2)
    assert.ok(risingApex[1] < fallingApex[1])
})

test('drawButtonIcon draws steady as a flat bar rather than an arrow', () => {
    const bar = points(draw({ direction: 'steady' }))

    assert.equal(bar.length, 4)
    assert.equal(new Set(bar.map(([, y]) => y)).size, 2)
})

test('drawButtonIcon refuses a trend it has no glyph for', () => {
    assert.throws(() => draw({ direction: 'sideways' }), /sideways/)
})

test('drawButtonIcon shrinks the type so a three-character reading still fits', () => {
    const typeHeight = dewpointFahrenheit => {
        const { context } = recordingContext()
        drawButtonIcon({ context, dewpointFahrenheit, direction: 'steady', size: SIZE, wind: CALM })
        return Number(context.font.match(/(\d+(?:\.\d+)?)px/)[1])
    }

    assert.equal(typeHeight(68), typeHeight(-4))
    assert.ok(typeHeight(-12) < typeHeight(68))
})

test('drawButtonIcon keeps every mark inside the square at the toolbar size', () => {
    const size = 16
    // A light wind gusting hard is the case that reaches furthest down the square: the sock is
    // still hanging near its mast, and the gust tick flies on past the tip of it. Leaving it out
    // is how a tick hanging a pixel below the icon got drawn and slipped past this test once.
    const winds = [
        CALM,
        GALE,
        { gustKnots: 14, knots: 4, state: 'measured' },
        { gustKnots: 41, knots: 34, state: 'measured' },
        { knots: 15, state: 'measured' },
        { state: 'unreported' },
    ]
    const marks = ['falling', 'rising', 'steady'].flatMap(direction => winds.flatMap(wind => points(draw({ direction, size, wind }))))

    for (const [x, y] of marks) {
        assert.ok(x >= 0 && x <= size, `x ${x} outside the square`)
        assert.ok(y >= 0 && y <= size, `y ${y} outside the square`)
    }
})

// The icon a user sees on an ordinary day is the one that was verified in a real Firefox, and a
// wind not worth announcing must not redraw it. Identical calls, not merely a similar look.
test('drawButtonIcon draws exactly the same icon for every wind that has not earned the band', () => {
    const unremarkable = [CALM, { state: 'unreported' }, { direction: 'NW', knots: 14, state: 'measured' }]
    const [first, ...rest] = unremarkable.map(wind => draw({ direction: 'rising', wind }))

    for (const drawn of rest) assert.deepEqual(drawn, first)
})

test('a notable wind gives the bottom band to the sock and sends the trend to the corner', () => {
    const trend = paths(draw({ direction: 'rising', wind: GALE }))[0]

    for (const [x, y] of trend) {
        assert.ok(x > SIZE * 0.6, `the corner trend mark reaches back to x ${x}`)
        assert.ok(y < SIZE * 0.3, `the corner trend mark hangs down to y ${y}`)
    }
})

test('a notable wind adds the mast and the sock, and a gust adds its tick', () => {
    const steady = paths(draw({ wind: GALE })).length
    const gusting = paths(draw({ wind: { gustKnots: 41, knots: 34, state: 'measured' } })).length

    assert.equal(steady, paths(draw({ wind: CALM })).length + 2)
    assert.equal(gusting, steady + 1)
})

test('the sock reaches further out the harder the wind blows', () => {
    const reach = knots =>
        Math.max(
            ...paths(draw({ wind: { knots, state: 'measured' } }))
                .at(-1)
                .map(([x]) => x),
        )

    assert.ok(reach(34) > reach(15), 'the sock must lift with the wind, or it reports nothing')
})

// The reading is the icon's whole job, so it stays the largest thing on the square; what gives
// way is a little of its size, so the corner mark is not drawn through the last digit.
test('the reading shrinks to clear the corner trend mark', () => {
    const typeHeight = wind => {
        const { context } = recordingContext()
        drawButtonIcon({ context, dewpointFahrenheit: 68, direction: 'steady', size: SIZE, wind })
        return Number(context.font.match(/(\d+(?:\.\d+)?)px/)[1])
    }

    assert.ok(typeHeight(GALE) < typeHeight(CALM))
})
