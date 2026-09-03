---
# firefox-weather-button-9v2c
title: Implement the Kit panel and button
status: todo
type: feature
priority: normal
created_at: 2026-09-03T13:04:29Z
updated_at: 2026-09-03T13:04:34Z
blocking:
    - firefox-weather-button-o09n
---

Execute docs/superpowers/plans/2026-09-03-kit-panel-and-button.md, the implementation plan for the design settled on bean firefox-weather-button-gxdu. Spec: docs/superpowers/specs/2026-09-03-kit-panel-and-button-design.md.

Four design decisions were resolved with the user on 2026-09-03 before the plan was written, each taking the design pass's recommendation: the high-cloud colour cut at 6,500 ft (the atlas low/mid boundary), a force-colour ring on the button and shaftless barbs on the panel for a wind with no bearing, the dart staying downwind while the panel's barbs stay upwind, and the 16 px toolbar check deferred to firefox-weather-button-4q55.

## Todo

- [x] Resolve the spec's four open decisions and record them in the spec (2026-09-03)
- [x] Write the implementation plan, 13 tasks (2026-09-03)
- [ ] Task 1: the Beaufort ramp (src/beaufort.js)
- [ ] Task 2: bearingDegrees and announcedKnots (src/wind.js)
- [ ] Task 3: the compass dart (src/wind-dart.js)
- [ ] Task 4: the toolbar button — band, notch, dart
- [ ] Task 5: station-model wind barbs (src/wind-barbs.js)
- [ ] Task 6: cloud sky geometry (src/cloud-sky.js)
- [ ] Task 7: cloud layers as data (src/observation.js)
- [ ] Task 8: the panel — markup, styles, plaque text; windsock deleted
- [ ] Task 9: the pressure plaque's barometer
- [ ] Task 10: the cloud plaque's painted sky
- [ ] Task 11: the wind plaque's plot
- [ ] Task 12: README and changelog
- [ ] Task 13: release 0.3.0
