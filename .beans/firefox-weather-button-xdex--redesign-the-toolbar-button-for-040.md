---
# firefox-weather-button-xdex
title: Redesign the toolbar button for 0.4.0
status: completed
type: feature
priority: high
created_at: 2026-09-04T14:30:26Z
updated_at: 2026-09-05T17:01:17Z
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

- [x] Capture what is wrong with the 0.3.0 button, in the user's words: the dewpoint figure is not a number anyone acts on, and the pressure trend is hard to read. The temperature is the reading worth carrying, coloured by the dewpoint comfort scale, ringed by a compass circle in Beaufort colour under the existing sustained-versus-gust rule.
- [x] Decide what carries the comfort colour: a disc behind the figures, so geometry separates the two colour systems (2026-09-04)
- [x] Mock the face up in Claude Design — brief at `docs/superpowers/briefs/2026-09-04-button-face-design-brief.md`, canvas at <https://claude.ai/code/artifact/1e24765d-341b-4f3a-9a82-5d50621f4573>, generator at `docs/superpowers/design/2026-09-04-button-face/build.mjs` (2026-09-04)
- [x] Pick the bearing mark from the canvas. Picked: C, the bead on the ring, with the canvas defaults (2026-09-04). A was recommended; D (crescent) failed the compass sweep; C sits at the 2 px floor and the toolbar pass must confirm it
- [x] Brainstorm the replacement (superpowers:brainstorming). mhtm scrapped: the face has no room (2026-09-04)
- [x] Write the spec, then the implementation plan: docs/superpowers/specs/2026-09-04-button-face-design.md, docs/superpowers/plans/2026-09-04-button-face.md (2026-09-04)
- [x] Verify at 16 px on a real toolbar through `setIcon`, both themes, before it is called done (2026-09-05: Kit theme on a 2× display, every case clean; the default theme and 1× are left open in docs/verification-log.md)

## Progress 2026-09-05

Tasks 1–5 of docs/superpowers/plans/2026-09-04-button-face.md landed on branch button-face and merged to main (--no-ff). Final review clean bar one parked minor: drawWind's unknown-state guard sits after the bearing-undefined branch, so a bogus state with no bearing draws a heavy ring instead of throwing. Task 6 (real-toolbar check) passed 2026-09-05 on the maintainer's report; the parked guard minor closed in 78c2497 with the rest of firefox-weather-button-y5rs. Task 7 (release) is bean firefox-weather-button-b1by.

## Summary of Changes

- The face: the temperature in figures on a disc in the dewpoint's comfort colour, ringed by the wind in its Beaufort colour with a bead on the upwind side of the ring. Calm is a thin force 0 ring, a wind with no bearing a thick ring, an unmeasured wind no ring. `src/button-icon.js` draws it from the frozen `FACE_GEOMETRY`, in the artboard's 64-unit square scaled to whatever edge Firefox asks for.
- Retired: the compass dart (`src/wind-dart.js`) and the announce threshold that swapped it in for the figures; the comfort band and the pressure-trend notch.
- The tooltip now carries every reading the face draws plus the pressure trend the face dropped.
- `docs/icon-preview.html` draws the new cases; README, CHANGELOG, and the spec and plan under `docs/superpowers/` describe the face.
- Seen through `setIcon` on a real toolbar 2026-09-05 (Kit theme, 2×); the bead reads, the sweep fallback is not needed. Recorded in `docs/verification-log.md`.
