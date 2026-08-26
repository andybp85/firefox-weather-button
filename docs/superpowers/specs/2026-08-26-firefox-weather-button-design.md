# Firefox Weather Button — Design

- **Date:** 2026-08-26
- **Status:** Approved, pending implementation plan
- **Version target:** 0.1.0

## Purpose

A Firefox toolbar button whose popup shows the weather detail the New Tab
widget omits — specifically **dewpoint** and **barometric pressure with a
trend** — sourced entirely from NWS.

Firefox's own weather feature cannot supply this. It is chrome-privileged
(ActivityStream newtab and urlbar Suggest), unreachable from a WebExtension,
and its upstream Merino/AccuWeather payload carries only temperature,
high/low, a summary string, and an icon id. No dewpoint, no pressure. Both
facts were verified against the live endpoints on 2026-08-26.

## Non-goals

- CAPE, CIN, shear, SRH, or any sounding-derived parameter. Not in the NWS
  API; `stability`, `davisStabilityIndex`, and `hainesIndex` exist in the
  gridpoint schema and are returned empty. `probabilityOfThunder` stands in.
- SPC categorical severe outlook. Deferred; needs a second fetch and
  point-in-polygon, and is non-zero in Jersey City a handful of days a year.
- Geolocation. Location is configured, not detected.
- A toolbar badge and background polling. Deferred to a later version as
  "Approach B" — see *Future work*.
- AMO signing. Installed unsigned on Firefox Developer Edition.

## Settled decisions

| Decision | Choice | Rationale |
|---|---|---|
| Location | Fixed, configured in options | No `geolocation` permission, no prompt, no fallback path. A station ID feeds the METAR request directly with no lookup. |
| Popup scope | Core three + free METAR fields + LCL | The METAR fields cost zero extra requests. LCL is one local multiplication and turns temperature and dewpoint into a real diagnostic. |
| Pressure trend | Reported `5appp` first, computed `slp` delta as fallback | Matches every other published tendency, because they all use this WMO code. The semidiurnal tide is baked into the standard; we label provenance rather than de-tide. |
| Fetch architecture | Popup-driven, no background script | YAGNI. The pure/impure seam makes the badge version additive rather than a rewrite. |

## Architecture

### Data flow

```
options: station ID (e.g. KEWR)
  |
  +-- AWC  metar?ids={id}&format=json&hours=4
  |     -> temp, dewp, slp, presTend, wdir, wspd, visib, clouds, lat, lon, name
  |     |
  |     +-- api.weather.gov /points/{lat},{lon}   -> gridpoint URL   [cached indefinitely]
  |           |
  |           +-- gridpoint                       -> probabilityOfThunder
  |
  +-- LCL = 125 * (temp - dewp)                   [local, no fetch]
```

Two requests on a warm cache. The `/points` resolution is cached
indefinitely: the station does not move, so the gridpoint never changes.

### Modules

Pure functions know nothing about who calls them. Network and `browser.*`
appear only in the lower group. This seam is the entire cost of making the
badge version additive.

| Module | Purpose | Purity |
|---|---|---|
| `src/tendency.js` | `presTend` selection, `slp`-series fallback, WMO table, provenance | pure |
| `src/lcl.js` | Espy: `125 * (T - Td)` metres | pure |
| `src/units.js` | C to F, metres to feet, pressure formatting | pure |
| `src/gridpoint.js` | `probabilityOfThunder` extraction, ISO-8601 interval expansion | pure |
| `src/observation.js` | Normalise one AWC record into the popup's view model | pure |
| `src/station.js` | Normalise a typed station id and check it against the feed | I/O |
| `src/nws.js` | Fetch chain: METAR -> points -> gridpoint | I/O |
| `src/storage.js` | TTL cache over `browser.storage.local` | I/O |
| `src/popup.{html,js}` | Render | shell |
| `src/options.{html,js}` | Station configuration and validation | shell |
| `src/ui.css` | Kit Developer Edition tokens | shell |

## Data sources

### aviationweather.gov (NWS Aviation Weather Center)

`https://aviationweather.gov/api/data/metar?ids={ID}&format=json&hours=4`

Returns pre-decoded fields, which is why no METAR parser is needed. Observed
2026-08-26:

```json
{"icaoId":"KEWR","temp":21.7,"dewp":14.4,"wdir":350,"wspd":7,"visib":"10+",
 "altim":1019.4,"slp":1019.1,"presTend":1.5,"clouds":[{"cover":"SCT","base":25000}],
 "lat":40.6828,"lon":-74.1692,"elev":2,"name":"Newark Intl, NJ, US",
 "rawOb":"METAR KEWR 261151Z ... SLP191 T02000144 10206 20183 53015 $"}
```

