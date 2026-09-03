# Kit Panel and Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the popup panel as a 2×2 of instrumented stat plaques and replace the toolbar button's windsock with
a compass dart in the Beaufort colour, both on Kit Developer Edition tokens, and ship it as 0.3.0.

**Architecture:** Four new pure geometry modules (`beaufort`, `wind-barbs`, `wind-dart`, `cloud-sky`) own every number
the two surfaces draw, and return points rather than drawing them, so one geometry serves the button's canvas and the
panel's SVG and a `node --test` process can read both back. `popup.js` and `button-icon.js` stay the only impure
consumers. `windsock.js` is deleted rather than deprecated: it has never shipped.

**Tech Stack:** Vanilla ES modules, no runtime dependencies. `node --test` with `node:assert/strict` and jsdom for the
popup. Canvas 2D for the button, inline SVG for the panel. oxfmt, oxlint, stylelint, markdownlint.

**Spec:** `docs/superpowers/specs/2026-09-03-kit-panel-and-button-design.md` — read it alongside this plan. Where the
spec and this plan disagree on geometry, the spec wins; the canvas at
<https://claude.ai/code/artifact/57afcd6c-62e7-4886-90df-501611581e30> wins over both.

**Bean:** firefox-weather-button-o09n (release 0.3.0). The design bean firefox-weather-button-gxdu is completed.

## Global Constraints

Every task's requirements implicitly include this section.

- **No new dependencies.** Neither runtime nor dev. The platform has everything this needs.
- **Browser support:** Baseline Widely Available. `light-dark()`, `roundRect` with a per-corner radius array,
  `replaceChildren`, and `Intl.NumberFormat` all qualify. No polyfills.
- **Kit tokens, never hex, in CSS.** `--accent` `--bg` `--bg-deep` `--cloud` `--danger` `--font-body` `--font-display`
  `--ink` `--muted` `--on-hot` `--panel` `--raised` `--sun` `--tile`. The two exceptions are the button's chrome
  literals `#03083f` (toolbar-field indigo) and `#e6e8ff` (chrome text), which do not follow the page's scheme.
- **Panel width:** 304 px, written `19rem`. Unchanged.
- **One hot element per view.** The panel's is the pressure trend glyph in `--accent`. Nothing else takes the orange.
- **Labels:** 9.6 px (`0.6rem`), weight 600, uppercase, `letter-spacing: 0.14em`, `--muted`.
- **`font-variant-numeric: tabular-nums` on every element that holds a number.**
- **Formatting is the tools' job:** 4-space indent, 140 columns, no semicolons, single quotes, trailing commas —
  all from `.oxfmtrc.json`. Never hand-format; run `npm run format`.
- **Every task ends green:** `npm test`, `npm run format`, `npm run lint:js`, and `npx stylelint src/ui.css` when
  CSS changed.
- **Version target:** 0.3.0. Do not bump anything until Task 13.

## Dispatch rule

**Every subagent brief for a task in this plan MUST carry the full text of the *Code rules* section at the foot of
this document, pasted verbatim into the brief's body.** A brief that points at the section instead of carrying it
delivers no constraint at all: the implementer sees only the brief. The same text goes to reviewers, so they check
against the same yardstick.

## File structure

| File | Responsibility |
| --- | --- |
| `src/beaufort.js` | New. The thirteen forces: knot thresholds, names, dark and light colours. |
| `src/wind-dart.js` | New. The button's compass-dart vertices, and the ring for a wind with no bearing. |
| `src/wind-barbs.js` | New. The panel's station-model shaft, barbs, and pennants in the 88-unit plot. |
| `src/cloud-sky.js` | New. The cloud plaque's height scale, puffs, and overcast lid in the 136×112 plot. |
| `src/wind.js` | Gains `bearingDegrees` on a measured wind and `announcedKnots`. |
| `src/observation.js` | `cloudLayers` as data; the `clouds` sentence goes. |
| `src/button-icon.js` | Chip, comfort band, trend notch, dart. Sock, `WIND_LAYOUT`, corner trend go. |
| `src/popup.html` | The header, the 2×2 plaque grid, the thunder strip, the footer. |
| `src/ui.css` | The panel's rules, replacing everything from `.popup` down. `.options` is untouched. |
| `src/popup.js` | Renders the above. Owns the barometer needle angle and the cloud sentence. |
| `src/windsock.js` | Deleted, with `test/windsock.test.js`. |
| `docs/icon-preview.js` | Its case list is rebuilt around the dart's thresholds. |

---

### Task 1: The Beaufort ramp

**Files:**

- Create: `src/beaufort.js`
- Test: `test/beaufort.test.js`

**Interfaces:**

- Consumes: nothing.
- Produces: `BEAUFORT`, an array of 13 rows `{ below: number, dark: string, light: string, name: string }` indexed by
  force; `beaufortForce(knots: number) → number` in 0..12; `beaufortColour(force: number) → string` of the form
  `light-dark(#light, #dark)`.

- [x] **Step 1: Write the failing test**

Create `test/beaufort.test.js`:

```js
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
```

- [x] **Step 2: Run the test and watch it fail**

Run: `npm test -- --test-name-pattern beaufort`
Expected: FAIL, `Cannot find module '../src/beaufort.js'`.

- [x] **Step 3: Write the module**

Create `src/beaufort.js`:

```js
// The Beaufort scale, WMO code table 1100, thresholds in knots. `below` is exclusive, so the
// first row a speed fits is its force and the last row catches everything above the chart —
// the same shape comfort.js uses for the dewpoint bands, and for the same reason.
//
// Colours are sampled from the printed Beaufort chart this project reads the scale off. Two
// departures from it, both forced by contrast on the popup's plaques (--tile):
//   - force 12's dark value is lifted from the chart's #c93f14 to #f05a2a, 2.8:1 to 4.15:1.
//     That is still under the 4.5:1 AA asks for the plaque's 11px gust text — a recorded
//     exception, not an oversight: darkening it further loses the top of the ramp to force 11.
//   - every light partner is its chart colour's own OKLCH hue held at L 0.52, the first step
//     where all thirteen clear 4.5:1 on --tile. The chart's own colours all fail there (1.0-2.8).
export const BEAUFORT = [
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
]

// The force of an unrounded speed. The 5-knot rounding the barbs are drawn at is a drawing
// concern and stays in wind-barbs.js: rounding here would move a 33 kt wind up to force 8.
export const beaufortForce = knots => BEAUFORT.findIndex(force => knots < force.below)

// One string that serves both schemes, so the popup never has to ask which one it is in. The
// button does not use this — its face is Kit's toolbar indigo in both schemes, so it takes the
// dark hex directly.
export const beaufortColour = force => `light-dark(${BEAUFORT[force].light}, ${BEAUFORT[force].dark})`
```

- [x] **Step 4: Run the test and watch it pass**

Run: `npm test -- --test-name-pattern beaufort`
Expected: PASS, 5 tests.

- [x] **Step 5: Format, lint, commit**

```bash
npm run format
npm run lint:js
npm test
git add src/beaufort.js test/beaufort.test.js
git commit -m "feat: add the Beaufort ramp as one source of force and colour"
```

---

### Task 2: The wind value gains a bearing and an announced speed

**Files:**

- Modify: `src/wind.js`
- Test: `test/wind.test.js`

**Interfaces:**

- Consumes: nothing.
- Produces: `toWind` now returns `bearingDegrees` alongside `direction` when `wdir` is a number, and omits it
  otherwise; `announcedKnots({ gustKnots, knots }) → number`.

- [x] **Step 1: Write the failing tests**

Add to `test/wind.test.js`. Change the existing import line to
`import { NOTABLE_KNOTS, announcedKnots, isNotable, toWind } from '../src/wind.js'`, then append:

```js
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
```

- [x] **Step 2: Run the tests and watch them fail**

Run: `npm test -- --test-name-pattern "bearing|announcedKnots"`
Expected: FAIL — `announcedKnots is not a function`, and the bearing case reports a missing property.

- [x] **Step 3: Extend the module**

In `src/wind.js`, add beside `NOTABLE_KNOTS`:

```js
// A gust this far over the sustained wind is the wind you dress for, so it takes the button's
// colour. An absent gustKnots makes the subtraction NaN and NaN compares false, so the
// sustained speed wins with no guard of its own: the arithmetic is the guard.
const GUST_MARGIN_KNOTS = 10
```

Add beside `isNotable`, which makes the same kind of judgement about what a wind has earned:

```js
// The speed the button colours itself by: the sustained wind, unless the gust is far enough
// over it to be the reading that matters.
export const announcedKnots = ({ gustKnots, knots }) => (gustKnots - knots > GUST_MARGIN_KNOTS ? gustKnots : knots)
```

In `toWind`, add the bearing to the returned value, above `direction`:

```js
    return {
        // The cardinal is for text and the degrees are for the plaque's shaft; both are left
        // off a variable or unreported direction rather than defaulted, so nothing downstream
        // can draw a heading the station never sent. toDirection() reads the same field for
        // its own 'variable' case — the two guards are the one decision, spelled twice.
        ...(typeof wdir === 'number' ? { bearingDegrees: wdir } : {}),
        ...(direction === undefined ? {} : { direction }),
        ...(gustKnots === undefined ? {} : { gustKnots }),
        knots: wspd,
        state: 'measured',
    }
```

- [x] **Step 4: Run the whole suite**

Run: `npm test`
Expected: PASS. `observation.test.js` asserts on whole wind values; if any of its expectations now miss
`bearingDegrees`, add the property to that fixture's expectation — the new field is the point.

- [x] **Step 5: Format, lint, commit**

```bash
npm run format
npm run lint:js
npm test
git add src/wind.js test/wind.test.js test/observation.test.js
git commit -m "feat: carry the wind's bearing and announce the speed that colours the button"
```

---

### Task 3: The compass dart

**Files:**

- Create: `src/wind-dart.js`
- Test: `test/wind-dart.test.js`

**Interfaces:**

- Consumes: nothing.
- Produces: `dartPoints({ centre: { x, y }, fromDegrees: number, scale: number }) → [{ x, y } × 4]`, wound tip, right
  wing, tail notch, left wing; `DIRECTIONLESS_RING = { radius: 10, stroke: 6 }` in 64-unit face units.

- [x] **Step 1: Write the failing test**

Create `test/wind-dart.test.js`:

```js
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
        dartPoints({ centre: FACE_CENTRE, fromDegrees: bearing, scale: 1 }).map(({ x, y }) => Math.hypot(x - FACE_CENTRE.x, y - FACE_CENTRE.y)),
    )
    const worst = Math.max(...reach)

    assert.ok(worst + 1 < 25, `worst reach ${worst} leaves no room for the stroke`)
})

test('dartPoints scales the face about the centre it is given', () => {
    const [tip] = dartPoints({ centre: { x: 16, y: 12.5 }, fromDegrees: 180, scale: 0.5 })

    assert.deepEqual({ x: round(tip.x), y: round(tip.y) }, { x: 16, y: 4.5 })
})
```

- [x] **Step 2: Run the test and watch it fail**

Run: `npm test -- --test-name-pattern dartPoints`
Expected: FAIL, `Cannot find module '../src/wind-dart.js'`.

- [x] **Step 3: Write the module**

Create `src/wind-dart.js`:

```js
// The compass dart the toolbar button draws for a notable wind, in the 64-unit face the
// artboards were drawn in. Station-model barbs were tried here first and lost: at 16 device
// pixels a barb is under two pixels wide, so the mark that survives has to be one bold shape.
//
// The notched tail and the absent shaft are what make it read as a compass needle rather than
// as an arrow. An arrow at this size is mostly shaft, and the shaft is the part that vanishes.
const DART = { notch: 7, tip: 16, wingBack: 14, wingOut: 13 }

// A wind with no bearing still has a speed. The button draws this ring in the force colour in
// place of the dart: it reports the speed and claims no heading, which is the honest reading of
// a VRB report. The panel's plaque answers the same case with barbs and no shaft.
export const DIRECTIONLESS_RING = { radius: 10, stroke: 6 }

// The dart flies downwind, the map convention: a north wind points down the face. The panel's
// barbs point the other way, toward the source, because that is the station-model grammar an
// enthusiast already reads. The split is deliberate and is recorded in the design spec.
const DOWNWIND_DEGREES = 180

const radians = degrees => (degrees * Math.PI) / 180

// Wound tip, right wing, tail notch, left wing, so a canvas path or an SVG polygon closes
// correctly straight off the list. `centre` and the result are in the caller's own units, and
// `scale` carries the 64-unit face into them.
export const dartPoints = ({ centre, fromDegrees, scale }) => {
    const heading = radians(fromDegrees + DOWNWIND_DEGREES)
    const forward = { x: Math.sin(heading), y: -Math.cos(heading) }
    // Screen right of `forward`, with y running down the face.
    const right = { x: Math.cos(heading), y: Math.sin(heading) }

    const at = ({ across, along }) => ({
        x: centre.x + scale * (along * forward.x + across * right.x),
        y: centre.y + scale * (along * forward.y + across * right.y),
    })

    return [
        at({ across: 0, along: DART.tip }),
        at({ across: DART.wingOut, along: -DART.wingBack }),
        at({ across: 0, along: -DART.notch }),
        at({ across: -DART.wingOut, along: -DART.wingBack }),
    ]
}
```

- [x] **Step 4: Run the test and watch it pass**

Run: `npm test -- --test-name-pattern dartPoints`
Expected: PASS, 4 tests. The worst reach is 19.11, the wings' `hypot(14, 13)`.

- [x] **Step 5: Format, lint, commit**

```bash
npm run format
npm run lint:js
npm test
git add src/wind-dart.js test/wind-dart.test.js
git commit -m "feat: add the compass dart geometry for the toolbar button"
```

---

### Task 4: The toolbar button — band, notch, dart

**Files:**

- Modify: `src/button-icon.js` (full rewrite of the drawing; `readingEm` and `fillPolygon` survive)
- Modify: `docs/icon-preview.js:20-42` (the `CASES` list)
- Test: `test/button-icon.test.js` (full rewrite)

**Interfaces:**

- Consumes: `BEAUFORT` and `beaufortForce` from Task 1; `announcedKnots` and `isNotable` from Task 2; `dartPoints`
  and `DIRECTIONLESS_RING` from Task 3.
- Produces: `drawButtonIcon({ context, dewpointFahrenheit, direction, size, wind })`, signature unchanged.

- [x] **Step 1: Replace the test file**

