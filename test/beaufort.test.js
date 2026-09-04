import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BEAUFORT, beaufortColour, beaufortForce } from '../src/beaufort.js'

test('beaufortForce names the force a speed falls in at every threshold edge', () => {
    // The edges are the whole question. WMO code table 1100 gives each force a closed knot
    // range, and an off-by-one at any boundary paints the wrong colour on both surfaces.
    // Both edges of every force, because a lower edge alone cannot catch a `below` that is one
    // knot short: with force 2 ending at 6 instead of 7, beaufortForce(7) is still 3.
    const edges = [
        { force: 0, knots: 0 },
        { force: 1, knots: 1 },
        { force: 1, knots: 3 },
        { force: 2, knots: 4 },
        { force: 2, knots: 6 },
        { force: 3, knots: 7 },
        { force: 3, knots: 10 },
        { force: 4, knots: 11 },
        { force: 4, knots: 16 },
        { force: 5, knots: 17 },
        { force: 5, knots: 21 },
        { force: 6, knots: 22 },
        { force: 6, knots: 27 },
        { force: 7, knots: 28 },
        { force: 7, knots: 33 },
        { force: 8, knots: 34 },
        { force: 8, knots: 40 },
        { force: 9, knots: 41 },
        { force: 9, knots: 47 },
        { force: 10, knots: 48 },
        { force: 10, knots: 55 },
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

test('BEAUFORT holds the thirteen rows of the design spec, the last open at the top', () => {
    // The whole table, hex for hex, because two of its values are decisions rather than samples
    // and neither leaves a mark anywhere else: force 12's dark is lifted off the chart's #c93f14
    // to reach 4.15:1 on --tile, a recorded exception, and every light partner is an OKLCH L 0.52
    // value picked to clear 4.5:1 there. Reverting either is a silent accessibility regression.
    assert.deepEqual(BEAUFORT, [
        { below: 1, dark: '#129bf7', light: '#056eb2', name: 'calm' },
        { below: 4, dark: '#6cc8f7', light: '#02729b', name: 'light air' },
        { below: 7, dark: '#7dcabf', light: '#25766d', name: 'light breeze' },
        { below: 11, dark: '#13dd14', light: '#017c02', name: 'gentle breeze' },
        { below: 17, dark: '#6cf640', light: '#287a03', name: 'moderate breeze' },
        { below: 22, dark: '#c8f640', light: '#5a7203', name: 'fresh breeze' },
        { below: 28, dark: '#dcf59d', light: '#5e7216', name: 'strong breeze' },
        { below: 34, dark: '#f5f69c', light: '#6f6d03', name: 'near gale' },
        { below: 41, dark: '#f1d860', light: '#7b6902', name: 'gale' },
        { below: 48, dark: '#f6be15', light: '#856502', name: 'strong gale' },
        { below: 56, dark: '#f69c6e', light: '#a65324', name: 'storm' },
        { below: 64, dark: '#f66d15', light: '#b14a02', name: 'violent storm' },
        { below: Infinity, dark: '#f05a2a', light: '#c13900', name: 'hurricane' },
    ])
})

test('beaufortColour pairs the light partner with the dark one, light first', () => {
    // The popup writes this straight into a style attribute, so the scheme picks the partner
    // and neither surface has to know which scheme it is being read in.
    assert.equal(beaufortColour(4), 'light-dark(#287a03, #6cf640)')
})
