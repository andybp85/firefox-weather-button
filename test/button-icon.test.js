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

const draw = ({ dewpointFahrenheit = 68, direction = 'steady', size = SIZE } = {}) => {
    const { calls, context } = recordingContext()
    drawButtonIcon({ context, dewpointFahrenheit, direction, size })
    return calls
}

const only = ({ calls, name }) => calls.filter(({ call }) => call === name)
const points = calls => calls.filter(({ call }) => call === 'moveTo' || call === 'lineTo').map(({ x, y }) => [x, y])

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
        drawButtonIcon({ context, dewpointFahrenheit, direction: 'steady', size: SIZE })
        return Number(context.font.match(/(\d+(?:\.\d+)?)px/)[1])
    }

    assert.equal(typeHeight(68), typeHeight(-4))
    assert.ok(typeHeight(-12) < typeHeight(68))
})

test('drawButtonIcon keeps every mark inside the square at the toolbar size', () => {
    const size = 16
    const marks = ['falling', 'rising', 'steady'].flatMap(direction => points(draw({ direction, size })))

    for (const [x, y] of marks) {
        assert.ok(x >= 0 && x <= size, `x ${x} outside the square`)
        assert.ok(y >= 0 && y <= size, `y ${y} outside the square`)
    }
})
