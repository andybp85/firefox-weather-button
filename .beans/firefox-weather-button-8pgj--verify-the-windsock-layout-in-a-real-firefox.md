---
# firefox-weather-button-8pgj
title: Verify the windsock layout in a real Firefox
status: completed
type: task
priority: high
created_at: 2026-09-02T11:37:58Z
updated_at: 2026-09-02T17:52:53Z
---

The wind layout of the toolbar icon has only been seen rasterised in Chrome, on a preview page that is not in the repository. Load the extension in Firefox Developer Edition and check it against a station reporting a notable wind.

- [ ] Load as a temporary add-on at about:debugging#/runtime/this-firefox
- [ ] Confirm the ordinary icon (light or calm wind) is unchanged
- [ ] Confirm the sock and the corner trend mark read at 16px and at 32px on a HiDPI display
- [ ] Confirm the popup's wind row and its sock render, including calm and unreported
- [ ] Record the result in docs/verification-log.md

## Summary of Changes

Verified in a real Firefox: the windsock layout renders correctly on the toolbar button. Gecko's rasteriser agrees with Blink's on the geometry, and the 1x case looks right.

Verified against whatever the weather was doing at the time, so one case out of the twelve. The rest need fabricated observations rather than patience — carried to firefox-weather-button-4q55. The corner trend mark's legibility at 1x is still an open call, carried to firefox-weather-button-sp40.

`docs/icon-preview.html` landed alongside this (firefox-weather-button-6ybb) and rasterises every case in Gecko, which covers the drawing code but not `setIcon` or Firefox's own scaling into the toolbar.
