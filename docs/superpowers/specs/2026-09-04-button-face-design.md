# The 0.4.0 button face — Design

- **Date:** 2026-09-04
- **Status:** Approved 2026-09-04; plan at `docs/superpowers/plans/2026-09-04-button-face.md`
- **Version target:** 0.4.0
- **Bean:** firefox-weather-button-xdex
- **Brief:** `docs/superpowers/briefs/2026-09-04-button-face-design-brief.md`
- **Canvas:** [button face comparison](https://claude.ai/code/artifact/1e24765d-341b-4f3a-9a82-5d50621f4573);
  generator at `docs/superpowers/design/2026-09-04-button-face/build.mjs`. Direction C, bead on ring, chosen with the
  canvas defaults on 2026-09-04.

## Purpose

Replace the toolbar button's face. The shipped 0.3.0 face carries the dewpoint in figures, a comfort band along the
foot, a pressure-trend notch cut into the band, and a compass dart that takes the face once the wind is notable. The
user has lived with it and found the dewpoint figure is not a number anyone acts on and the pressure trend is
unreadable at 16 device pixels.

The new face carries the temperature in figures on a disc filled with the dewpoint comfort colour, ringed by a
circle in the Beaufort colour of the wind, with a bead on the ring where the wind comes from. Three elements and two
colour systems, the disc always comfort and the ring always wind. The single takeaway: "It's 72, it's sticky, and
the wind's up from the southwest."

Every number below is the canvas default, transcribed into the 64-unit face the drawing code already works in. Where
the canvas and this document differ, the canvas wins for geometry and this document wins for behaviour.

## Non-goals

- The popup. Unchanged. Its wind plaque, barometer, and comfort plaque are the detail the button points at.
- The data modules. `beaufort.js`, `comfort.js`, `observation.js`, and the decoding half of `wind.js` are read, not
  changed. The gust-margin rule (`announcedKnots`) stays as it is.
- Any element beyond disc, ring, bead, and figures. The pressure trend leaves the face for the tooltip and the popup.
  Bean firefox-weather-button-mhtm (dominant phenomenon on the button) is scrapped on this ground.
- A unit option. The face reads degrees Fahrenheit, which is what `observation.js` already rounds and what the popup
  shows.
- Showing which speed the ring read. The ring takes the announced colour silently; the popup says which.

## Settled decisions

| Decision              | Choice                                                                    | Rationale                                                                                       |
| --------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| The figure            | Temperature, °F, rounded                                                  | The reading a person acts on; the dewpoint was not                                              |
| Comfort carrier       | A disc behind the figures                                                 | Geometry separates the two colour systems: disc is comfort, ring is wind                        |
| Figure ink            | The comfort band's own computed foreground                                | Already contrast-checked per band in `comfort.js`                                               |
| Wind carrier          | A ring around the disc, Beaufort colour, every measured wind              | The old notable threshold hid most winds; force 1 is quiet enough on its own                    |
| Bearing mark          | A bead on the ring (canvas direction C)                                   | User's pick. A compass rose reads position; the bead is the smallest mark that has one          |
| Sense                 | Upwind: the bead sits where the wind comes from                           | Station-model convention; now matches the popup's barbs. Reverses the 0.3.0 downwind dart      |
| Calm                  | Light ring, no bead, force 0 colour                                       | A positive report of still air, distinct from absence                                           |
| Variable (VRB)        | Heavy full ring, no bead, in the announced colour                         | Reports the force and claims no heading                                                         |
| Unreported            | No ring                                                                   | Nobody measured; nothing is claimed                                                             |
| Gust                  | Ring takes `announcedKnots` silently                                      | Settled in 0.3.0; the face has no room to say which speed it read                               |
| Pressure trend        | Off the face; stays in the tooltip                                        | Unreadable at 16 px; the popup's barometer carries it                                           |
| Three characters      | Type shrinks to two thirds, as shipped                                    | `-12` and `104` hold inside the disc on the canvas                                              |
| Bean mhtm             | Scrapped                                                                  | Nothing on the face but disc, ring, and figures; a phenomenon colour would be a third system    |

## Standards Check

Applied (folded into the plan):

- WCAG 2.2 AA 1.4.3 (contrast) → figure ink is the comfort table's computed black or white per band, unchanged from
  `comfort.js`. 1.1.1 (text alternative) → the tooltip carries every value the face draws, in words.
- WMO No. 306 / FMH-1 station-model convention → the mark sits on the upwind side, as the popup's barbs do.
- Beaufort scale (WMO code table 1100) → ring colour from `beaufort.js`, thresholds in knots.
- Keep a Changelog 1.1.0 and SemVer 2.0.0 → `[Unreleased]` entries; a minor bump, since the face changes what it
  reports but no API.

Considered, not applicable:

- OWASP ASVS — no new input, no new fetch; the observation pipeline is unchanged.
- GDPR / CCPA — no personal data.

## The face

Drawn in a 64-unit square and scaled by `unit = size / 64` for each edge Firefox asks for (16 and 32). Two Kit chrome
values are fixed literals in both schemes: the toolbar-field indigo `#03083f` and the chrome text `#e6e8ff`. The chrome
text no longer appears on the face, so `CHROME_INK` is deleted from `button-icon.js`.

Geometry, one exported constant so the toolbar pass can tune any dimension without touching the drawing code:

```js
// The canvas defaults for direction C, in the 64-unit face. Radii and strokes, not diameters, except the bead,
// which is the one mark a reader sizes as a dot.
export const FACE_GEOMETRY = Object.freeze({
    baseline: 1,
    bead: 9,
    em: 28,
    heavy: 6,
    light: 2.5,
    moat: 3,
    ring: 27,
})
```

Painted in this order:

1. **Chip:** rect 64×64, corner radius 9.6, filled `#03083f`.
2. **Disc:** circle at `(32, 32)`, radius `ring − heavy / 2 − moat` = 21, filled with `comfortBand(dewpoint).background`.
   The moat is measured from the heavy stroke's inner edge, so the disc keeps the same clearance under a VRB ring as
   under a light one.
3. **Figures:** `String(temperatureFahrenheit)`, bold `system-ui, sans-serif`, centred at `(32, 32 + baseline)`,
   `textAlign 'center'`, `textBaseline 'middle'`, filled with `comfortBand(dewpoint).foreground`. Em 28 for one or two
   characters; three characters take `em · 2 / 3` by the shipped `readingEm` rule.
4. **Ring and bead**, by wind state:
   - `unreported` → nothing more.
   - `calm` → full circle at radius 27, stroke `light`, colour `BEAUFORT[0].dark` (`#129bf7`).
   - `measured`, no `bearingDegrees` → full circle at radius 27, stroke `heavy`, colour of the announced force.
   - `measured` with `bearingDegrees` → full circle at radius 27, stroke `light`, then a filled circle of diameter
     `bead` centred on the ring at the bearing, both in the colour of the announced force.

Colour is `BEAUFORT[beaufortForce(announcedKnots(wind))].dark` on every ring path. Stroke caps are `butt`; there are no
arc ends on this face, so the cap never shows.

The bead's centre, for `θ = bearingDegrees` measured clockwise from north on screen: `(32 + 27 sin θ, 32 − 27 cos θ)`.
This is the upwind side. Checked positions: N `(32, 5)`; E `(59, 32)`; S `(32, 59)`; SSW 202.5° `(21.67, 56.94)`;
SW `(12.91, 51.09)`; W `(5, 32)`.

Clearance against the rounded corner, checked at 45°: the bead's centre is 4.68 from the corner arc's centre against
an allowed 5.1, so the bead sits inside the chip. The heavy ring's outer edge is 1.68 from that centre against 9.6.
The face survives the clip without relying on space the corner eats.

At 16 device pixels: ring radius 6.75 px, light stroke 0.625 px, heavy 1.5 px, bead 2.25 px, disc radius 5.25 px,
type 7 px. The bead is at the floor the 0.3.0 dart failed at. That failure was a mark whose direction could not be
read; the bead carries only position, and the canvas sweep showed every neighbouring compass point distinct at 16 px
in Chromium. The toolbar pass is what decides it (see *Verification*).

Colour samples from the brief's cases: 40° 14 kt → force 4 `#6cf640`; 292.5° 22 G 31 → force 6 `#dcf59d` (gust +9,
sustained keeps it); 270° 18 G 32 → force 7 `#f5f69c` (gust +14 takes it); 180° 55 G 65 → force 10 `#f69c6e` (gust
+10, not more); VRB 6 G 21 → force 5 `#c8f640`; 40° 3 kt → force 1 `#6cc8f7`.

