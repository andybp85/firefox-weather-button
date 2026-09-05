# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- The toolbar button's face. It now shows the temperature in figures on a disc filled with the
  dewpoint's comfort colour, ringed by the wind in its Beaufort colour with a bead on the ring
  where the wind comes from. Every measured wind draws the ring: calm is a thin ring with no
  bead, a variable wind a thick ring with no bead, and a wind nobody measured no ring. The gust
  rule is unchanged: the ring takes the gust's force when the gust is more than 10 kt over the
  sustained wind.
- The button's tooltip leads with the temperature and still names the dewpoint, its comfort
  band, the pressure trend, and the wind.

### Removed

- From the button's face: the dewpoint figures, the comfort band along the foot, the pressure
  trend notch, the compass dart, and the 15 kt threshold below which the wind was not drawn.
  The dewpoint and the trend stay in the tooltip and on the popup.

## [0.3.0] - 2026-09-04

### Added

- Wind on the popup, on a plaque of its own: station-model barbs on a compass ring, coloured by
  Beaufort force, with the gust drawn as extra barbs behind the sustained ones in its own force's
  colour. Calm draws the model's own calm symbol. A wind with no reported bearing draws its barbs
  with no shaft, and a wind nobody measured draws nothing but the ring. The line under the plot
  names the compass point, or reads `variable`, `no direction`, or `unreported` in a quieter
  colour.
- A compass dart on the toolbar button once the wind is worth announcing — gusting, or sustained
  at 15 kt or more. It replaces the dewpoint figures on the face and takes the Beaufort colour of
  the gust when the gust is more than 10 kt over the sustained wind, and of the sustained wind
  otherwise. A wind with a speed but no bearing gets a ring in the force colour instead. The
  tooltip names the wind either way.
- Cloud layers on the popup as a painted sky behind the cloud-base reading: each reported layer
  at its height, with its coverage as the width of the cloud and an overcast sky as a solid lid.
  The computed base is dashed over the layers, and is drawn on a clear sky too.

### Changed

- The popup is a 2×2 of stat plaques on the Kit Developer Edition tokens, each carrying an
  instrument: the dewpoint's comfort chip, the cloud plaque's sky, the wind plot, and a half-dial
  barometer whose needle is clamped to the 980–1050 hPa scale. The temperature, the cloud layers,
  and the visibility move to a header; the station and the two ages stay in the footer.
- The toolbar button is a chip in the toolbar's own indigo. It keeps the dewpoint's comfort colour
  as a band along the foot of the chip rather than flooding the whole face with it, and notches
  the pressure trend out of that band on every path.
- The pressure trend is drawn as a shape on both surfaces rather than written as an arrow
  character, so it lands at the same weight at every size.
- Wind is decoded into a value (`src/wind.js`) rather than a sentence, so both surfaces can read
  the figures. It now carries the reported bearing in degrees alongside the cardinal.
- Cloud layers are carried as data (`src/observation.js`) rather than as a sentence. A layer the
  station reports with no height is dropped.

## [0.2.0] - 2026-09-02

### Added

- Toolbar button icon drawn from the current reading: the dewpoint in figures, a background
  colour for its comfort band (Dry through Miserable), and a glyph for the 3-hour pressure
  trend. The tooltip states the same values as text.
- Background page that refreshes the button every 10 minutes, on browser start, and whenever
  the station changes. It reads through the same cache as the popup, so a refresh and a popup
  open inside that window cost one set of requests between them.
- `alarms` permission, for the refresh schedule.

### Changed

- The observation pipeline moved out of the popup entry point into `src/model.js`, so the
  popup and the toolbar button read the same model through the same cache.

## [0.1.0] - 2026-08-26

### Added

- Toolbar button that opens a popup with dewpoint, barometric pressure and its 3-hour trend,
  ambient METAR conditions, a computed cloud base, and a 12-hour thunderstorm-probability
  strip.
- Pressure trend labelled with its provenance (`reported` from the station, or `computed`
  from the raw pressure series), the age of the observation, and when the trend's own
  3-hour window closed. A reported trend can describe a window that closed hours earlier.
- Options page for setting a reporting station by its four-letter ICAO identifier, checked
  against the live METAR feed before it saves.
- Two-source data pipeline against the National Weather Service: pre-decoded METAR
  observations from `aviationweather.gov` and gridpoint thunderstorm probability from
  `api.weather.gov`. No API key and no account required.
- Local caching of the observation series and the thunder forecast for 10 minutes, and of
  the resolved forecast gridpoint for a month, to reduce repeat requests on popup open.
