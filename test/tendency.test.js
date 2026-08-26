import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { resolveTendency } from '../src/tendency.js'

const fixture = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url)))

test('resolveTendency prefers the reported synoptic value when it is rising', () => {
    assert.deepEqual(resolveTendency(fixture('kewr-rising')), {
        direction: 'rising',
        hPa: 1.5,
        observedAt: '2026-08-26T12:00:00.000Z',
        provenance: 'reported',
        windowHours: 3,
    })
})

test('resolveTendency reads a negative reported value as falling', () => {
    assert.deepEqual(resolveTendency(fixture('kord-falling')), {
        direction: 'falling',
        hPa: -1.2,
        observedAt: '2026-08-26T12:00:00.000Z',
        provenance: 'reported',
        windowHours: 3,
    })
})

test('resolveTendency prefers the computed series when the signs genuinely conflict', () => {
    // KDFW reported -0.7 for a window ending up to 3h ago; its series since then is +0.8.
    assert.deepEqual(resolveTendency(fixture('kdfw-sign-conflict')), {
        direction: 'rising',
        hPa: 0.8,
        observedAt: '2026-08-26T13:00:00.000Z',
        provenance: 'computed',
        windowHours: 3,
    })
})

test('a flat computed series does not discard the reported tendency', () => {
    // KSEA reports -0.4 while its own 3h series is exactly 0.0. Math.sign(0) is 0, so a
    // naive sign comparison would call this a conflict and show "steady" instead.
    assert.deepEqual(resolveTendency(fixture('ksea-zero-computed')), {
        direction: 'falling',
        hPa: -0.4,
        observedAt: '2026-08-26T12:00:00.000Z',
        provenance: 'reported',
        windowHours: 3,
    })
})

test('resolveTendency falls back to the sea-level pressure series', () => {
    // AWC omits presTend outside the 3-hourly synoptic reports; strip it to force the fallback.
    const stripped = fixture('kord-falling').map(({ presTend, ...observation }) => observation)
    const tendency = resolveTendency(stripped)
    assert.equal(tendency.provenance, 'computed')
    assert.equal(tendency.direction, 'falling')
    assert.equal(tendency.windowHours, 3)
})

test('resolveTendency throws on an empty series', () => {
    assert.throws(() => resolveTendency([]), /empty/)
})