Replace `test/button-icon.test.js` entirely:

```js
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { drawButtonIcon } from '../src/button-icon.js'

// 64 is the face's own unit square, so every expected number below is the artboard's number
// with no scaling arithmetic in the way. The 16 px case is a size question, not a geometry
// one, and lives on docs/icon-preview.html where it can be looked at.
const SIZE = 64

const CHIP_INK = '#03083f'
const CHROME_INK = '#e6e8ff'

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
            lineWidth: context.lineWidth,
            strokeStyle: context.strokeStyle,
            ...fields,
        })
    const context = {
        arc: (x, y, radius) => record('arc', { radius, x, y }),
        beginPath: () => record('beginPath'),
        clearRect: (x, y, width, height) => record('clearRect', { height, width, x, y }),
        closePath: () => record('closePath'),
        fill: () => record('fill'),
        fillText: (text, x, y) => record('fillText', { text, x, y }),
        lineTo: (x, y) => record('lineTo', { x, y }),
        moveTo: (x, y) => record('moveTo', { x, y }),
        roundRect: (x, y, width, height, radius) => record('roundRect', { height, radius, width, x, y }),
        stroke: () => record('stroke'),
    }
    return { calls, context }
}

const CALM = { state: 'calm' }
const SSW_15 = { bearingDegrees: 202.5, knots: 15, state: 'measured' }

const draw = ({ dewpointFahrenheit = 68, direction = 'steady', size = SIZE, wind = CALM } = {}) => {
    const { calls, context } = recordingContext()
    drawButtonIcon({ context, dewpointFahrenheit, direction, size, wind })
    return calls
}

const only = ({ calls, name }) => calls.filter(({ call }) => call === name)
const points = calls => calls.filter(({ call }) => call === 'moveTo' || call === 'lineTo').map(({ x, y }) => [x, y])

// Which path a point belongs to is the whole question once the face has more than one glyph on
// it: beginPath is where one shape ends and the next starts. Paths with no points of their own
// (the chip and the band, drawn as roundRects) are left out.
const paths = calls =>
    calls
        .reduce((built, call) => (call.call === 'beginPath' ? [...built, []] : [...built.slice(0, -1), [...built.at(-1), call]]), [[]])
        .map(points)
        .filter(path => path.length > 0)

test('drawButtonIcon lays the chip in the toolbar field indigo, not the comfort colour', () => {
    // The comfort colour moved to the bottom band when the wind mark took the face. Flooding
    // the whole chip with it again would put the dart on seven different grounds.
    const [chip] = only({ calls: draw({ dewpointFahrenheit: 68 }), name: 'roundRect' })

    assert.deepEqual({ height: chip.height, width: chip.width, x: chip.x, y: chip.y }, { height: SIZE, width: SIZE, x: 0, y: 0 })
    assert.equal(chip.fillStyle, CHIP_INK)
})

test('drawButtonIcon fills the bottom band with the comfort colour, rounding only its lower corners', () => {
    const [, band] = only({ calls: draw({ dewpointFahrenheit: 68 }), name: 'roundRect' })

    assert.deepEqual({ height: band.height, width: band.width, x: band.x, y: band.y }, { height: 14, width: 64, x: 0, y: 50 })
    assert.deepEqual(band.radius, [0, 0, 9.6, 9.6])
    assert.equal(band.fillStyle, '#FF6600')
})

test('drawButtonIcon cuts the trend into the band in the chip ink', () => {
    const calls = draw({ direction: 'rising' })
    const [notch] = paths(calls)

    assert.deepEqual(notch, [
        [32, 52.5],
        [40, 61.5],
        [24, 61.5],
    ])
    assert.equal(only({ calls, name: 'moveTo' })[0].fillStyle, CHIP_INK)
})

test('drawButtonIcon points the falling notch the other way and flattens the steady one', () => {
    assert.deepEqual(paths(draw({ direction: 'falling' }))[0], [
        [24, 52.5],
        [40, 52.5],
        [32, 61.5],
    ])
    assert.deepEqual(paths(draw({ direction: 'steady' }))[0], [
        [24, 55],
        [40, 55],
        [40, 59],
        [24, 59],
    ])
})

test('drawButtonIcon refuses a trend it has no glyph for', () => {
    // resolveTendency only ever names these three, so an unknown one is a wiring error, not a
    // reading the button should quietly draw without its trend.
    assert.throws(() => draw({ direction: 'sideways' }), /unknown pressure trend: sideways/)
})

test('drawButtonIcon writes the dewpoint numerals in the chrome ink when the wind is quiet', () => {
    const [reading] = only({ calls: draw({ dewpointFahrenheit: 58 }), name: 'fillText' })

    assert.deepEqual({ text: reading.text, x: reading.x, y: reading.y }, { text: '58', x: 32, y: 25 })
    assert.equal(reading.fillStyle, CHROME_INK)
    assert.equal(reading.font, 'bold 34px system-ui, sans-serif')
})

test('drawButtonIcon shrinks the type for a three-character reading', () => {
    // A subfreezing -4 rounds to two characters, but -12 does not. Measuring each string would
    // fit it tighter and make consecutive readings render at visibly different sizes.
    const [reading] = only({ calls: draw({ dewpointFahrenheit: -12 }), name: 'fillText' })

    assert.match(reading.font, /^bold 22\.6/)
})

test('drawButtonIcon gives the face to the dart once the wind is notable', () => {
    const calls = draw({ wind: SSW_15 })

    assert.equal(only({ calls, name: 'fillText' }).length, 0)
    assert.deepEqual(
        paths(calls)[1].map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]),
        [
            [38.12, 10.22],
            [38.65, 42.91],
            [29.32, 31.47],
            [14.63, 32.96],
        ],
    )
})

test('drawButtonIcon keeps the band and the trend when the dart takes the face', () => {
    // The dewpoint is still readable from the colour, which is the whole reason the numerals
    // can go: the button never stops reporting it.
    const calls = draw({ direction: 'rising', wind: SSW_15 })

    assert.equal(only({ calls, name: 'roundRect' }).length, 2)
    assert.equal(paths(calls).length, 2)
})

test('drawButtonIcon colours the dart by the announced speed', () => {
    // Both sides of the 10 kt gust margin, and the case sitting exactly on it.
    const colourOf = wind => only({ calls: draw({ wind }), name: 'stroke' })[0].strokeStyle
    const measured = ({ bearingDegrees, gustKnots, knots }) => ({ bearingDegrees, gustKnots, knots, state: 'measured' })

    assert.equal(colourOf(SSW_15), '#6cf640')
    assert.equal(colourOf(measured({ bearingDegrees: 292.5, gustKnots: 31, knots: 22 })), '#dcf59d')
    assert.equal(colourOf(measured({ bearingDegrees: 270, gustKnots: 32, knots: 18 })), '#f5f69c')
    assert.equal(colourOf(measured({ bearingDegrees: 180, gustKnots: 65, knots: 55 })), '#f69c6e')
})

test('drawButtonIcon rings the centre for a notable wind with no bearing', () => {
    // A VRB gust has a speed and no heading. A dart pointed anywhere would assert the heading
    // the station explicitly refused to give.
    const calls = draw({ wind: { gustKnots: 21, knots: 6, state: 'measured' } })
    const [ring] = only({ calls, name: 'arc' })

    assert.deepEqual({ radius: ring.radius, x: ring.x, y: ring.y }, { radius: 10, x: 32, y: 25 })
    // The gust is 15 over the sustained 6, so the announced speed is 21 and the ring takes force
    // 5. The ring reports the same speed the dart would have; only the heading is withheld.
    assert.equal(ring.strokeStyle, '#c8f640')
    assert.equal(ring.lineWidth, 6)
    assert.equal(paths(calls).length, 1)
})

test('drawButtonIcon scales the whole face, so 16 and 32 are one drawing at two sizes', () => {
    const [chip] = only({ calls: draw({ size: 16, wind: CALM }), name: 'roundRect' })
    const [, band] = only({ calls: draw({ size: 16, wind: CALM }), name: 'roundRect' })

    assert.equal(chip.radius, 2.4)
    assert.deepEqual({ height: band.height, y: band.y }, { height: 3.5, y: 12.5 })
})
```

- [x] **Step 2: Run the tests and watch them fail**

Run: `npm test -- --test-name-pattern drawButtonIcon`
Expected: FAIL. The chip still floods with the comfort colour and there is no band.

- [x] **Step 3: Rewrite the module**

Replace `src/button-icon.js`:

```js
import { BEAUFORT, beaufortForce } from './beaufort.js'
import { comfortBand } from './comfort.js'
import { DIRECTIONLESS_RING, dartPoints } from './wind-dart.js'
import { announcedKnots, isNotable } from './wind.js'

// Every dimension below is in the 64-unit square the artboards were drawn in, scaled to the
// edge Firefox asks for. Working in the artboard's own units keeps each number checkable
// against the canvas, which fractions of the edge did not.
const FACE = 64

// Kit's toolbar-field indigo and its chrome text. The toolbar does not follow the page's colour
// scheme, so these two are fixed literals rather than light-dark() pairs — and the button takes
// the Beaufort ramp's dark side in both schemes for the same reason.
const CHIP_INK = '#03083f'
const CHROME_INK = '#e6e8ff'

const CORNER_RADIUS = 9.6
const FONT_STACK = 'system-ui, sans-serif'

// The comfort colour takes the bottom strip rather than the whole chip. It still reads at a
// glance, and the rest of the face is free for the reading or the wind mark — which is what
// lets the numerals give way to the dart without the dewpoint going unreported.
const BAND = { height: 14, top: 50 }

const READING = { em: 34, x: 32, y: 25 }

// Cut into the band in the chip's own ink, so the glyph is the band showing through. Paths, not
// the characters up-arrow, down-arrow, dash: at 16 device pixels a font's hinting decides how
// much ink lands on the three pixels the band is tall, and the three do not come out the same
// weight as each other. The steady dash keeps 0.4545 of the triangles' height, the ratio the
// shipped corner mark used — in proportion it came out under a pixel tall and read as a smudge.
const TREND_GLYPHS = {
    falling: [
        [24, 52.5],
        [40, 52.5],
        [32, 61.5],
    ],
    rising: [
        [32, 52.5],
        [40, 61.5],
        [24, 61.5],
    ],
    steady: [
        [24, 55],
        [40, 55],
        [40, 59],
        [24, 59],
    ],
}

// Filled and stroked in the same colour: the stroke's round joins take the corners off the
// vertices, which is what keeps the dart from reading as a paper aeroplane at 16 pixels.
const DART_STROKE = 2

// Two digits is the ordinary reading and gets the largest type the layout holds. A third
// character — a subfreezing '-4' rounds to two, but '-12' does not — shrinks the type in
// proportion instead of overflowing. Measuring the string would fit each one tighter, but then
// consecutive readings render at visibly different sizes, which looks like a bug.
const readingEm = ({ characters, em }) => (characters <= 2 ? em : (em * 2) / characters)

const tracePolygon = ({ context, points }) => {
    const [start, ...rest] = points
    context.beginPath()
    context.moveTo(start.x, start.y)
    for (const point of rest) context.lineTo(point.x, point.y)
    context.closePath()
}

const fillPolygon = ({ context, points }) => {
    tracePolygon({ context, points })
    context.fill()
}

const drawBand = ({ background, context, size, unit }) => {
    context.fillStyle = background
    context.beginPath()
    // Only the lower corners are rounded: the band follows the chip's own corner there and sits
    // flush against the face above it.
    context.roundRect(0, BAND.top * unit, size, BAND.height * unit, [0, 0, CORNER_RADIUS * unit, CORNER_RADIUS * unit])
    context.fill()
}

const drawTrend = ({ context, direction, unit }) => {
    const glyph = TREND_GLYPHS[direction]
    // resolveTendency only ever names these three, so an unknown one is a wiring error and not
    // a reading the button should quietly draw without its trend.
    if (glyph === undefined) throw new Error(`cannot draw an unknown pressure trend: ${direction}`)

    context.fillStyle = CHIP_INK
    fillPolygon({ context, points: glyph.map(([x, y]) => ({ x: x * unit, y: y * unit })) })
}

const drawReading = ({ context, dewpointFahrenheit, unit }) => {
    const reading = String(dewpointFahrenheit)

    context.fillStyle = CHROME_INK
    context.font = `bold ${unit * readingEm({ characters: reading.length, em: READING.em })}px ${FONT_STACK}`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(reading, READING.x * unit, READING.y * unit)
}

// A wind with no bearing still has a speed, so the colour still reports it and nothing on the
// face claims a heading the station never sent. The panel answers the same case with barbs and
// no shaft; the two surfaces say "speed, no direction" in their own grammars.
const drawWindRing = ({ colour, context, unit }) => {
    context.strokeStyle = colour
    context.lineWidth = DIRECTIONLESS_RING.stroke * unit
    context.beginPath()
    context.arc(READING.x * unit, READING.y * unit, DIRECTIONLESS_RING.radius * unit, 0, 2 * Math.PI)
    context.stroke()
}

const drawDart = ({ colour, context, fromDegrees, unit }) => {
    context.fillStyle = colour
    context.strokeStyle = colour
    context.lineJoin = 'round'
    context.lineWidth = DART_STROKE * unit
    tracePolygon({
        context,
        points: dartPoints({ centre: { x: READING.x * unit, y: READING.y * unit }, fromDegrees, scale: unit }),
    })
    context.fill()
    context.stroke()
}

const drawWind = ({ context, unit, wind }) => {
    const colour = BEAUFORT[beaufortForce(announcedKnots(wind))].dark

    if (wind.bearingDegrees === undefined) drawWindRing({ colour, context, unit })
    else drawDart({ colour, context, fromDegrees: wind.bearingDegrees, unit })
}

// Paints one square of the toolbar icon at the given edge length. The caller owns the canvas:
// this draws, and never reads the context back, so the same code serves both the extension's
// OffscreenCanvas and the preview page.
export const drawButtonIcon = ({ context, dewpointFahrenheit, direction, size, wind }) => {
    const { background } = comfortBand(dewpointFahrenheit)
    const unit = size / FACE

    context.clearRect(0, 0, size, size)
    context.fillStyle = CHIP_INK
    context.beginPath()
    context.roundRect(0, 0, size, size, CORNER_RADIUS * unit)
    context.fill()

    drawBand({ background, context, size, unit })
    drawTrend({ context, direction, unit })

    if (isNotable(wind)) drawWind({ context, unit, wind })
    else drawReading({ context, dewpointFahrenheit, unit })
}
```

