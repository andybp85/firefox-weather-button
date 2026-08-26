# Verification log

Manual, human-triggered checks that automated tests can't cover on their own — mostly a live
extension exercised in a real Firefox profile, cross-checked against a second data source.

## Task 9 — popup, 2026-08-26

**Environment note.** This session has no Firefox binary and no display, so `npm start` (which
launches `web-ext run` against a real Firefox profile) could not be exercised as the task brief's
Step 8 describes. As the closest available substitute, `src/popup.html` and `src/popup-main.js`
were driven end to end with jsdom standing in for the DOM and Node's native `fetch` making real
requests to the live `aviationweather.gov` and `api.weather.gov` APIs — only `browser.storage.local`
was mocked (an in-memory `Map`), which is the same seam `nws.js`/`storage.js`/`options.js` already
use for their own tests. This exercises the real network calls and the real render, but not
Firefox's own popup chrome, sizing, or `browser.*` implementation. A follow-up manual check in an
actual Firefox Developer Edition profile is recommended before shipping and is deferred to
whichever task next has a working display (see Task 10's unresolved verification-log item).

### Happy path — live KEWR data

Seeded `browser.storage.local` with `{ station: { name: 'Newark Intl, NJ, US', stationId: 'KEWR' } }`
(the shape Task 8's `validateStation` writes) and ran `popup-main.js`'s `main()` against the live
APIs. Rendered output:

```json
{
  "ambientClouds": "FEW 6000 ft, FEW 19000 ft, BKN 25000 ft",
  "ambientPrimary": "76F   undefined 4 kt   10+ mi",
  "age": "Newark Intl, NJ, US - obs 46m ago",
  "cloudBase": "Cloud base ~ 4757 ft",
  "dewpoint": "55F",
  "pressure": "1019.1 hPa   ↑ +1.5 / 3h",
  "provenance": "tendency: reported (3h)",
  "thunderHidden": false
}
```

Cross-checked against `https://aviationweather.gov/api/data/metar?ids=KEWR&format=json&hours=5`
fetched independently at the same time:

| Field                      | Live METAR | Popup                                               |
| -------------------------- | ---------- | --------------------------------------------------- |
| `temp`                     | 24.4°C     | 76F (24.4 × 9/5 + 32 = 75.92, rounds to 76) — match |
| `dewp`                     | 12.8°C     | 55F (12.8 × 9/5 + 32 = 55.04, rounds to 55) — match |
| `slp` (newest)             | 1019.1 hPa | "1019.1 hPa" — match                                |
| `presTend` (12:00Z record) | 1.5        | "↑ +1.5 / 3h", provenance "reported" — match        |

`#age` and `#provenance` rendered as required on this path.

**Defect found later in this same reading, fixed in the final round.** The `presTend` behind
`"↑ +1.5 / 3h"` sat on the 12:00Z record, four hours before the 16:00Z run. `#provenance` read
`tendency: reported (3h)` and said nothing about when that window closed, so a stale trend
rendered as a current one. `resolveTendency` had computed the window's own `observedAt` since
Task 4 and the popup discarded it. `#provenance` now reads
`tendency: reported (3h), ended 4h ago`. This is load-bearing: the design declines to correct
the trend for the semidiurnal tide and offers disclosure of age and provenance instead.

**Bug found, out of scope for Task 9.** `ambientPrimary` reads `"76F   undefined 4 kt   10+ mi"`.
The live newest KEWR record carries `wdir: "VRB"` (a string, for genuinely variable wind) rather
than omitting `wdir`. `src/observation.js`'s `describeWind`/`cardinal` (built in Task 6) only
special-cases `wdir === undefined`; `test/observation.test.js`'s "no reported direction" test
seeds `wspd` alone with no `wdir` key at all, which isn't what the live API actually sends for this
case. `cardinal('VRB')` computes `Math.round('VRB' / 22.5)` → `NaN`, and
`COMPASS_POINTS[NaN % 16]` is `undefined`, so the string `"undefined"` lands in the rendered wind.
This is a pre-existing defect in a Task 6 file, not something Task 9's popup or popup-main
introduced, and `src/observation.js` is outside Task 9's file list — left unfixed here and flagged
in the implementer's report instead of patched out of scope.

**Resolved in commit `371a3bd`.** The controller ruled this defect into Task 9's fix round rather
than parking it, because it is live-reachable (verified 2026-08-26: 4 of 144 records across 20
stations carried a string `wdir`) and sits on the popup's headline row. `describeWind` now guards
on `typeof wdir !== 'number'` rather than string-matching `'VRB'`, and renders `variable` — the
meaning of the METAR code, not merely a safe fallback. Regression tests cover both `wspd: 3` and
`wspd: 0`. The finding above is left in place as the record of how it was caught; the reading it
describes no longer reproduces.

### Degraded path — fetch failing, a stale cache present

Seeded `browser.storage.local` with a station and an `observations:KEWR` cache entry 4 hours old
(two synthetic records, older newest at 09:00Z, no `presTend`), then made every `fetch` call throw.
Rendered output:

```json
{
  "age": "Newark Intl, NJ, US - obs 7h ago",
  "dewpoint": "58F",
  "pressure": "1015 hPa   ↑ +1.5 / 3h",
  "provenance": "tendency: computed (3h)",
  "thunderHidden": true
}
```

`#age` states the real observation age (7h, computed from the cached record's own `reportTime`,
not from when it was cached) and `#provenance` correctly falls back to `computed` since the
synthetic fixture carried no `presTend`. Thunder is hidden rather than showing stale or zeroed
data, since no gridpoint forecast is cached alongside the observation series. This matches the
Task 9 brief's degraded-path requirement: a stale popup that states its own age, not an error page.

### Total-failure path — no station configured, no cache, fetch failing

Empty `browser.storage.local`, every `fetch` call throwing. Rendered output:

```json
{
  "age": "no observation available — no station configured yet",
  "ambientPrimary": "—",
  "dewpoint": "—",
  "pressure": "—",
  "provenance": "tendency: unavailable",
  "thunderHidden": true
}
```

`#age` and `#provenance` still render — the footer requirement holds even on this path, which the
task brief's given Step 7 sketch didn't explicitly cover but the controller amendment ("every code
path, including error ... paths") requires.

## Task 10 — final gate, 2026-08-26

Ran the full gate before the 0.1.0 documentation commit:

```bash
npm test              # 65 pass, 0 fail
npm run format:check  # oxfmt --check src test: all matched files use the correct format
npm run lint:js        # oxlint: 0 errors, 0 warnings
npm run lint           # web-ext lint: 0 errors, 0 warnings, 0 notices
```

**Real-Firefox gap, unresolved.** This session, like Task 9's, has no Firefox binary and no
display. The popup has still never been rendered in an actual Firefox window. The Task 9 entry
above remains the closest available substitute — a live jsdom-driven run against the real NWS
APIs — and the README now states this limitation plainly rather than implying browser testing
took place.

## Final fix round, 2026-08-26

A whole-branch review found defects the checks above could not see. Two of them contradict
findings recorded earlier in this log, so they are noted here rather than left to the commit
history.

**The degraded path did not survive a bad newest record.** The "Degraded path" section above
exercised a failing `fetch`, which is one of the two ways that path is reached. The other is a
live series whose newest record cannot build a view model. `popup-main.js` wrote the series to
`observations:<id>` before `buildModel` ran, so that series overwrote the last good cache and
the fallback read it back, threw again, and rendered the error page — having destroyed the only
reading it existed to preserve. Both cache writes now happen after `buildModel` succeeds.
`test/popup-main.test.js` pins this, and the case fails against the previous code.

**The 10-minute TTL was never wired up.** `storage.js` has carried `ttlMinutes` since Task 7
with no production caller, so the popup re-fetched both upstreams on every open. The happy path
now reads through the TTL and caches the gridpoint forecast beside the series; the degraded path
keeps reading the same key with no TTL on purpose.

Environment note, unchanged: still no Firefox binary and no display. The Real-Firefox gap
recorded under Task 10 remains open.
