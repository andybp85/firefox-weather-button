---
# firefox-weather-button-oyr0
title: Verify toolbar button icon in a real Firefox
status: todo
type: task
priority: high
created_at: 2026-09-02T10:52:11Z
updated_at: 2026-09-02T10:52:11Z
---

The OffscreenCanvas raster and `browser.action.setIcon` paths only run in Gecko, so they are untested.

- [ ] Load the extension as a temporary add-on at `about:debugging`
- [ ] Confirm the dewpoint icon renders at 16px and 32px
- [ ] Confirm the 10-minute alarm refreshes the icon
- [ ] Remove the "Known limitation" note from README.md once confirmed
