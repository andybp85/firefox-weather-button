import assert from 'node:assert/strict'
import { test } from 'node:test'
import { windBarbs } from '../src/wind-barbs.js'

const CENTRE = { x: 44, y: 44 }

const round = value => Math.round(value * 100) / 100

const pair = ({ x, y }) => [round(x), round(y)]

const radiusOf = ({ x, y }) => round(Math.hypot(x - CENTRE.x, y - CENTRE.y))

// Where each mark's root sits along the shaft, measured from the plot centre. That is what the
// slot arithmetic decides, and reading it back as a radius says it in the units the design does.
const rootRadii = marks => marks.map(({ points: [root] }) => radiusOf(root))

const lengthOf = ({ points: [root, tip] }) => round(Math.hypot(tip.x - root.x, tip.y - root.y))

test('windBarbs points the shaft at where the wind comes from, not where it is going', () => {
    // The station model's own convention, and the opposite of the button's dart. A wind from
    // the north puts the shaft above the station.
    const { shaft } = windBarbs({ bearingDegrees: 0, knots: 10 })

    assert.deepEqual(pair(shaft.from), [44, 40.4])
    assert.deepEqual(pair(shaft.to), [44, 14])
})

test('windBarbs draws one full barb at the tip for a wind that rounds to 10 kt', () => {
    // Rounding to 5 kt is the model's own rule, so an 8 kt wind is drawn as 10.
    const { marks } = windBarbs({ bearingDegrees: 45, knots: 8 })

    assert.equal(marks.length, 1)
    assert.equal(marks[0].filled, false)
    assert.deepEqual(marks[0].points.map(pair), [
        [65.21, 22.79],
        [77.38, 26.05],
    ])
})

test('windBarbs hangs a lone half barb one slot in from the tip', () => {
    // On the tip it reads as a fletching that fell off the end of the shaft.
    const { marks } = windBarbs({ bearingDegrees: 180, knots: 5 })

    assert.deepEqual(rootRadii(marks), [25.5])
    assert.equal(lengthOf(marks[0]), 6.3)
})

test('windBarbs puts the full barb on the tip and the half one slot back at 15 kt', () => {
    const { marks } = windBarbs({ bearingDegrees: 202.5, knots: 15 })

    assert.deepEqual(rootRadii(marks), [30, 25.5])
    assert.deepEqual(marks.map(lengthOf), [12.6, 6.3])
})

test('windBarbs steps four full barbs in from the tip at 40 kt', () => {
    const { marks } = windBarbs({ bearingDegrees: 0, knots: 38 })

    assert.deepEqual(rootRadii(marks), [30, 25.5, 21, 16.5])
})

test('windBarbs gives a pennant more of the shaft than a barb takes', () => {
    // A pennant is a triangle with a base along the shaft, so the mark after it starts further
    // in than one slot: 7.65 rather than 4.5.
    const { marks } = windBarbs({ bearingDegrees: 180, knots: 55 })
    const [pennant, half] = marks

    assert.equal(pennant.filled, true)
    assert.equal(pennant.points.length, 3)
    assert.deepEqual([radiusOf(pennant.points[0]), radiusOf(pennant.points[2])], [30, 24.15])
    assert.equal(radiusOf(half.points[0]), 22.35)
})

test('windBarbs draws the gust marks before the sustained ones', () => {
    // They are drawn first and the sustained marks land on top, so what shows past a sustained
    // barb is the gust's extra speed. Gusts are not in the station model at all — this is the
    // design's own extension of it, flagged here because a reader will look for it in WMO 306.
    const { marks } = windBarbs({ bearingDegrees: 292.5, gustKnots: 31, knots: 22 })

    assert.deepEqual(
        marks.map(({ gust }) => gust),
        [true, true, true, false, false],
    )
})

test('windBarbs stacks the marks on a vertical and draws no shaft when there is no bearing', () => {
    // The missing shaft is the signal: the marks report the speed and nothing claims a heading.
    // The plaque's direction line says 'variable' or 'no direction' in words beside it.
    const { marks, shaft } = windBarbs({ knots: 20 })

    assert.equal(shaft, undefined)
    assert.deepEqual(
        marks.map(({ points: [root] }) => pair(root)),
        [
            [44, 14],
            [44, 18.5],
        ],
    )
})

test('windBarbs draws nothing for a calm wind', () => {
    const { marks } = windBarbs({ bearingDegrees: 0, knots: 0 })

    assert.deepEqual(marks, [])
})
