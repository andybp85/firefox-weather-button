---
# firefox-weather-button-y5rs
title: Close the 0.4.0 face review minors
status: todo
type: task
priority: normal
created_at: 2026-09-05T14:13:21Z
updated_at: 2026-09-05T14:13:21Z
parent: firefox-weather-button-xdex
blocking:
    - firefox-weather-button-b1by
---

Residuals from the button-face final review (merge 2f27976). One parked finding and five deferred minors; none blocks the merge, all should land before the 0.4.0 tag.

- [ ] Move the unknown-state throw in drawWind (src/button-icon.js) ahead of the bearing-undefined branch, so a state that is neither unreported, calm, nor measured throws even when it carries no bearingDegrees. Regression test: `{ state: 'bogus', knots: 6 }` throws `cannot draw an unknown wind state: bogus`.
- [ ] Record textAlign and textBaseline in the fake canvas context in test/button-icon.test.js and assert 'center' / 'middle' in the figures test; deleting either line in src/button-icon.js must fail the suite.
- [ ] Assert in test/button.test.js that a bearing-carrying wind (NW 18 G 27) reaches paintIcon intact, alongside the calm case.
- [ ] README "The toolbar button": the heavy ring is any measured wind with no bearing, not only one the station calls variable. Add the "or reports a speed with no bearing at all" clause.
- [ ] Assert startAngle 0 / endAngle 2π on the bead arc in the bead-position test (the ring already has it).
- [ ] docs/superpowers/plans/2026-09-04-button-face.md Task 1 Step 5: "13 tests" → "12 tests" (plan typo).