AWC has already decoded `SLP191` to `slp`, the `T` group to tenth-precision
`temp`/`dewp`, and `53015` to `presTend: 1.5`. Response header:
`cache-control: max-age=60`.

`presTend` carries the signed 3-hour magnitude but **not** the WMO character
code `a` — the shape of the change is lost. Net change is sufficient for an
arrow, so `rawOb` is not parsed in 0.1.0.

### api.weather.gov (NWS)

- `https://api.weather.gov/points/{lat},{lon}` -> `properties.forecastGridData`
- that URL -> `properties.probabilityOfThunder`

Headers: `access-control-allow-origin: *`,
`cache-control: public, max-age=236, s-maxage=300`.

**User-Agent is not an issue.** The API returns 403 with no UA and 200 with a
browser UA; browsers always send one. `User-Agent` is a forbidden header in
the Fetch spec and cannot be set from `fetch()`, but nothing needs to. No
`declarativeNetRequest`, no header rewriting, no extra permission.

## Tendency logic

Select in this order, from the single `hours=4` response:

1. The newest observation carrying `presTend`. Provenance: **reported**.
   Report its age; the group appears only in the 3-hourly synoptic METARs, so
   it can be up to 3 hours old.
2. Otherwise difference the `slp` series across ~3 hours. Provenance:
   **computed**.

Cross-check: when both are available and their signs disagree, prefer the
computed value.

**Sign convention verified 2026-08-26.** KORD reported `presTend: -1.2`, so
negative means falling. The series it came from gives `1012.8 - 1014.0 = -1.2`
exactly, so the computed fallback reproduces the reported value to the tenth.
The cross-check is retained as a regression guard, not as a hedge against an
unknown.

WMO code table 0200, retained for reference should `rawOb` parsing be added:

| `a` | Net vs 3h ago |
|---|---|
| 0-3 | Higher |
| 4 | Same |
| 5-8 | Lower |

### The tide, and why we do not correct for it

The atmosphere has a semidiurnal thermal tide of roughly 1-2 hPa at
mid-latitudes, with maxima near 10:00 and 22:00 local. A raw 3-hour delta
therefore shows a falling trend most afternoons regardless of the synoptic
situation.

De-tiding was considered and rejected: it would disagree with every published
tendency, including the station's own reported value, and would require
sourcing and validating a tide model. The chosen mitigation is disclosure —
the popup always states whether the number is reported or computed, and over
what interval. A user who knows about the tide can read around it, which is
what forecasters do.

## Popup layout

Ambient conditions lead; the enthusiast numbers follow.

```
+---------------------------------+
|  71F   NNW 7kt   61%   10+ mi   |  ambient (free METAR fields)
|  SCT 25000 ft                   |
+---------------------------------+
|  DEWPOINT   58F                 |  lead detail
|  1019.1 hPa   ^ +1.5 / 3h       |  pressure + arrow + magnitude
+---------------------------------+
|  Cloud base ~ 2994 ft           |  LCL, computed locally
|  Thunder  .,:=#=:,  next 12h    |  probabilityOfThunder, CSS bars
+---------------------------------+
|  Newark Intl - obs 6m ago       |  age, always visible
|  tendency: reported (3h)        |  provenance, always visible
+---------------------------------+
```

Target width ~360px; Firefox caps popups near 800x600.

Observation age and tendency provenance are permanent footer elements, not
hover affordances. They are the substitute for de-tiding and are worthless if
hidden.

Styling uses Kit Developer Edition tokens, applied at implementation time via
the `kit-developer-edition` skill.

### Units

AWC returns Celsius and hectopascals; METAR cloud bases are feet AGL. Fixed
display units, no toggle in 0.1.0:

| Quantity | Displayed | Source |
|---|---|---|
| Temperature, dewpoint | F | converted from AWC Celsius |
| Pressure, tendency | hPa | AWC `slp`, `presTend` unchanged |
| Reported cloud base | ft AGL | AWC `clouds[].base` unchanged |
| Computed LCL | ft AGL | `125 * (T - Td)` metres, converted |
| Wind | kt | AWC unchanged |
| Visibility | statute miles | AWC unchanged |

LCL is shown in feet so it shares a unit with the reported cloud bases
directly above it. A computed LCL near the reported base is a free
consistency check; a large divergence means the cloud deck is not
surface-based.

Worked example, from the KEWR fixture: `temp: 21.7`, `dewp: 14.4` gives a
7.3 C spread, so LCL = 125 * 7.3 = 912 m = 2994 ft, displayed as 71F / 58F.

## Error handling

Every row below was observed against live endpoints on 2026-08-26.

