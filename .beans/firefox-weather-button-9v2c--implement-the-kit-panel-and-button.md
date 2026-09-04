---
# firefox-weather-button-9v2c
title: Implement the Kit panel and button
status: completed
type: feature
priority: normal
created_at: 2026-09-03T13:04:29Z
updated_at: 2026-09-04T14:29:53Z
blocking:
    - firefox-weather-button-o09n
---

Execute docs/superpowers/plans/2026-09-03-kit-panel-and-button.md, the implementation plan for the design settled on bean firefox-weather-button-gxdu. Spec: docs/superpowers/specs/2026-09-03-kit-panel-and-button-design.md.

Four design decisions were resolved with the user on 2026-09-03 before the plan was written, each taking the design pass's recommendation: the high-cloud colour cut at 6,500 ft (the atlas low/mid boundary), a force-colour ring on the button and shaftless barbs on the panel for a wind with no bearing, the dart staying downwind while the panel's barbs stay upwind, and the 16 px toolbar check deferred to firefox-weather-button-4q55.

## Todo

- [x] Resolve the spec's four open decisions and record them in the spec (2026-09-03)
- [x] Write the implementation plan, 13 tasks (2026-09-03)
- [x] Task 1: the Beaufort ramp (src/beaufort.js)
- [x] Task 2: bearingDegrees and announcedKnots (src/wind.js)
- [x] Task 3: the compass dart (src/wind-dart.js)
- [x] Task 4: the toolbar button — band, notch, dart
- [x] Task 5: station-model wind barbs (src/wind-barbs.js)
- [x] Task 6: cloud sky geometry (src/cloud-sky.js)
- [x] Task 7: cloud layers as data (src/observation.js)
- [x] Task 8: the panel — markup, styles, plaque text; windsock deleted
- [x] Task 9: the pressure plaque's barometer
- [x] Task 10: the cloud plaque's painted sky
- [x] Task 11: the wind plaque's plot
- [x] Task 12: README and changelog
- [x] Task 13: release 0.3.0

## Summary of Changes

All 13 tasks landed. The panel is a 2x2 of Kit stat plaques, each carrying an instrument (comfort chip, painted cloud sky, station-model wind plot, half-dial barometer); the button is a comfort band with a trend notch and a compass dart when the wind is worth announcing. Beaufort force is one ramp shared by both surfaces. Merged to main as c6409ab, reviewed at 09706a2, and the six test holes the review found closed at c7422ce. Released as 0.3.0.

The user judged the resulting button design not to be working, so 0.4.0 redraws it. The panel and the underlying data modules (`beaufort.js`, `wind.js`, `observation.js`) are not implicated.