Known weak pairing, recorded not fixed: a sticky `#FFFF00` disc inside a force 7 `#f5f69c` ring reads as pale rather
than as a colour. The moat keeps the shapes apart; the two charts are fixed, so it stays.

## Tooltip

The button's title leads with the temperature and keeps every reading the face dropped, so nothing the 0.3.0 face
said goes unsaid:

```text
<station> — 72F, dewpoint 60F (sticky), pressure falling, wind SW 20 kt
```

`describeWind` is unchanged and supplies the last clause, including `calm`, `unreported`, `variable 6 kt G 21`.
The tendency is still resolved for the title, so `updateButton`'s model call does not change.

## Modules

Changed:

- `src/button-icon.js` — rewritten around `FACE_GEOMETRY`. `drawButtonIcon({ context, dewpointFahrenheit, size,
  temperatureFahrenheit, wind })`; `direction` leaves the signature. Small verbs: `drawChip`, `drawDisc`, `drawFigures`,
  `drawRing`, `drawBead`, and one `drawWind` that picks by state. The band, trend glyphs, dart, and directionless ring
  go.
- `src/button.js` — `describeButton` passes `temperatureFahrenheit` through and writes the new title. The comment
  describing the face is rewritten.
- `src/background.js` — `rasterise` and `paintIcon` carry `temperatureFahrenheit` instead of `direction`.
- `src/wind.js` — `isNotable`, `isBrisk`, and `NOTABLE_KNOTS` are deleted; the button was their only reader.
  `announcedKnots`, `toWind`, `describeWind` stay.