- [x] **Step 4: Run the tests and watch them pass**

Run: `npm test -- --test-name-pattern drawButtonIcon`
Expected: PASS, 12 tests.

- [x] **Step 5: Rebuild the preview's case list**

In `docs/icon-preview.js`, replace the `CASES` array and its comment with:

```js
// One row per case, each written as the METAR fields the station sends rather than as a decoded
// wind, so the page exercises toWind() on the way in and reads the same wording the popup does.
// The set covers both sides of the 15 kt threshold that hands the face to the dart, both sides
// of the 10 kt gust margin that decides the dart's colour, the directionless ring, all three
// trend glyphs, and the readings that run to three characters and shrink the type.
const CASES = [
    { dewpointFahrenheit: 48, direction: 'steady', metar: {}, note: 'Nothing measured — numerals and the band' },
    { dewpointFahrenheit: 53, direction: 'rising', metar: { wdir: 210, wspd: 0 }, note: 'Calm air, measured and still' },
    { dewpointFahrenheit: 58, direction: 'falling', metar: { wdir: 40, wspd: 14 }, note: 'One knot under the threshold' },
    { dewpointFahrenheit: 58, direction: 'falling', metar: { wdir: 40, wspd: 15 }, note: 'At the threshold — the dart takes the face' },
    { dewpointFahrenheit: 63, direction: 'steady', metar: { wdir: 202.5, wspd: 15 }, note: 'SSW 15, force 4' },
    { dewpointFahrenheit: 63, direction: 'rising', metar: { wdir: 292.5, wgst: 31, wspd: 22 }, note: 'Gust 9 over — sustained keeps the colour' },
    { dewpointFahrenheit: 68, direction: 'falling', metar: { wdir: 270, wgst: 32, wspd: 18 }, note: 'Gust 14 over — the gust takes the colour' },
    { dewpointFahrenheit: 73, direction: 'steady', metar: { wdir: 180, wgst: 65, wspd: 55 }, note: 'Gust exactly 10 over — still sustained' },
    { dewpointFahrenheit: 78, direction: 'rising', metar: { wdir: 'VRB', wgst: 21, wspd: 6 }, note: 'A gust promotes a wind with no heading' },
    { dewpointFahrenheit: -4, direction: 'falling', metar: { wdir: 20, wspd: 8 }, note: 'Subfreezing, two characters' },
    { dewpointFahrenheit: -12, direction: 'rising', metar: {}, note: 'Three characters shrink the type' },
    { dewpointFahrenheit: 100, direction: 'steady', metar: { wdir: 160, wspd: 4 }, note: 'Three characters, no minus' },
]

// The sixteen compass points at one speed. The dart's sense is the one thing about this mark a
// reader can get backwards, so it gets a sweep to check against: a wind from the north points
// down the face, because the dart flies downwind.
const COMPASS_CASES = [...Array(16).keys()].map(step => ({
    dewpointFahrenheit: 60,
    direction: 'steady',
    metar: { wdir: step * 22.5, wspd: 20 },
    note: 'Compass sweep',
}))
```

Change the final assembly line from `const examples = CASES.map(toExample)` to:

```js
const examples = [...CASES, ...COMPASS_CASES].map(toExample)
```

- [x] **Step 6: Look at the preview**

```bash
npm run preview
```

Open <http://127.0.0.1:8765/docs/icon-preview.html>. Confirm the compass sweep reads as a clock face, the notch is
legible in all three trends, and the ring row shows a ring rather than a dart. Stop the server.

- [x] **Step 7: Format, lint, commit**

```bash
npm run format
npm run lint:js
npm test
git add src/button-icon.js test/button-icon.test.js docs/icon-preview.js
git commit -m "feat: draw the toolbar button as a comfort band, a trend notch, and a compass dart"
```

---

### Task 5: Station-model wind barbs

**Files:**

- Create: `src/wind-barbs.js`
- Test: `test/wind-barbs.test.js`

**Interfaces:**

- Consumes: nothing.
- Produces: `windBarbs({ bearingDegrees, gustKnots, knots }) → { marks, shaft? }` in the 88-unit plot. Each mark is
  `{ filled: boolean, gust: boolean, points: [{ x, y }] }` — two points for a barb, three for a filled pennant. Gust
  marks come first. `shaft` is `{ from: { x, y }, to: { x, y } }` and is absent when there is no bearing.

- [x] **Step 1: Write the failing test**

Create `test/wind-barbs.test.js`:

```js
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
    assert.deepEqual(marks.map(({ points: [root] }) => pair(root)), [
        [44, 14],
        [44, 18.5],
    ])
})

test('windBarbs draws nothing for a calm wind', () => {
    const { marks } = windBarbs({ bearingDegrees: 0, knots: 0 })

    assert.deepEqual(marks, [])
})
```

- [x] **Step 2: Run the test and watch it fail**

Run: `npm test -- --test-name-pattern windBarbs`
Expected: FAIL, `Cannot find module '../src/wind-barbs.js'`.

- [x] **Step 3: Write the module**

Create `src/wind-barbs.js`:

```js
// The station-model wind plot the panel's wind plaque draws, in the 88-unit box the artboard
// used. WMO No. 306 and FMH-1: the shaft points toward where the wind comes from, the marks sit
// on the right looking out along it (northern hemisphere), and the speed is rounded to 5 kt —
// a half barb is 5, a full barb 10, a pennant 50.
const PLOT = { centre: { x: 44, y: 44 }, hubRadius: 3.6, tipRadius: 30 }

// Marks lean toward the tip at 60 degrees off the shaft, which is what keeps four full barbs
// from reading as a comb: at a right angle the shaft disappears between them.
const BARB_ANGLE = Math.PI / 3
const BARB_LENGTH = 12.6
const HALF_BARB_LENGTH = 6.3

const KNOTS_PER_HALF_BARB = 5
const KNOTS_PER_BARB = 10
const KNOTS_PER_PENNANT = 50

// A pennant's base eats more of the shaft than a barb's root does, so the mark after one starts
// further in than one slot.
const PENNANT_BASE = 5.85
const PENNANT_STEP = 7.65
const SLOT_STEP = 4.5

// A wind with no bearing is laid out on a vertical and drawn with no shaft: the marks report the
// speed and the missing shaft is what says the heading was never reported. Drawing them on some
// arbitrary heading instead would read as a north wind, which is a claim the station did not make.
const UPRIGHT_DEGREES = 0

const radians = degrees => (degrees * Math.PI) / 180

const axes = bearingDegrees => {
    const heading = radians(bearingDegrees ?? UPRIGHT_DEGREES)
    const out = { x: Math.sin(heading), y: -Math.cos(heading) }
    // Screen right of `out`, with y running down the plot.
    return { out, right: { x: -out.y, y: out.x } }
}

const at = ({ out, radius }) => ({ x: PLOT.centre.x + radius * out.x, y: PLOT.centre.y + radius * out.y })

// Counts rather than a walk down the knots: the scale is 50, then 10, then 5, and the remainder
// after each is what the next mark counts. The 5 kt rounding is the model's own rule.
const tally = knots => {
    const rounded = Math.round(knots / KNOTS_PER_HALF_BARB) * KNOTS_PER_HALF_BARB
    return {
        barbs: Math.floor((rounded % KNOTS_PER_PENNANT) / KNOTS_PER_BARB),
        halves: Math.floor((rounded % KNOTS_PER_BARB) / KNOTS_PER_HALF_BARB),
        pennants: Math.floor(rounded / KNOTS_PER_PENNANT),
    }
}

// How far in from the tip each mark starts, walked outermost-first in the order the model draws
// them. A lone half barb is the one special case: on the tip it reads as a fletching that fell
// off the end of the shaft, so it starts one slot in.
const slots = ({ barbs, halves, pennants }) => {
    const kinds = [...Array(pennants).fill('pennant'), ...Array(barbs).fill('barb'), ...Array(halves).fill('half')]
    const start = pennants + barbs === 0 ? SLOT_STEP : 0

    return kinds.reduce(
        ({ offset, placed }, kind) => ({
            offset: offset + (kind === 'pennant' ? PENNANT_STEP : SLOT_STEP),
            placed: [...placed, { kind, offset }],
        }),
        { offset: start, placed: [] },
    ).placed
}

const marksFor = ({ bearingDegrees, gust, knots }) => {
    const { out, right } = axes(bearingDegrees)

    const outward = ({ from, length }) => ({
        x: from.x + length * (Math.cos(BARB_ANGLE) * out.x + Math.sin(BARB_ANGLE) * right.x),
        y: from.y + length * (Math.cos(BARB_ANGLE) * out.y + Math.sin(BARB_ANGLE) * right.y),
    })

    const barb = ({ length, offset }) => {
        const root = at({ out, radius: PLOT.tipRadius - offset })
        return { filled: false, gust, points: [root, outward({ from: root, length })] }
    }

    const pennant = offset => {
        const outer = at({ out, radius: PLOT.tipRadius - offset })
        return {
            filled: true,
            gust,
            points: [outer, outward({ from: outer, length: BARB_LENGTH }), at({ out, radius: PLOT.tipRadius - offset - PENNANT_BASE })],
        }
    }

    const draw = {
        barb: offset => barb({ length: BARB_LENGTH, offset }),
        half: offset => barb({ length: HALF_BARB_LENGTH, offset }),
        pennant,
    }

    return slots(tally(knots)).map(({ kind, offset }) => draw[kind](offset))
}

// The shaft and the marks of one wind, as points, so the popup emits SVG and a jsdom test can
// read the same numbers back. Colour is not decided here: the plaque paints the sustained marks
// in the sustained force's colour and the gust's in the gust force's, and the two rules live
// beside each other in popup.js rather than being split across this boundary.
export const windBarbs = ({ bearingDegrees, gustKnots, knots }) => {
    const { out } = axes(bearingDegrees)
    const gustMarks = gustKnots === undefined ? [] : marksFor({ bearingDegrees, gust: true, knots: gustKnots })

    return {
        marks: [...gustMarks, ...marksFor({ bearingDegrees, gust: false, knots })],
        ...(bearingDegrees === undefined
            ? {}
            : { shaft: { from: at({ out, radius: PLOT.hubRadius }), to: at({ out, radius: PLOT.tipRadius }) } }),
    }
}
```

- [x] **Step 4: Run the test and watch it pass**

Run: `npm test -- --test-name-pattern windBarbs`
Expected: PASS, 9 tests.

- [x] **Step 5: Format, lint, commit**

```bash
npm run format
npm run lint:js
npm test
git add src/wind-barbs.js test/wind-barbs.test.js
git commit -m "feat: add station-model wind barbs for the panel's wind plaque"
```

---

### Task 6: Cloud sky geometry

**Files:**

- Create: `src/cloud-sky.js`
- Test: `test/cloud-sky.test.js`

**Interfaces:**

- Consumes: nothing.
- Produces: `skyHeight(feet: number) → number`, the y of a height in the 136×112 plot; `HIGH_CLOUD_FEET = 6500`;
  `cloudSky({ baseFeet, layers }) → { base: { y }, layers }` where each layer is
  `{ circles: [{ cx, cy, r }], ellipses: [{ cx, cy, rx, ry }], far: boolean, rects: [{ height, width, x, y }] }`,
  in the order given (high to low), every list always present so a consumer never branches on shape.

- [ ] **Step 1: Write the failing test**

Create `test/cloud-sky.test.js`:

```js
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { HIGH_CLOUD_FEET, cloudSky, skyHeight } from '../src/cloud-sky.js'

const round = value => Math.round(value * 100) / 100

const sky = ({ baseFeet = 2990, layers = [] } = {}) => cloudSky({ baseFeet, layers })

test('skyHeight places the checked heights where the artboard drew them', () => {
    // A square-root scale, not a linear one: linearly, everything below 5,000 ft — where almost
    // every reported ceiling lives — piles into the bottom eighth of the plaque.
    const heights = [400, 2990, 4500, 6100, 25000]

    assert.deepEqual(heights.map(feet => round(skyHeight(feet))), [101.38, 93.37, 90.51, 87.96, 69.49])
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

    assert.deepEqual(layer.ellipses.map(({ cx, rx }) => [round(cx), round(rx)]), [[68, 13.6]])
    assert.equal(layer.circles.length, 3)
    assert.deepEqual(layer.rects, [])
})

test('cloudSky spreads a row across the plot with one more gap than it has puffs', () => {
    const scattered = sky({ layers: [{ baseFeet: 4500, cover: 'SCT' }] }).layers[0]
    const broken = sky({ layers: [{ baseFeet: 4500, cover: 'BKN' }] }).layers[0]

    assert.deepEqual(scattered.ellipses.map(({ cx, rx }) => [round(cx), round(rx)]), [
        [40.23, 15.3],
        [95.77, 15.3],
    ])
    assert.deepEqual(broken.ellipses.map(({ cx, rx }) => [round(cx), round(rx)]), [
        [36.83, 25.5],
        [99.17, 25.5],
    ])
})

test('cloudSky draws overcast as a lid rather than as more puffs', () => {
    // An overcast sky has no gaps in it, so more puffs would be the wrong drawing however many
    // there were. The lid overhangs both edges so no seam shows at the plaque's rounded corner.
    const [layer] = sky({ layers: [{ baseFeet: 1200, cover: 'OVC' }] }).layers

    assert.equal(layer.rects.length, 1)
    assert.deepEqual({ width: layer.rects[0].width, x: layer.rects[0].x }, { width: 144, x: -4 })
    assert.deepEqual(layer.circles.map(({ r }) => r), [7.92, 7.92, 7.92, 7.92, 7.92])
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

    assert.deepEqual(layers.map(({ ellipses: [first] }) => round(first.cy)), [71.65, 92.67])
})

test('cloudSky leaves out a vertical visibility report', () => {
    // VV is how far up you can see through an obscuration, not a cloud deck at a height. Drawing
    // it as a layer would put a solid deck on the plaque where the sky is merely opaque.
    assert.deepEqual(sky({ layers: [{ baseFeet: 200, cover: 'VV' }] }).layers, [])
})
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npm test -- --test-name-pattern "skyHeight|cloudSky"`
Expected: FAIL, `Cannot find module '../src/cloud-sky.js'`.

- [ ] **Step 3: Write the module**

Create `src/cloud-sky.js`:

