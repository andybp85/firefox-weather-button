# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