| Condition | Handling |
|---|---|
| `presTend` present on only the 3-hourly obs (1 of 3 seen) | Scan the `hours=4` window for the newest carrying it; else compute from the `slp` series in the same response |
| Reported and computed tendency disagree in sign | Prefer computed. Verified agreeing at KORD 2026-08-26; retained as a regression guard |
| `probabilityOfThunder` durations vary `PT1H` .. `P1DT3H` | Parse the ISO-8601 duration and expand; never assume hourly buckets |
| `probabilityOfThunder` absent or empty | Omit the thunder row; do not render a zeroed strip |
| `visib` is the string `"10+"` | Parse defensively; not a number |
| Invalid station ID | AWC returns `[]`. Validate on options save, not on popup open |
| Station reporting gap, or offline | Render cached values with an explicit age; never silently stale |
| `/points` or gridpoint failure | Render observations without the thunder row; a partial popup beats an error page |

api.weather.gov's `rawMessage` was empty on all 14 recent KEWR observations
and its `seaLevelPressure` was `null` with `qualityControl: "Z"`. Both are
avoided by sourcing observations from AWC instead.

Client cache TTL: 10 minutes. METARs update hourly plus specials, and both
upstreams send short `max-age` values, so this is generous and polite.

## Testing

Test-first. Unit tests over pure modules are the primary investment.

**Pure, no mocks, `node --test`:** `tendency.js`, `lcl.js`, `gridpoint.js`,
`observation.js`.

**Fixtures** in `test/fixtures/`, captured from live endpoints:

- KEWR AWC response, rising case (`presTend: 1.5`, `53015` in `rawOb`)
- KORD AWC response, falling case (`presTend: -1.2`, series `1012.8 - 1014.0`)
- TBW gridpoint — `probabilityOfThunder` 0-75% across `PT1H`, `PT2H`, `PT3H`,
  `PT6H`, `PT9H`, `PT12H` blocks. The best interval-expansion fixture found
- OKX gridpoint — includes a `P1DT3H` block and empty `stability` arrays
- AWC `[]` for an invalid station ID

**Boundary mocks only:** `nws.js` takes an injected `fetch`; assert URL order
and that `/points` is cached rather than re-resolved. `storage.js` takes an
injected `browser.storage`.

**Rendering:** jsdom. Render the popup against a fixture and assert values
land in the right nodes. A handful, not dozens.

**Named regressions:** `visib: "10+"`, absent `presTend`, a `P1DT3H` block,
tendency-sign disagreement.

No E2E. Manual checks are logged in `docs/verification-log.md`.

## Manifest

```json
{
    "manifest_version": 3,
    "name": "Weather Button",
    "version": "0.1.0",
    "browser_specific_settings": {
        "gecko": {
            "id": "weather-button@andybp85",
            "strict_min_version": "128.0"
        }
    },
    "permissions": ["storage"],
    "host_permissions": [
        "https://aviationweather.gov/*",
        "https://api.weather.gov/*"
    ],
    "action": { "default_popup": "src/popup.html" },
    "options_ui": { "page": "src/options.html", "open_in_tab": false }
}
```

No `geolocation`, no `alarms`, no `tabs`, no background script.

**Open item — `data_collection_permissions`.** `firefox-alwaysfill-email`
declares `["none"]`. This extension collects nothing itself, but each refresh
reveals an approximate location to NWS. `["none"]` is defensible;
`["locationInfo"]` is the more honest read. The spec carries `["none"]`
pending a decision. Installed unsigned, so AMO never evaluates it either way.

## Tooling and guards

Mirrors `firefox-alwaysfill-email`, the settled house configuration.

- **oxfmt 0.63.0**, **oxlint 1.78.0**, pinned exact. Same rc files: 4-space
  indent, 140 columns, no semicolons, single quotes, `arrowParens: avoid`,
  `trailingComma: all`
- **web-ext ^8.5.0** — `start`, `lint`, `build`
- **jsdom ^26.1.0** for rendering tests
- `node --test test/*.test.js`
- **pre-commit dispatcher and `pre-commit.d`** — lint guard and secrets guard,
  both enabled. Repo-local secrets guard so it survives without `~/.claude`
- **`.vnu-filter`** and the W3C HTML validity gate
- `.gitignore`, `.claudeignore`, `CHANGELOG.md`, `README.md`
- Semantic versioning from 0.1.0

### Sequencing

Tooling and guards are installed and **committed on `main` before any
implementation work or worktree**. A guard added afterwards gates nothing that
already landed. Feature work does not start until that commit is green.

## Future work

**Approach B — background badge.** An event page on a `browser.alarms` tick
that fetches, caches, and writes badge text (dewpoint, or the tendency arrow).
Adds the `alarms` permission and a background script; every pure module is
reused unchanged. Deferred until the popup has been lived with long enough to
know which number belongs on the button.

**SPC day-1 categorical outlook.** `day1otlk_cat.lyr.geojson` plus a ray-cast
point-in-polygon, no library.

**WMO character code.** Parse `5appp` from `rawOb` to recover the shape of the
pressure change, not merely its magnitude.
