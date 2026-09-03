import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dartPoints } from '../src/wind-dart.js'

const FACE_CENTRE = { x: 32, y: 25 }

const round = value => Math.round(value * 100) / 100

const points = fromDegrees => dartPoints({ centre: FACE_CENTRE, fromDegrees, scale: 1 }).map(({ x, y }) => [round(x), round(y)])

test('dartPoints flies a due south wind straight up the face', () => {
    // Downwind, the map convention: a wind from the south blows north, so the tip is above the
    // centre. This is the case where the map convention and the panel's station-model barbs
    // visibly disagree, and the artboard's own sample is the reference for which one wins here.
    assert.deepEqual(points(180), [
        [32, 9],
        [45, 39],
        [32, 32],
        [19, 39],
    ])
})

test('dartPoints matches the artboard for the SSW sample', () => {
    assert.deepEqual(points(202.5), [
        [38.12, 10.22],
        [38.65, 42.91],
        [29.32, 31.47],
        [14.63, 32.96],
    ])
})

test('dartPoints keeps every bearing clear of the face edge and the comfort band', () => {
    // 25 units is both the rise from the plot centre to the top of the face and the drop to the
    // comfort band. The dart is stroked as well as filled, so the reach that has to clear it is
    // the vertex reach plus half of the 2-unit stroke.
    const bearings = [...Array(16).keys()].map(step => step * 22.5)
    const reach = bearings.flatMap(bearing =>
        dartPoints({ centre: FACE_CENTRE, fromDegrees: bearing, scale: 1 }).map(({ x, y }) =>
            Math.hypot(x - FACE_CENTRE.x, y - FACE_CENTRE.y),
        ),
    )
    const worst = Math.max(...reach)

    assert.ok(worst + 1 < 25, `worst reach ${worst} leaves no room for the stroke`)
})

test('dartPoints scales the face about the centre it is given', () => {
    const [tip] = dartPoints({ centre: { x: 16, y: 12.5 }, fromDegrees: 180, scale: 0.5 })

    assert.deepEqual({ x: round(tip.x), y: round(tip.y) }, { x: 16, y: 4.5 })
})
