import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FULL_LIFT_KNOTS, windsockPolygons } from '../src/windsock.js'

const ORIGIN = { x: 100, y: 100 }
const SCALE = 10

const sock = ({ gusting = false, knots }) => windsockPolygons({ gusting, knots, origin: ORIGIN, scale: SCALE })

// The sock's own axis: the midpoint of its far end, measured from the pivot the mast hangs on.
// Every claim about lift is a claim about where this point sits, so it is derived once here.
const reach = polygons => {
    const [, farLeft, farRight] = polygons.sock
    return { x: (farLeft.x + farRight.x) / 2 - ORIGIN.x, y: (farLeft.y + farRight.y) / 2 - ORIGIN.y }
}

test('the mast hangs straight down from the pivot at every wind speed', () => {
    for (const knots of [0, 15, 60]) {
        const { mast } = sock({ knots })
        const sides = [...new Set(mast.map(({ x }) => x - ORIGIN.x))]
        const ends = [...new Set(mast.map(({ y }) => y - ORIGIN.y))].sort((one, other) => one - other)

        assert.equal(sides.length, 2, `the mast is not a vertical bar at ${knots} kt`)
        assert.equal(sides[0] + sides[1], 0, `the mast is off its own pivot at ${knots} kt`)
        assert.deepEqual([ends.length, ends[0]], [2, 0], `the mast does not start at the pivot at ${knots} kt`)
        assert.ok(ends[1] > 0, `the mast rises above the pivot at ${knots} kt rather than hanging from it`)
    }
})

test('a calm sock hangs down the mast rather than streaming sideways', () => {
    const { x, y } = reach(sock({ knots: 0 }))

    assert.ok(Math.abs(x) < 0.001, `a calm sock must not lean: leaned ${x}`)
    assert.equal(Math.round(y), SCALE)
})

test('a sock at full lift streams horizontally', () => {
    const { x, y } = reach(sock({ knots: FULL_LIFT_KNOTS }))

    assert.equal(Math.round(x), SCALE)
    assert.ok(Math.abs(y) < 0.001, `a fully lifted sock must not droop: drooped ${y}`)
})

test('lift rises with the wind between hanging and horizontal', () => {
    const lifts = [0, 10, 20, 30, FULL_LIFT_KNOTS].map(knots => reach(sock({ knots })).y)

    for (const [index, droop] of lifts.slice(1).entries()) assert.ok(droop < lifts[index], `${droop} did not lift above ${lifts[index]}`)
})

test('a wind beyond full lift stays horizontal rather than whipping past it', () => {
    // A sock cannot rise above its mast. Without the clamp the cone would swing over the top
    // and read as a falling wind, which is the opposite of what a gale is doing.
    assert.deepEqual(reach(sock({ knots: 90 })), reach(sock({ knots: FULL_LIFT_KNOTS })))
})

test('the sock tapers from a wide mouth at the pivot to a narrow tip', () => {
    const [mouthLeft, farLeft, farRight, mouthRight] = sock({ knots: FULL_LIFT_KNOTS }).sock
    const span = (one, other) => Math.hypot(one.x - other.x, one.y - other.y)

    assert.ok(span(mouthLeft, mouthRight) > span(farLeft, farRight), 'the mouth must be wider than the tip')
})

test('a steady wind draws no gust tick', () => {
    assert.equal(sock({ gusting: false, knots: 20 }).gust, undefined)
})

test('the gust tick flies detached, beyond the sock tip and on its axis', () => {
    const polygons = sock({ gusting: true, knots: FULL_LIFT_KNOTS })
    const tip = reach(polygons)

    for (const { x } of polygons.gust) assert.ok(x - ORIGIN.x > tip.x, `gust tick at ${x} is not clear of the tip`)
    for (const { y } of polygons.gust) assert.ok(Math.abs(y - ORIGIN.y) < SCALE / 2, 'the gust tick must sit on the sock axis')
})

test('every polygon is placed by the origin and sized by the scale', () => {
    const small = windsockPolygons({ gusting: true, knots: 20, origin: { x: 0, y: 0 }, scale: 1 })
    const large = windsockPolygons({ gusting: true, knots: 20, origin: ORIGIN, scale: SCALE })

    for (const part of ['gust', 'mast', 'sock']) {
        const scaled = small[part].map(({ x, y }) => ({ x: ORIGIN.x + x * SCALE, y: ORIGIN.y + y * SCALE }))
        assert.deepEqual(large[part], scaled, `${part} does not scale about the origin`)
    }
})
