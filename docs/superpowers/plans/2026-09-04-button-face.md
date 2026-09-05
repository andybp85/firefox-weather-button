# The 0.4.0 Button Face Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the toolbar button's face with the temperature on a dewpoint-comfort disc, ringed in Beaufort colour
with a bead on the upwind side, and ship it as 0.4.0 once it has been seen through `setIcon` on a real toolbar.

**Architecture:** `button-icon.js` is rewritten around one frozen geometry constant and five small drawing verbs; it
reads the same decoded values as before (`comfort.js`, `beaufort.js`, `wind.js`) and draws a different face. The
dart module and the notable-wind rule are deleted, since the button was their only reader. `button.js` and
`background.js` change only in what they pass through: the temperature in, the pressure trend out of the face and
into the tooltip alone. The preview page and the docs describe the new face.

**Tech Stack:** Vanilla ES modules, no runtime dependencies. `node --test` with `node:assert/strict`; a recording
canvas context in the tests. Canvas 2D through `OffscreenCanvas` in the extension. oxfmt, oxlint, markdownlint.

**Spec:** `docs/superpowers/specs/2026-09-04-button-face-design.md` — read it alongside this plan. Where the spec and
this plan disagree on geometry, the spec wins; the canvas at
<https://claude.ai/code/artifact/1e24765d-341b-4f3a-9a82-5d50621f4573> (direction C, defaults) wins over both.

**Beans:** firefox-weather-button-xdex (the redesign; Tasks 1–6) and firefox-weather-button-b1by (the release; Task 7).

## Global Constraints

Every task's requirements implicitly include this section.

- **No new dependencies.** Neither runtime nor dev.
- **Browser support:** Baseline Widely Available. `roundRect`, `OffscreenCanvas`, `Object.freeze`. No polyfills.
- **The face is drawn in a 64-unit square** and scaled by `unit = size / 64`. Every number in the code is a face
  unit, never a pixel.
- **Geometry, verbatim from the spec:** ring radius 27, light stroke 2.5, heavy stroke 6, moat 3, bead diameter 9,
  type em 28, baseline offset 1. Disc radius is derived: `27 − 6 / 2 − 3 = 21`.
- **Sense is upwind:** the bead sits where the wind comes from. North is up the face.
- **Two colour systems and no third.** Disc and figure ink from `comfort.js`; ring and bead from `beaufort.js`'s
  `dark` values. The chip is the literal `#03083f`. Nothing else is coloured.
- **Nothing on the face but the chip, the disc, the ring, the bead, and up to three characters.** No pressure trend.
- **Formatting is the tools' job:** 4-space indent, 140 columns, no semicolons, single quotes, trailing commas, all
  from `.oxfmtrc.json`. Never hand-format; run `npm run format`.
- **Every task ends green:** `npm test`, `npm run format:check`, `npm run lint:js`, and
  `npx markdownlint-cli2 "**/*.md"` when Markdown changed.
- **Version target:** 0.4.0. Do not bump anything until Task 7.

## Before Task 1

Per the house workflow: the lint and secrets guards are already installed in this repo (`project-gates.sh` reports at
session start). Commit nothing on `main` that is not this plan; execute the tasks in a worktree
(`superpowers:using-git-worktrees`) on a branch named `button-face`, and merge to `main` with `--no-ff` when Task 5 is
green. Tasks 6 and 7 run on `main` after the merge, because Task 6 needs the user's own Firefox profile.

## Dispatch rule

**Every subagent brief for a task in this plan MUST carry the full text of the *Code rules* section at the foot of
this document, pasted verbatim into the brief's body.** A brief that points at the section instead of carrying it
delivers no constraint at all: the implementer sees only the brief. The same text goes to reviewers, so they check
against the same yardstick.

## File structure

| File                        | Responsibility                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| `src/button-icon.js`        | Rewritten. `FACE_GEOMETRY`; chip, disc, figures, ring, bead; one `drawButtonIcon` entry.    |
| `src/wind-dart.js`          | Deleted, with its test. The dart and the directionless ring go.                             |
| `src/wind.js`               | Loses `isNotable`, `isBrisk`, `NOTABLE_KNOTS`. Keeps `toWind`, `announcedKnots`, wording.   |
| `src/observation.js`        | One comment: the wind is a value because the button colours a ring by it.                   |
| `src/button.js`             | Passes `temperatureFahrenheit` through; the title leads with the temperature.               |
| `src/background.js`         | `rasterise` and `paintIcon` carry the temperature instead of the trend.                     |
| `docs/icon-preview.js/html` | The brief's case list and the compass sweep, on the new face.                               |
| `README.md`, `CHANGELOG.md` | The button described as it now is; `[Unreleased]` entries.                                  |
| `manifest.json`, `package.json` | Descriptions lead with the temperature. Version untouched until Task 7.                 |
| `docs/verification-log.md`  | The real-toolbar pass, recorded.                                                            |

---

### Task 1: The face — disc, figures, ring, bead

Closes the dart. `button-icon.js` is rewritten rather than edited: the band, the trend glyphs, the dart, and the
directionless ring all go, and nothing that stays keeps its old coordinates.

**Files:**

- Rewrite: `src/button-icon.js`
- Rewrite: `test/button-icon.test.js`
- Delete: `src/wind-dart.js`, `test/wind-dart.test.js`

**Interfaces:**

- Consumes: `comfortBand(dewpointFahrenheit)` → `{ background, foreground, label }` from `src/comfort.js`;
  `BEAUFORT[force].dark` and `beaufortForce(knots)` from `src/beaufort.js`; `announcedKnots({ gustKnots, knots })`
  from `src/wind.js`; a wind value `{ state: 'unreported' } | { state: 'calm' } | { bearingDegrees?, direction?,
  gustKnots?, knots, state: 'measured' }` from `toWind`.
- Produces: `drawButtonIcon({ context, dewpointFahrenheit, size, temperatureFahrenheit, wind })` and the frozen
  `FACE_GEOMETRY`. Task 3 calls the former with these exact names; Task 4 draws every preview case through it.

- [ ] **Step 1: Replace the test file with the new face's tests**

Write `test/button-icon.test.js` in full. The recording context is the shipped one, unchanged; every assertion below
reads the calls it records.

```js
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
            ...fields,
        })
    const context = {
        arc: (x, y, radius) => record('arc', { radius, x, y }),
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
    assert.deepEqual({ height: chips[0].height, radius: chips[0].radius, width: chips[0].width }, { height: SIZE, radius: 9.6, width: SIZE })
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
    assert.deepEqual({ radius: ring.radius, x: ring.x, y: ring.y }, { radius: 27, x: 32, y: 32 })
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
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test test/button-icon.test.js`
Expected: FAIL. `FACE_GEOMETRY` is not exported; the roundRect count is 2; `fillText` reads the dewpoint at
`y: 25`; there is no bead arc.

