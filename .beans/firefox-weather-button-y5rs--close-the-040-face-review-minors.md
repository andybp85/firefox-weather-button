---
# firefox-weather-button-y5rs
title: Close the 0.4.0 face review minors
status: completed
type: task
priority: normal
created_at: 2026-09-05T14:13:21Z
updated_at: 2026-09-05T16:38:20Z
parent: firefox-weather-button-xdex
blocking:
    - firefox-weather-button-b1by
---

Residuals from the button-face final review (merge 2f27976). One parked finding and five deferred minors; none blocks the merge, all should land before the 0.4.0 tag.

- [x] Move the unknown-state throw in drawWind (src/button-icon.js) ahead of the bearing-undefined branch, so a state that is neither unreported, calm, nor measured throws even when it carries no bearingDegrees. Regression test: `{ state: 'bogus', knots: 6 }` throws `cannot draw an unknown wind state: bogus`.
- [x] Record textAlign and textBaseline in the fake canvas context in test/button-icon.test.js and assert 'center' / 'middle' in the figures test; deleting either line in src/button-icon.js must fail the suite.
- [x] Assert in test/button.test.js that a bearing-carrying wind (NW 18 G 27) reaches paintIcon intact, alongside the calm case.
- [x] README "The toolbar button": the heavy ring is any measured wind with no bearing, not only one the station calls variable. Add the "or reports a speed with no bearing at all" clause.
- [x] Assert startAngle 0 / endAngle 2π on the bead arc in the bead-position test (the ring already has it).
- [x] docs/superpowers/plans/2026-09-04-button-face.md Task 1 Step 5: "13 tests" → "12 tests" (plan typo).

## Summary of Changes

- `drawWind` now throws on an unknown state before the bearing test, and takes the ring colour after it; `{ state: "bogus", knots: 6 }` is the regression test.
- The fake canvas context records `textAlign` and `textBaseline`; the figures test asserts `center` / `middle`, and deleting either line in `src/button-icon.js` was shown to fail the suite.
- `test/button.test.js` proves a NW 18 G 27 wind reaches `paintIcon` with bearing, direction, gust, and speed intact.
- The bead arc asserts `startAngle` 0 / `endAngle` 2π at every compass point in the position test.
- README: the heavy ring is any measured wind with no bearing, variable or otherwise.
- Plan Task 1 Step 5 reads 12 tests.

Suite: 173 tests, all passing; format, oxlint, and markdownlint clean.
