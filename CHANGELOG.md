# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-08-26

### Added

- Toolbar button that opens a popup with dewpoint, barometric pressure and its 3-hour trend,
  ambient METAR conditions, a computed cloud base, and a 12-hour thunderstorm-probability
  strip.
- Pressure trend labelled with its provenance (`reported` from the station, or `computed`
  from the raw pressure series) and the age of the observation it describes.
- Options page for setting a reporting station by its four-letter ICAO identifier, checked
  against the live METAR feed before it saves.
- Two-source data pipeline against the National Weather Service: pre-decoded METAR
  observations from `aviationweather.gov` and gridpoint thunderstorm probability from
  `api.weather.gov`. No API key and no account required.
- Local caching of observations and the resolved forecast gridpoint, to reduce repeat
  requests on popup open.
