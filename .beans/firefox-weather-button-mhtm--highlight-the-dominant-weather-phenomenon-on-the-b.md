---
# firefox-weather-button-mhtm
title: Highlight the dominant weather phenomenon on the button
status: draft
type: feature
priority: normal
created_at: 2026-09-02T17:52:25Z
updated_at: 2026-09-02T17:52:25Z
---

The button says what the air feels like (dewpoint, comfort colour), which way the pressure is going, and how hard the wind is blowing. It says nothing about what is actually falling out of the sky.

Draft because "dominant" is undefined, and defining it is most of the work.

## What "dominant" could mean

- Present weather from the METAR `wxString` — rain, snow, thunderstorm, freezing rain, drizzle, with intensity prefixes. Observed, not forecast, and already in the feed the popup reads.
- Obstruction to vision — fog, haze, mist, smoke. Reported in the same field and arguably a different axis from precipitation.
- `probabilityOfThunder` from the gridpoint feed. Forecast rather than observed, and already drawn in the popup's 12-hour strip.
- Cloud cover from the layers the popup already shows.

These do not rank against each other on any natural scale, so the rule has to be asserted rather than derived. Freezing rain outranks everything is easy; rain versus fog is not.

## The real tension

The 16-pixel square already carries a two-digit reading, a trend mark, and sometimes a windsock. There is no room left for a fourth thing without something giving way. Options are to displace the comfort colour (make the background the phenomenon), to displace the reading, or to accept that the phenomenon only appears when it outranks what is already there — which is the same threshold argument the windsock already settled once.

Adjacent to the SPC categorical outlook bean, which is severe-weather forecast rather than observed present weather.

## Todo

- [ ] Decide what "dominant" means and what the ranking is
- [ ] Decide what it displaces on the icon, and at what threshold it earns the room
- [ ] Decide whether it is observed, forecast, or both
- [ ] Check whether it survives 16 device pixels before designing around it