- [ ] **Step 3: Delete the dart**

```bash
git rm src/wind-dart.js test/wind-dart.test.js
```

- [ ] **Step 4: Rewrite `src/button-icon.js`**

```js
import { BEAUFORT, beaufortForce } from './beaufort.js'
import { comfortBand } from './comfort.js'
import { announcedKnots } from './wind.js'

// Every dimension below is in the 64-unit square the artboards were drawn in, scaled to the
// edge Firefox asks for. Working in the artboard's own units keeps each number checkable
// against the canvas, which fractions of the edge did not.
const FACE = 64
const CENTRE = 32

// Kit's toolbar-field indigo. The toolbar does not follow the page's colour scheme, so this is a
// fixed literal rather than a light-dark() pair, and the ring takes the Beaufort ramp's dark side
// in both schemes for the same reason.
const CHIP_INK = '#03083f'

const CORNER_RADIUS = 9.6
const FONT_STACK = 'system-ui, sans-serif'

// The canvas defaults for direction C (a bead on the ring), in the 64-unit face. Radii and stroke
// widths, except the bead, which is a diameter: it is the one mark a reader sizes as a dot. Frozen
// because the toolbar pass tunes the face by editing these seven numbers and nothing else.
//
// At 16 device pixels the bead is 2.25 px, the floor the 0.3.0 dart failed at. That mark failed on
// direction; the bead carries only position, which the canvas sweep showed distinct at every
// compass point. If it fails through setIcon, the fallback is a 90° heavy sweep in place of the
// bead: same ring, same three no-heading states, one different mark.
export const FACE_GEOMETRY = Object.freeze({
    baseline: 1,
    bead: 9,
    em: 28,
    heavy: 6,
    light: 2.5,
    moat: 3,
    ring: 27,
})

// Measured from the heavy stroke's inner edge, so the disc keeps the same clearance under a VRB
// ring as under a light one.
const DISC_RADIUS = FACE_GEOMETRY.ring - FACE_GEOMETRY.heavy / 2 - FACE_GEOMETRY.moat

// Two digits is the ordinary reading and gets the largest type the disc holds. A third
// character — a subfreezing '-4' rounds to two, but '-12' does not — shrinks the type in
// proportion instead of overflowing. Measuring the string would fit each one tighter, but then
// consecutive readings render at visibly different sizes, which looks like a bug.
const readingEm = ({ characters, em }) => (characters <= 2 ? em : (em * 2) / characters)

const radians = degrees => (degrees * Math.PI) / 180

// The point on the ring at a compass bearing, upwind: the bead sits where the wind comes from,
// the station-model convention the popup's barbs already follow. North is up the face, so the
// bearing is measured clockwise from the negative y axis.
const onRing = ({ bearingDegrees, unit }) => ({
    x: (CENTRE + FACE_GEOMETRY.ring * Math.sin(radians(bearingDegrees))) * unit,
    y: (CENTRE - FACE_GEOMETRY.ring * Math.cos(radians(bearingDegrees))) * unit,
})

const drawChip = ({ context, size, unit }) => {
    context.fillStyle = CHIP_INK
    context.beginPath()
    context.roundRect(0, 0, size, size, CORNER_RADIUS * unit)
    context.fill()
}

const drawDisc = ({ background, context, unit }) => {
    context.fillStyle = background
    context.beginPath()
    context.arc(CENTRE * unit, CENTRE * unit, DISC_RADIUS * unit, 0, 2 * Math.PI)
    context.fill()
}

const drawFigures = ({ context, foreground, temperatureFahrenheit, unit }) => {
    const figures = String(temperatureFahrenheit)

    context.fillStyle = foreground
    context.font = `bold ${unit * readingEm({ characters: figures.length, em: FACE_GEOMETRY.em })}px ${FONT_STACK}`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(figures, CENTRE * unit, (CENTRE + FACE_GEOMETRY.baseline) * unit)
}

const drawRing = ({ colour, context, stroke, unit }) => {
    context.strokeStyle = colour
    context.lineWidth = stroke * unit
    // There are no arc ends on this face, so the cap never shows; butt is set so that stays true
    // if a sweep ever replaces the bead.
    context.lineCap = 'butt'
    context.beginPath()
    context.arc(CENTRE * unit, CENTRE * unit, FACE_GEOMETRY.ring * unit, 0, 2 * Math.PI)
    context.stroke()
}

const drawBead = ({ bearingDegrees, colour, context, unit }) => {
    const { x, y } = onRing({ bearingDegrees, unit })

    context.fillStyle = colour
    context.beginPath()
    context.arc(x, y, (FACE_GEOMETRY.bead / 2) * unit, 0, 2 * Math.PI)
    context.fill()
}

// Calm carries no speed on the value, and 0 kt is force 0 by the chart's own first row.
const windColour = wind => BEAUFORT[beaufortForce(wind.state === 'calm' ? 0 : announcedKnots(wind))].dark

// The ring says how hard and the bead says from where. Calm is the light ring alone, a wind with
// no bearing is the heavy ring alone, and a wind nobody measured is no ring: three states a
// glance can tell apart, none of them claiming a heading the station never sent.
const drawWind = ({ context, unit, wind }) => {
    if (wind.state === 'unreported') return

    const colour = windColour(wind)
    if (wind.state === 'calm') return drawRing({ colour, context, stroke: FACE_GEOMETRY.light, unit })
    if (wind.bearingDegrees === undefined) return drawRing({ colour, context, stroke: FACE_GEOMETRY.heavy, unit })

    drawRing({ colour, context, stroke: FACE_GEOMETRY.light, unit })
    drawBead({ bearingDegrees: wind.bearingDegrees, colour, context, unit })
}

// Paints one square of the toolbar icon at the given edge length: the temperature in figures on
// a disc in the dewpoint's comfort colour, ringed by the wind in its Beaufort colour. The caller
// owns the canvas: this draws, and never reads the context back, so the same code serves both
// the extension's OffscreenCanvas and the preview page.
export const drawButtonIcon = ({ context, dewpointFahrenheit, size, temperatureFahrenheit, wind }) => {
    const { background, foreground } = comfortBand(dewpointFahrenheit)
    const unit = size / FACE

    context.clearRect(0, 0, size, size)
    drawChip({ context, size, unit })
    drawDisc({ background, context, unit })
    drawFigures({ context, foreground, temperatureFahrenheit, unit })
    drawWind({ context, unit, wind })
}
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `node --test test/button-icon.test.js`
Expected: PASS, 12 tests.

- [ ] **Step 6: Run the whole suite and the gates**

```bash
npm test
npm run format
npm run lint:js
```

Expected: `button.test.js` and `wind.test.js` still pass (they do not touch the face yet; `isNotable` is still
exported until Task 2). `docs/icon-preview.js` still passes `direction`, which `drawButtonIcon` now ignores; Task 4
fixes it. Format and lint clean.

- [ ] **Step 7: Commit**

```bash
git add src/button-icon.js test/button-icon.test.js src/wind-dart.js test/wind-dart.test.js
git commit -m "Draw the 0.4.0 face: temperature on a comfort disc, a Beaufort ring, a bead upwind" \
    -m "Replaces the band, the trend notch, and the dart. Geometry is the canvas defaults for direction C, frozen in FACE_GEOMETRY."
