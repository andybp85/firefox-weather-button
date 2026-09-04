# Review — button phase (Tasks 1–4)

- **Date:** 2026-09-03
- **Range:** `d159c8f..d1b6ceb` (`a425442`, `d29d493`, `91ca02d`, `d1b6ceb`)
- **Plan:** `docs/superpowers/plans/2026-09-03-kit-panel-and-button.md`
- **Spec:** `docs/superpowers/specs/2026-09-03-kit-panel-and-button-design.md`
- **Method:** superpowers:requesting-code-review
- **Verdict:** shipped geometry and colour rules are correct against the spec. Every finding below is a hole in the
  tests, not a wrong number on screen.

<!-- The branch was merged and its worktree removed mid-review (main is now c6409ab). The four commits carry the same
     SHAs on main, and only a comment in src/wind.js changed after d1b6ceb, so every finding below still reproduces
     against main as it stands. -->

## What was verified independently

Re-derived from the spec, not read back off the tests:

- **Dart vertices.** With `theta = fromDegrees + 180`, `forward = (sin, -cos)`, `right = (cos, sin)`, tip at
  `centre + 16*forward`, wings at `centre - 14*forward +/- 13*right`, notch at `centre - 7*forward`:
  - `fromDegrees 180` gives `(32,9) (45,39) (32,32) (19,39)` — matches the spec's `S 55` sample.
  - `fromDegrees 202.5` gives `(38.1229,10.2179) (38.6528,42.9092) (29.3212,31.4671) (14.6320,32.9594)` — matches
    the spec's `SSW 15` sample to the two decimals it quotes.
  - Worst vertex reach is `hypot(14,13) = 19.105`, 20.105 with half the 2-unit stroke, against 25 to the top edge
    and 25 to the band top at `y = 50`. Clears.
  - Winding is tip, right wing, tail notch, left wing, as the plan's Interfaces require.
- **Beaufort thresholds.** All thirteen `below` values reproduce the spec table's closed knot ranges exactly
  (`<1`, `1–3`, `4–6`, `7–10`, `11–16`, `17–21`, `22–27`, `28–33`, `34–40`, `41–47`, `48–55`, `56–63`, `>=64`), and
  all twenty-six hexes match the table character for character.
- **Colour rule samples.** `beaufortForce(announcedKnots(wind))` for the spec's four samples: SSW 15 → 4 `#6cf640`;
  WNW 22 G 31 (+9) → 22 → 6 `#dcf59d`; W 18 G 32 (+14) → 32 → 7 `#f5f69c`; S 55 G 65 (+10, not more) → 55 → 10
  `#f69c6e`. All four are asserted in `test/button-icon.test.js:153-162` and all four are right.
- **Button face.** Chip 64×64 rx 9.6 `#03083f`; band `y` 50 to 64 with `roundRect` radii `[0, 0, 9.6, 9.6]`
  (top-left, top-right, bottom-right, bottom-left — the two lower corners, correct); trend triangles and dash at the
  spec's coordinates, cut in `CHIP_INK`; reading bold 34-unit `system-ui` centred at `(32, 25)` in `#e6e8ff`;
  `readingEm` gives 22.667 for three characters. All match.

### The Task 4 lane's correction is right

`test/button-icon.test.js:173` asserts `#c8f640` where the plan wrote `#6cc8f7`. The spec's rule is
`beaufortForce(announcedKnots(wind))`; for `{ gustKnots: 21, knots: 6 }` the gust is 15 over the sustained, more than
the 10 kt margin, so the announced speed is 21, which falls in force 5's `17–21` band and takes `#c8f640`. The plan's
`#6cc8f7` is `BEAUFORT[1].dark` and follows from no rule in the spec — it reads like the force was taken from the
sustained 6 kt and then mis-indexed. The correction, and the comment the lane added with it, are both correct.

No other worked number in the shipped tests fails to follow from the spec.

## Mutation evidence

Every mutant below was applied to a scratch copy of `src/` and run against the **full** suite (`node --test
test/*.test.js`). All thirteen survived with zero failures.

