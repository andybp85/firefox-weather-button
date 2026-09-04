---
# firefox-weather-button-4q55
title: Check every icon case in a controlled environment
status: scrapped
type: task
priority: high
created_at: 2026-09-02T17:52:25Z
updated_at: 2026-09-04T14:29:14Z
---

Live weather shows one icon case at a time, so a real-Firefox check of the button covers whatever the sky happened to be doing that hour. The remaining cases need fabricated observations driving the real toolbar button.

`docs/icon-preview.html` already rasterises every case in Gecko, but it draws to a page canvas. It does not exercise `setIcon`, Firefox's own scaling of the imageData into the toolbar, or the theme the toolbar paints behind it. Those are the parts still unverified.

## Todo

- [ ] Decide how to inject a fabricated observation: a debug key in `browser.storage.local`, a stubbed `nws.js` under `web-ext run`, or an options-page field that never ships
- [ ] Walk the case list in `docs/icon-preview.js` through the real button, both layouts
- [ ] Check the wind layout's corner trend mark on a 1x display, where it is about 4x2 device pixels
- [ ] Check both toolbar themes, light and dark
- [ ] Record what was seen in `docs/verification-log.md`

## Reasons for Scrapping

The button design these cases verify is being replaced in 0.4.0. Walking the 0.3.0
case list through a real toolbar would certify a surface that is about to be
redrawn, so the cost buys nothing.

The need itself survives the redesign: whatever the 0.4.0 button becomes still has
to be seen at 16 px on a real toolbar, in both themes, driven through setIcon
rather than a page canvas. That check belongs to the 0.4.0 design work and will be
raised there rather than carried on this bean.
