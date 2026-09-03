# Firefox Weather Button

A Firefox toolbar button that shows the current dewpoint over a band for how it feels, and
opens a popup with local weather detail.

## The toolbar button

The button icon is drawn, not fixed. It is a rounded chip in the toolbar's own indigo. The
chip shows:

- A band along the foot of the chip, in the colour of the comfort band that the dewpoint falls
  in (see the table below).
- The 3-hour barometric pressure trend, cut out of that band in the chip's own indigo: an up
  arrow for a rise, a down arrow for a fall, and a dash for steady.
- The dewpoint in whole degrees Fahrenheit, on the face above the band.

A wind is worth announcing when it gusts, or when it is sustained at 15 kt or more. Such a wind
takes the face: the figures give way to a wind mark. The band and the trend stay where they are,
on every path.

The mark is a compass dart. It flies downwind, which is the map convention: a wind from the
north points down the face. Its colour is the Beaufort force of the wind. The dart takes the
force of the gust when the gust is more than 10 kt above the sustained wind. In every other case
it takes the force of the sustained wind.

Some stations report a speed with no bearing. The button then draws a ring in the force colour
in place of the dart. The ring reports the speed and claims no heading.

Point at the button to read the same values as text, with the station name, the comfort band,
and the wind written out. The tooltip names the wind at any speed, including one too light to
have earned room on the icon.

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

The popup is a header, four stat plaques in a 2×2 grid, a thunder strip, and a footer.

The header carries the ambient conditions from the nearest METAR station: the temperature, the
reported cloud layers, and the visibility.

Each plaque carries one reading and an instrument that draws it:

- **Dewpoint**, with a chip that names its comfort band in that band's colour.
- **Cloud base**, computed from the dewpoint depression, over a painted sky. Each reported
  layer is drawn at its height, and its coverage sets the width of the cloud. An overcast sky
  is a solid lid. The computed base is a dashed line over the layers, drawn on a clear sky too.
- **Wind**, on a station-model plot inside a compass ring. The barbs point toward the source of
  the wind, in the colour of its Beaufort force. A gust is a second set of barbs behind the
  first, in the colour of its own force. Calm draws the station model's own calm symbol. A wind
  with no reported bearing draws its barbs with no shaft. Below the plot, a line names the
  compass point, or reads `variable`, `no direction`, or `unreported`.
- **Pressure**, on a half-dial barometer, with the 3-hour trend and its glyph below the dial.

The thunder strip sits below the plaques. It shows the thunderstorm probability for the next 12
hours, one bar an hour. The footer carries the station name, the age of the observation, and the
provenance of the pressure trend.

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
npx stylelint src/ui.css
npx markdownlint-cli2 '**/*.md'
npx web-ext lint
```

`npm test` runs the unit test suite. `npm run lint:js` runs `oxlint` against `src` and `test`.
`npm run format` runs `oxfmt` against `docs`, `src`, and `test`. `stylelint` checks `src/ui.css`,
which holds the popup's own rules and the options page's. `markdownlint-cli2` checks the prose.
`npx web-ext lint` (also available as `npm run lint`) checks the manifest and packaged files
against Firefox's add-on rules.

### Preview the toolbar icon

[`docs/icon-preview.html`](docs/icon-preview.html) draws every case the button icon has, at the
sizes Firefox asks for. The cases cover both sides of the 15 kt wind threshold, both sides of the
10 kt gust margin, the ring for a wind with no bearing, all three trend glyphs, and the readings
that run to three characters. A sweep of all sixteen compass points follows them, so the dart's
sense can be read off the page rather than derived. The page imports `src/button-icon.js` and
decodes its winds through `src/wind.js`, so it rasterises the shipping code rather than a copy
of it.

ES modules need an HTTP origin, so serve the repository root instead of opening the file:

```bash
npm run preview
```

Then open <http://127.0.0.1:8765/docs/icon-preview.html>.

The first three columns are true device pixels, and the last two magnify the same rasters by whole
numbers with smoothing off. Read the geometry off the blow-ups and judge legibility off the true
sizes — on a 1x display, where the 16-pixel icon is hardest to read. The page is a development
tool: `docs/` is excluded from the packaged extension.

## Verification

The extension has been loaded in a real Firefox Developer Edition profile: the popup renders, and
the toolbar icon rasters, paints, and refreshes on its alarm. Manual checks are recorded in
[`docs/verification-log.md`](docs/verification-log.md).

That check predates the plaque panel and the compass-dart button. Neither surface has been seen
in a real profile yet. The dart at 16 device pixels is the case to look at first: it is about 8
pixels long there, and the local preview page is not a toolbar.

The automated checks stop short of Gecko. `npm run lint` (`web-ext lint`) reports no errors and no
warnings. The test suite runs the popup's rendering code against a simulated DOM (jsdom), and makes
no network requests: `fetch` and `browser.storage.local` are replaced with stubs, and the API
responses come from recorded fixtures. Nothing in that suite exercises Firefox's own rendering,
popup sizing, or the `browser.*` extension APIs, so a change to those paths needs a run in a real
profile before you trust it.