```js
// The cloud plaque's sky, in the 136x112 box the artboard used. The plaque paints the reported
// layers at their heights and the computed base as a dashed line under them, so a reader can
// compare the two in one look — that comparison is the whole reason the plaque has a picture.
const PLOT = { foot: 112, ground: 106, width: 136 }

// A square-root height scale, not a linear one: linearly, everything below 5,000 ft — where
// almost every reported ceiling lives — piles into the bottom eighth of the plaque. The ceiling
// is where the text block's bottom edge falls, so a layer at 30,000 ft still clears the words.
const CEILING_FEET = 30000
const SCALE_HEIGHT = 40

// The low/mid boundary of the international cloud atlas. At or above it a layer takes the
// further colour (--panel), below it the nearer one (--raised). Two of the atlas's three tiers
// collapse into one colour: a third tone is more than a 112px plaque can carry.
export const HIGH_CLOUD_FEET = 6500

// Coverage sets how many puffs a row has and how wide each is, as a fraction of the plot's
// width. OVC is not simply more puffs: an overcast sky has no gaps, so it is drawn as a lid.
const COVERS = {
    BKN: { count: 2, fraction: 0.375 },
    FEW: { count: 1, fraction: 0.2 },
    SCT: { count: 2, fraction: 0.225 },
}

// A puff is a base ellipse with three circles rising off it, every radius scaled from the puff's
// own half-width so one shape serves a 27-unit FEW puff and a 51-unit BKN one. The vertical
// offsets are deliberately fixed: a taller puff at height reads as a nearer one, which is the
// opposite of what the plaque is saying.
const PUFF_ELLIPSE = { drop: 2.16, ry: 4.32 }
const PUFF_CIRCLES = [
    { across: -0.4, radius: 0.248, rise: 0.72 },
    { across: 0.15, radius: 0.31, rise: 2.88 },
    { across: 0.6, radius: 0.187, rise: 0 },
]

// The lid overhangs both edges of the plot so no seam shows at the plaque's rounded corner, and
// runs down to the foot so nothing is visible beneath an overcast sky.
const LID = { centres: [10.88, 35.36, 62.56, 89.76, 116.96], left: -4, right: 140, rise: 2.88, radius: 7.92 }

export const skyHeight = feet => PLOT.ground - SCALE_HEIGHT * Math.sqrt(Math.min(feet, CEILING_FEET) / CEILING_FEET)

// n puffs and n + 1 equal gaps, which centres a one-puff row without a special case for it.
const puffCentres = ({ count, width }) => {
    const gap = (PLOT.width - count * width) / (count + 1)
    return [...Array(count).keys()].map(index => gap * (index + 1) + width * (index + 0.5))
}

const puffRow = ({ cover, y }) => {
    const { count, fraction } = COVERS[cover]
    const width = PLOT.width * fraction
    const rx = width / 2

    return puffCentres({ count, width }).reduce(
        (row, cx) => ({
            circles: [...row.circles, ...PUFF_CIRCLES.map(({ across, radius, rise }) => ({ cx: cx + across * rx, cy: y - rise, r: radius * rx }))],
            ellipses: [...row.ellipses, { cx, cy: y + PUFF_ELLIPSE.drop, rx, ry: PUFF_ELLIPSE.ry }],
            rects: [],
        }),
        { circles: [], ellipses: [], rects: [] },
    )
}

const overcastLid = y => ({
    circles: LID.centres.map(cx => ({ cx, cy: y - LID.rise, r: LID.radius })),
    ellipses: [],
    rects: [{ height: PLOT.foot - (y - LID.rise), width: LID.right - LID.left, x: LID.left, y: y - LID.rise }],
})

// VV reports how far up you can see through an obscuration, not a deck at a height, so drawing
// it as a layer would put a solid ceiling on the plaque where the sky is merely opaque. Any
// other cover this module has no shape for is left out for the same reason: a gap is a smaller
// lie than a guess on a plot whose whole subject is coverage.
const isDrawable = ({ cover }) => cover === 'OVC' || COVERS[cover] !== undefined

const toLayer = ({ baseFeet, cover }) => {
    const y = skyHeight(baseFeet)
    return { far: baseFeet >= HIGH_CLOUD_FEET, ...(cover === 'OVC' ? overcastLid(y) : puffRow({ cover, y })) }
}

// Layers arrive high to low from observation.js and stay in that order, so a consumer painting
// them in sequence lands the lower deck over the higher one, which is what a sky looks like.
export const cloudSky = ({ baseFeet, layers }) => ({ base: { y: skyHeight(baseFeet) }, layers: layers.filter(isDrawable).map(toLayer) })
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm test -- --test-name-pattern "skyHeight|cloudSky"`
Expected: PASS, 10 tests.

- [ ] **Step 5: Format, lint, commit**

```bash
npm run format
npm run lint:js
npm test
git add src/cloud-sky.js test/cloud-sky.test.js
git commit -m "feat: add the cloud plaque's height scale, puffs, and overcast lid"
```

---

### Task 7: Cloud layers as data

**Files:**

- Modify: `src/observation.js`
- Test: `test/observation.test.js:36-55`

**Interfaces:**

- Consumes: nothing.
- Produces: `toViewModel` returns `cloudLayers: [{ baseFeet, cover }]`, sorted high to low, and no longer returns
  `clouds`. Layers with no reported base are dropped; VV layers are kept here and skipped at draw time.

- [ ] **Step 1: Rewrite the cloud tests**

In `test/observation.test.js`, replace the three tests that assert on `view.clouds` with:

```js
test('toViewModel reports no layers for a clear sky', () => {
    const view = toViewModel({ clouds: [], dewp: 14.4, reportTime: '2026-08-26T13:00:00Z', temp: 21.7 })

    assert.deepEqual(view.cloudLayers, [])
})

test('toViewModel drops a layer that reports no height', () => {
    // AWC omits `base` on CLR and SKC. A layer with no height cannot be placed on the plaque or
    // named in the header line, and 'clear' is what an empty list already reads as.
    const view = toViewModel({ clouds: [{ cover: 'CLR' }], dewp: 14.4, reportTime: '2026-08-26T13:00:00Z', temp: 21.7 })

    assert.deepEqual(view.cloudLayers, [])
})

test('toViewModel sorts the layers high to low so the plaque paints the near ones last', () => {
    const view = toViewModel({
        clouds: [
            { base: 7000, cover: 'FEW' },
            { base: 25000, cover: 'BKN' },
            { base: 20000, cover: 'FEW' },
        ],
        dewp: 14.4,
        reportTime: '2026-08-26T13:00:00Z',
        temp: 21.7,
    })

    assert.deepEqual(view.cloudLayers, [
        { baseFeet: 25000, cover: 'BKN' },
        { baseFeet: 20000, cover: 'FEW' },
        { baseFeet: 7000, cover: 'FEW' },
    ])
})
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npm test -- --test-name-pattern toViewModel`
Expected: FAIL, `cloudLayers` is undefined.

- [ ] **Step 3: Replace the sentence with the data**

In `src/observation.js`, delete `describeCloudLayer` and `describeClouds`, and add:

```js
// The layers as data rather than as a sentence: the cloud plaque paints them at their heights
// and the header writes its own line from the same list, so the two can never disagree about
// what the station reported.
//
// A layer with no `base` is dropped rather than carried with an undefined height. AWC omits the
// field on CLR and SKC, and neither surface can place a layer it has no height for; an empty
// list already reads as 'clear' on both.
const toCloudLayers = clouds =>
    (clouds ?? [])
        .filter(({ base }) => base !== undefined)
        .map(({ base, cover }) => ({ baseFeet: base, cover }))
        // High to low, so a consumer painting them in sequence lands the lower deck over the
        // higher one — which is what a sky looks like from underneath.
        .sort((one, other) => other.baseFeet - one.baseFeet)
```

Replace the `clouds: describeClouds(clouds)` line in the returned object with `cloudLayers: toCloudLayers(clouds)`,
keeping the properties alphabetized (`cloudBaseFeet`, then `cloudLayers`, then `dewpointFahrenheit`).

- [ ] **Step 4: Keep the popup reading the same list**

`popup.js` still writes the deleted `clouds` sentence into the ambient line. That line is rebuilt properly in Task 8;
here it only needs to stop reading a field that no longer exists, so the suite stays green at this commit. In
`src/popup.js`, add above `describeVisibility`:

```js
// The header's own wording of the layers, built from the same list the cloud plaque paints, so
// the sentence and the picture can never disagree about what the station reported.
const describeCloudLayers = cloudLayers =>
    cloudLayers.length === 0 ? 'clear' : cloudLayers.map(({ baseFeet, cover }) => `${cover} ${WHOLE_FEET_FORMAT.format(baseFeet)}`).join(' · ')
```

Add the formatter beside the other module constants:

```js
const WHOLE_FEET_FORMAT = new Intl.NumberFormat()
```

Change the ambient-clouds write in `render` from `text: observation.clouds` to
`text: describeCloudLayers(observation.cloudLayers)`.

- [ ] **Step 5: Update the popup test's clouds expectation**

In `test/popup.test.js`, any fixture passing `clouds: 'FEW 7000 ft, ...'` now passes
`cloudLayers: [{ baseFeet: 7000, cover: 'FEW' }, ...]`, and the expected text becomes the joined form
(`FEW 7,000 · BKN 25,000`). Run `npm test` until green.

- [ ] **Step 6: Format, lint, commit**

```bash
npm run format
npm run lint:js
npm test
git add src/observation.js src/popup.js test/observation.test.js test/popup.test.js
git commit -m "feat: expose the cloud layers as data rather than as a sentence"
```

---

### Task 8: The panel — markup, styles, and the plaques' text

Builds the whole layout and every reading. The three instruments (barometer arc, cloud sky, wind plot) get their
markup and their box here and are drawn in Tasks 9, 10, and 11. The popup is fully usable at the end of this task.

**Files:**

- Modify: `src/popup.html` (body replaced)
- Modify: `src/ui.css:110-247` (everything from `.popup` down; `:root`, `body`, and `.options` untouched)
- Modify: `src/popup.js` (rewritten)
- Modify: `src/wind.js` (the stale comment on `describeWind`)
- Delete: `src/windsock.js`, `test/windsock.test.js`
- Test: `test/popup.test.js` (rewritten)

**Interfaces:**

- Consumes: `comfortBand` from `src/comfort.js`; `cloudLayers` from Task 7.
- Produces: `render({ document, model, now })` and `renderUnavailable({ document, reason })`, signatures unchanged.
  `SELECTORS` gains `barometer`, `clouds`, `comfort`, `sky`, `temperature`, `trend`, `trendGlyph`, `visibility`,
  `windDirection`, `windPlot`, `windSpeed`, and loses `ambientClouds`, `ambientPrimary`, `wind`, `windsock`.

- [ ] **Step 1: Replace the popup's body**

Replace everything between `<body>` and `</body>` in `src/popup.html`:

```html
        <main class="popup">
            <header class="ambient">
                <p class="temperature" id="temperature"></p>
                <div class="ambient-lines">
                    <p id="clouds"></p>
                    <p id="visibility"></p>
                </div>
            </header>
            <div class="plaques">
                <section class="plaque plaque-dewpoint">
                    <p class="label">Dewpoint</p>
                    <p class="reading" id="dewpoint"></p>
                    <p class="comfort"><span class="comfort-chip" id="comfort"></span></p>
                </section>
                <section class="plaque plaque-cloud">
                    <!-- Each instrument's <svg> holds its fixed furniture and one empty <g>
                         that popup.js replaces the children of. Splitting them that way means a
                         redraw never has to rebuild the ring, the dial, or the ticks, and the
                         furniture can be styled in CSS with Kit tokens rather than written in
                         JS as literal hexes. Tasks 9 to 11 add the furniture to each. -->
                    <svg aria-hidden="true" class="sky" viewBox="0 0 136 112"><g id="sky"></g></svg>
                    <div class="plaque-text">
                        <p class="label">Cloud base</p>
                        <p class="reading" id="cloud-base"></p>
                        <p class="note">computed</p>
                    </div>
                </section>
                <section class="plaque plaque-wind">
                    <p class="label">Wind</p>
                    <!-- Station-model barbs on a compass ring, from wind-barbs.js. -->
                    <svg aria-hidden="true" class="wind-plot" viewBox="0 0 88 88"><g id="wind-plot"></g></svg>
                    <p class="reading" id="wind-speed"></p>
                    <p class="note" id="wind-direction"></p>
                </section>
                <section class="plaque plaque-pressure">
                    <p class="label">Pressure</p>
                    <svg aria-hidden="true" class="barometer" viewBox="0 0 112 76"><g id="barometer"></g></svg>
                    <p class="reading" id="pressure"></p>
                    <p class="note trend">
                        <svg aria-hidden="true" class="trend-glyph" viewBox="0 0 10 10"><g id="trend-glyph"></g></svg>
                        <span id="trend"></span>
                    </p>
                </section>
            </div>
            <section class="thunder" id="thunder">
                <p class="thunder-label" id="thunder-label">Thunder</p>
                <ol aria-labelledby="thunder-label" class="thunder-bars"></ol>
                <p class="thunder-axis"><span>now</span><span>+6h</span><span>+12h</span></p>
            </section>
            <footer class="footer">
                <p id="age"></p>
                <p id="provenance"></p>
            </footer>
        </main>
        <script src="/src/popup-main.js" type="module"></script>
```

- [ ] **Step 2: Replace the panel's styles**

In `src/ui.css`, delete everything from the `/* .popup is the toolbar action's ... */` comment to the end of the file
and put this in its place. `:root`, `body`, and `.options` above it are untouched.