```

---

### Task 2: Retire the notable-wind rule

The button drew the wind only above a threshold. Every measured wind gets a ring now, so the threshold has no reader.

**Files:**

- Modify: `src/wind.js` (delete `NOTABLE_KNOTS`, `isBrisk`, `isNotable`; rewrite the `GUST_MARGIN_KNOTS` comment)
- Modify: `test/wind.test.js` (delete the three `isNotable` tests and the import)
- Modify: `src/observation.js:38-39` (one comment)

**Interfaces:**

- Consumes: nothing new.
- Produces: `src/wind.js` exports exactly `toWind`, `announcedKnots`, `describeWind`.

- [ ] **Step 1: Delete the tests for the rule**

In `test/wind.test.js`, delete the three tests named `isNotable is false for wind that was never measured or is calm`,
`isNotable turns on at the threshold, not above it`, and `isNotable promotes a gusting wind however light the sustained
speed is`, and change the import to:

```js
import { announcedKnots, toWind } from '../src/wind.js'
```

- [ ] **Step 2: Run the tests to see the suite still pass, and lint flag nothing yet**

Run: `node --test test/wind.test.js`
Expected: PASS. Nothing fails from removing a test; the failure this task fixes is the dead export.

- [ ] **Step 3: Delete the rule**

In `src/wind.js`, delete the `NOTABLE_KNOTS` export and its comment, the `isBrisk` function, and the `isNotable` export
and its comment. Rewrite the gust-margin comment so it no longer refers to a band:

```js
// A gust this far over the sustained wind is the wind you dress for, so it takes the button's
// ring colour. An absent gustKnots makes the subtraction NaN and NaN compares false, so the
// sustained speed wins with no guard of its own: the arithmetic is the guard.
const GUST_MARGIN_KNOTS = 10
```

In `src/observation.js`, replace the two-line comment above `wind: toWind(observation)` with:

```js
        // The wind is a value rather than a sentence: the button colours its ring by the figures,
        // and wind.js's describeWind owns the wording.
```

- [ ] **Step 4: Grep for stragglers**

```bash
grep -rn "isNotable\|NOTABLE_KNOTS\|isBrisk\|wind-dart\|dartPoints\|DIRECTIONLESS_RING" src test docs/icon-preview.js
```

Expected: no matches. (`README.md` and `CHANGELOG.md` still mention the dart; Task 5 rewrites them.)

- [ ] **Step 5: Run the suite and the gates**

```bash
npm test
npm run format
npm run lint:js
```

Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/wind.js test/wind.test.js src/observation.js
git commit -m "Retire the notable-wind rule; every measured wind rings the button now"
```

---

### Task 3: The button passes the temperature and leads the tooltip with it

**Files:**

- Modify: `src/button.js`
- Modify: `src/background.js:16-24`
- Modify: `test/button.test.js`
- Modify: `test/background.test.js`

**Interfaces:**

- Consumes: `drawButtonIcon({ context, dewpointFahrenheit, size, temperatureFahrenheit, wind })` from Task 1;
  `observation.temperatureFahrenheit` (rounded °F) from `src/observation.js`.
- Produces: `paintIcon({ dewpointFahrenheit, temperatureFahrenheit, wind })` is the injected raster's contract;
  the tooltip reads `<station> — <temp>F, dewpoint <dew>F (<label>), pressure <trend>, wind <words>`.

- [ ] **Step 1: Update the button tests**

In `test/button.test.js`, change `fakePaintIcon` to key its fake image on the temperature, and rewrite the two tests
that assert `painted`. The comment above `fakePaintIcon` now reads "which reading was handed to it".

```js
const fakePaintIcon = () => {
    const painted = []
    return { painted, paintIcon: request => (painted.push(request), { 16: `icon-${request.temperatureFahrenheit}` }) }
}
```

```js
test('the button draws the temperature, the dewpoint, and the wind from a live series', async () => {
    const { calls, fetch } = stubFetch({ 'https://aviationweather.gov': fixture('kewr-rising') })
    const { action, painted } = await run({ fetch, stationId: 'KEWR' })

    assert.deepEqual(painted, [{ dewpointFahrenheit: 58, temperatureFahrenheit: 74, wind: { state: 'calm' } }])
    assert.deepEqual(action.icons, [{ imageData: { 16: 'icon-74' } }])
    // The pressure trend has left the face, so the tooltip is the one place the button still says it.
    assert.equal(action.titles.at(-1), 'Newark Intl, NJ, US — 74F, dewpoint 58F (comfortable), pressure rising, wind calm')
    assert.ok(calls.length > 0)
})
```

Replace the existing gust-title test with one that covers the three wordings the face cannot draw as figures:

```js
// No recorded fixture carries these winds, so the newest record is given each one in turn. The
// rest of the series is left alone: the tendency still has to resolve from real data.
test('the tooltip words the wind on every path, including the ones the face draws without a bead', async () => {
    const series = fixture('kewr-rising')
    const titleFor = async wind => {
        const { fetch } = stubFetch({ 'https://aviationweather.gov': [{ ...series[0], ...wind }, ...series.slice(1)] })
        const { action } = await run({ fetch, stationId: 'KEWR' })
        return action.titles.at(-1)
    }

    assert.match(await titleFor({ wdir: 320, wgst: 27, wspd: 18 }), /wind NW 18 kt G 27$/)
    assert.match(await titleFor({ wdir: 'VRB', wgst: 21, wspd: 6 }), /wind variable 6 kt G 21$/)
    assert.match(await titleFor({ wdir: undefined, wspd: undefined }), /wind unreported$/)
})
```

