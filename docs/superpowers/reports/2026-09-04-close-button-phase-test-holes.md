# Report — closing the button-phase test holes

- **Date:** 2026-09-04
- **Review closed:** `docs/superpowers/reports/2026-09-03-review-button-phase.md`, findings 1–6
- **Spec:** `docs/superpowers/specs/2026-09-03-kit-panel-and-button-design.md`
- **Scope:** test-only. No file under `src/` changed. The review's verdict that the shipped geometry and colours are
  correct held up at every point below.
- **Suite:** 176 tests before, 179 after.

## What changed

| File                       | Change                                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| `test/wind.test.js`        | New case at gust +11, the spec's own second gust case.                                         |
| `test/beaufort.test.js`    | Nine upper threshold edges added; the whole `BEAUFORT` table pinned against the spec's rows.   |
| `test/button-icon.test.js` | `lineJoin` recorded by the test double; new due-north case; new dart stroke case.              |
| `test/wind-dart.test.js`   | The sixteen-bearing loop now asserts the tip's heading; the reach test takes the spec's bound. |

## Mutation evidence

Every mutant was applied to `src/`, run against the full suite, and reverted. Each was run twice: once against the
tests as they stood at `09706a2` and once against the tests as they stand now. Fifteen of the seventeen survived
before and none survives now.

| Finding | Mutant                                                       | Before                 | After               |
| ------- | ------------------------------------------------------------ | ---------------------- | ------------------- |
| 1       | `GUST_MARGIN_KNOTS` 10 → 11                                  | survived               | killed (1 failure)  |
| 1       | `GUST_MARGIN_KNOTS` 10 → 13                                  | survived               | killed (1 failure)  |
| 2       | `BEAUFORT[2].below` 7 → 6                                    | survived               | killed (2 failures) |
| 2       | `BEAUFORT[3].below` 11 → 10                                  | survived               | killed (2 failures) |
| 2       | `BEAUFORT[4].below` 17 → 16                                  | survived               | killed (2 failures) |
| 2       | `BEAUFORT[6].below` 28 → 27                                  | survived               | killed (2 failures) |
| 2       | `BEAUFORT[7].below` 34 → 33                                  | survived               | killed (2 failures) |
| 2       | `BEAUFORT[8].below` 41 → 40                                  | survived               | killed (2 failures) |
| 2       | `BEAUFORT[9].below` 48 → 47                                  | survived               | killed (2 failures) |
| 3       | force 12 `dark` `#f05a2a` → the chart's `#c93f14`            | survived               | killed (1 failure)  |
| 3       | force 12 `light` `#c13900` → `#c13901`                       | survived               | killed (1 failure)  |
| 3       | force 11 `light` `#b14a02` → `#b14a03`                       | survived               | killed (1 failure)  |
| 4       | `wind.bearingDegrees === undefined` → `!wind.bearingDegrees` | survived               | killed (1 failure)  |
| 5       | delete `context.lineJoin = 'round'`                          | survived               | killed (1 failure)  |
| 5       | `DART_STROKE` 2 → 9                                          | survived               | killed (1 failure)  |
| 6       | `DOWNWIND_DEGREES` 180 → 0                                   | killed by the polygons | killed (6 failures) |
| 6       | `DART.wingOut` 13 → 19                                       | killed by the polygons | killed (4 failures) |

The `GUST_MARGIN_KNOTS` 10 → 11 mutant is stronger than the review's 10 → 13 and is the one that proves the constant
is pinned rather than merely bracketed.

The two finding-6 mutants were already dying against the two worked polygons, which is consistent with the review:
finding 6 was an overclaiming test name, not an uncovered behaviour. What is new is that they now die in the tests
whose names promise to catch them. Run against `test/wind-dart.test.js` alone:

- Under `DOWNWIND_DEGREES` 0, "sends the tip downwind of the centre at every bearing" fails — it did not exist before.
- Under `wingOut` 19, "keeps its vertices clear of the face edge and the comfort band" fails. The old reach test
  passed this mutant: `hypot(14, 19)` is 23.3, still inside the 25 it checked.

## Finding by finding

### 1. The gust margin at +11

`test/wind.test.js` gained `announcedKnots({ gustKnots: 29, knots: 18 })` → 29, beside the existing +10 and +14
cases. The spec's testing list asks for +10 and +11; the plan substituted +14, which left the constant free anywhere
in `10 <= margin < 14`. The +14 case is kept: it is the spec's own `W 18 G 32` colour sample, and the button-icon
suite reads the same wind.