```css
/* .popup is the toolbar action's single window mesa. The plaques and the footer's tile ground
   carry the structure now, so the hairline dividers that used to separate the sections are
   gone: two grounds reading against --panel say the same thing more quietly. */
.popup {
    background: var(--panel);
    border-radius: 12px;
    overflow: hidden;
    width: 19rem;
}

/* Page order below follows the panel's own: header, plaques, thunder, footer. */
.ambient {
    align-items: baseline;
    display: flex;
    justify-content: space-between;
    padding: 1rem 1rem 0.625rem;

    .temperature {
        color: var(--ink);
        font: 3rem var(--font-display);
        font-variant-numeric: tabular-nums;
        /* Under 1, so a 48px numeral sits on the same baseline as the two small lines beside
           it rather than pushing the header taller than the reading needs. */
        line-height: 0.9;
        margin: 0;
    }

    .ambient-lines {
        display: flex;
        flex-direction: column;
        gap: 2px;
        text-align: right;

        p {
            color: var(--ink);
            font-size: 0.75rem;
            font-variant-numeric: tabular-nums;
            margin: 0;
        }
    }
}

.plaques {
    display: grid;
    gap: 8px;
    grid-template-columns: 1fr 1fr;
    padding: 0 12px;
}

.plaque {
    background: var(--tile);
    border-radius: 14px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 12px;

    .label {
        color: var(--muted);
        font-size: 0.6rem;
        font-weight: 600;
        letter-spacing: 0.14em;
        margin: 0;
        text-transform: uppercase;
    }

    .reading {
        color: var(--ink);
        font-family: var(--font-display);
        font-size: 1.375rem;
        font-variant-numeric: tabular-nums;
        margin: 0;
    }

    .note {
        color: var(--ink);
        font-size: 0.6875rem;
        font-variant-numeric: tabular-nums;
        margin: 0;
    }

    /* The unit rides at the reading's own weight two steps down, so '2,990 ft' reads as one
       figure rather than as two words of equal claim. */
    .unit {
        font-size: 0.75rem;
    }
}

.plaque-dewpoint {
    .reading {
        font-size: 3.625rem;
        line-height: 0.9;
        text-align: center;
    }

    .comfort {
        margin: 0;
        text-align: center;
    }

    /* The chip's two colours are set inline by popup.js from comfort.js: the seven bands are a
       data table, and seven classes here would be a second copy of it to keep in step. */
    .comfort-chip {
        background: var(--chip-background);
        border-radius: 999px;
        color: var(--chip-foreground);
        display: inline-block;
        font-size: 0.625rem;
        font-weight: 600;
        padding: 2px 8px;
        text-transform: capitalize;
    }
}

.plaque-cloud {
    block-size: 112px;
    position: relative;

    /* The sky is painted behind the text rather than beside it. The plaque is 112px tall either
       way, and a reading over its own sky is the comparison the plaque exists to make. */
    .sky {
        inset: 0;
        position: absolute;
    }

    .plaque-text {
        display: flex;
        flex-direction: column;
        gap: 4px;
        position: relative;
    }
}

.plaque-wind {
    .wind-plot {
        align-self: center;
        block-size: 88px;
        inline-size: 88px;
    }
}

.plaque-pressure {
    .barometer {
        align-self: center;
        block-size: 76px;
        inline-size: 112px;
    }

    .trend {
        align-items: center;
        display: flex;
        gap: 4px;
    }

    /* The one hot element this view spends its accent ration on (see kit-developer-edition's
       "ration the orange"): the trend glyph, filled rather than coloured text — --accent as
       text fails AA in the light scheme (2.6:1), and as a fill it is a shape, not a reading. */
    .trend-glyph {
        block-size: 10px;
        fill: var(--accent);
        flex: none;
        inline-size: 10px;
    }
}

.thunder {
    margin: 8px 12px 12px;

    /* Page order: the label, the bar strip, the hour axis under it. */
    .thunder-label {
        color: var(--muted);
        font-size: 0.6rem;
        font-weight: 600;
        letter-spacing: 0.14em;
        margin: 0 0 0.35rem;
        text-transform: uppercase;
    }

    .thunder-bars {
        align-items: flex-end;
        display: flex;
        gap: 3px;
        height: 40px;
        list-style: none;
        margin: 0;
        padding: 0;
    }

    .thunder-bar {
        background: var(--raised);
        border-radius: 3px 3px 0 0;
        flex: 1;
        height: calc(var(--percent) * 1%);
        /* A genuine 0% reading still reads as a bar, not a gap in the strip. */
        min-height: 2px;
    }

    .thunder-axis {
        color: var(--muted);
        display: flex;
        font-size: 0.6rem;
        justify-content: space-between;
        margin: 4px 0 0;
    }
}

/* #age and #provenance are permanent, not decorative — the design's substitute for de-tiding
   the pressure trend. --tile is the ground here rather than the panel above: --muted text fails
   AA on --panel (3.6:1, see palette.md) but clears it on --tile. */
.footer {
    background: var(--tile);
    padding: 10px 16px;

    p {
        color: var(--muted);
        font-size: 0.6875rem;
        margin: 0;
    }

    #provenance {
        margin-top: 2px;
    }
}
```

- [ ] **Step 3: Rewrite the popup's tests**

Replace `test/popup.test.js` entirely:

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { test } from 'node:test'
import { render, renderUnavailable } from '../src/popup.js'

const popupDocument = () => new JSDOM(readFileSync(new URL('../src/popup.html', import.meta.url), 'utf8')).window.document

// Pinned six minutes after the observation and 66 minutes after the tendency's own window
// close, so the two ages in the footer are distinguishable from each other.
const now = Date.parse('2026-08-26T13:06:00.000Z')

const model = {
    observation: {
        cloudBaseFeet: 2994,
        cloudLayers: [{ baseFeet: 25000, cover: 'SCT' }],
        dewpointFahrenheit: 58,
        observedAt: '2026-08-26T13:00:00.000Z',
        pressureHpa: 1019.1,
        stationName: 'Newark Intl, NJ, US',
        temperatureFahrenheit: 71,
        visibility: '10+',
        wind: { bearingDegrees: 340, direction: 'NNW', knots: 7, state: 'measured' },
    },
    tendency: { direction: 'rising', hPa: 1.5, observedAt: '2026-08-26T12:00:00.000Z', provenance: 'reported', windowHours: 3 },
    thunder: [{ hour: '2026-08-26T13:00:00.000Z', percent: 25 }],
}

const rendered = (overrides = {}) => {
    const document = popupDocument()
    render({ document, model: { ...model, ...overrides }, now })
    return document
}

const observed = observation => ({ observation: { ...model.observation, ...observation } })

const textOf = ({ document, selector }) => document.querySelector(selector).textContent

test('render leads with the temperature as a bare degree reading', () => {
    assert.equal(textOf({ document: rendered(), selector: '#temperature' }), '71°')
})

test('render lists the cloud layers high to low with thousands separators', () => {
    const document = rendered(
        observed({
            cloudLayers: [
                { baseFeet: 25000, cover: 'BKN' },
                { baseFeet: 4500, cover: 'SCT' },
            ],
        }),
    )

    assert.equal(textOf({ document, selector: '#clouds' }), 'BKN 25,000 · SCT 4,500')
})

test('render reads a sky with no layers as clear', () => {
    assert.equal(textOf({ document: rendered(observed({ cloudLayers: [] })), selector: '#clouds' }), 'clear')
})

test('render drops the unit from a visibility nobody measured', () => {
    // AWC never sends a word here: it sends "10+" or a number and omits visib when unmeasured.
    // 'unreported' is manufactured by observation.js, and appending "mi" to it reads as a unit.
    assert.equal(textOf({ document: rendered(), selector: '#visibility' }), '10+ mi')
    assert.equal(textOf({ document: rendered(observed({ visibility: 'unreported' })), selector: '#visibility' }), 'unreported')
})

test('render puts the dewpoint on its comfort chip in the band colours', () => {
    const document = rendered()
    const chip = document.querySelector('#comfort')

    assert.equal(textOf({ document, selector: '#dewpoint' }), '58°')
    assert.equal(chip.textContent, 'comfortable')
    assert.equal(chip.style.getPropertyValue('--chip-background'), '#008000')
    assert.equal(chip.style.getPropertyValue('--chip-foreground'), '#FFFFFF')
})

test('render separates the cloud base reading from its unit', () => {
    const document = rendered()

    assert.equal(textOf({ document, selector: '#cloud-base' }), '2,994 ft')
    assert.equal(document.querySelector('#cloud-base .unit').textContent, 'ft')
})

test('render names where the wind comes from, not where it is going', () => {
    const document = rendered()

    assert.equal(textOf({ document, selector: '#wind-speed' }), '7 kt')
    assert.equal(textOf({ document, selector: '#wind-direction' }), 'from NNW')
})

test('render puts the gust on the direction line beside the source', () => {
    const document = rendered(observed({ wind: { bearingDegrees: 315, direction: 'NW', gustKnots: 27, knots: 18, state: 'measured' } }))

    assert.equal(textOf({ document, selector: '#wind-speed' }), '18 kt')
    assert.equal(textOf({ document, selector: '#wind-direction' }), 'from NW · G 27')
})

test('render calls a variable wind variable rather than giving it a source', () => {
    const document = rendered(observed({ wind: { direction: 'variable', knots: 3, state: 'measured' } }))

    assert.equal(textOf({ document, selector: '#wind-direction' }), 'variable')
})

test('render distinguishes calm air from a wind nobody measured', () => {
    // Calm was measured and found still; an unreported wind was not measured at all, and
    // neither of them is "0 kt".
    const calm = rendered(observed({ wind: { state: 'calm' } }))
    const missing = rendered(observed({ wind: { state: 'unreported' } }))

    assert.equal(textOf({ document: calm, selector: '#wind-speed' }), 'calm')
    assert.equal(textOf({ document: calm, selector: '#wind-direction' }), 'no direction')
    assert.equal(textOf({ document: missing, selector: '#wind-speed' }), '—')
    assert.equal(textOf({ document: missing, selector: '#wind-direction' }), 'unreported')
})

test('render shows the pressure and its trend without repeating the unit', () => {
    const document = rendered()

    assert.equal(textOf({ document, selector: '#pressure' }), '1019.1')
    assert.equal(textOf({ document, selector: '#trend' }), '+1.5 / 3h')
})

test('render still shows the trend when the newest report carries no pressure', () => {
    // SPECI reports omit sea-level pressure and a SPECI can be the newest observation. The
    // trend comes from the series, not that one record, so it survives — never "undefined".
    const document = rendered(observed({ pressureHpa: undefined }))

    assert.equal(textOf({ document, selector: '#pressure' }), '—')
    assert.equal(textOf({ document, selector: '#trend' }), '+1.5 / 3h')
})

test('render dates the footer from the pinned instant and joins with a middle dot', () => {
    const document = rendered()

    assert.equal(textOf({ document, selector: '#age' }), 'Newark Intl, NJ, US · obs 6m ago')
    assert.equal(textOf({ document, selector: '#provenance' }), 'tendency: reported (3h), ended 66m ago')
})

test('render refuses to date the footer from a clock the caller never chose', () => {
    assert.throws(() => render({ document: popupDocument(), model }), /render requires now/)
})

test('render hides the thunder strip when the series is empty', () => {
    assert.equal(rendered({ thunder: [] }).querySelector('#thunder').hidden, true)
    assert.equal(rendered().querySelector('#thunder').hidden, false)
})

test('render labels each thunder bar with its hour and percentage', () => {
    const [bar] = rendered().querySelectorAll('.thunder-bar')

    assert.equal(bar.style.getPropertyValue('--percent'), '25')
    assert.match(bar.getAttribute('aria-label'), /25%$/)
})

test('renderUnavailable places every reading and states the reason in the footer', () => {
    // A user who has never successfully loaded data still sees why, rather than a blank popup.
    const document = popupDocument()
    renderUnavailable({ document, reason: 'no station configured yet' })

    assert.deepEqual(
        ['#dewpoint', '#cloud-base', '#wind-speed', '#pressure'].map(selector => textOf({ document, selector })),
        ['—', '—', '—', '—'],
    )
    assert.equal(document.querySelector('#comfort').hidden, true)
    assert.equal(textOf({ document, selector: '#age' }), 'no observation available — no station configured yet')
    assert.equal(textOf({ document, selector: '#provenance' }), 'tendency: unavailable')
    assert.equal(document.querySelector('#thunder').hidden, true)
})
```

- [ ] **Step 4: Run the tests and watch them fail**

Run: `npm test -- --test-name-pattern "render"`
Expected: FAIL. `#temperature` does not exist yet in `popup.js`'s selector list.

- [ ] **Step 5: Rewrite `popup.js`**

Replace `src/popup.js`:

```js
import { comfortBand } from './comfort.js'

const HOUR_FORMAT = new Intl.DateTimeFormat(undefined, { hour: 'numeric' })
const MILLISECONDS_PER_MINUTE = 60_000
const PLACEHOLDER = '—'
const WHOLE_FEET_FORMAT = new Intl.NumberFormat()

// The one place every element id popup.html carries is spelled out — render() and
// renderUnavailable() both write through this, rather than each holding its own copy of the
// selector strings, so a rename can't silently desync the two.
const SELECTORS = {
    age: '#age',
    barometer: '#barometer',
    cloudBase: '#cloud-base',
    clouds: '#clouds',
    comfort: '#comfort',
    dewpoint: '#dewpoint',
    pressure: '#pressure',
    provenance: '#provenance',
    sky: '#sky',
    temperature: '#temperature',
    thunder: '#thunder',
    thunderBars: '.thunder-bars',
    trend: '#trend',
    trendGlyph: '#trend-glyph',
    visibility: '#visibility',
    windDirection: '#wind-direction',
    windPlot: '#wind-plot',
    windSpeed: '#wind-speed',
}

const write = ({ document, selector, text }) => {
    document.querySelector(selector).textContent = text
}

const buildUnit = ({ document, unit }) => {
    const span = document.createElement('span')
    span.className = 'unit'
    span.textContent = unit
    return span
}

// A reading and its unit are one line in two type sizes, so the unit is its own element. It is
// written rather than left in the markup because 'calm' and the placeholder carry no unit.
const writeReading = ({ document, selector, text, unit }) => {
    const element = document.querySelector(selector)
    element.replaceChildren(...(unit === undefined ? [text] : [`${text} `, buildUnit({ document, unit })]))
}

const describeElapsed = ({ now, observedAt }) => {
    const minutes = Math.round((now - Date.parse(observedAt)) / MILLISECONDS_PER_MINUTE)
    if (minutes < 60) return `${minutes}m ago`
    return `${Math.round(minutes / 60)}h ago`
}

// A reported or computed tendency already carries its sign for a fall (e.g. -1.2); only the
// positive case is missing one. Steady is exactly 0 and prints bare either way.
const describeHpaDelta = hPa => (hPa > 0 ? `+${hPa}` : `${hPa}`)

// windowHours is a display concern, not a domain one: resolveTendency's computed path rarely
// lands on an exact hour boundary (e.g. 2.98), and that decimal has no place in text meant to
// read as "3h" — round here rather than adding a defensive branch to tendency.js for it.
const describeWindowHours = tendency => Math.round(tendency.windowHours)

// No arrow in the words: the glyph beside them is the direction, drawn as a shape so it lands
// the same weight at every zoom level a font would have hinted differently.
const describeTrend = tendency => `${describeHpaDelta(tendency.hPa)} / ${describeWindowHours(tendency)}h`

// AWC never sends a word here: it sends "10+" or a number, and omits visib when unmeasured.
// 'unreported' is manufactured by observation.js's toViewModel for that omission (the coupling
// is flagged there too). Appending "mi" to it reads as a bogus unit, so the unit is dropped.
const describeVisibility = visibility => (visibility === 'unreported' ? visibility : `${visibility} mi`)

// The header's own wording of the layers, built from the same list the cloud plaque paints, so
// the sentence and the picture can never disagree about what the station reported.
const describeCloudLayers = cloudLayers =>
    cloudLayers.length === 0 ? 'clear' : cloudLayers.map(({ baseFeet, cover }) => `${cover} ${WHOLE_FEET_FORMAT.format(baseFeet)}`).join(' · ')

// The tendency's window can close well before the newest observation: a reported value comes
// from the 3-hourly synoptic METAR, which nws.js's 5-hour fetch can trail by more than the
// window is long. The design deliberately does not correct the trend for the semidiurnal tide;
// disclosing when the window actually closed is what it offers in place of that correction, so
// the age belongs beside the provenance rather than being inferred from the observation's.
const describeProvenance = ({ now, tendency }) =>
    `tendency: ${tendency.provenance} (${describeWindowHours(tendency)}h), ended ${describeElapsed({ now, observedAt: tendency.observedAt })}`

const describeSource = direction => {
    if (direction === undefined) return 'direction not reported'
    // toWind names a VRB report 'variable', which is a state of the wind rather than a point on
    // the compass: 'from variable' would read as a place.
    if (direction === 'variable') return 'variable'
    return `from ${direction}`
}

const describeWindDirection = ({ direction, gustKnots }) => {
    const source = describeSource(direction)
    return gustKnots === undefined ? source : `${source} · G ${gustKnots}`
}

// The chip's two colours come from comfort.js beside the reading, so they are set inline: the
// seven bands are a data table, and seven CSS classes would be a second copy of it to keep in
// step with it. The label is capitalised in CSS rather than here.
const renderComfort = ({ dewpointFahrenheit, document }) => {
    const { background, foreground, label } = comfortBand(dewpointFahrenheit)
    const chip = document.querySelector(SELECTORS.comfort)

    chip.hidden = false
    // Custom properties rather than `background` and `color` directly: a value written to a
    // custom property is handed to CSS verbatim, so a light-dark() pair or any other function
    // the parser does not recognise still lands. The wind plaque sets its colours the same way.
    chip.style.setProperty('--chip-background', background)
    chip.style.setProperty('--chip-foreground', foreground)
    chip.textContent = label
}

// Calm and unreported each have to read as itself: calm air was measured and found still, an
// unreported wind was not measured at all, and neither of them is "0 kt".
const renderWind = ({ document, wind }) => {
    if (wind.state === 'unreported') {
        writeReading({ document, selector: SELECTORS.windSpeed, text: PLACEHOLDER })
        write({ document, selector: SELECTORS.windDirection, text: 'unreported' })
        return
    }

    if (wind.state === 'calm') {
        writeReading({ document, selector: SELECTORS.windSpeed, text: 'calm' })
        write({ document, selector: SELECTORS.windDirection, text: 'no direction' })
        return
    }

    writeReading({ document, selector: SELECTORS.windSpeed, text: String(wind.knots), unit: 'kt' })
    write({ document, selector: SELECTORS.windDirection, text: describeWindDirection(wind) })
}

// SPECI reports omit sea-level pressure, and a SPECI can be the newest observation. The trend
// still resolves because it comes from the series, not the newest record alone, so it must
// render even when the absolute reading cannot — never the literal string "undefined".
const renderPressure = ({ document, observation, tendency }) => {
    const reading = observation.pressureHpa === undefined ? PLACEHOLDER : String(observation.pressureHpa)

    writeReading({ document, selector: SELECTORS.pressure, text: reading })
    write({ document, selector: SELECTORS.trend, text: describeTrend(tendency) })
}

const buildThunderBar = ({ document, hour, percent }) => {
    const bar = document.createElement('li')

    bar.className = 'thunder-bar'
    bar.style.setProperty('--percent', percent)
    bar.setAttribute('aria-label', `${HOUR_FORMAT.format(new Date(hour))} — ${percent}%`)
    return bar
}

const renderThunderBars = ({ document, thunder }) => {
    const bars = thunder.map(({ hour, percent }) => buildThunderBar({ document, hour, percent }))
    document.querySelector(SELECTORS.thunderBars).replaceChildren(...bars)
}

export const render = ({ document, model, now }) => {
    // now is required rather than defaulted to Date.now(), exactly as thunderSeries requires
    // it: a default keeps this module impure and, worse, silently dates the footer from a
    // clock the caller never chose. Every age in the popup must come from one pinned instant.
    if (now === undefined) throw new Error('render requires now')

    const { observation, tendency, thunder } = model

    write({ document, selector: SELECTORS.temperature, text: `${observation.temperatureFahrenheit}°` })
    write({ document, selector: SELECTORS.clouds, text: describeCloudLayers(observation.cloudLayers) })
    write({ document, selector: SELECTORS.visibility, text: describeVisibility(observation.visibility) })

    writeReading({ document, selector: SELECTORS.dewpoint, text: `${observation.dewpointFahrenheit}°` })
    renderComfort({ dewpointFahrenheit: observation.dewpointFahrenheit, document })

    writeReading({ document, selector: SELECTORS.cloudBase, text: WHOLE_FEET_FORMAT.format(observation.cloudBaseFeet), unit: 'ft' })
    renderWind({ document, wind: observation.wind })
    renderPressure({ document, observation, tendency })

    write({
        document,
        selector: SELECTORS.age,
        text: `${observation.stationName} · obs ${describeElapsed({ now, observedAt: observation.observedAt })}`,
    })
    write({ document, selector: SELECTORS.provenance, text: describeProvenance({ now, tendency }) })

    renderThunderBars({ document, thunder })
    document.querySelector(SELECTORS.thunder).hidden = thunder.length === 0
}

// The footer is a requirement on every code path, including this one: a user who has never
// successfully loaded data still sees why, rather than a blank popup. Shares SELECTORS with
// render() above so the two can't drift — see the comment on SELECTORS for why that matters.
export const renderUnavailable = ({ document, reason }) => {
    write({ document, selector: SELECTORS.temperature, text: PLACEHOLDER })
    write({ document, selector: SELECTORS.clouds, text: PLACEHOLDER })
    write({ document, selector: SELECTORS.visibility, text: '' })

    writeReading({ document, selector: SELECTORS.dewpoint, text: PLACEHOLDER })
    // Hidden rather than emptied: an empty pill is a coloured gap under the reading, and the
    // band it would name is exactly what is unknown here.
    document.querySelector(SELECTORS.comfort).hidden = true

    writeReading({ document, selector: SELECTORS.cloudBase, text: PLACEHOLDER })
    renderWind({ document, wind: { state: 'unreported' } })
    writeReading({ document, selector: SELECTORS.pressure, text: PLACEHOLDER })
    write({ document, selector: SELECTORS.trend, text: PLACEHOLDER })

    write({ document, selector: SELECTORS.age, text: `no observation available — ${reason}` })
    write({ document, selector: SELECTORS.provenance, text: 'tendency: unavailable' })
    document.querySelector(SELECTORS.thunder).hidden = true
}
```

- [ ] **Step 6: Delete the windsock and correct the comment it left behind**

```bash
git rm src/windsock.js test/windsock.test.js
```

In `src/wind.js`, the comment above `describeWind` says the wording is shared by the popup's row and the button's
tooltip. The popup no longer uses it — the plaque splits the reading across two lines. Replace that comment with:

```js
// The button tooltip's wording of a wind. The popup's plaque splits the same reading across its
// speed and direction lines instead, so this is no longer a shared wording; it stays here
// because 'calm' and 'unreported' are decisions about the value, not about the tooltip.
```

- [ ] **Step 7: Run everything**

```bash
npm test
npx stylelint src/ui.css
npx web-ext lint --source-dir . --ignore-files "node_modules/**" "test/**" "docs/**"
```

Expected: all green. `popup-main.test.js` may need its fixture updated to the new observation shape; do that if so.

- [ ] **Step 8: Look at the panel**

```bash
npm run preview
```

Open <http://127.0.0.1:8765/src/popup.html>. The plaques will have empty instrument boxes — that is expected until
Task 11. Check the grid, the chip, the footer, and that nothing overflows 304 px. Stop the server.

- [ ] **Step 9: Format, lint, commit**

```bash
npm run format
npm run lint:js
npm test
git add src/popup.html src/ui.css src/popup.js src/wind.js test/popup.test.js
git commit -m "feat: lay the popup out as a 2x2 of Kit stat plaques

Deletes the windsock: it has never shipped, so it is replaced rather than
deprecated. The three instruments land in the next three tasks."
```

---

### Task 9: The pressure plaque's barometer

**Files:**

