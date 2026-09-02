---
# firefox-weather-button-spkc
title: Wind speed and gusts in the panel, windsock on the button
status: completed
type: feature
priority: normal
created_at: 2026-09-02T11:09:33Z
updated_at: 2026-09-02T11:37:58Z
---

Read wgst (gusts) alongside wspd/wdir from the AWC METAR feed. Show sustained wind and gusts in the popup panel, and add a windsock-style wind indicator to the drawn toolbar button icon. Design pending.

## Design (approved 2026-09-02)

Wind is parsed at the boundary into a value, not a display string. New `src/wind.js`:
`toWind({ wdir, wspd, wgst })` returns `{ state: 'unreported' }`, `{ state: 'calm' }`, or
`{ state: 'measured', knots, gustKnots?, direction? }` where `direction` is a cardinal point
or the literal `'variable'`. `isNotable(wind)` is `gustKnots !== undefined || knots >= 15`.

New `src/windsock.js` holds the sock geometry as polygons in a pivot-origin unit space, so the
button strokes them onto canvas and the popup emits the same points as inline SVG (jsdom has no
2D context; SVG is testable, a second canvas would not be).

Panel: wind leaves `.ambient-primary` and becomes a `.detail` row, `Wind  <sock>  NW 18 kt G 27`.
Button: below the threshold the icon is byte-identical to today's; at or above it the sock takes
the bottom band and the trend glyph shrinks into the top-right corner.

The button shows no wind direction — sixteen bearings will not survive three device pixels.
Direction lives in the popup row and the tooltip.

## Todo

- [x] `src/wind.js` + `test/wind.test.js`
- [x] `src/windsock.js` + `test/windsock.test.js`
- [x] `observation.js` returns the wind value; update `test/observation.test.js`
- [x] Popup wind row: `popup.js`, `popup.html`, `ui.css`, `test/popup.test.js`
- [x] `button-icon.js` notable layout + `test/button-icon.test.js`
- [x] `button.js` tooltip and `background.js` plumbing + `test/button.test.js`
- [x] README and CHANGELOG
- [x] Gates: test, lint:js, format:check, web-ext lint, stylelint, markdownlint

## Summary of Changes

Wind is decoded at the boundary by `src/wind.js` (`toWind`, `isNotable`, `describeWind`), and `src/windsock.js` returns the sock as polygons in a pivot-origin unit space. The popup draws them as inline SVG in a new `.detail` row beside the dewpoint and pressure; the toolbar button fills the same points on canvas, taking the bottom band and moving the pressure trend to a top-right corner mark once the wind is gusting or sustained at 15 kt or more. Below that threshold the icon is identical to before, call for call, and a test asserts it.

135 tests pass. oxlint, oxfmt, stylelint, markdownlint, and `web-ext lint` are clean.

The geometry was tuned against a throwaway preview page that rasterised every case at 16, 32, and 64 px. It caught two defects the tests had missed: a light-but-gusting wind hung its gust tick a pixel below the icon, and the steady corner dash came out three quarters of a device pixel tall. The bounds test now carries the light-gusting case that reaches furthest down the square.
