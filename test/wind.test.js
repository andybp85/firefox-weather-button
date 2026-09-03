import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NOTABLE_KNOTS, announcedKnots, isNotable, toWind } from '../src/wind.js'

test('toWind reads an absent speed as unreported rather than as calm', () => {
    // An omitted wspd means nobody measured the wind. Calling it calm asserts a reading that
    // was never taken — the same class of claim as naming a cardinal for an absent wdir.
    assert.deepEqual(toWind({}), { state: 'unreported' })
})

test('toWind reads an explicit zero speed as calm', () => {
    assert.deepEqual(toWind({ wdir: 0, wspd: 0 }), { state: 'calm' })
})

test('toWind reads calm before it reads direction, so a VRB calm is still calm', () => {
    assert.deepEqual(toWind({ wdir: 'VRB', wspd: 0 }), { state: 'calm' })
})

test('toWind names the cardinal point a numeric bearing falls in', () => {
    // 350 deg is 10 deg from due north: N spans 348.75-11.25, so this is N, not NNW.
    assert.deepEqual(toWind({ wdir: 350, wspd: 7 }), { bearingDegrees: 350, direction: 'N', knots: 7, state: 'measured' })
})

test('toWind rounds a mid-sector bearing to the nearest point', () => {
    // 340 deg sits inside NNW's 326.25-348.75 span.
    assert.equal(toWind({ wdir: 340, wspd: 7 }).direction, 'NNW')
})

test('toWind leaves the direction out when the report carries no bearing', () => {
    assert.deepEqual(toWind({ wspd: 7 }), { knots: 7, state: 'measured' })
})

test('toWind reads a literal VRB bearing as a variable direction', () => {
    // AWC sends wdir as the string 'VRB' for genuinely variable wind rather than omitting it;
    // a cardinal for it would be computed from NaN.
    assert.equal(toWind({ wdir: 'VRB', wspd: 3 }).direction, 'variable')
})

test('toWind carries the gust alongside the sustained speed', () => {
    assert.deepEqual(toWind({ wdir: 320, wgst: 27, wspd: 18 }), {
        bearingDegrees: 320,
        direction: 'NW',
        gustKnots: 27,
        knots: 18,
        state: 'measured',
    })
})

test('toWind drops a gust that does not exceed the sustained speed', () => {
    // A gust is by definition the peak above the sustained wind. "18 kt G 18" reports nothing
    // the sustained figure has not already said, and a gust below it is a bad record.
    assert.equal(toWind({ wgst: 18, wspd: 18 }).gustKnots, undefined)
    assert.equal(toWind({ wgst: 12, wspd: 18 }).gustKnots, undefined)
})

test('toWind reads a gust with no sustained speed as unreported', () => {
    // A gust alone measures nothing: the peak is defined against a sustained wind that this
    // record does not carry. Promoting it to a speed would invent the measurement.
    assert.deepEqual(toWind({ wgst: 27 }), { state: 'unreported' })
})

test('isNotable is false for wind that was never measured or is calm', () => {
    assert.equal(isNotable({ state: 'unreported' }), false)
    assert.equal(isNotable({ state: 'calm' }), false)
})

test('isNotable turns on at the threshold, not above it', () => {
    assert.equal(isNotable(toWind({ wspd: NOTABLE_KNOTS - 1 })), false)
    assert.equal(isNotable(toWind({ wspd: NOTABLE_KNOTS })), true)
})

test('isNotable promotes a gusting wind however light the sustained speed is', () => {
    // A wind that swings from 4 to 14 kt is doing something a single figure cannot describe,
    // which is the whole reason the button gives the band to the sock.
    assert.equal(isNotable(toWind({ wgst: 14, wspd: 4 })), true)
})

test('toWind keeps the numeric bearing beside the cardinal it names', () => {
    // The plaque's shaft needs degrees and the text needs the cardinal. Deriving the degrees
    // back from the cardinal would round WNW's 293 to the point's centre and draw a shaft the
    // station never reported.
    assert.deepEqual(toWind({ wdir: 293, wspd: 22 }), { bearingDegrees: 293, direction: 'WNW', knots: 22, state: 'measured' })
})

test('toWind carries no bearing for a variable wind', () => {
    assert.equal(toWind({ wdir: 'VRB', wspd: 18 }).bearingDegrees, undefined)
})

test('toWind carries no bearing when the station omits the direction', () => {
    assert.equal(toWind({ wspd: 18 }).bearingDegrees, undefined)
})

test('announcedKnots reads the sustained speed when there is no gust', () => {
    assert.equal(announcedKnots({ knots: 18 }), 18)
})

test('announcedKnots keeps the sustained speed for a gust exactly at the margin', () => {
    // The rule is "more than 10 kt over", not "at least": 55 gusting 65 is still a force 10 wind.
    assert.equal(announcedKnots({ gustKnots: 65, knots: 55 }), 55)
})

test('announcedKnots takes the gust when it is more than 10 kt over the sustained wind', () => {
    assert.equal(announcedKnots({ gustKnots: 32, knots: 18 }), 32)
})
