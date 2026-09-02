# Firefox Weather Button

A Firefox toolbar button that shows the current dewpoint, coloured by how it feels, and
opens a popup with local weather detail.

## The toolbar button

The button icon is drawn, not fixed. It shows:

- The dewpoint in whole degrees Fahrenheit.
- A background colour for the comfort band that dewpoint falls in (see the table below).
- A glyph for the 3-hour barometric pressure trend: an up arrow for a rise, a down arrow for
  a fall, and a dash for steady.

Point at the button to read the same values as text, with the station name and the comfort
band written out.

The button refreshes every 10 minutes, and again as soon as you save a different station. It
shares its cache with the popup, so the two together make one set of requests, not two.

When no station is set, and when no reading is available at all, the button shows the plain
extension icon. The tooltip then states the reason. The button never shows a colour for a
dewpoint that was not measured.

### Comfort bands

| Dewpoint (F) | Comfort level |
| ------------ | ------------- |
| below 50     | Dry           |
| 50 to 55     | Pleasant      |
| 56 to 60     | Comfortable   |
| 61 to 65     | Sticky        |
| 66 to 70     | Uncomfortable |
| 71 to 75     | Oppressive    |
| 76 and above | Miserable     |

## What the popup shows

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
series (`computed`). It states when the trend's own window closed, which can be hours before
the newest reading. Read the arrow with the tide in mind. An afternoon rise can be the tide,
not a real change in the weather.

The age and provenance labels sit in the popup footer on every path, including a stale or
failed fetch. You always have the context to judge the arrow yourself.

## Install

The extension is not signed and is not on addons.mozilla.org. Load it as a temporary add-on
in Firefox Developer Edition.

1. Download or clone this repository.
1. Open Firefox Developer Edition.
1. Go to `about:debugging#/runtime/this-firefox`.
1. Click **Load Temporary Add-on**.
1. Select the `manifest.json` file in the repository root.

A temporary add-on is removed when Firefox restarts. Repeat these steps after each restart.

## Configure a station

The popup needs a reporting station near you.

1. Open the extension's options page (right-click the toolbar button and select **Manage
   Extension**, then **Preferences**, or open it from `about:addons`).
1. Enter a four-letter ICAO station identifier, for example `KEWR` for Newark.
1. Click **Save**.

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

## Verification

The extension has been loaded in a real Firefox Developer Edition profile: the popup renders, and
the toolbar icon rasters, paints, and refreshes on its alarm. Manual checks are recorded in
[`docs/verification-log.md`](docs/verification-log.md).

The automated checks stop short of Gecko. `npm run lint` (`web-ext lint`) reports no errors and no
warnings. The test suite runs the popup's rendering code against a simulated DOM (jsdom), and makes
no network requests: `fetch` and `browser.storage.local` are replaced with stubs, and the API
responses come from recorded fixtures. Nothing in that suite exercises Firefox's own rendering,
popup sizing, or the `browser.*` extension APIs, so a change to those paths needs a run in a real
profile before you trust it.
