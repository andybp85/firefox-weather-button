import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FACE_GEOMETRY, drawButtonIcon } from '../src/button-icon.js'

// 64 is the face's own unit square, so every expected number below is the spec's number with no
// scaling arithmetic in the way. The 16 px case is a size question, not a geometry one, and lives
// on docs/icon-preview.html and, finally, on a real toolbar.
const SIZE = 64

const CHIP_INK = '#03083f'

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
            lineCap: context.lineCap,
            lineWidth: context.lineWidth,
            strokeStyle: context.strokeStyle,
            textAlign: context.textAlign,
            textBaseline: context.textBaseline,
            ...fields,
        })
    const context = {
        arc: (x, y, radius, startAngle, endAngle) => record('arc', { endAngle, radius, startAngle, x, y }),
        beginPath: () => record('beginPath'),
        clearRect: (x, y, width, height) => record('clearRect', { height, width, x, y }),
        fill: () => record('fill'),
        fillText: (text, x, y) => record('fillText', { text, x, y }),
        roundRect: (x, y, width, height, radius) => record('roundRect', { height, radius, width, x, y }),
        stroke: () => record('stroke'),
    }
    return { calls, context }
}

const CALM = { state: 'calm' }
const UNREPORTED = { state: 'unreported' }
const measured = ({ bearingDegrees, gustKnots, knots }) => ({ bearingDegrees, gustKnots, knots, state: 'measured' })
const SSW_15 = measured({ bearingDegrees: 202.5, knots: 15 })

const draw = ({ dewpointFahrenheit = 68, size = SIZE, temperatureFahrenheit = 72, wind = CALM } = {}) => {
    const { calls, context } = recordingContext()
    drawButtonIcon({ context, dewpointFahrenheit, size, temperatureFahrenheit, wind })
    return calls
}

const only = ({ calls, name }) => calls.filter(({ call }) => call === name)
// Every circle on the face is an arc: the disc first, then the ring, then the bead. Which one a
// call is follows from its order, so the arcs are read back as a list.
const arcs = calls => only({ calls, name: 'arc' })
const round = value => Math.round(value * 100) / 100

test('FACE_GEOMETRY is the canvas default for direction C, and is frozen', () => {
    // The toolbar pass tunes the face by editing this object, so nothing may mutate it at run time.
    assert.ok(Object.isFrozen(FACE_GEOMETRY))
    assert.deepEqual(FACE_GEOMETRY, { baseline: 1, bead: 9, em: 28, heavy: 6, light: 2.5, moat: 3, ring: 27 })
})

test('drawButtonIcon lays the chip in the toolbar field indigo and nothing else in a roundRect', () => {
    // The comfort band was the second roundRect. It is gone: the disc carries the comfort colour now.
    const chips = only({ calls: draw(), name: 'roundRect' })

    assert.equal(chips.length, 1)
    assert.deepEqual(
        { height: chips[0].height, radius: chips[0].radius, width: chips[0].width, x: chips[0].x, y: chips[0].y },
        { height: SIZE, radius: 9.6, width: SIZE, x: 0, y: 0 },
    )
    assert.equal(chips[0].fillStyle, CHIP_INK)
})

test('drawButtonIcon fills a disc at the centre with the comfort colour', () => {
    // 21 is the ring radius less half the heavy stroke less the moat. It is measured from the
    // heavy stroke so a VRB ring keeps the same clearance as a light one.
    const [disc] = arcs(draw({ dewpointFahrenheit: 68 }))

    assert.deepEqual({ radius: disc.radius, x: disc.x, y: disc.y }, { radius: 21, x: 32, y: 32 })
    assert.equal(disc.fillStyle, '#FF6600')
})

test('drawButtonIcon writes the temperature on the disc in the comfort ink', () => {
    const [figures] = only({ calls: draw({ dewpointFahrenheit: 68, temperatureFahrenheit: 72 }), name: 'fillText' })

    assert.deepEqual({ text: figures.text, x: figures.x, y: figures.y }, { text: '72', x: 32, y: 33 })
    assert.equal(figures.fillStyle, '#000000')
    assert.equal(figures.font, 'bold 28px system-ui, sans-serif')
    // The x and y above are the disc's centre, which only centres the figures if both anchors
    // are set: the canvas defaults are 'start' and 'alphabetic'.
    assert.deepEqual({ textAlign: figures.textAlign, textBaseline: figures.textBaseline }, { textAlign: 'center', textBaseline: 'middle' })
})

test('drawButtonIcon takes the white ink where the comfort chart computed it', () => {
    // 58 is the comfortable band, #008000, whose contrast is better with white than with black.
    const [figures] = only({ calls: draw({ dewpointFahrenheit: 58 }), name: 'fillText' })

    assert.equal(figures.fillStyle, '#FFFFFF')
})

test('drawButtonIcon shrinks the type to two thirds for a three-character reading', () => {
    // A subfreezing -4 is two characters, but -12 and 104 are not. Measuring each string would
    // fit it tighter and make consecutive readings render at visibly different sizes.
    const fontFor = temperatureFahrenheit => only({ calls: draw({ temperatureFahrenheit }), name: 'fillText' })[0].font

    assert.match(fontFor(-12), /^bold 18\.66/)
    assert.match(fontFor(104), /^bold 18\.66/)
    assert.match(fontFor(-4), /^bold 28px/)
})