| Mutant                                                       | Survives |
| ------------------------------------------------------------ | -------- |
| `BEAUFORT[2].below` 7 → 6                                    | yes      |
| `BEAUFORT[3].below` 11 → 10                                  | yes      |
| `BEAUFORT[4].below` 17 → 16                                  | yes      |
| `BEAUFORT[6].below` 28 → 27                                  | yes      |
| `BEAUFORT[7].below` 34 → 33                                  | yes      |
| `BEAUFORT[8].below` 41 → 40                                  | yes      |
| `BEAUFORT[9].below` 48 → 47                                  | yes      |
| force 12 `dark` `#f05a2a` → the unlifted chart `#c93f14`     | yes      |
| force 12 `light` `#c13900` → `#c13901`                       | yes      |
| `GUST_MARGIN_KNOTS` 10 → 13                                  | yes      |
| `DART_STROKE` 2 → 9                                          | yes      |
| delete `context.lineJoin = 'round'`                          | yes      |
| `wind.bearingDegrees === undefined` → `!wind.bearingDegrees` | yes      |

Killed for contrast (so the harness is sound): `BEAUFORT[1].below` 4 → 3, `[5].below` 22 → 21, `[11].below` 56 → 55,
`[12].below` 64 → 63, and the five dark hexes the button-icon colour tests pin (forces 4, 5, 6, 7, 10).

## Findings

### 1. The 10 kt gust margin is not pinned — `src/wind.js:63`, `test/wind.test.js:97-104`

`announcedKnots` is tested at +10 (sustained wins) and +14 (gust wins). Nothing between them is tested, so the
constant is only constrained to `10 <= margin < 14`. The spec's own testing list asks for **+10 and +11**, which
would pin it exactly; the plan substituted +14 and the lane shipped the plan.

Failure: a wind of 18 kt gusting 30 (+12) must announce 30 → force 7 `#f5f69c`. With the constant silently at 12 or
13 it announces 18 → force 4 `#6cf640`, three bands wrong on the toolbar, and the suite stays green.

Fix: change `announcedKnots({ gustKnots: 32, knots: 18 })` to `announcedKnots({ gustKnots: 29, knots: 18 })`, or add
that case beside it.

### 2. Seven of twelve Beaufort upper edges are unpinned — `test/beaufort.test.js:5-30`

The test is titled "at every threshold edge" and the plan's Task 1 requires the edges, but the table asserts a lower
edge for most forces and an upper edge for only two (force 1 at 3 kt, force 11 at 63 kt). A lower edge alone cannot
catch a `below` that is one knot too small: with `BEAUFORT[2].below = 6`, `beaufortForce(7)` is still 3, so the
assertion at 7 kt passes.

Failure: `BEAUFORT[2].below = 6` → a 6 kt wind reports force 3 `#13dd14` (gentle breeze green) instead of force 2
`#7dcabf`, on both the button and the panel. Suite green.

Fix: add the upper edge of each force — 6, 10, 16, 21, 27, 33, 40, 47, 55 — to the same table. Nine rows.

### 3. Force 12's lifted dark, and every light partner but force 4's, have no test — `src/beaufort.js:13-25`

The spec records `#f05a2a` as a deliberate departure from the chart's `#c93f14`, lifted to reach 4.15:1 on `--tile`,
and the light partners as OKLCH L 0.52 values chosen to clear 4.5:1. Reverting force 12's dark to the unlifted chart
value (2.8:1) passes the whole suite, and so does a one-digit change to any light partner except force 4's — the only
one `beaufortColour(4)` pins. `test/beaufort.test.js:47-51` asserts only `light !== dark`, which any wrong hex
satisfies.

Failure: a hurricane-force gust reading ships at 2.8:1 on the popup plaque, the accessibility exception the spec
measured and recorded is silently undone, and nothing fires.

Fix: assert the whole `BEAUFORT` table against the spec's own thirteen rows, or at minimum pin force 12's pair.

### 4. Due north (`bearingDegrees: 0`) is never drawn — `src/button-icon.js:130`

The dart/ring branch is `wind.bearingDegrees === undefined`. No test supplies a bearing of 0, so the guard can be
weakened to a truthiness test with the suite green (mutation confirmed).

