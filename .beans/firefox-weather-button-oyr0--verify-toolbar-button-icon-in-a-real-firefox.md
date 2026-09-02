---
# firefox-weather-button-oyr0
title: Verify toolbar button icon in a real Firefox
status: completed
type: task
priority: high
created_at: 2026-09-02T10:52:11Z
updated_at: 2026-09-02T10:58:21Z
---

The OffscreenCanvas raster and `browser.action.setIcon` paths only run in Gecko, so they are untested.

- [x] Load the extension as a temporary add-on at `about:debugging`
- [x] Confirm the dewpoint icon renders at 16px and 32px
- [x] Confirm the 10-minute alarm refreshes the icon
- [x] Remove the "Known limitation" note from README.md once confirmed