In the cached-series test, change the expected `painted` to
`[{ dewpointFahrenheit: 58, temperatureFahrenheit: 74, wind: { state: 'calm' } }]`.

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test test/button.test.js`
Expected: FAIL. `painted` carries `direction: 'rising'` and no temperature; the title starts with `58F dewpoint`.

- [ ] **Step 3: Rewrite `describeButton` and `updateButton`'s call in `src/button.js`**

```js
const describeButton = ({ observation, tendency }) => {
    const { dewpointFahrenheit, stationName, temperatureFahrenheit, wind } = observation
    const { label } = comfortBand(dewpointFahrenheit)

    return {
        dewpointFahrenheit,
        temperatureFahrenheit,
        // The tooltip carries every reading the face draws and the one it dropped: the pressure
        // trend was unreadable at 16 px, and this line and the popup are where it lives now.
        title:
            `${stationName} — ${temperatureFahrenheit}F, dewpoint ${dewpointFahrenheit}F (${label}), ` +
            `pressure ${tendency.direction}, wind ${describeWind(wind)}`,
        wind,
    }
}
```

And in `updateButton`:

```js
        const { dewpointFahrenheit, temperatureFahrenheit, title, wind } = describeButton(model)
        await action.setIcon({ imageData: paintIcon({ dewpointFahrenheit, temperatureFahrenheit, wind }) })
```

Rewrite the comment above `updateButton`:

```js
// Paints the toolbar button from the current observation: the temperature in figures on a disc
// in the dewpoint's comfort colour, ringed by the wind in its Beaufort colour with a bead on the
// upwind side. paintIcon is injected because it needs a canvas, which is the one part of this
// that the test environment has no implementation of; everything above it is ordinary data.
```

- [ ] **Step 4: Run the button tests to see them pass**

Run: `node --test test/button.test.js`
Expected: PASS.

- [ ] **Step 5: Write the background wiring test**

`test/background.test.js` avoids `paintIcon` today because Node has no `OffscreenCanvas`. Give it one that records
what was written, and one case with a station and a warm cache so the refresh reaches the raster. Add to the file:

```js
import { readFileSync } from 'node:fs'
```

```js
const fixture = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url)))