### 2. Both edges of every force

The table in "beaufortForce names the force a speed falls in at every threshold edge" gained the nine missing upper
edges — 6, 10, 16, 21, 27, 33, 40, 47, 55 — so every one of the thirteen forces is now pinned on both sides. A lower
edge alone cannot catch a `below` that is one knot short, which is why seven of these mutants survived.

### 3. The whole ramp, hex for hex

"BEAUFORT holds the thirteen rows of the design spec, the last open at the top" now asserts the entire table by
`deepEqual` against the spec's thirteen rows. It replaces two weaker tests:

- the old length-and-`Infinity` check, which the full table subsumes exactly, and
- `light !== dark`, which any wrong hex satisfied.

The comment on the new test records why the literal values are worth pinning: force 12's dark is lifted off the
chart's `#c93f14` to reach 4.15:1 on `--tile` (a recorded exception, not an oversight), and every light partner is an
OKLCH L 0.52 value chosen to clear 4.5:1 there. Neither decision leaves a trace anywhere else in the suite.

### 4. Due north

`toWind({ wdir: 0, wspd: 20 })` gives `bearingDegrees: 0`, a heading the station reported. The new case asserts that
the dart is drawn — no `arc` call, and the tip at `(32, 41)`, below the plot centre, because a north wind blows
south. This is the case that separates `=== undefined` from a truthiness test.

### 5. The dart's stroke

The recording context now captures `lineJoin` alongside `fillStyle`, `font`, `lineWidth` and `strokeStyle`, which is
what the spec's testing list asked for. A new case reads the dart's `stroke` call and asserts `lineJoin === 'round'`
and `lineWidth === 2`.

### 6. The "every bearing" loop — made to earn its name

I made the loop earn its name rather than renaming it, and split the old test in two:

- **"sends the tip downwind of the centre at every bearing"** keeps the sixteen-bearing sweep and asserts the one
  thing that actually varies with the bearing: the compass heading of the tip from the plot centre is the bearing
  plus 180. The heading is read back out of the returned point with `atan2` rather than rebuilt from the module's own
  `forward`/`right` basis, so a sign error cannot cancel itself out between the code and its test.
- **"keeps its vertices clear of the face edge and the comfort band"** drops the loop, states in a comment that a
  reach is rotation-invariant so one bearing answers for all sixteen, and takes the spec's own bound: worst vertex
  reach under 20.1, with the old `worst + 1 < 25` kept beside it as the statement about the band. The 20.1 bound is
  what closes the 4.9 units of slack the review measured.

Renaming was the cheaper option and I passed on it: the reach assertion had real slack in it, and the tip's heading
is the property most worth a per-bearing sweep — it is what the whole mark is for.

## Spec against plan

Three places, all resolved in the spec's favour, as instructed:

| Question         | Plan | Spec                              | Taken |
| ---------------- | ---- | --------------------------------- | ----- |
| Gust margin case | +14  | +10 and +11                       | Spec  |
| Recorded fields  | Four | `stroke`, `lineJoin`, `lineWidth` | Spec  |
| Dart reach bound | 25   | 20.1 to a vertex                  | Spec  |

Nothing else in the plan's test text contradicted the spec.

## Gates

`npm test` (179 pass, 0 fail), `npm run format`, `npm run lint:js` all green, and the pre-commit lint and secrets
guards ran on the commit path with no `--no-verify`. `src/ui.css` was untouched, so stylelint was not needed.

The `test/popup-main.test.js` flake (bean `firefox-weather-button-cj8j`) fired once, on the gate run after the commit:
178 of 179, one failure, in its usual shape of the total dropping by one. Three re-runs immediately after it came back
179 of 179. It did not appear in any of the thirty-four mutation runs or their baselines, and no mutant above was
scored on a run it touched — every kill listed is a failure in the file the finding names.

## Concerns

- The full-table assertion in `test/beaufort.test.js` is a change-detector by construction: any deliberate change to
  the ramp will fail it and have to be typed twice, once in `src/beaufort.js` and once in the test. That is the
  intended cost — the two values it protects are accessibility decisions with no other witness — but the next person
  to edit the ramp should know the second copy is deliberate and lives there to be updated.
- `test/wind-dart.test.js` no longer sweeps sixteen bearings for reach. It does not need to, and the comment says so,
  but a reader skimming for coverage may read the change as a loss.
