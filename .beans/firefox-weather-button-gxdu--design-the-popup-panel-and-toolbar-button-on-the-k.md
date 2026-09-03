---
# firefox-weather-button-gxdu
title: Design the popup panel and toolbar button on the Kit theme
status: in-progress
type: feature
priority: normal
created_at: 2026-09-02T22:03:33Z
updated_at: 2026-09-03T11:15:23Z
---

Design canvas exploring panel and button directions on Kit Developer Edition tokens. Goal: weather readable at a glance, not dated. References: weather.gov, Weather Underground, plus novel concepts.

- [x] Draft direction artboards (conventional, instrument, scenic) and a button strip
- [x] Publish the canvas and get a direction picked (Plaques panel + Band button, 2026-09-03)
- [x] Round 2: instruments on the plaques, wind barbs, cloud-proportion plaque, barb face on the button; sketches moved to page 2
- [ ] Build the chosen direction into the final mockup, dark and light
- [ ] Hand off to implementation (spec)

Canvas: https://claude.ai/code/artifact/57afcd6c-62e7-4886-90df-501611581e30 (working files in the session scratchpad; recoverable from the artifact with the design helper's --extract)

Round 2 notes: wind barbs follow the station-model grammar (half 5 / full 10 / pennant 50, barbs on the right looking out along the shaft, NH). Gusts are not in that grammar — drawn as the gust's extra barbs in muted ink under the sustained barbs. Button: notable wind (>=15 kt or any gust) swaps the dewpoint numerals for the barb; the comfort band and trend stay. Open question: 16px legibility of the barb on a real toolbar.