- `docs/icon-preview.js` and `docs/icon-preview.html` — the brief's case list (the eleven readings, force 1 beside
  force 10, the two collision pairs) plus the sixteen-point compass sweep, each row labelled temperature, dewpoint,
  and wind. The lede and captions describe the new face.
- `README.md` — *The toolbar button* and *Preview the toolbar icon* rewritten; the verification note updated.
- `CHANGELOG.md` — `[Unreleased]`: Changed (the face), Removed (dewpoint figure, band, trend notch, dart, notable
  threshold).
- `manifest.json` and `package.json` descriptions lead with temperature.

Deleted: `src/wind-dart.js`, `test/wind-dart.test.js`.

## Testing

Test-first, the recording-context pattern `test/button-icon.test.js` already uses. The context records `arc` with
its radius and centre, so the disc, ring, and bead are asserted as geometry, not raster.

- `button-icon.test.js` — the chip in indigo; the disc at radius 21 in the comfort background; the figures in the
  comfort foreground at `(32, 33)` and em 28, shrinking for three characters; no ring for `unreported`; a light ring
  in `#129bf7` for `calm`; a heavy ring and no bead for VRB; a light ring plus a bead of radius 4.5 at the checked
  positions for N, E, S, SSW, W; the four gust-rule colour samples above; every path's stroke or fill colour.
- `button.test.js` — the title's wording for a full reading, calm, unreported, and variable; `temperatureFahrenheit`
  reaches `paintIcon`; `direction` no longer does.
- `wind.test.js` — the `isNotable` and `NOTABLE_KNOTS` cases are deleted, not skipped.
- `background.test.js` — `paintIcon` rasters both sizes with the temperature.

The suite, `oxfmt --check`, `oxlint`, `stylelint`, and `markdownlint-cli2` stay green at every commit.

## Verification

The bean's last item, and the gate before 0.4.0 is cut: the face seen through `setIcon` at 16 px on a real toolbar,
in the Kit theme and the default theme, on a 1× display and a 2× display. Cases to look at, from the preview page: the
compass sweep, calm beside force 1, VRB beside a heavy wind, `-12`, `104`, and the sticky-disc-force-7 pairing. Record
the pass in `docs/verification-log.md`.

If the bead does not read through `setIcon`, the fallback is canvas direction A, the 90° heavy sweep over the light
ring: same ring, same three no-heading states, one different mark function. `FACE_GEOMETRY` gains `sweep: 90` and
`drawBead` gives way to `drawSweep`. That is a tuning pass on one module, not a redesign.

## Code rules

> These rules outrank this plan. Where a code sample above contradicts one, follow the rule and say so in your report.

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
```
