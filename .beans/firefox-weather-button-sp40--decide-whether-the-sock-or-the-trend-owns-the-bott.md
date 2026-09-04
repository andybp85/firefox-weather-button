---
# firefox-weather-button-sp40
title: Decide whether the sock or the trend owns the bottom band
status: scrapped
type: task
priority: normal
created_at: 2026-09-02T17:52:43Z
updated_at: 2026-09-04T14:29:17Z
blocked_by:
    - firefox-weather-button-4q55
---

In the wind layout the pressure trend moves to a corner mark that is about 4x2 device pixels at 16px. You can see that a mark is there; you cannot reliably see which way it points. It is fine at 32px.

This was a deliberate call when the layout was built: the sock is the newer and more urgent reading, so it took the band. The alternative is the swap — the trend keeps the band, and the sock becomes the corner mark. Which is right depends on what an unreadable corner mark actually costs, and that needs looking at on a real toolbar rather than reasoning about.

A third option is that neither belongs in a corner and the wind layout should drop the trend entirely while the wind is notable, on the grounds that a mark too small to read is worse than no mark.

## Todo

- [ ] Look at both layouts at 1x on a real toolbar
- [ ] Decide: keep, swap, or drop the trend while windy
- [ ] If it changes, update the byte-identical-icon test and the README's description of the two layouts

## Reasons for Scrapping

The question only exists inside the 0.3.0 layout, where a band and a corner mark
compete for the bottom of the chip. That layout is being redrawn for 0.4.0, so
deciding which of the two owns the band decides nothing.

What is worth carrying forward is the finding, not the decision: a mark about
4x2 device pixels at 16 px reads as present but not as directional. The 0.4.0
design should treat that as a floor on any glyph it puts on the button.
