---
# firefox-weather-button-6ybb
title: Commit the toolbar icon preview page under docs/
status: completed
type: task
priority: normal
created_at: 2026-09-02T15:12:31Z
updated_at: 2026-09-02T15:17:27Z
---

The throwaway page that rasterised every icon case at 16/32/64px caught two geometry bugs and was then deleted. Rebuild it as a tracked docs page so the next geometry change has the same net.

## Summary of Changes

- `docs/icon-preview.html` and `docs/icon-preview.js`: every icon case rasterised at 16, 32, and 64 true device pixels, plus whole-number blow-ups at x6 and x3 with smoothing off. Cases are written as METAR fields and decoded through `toWind`, so the page exercises the shipping decoder and labels each row with the same wording the popup uses.
- `npm run preview` serves the repository root on 127.0.0.1:8765, because ES modules need an HTTP origin.
- `npm run format` and `npm run format:check` now cover `docs` alongside `src` and `test`.
- README documents the page and how to read it.
- Verified in Chrome: both layouts render, no console errors. Gecko still owes the check in bean firefox-weather-button-8pgj.