Failure: `toWind({ wdir: 0, wspd: 20 })` returns `{ bearingDegrees: 0, direction: 'N', knots: 20, state: 'measured' }`.
Under `if (!wind.bearingDegrees)` the button draws the directionless ring — "speed, no heading" — for a wind the
station explicitly reported as due north, discarding a heading it has. `docs/icon-preview.js`'s compass sweep would
show it; CI would not.

Fix: one case in `test/button-icon.test.js` with `bearingDegrees: 0` asserting the dart's tip at `(32, 41)` (a north
wind blows south, so the tip is below the centre).

### 5. The dart's stroke width and round joins are unasserted — `src/button-icon.js:114-125`, `test/button-icon.test.js:17-27`

The spec asks for "stroke 2 with round joins (`lineJoin = 'round'`, width `2 · size / 64`)" and its testing list says
"the recording context gains `stroke`, `lineJoin`, `lineWidth`". The recording context captures `fillStyle`, `font`,
`lineWidth`, `strokeStyle` — no `lineJoin` — and no test reads `lineWidth` for the dart (only `ring.lineWidth` at
line 174). Deleting the `lineJoin` assignment passes; `DART_STROKE = 9` passes.

Failure: the round joins are what the module's own comment says keep the dart from reading as a paper aeroplane at
16 px. A later edit can drop them, or triple the stroke into a blob, with no signal.

Fix: add `lineJoin` to the recorded fields and assert `lineJoin === 'round'` and `lineWidth === 2` on the dart's
`stroke` call.

### 6. The "every bearing" reach test tests one bearing — `test/wind-dart.test.js:32-45`

`Math.hypot(x - centre.x, y - centre.y)` is rotation-invariant, so all sixteen bearings produce the identical set of
four reaches. The loop is decorative. The assertion also carries 4.9 units of slack (`20.105 < 25`), so it would pass
with `wingOut` as large as ~19 or `tip` as large as ~24.

Not a defect in the shipped geometry, which I re-derived as correct — but the test's name overclaims, and the two
worked polygons at 180 and 202.5 are doing all the real work of pinning the dart's orientation.

Fix: either say what it actually checks ("the dart's reach clears the face and the band") and drop the loop, or make
it a per-bearing assertion of something bearing-dependent (e.g. that the tip is on the downwind side of the centre).

## Not findings

- **`announcedKnots` and `DIRECTIONLESS_RING` are wired.** `src/button-icon.js:128` and `:108,:110` respectively.
  Both are called; neither is dead surface any more.
- **`beaufortColour` had no consumer at `d1b6ceb`.** That is Task 5's job by the spec's module table, and it has
  since landed in `popup.js`. Correct as sequenced.
- **`src/windsock.js` / `test/windsock.test.js` existing at `d1b6ceb`.** Task 8's deletion, out of scope, and it has
  since landed — nothing under `src/`, `README.md`, or `docs/` mentions the sock now.
- **Code rules.** No violation found in the four commits. Object properties are alphabetized throughout
  (`{ below, dark, light, name }`, `{ notch, tip, wingBack, wingOut }`, `{ radius, stroke }`, `{ em, x, y }`,
  `TREND_GLYPHS`'s falling/rising/steady); no semicolons; `const` throughout; `undefined` never used as a meaningful
  value; the `drawTrend` guard throws rather than passing silently; every non-obvious number carries a *why* comment.
  `TREND_GLYPHS` stores points as `[x, y]` pairs while `wind-dart.js` returns `{ x, y }` objects — a coordinate pair
  is arguably a list, and `drawTrend` maps one to the other in a single line, so this is consistency taste, not a
  rule break.
- **Shipped code matches the plan's Task 3 and Task 4 code blocks verbatim.** Findings 1, 3, and 5 originate in the
  plan's own test text, not in the implementer's transcription.

## Nit

`docs/icon-preview.js:25,29` use `wdir: 202.5` and `wdir: 292.5`. The comment above `CASES` says each row is written
"as the METAR fields the station sends"; a METAR sends whole tens of degrees. Harmless for a preview page, and the
values were chosen to reproduce the spec's SSW and WNW samples exactly, which is the better reason to keep them —
but a one-clause note would stop the next reader wondering.
