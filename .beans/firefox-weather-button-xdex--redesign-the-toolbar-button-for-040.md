---
# firefox-weather-button-xdex
title: Redesign the toolbar button for 0.4.0
status: draft
type: feature
priority: high
created_at: 2026-09-04T14:30:26Z
updated_at: 2026-09-04T14:31:00Z
---

The 0.3.0 button — a comfort band along the foot of an indigo chip, a pressure-trend notch cut out of that band, dewpoint figures on the face, and a compass dart replacing those figures when the wind is worth announcing — is not working. That judgement is the user's, made after living with the shipped surface; the specific complaints are still to be captured.

The panel is not implicated. Neither are the data modules the button reads: `src/beaufort.js`, `src/wind.js`, `src/wind-dart.js`, and `src/observation.js` are decoding, not drawing, and a new design can read the same values.

## What the 0.3.0 work established

Findings worth carrying into any redesign, from the two beans scrapped with it:

- A mark about 4x2 device pixels at 16 px reads as present but not as directional. That is a floor on any glyph the button carries.
- `docs/icon-preview.html` rasterises every case in Gecko, but it draws to a page canvas. It does not exercise `setIcon`, Firefox's own scaling into the toolbar, or the theme painted behind the button. A design is not verified until it has been seen through `setIcon` at 16 px, on a real toolbar, in both themes.

Bean firefox-weather-button-mhtm — highlight the dominant weather phenomenon on
the button — is an open draft against this same surface. Settle it inside the
redesign rather than bolting it onto a face that is being replaced.

## Todo

- [ ] Capture what is wrong with the 0.3.0 button, in the user's words
- [ ] Brainstorm the replacement (superpowers:brainstorming)
- [ ] Write the spec, then the implementation plan
- [ ] Verify at 16 px on a real toolbar through `setIcon`, both themes, before it is called done
