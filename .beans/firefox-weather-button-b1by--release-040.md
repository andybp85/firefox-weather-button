---
# firefox-weather-button-b1by
title: Release 0.4.0
status: completed
type: task
priority: normal
created_at: 2026-09-04T23:34:44Z
updated_at: 2026-09-05T17:02:15Z
blocked_by:
    - firefox-weather-button-xdex
---

Cut 0.4.0 once the bead face has passed the real-toolbar check (firefox-weather-button-xdex). Plan: docs/superpowers/plans/2026-09-04-button-face.md, Task 7.

## Todo

- [x] Run the versioning-with-semver skill against the unreleased entries to confirm minor
- [x] Bump manifest.json and package.json to 0.4.0
- [x] Close the changelog section with the release date
- [x] Verify the packaged build and tag v0.4.0

## Summary of Changes

0.4.0 ships the bead face: the temperature in figures on a comfort-coloured disc, ringed by the wind in its Beaufort colour with a bead on the upwind side. Semver ruling: the face changes what the surface reports and removes the dart, band, notch, and threshold, with no setting renamed and no stored shape changed, so in 0.y.z that is the minor bump, 0.3.0 to 0.4.0.

`manifest.json` and `package.json` at 0.4.0; CHANGELOG `[Unreleased]` closed as `[0.4.0] - 2026-09-05`. Gates: 173 tests passing, oxfmt, oxlint, markdownlint, and `web-ext lint` all clean; `web-ext build` produced `weather_button-0.4.0.zip`. Tagged v0.4.0; not pushed.
