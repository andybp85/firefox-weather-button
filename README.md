# Firefox Weather Button

A Firefox toolbar button that opens a popup with local weather detail.

## What it shows

The popup shows:

- Dewpoint
- Barometric pressure, with a 3-hour trend arrow
- Ambient conditions from the nearest METAR station (temperature, wind, visibility, cloud
  layers)
- A computed cloud base, from the dewpoint depression
- A 12-hour strip of thunderstorm probability

## Data sources

The extension reads two National Weather Service (NWS) APIs. It needs no API key and no
account.

- `aviationweather.gov/api/data/metar` returns pre-decoded METAR observations. The popup
  reads dewpoint, pressure, and ambient conditions from this feed.
- `api.weather.gov` returns gridpoint forecast data, including `probabilityOfThunder`. The
  popup reads the 12-hour thunder strip from this feed.

## The pressure trend and the daily tide

Air pressure at a fixed point on Earth rises and falls twice a day, even when no weather
system is moving through. This is the semidiurnal atmospheric tide. It moves pressure by
about 1 to 2 hPa, with peaks near 10:00 and 22:00 local time.

The popup does not correct the trend arrow for this tide. This is a deliberate choice, not
an oversight. A correction needs a local model of the tide's size and phase, and that model
is itself a source of error.

Instead, the popup states the reading's age. It also states the trend's provenance: whether
the 3-hour value came from the station's own report (`reported`) or from the raw pressure
series (`computed`). Read the arrow with the tide in mind. An afternoon rise can be the tide,
not a real change in the weather.

The age and provenance labels sit in the popup footer on every path, including a stale or
failed fetch. You always have the context to judge the arrow yourself.

## Install

The extension is not signed and is not on addons.mozilla.org. Load it as a temporary add-on
in Firefox Developer Edition.

1. Download or clone this repository.
2. Open Firefox Developer Edition.
3. Go to `about:debugging#/runtime/this-firefox`.
4. Click **Load Temporary Add-on**.
5. Select the `manifest.json` file in the repository root.

A temporary add-on is removed when Firefox restarts. Repeat these steps after each restart.

## Configure a station

The popup needs a reporting station near you.

1. Open the extension's options page (right-click the toolbar button and select **Manage
   Extension**, then **Preferences**, or open it from `about:addons`).
2. Enter a four-letter ICAO station identifier, for example `KEWR` for Newark.
3. Click **Save**.

The options page checks the identifier against the live METAR feed before it saves. An
unknown identifier shows an error instead.

## Develop

```bash
npm install
npm test
npm run lint:js
npm run format
npx web-ext lint
```

`npm test` runs the unit test suite. `npm run lint:js` runs `oxlint` against `src` and `test`.
`npm run format` runs `oxfmt` against the same paths. `npx web-ext lint` (also available as
`npm run lint`) checks the manifest and packaged files against Firefox's add-on rules.

## Known limitation: unverified in a real Firefox

The build environment for this project has no Firefox binary and no display. The popup's
appearance and behavior in an actual Firefox window are unverified.

Automated checks stand in for that gap. `web-ext lint` passes with no errors or warnings. The
test suite runs the popup's rendering code against a simulated DOM (jsdom), with real network
requests to the live NWS APIs. These checks do not verify Gecko's own rendering, popup sizing,
or the `browser.*` extension APIs.

A manual check against the real APIs, run outside a browser, is recorded in
[`docs/verification-log.md`](docs/verification-log.md). Treat that log as a substitute for
browser testing, not a replacement for it. Load the extension in a real Firefox Developer
Edition profile before you rely on it day to day.