test('drawButtonIcon draws no ring when nobody measured the wind', () => {
    const calls = draw({ wind: UNREPORTED })

    assert.equal(arcs(calls).length, 1, 'the disc is the only circle')
    assert.equal(only({ calls, name: 'stroke' }).length, 0)
})

test('drawButtonIcon rings a calm reading lightly in the force 0 colour, with no bead', () => {
    // Calm is a positive report of still air. It must not look like absence (no ring) and must
    // not look like a wind (no bead).
    const calls = draw({ wind: CALM })
    const [, ring] = arcs(calls)

    assert.equal(arcs(calls).length, 2)
    assert.deepEqual(
        { endAngle: ring.endAngle, radius: ring.radius, startAngle: ring.startAngle, x: ring.x, y: ring.y },
        { endAngle: 2 * Math.PI, radius: 27, startAngle: 0, x: 32, y: 32 },
    )
    assert.equal(ring.strokeStyle, '#129bf7')
    assert.equal(ring.lineWidth, 2.5)
    assert.equal(ring.lineCap, 'butt')
})

test('drawButtonIcon rings a wind with no bearing heavily, with no bead', () => {
    // A VRB gust has a speed and no heading. A bead placed anywhere would assert the heading the
    // station explicitly refused to give. The gust is 15 over the sustained 6, so the ring takes
    // the announced 21 kt: force 5.
    const calls = draw({ wind: measured({ gustKnots: 21, knots: 6 }) })
    const [, ring] = arcs(calls)

    assert.equal(arcs(calls).length, 2)
    assert.equal(ring.strokeStyle, '#c8f640')
    assert.equal(ring.lineWidth, 6)
})

test('drawButtonIcon puts the bead on the upwind side of a light ring', () => {
    // Positions are the spec's checked values. Due north is a bearing of 0, which is a heading
    // the station reported, not a missing one: the guard reads `=== undefined` for exactly this,
    // and a truthiness test would hand a north wind the VRB ring.
    const beads = {
        0: [32, 5],
        90: [59, 32],
        180: [32, 59],
        202.5: [21.67, 56.94],
        225: [12.91, 51.09],
        270: [5, 32],
    }

    for (const [bearing, [x, y]] of Object.entries(beads)) {
        const calls = draw({ wind: measured({ bearingDegrees: Number(bearing), knots: 20 }) })
        const [, ring, bead] = arcs(calls)

        assert.equal(arcs(calls).length, 3, `bearing ${bearing}`)
        assert.equal(ring.lineWidth, 2.5, `bearing ${bearing}`)
        assert.deepEqual({ radius: bead.radius, x: round(bead.x), y: round(bead.y) }, { radius: 4.5, x, y }, `bearing ${bearing}`)
        assert.deepEqual(
            { endAngle: bead.endAngle, startAngle: bead.startAngle },
            { endAngle: 2 * Math.PI, startAngle: 0 },
            `bearing ${bearing}`,
        )
        assert.equal(bead.fillStyle, ring.strokeStyle, `bearing ${bearing}: the bead is the ring's own colour`)
    }
})

test('drawButtonIcon colours the ring by the announced speed', () => {
    // Both sides of the 10 kt gust margin, and the case sitting exactly on it.
    const colourOf = wind => arcs(draw({ wind }))[1].strokeStyle

    assert.equal(colourOf(SSW_15), '#6cf640')
    assert.equal(colourOf(measured({ bearingDegrees: 292.5, gustKnots: 31, knots: 22 })), '#dcf59d')
    assert.equal(colourOf(measured({ bearingDegrees: 270, gustKnots: 32, knots: 18 })), '#f5f69c')
    assert.equal(colourOf(measured({ bearingDegrees: 180, gustKnots: 65, knots: 55 })), '#f69c6e')
})

test('drawButtonIcon scales the whole face, so 16 and 32 are one drawing at two sizes', () => {
    const calls = draw({ size: 16, wind: SSW_15 })
    const [chip] = only({ calls, name: 'roundRect' })
    const [disc, ring, bead] = arcs(calls)

    assert.equal(chip.radius, 2.4)
    assert.deepEqual([disc.radius, ring.radius, bead.radius], [5.25, 6.75, 1.125])
    assert.equal(ring.lineWidth, 0.625)
})

test('drawButtonIcon throws on a wind state none of the three known branches handle', () => {
    // Restores the symmetry drawTrend used to have: every state is named, and an unrecognised one
    // throws instead of falling through into the measured branch and dying inside windColour.
    const bogus = { bearingDegrees: 90, knots: 10, state: 'bogus' }

    assert.throws(() => draw({ wind: bogus }), { message: 'cannot draw an unknown wind state: bogus' })
})

test('drawButtonIcon throws on an unknown wind state even when it carries no bearing', () => {
    // The guard once sat after the bearing-undefined branch, so a bogus state with no bearing
    // rendered as a silent heavy ring: a VRB face for a value that was never a wind.
    const bogus = { knots: 6, state: 'bogus' }

    assert.throws(() => draw({ wind: bogus }), { message: 'cannot draw an unknown wind state: bogus' })
})
