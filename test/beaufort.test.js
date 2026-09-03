import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BEAUFORT, beaufortColour, beaufortForce } from '../src/beaufort.js'

test('beaufortForce names the force a speed falls in at every threshold edge', () => {
    // The edges are the whole question. WMO code table 1100 gives each force a closed knot
    // range, and an off-by-one at any boundary paints the wrong colour on both surfaces.
    const edges = [
        { force: 0, knots: 0 },
        { force: 1, knots: 1 },
        { force: 1, knots: 3 },
        { force: 2, knots: 4 },
        { force: 3, knots: 7 },
        { force: 4, knots: 11 },
        { force: 5, knots: 17 },
        { force: 6, knots: 22 },
        { force: 7, knots: 28 },
        { force: 8, knots: 34 },
        { force: 9, knots: 41 },
        { force: 10, knots: 48 },
        { force: 11, knots: 56 },
        { force: 11, knots: 63 },
        { force: 12, knots: 64 },
    ]

    assert.deepEqual(
        edges.map(({ knots }) => beaufortForce(knots)),
        edges.map(({ force }) => force),
    )
})

test('beaufortForce puts a hurricane-force wind on the last row rather than off the end', () => {
    assert.equal(beaufortForce(140), 12)
})

test('BEAUFORT holds the thirteen forces of the scale, open at the top', () => {
    assert.equal(BEAUFORT.length, 13)
    assert.equal(BEAUFORT.at(-1).below, Infinity)
})

test('beaufortColour pairs the light partner with the dark one, light first', () => {
    // The popup writes this straight into a style attribute, so the scheme picks the partner
    // and neither surface has to know which scheme it is being read in.
    assert.equal(beaufortColour(4), 'light-dark(#287a03, #6cf640)')
})

test('every force carries a light partner distinct from its dark colour', () => {
    // All thirteen chart colours fail AA on the light plaque, so a row that forgot its partner
    // would render unreadable text in the light scheme and pass every other test in this file.
    for (const { dark, light, name } of BEAUFORT) assert.notEqual(light, dark, `force ${name} has no light partner`)
})
