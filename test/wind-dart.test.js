import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dartPoints } from '../src/wind-dart.js'

const FACE_CENTRE = { x: 32, y: 25 }

const round = value => Math.round(value * 100) / 100

const points = fromDegrees => dartPoints({ centre: FACE_CENTRE, fromDegrees, scale: 1 }).map(({ x, y }) => [round(x), round(y)])

// The compass bearing of a point from the plot centre, with y running down the face. Rounded
// before the wrap so that a bearing landing a hair under 360 comes back as 0 and not as -0,
// which deepEqual reads as a different number.
const bearingFromCentre = ({ x, y }) => (round((Math.atan2(x - FACE_CENTRE.x, FACE_CENTRE.y - y) * 180) / Math.PI) + 360) % 360

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

test('dartPoints sends the tip downwind of the centre at every bearing', () => {
    // This is the assertion that has to be made per bearing: a reach is rotation-invariant, so
    // sweeping the compass for one says no more than a single bearing does, while the heading the
    // tip takes is the whole reason the mark is drawn. The bearing is read back out of the point
    // with atan2 rather than rebuilt from the module's own basis vectors, so a sign error in
    // `forward` cannot cancel itself out between the code and its test.
    const bearings = [...Array(16).keys()].map(step => step * 22.5)
    const tipBearing = fromDegrees => bearingFromCentre(dartPoints({ centre: FACE_CENTRE, fromDegrees, scale: 1 })[0])

    assert.deepEqual(
        bearings.map(tipBearing),
        bearings.map(bearing => (bearing + 180) % 360),
    )
})

test('dartPoints keeps its vertices clear of the face edge and the comfort band', () => {
    // One bearing answers for all sixteen here, the rotation invariance the test above records.
    const reach = dartPoints({ centre: FACE_CENTRE, fromDegrees: 0, scale: 1 }).map(({ x, y }) =>
        Math.hypot(x - FACE_CENTRE.x, y - FACE_CENTRE.y),
    )
    const worst = Math.max(...reach)

    // 20.1 is the bound the spec worked out for a vertex. 25 is both the rise from the plot centre
    // to the top of the face and the drop to the comfort band, and the dart is stroked as well as
    // filled, so what has to clear the band is the vertex reach plus half of the 2-unit stroke.
    assert.ok(worst < 20.1, `worst vertex reach ${worst} is past the bound the spec checked`)
    assert.ok(worst + 1 < 25, `worst reach ${worst} leaves no room for the stroke`)
})

test('dartPoints scales the face about the centre it is given', () => {
    const [tip] = dartPoints({ centre: { x: 16, y: 12.5 }, fromDegrees: 180, scale: 0.5 })

    assert.deepEqual({ x: round(tip.x), y: round(tip.y) }, { x: 16, y: 4.5 })
})
