---
# firefox-weather-button-8pgj
title: Verify the windsock layout in a real Firefox
status: todo
type: task
priority: high
created_at: 2026-09-02T11:37:58Z
updated_at: 2026-09-02T11:37:58Z
---

The wind layout of the toolbar icon has only been seen rasterised in Chrome, on a preview page that is not in the repository. Load the extension in Firefox Developer Edition and check it against a station reporting a notable wind.

- [ ] Load as a temporary add-on at about:debugging#/runtime/this-firefox
- [ ] Confirm the ordinary icon (light or calm wind) is unchanged
- [ ] Confirm the sock and the corner trend mark read at 16px and at 32px on a HiDPI display
- [ ] Confirm the popup's wind row and its sock render, including calm and unreported
- [ ] Record the result in docs/verification-log.md