- Modify: `src/popup.html` (the pressure plaque's two SVGs)
- Modify: `src/ui.css` (`.plaque-pressure`)
- Modify: `src/popup.js`
- Test: `test/popup.test.js`

**Interfaces:**

- Consumes: nothing new.
- Produces: nothing new exported. `render` now fills `#barometer` and `#trend-glyph`.

- [ ] **Step 1: Write the failing tests**

Append to `test/popup.test.js`:

```js
const angleOf = ({ document, selector }) => {
    const needle = document.querySelector(selector)
    const run = Number(needle.getAttribute('x2')) - Number(needle.getAttribute('x1'))
    const rise = Number(needle.getAttribute('y1')) - Number(needle.getAttribute('y2'))
    return Math.round((Math.atan2(rise, run) * 180) / Math.PI)
}

test('render stands the needle upright at the middle of the barometer scale', () => {
    // The dial runs 980 to 1050, so 1015 is straight up: 90 degrees off the horizontal.
    const document = rendered(observed({ pressureHpa: 1015 }))

    assert.equal(angleOf({ document, selector: '#barometer line' }), 90)
})

test('render swings the needle to the ends of the scale', () => {
    assert.equal(angleOf({ document: rendered(observed({ pressureHpa: 980 })), selector: '#barometer line' }), 180)
    assert.equal(angleOf({ document: rendered(observed({ pressureHpa: 1050 })), selector: '#barometer line' }), 0)
})

test('render clamps a reading off the end of the scale rather than swinging past it', () => {
    // A landfalling hurricane reads under 950. A needle that keeps going wraps around the dial
    // and reads as a high, which is the most dangerous thing this plaque could say.
    assert.equal(angleOf({ document: rendered(observed({ pressureHpa: 940 })), selector: '#barometer line' }), 180)
})

test('render draws no needle and no hub when the newest report carries no pressure', () => {
    // A hub with no needle reads as a broken instrument rather than as a missing reading.
    const document = rendered(observed({ pressureHpa: undefined }))

    assert.equal(document.querySelector('#barometer').children.length, 0)
})

test('render points the trend glyph the way the tendency does', () => {
    const rising = rendered().querySelector('#trend-glyph polygon')
    const falling = rendered({ tendency: { ...model.tendency, direction: 'falling' } }).querySelector('#trend-glyph polygon')

    assert.equal(rising.getAttribute('points'), '5,1 9.5,8.5 0.5,8.5')
    assert.equal(falling.getAttribute('points'), '5,8.5 9.5,1 0.5,1')
})

test('render refuses a trend it has no glyph for', () => {
    assert.throws(() => rendered({ tendency: { ...model.tendency, direction: 'sideways' } }), /unknown pressure trend: sideways/)
})
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npm test -- --test-name-pattern "needle|trend glyph"`
Expected: FAIL, `#barometer line` is null.

- [ ] **Step 3: Add the dial's furniture to the markup**

In `src/popup.html`, replace the pressure plaque's barometer `<svg>` with:

```html
                    <svg aria-hidden="true" class="barometer" viewBox="0 0 112 76">
                        <path class="dial" d="M 12 56 A 44 44 0 0 1 100 56" />
                        <g class="ticks">
                            <line x1="7" x2="17" y1="56" y2="56" />
                            <line x1="21.35" x2="28.42" y1="21.35" y2="28.42" />
                            <line x1="56" x2="56" y1="7" y2="17" />
                            <line x1="90.65" x2="83.58" y1="21.35" y2="28.42" />
                            <line x1="105" x2="95" y1="56" y2="56" />
                        </g>
                        <text class="scale" x="6" y="73">980</text>
                        <text class="scale" text-anchor="end" x="106" y="73">1050</text>
                        <g id="barometer"></g>
                    </svg>
```

- [ ] **Step 4: Style the dial**

Inside the `.plaque-pressure` block in `src/ui.css`, above `.trend`:

```css
    /* The dial's furniture is markup, not JS: it never changes, so a redraw should not have to
       rebuild it, and here it can take Kit tokens instead of literal hexes written in script. */
    .dial {
        fill: none;
        stroke: var(--raised);
        stroke-linecap: round;
        stroke-width: 8;
    }

    .ticks line {
        stroke: var(--muted);
        stroke-width: 1.5;
    }

    .scale {
        fill: var(--muted);
        font-size: 9px;
    }

    .needle {
        stroke: var(--ink);
        stroke-linecap: round;
        stroke-width: 3;
    }

    .hub {
        fill: var(--ink);
    }
```

- [ ] **Step 5: Draw the needle and the glyph**

In `src/popup.js`, add the namespace constant back beside the others:

```js
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
```

Add above `renderPressure`:

```js
// The barometer's scale, in hPa. 980 to 1050 covers everything a sea-level station reports
// short of a landfalling hurricane, and the clamp is what keeps the needle on the dial when one
// arrives: a needle that keeps swinging wraps past the top and reads as a high, which is the
// most dangerous thing this plaque could say.
const BAROMETER = { high: 1050, low: 980 }
const NEEDLE = { centre: { x: 56, y: 56 }, hubRadius: 4.5, length: 38.7 }

// The three trend glyphs in the 10-unit box the plaque gives them — the same shapes the toolbar
// button cuts into its comfort band. Steady is a dash rather than a flat arrow: an arrow with no
// direction to point reads as a broken up-arrow.
const TREND_POINTS = {
    falling: '5,8.5 9.5,1 0.5,1',
    rising: '5,1 9.5,8.5 0.5,8.5',
    steady: '0.5,4 9.5,4 9.5,6 0.5,6',
}

const buildSvg = ({ attributes, document, name }) => {
    const element = document.createElementNS(SVG_NAMESPACE, name)
    for (const [attribute, value] of Object.entries(attributes)) element.setAttribute(attribute, value)
    return element
}

const clamp = ({ high, low, value }) => Math.min(Math.max(value, low), high)

// Left is the low end of the scale, so the angle runs backwards from pi to zero.
const needleAngle = hPa => {
    const span = BAROMETER.high - BAROMETER.low
    return Math.PI * (1 - (clamp({ ...BAROMETER, value: hPa }) - BAROMETER.low) / span)
}

const renderBarometer = ({ document, pressureHpa }) => {
    const dial = document.querySelector(SELECTORS.barometer)

    // A hub with no needle reads as a broken instrument rather than as a missing reading, so a
    // SPECI with no sea-level pressure gets neither of them.
    if (pressureHpa === undefined) {
        dial.replaceChildren()
        return
    }

    const angle = needleAngle(pressureHpa)
    dial.replaceChildren(
        buildSvg({
            attributes: {
                class: 'needle',
                x1: NEEDLE.centre.x,
                x2: NEEDLE.centre.x + NEEDLE.length * Math.cos(angle),
                y1: NEEDLE.centre.y,
                y2: NEEDLE.centre.y - NEEDLE.length * Math.sin(angle),
            },
            document,
            name: 'line',
        }),
        buildSvg({
            attributes: { class: 'hub', cx: NEEDLE.centre.x, cy: NEEDLE.centre.y, r: NEEDLE.hubRadius },
            document,
            name: 'circle',
        }),
    )
}

const renderTrendGlyph = ({ direction, document }) => {
    const points = TREND_POINTS[direction]
    // resolveTendency only ever names these three, so an unknown one is a wiring error and not a
    // reading the plaque should quietly render blank.
    if (points === undefined) throw new Error(`cannot draw an unknown pressure trend: ${direction}`)

    document.querySelector(SELECTORS.trendGlyph).replaceChildren(buildSvg({ attributes: { points }, document, name: 'polygon' }))
}
```

Extend `renderPressure` with the two calls:

```js
const renderPressure = ({ document, observation, tendency }) => {
    const reading = observation.pressureHpa === undefined ? PLACEHOLDER : String(observation.pressureHpa)

    renderBarometer({ document, pressureHpa: observation.pressureHpa })
    writeReading({ document, selector: SELECTORS.pressure, text: reading })
    renderTrendGlyph({ direction: tendency.direction, document })
    write({ document, selector: SELECTORS.trend, text: describeTrend(tendency) })
}
```

In `renderUnavailable`, empty the dial and clear the glyph above the existing pressure lines:

```js
    document.querySelector(SELECTORS.barometer).replaceChildren()
    document.querySelector(SELECTORS.trendGlyph).replaceChildren()
```

- [ ] **Step 6: Run the tests and watch them pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Format, lint, commit**

```bash
npm run format
npm run lint:js
npm test
npx stylelint src/ui.css
git add src/popup.html src/ui.css src/popup.js test/popup.test.js
git commit -m "feat: draw the pressure plaque's barometer and trend glyph"
```

---

### Task 10: The cloud plaque's painted sky

**Files:**

- Modify: `src/ui.css` (`.plaque-cloud`)
- Modify: `src/popup.js`
- Test: `test/popup.test.js`

**Interfaces:**

- Consumes: `cloudSky` from Task 6; `cloudLayers` from Task 7.
- Produces: nothing new exported. `render` now fills `#sky`.

- [ ] **Step 1: Write the failing tests**

Append to `test/popup.test.js`:

```js
test('render dashes the computed base across the sky at its own height', () => {
    const base = rendered(observed({ cloudBaseFeet: 2990 })).querySelector('#sky line')

    assert.equal(Math.round(Number(base.getAttribute('y1')) * 100) / 100, 93.37)
    assert.deepEqual([base.getAttribute('x1'), base.getAttribute('x2')], ['0', '136'])
})

test('render draws the computed base on a clear sky too', () => {
    // It is the plaque's own reading. Drawing it only when a layer was reported would hide it
    // exactly when it is the only cloud information there is.
    const document = rendered(observed({ cloudLayers: [] }))

    assert.equal(document.querySelectorAll('#sky line').length, 1)
    assert.equal(document.querySelectorAll('#sky ellipse').length, 0)
})

test('render paints the near layers over the far ones', () => {
    // The list is high to low and SVG paints in document order, so the last layer written is
    // the lowest — which is what a sky looks like from underneath.
    const document = rendered(
        observed({
            cloudLayers: [
                { baseFeet: 25000, cover: 'BKN' },
                { baseFeet: 4500, cover: 'SCT' },
            ],
        }),
    )
    const heights = [...document.querySelectorAll('#sky ellipse')].map(ellipse => Math.round(Number(ellipse.getAttribute('cy'))))

    assert.deepEqual(heights, [72, 72, 93, 93])
})

test('render colours a high layer a step further away than a low one', () => {
    const document = rendered(
        observed({
            cloudLayers: [
                { baseFeet: 12000, cover: 'FEW' },
                { baseFeet: 4500, cover: 'FEW' },
            ],
        }),
    )
    const [high, low] = [...document.querySelectorAll('#sky ellipse')].map(ellipse => ellipse.getAttribute('class'))

    assert.deepEqual({ high, low }, { high: 'layer-far', low: 'layer-near' })
})

test('renderUnavailable leaves the sky empty rather than dashing a base it does not have', () => {
    const document = popupDocument()
    renderUnavailable({ document, reason: 'no station configured yet' })

    assert.equal(document.querySelector('#sky').children.length, 0)
})
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npm test -- --test-name-pattern "sky|computed base|layer"`
Expected: FAIL, `#sky line` is null.

- [ ] **Step 3: Style the sky**

Inside `.plaque-cloud` in `src/ui.css`, after the `.sky` rule:

```css
    /* --cloud is a rule and dash colour, never text — see palette.md — which is exactly what
       the computed base is: a line drawn across a picture, not a reading to be read off it. */
    .computed-base {
        stroke: var(--cloud);
        stroke-dasharray: 4 4;
        stroke-width: 1.5;
    }

    /* Distance by tone: a layer at or above the atlas's low/mid boundary sits a step further
       back than the plaque's own ground, and one below it a step nearer. */
    .layer-far {
        fill: var(--panel);
    }

    .layer-near {
        fill: var(--raised);
    }
```

- [ ] **Step 4: Draw the sky**

In `src/popup.js`, add the import at the top:

```js
import { cloudSky } from './cloud-sky.js'
```

Add above `renderComfort`:

```js
// One layer's shapes, all three lists always present, so this never branches on which kind of
// layer it was handed: an overcast lid is rects and circles, a puff row is ellipses and circles,
// and both are just shapes at a height by the time they get here.
const buildLayer = ({ circles, document, ellipses, far, rects }) => {
    const className = far ? 'layer-far' : 'layer-near'

    return [
        ...rects.map(attributes => buildSvg({ attributes: { class: className, ...attributes }, document, name: 'rect' })),
        ...ellipses.map(attributes => buildSvg({ attributes: { class: className, ...attributes }, document, name: 'ellipse' })),
        ...circles.map(attributes => buildSvg({ attributes: { class: className, ...attributes }, document, name: 'circle' })),
    ]
}

// The computed base is drawn on every sky, including a clear one: it is the plaque's own
// reading, and hiding it when nothing was reported would hide it exactly when it is the only
// cloud information there is. Layers land over it, high to low, so the near deck paints last.
const renderSky = ({ cloudBaseFeet, cloudLayers, document }) => {
    const { base, layers } = cloudSky({ baseFeet: cloudBaseFeet, layers: cloudLayers })
    const dash = buildSvg({
        attributes: { class: 'computed-base', x1: 0, x2: 136, y1: base.y, y2: base.y },
        document,
        name: 'line',
    })

    document.querySelector(SELECTORS.sky).replaceChildren(dash, ...layers.flatMap(layer => buildLayer({ ...layer, document })))
}
```

Call it in `render`, above the cloud-base reading:

```js
    renderSky({ cloudBaseFeet: observation.cloudBaseFeet, cloudLayers: observation.cloudLayers, document })
```

In `renderUnavailable`, empty it beside the barometer:

```js
    document.querySelector(SELECTORS.sky).replaceChildren()
```

- [ ] **Step 5: Run the tests and watch them pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Format, lint, commit**

```bash
npm run format
npm run lint:js
npm test
npx stylelint src/ui.css
git add src/ui.css src/popup.js test/popup.test.js
git commit -m "feat: paint the cloud plaque's sky behind its reading"
```

---

### Task 11: The wind plaque's plot

**Files:**

- Modify: `src/popup.html` (the wind plaque's `<svg>`)
- Modify: `src/ui.css` (`.plaque-wind`)
- Modify: `src/popup.js`
- Test: `test/popup.test.js`

**Interfaces:**

- Consumes: `beaufortColour` and `beaufortForce` from Task 1; `windBarbs` from Task 5.
- Produces: nothing new exported. `render` now fills `#wind-plot` and colours the two wind lines.

- [ ] **Step 1: Write the failing tests**

Append to `test/popup.test.js`:

```js
const plotOf = ({ document, selector }) => [...document.querySelectorAll(`#wind-plot ${selector}`)]

test('render points the plot shaft at where the wind comes from', () => {
    // The station-model convention, and the opposite of the toolbar button's dart. A north wind
    // puts the shaft above the station; on the button the same wind points down the face.
    const [shaft] = plotOf({ document: rendered(observed({ wind: { bearingDegrees: 0, direction: 'N', knots: 20, state: 'measured' } })), selector: 'line' })

    assert.deepEqual([shaft.getAttribute('x2'), Math.round(Number(shaft.getAttribute('y2')))], ['44', 14])
})

test('render draws the station-model calm symbol rather than a wind of zero speed', () => {
    // Two rings, no shaft. A shaft of no length at some arbitrary heading is not what calm
    // looks like, and calm has no heading to draw one at.
    const document = rendered(observed({ wind: { state: 'calm' } }))

    assert.equal(plotOf({ document, selector: 'circle' }).length, 2)
    assert.equal(plotOf({ document, selector: 'line' }).length, 0)
})

test('render leaves the plot empty for a wind nobody measured', () => {
    // The bare compass ring in the markup is what "nobody measured this" looks like.
    assert.equal(rendered(observed({ wind: { state: 'unreported' } })).querySelector('#wind-plot').children.length, 0)
})

test('render draws no shaft when the wind has a speed but no bearing', () => {
    const document = rendered(observed({ wind: { direction: 'variable', knots: 20, state: 'measured' } }))

    assert.equal(plotOf({ document, selector: 'line' }).length, 0)
    assert.equal(plotOf({ document, selector: 'polyline' }).length, 2)
})

test('render puts the gust marks behind the sustained ones, each in its own force colour', () => {
    // WNW 22 gusting 31: three force-7 barbs behind, two force-6 barbs in front. The gust is
    // what shows past the sustained barbs.
    const document = rendered(observed({ wind: { bearingDegrees: 292.5, direction: 'WNW', gustKnots: 31, knots: 22, state: 'measured' } }))
    const marks = plotOf({ document, selector: 'polyline' })

    assert.deepEqual(
        marks.map(mark => mark.getAttribute('class')),
        ['mark mark-gust', 'mark mark-gust', 'mark mark-gust', 'mark mark-sustained', 'mark mark-sustained'],
    )
    assert.equal(marks[0].getAttribute('stroke'), 'light-dark(#6f6d03, #f5f69c)')
    assert.equal(marks.at(-1).getAttribute('stroke'), 'light-dark(#5e7216, #dcf59d)')
})

test('render fills a pennant rather than stroking it', () => {
    const [pennant] = plotOf({ document: rendered(observed({ wind: { bearingDegrees: 180, direction: 'S', knots: 55, state: 'measured' } })), selector: 'polygon' })

    assert.equal(pennant.getAttribute('points').split(' ').length, 3)
    assert.equal(pennant.getAttribute('fill'), 'light-dark(#a65324, #f69c6e)')
})

test('render colours the speed by the sustained force and the gust by its own', () => {
    const document = rendered(observed({ wind: { bearingDegrees: 270, direction: 'W', gustKnots: 32, knots: 18, state: 'measured' } }))

    assert.equal(document.querySelector('#wind-speed').style.getPropertyValue('--wind-colour'), 'light-dark(#5a7203, #c8f640)')
    assert.equal(document.querySelector('#wind-direction span').style.getPropertyValue('--wind-colour'), 'light-dark(#6f6d03, #f5f69c)')
})

test('render reads calm in the calm force colour rather than in the plaque ink', () => {
    const document = rendered(observed({ wind: { state: 'calm' } }))

    assert.equal(document.querySelector('#wind-speed').style.getPropertyValue('--wind-colour'), 'light-dark(#056eb2, #129bf7)')
})
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npm test -- --test-name-pattern "plot|calm symbol|gust marks|pennant"`
Expected: FAIL, `#wind-plot line` is null.

- [ ] **Step 3: Add the compass to the markup**

In `src/popup.html`, replace the wind plaque's `<svg>` with:

```html
                    <svg aria-hidden="true" class="wind-plot" viewBox="0 0 88 88">
                        <circle class="compass" cx="44" cy="44" r="38" />
                        <text class="cardinal" x="44" y="11">N</text>
                        <text class="cardinal" x="81" y="47">E</text>
                        <text class="cardinal" x="44" y="84">S</text>
                        <text class="cardinal" x="7" y="47">W</text>
                        <g id="wind-plot"></g>
                    </svg>
```

- [ ] **Step 4: Style the plot**

Inside `.plaque-wind` in `src/ui.css`, after the `.wind-plot` rule:

```css
    .compass {
        fill: none;
        stroke: var(--raised);
        stroke-width: 2;
    }

    .cardinal {
        fill: var(--muted);
        font-size: 8px;
        text-anchor: middle;
    }

    .station {
        fill: none;
        stroke-width: 2.4;
    }

    .shaft {
        stroke-linecap: round;
        stroke-width: 2.76;
    }

    /* Every mark carries its colour on both fill and stroke; these two zero whichever one the
       shape does not use, so popup.js never has to know a pennant from a barb. */
    polyline.mark {
        fill: none;
    }

    polygon.mark {
        stroke: none;
    }

    /* Gust marks are drawn first and a shade thinner, so what shows past a sustained barb reads
       as something behind it rather than as a second wind of equal standing. */
    .mark-gust {
        stroke-width: 2.4;
    }

    .mark-sustained {
        stroke-width: 2.76;
    }
```

Add to the shared `.plaque` block, beside `.reading`, so both wind lines can take a force colour:

```css
    /* Set by popup.js as a custom property so a light-dark() pair reaches CSS verbatim. Falls
       back to the plaque's ink for every reading that is not coloured by force. */
    .reading,
    .note {
        color: var(--wind-colour, var(--ink));
    }
```

Replace the two existing `color: var(--ink)` declarations in `.reading` and `.note` with that shared rule.

- [ ] **Step 5: Draw the plot and colour the readings**

In `src/popup.js`, add the imports:

```js
import { beaufortColour, beaufortForce } from './beaufort.js'
import { windBarbs } from './wind-barbs.js'
```

Add above `renderWind`:

```js
// The plot's own furniture, in the 88-unit box. The second ring is the station model's symbol
// for calm — not a wind of zero speed drawn at some arbitrary heading, which is a claim about a
// direction calm does not have.
const STATION = { calmRadius: 7.92, centre: { x: 44, y: 44 }, radius: 3.6 }

const windColour = knots => beaufortColour(beaufortForce(knots))

const buildStationRing = ({ colour, document, radius }) =>
    buildSvg({
        attributes: { class: 'station', cx: STATION.centre.x, cy: STATION.centre.y, r: radius, stroke: colour },
        document,
        name: 'circle',
    })

const buildShaft = ({ colour, document, shaft }) =>
    buildSvg({
        attributes: { class: 'shaft', stroke: colour, x1: shaft.from.x, x2: shaft.to.x, y1: shaft.from.y, y2: shaft.to.y },
        document,
        name: 'line',
    })

const buildMark = ({ colour, document, mark }) =>
    buildSvg({
        attributes: {
            class: mark.gust ? 'mark mark-gust' : 'mark mark-sustained',
            fill: colour,
            points: mark.points.map(({ x, y }) => `${x},${y}`).join(' '),
            stroke: colour,
        },
        document,
        name: mark.filled ? 'polygon' : 'polyline',
    })

const renderWindPlot = ({ document, wind }) => {
    const plot = document.querySelector(SELECTORS.windPlot)

    // An unreported wind draws nothing at all: the bare compass ring in the markup is what
    // "nobody measured this" looks like, and a station circle would assert a station reading.
    if (wind.state === 'unreported') {
        plot.replaceChildren()
        return
    }

    const colour = windColour(wind.state === 'calm' ? 0 : wind.knots)
    const station = buildStationRing({ colour, document, radius: STATION.radius })

    if (wind.state === 'calm') {
        plot.replaceChildren(station, buildStationRing({ colour, document, radius: STATION.calmRadius }))
        return
    }

    const { marks, shaft } = windBarbs(wind)
    const gustColour = wind.gustKnots === undefined ? colour : windColour(wind.gustKnots)

    plot.replaceChildren(
        station,
        ...(shaft === undefined ? [] : [buildShaft({ colour, document, shaft })]),
        // windBarbs already puts the gust's marks first, so they land under the sustained ones.
        ...marks.map(mark => buildMark({ colour: mark.gust ? gustColour : colour, document, mark })),
    )
}

// The gust takes its own force's colour, so a gust two forces above the sustained wind says so
// before the number is read.
const renderWindDirection = ({ document, wind }) => {
    const element = document.querySelector(SELECTORS.windDirection)
    const source = describeSource(wind.direction)

    if (wind.gustKnots === undefined) {
        element.replaceChildren(source)
        return
    }

    const gust = document.createElement('span')
    gust.style.setProperty('--wind-colour', windColour(wind.gustKnots))
    gust.textContent = `G ${wind.gustKnots}`
    element.replaceChildren(`${source} · `, gust)
}
```

Delete `describeWindDirection` — `renderWindDirection` replaces it. Rewrite `renderWind`:

```js
// Calm and unreported each have to read as itself: calm air was measured and found still, an
// unreported wind was not measured at all, and neither of them is "0 kt".
const renderWind = ({ document, wind }) => {
    const speed = document.querySelector(SELECTORS.windSpeed)

    renderWindPlot({ document, wind })

    if (wind.state === 'unreported') {
        writeReading({ document, selector: SELECTORS.windSpeed, text: PLACEHOLDER })
        speed.style.removeProperty('--wind-colour')
        write({ document, selector: SELECTORS.windDirection, text: 'unreported' })
        return
    }

    if (wind.state === 'calm') {
        writeReading({ document, selector: SELECTORS.windSpeed, text: 'calm' })
        speed.style.setProperty('--wind-colour', windColour(0))
        write({ document, selector: SELECTORS.windDirection, text: 'no direction' })
        return
    }

    writeReading({ document, selector: SELECTORS.windSpeed, text: String(wind.knots), unit: 'kt' })
    speed.style.setProperty('--wind-colour', windColour(wind.knots))
    renderWindDirection({ document, wind })
}
```

- [ ] **Step 6: Run the tests and watch them pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Look at the finished panel**

```bash
npm run preview
```

Open <http://127.0.0.1:8765/src/popup.html>. Every instrument now draws. Check the barb angles against the design
spec's worked cases, the sky's layer order, and that the gust barbs read as behind the sustained ones. Then load the
extension with `npm start` and open the popup in both colour schemes. Stop both.

- [ ] **Step 8: Format, lint, commit**

```bash
npm run format
npm run lint:js
npm test
npx stylelint src/ui.css
npx web-ext lint --source-dir . --ignore-files "node_modules/**" "test/**" "docs/**"
git add src/popup.html src/ui.css src/popup.js test/popup.test.js
git commit -m "feat: plot the wind plaque's station-model barbs in Beaufort colour"
```

---

### Task 12: Documentation

**Files:**

- Modify: `README.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Rewrite the README's two sections**

Find the sections describing the toolbar button and the popup. Rewrite them to state, in the project's existing voice:

- The button is a chip in the toolbar's own indigo, with the dewpoint comfort colour as a band along the bottom and
  the 3-hour pressure trend notched out of that band.
- Ordinarily the face carries the dewpoint in figures. When the wind is notable — sustained 15 kt or more, or any
  gust — the figures give way to a compass dart flying downwind, coloured by Beaufort force. A wind with a speed but
  no bearing gets a ring in the force colour instead.
- The dart's force follows the gust when the gust is more than 10 kt above the sustained wind, and the sustained
  speed otherwise.
- The popup is a 2×2 of plaques: dewpoint with its comfort chip, cloud base over a painted sky, wind on a
  station-model plot, and pressure on a half-dial barometer. The header carries the temperature, the reported cloud
  layers, and the visibility; the footer carries the station, the observation's age, and the tendency's provenance.
- Point at `docs/icon-preview.html` for the button's own preview page.

Do not describe the windsock anywhere. Grep for it first: `grep -rn windsock README.md docs/`.

- [ ] **Step 2: Rewrite the changelog's Unreleased entries**

The windsock entries under `## [Unreleased]` describe something that never shipped, so they are rewritten rather than
marked removed. Replace the whole `## [Unreleased]` block with:

```markdown
## [Unreleased]

### Added

- Wind on the popup, on a plaque of its own: station-model barbs on a compass ring, coloured by
  Beaufort force, with the gust drawn as extra barbs behind the sustained ones in its own force's
  colour. Calm draws the model's own calm symbol; a wind with no reported bearing draws its barbs
  with no shaft.
- A compass dart on the toolbar button once the wind is worth announcing — gusting, or sustained
  at 15 kt or more. It replaces the dewpoint figures on the face and takes the Beaufort colour of
  the gust when the gust is more than 10 kt over the sustained wind, and of the sustained wind
  otherwise. The tooltip names the wind either way.
- Cloud layers on the popup as a painted sky behind the cloud-base reading: each reported layer at
  its height with its coverage as width, and the computed base dashed across them.

### Changed

- The popup is a 2×2 of stat plaques on the Kit Developer Edition tokens, each carrying an
  instrument: the dewpoint's comfort chip, the cloud plaque's sky, the wind plot, and a half-dial
  barometer. The temperature, the cloud layers, and the visibility move to a header; the station
  and the two ages stay in the footer.
- The toolbar button keeps the dewpoint's comfort colour as a band along the bottom of the chip
  rather than flooding the whole face with it, and notches the pressure trend out of that band.
- Wind is decoded into a value (`src/wind.js`) rather than a sentence, so both surfaces can read
  the figures. It now carries the reported bearing in degrees alongside the cardinal.
- Cloud layers are carried as data (`src/observation.js`) rather than as a sentence.
```

- [ ] **Step 3: Check the docs against the diff**

```bash
git diff --stat main
grep -rn 'windsock\|sock' README.md docs/*.md docs/*.html
```

Expected: no hits outside the design spec's own history.

- [ ] **Step 4: Lint and commit**

```bash
npx markdownlint-cli2 README.md CHANGELOG.md
git add README.md CHANGELOG.md
git commit -m "docs: describe the plaque panel and the compass-dart button"
```

---

### Task 13: Release 0.3.0

Closes bean firefox-weather-button-o09n.

**Files:**

- Modify: `manifest.json`, `package.json`, `CHANGELOG.md`
- Modify: `.beans/firefox-weather-button-o09n--release-030.md`

- [ ] **Step 1: Confirm the bump with the semver skill**

Invoke the `versioning-with-semver` skill against the `[Unreleased]` entries. The public surface is the extension's
UI and its stored settings: everything above is additive or a restyle, no setting is renamed, and no stored data
changes shape. That is a minor bump, 0.2.0 to 0.3.0. Record what the skill says.

- [ ] **Step 2: Bump both version fields**

`manifest.json` and `package.json` both carry `"version": "0.2.0"`. Set both to `0.3.0`. `package.json` is on
oxfmt's ignore list, so edit it by hand and keep its 4-space indent.

- [ ] **Step 3: Close the changelog section**

Change `## [Unreleased]` to `## [0.3.0] - 2026-09-03`, using the date the release is actually cut rather than this
one if they differ. Leave no empty `## [Unreleased]` heading behind; Keep a Changelog adds it back at the next change.

- [ ] **Step 4: Verify the packaged build**

```bash
npm test
npm run format:check
npm run lint:js
npx stylelint src/ui.css
npm run lint
npm run build
```

Expected: all green, and `web-ext-artifacts/` holds a `firefox_weather_button-0.3.0.zip`.

- [ ] **Step 5: Update the bean and commit**

```bash
beans update firefox-weather-button-o09n -s completed \
  --body-replace-old "- [ ] Run the versioning-with-semver skill against the unreleased entries to confirm minor" \
  --body-replace-new "- [x] Run the versioning-with-semver skill against the unreleased entries to confirm minor"
```

Repeat for the other three todo items, then append a `## Summary of Changes` section naming the panel, the button,
and the four modules. Commit the version bump, the changelog, and the bean file together:

```bash
git add manifest.json package.json CHANGELOG.md .beans/
git commit -m "chore: release 0.3.0"
```

- [ ] **Step 6: Tag**

```bash
git tag -a v0.3.0 -m "0.3.0 — Kit plaque panel and compass-dart button"
```

Do not push. The user pushes when they choose to.

## Follow-ups, not in this plan

- **firefox-weather-button-4q55** — the 16 px dart on a real toolbar. The dart is about 8 px long and 6 px wide
  there. Direction and colour read in the local preview; the toolbar itself is unverified.
- **firefox-weather-button-sp40** — the bottom-band decision, blocked on 4q55.
- Force 12's dark colour sits at 4.15:1 on `--tile`, under the 4.5:1 AA asks for the plaque's 11 px gust text. It is
  a recorded exception. If it is ever revisited, the whole top of the ramp moves with it.

## Self-review notes

Checked after writing, against the spec:

- Every spec section maps to a task. Header and footer, plaque grid, thunder strip: Task 8. Dewpoint plaque: Task 8.
  Pressure plaque: Task 9. Cloud base plaque: Tasks 6, 7, 10. Wind plaque: Tasks 5, 11. Toolbar button: Tasks 1–4.
  Beaufort ramp: Task 1. Light scheme: carried by `beaufortColour` and the Kit tokens, no task of its own. Unavailable
  states: Tasks 8–11, each instrument clearing itself. Modules table: Tasks 1, 3, 5, 6. Testing list: covered, with
  `wind-barbs` and `cloud-sky` asserting the spec's own worked cases.
- The four resolved decisions are implemented: 6,500 ft in `cloud-sky.js`, the ring and the shaftless barbs in
  `wind-dart.js` and `wind-barbs.js`, the downwind dart in `wind-dart.js`, and the 16 px check deferred to 4q55.
- Names are consistent across tasks: `beaufortColour`/`beaufortForce`, `announcedKnots`, `dartPoints`, `windBarbs`,
  `cloudSky`/`skyHeight`, `cloudLayers`, `bearingDegrees`. `buildSvg` is introduced in Task 9 and reused in Tasks 10
  and 11; a task executed out of order must add it if it is missing.
- Colours reach CSS as custom properties (`--chip-background`, `--chip-foreground`, `--wind-colour`) rather than as
  `style.color`, because a `light-dark()` pair written to a standard property can be dropped by a strict CSS parser —
  jsdom's included, which would make the tests lie.

## Code rules

> These rules outrank this plan. Where a code sample above contradicts one, follow the rule and say so in your report.

Matched by `~/.claude/hooks/rules_inject.py` against the paths this plan creates and modifies. Paste this whole
section, verbatim, into the body of every subagent brief and every review brief. See *Dispatch rule* above.

```text
The user's standing code rules for this file type, from ~/.claude/rules/.
They outrank any task brief, plan, or surrounding code that contradicts them:
if a brief specifies code that breaks a rule below, follow the rule and say so.

--- css.md ---
# CSS style

- prefer native nesting to group related styles
- properties alphabetized per block; exception: order-dependent ones (shorthand before longhands, `-webkit-` before standard) — comment when
  you break order
- name and order classes to follow the elements' order on the page, to the extent possible
- alphabetize custom properties in :root
- use @layer when project complexity makes explicit cascade ordering the simpler solution
- comment the *why* for any non-obvious rule

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
