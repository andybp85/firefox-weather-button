---
# firefox-weather-button-gxdu
title: Design the popup panel and toolbar button on the Kit theme
status: in-progress
type: feature
priority: normal
created_at: 2026-09-02T22:03:33Z
updated_at: 2026-09-03T12:11:22Z
---

Design canvas exploring panel and button directions on Kit Developer Edition tokens. Goal: weather readable at a glance, not dated. References: weather.gov, Weather Underground, plus novel concepts.

- [x] Draft direction artboards (conventional, instrument, scenic) and a button strip
- [x] Publish the canvas and get a direction picked (Plaques panel + Band button, 2026-09-03)
- [x] Round 2: instruments on the plaques, wind barbs, cloud-proportion plaque, barb face on the button; sketches moved to page 2
- [x] Round 3: pressure scale labels moved below the arc; Beaufort colour on the panel wind plot, speed and gust; button barb in Beaufort colour with no gust layer (2026-09-03)
- [x] Round 4: dewpoint and cloud base swapped onto the top row with pressure below; dewpoint reading centred at 58 px; cloud base plaque shrunk to 112 px; button plot scaled so no direction reaches the face edge or comfort band (2026-09-03)
- [x] Round 5: both button questions settled (2026-09-03). Colour follows the gust when it is more than 10 kt above the sustained speed, else the sustained speed. Barbs and pennant dropped from the button: an arrow gives direction, the colour gives speed
- [ ] Build the chosen direction into the final mockup, dark and light
- [ ] Hand off to implementation (spec)

Canvas: https://claude.ai/code/artifact/57afcd6c-62e7-4886-90df-501611581e30 (working files in the session scratchpad; recoverable from the artifact with the design helper's --extract)

Round 2 notes: wind barbs follow the station-model grammar (half 5 / full 10 / pennant 50, barbs on the right looking out along the shaft, NH). Gusts are not in that grammar — drawn as the gust's extra barbs in muted ink under the sustained barbs. Button: notable wind (>=15 kt or any gust) swaps the dewpoint numerals for the barb; the comfort band and trend stay. Open question: 16px legibility of the barb on a real toolbar.

Round 3 notes: Beaufort colours sampled from Andy's chart, thresholds in knots (0 <1, 1 1–3, 2 4–6, 3 7–10, 4 11–16, 5 17–21, 6 22–27, 7 28–33, 8 34–40, 9 41–47, 10 48–55, 11 56–63, 12 ≥64). Force 12 lifted from #c93f14 to #f05a2a (2.8 → 4.15 on --tile); still under 4.5 for the 11 px gust text at force 12. Panel: plot and big speed take the sustained force, G nn and the extra gust barbs take the gust's force. Button: sustained speed rounded to 5 kt in one solid ink, no gust layer; open choice whether the button's colour should follow the gust instead. Working generator: gen.mjs in the session scratchpad (regenerable from the artifact with --extract).

Round 4 notes: button plot centre (32, 25) in the 64-unit face, shaft 16.5, barbs 7 at 60°, spacing 2.5, pennant base 3.2, stroke 4 — worst-case reach 22.9 against 25 to the top edge and to the comfort band. Cloud plaque: ground 6 above the foot, 30,000 ft at the text block's bottom (y 66), square-root scale, puff heights ×0.72; the five-skies sheet uses the same plaque. Open: gust vs sustained for the button colour; 16 px legibility on a real toolbar (barbs now under two device pixels).

Round 5 notes: button arrow flies downwind (map convention; the panel's barbs still point toward where the wind comes from — flip if that grates). Geometry in the 64-unit face: centre (32, 25), tail 18 back, tip 18 forward, shaft stroke 6 with round caps, head 12 long and 16 wide; worst-case reach 21 against 25 to the top edge and the comfort band. Colour rule: force(gust) when gust minus sustained > 10 kt, else force(sustained); the numerals-to-arrow trigger is unchanged (sustained >= 15 kt or any gust). Samples on the artboard: SSW 15 (F4), WNW 22 G 31 (gust +9, F6), W 18 G 32 (gust +14, F7), S 55 G 65 (gust +10, not more, F10). Generator: gen-button.mjs in the session scratchpad. Still to check on a real toolbar: the 16 px dart is about 8 px long and 6 px wide; direction and colour read in the local preview.
