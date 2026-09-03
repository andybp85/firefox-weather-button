import assert from 'node:assert/strict'
import { test } from 'node:test'
import { HIGH_CLOUD_FEET, cloudSky, skyHeight } from '../src/cloud-sky.js'

const round = value => Math.round(value * 100) / 100

const sky = ({ baseFeet = 2990, layers = [] } = {}) => cloudSky({ baseFeet, layers })

test('skyHeight places the checked heights where the artboard drew them', () => {
    // A square-root scale, not a linear one: linearly, everything below 5,000 ft — where almost
    // every reported ceiling lives — piles into the bottom eighth of the plaque.
    const heights = [400, 2990, 4500, 6100, 25000]

    assert.deepEqual(
        heights.map(feet => round(skyHeight(feet))),
        [101.38, 93.37, 90.51, 87.96, 69.49],
    )
})

test('skyHeight stands the ground 6 units above the foot of the plot', () => {
    assert.equal(skyHeight(0), 106)
})

test('skyHeight clamps a layer above the ceiling rather than drawing it off the top', () => {
    assert.equal(round(skyHeight(40000)), round(skyHeight(30000)))
    assert.equal(round(skyHeight(30000)), 66)
})

test('cloudSky draws the computed base on every sky, including a clear one', () => {
    // The dashed line is the plaque's whole point: the computed base against what was reported.
    assert.deepEqual(round(sky().base.y), 93.37)
    assert.deepEqual(sky().layers, [])
})

test('cloudSky centres a single FEW puff in the row', () => {
    const [layer] = sky({ layers: [{ baseFeet: 4500, cover: 'FEW' }] }).layers

    assert.deepEqual(
        layer.ellipses.map(({ cx, rx }) => [round(cx), round(rx)]),
        [[68, 13.6]],
    )
    assert.equal(layer.circles.length, 3)
    assert.deepEqual(layer.rects, [])
})

test('cloudSky spreads a row across the plot with one more gap than it has puffs', () => {
    const scattered = sky({ layers: [{ baseFeet: 4500, cover: 'SCT' }] }).layers[0]
    const broken = sky({ layers: [{ baseFeet: 4500, cover: 'BKN' }] }).layers[0]

    assert.deepEqual(
        scattered.ellipses.map(({ cx, rx }) => [round(cx), round(rx)]),
        [
            [40.23, 15.3],
            [95.77, 15.3],
        ],
    )
    assert.deepEqual(
        broken.ellipses.map(({ cx, rx }) => [round(cx), round(rx)]),
        [
            [36.83, 25.5],
            [99.17, 25.5],
        ],
    )
})

test('cloudSky draws overcast as a lid rather than as more puffs', () => {
    // An overcast sky has no gaps in it, so more puffs would be the wrong drawing however many
    // there were. The lid overhangs both edges so no seam shows at the plaque's rounded corner.
    const [layer] = sky({ layers: [{ baseFeet: 1200, cover: 'OVC' }] }).layers

    assert.equal(layer.rects.length, 1)
    assert.deepEqual({ width: layer.rects[0].width, x: layer.rects[0].x }, { width: 144, x: -4 })
    assert.deepEqual(
        layer.circles.map(({ r }) => r),
        [7.92, 7.92, 7.92, 7.92, 7.92],
    )
    assert.deepEqual(layer.ellipses, [])
})

test('cloudSky sends a layer at the atlas low/mid boundary to the far colour', () => {
    const far = sky({ layers: [{ baseFeet: HIGH_CLOUD_FEET, cover: 'SCT' }] }).layers[0].far
    const near = sky({ layers: [{ baseFeet: HIGH_CLOUD_FEET - 1, cover: 'SCT' }] }).layers[0].far

    assert.deepEqual({ far, near }, { far: true, near: false })
})

test('cloudSky keeps the layers in the order it was given, high to low', () => {
    const { layers } = sky({
        layers: [
            { baseFeet: 25000, cover: 'BKN' },
            { baseFeet: 4500, cover: 'SCT' },
        ],
    })

    assert.deepEqual(
        layers.map(({ ellipses: [first] }) => round(first.cy)),
        [71.65, 92.67],
    )
})

test('cloudSky leaves out a vertical visibility report', () => {
    // VV is how far up you can see through an obscuration, not a cloud deck at a height. Drawing
    // it as a layer would put a solid deck on the plaque where the sky is merely opaque.
    assert.deepEqual(sky({ layers: [{ baseFeet: 200, cover: 'VV' }] }).layers, [])
})