// Node has no OffscreenCanvas. This one records the text each size was asked to draw and hands
// back a token in place of the raster; the drawing itself is button-icon.test.js's subject.
const fakeOffscreenCanvas = () => {
    const texts = []
    globalThis.OffscreenCanvas = class {
        constructor(width, height) {
            this.height = height
            this.width = width
        }
        getContext() {
            const size = this.width
            const ignore = () => {}
            return {
                arc: ignore,
                beginPath: ignore,
                clearRect: ignore,
                fill: ignore,
                fillText: text => texts.push({ size, text }),
                getImageData: () => `raster-${size}`,
                roundRect: ignore,
                stroke: ignore,
            }
        }
    }
    return texts
}
```

Change `runBackground` to take stored records, so one case can configure a station over a warm cache without touching
the network:

```js
const runBackground = async ({ records = {} } = {}) => {
    ...
    const storage = {
        get: async key => (key in records ? { [key]: records[key] } : {}),
        onChanged: listenerSlot(),
        set: async () => {},
    }
    ...
```

And the test:

```js
test('a configured station rasters the temperature at both toolbar sizes', async () => {
    // KEWR's newest fixture record is 23.3 °C, which rounds to 74 °F. Both sizes are painted from
    // one call, because Firefox picks whichever is nearest the toolbar's device pixel ratio.
    const texts = fakeOffscreenCanvas()
    const { action } = await runBackground({
        records: {
            'forecast:KEWR': { value: { properties: {} }, writtenAt: Date.now() },
            'observations:KEWR': { value: fixture('kewr-rising'), writtenAt: Date.now() },
            station: { stationId: 'KEWR' },
        },
    })

    assert.deepEqual(texts, [
        { size: 16, text: '74' },
        { size: 32, text: '74' },
    ])
    assert.deepEqual(action.icons.at(-1), { imageData: { 16: 'raster-16', 32: 'raster-32' } })
})
```

Update the file's header comment: the paragraph beginning "No case configures a station" now reads that only the
last case does, through a fake `OffscreenCanvas`, because the wiring from the reading to the raster is this file's to
prove.

- [ ] **Step 6: Run the background tests to see the new one fail**

Run: `node --test test/background.test.js`
Expected: the new test FAILS. `rasterise` passes `direction` and not `temperatureFahrenheit`, so `fillText` receives
`'undefined'`.

- [ ] **Step 7: Rewrite `rasterise` and `paintIcon` in `src/background.js`**

```js
const rasterise = ({ dewpointFahrenheit, size, temperatureFahrenheit, wind }) => {
    const context = new OffscreenCanvas(size, size).getContext('2d')
    drawButtonIcon({ context, dewpointFahrenheit, size, temperatureFahrenheit, wind })
    return context.getImageData(0, 0, size, size)
}

const paintIcon = ({ dewpointFahrenheit, temperatureFahrenheit, wind }) =>
    Object.fromEntries(ICON_SIZES.map(size => [size, rasterise({ dewpointFahrenheit, size, temperatureFahrenheit, wind })]))
```

- [ ] **Step 8: Run the suite and the gates**

```bash
npm test
npm run format
npm run lint:js
```

Expected: all green.

- [ ] **Step 9: Commit**

```bash
git add src/button.js src/background.js test/button.test.js test/background.test.js
git commit -m "Hand the button the temperature and lead the tooltip with it" \
    -m "The pressure trend has left the face; the tooltip is where the button still says it."
```

---

### Task 4: The preview page draws the brief's cases

**Files:**

- Modify: `docs/icon-preview.js`
- Modify: `docs/icon-preview.html:88-104` (lede and caption)

**Interfaces:**

- Consumes: `drawButtonIcon({ context, dewpointFahrenheit, size, temperatureFahrenheit, wind })` from Task 1;
  `toWind`, `describeWind` from `src/wind.js`.
- Produces: nothing code reads. `README.md` (Task 5) describes this page.

- [ ] **Step 1: Replace the case list**

In `docs/icon-preview.js`, replace `CASES` and its comment, and `COMPASS_CASES`, with:

```js
// One row per case, each written as the METAR fields the station sends rather than as a decoded
// wind, so the page exercises toWind() on the way in and reads the same wording the popup does.
// The set is the design brief's: the three no-heading states, both sides of the 10 kt gust margin,
// force 1 beside force 10, the readings that run to three characters, and the two comfort-ring
// pairings whose colours sit closest.
const CASES = [
    { dewpointFahrenheit: 48, metar: {}, note: 'Nothing measured: disc and figures, no ring', temperatureFahrenheit: 55 },
    { dewpointFahrenheit: 53, metar: { wdir: 210, wspd: 0 }, note: 'Calm: a light ring in the force 0 blue, no bead', temperatureFahrenheit: 61 },
    { dewpointFahrenheit: 58, metar: { wdir: 40, wspd: 14 }, note: 'An ordinary wind, force 4', temperatureFahrenheit: 66 },
    { dewpointFahrenheit: 63, metar: { wdir: 202.5, wspd: 15 }, note: 'SSW, force 4: the bead sits lower left', temperatureFahrenheit: 71 },
    { dewpointFahrenheit: 63, metar: { wdir: 292.5, wgst: 31, wspd: 22 }, note: 'Gust 9 over: the sustained wind keeps the colour', temperatureFahrenheit: 74 },
    { dewpointFahrenheit: 68, metar: { wdir: 270, wgst: 32, wspd: 18 }, note: 'Gust 14 over: the gust takes the colour', temperatureFahrenheit: 79 },
    { dewpointFahrenheit: 73, metar: { wdir: 180, wgst: 65, wspd: 55 }, note: 'Gust exactly 10 over: still the sustained wind, force 10', temperatureFahrenheit: 84 },
    { dewpointFahrenheit: 78, metar: { wdir: 'VRB', wgst: 21, wspd: 6 }, note: 'Variable: a heavy ring, no bead', temperatureFahrenheit: 86 },
    { dewpointFahrenheit: -4, metar: { wdir: 20, wspd: 8 }, note: 'Subfreezing, two characters', temperatureFahrenheit: 10 },
    { dewpointFahrenheit: -12, metar: {}, note: 'Three characters shrink the type', temperatureFahrenheit: -3 },
    { dewpointFahrenheit: 100, metar: { wdir: 160, wspd: 4 }, note: 'Three characters, no minus', temperatureFahrenheit: 104 },
    { dewpointFahrenheit: 60, metar: { wdir: 40, wspd: 3 }, note: 'Force 1: quiet enough not to nag', temperatureFahrenheit: 72 },
    { dewpointFahrenheit: 60, metar: { wdir: 40, wspd: 50 }, note: 'Force 10, beside force 1', temperatureFahrenheit: 72 },
    { dewpointFahrenheit: 63, metar: { wdir: 40, wspd: 30 }, note: 'Weak pairing: a sticky disc inside a force 7 ring', temperatureFahrenheit: 72 },
    { dewpointFahrenheit: 73, metar: { wdir: 40, wspd: 70 }, note: 'An oppressive disc inside a hurricane ring', temperatureFahrenheit: 88 },
]

// The sixteen compass points at one speed. The bead's sense is the one thing about this mark a
// reader can get backwards, so it gets a sweep to check against: the bead sits upwind, so a wind
// from the north puts it at the top of the face. No two neighbours may look alike at 16 px.
const COMPASS_CASES = [...Array(16).keys()].map(step => ({
    dewpointFahrenheit: 60,
    metar: { wdir: step * 22.5, wspd: 20 },
    note: 'Compass sweep',
    temperatureFahrenheit: 72,
}))
```

Then `paint` and `toExample`:

```js
const paint = ({ example, size }) => {
    const canvas = document.createElement('canvas')
    canvas.height = size
    canvas.width = size
    drawButtonIcon({
        context: canvas.getContext('2d'),
        dewpointFahrenheit: example.dewpointFahrenheit,
        size,
        temperatureFahrenheit: example.temperatureFahrenheit,
        wind: example.wind,
    })
    return canvas
}
```

```js
const toExample = ({ dewpointFahrenheit, metar, note, temperatureFahrenheit }) => {
    const wind = toWind(metar)
    return {
        dewpointFahrenheit,
        label: `${temperatureFahrenheit}F, dewpoint ${dewpointFahrenheit}F, wind ${describeWind(wind)}`,
        note,
        temperatureFahrenheit,
        wind,
    }
}
```

- [ ] **Step 2: Update the page's prose in `docs/icon-preview.html`**

The lede:

```html
            <p class="lede">
                Every case the toolbar button draws, rasterised by this browser at the sizes Firefox asks for: the
                temperature on a disc in the dewpoint's comfort colour, ringed by the wind in its Beaufort colour with a
                bead where the wind comes from. The icon is drawn by <code>src/button-icon.js</code> itself, so what you
                see here is what ships.
            </p>
```

The caption keeps its wording. Add one sentence to it: "This page is a browser canvas, not a toolbar: the real check
is the same cases through `setIcon` in a Firefox profile."

- [ ] **Step 3: Look at it**

```bash
npm run preview
```

Open <http://127.0.0.1:8765/docs/icon-preview.html>. Every row renders; the sweep row's beads walk clockwise from the
top; the calm, variable, and unreported rows are three different faces; `-3` and `104` fit inside the disc. Stop the
server. (The executing agent has no browser: note in the report that this step is the user's, and go on.)

- [ ] **Step 4: Run the gates**

```bash
npm run format
npm run lint:js
npm test
```

Expected: all green. `oxfmt` wraps the long case lines; that is its job.

- [ ] **Step 5: Commit**

```bash
git add docs/icon-preview.js docs/icon-preview.html
git commit -m "Preview the brief's cases on the 0.4.0 face"
```

---

### Task 5: Documentation

**Files:**

- Modify: `README.md` (intro; *The toolbar button*; *Preview the toolbar icon*; the second paragraph of *Verification*)
- Modify: `CHANGELOG.md` (`[Unreleased]`)
- Modify: `manifest.json:5`, `package.json:5` (descriptions only)

- [ ] **Step 1: Rewrite the README's intro and *The toolbar button***

Replace the first paragraph and everything under `## The toolbar button` down to (not including) `### Comfort bands`:

```markdown
A Firefox toolbar button that shows the current temperature on a disc coloured for how the
dewpoint feels, ringed by the wind, and opens a popup with local weather detail.

## The toolbar button

The button icon is drawn, not fixed. It is a rounded chip in the toolbar's own indigo. On the chip:

- A disc, filled with the colour of the comfort band that the dewpoint falls in (see the table
  below).
- The temperature in whole degrees Fahrenheit, on the disc, in black or white as the band reads
  best.
- A ring around the disc, in the Beaufort colour of the wind, with a bead on the ring where the
  wind comes from. A wind from the north puts the bead at the top of the face.

The ring takes the force of the gust when the gust is more than 10 kt above the sustained wind.
In every other case it takes the force of the sustained wind. The face does not say which; the
tooltip and the popup do.

Three winds have no bearing to mark. Calm air draws a thin ring in the force 0 colour and no
bead. A wind the station reports as variable draws a thick ring in its force colour and no bead.
When nobody measured the wind, there is no ring at all.

The 3-hour barometric pressure trend is not on the face. It was too small to read there. The
tooltip and the popup both carry it.

Point at the button to read the same values as text: the station name, the temperature, the
dewpoint and its comfort band, the pressure trend, and the wind written out.

The button refreshes every 10 minutes, and again as soon as you save a different station. It
shares its cache with the popup, so the two together make one set of requests, not two.

When no station is set, and when no reading is available at all, the button shows the plain
extension icon. The tooltip then states the reason. The button never shows a colour for a
dewpoint that was not measured.

```

- [ ] **Step 2: Rewrite *Preview the toolbar icon*'s first paragraph**

```markdown
[`docs/icon-preview.html`](docs/icon-preview.html) draws every case the button icon has, at the
sizes Firefox asks for. The cases cover calm, variable, and unreported wind, both sides of the
10 kt gust margin, force 1 beside force 10, the readings that run to three characters, and the two
comfort-and-ring pairings whose colours sit closest. A sweep of all sixteen compass points follows
them, so the bead's sense can be read off the page rather than derived. The page imports
`src/button-icon.js` and decodes its winds through `src/wind.js`, so it rasterises the shipping
code rather than a copy of it.
```

- [ ] **Step 3: Rewrite the *Verification* section's second paragraph**

```markdown
That check predates the plaque panel and the 0.4.0 button face. The face is the surface to look
at first: its bead is about two device pixels at 16 px, and the local preview page is not a
toolbar. The pass is recorded in the verification log once it has been made.
```

(Task 6 rewrites this paragraph again once the pass is recorded.)

- [ ] **Step 4: Add the changelog entries**

Under `## [Unreleased]`:

```markdown
### Changed

- The toolbar button's face. It now shows the temperature in figures on a disc filled with the
  dewpoint's comfort colour, ringed by the wind in its Beaufort colour with a bead on the ring
  where the wind comes from. Every measured wind draws the ring: calm is a thin ring with no
  bead, a variable wind a thick ring with no bead, and a wind nobody measured no ring. The gust
  rule is unchanged: the ring takes the gust's force when the gust is more than 10 kt over the
  sustained wind.
- The button's tooltip leads with the temperature and still names the dewpoint, its comfort
  band, the pressure trend, and the wind.

### Removed

- From the button's face: the dewpoint figures, the comfort band along the foot, the pressure
  trend notch, the compass dart, and the 15 kt threshold below which the wind was not drawn.
  The dewpoint and the trend stay in the tooltip and on the popup.
```

- [ ] **Step 5: The two descriptions**

`manifest.json` line 5 and `package.json` line 5 both become:

```text
Temperature, dewpoint comfort, and wind on the toolbar; pressure trend, cloud base, and thunder probability in the popup. From the National Weather Service.
```

`package.json` is on oxfmt's ignore list: edit by hand, keep the 4-space indent.

- [ ] **Step 6: Run the gates**

```bash
npx markdownlint-cli2 "**/*.md"
npm run lint
npm test
```

Expected: markdownlint clean; `web-ext lint` no errors, no warnings; the suite green.

- [ ] **Step 7: Commit, then merge**

```bash
git add README.md CHANGELOG.md manifest.json package.json
git commit -m "Describe the 0.4.0 button face"
```

Then, from the main worktree, `git merge --no-ff button-face`, run `npm test` on `main`, and remove the worktree and
the branch.

---

### Task 6: See it through `setIcon` on a real toolbar

This task is the user's: it needs a Firefox Developer Edition profile, the Kit theme, a 1× display and a 2× display.
The agent's part is to prepare the snippet, wait, and record what the user reports. Do not call the bean done on the
preview page alone.

**Files:**

- Modify: `docs/verification-log.md` (append a section)
- Modify: `README.md` (the *Verification* paragraph from Task 5, Step 3)
- Modify: `.beans/firefox-weather-button-xdex--redesign-the-toolbar-button-for-040.md`

- [ ] **Step 1: Launch the extension**

```bash
npm start
```

`web-ext run` opens a temporary profile. Apply the Kit Developer Edition theme to it, and pin the button to the
toolbar.

- [ ] **Step 2: Drive `setIcon` with synthetic readings**

Open `about:debugging#/runtime/this-firefox`, find Weather Button, and click *Inspect* to open the background page's
console. Paste this. It draws the compass sweep through the same `setIcon` path the extension uses, one bearing every
1.5 seconds, and ships nothing: it lives in the console only.

```js
const { drawButtonIcon } = await import(browser.runtime.getURL('src/button-icon.js'))
const raster = (reading, size) => {
    const context = new OffscreenCanvas(size, size).getContext('2d')
    drawButtonIcon({ context, size, ...reading })
    return context.getImageData(0, 0, size, size)
}
const show = reading => browser.action.setIcon({ imageData: { 16: raster(reading, 16), 32: raster(reading, 32) } })
const wind = (bearingDegrees, knots, gustKnots) => ({ bearingDegrees, gustKnots, knots, state: 'measured' })
const cases = [
    ...[...Array(16).keys()].map(step => ({ dewpointFahrenheit: 60, temperatureFahrenheit: 72, wind: wind(step * 22.5, 20) })),
    { dewpointFahrenheit: 53, temperatureFahrenheit: 61, wind: { state: 'calm' } },
    { dewpointFahrenheit: 60, temperatureFahrenheit: 72, wind: wind(40, 3) },
    { dewpointFahrenheit: 78, temperatureFahrenheit: 86, wind: { gustKnots: 21, knots: 6, state: 'measured' } },
    { dewpointFahrenheit: 60, temperatureFahrenheit: 72, wind: wind(40, 50) },
    { dewpointFahrenheit: 48, temperatureFahrenheit: 55, wind: { state: 'unreported' } },
    { dewpointFahrenheit: -12, temperatureFahrenheit: -3, wind: { state: 'unreported' } },
    { dewpointFahrenheit: 100, temperatureFahrenheit: 104, wind: wind(160, 4) },
    { dewpointFahrenheit: 63, temperatureFahrenheit: 72, wind: wind(40, 30) },
]
let step = 0
const timer = setInterval(() => show(cases[step++ % cases.length]), 1500)
// clearInterval(timer) stops it; the next refresh alarm repaints the live reading.
```

- [ ] **Step 3: Look, on both displays, in both themes**

For each of the Kit theme and the default theme, on a 1× display and a 2× display, judge at the toolbar's own size:

- The sixteen beads: does each neighbouring pair read as a different bearing? Does north sit at the top?
- Calm beside force 1: is the thin ring visible, and does force 1 stay quiet?
- Variable beside force 10: does the thick ring read as "wind, no heading", not as a bigger disc?
- Unreported: disc and figures only; nothing that reads as a ring.
- `-3` and `104`: inside the disc, legible.
- The sticky disc in the force 7 ring: is the ring still seen as a ring?

- [ ] **Step 4: Record the pass**

Append to `docs/verification-log.md`:

```markdown
## 0.4.0 button face — <date>

Driven through `browser.action.setIcon` from the background page's console with the snippet in
`docs/superpowers/plans/2026-09-04-button-face.md`, Task 6. Firefox Developer Edition <version>, Kit theme and the
default theme, <display description>.

| Case | 1× | 2× | Notes |
| --- | --- | --- | --- |
| Compass sweep, 16 points | | | |
| Calm beside force 1 | | | |
| Variable beside force 10 | | | |
| Unreported | | | |
| `-3` and `104` | | | |
| Sticky disc, force 7 ring | | | |

Verdict: <the bead reads / the bead does not read; fallback to the sweep>.
```

Fill each cell with `pass` or what was seen. If the bead fails, stop here: open a bean for the sweep fallback
(`FACE_GEOMETRY` gains `sweep: 90`, `drawBead` gives way to a `drawSweep` that strokes a heavy arc from
`bearing − 45°` to `bearing + 45°` over the light ring) and do not proceed to Task 7 until it has passed the same
check.

- [ ] **Step 5: Rewrite the README's *Verification* paragraph and close the bean's last item**

The paragraph from Task 5, Step 3 becomes:

```markdown
The 0.4.0 button face has been seen through `setIcon` on a real toolbar, in both themes, at 1× and
2×; the pass is in the log. The plaque panel has not had the same pass.
```

```bash
beans update firefox-weather-button-xdex \
    --body-replace-old "[ ] Verify at 16 px on a real toolbar through setIcon, both themes, before it is called done" \
    --body-replace-new "[x] Verify at 16 px on a real toolbar through setIcon, both themes, before it is called done (<date>)"
```

Also check off the plan item on the bean, append a `## Summary of Changes` section naming the face, the retired dart
and threshold, the tooltip, the preview page, and the docs, and set the bean to `completed`.

- [ ] **Step 6: Commit**

```bash
git add docs/verification-log.md README.md .beans/
git commit -m "Record the 0.4.0 face's real-toolbar pass"
```

---

### Task 7: Release 0.4.0

Closes bean firefox-weather-button-b1by. Blocked on Task 6's verdict.

**Files:**

- Modify: `manifest.json`, `package.json`, `CHANGELOG.md`
- Modify: `.beans/firefox-weather-button-b1by--release-040.md`

- [ ] **Step 1: Confirm the bump with the semver skill**

Invoke the `versioning-with-semver` skill against the `[Unreleased]` entries. The public surface is the extension's UI
and its stored settings: the face changes what it reports, no setting is renamed, and no stored data changes shape.
That is a minor bump, 0.3.0 to 0.4.0. Record what the skill says.

- [ ] **Step 2: Bump both version fields**

`manifest.json` and `package.json` both carry `"version": "0.3.0"`. Set both to `0.4.0`. `package.json` is on oxfmt's
ignore list, so edit it by hand and keep its 4-space indent.

- [ ] **Step 3: Close the changelog section**

Change `## [Unreleased]` to `## [0.4.0] - <date>`, using the date the release is cut. Leave no empty `## [Unreleased]`
heading behind; Keep a Changelog adds it back at the next change.

- [ ] **Step 4: Verify the packaged build**

```bash
npm test
npm run format:check
npm run lint:js
npx markdownlint-cli2 "**/*.md"
npm run lint
npm run build
```

Expected: all green, and `web-ext-artifacts/` holds a `weather_button-0.4.0.zip` (the name follows the manifest's
`name`; check the directory rather than trusting this line).

- [ ] **Step 5: Update the bean and commit**

Check off the release bean's four todo items, append a `## Summary of Changes` naming the face and the version, set it
to `completed`, and commit the bump, the changelog, and the bean file together:

```bash
git add manifest.json package.json CHANGELOG.md .beans/
git commit -m "Release 0.4.0"
```

- [ ] **Step 6: Tag**

```bash
git tag -a v0.4.0 -m "0.4.0 — temperature on a comfort disc, ringed by the wind"
```

Do not push. The user pushes when they choose to.

## Follow-ups, not in this plan

- The sweep fallback, only if Task 6 fails the bead. Its shape is written into Task 6, Step 4.
- The plaque panel has still not been seen in a real profile. Task 6 is a chance to glance at it, but it is not this
  plan's gate.
- firefox-weather-button-cj8j, the intermittent `popup-main.test.js` failure. Unrelated; if it fires during a task's
  suite run, rerun once and report it.

## Self-review notes

Checked after writing, against the spec:

- Every spec section maps to a task. *The face*: Task 1. *Tooltip*: Task 3. *Modules*: Tasks 1 (`button-icon.js`,
  `wind-dart.js`), 2 (`wind.js`, `observation.js`), 3 (`button.js`, `background.js`), 4 (preview), 5 (README,
  changelog, descriptions). *Testing*: Tasks 1–3, with the spec's `background.test.js` item satisfied by a fake
  `OffscreenCanvas` rather than skipped. *Verification*: Task 6. The release: Task 7.
- Names are consistent across tasks: `FACE_GEOMETRY`, `drawButtonIcon({ context, dewpointFahrenheit, size,
  temperatureFahrenheit, wind })`, `paintIcon({ dewpointFahrenheit, temperatureFahrenheit, wind })`,
  `announcedKnots`, `describeWind`, `toWind`.
- The type shrink is `28 · 2 / 3 = 18.666…`, asserted as a prefix match on `18.66` because the float's tail is the
  engine's, not the spec's.
- Task 1's `windColour` handles calm before `announcedKnots` sees it: a calm value carries no `knots`, and
  `beaufortForce(NaN)` is `-1`.
- The README's *Verification* paragraph is written twice on purpose: Task 5 says the pass is pending, Task 6 says it
  was made. A reader of `main` between the two sees the honest state.

## Code rules

> These rules outrank this plan. Where a code sample above contradicts one, follow the rule and say so in your report.

Matched by `~/.claude/hooks/rules_inject.py` against the paths this plan creates and modifies. Paste this whole
section, verbatim, into the body of every subagent brief and every review brief. See *Dispatch rule* above.

```text
The user's standing code rules for this file type, from ~/.claude/rules/.
They outrank any task brief, plan, or surrounding code that contradicts them:
if a brief specifies code that breaks a rule below, follow the rule and say so.

--- general.md ---
# General code style

Cross-language principles. Language rules stack on top; CLAUDE.md holds architecture (functional paradigms, YAGNI, Pike, DRY).

## Mindset

- readability over writability — hard thinking at write-time makes reading cheap
- simple (cheap to reason about) over easy (cheap to write)
- minimize accidental complexity; spend the budget on the problem itself
- structure every unit to fit in working memory: small, labeled, composable pieces
- fix small messes before they rot

## Functions

- one concept per function; do exactly what the name says — a name that feels dumb to type means it shouldn't be a function
- build a vocabulary of small, composable functions
- aim short; split over ~20 lines or high cognitive complexity — never split a single concept to hit a number
- entry points (`main`, scripts) may stay long once pure logic is factored out — locality wins there
- ≤3 heterogeneous positional params (hard max 4); beyond that, named/keyword args
- explicit inputs and outputs over hidden state mutation

## Control flow & shape

- flatten: guard clauses / early returns; isolate unavoidably deep logic in its own function
- short conditionals; never mix `&&` and `||` in one test — extract or split
- declarative over imperative; `map`/`filter`/`reduce` (pure) over `forEach`/loops (side-effecting)
- break long call/method chains into well-named intermediates
- familiar, consistent patterns over exotic syntax/sugar (least surprise)

## State & effects

- treat data as immutable — mutate during construction, then freeze
- no action-at-a-distance: no global mutable state; behavior readable locally
- isolate side effects (I/O) at the edges; keep core logic pure
- declare near first use, minimize liveness span; no long-lived cross-function mutable vars (use an object or refactor)
- acquire returns release: `open`/`attach`/`subscribe`/`lock` hands back its own undo — no "am I open" flag to keep in sync

## Naming

- name by purpose — never `value`, `data`, `temp`
- functions are verbs, variables nouns, collections plural; single letters only in tight iteration
- visually distinct names (no `i`/`j`, `item`/`items` pairs); never shadow
- descriptive names don't excuse bad design; over-long names are bloat too
- alphabetize wherever order is otherwise arbitrary

## Abstractions

- abstractions must be lawful — obey what they imply (consistent equality, no surprising special cases); a leaky or misleading one
  explodes cognitive load, a lawful one reduces it

## Errors

- never pass silently, unless explicitly silenced
- throw to let the caller decide — don't swallow at the point of occurrence
- catch only the specific condition you can handle; re-throw the rest
- an essential missing value throws — never returns empty/`undefined`

## Comments & docs

- comment the *why*; a needed "what" means unclear code — clarify first (hard math/algorithms/perf excepted)
- comment the non-obvious: what a reader would ask, what you had to re-derive, non-specific catches, unrefactored hacks
- staleness-fear doesn't excuse omission — names go stale too; prefer assertions over comments documenting assumptions
- colocate docs with what they describe; read nearby commentary before editing
- cite what a URL is *for*; mark workarounds with removal criteria; flag cross-file coupling on both sides
- generate API docs from source, never hand-maintain a parallel copy; tests are documentation

## Testing

- CLAUDE.md holds the strategy (test-first, regression tests, mock boundaries); code-level additions below
- a bug signals excess complexity — fix the root cause and structure, not just the symptom
- set up mocks/spies in the test that uses them (locality over DRY)

## Hygiene

- no dead or vestigial code (unused imports, params, variables)
- no stray debug output in committed code (`console.log`, `print`); error logging is fine
- LF line endings

## Tooling

- the formatter owns formatting; if it's wrong, fix the config, not the file
- a suppression names its one rule and states the invariant that earns it — narrowest scope; never bare, never file-wide where a line does
- the same rule suppressed everywhere = wrong rule for the project — off in config, once, with the reason
- stdout is a tool's product in a CLI entry point and debug noise everywhere else; suppress the print rule at the site, not repo-wide

--- html.md ---
# HTML style

- head order: charset, viewport, meta (description/author/theme-color/robots), title, stylesheet, icons, manifest
- root-relative absolute paths for assets (`/styles/...`, `/images/...`) so pages work from any subdir
- scripts before `</body>`; `type="module"` for ES modules; keep inline scripts minimal
- attributes alphabetized; leave line breaking to the formatter — it breaks one per line past the print width
- void elements carry the self-closing slash (`<meta ... />`, `<img ... />`) — oxfmt writes it; `.vnu-filter` documents why the checker
  stays quiet about it
- entity-escape literal `&`/`<` in text content

--- js.md ---
# JavaScript style

- omit optional syntax: no semicolons (ASI), no parens on single-param arrows, no braces on single-statement blocks
- const by default; let only when reassigned; never var
- prefer `undefined` over `null` (use `null` only when an API requires it); avoid `undefined` as a meaningful value
- general.md's acquire-returns-release: wrap `addEventListener` in a closure returning the `removeEventListener`, or an `AbortSignal` for
  a whole group
- ES modules; root-relative import paths (`/api.js`)
- module-private means not exported — no `_`-prefix convention; `#name` fields for genuinely private class state
- prefer modern built-ins/DOM APIs, destructuring, and shorthand over manual equivalents

--- markdown.md ---
# Markdown style

markdownlint enforces most of this, once a repo has a `.markdownlint-cli2.jsonc`, and `--fix` takes most of what it finds
(run it twice — one pass is not a fixpoint). Deliberately *not* oxfmt, though it reads markdown: it reformats the code
inside a fence, which restyles dated design records and agent-written `.beans/` issues. What no tool decides for you is
the line length, whether a fence has a language, and whether the link text says anything.

- 140-char line limit; exempt code blocks, tables, and unbreakable tokens (long URLs, link refs)
- ATX headers (`#`), never Setext (`===`/`---`); one H1 per doc; don't skip levels
- blank line around headers, lists, code blocks, and tables
- fenced code blocks (```` ``` ````), always language-tagged; never indented blocks
- `-` for unordered lists; `1.` lazy numbering for ordered (let the renderer count)
- descriptive link text, never "click here"; no bare URLs — wrap in `<...>` or a link
- reference-style links when a URL repeats or inline would blow the line limit
- no trailing whitespace; single trailing newline; no consecutive blank lines
- tables only when data is genuinely tabular; pad the cells to a common width — MD060 expects it and `--fix` writes it,
  so hand-trimmed cells are the thing that drifts
- comment the *why* for non-obvious structure via HTML comments (`<!-- -->`)

--- objects.md ---
# Object and collection style

- alphabetize all object properties to the extent possible
- prefer objects with semantically-relevant keys to arrays, unless modeling an actual list

--- web.md ---
# Web platform rules

- browser support: Baseline Widely Available by default; newer features only as graceful progressive enhancements — no polyfills, no
  external deps
- no redundant or vestigial markup or styles — delete dead, unused, and overridden rules, elements, and attributes
- beyond the language rules, defer to modern-web-guidance
```
