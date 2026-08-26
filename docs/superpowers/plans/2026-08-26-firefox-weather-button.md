# Firefox Weather Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Firefox toolbar button whose popup shows dewpoint, barometric pressure with a labelled trend, ambient METAR conditions, computed cloud base, and thunder probability — sourced entirely from NWS.

**Architecture:** Popup-driven fetch, no background script. Pure functions (`units`, `lcl`, `tendency`, `gridpoint`, `observation`) know nothing about who calls them; network and `browser.*` live only in `nws.js` and `storage.js`. That seam is what makes the deferred badge version additive rather than a rewrite. Observations come pre-decoded from the NWS Aviation Weather Center, so no METAR parser is needed.

**Tech Stack:** Manifest V3, vanilla ES modules, no runtime dependencies. `node --test` with jsdom, oxfmt + oxlint pinned exact, web-ext.

**Spec:** `docs/superpowers/specs/2026-08-26-firefox-weather-button-design.md`

## Global Constraints

- **Manifest V3**, `strict_min_version` 128.0, extension id `weather-button@andybp85`
- **No runtime dependencies.** Zero. Everything ships as vanilla ES modules
- **Permissions:** `storage` only, plus host permissions for `https://aviationweather.gov/*` and `https://api.weather.gov/*`. No `geolocation`, no `alarms`, no `tabs`, no background script
- **Formatting is owned by oxfmt:** 4-space indent, 140 columns, no semicolons, single quotes, `arrowParens: avoid`, `trailingComma: all`. Never hand-format around it
- **Display units are fixed:** Fahrenheit, hPa, feet AGL, knots, statute miles. No toggle in 0.1.0
- **Every network response used in a test is a captured fixture.** No live calls from the test suite, ever
- **`data_collection_permissions`: `["none"]`** — settled; the extension collects nothing itself
- **Task 9 must invoke the `kit-developer-edition` and `modern-web-guidance` skills** before writing any HTML or CSS

### Documented rule deviation — import paths

`js.md` requires root-relative import paths (`/api.js`). That resolves correctly inside the extension (`moz-extension://<uuid>/src/units.js`) but breaks `node --test`, which resolves `/src/units.js` against the filesystem root. Modules inside `src/` therefore import each other **relatively** (`./units.js`), and tests import `../src/units.js`.

This is the only sanctioned deviation in the plan. Do not extend it to anything else. If you find a way to satisfy both targets without an import map, raise it rather than acting on it.

## Code rules

**These rules outrank this plan. Where a code sample below contradicts one, follow the rule and say so in your report.**

**Dispatchers: copy this entire section verbatim into the body of every task brief.** A brief that points at "the Code rules section of the plan" resolves to nothing in a fresh context and binds no one.

```
The user's standing code rules for this file type, from ~/.claude/rules/.
They outrank any task brief, plan, or surrounding code that contradicts them:
if a brief specifies code that breaks a rule below, follow the rule and say so.

--- css.md ---
# CSS style

- prefer native nesting to group related styles
- properties alphabetized per block; exception: order-dependent ones (shorthand before longhands, `-webkit-` before standard) — comment when
  you break order
- name and order classes to follow the elements' order on the page, to the extent possible
- alphabetize custom properties in :root
- use @layer when project complexity makes explicit cascade ordering the simpler solution
- comment the *why* for any non-obvious rule

--- general.md ---
# General code style

Cross-language principles. Language rules stack on top; CLAUDE.md holds architecture (functional paradigms, YAGNI, Pike, DRY).

## Mindset

- optimize for *readability over writability* — the reader is often you in six months; do the hard thinking at write-time so reading is
  cheap
- prefer *simple* (cheap to reason about correctly) over *easy* (cheap to write) — "hard and simple" beats "easy and complex"
- minimize accidental complexity (what the code imposes); spend the budget on the problem itself
- code is read in small chunks — structure every unit to fit in working memory: small, labeled, composable pieces
- keep code continuously clean — fix small messes before they rot

## Functions

- one concept per function; do exactly what the name says, nothing more — if the name feels dumb to type, it shouldn't be a function
- build a vocabulary of small, composable functions
- aim short; split when over ~20 lines or high cognitive complexity — but never split a single concept just to hit a number
- entry points (`main`, scripts) may stay long once pure logic is factored out — locality wins there
- limit heterogeneous positional params (≤3, hard max 4); beyond that use named/keyword args — meaningful names over meaningless positions
- prefer explicit inputs and outputs over hidden state mutation — you understand a unit by what goes in and comes out

## Control flow & shape

- flatten — deep nesting is a smell; use guard clauses / early returns, and isolate unavoidably deep logic in its own function
- keep conditionals short; don't mix `&&` and `||` in one test — extract or split
- prefer declarative (*what*) over imperative (*how*); prefer `map`/`filter`/`reduce` (pure, produce output) over `forEach`/loops
  (side-effecting)
- break long call/method chains into well-named intermediate variables or helpers
- favor familiar, consistent patterns (least surprise); don't reach for exotic syntax/sugar that taxes the reader

## State & effects

- treat data as immutable — code as if you can copy but not change it (mutate during construction, then freeze)
- no action-at-a-distance: no global mutable state; behavior should be understandable by reading locally
- isolate side effects (I/O) at the edges; keep core logic pure
- keep variable liveness short — declare near first use, minimize the span; avoid long-lived cross-function mutable vars (use an object or
  refactor)
- pair acquire with release by *returning* the release — `open`/`attach`/`subscribe`/`lock` hands back its own undo, so there's no "am I
  open" flag to keep in sync and each acquisition releases independently

## Naming

- name by purpose — never meaningless names (`value`, `data`, `temp`)
- functions are verbs; variables are nouns; pluralize collections; single-letter names only in tight iteration
- use visually distinct names (avoid `i`/`j`, `item`/`items` confusion); never shadow
- descriptive names don't excuse bad design — and over-long names are bloat too
- sort alphabetically wherever order is otherwise arbitrary

## Abstractions

- build composable, *trustworthy* abstractions — ones that obey the laws they imply (consistent equality, no surprising special cases)
- a leaky or misleading abstraction or type explodes cognitive load; a lawful one reduces it

## Errors

- errors should never pass silently, unless explicitly silenced
- throw to let the caller decide — don't swallow at the point of occurrence
- catch only the specific condition you can handle; re-throw the rest
- don't return empty/`undefined` for an essential missing value — throw

## Comments & docs

- comment the *why*, not the *what* — if a "what" feels needed, first make the code clearer (hard math/algorithms/perf excepted)
- comment the non-obvious: anything a reader would ask about, anything you had to re-derive, non-specific catch blocks, and especially a
  hack you hadn't time to refactor
- don't omit comments out of staleness-fear — names go stale too; prefer assertions over comments documenting assumptions
- colocate docs with what they describe; read nearby commentary before editing
- cite sources (say what a URL is *for*); mark temporary/workaround code with removal criteria; flag non-obvious cross-file coupling on both
  sides
- generate API docs from source, don't hand-maintain a parallel copy; tests are documentation

## Testing

- CLAUDE.md holds the strategy (test-first, regression tests, mock boundaries); these are code-level additions
- a bug is a signal of excess complexity — fix the root cause and structure, not just the symptom
- set up mocks/spies in the test that uses them (locality over DRY)

## Hygiene

- no dead or vestigial code (unused imports, params, variables)
- no stray debug output in committed code (`console.log`, `print`); error logging is fine
- LF line endings

## Tooling

- the formatter owns formatting — don't hand-format around it or fight its output; if it's wrong, fix the config, not the file
- a suppression (`noqa`, `swift-format-ignore`, `eslint-disable`) names the one rule it suppresses and states the invariant that earns it
  ("cleanup only", "source literal compiled into the binary") — narrowest scope that works; never bare, never file-wide where a line will do
- if the same rule needs suppressing everywhere, the rule is wrong for this project — turn it off in the config, once, with the reason
- stdout is a tool's product in a CLI entry point and debug noise everywhere else; suppress the print rule at the site, not repo-wide

--- html.md ---
# HTML style

- head order: charset, viewport, meta (description/author/theme-color/robots), title, stylesheet, icons, manifest
- root-relative absolute paths for assets (`/styles/...`, `/images/...`) so pages work from any subdir
- scripts before `</body>`; `type="module"` for ES modules; keep inline scripts minimal
- attributes alphabetized; leave line breaking to the formatter — it breaks one per line past the print width
- void elements carry the self-closing slash (`<meta ... />`, `<img ... />`) — oxfmt writes it; `.vnu-filter` documents why the checker
  stays quiet about it
- entity-escape literal `&`/`<` in text content

--- js.md ---
# JavaScript style

- omit optional syntax: no semicolons (ASI), no parens on single-param arrows, no braces on single-statement blocks
- const by default; let only when reassigned; never var
- prefer `undefined` over `null` (use `null` only when an API requires it); avoid `undefined` as a meaningful value
- general.md's acquire-returns-release: wrap `addEventListener` in a closure returning the `removeEventListener`, or an `AbortSignal` for
  a whole group
- ES modules; root-relative import paths (`/api.js`)
- module-private means not exported — no `_`-prefix convention; `#name` fields for genuinely private class state
- prefer modern built-ins/DOM APIs, destructuring, and shorthand over manual equivalents

--- objects.md ---
# Object and collection style

- alphabetize all object properties to the extent possible
- prefer objects with semantically-relevant keys to arrays, unless modeling an actual list

--- web.md ---
# Web platform rules

- browser support: Baseline Widely Available by default; newer features only as graceful progressive enhancements — no polyfills, no
  external deps
- no redundant or vestigial markup or styles — delete dead, unused, and overridden rules, elements, and attributes
- beyond the language rules, defer to modern-web-guidance
```

---

## File structure

| File | Responsibility | Purity |
|---|---|---|
| `src/units.js` | Celsius to Fahrenheit, metres to feet | pure |
| `src/lcl.js` | Espy's approximation for cloud base | pure |
| `src/tendency.js` | Pressure tendency: reported, computed, provenance | pure |
| `src/gridpoint.js` | Thunder probability, ISO-8601 interval expansion | pure |
| `src/observation.js` | One AWC record to a display-ready view model | pure |
| `src/nws.js` | Fetch chain: METAR, points, gridpoint | I/O |
| `src/storage.js` | TTL cache over `browser.storage.local` | I/O |
| `src/options.html`, `src/options.js` | Station configuration and validation | shell |
| `src/popup.html`, `src/popup.js` | Render | shell |
| `src/ui.css` | Kit Developer Edition tokens and layout | shell |

Fixtures live in `test/fixtures/`, one JSON file per captured response. Tests never touch the network.

---

### Task 1: Scaffold, tooling, and guards

This task is a gate. Nothing else starts until it is committed and green on `main`. A guard installed after feature code has landed gates nothing that already landed.

**Files:**
- Create: `package.json`, `manifest.json`, `.oxfmtrc.json`, `.oxlintrc.json`, `.claudeignore`, `.vnu-filter`, `README.md`, `CHANGELOG.md`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing
- Produces: `npm test`, `npm run lint:js`, `npm run format:check`, `npm run build`; a working pre-commit gate

- [ ] **Step 1: Write `package.json`**

```json
{
    "name": "firefox-weather-button",
    "version": "0.1.0",
    "private": true,
    "description": "Firefox toolbar button showing dewpoint, barometric pressure trend, and thunder probability from NWS",
    "type": "module",
    "scripts": {
        "test": "node --test test/*.test.js",
        "start": "web-ext run --source-dir . --ignore-files \"node_modules/**\" \"docs/**\"",
        "lint": "web-ext lint --source-dir . --ignore-files \"node_modules/**\" \"test/**\" \"docs/**\"",
        "build": "web-ext build --source-dir . --overwrite-dest --ignore-files \"node_modules/**\" \"test/**\" \"docs/**\"",
        "format": "oxfmt",
        "format:check": "oxfmt --check",
        "lint:js": "oxlint"
    },
    "devDependencies": {
        "jsdom": "^26.1.0",
        "oxfmt": "0.63.0",
        "oxlint": "1.78.0",
        "web-ext": "^8.5.0"
    }
}
```

`"type": "module"` matters: without it `node --test` treats `src/*.js` as CommonJS and every `export` throws.

- [ ] **Step 2: Write the formatter and linter configs**

`.oxfmtrc.json`:

```json
{
    "semi": false,
    "arrowParens": "avoid",
    "singleQuote": true,
    "tabWidth": 4,
    "printWidth": 140,
    "trailingComma": "all",
    "ignorePatterns": ["package.json", "package-lock.json", "**/*.md", "**/*.toml"]
}
```

`.oxlintrc.json`:

```json
{
    "rules": {
        "curly": ["error", "multi"],
        "no-console": ["error", { "allow": ["warn", "error"] }],
        "no-unused-vars": "error",
        "no-var": "error",
        "prefer-const": "error",
        "typescript/no-explicit-any": "error"
    }
}
```

- [ ] **Step 3: Write `manifest.json`**

```json
{
    "manifest_version": 3,
    "name": "Weather Button",
    "version": "0.1.0",
    "description": "Dewpoint, barometric pressure trend, and thunder probability from the National Weather Service.",
    "browser_specific_settings": {
        "gecko": {
            "id": "weather-button@andybp85",
            "strict_min_version": "128.0",
            "data_collection_permissions": {
                "required": ["none"]
            }
        }
    },
    "permissions": ["storage"],
    "host_permissions": ["https://api.weather.gov/*", "https://aviationweather.gov/*"],
    "action": {
        "default_title": "Weather detail",
        "default_popup": "src/popup.html",
        "default_icon": { "48": "icons/icon.svg" }
    },
    "icons": { "48": "icons/icon.svg", "96": "icons/icon.svg" },
    "options_ui": {
        "page": "src/options.html",
        "open_in_tab": false
    }
}
```

- [ ] **Step 4: Write `.claudeignore` and extend `.gitignore`**

`.claudeignore`:

```
node_modules/
web-ext-artifacts/
coverage/
*.xpi
```

Append to `.gitignore` if not already present: `node_modules/`, `web-ext-artifacts/`, `*.xpi`, `.DS_Store`.

- [ ] **Step 5: Install dependencies**

Run: `npm install`
Expected: `node_modules/` populated, `package-lock.json` created, no audit failures that block.

- [ ] **Step 6: Install the commit guards**

Invoke the `repo-tooling` skill for the lint guard and the `secrets-commit-guard` skill for the repo-local secrets guard. Both must end up in `.git/hooks/pre-commit.d/`, dispatched by `.git/hooks/pre-commit`.

Leave both enabled. Do **not** set `claude.gates false` or `claude.secrets false`.

- [ ] **Step 7: Prove the lint gate actually blocks**

Linters lie about exit codes. Verify rather than trust:

```bash
printf 'var broken = 1;\n' >| src/gate-probe.js
git add src/gate-probe.js
git commit -m "probe: this commit must be rejected"
```

Expected: the commit is **rejected**, citing `no-var` (and the missing-semicolon formatting difference).

If it succeeds, the gate is not wired. Stop and fix the hook before going further — do not proceed with a gate you have not seen fail.

- [ ] **Step 8: Remove the probe**

```bash
git reset HEAD src/gate-probe.js
rm src/gate-probe.js
```

- [ ] **Step 9: Write a placeholder icon**

`icons/icon.svg` — a minimal valid SVG so `web-ext lint` does not fault on a missing icon. Replaced in Task 9.

- [ ] **Step 10: Verify the toolchain runs clean**

```bash
npm run format:check && npm run lint:js && npm run lint
```

Expected: all three pass. `npm test` will report no test files yet; that is fine.

- [ ] **Step 11: Commit on `main`**

```bash
git add -A
git commit -m "Scaffold the extension with tooling and commit guards"
```

---

### Task 2: `src/units.js`

**Files:**
- Create: `src/units.js`
- Test: `test/units.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: `celsiusToFahrenheit(celsius: number): number`, `metresToFeet(metres: number): number`

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { celsiusToFahrenheit, metresToFeet } from '../src/units.js'

test('celsiusToFahrenheit converts the freezing point', () => {
    assert.equal(celsiusToFahrenheit(0), 32)
})

test('celsiusToFahrenheit converts the KEWR fixture temperature', () => {
    assert.equal(Math.round(celsiusToFahrenheit(21.7)), 71)
})

test('celsiusToFahrenheit handles negatives', () => {
    assert.equal(celsiusToFahrenheit(-40), -40)
})

test('metresToFeet converts the KEWR fixture cloud base', () => {
    assert.equal(Math.round(metresToFeet(912.5)), 2994)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/units.js'`

- [ ] **Step 3: Write the minimal implementation**

```js
const CELSIUS_TO_FAHRENHEIT_RATIO = 9 / 5
const FAHRENHEIT_OFFSET = 32
const FEET_PER_METRE = 3.280839895

export const celsiusToFahrenheit = celsius => celsius * CELSIUS_TO_FAHRENHEIT_RATIO + FAHRENHEIT_OFFSET

export const metresToFeet = metres => metres * FEET_PER_METRE
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add src/units.js test/units.test.js
git commit -m "Add unit conversions for display"
```

---

### Task 3: `src/lcl.js`

Cloud base from dewpoint depression. This is the module that turns the two numbers the popup already shows into a diagnostic.

**Files:**
- Create: `src/lcl.js`
- Test: `test/lcl.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: `lclMetres({ dewpointCelsius, temperatureCelsius }): number`

Takes an object rather than two positional numbers deliberately: both arguments are same-typed, and swapping them silently yields a negative cloud base rather than an error.

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { lclMetres } from '../src/lcl.js'

test('lclMetres computes the KEWR fixture cloud base', () => {
    // temp 21.7C, dewpoint 14.4C -> 7.3C spread -> 125 * 7.3 = 912.5 m
    assert.equal(Math.round(lclMetres({ dewpointCelsius: 14.4, temperatureCelsius: 21.7 })), 913)
})

test('lclMetres is zero at saturation', () => {
    assert.equal(lclMetres({ dewpointCelsius: 14.4, temperatureCelsius: 14.4 }), 0)
})

test('lclMetres rises with a wider spread', () => {
    const humid = lclMetres({ dewpointCelsius: 20, temperatureCelsius: 22 })
    const dry = lclMetres({ dewpointCelsius: 5, temperatureCelsius: 22 })
    assert.ok(dry > humid)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/lcl.js'`

- [ ] **Step 3: Write the minimal implementation**

```js
// Espy's approximation: cloud base rises roughly 125 m for each degree Celsius of
// dewpoint depression. https://glossary.ametsoc.org/wiki/Lifted_condensation_level
const METRES_PER_DEGREE_OF_SPREAD = 125

export const lclMetres = ({ dewpointCelsius, temperatureCelsius }) =>
    METRES_PER_DEGREE_OF_SPREAD * (temperatureCelsius - dewpointCelsius)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: 7 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lcl.js test/lcl.test.js
git commit -m "Add lifted condensation level from dewpoint depression"
```

---

### Task 4: `src/tendency.js`

The heart of the build. Selects the reported WMO tendency when one is in range, differences the sea-level pressure series when it is not, and always reports which it did.

**Files:**
- Create: `src/tendency.js`, `test/fixtures/kewr-rising.json`, `test/fixtures/kord-falling.json`
- Test: `test/tendency.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: `resolveTendency(observations: AwcObservation[]): Tendency`

```
Tendency = {
    direction: 'rising' | 'falling' | 'steady',
    hPa: number,
    observedAt: string,          // ISO 8601, the observation the value describes
    provenance: 'reported' | 'computed',
    windowHours: number,
}
```

- [ ] **Step 1: Capture the fixtures**

```bash
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:141.0) Gecko/20100101 Firefox/141.0'
curl -s -H "User-Agent: $UA" 'https://aviationweather.gov/api/data/metar?ids=KEWR&format=json&hours=5' >| test/fixtures/kewr-rising.json
curl -s -H "User-Agent: $UA" 'https://aviationweather.gov/api/data/metar?ids=KORD&format=json&hours=5' >| test/fixtures/kord-falling.json
```

These are captured live, so exact values drift. The tests below assert against the shape and the internal consistency of whatever was captured, plus two pinned values from the 2026-08-26 capture. If a pinned assertion fails after a re-capture, update the pinned number — do not weaken the assertion.

Reference values from the 2026-08-26 capture, newest-first:

```
KEWR  13:00 slp 1019.1                 12:00 slp 1019.1 presTend +1.5
KORD  13:00 slp 1012.2                 12:00 slp 1012.8 presTend -1.2
      11:00 slp 1012.9   10:00 slp 1013.6   09:00 slp 1014.0 presTend -1.1
```

Note `1012.8 - 1014.0 = -1.2`, exactly the reported `presTend` three hours later. The computed path and the reported path agree to the tenth, which is what the cross-check test pins.

- [ ] **Step 2: Write the failing test**

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { resolveTendency } from '../src/tendency.js'

const fixture = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url)))

test('resolveTendency prefers the reported synoptic value', () => {
    const tendency = resolveTendency(fixture('kewr-rising'))
    assert.equal(tendency.provenance, 'reported')
    assert.equal(tendency.direction, 'rising')
    assert.ok(tendency.hPa > 0)
})

test('resolveTendency reads a negative reported value as falling', () => {
    const tendency = resolveTendency(fixture('kord-falling'))
    assert.equal(tendency.provenance, 'reported')
    assert.equal(tendency.direction, 'falling')
    assert.ok(tendency.hPa < 0)
})

test('resolveTendency falls back to the sea-level pressure series', () => {
    // AWC omits presTend outside the 3-hourly synoptic reports; strip it to force the fallback.
    const stripped = fixture('kord-falling').map(({ presTend, ...observation }) => observation)
    const tendency = resolveTendency(stripped)
    assert.equal(tendency.provenance, 'computed')
    assert.equal(tendency.direction, 'falling')
    assert.equal(tendency.windowHours, 3)
})

test('the computed fallback agrees with the reported value it replaces', () => {
    // 1012.8 - 1014.0 = -1.2, the presTend reported at 12:00Z on 2026-08-26.
    const observations = fixture('kord-falling')
    const reported = observations.find(observation => observation.presTend !== undefined)
    const from = observations.findIndex(observation => observation.reportTime === reported.reportTime)
    const computed = resolveTendency(observations.slice(from).map(({ presTend, ...rest }) => rest))
    assert.equal(computed.hPa, reported.presTend)
})

test('resolveTendency throws on an empty series', () => {
    assert.throws(() => resolveTendency([]), /empty/)
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/tendency.js'`

- [ ] **Step 4: Write the minimal implementation**

```js
const MILLISECONDS_PER_HOUR = 3_600_000
const TENDENCY_WINDOW_HOURS = 3

const roundToTenth = value => Number(value.toFixed(1))

const directionOf = hPa => {
    if (hPa > 0) return 'rising'
    if (hPa < 0) return 'falling'
    return 'steady'
}

const hoursBetween = (earlier, later) => (Date.parse(later.reportTime) - Date.parse(earlier.reportTime)) / MILLISECONDS_PER_HOUR

// Returns undefined rather than throwing when the series is too short: this is an
// optional fallback, not an essential value, and resolveTendency decides what to do.
const computeFromSeries = observations => {
    const newest = observations[0]
    const baseline = observations.find(observation => hoursBetween(observation, newest) >= TENDENCY_WINDOW_HOURS)
    if (baseline === undefined) return undefined
    if (newest.slp === undefined || baseline.slp === undefined) return undefined

    const hPa = roundToTenth(newest.slp - baseline.slp)
    return {
        direction: directionOf(hPa),
        hPa,
        observedAt: newest.reportTime,
        provenance: 'computed',
        windowHours: hoursBetween(baseline, newest),
    }
}

export const resolveTendency = observations => {
    if (observations.length === 0) throw new Error('cannot resolve a pressure tendency from an empty observation series')

    const computed = computeFromSeries(observations)
    // AWC carries presTend only in the 3-hourly synoptic METARs, so the newest observation
    // holding one can trail the newest observation by up to three hours.
    const reported = observations.find(observation => observation.presTend !== undefined)
    if (reported === undefined) {
        if (computed === undefined) throw new Error('no reported tendency and too few observations to compute one')
        return computed
    }

    // A reported value disagreeing in sign with the series it came from is not trustworthy.
    // Verified agreeing at KORD on 2026-08-26; the series wins if that ever stops holding.
    if (computed !== undefined && Math.sign(computed.hPa) !== Math.sign(reported.presTend)) return computed

    return {
        direction: directionOf(reported.presTend),
        hPa: reported.presTend,
        observedAt: reported.reportTime,
        provenance: 'reported',
        windowHours: TENDENCY_WINDOW_HOURS,
    }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: 12 passing.

- [ ] **Step 6: Commit**

```bash
git add src/tendency.js test/tendency.test.js test/fixtures/
git commit -m "Resolve pressure tendency from reported or computed values

The WMO 5appp group reaches us pre-decoded as presTend, but only in the
3-hourly synoptic METARs. Differencing the sea-level pressure series
covers the gap, and callers are told which path produced the number."
```

---

### Task 5: `src/gridpoint.js`

Thunder probability, and the ISO-8601 interval expansion the gridpoint format forces on every consumer.

**Files:**
- Create: `src/gridpoint.js`, `test/fixtures/tbw-gridpoint.json`, `test/fixtures/okx-gridpoint.json`
- Test: `test/gridpoint.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: `durationHours(duration: string): number`, `thunderSeries({ gridpoint, hours }): ThunderHour[]`

```
ThunderHour = { hour: string, percent: number }   // hour is ISO 8601
```

- [ ] **Step 1: Capture the fixtures**

```bash
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:141.0) Gecko/20100101 Firefox/141.0'
curl -s -H "User-Agent: $UA" 'https://api.weather.gov/gridpoints/TBW/70,70' >| test/fixtures/tbw-gridpoint.json
curl -s -H "User-Agent: $UA" 'https://api.weather.gov/gridpoints/OKX/32,42' >| test/fixtures/okx-gridpoint.json
```

TBW was chosen because its `probabilityOfThunder` spanned 0-75% across `PT1H`, `PT2H`, `PT3H`, `PT6H`, `PT9H`, and `PT12H` blocks. OKX was chosen because it contained a `P1DT3H` block, the only observed duration carrying a day component.

- [ ] **Step 2: Write the failing test**

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { durationHours, thunderSeries } from '../src/gridpoint.js'

const fixture = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url)))

test('durationHours parses plain hour durations', () => {
    assert.equal(durationHours('PT1H'), 1)
    assert.equal(durationHours('PT12H'), 12)
})

test('durationHours parses a duration carrying a day component', () => {
    assert.equal(durationHours('P1DT3H'), 27)
})

test('durationHours parses a bare day duration', () => {
    assert.equal(durationHours('P1D'), 24)
})

test('durationHours throws on an unsupported duration', () => {
    assert.throws(() => durationHours('PT30M'), /unsupported/)
})

test('thunderSeries expands variable blocks into one entry per hour', () => {
    const series = thunderSeries({ gridpoint: fixture('tbw-gridpoint'), hours: 12 })
    assert.equal(series.length, 12)
    assert.ok(series.every(entry => typeof entry.percent === 'number'))
    assert.ok(series.every(entry => !Number.isNaN(Date.parse(entry.hour))))
})

test('thunderSeries expands a P1DT3H block without dropping it', () => {
    const series = thunderSeries({ gridpoint: fixture('okx-gridpoint'), hours: 27 })
    assert.equal(series.length, 27)
})

test('thunderSeries returns empty when the element is absent', () => {
    assert.deepEqual(thunderSeries({ gridpoint: { properties: {} }, hours: 12 }), [])
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/gridpoint.js'`

- [ ] **Step 4: Write the minimal implementation**

```js
const DURATION_PATTERN = /^P(?:(\d+)D)?(?:T(\d+)H)?$/
const HOURS_PER_DAY = 24
const MILLISECONDS_PER_HOUR = 3_600_000

const offsets = count => [...Array(count).keys()]

const addHours = (startsAt, hours) => new Date(Date.parse(startsAt) + hours * MILLISECONDS_PER_HOUR).toISOString()

// NWS gridpoint validTime blocks vary from PT1H near the present out to P1DT3H days
// ahead, so consumers cannot assume hourly buckets.
export const durationHours = duration => {
    const match = DURATION_PATTERN.exec(duration)
    if (match === null) throw new Error(`unsupported gridpoint duration: ${duration}`)

    const [, days = '0', hours = '0'] = match
    return Number(days) * HOURS_PER_DAY + Number(hours)
}

export const thunderSeries = ({ gridpoint, hours }) => {
    const blocks = gridpoint.properties?.probabilityOfThunder?.values ?? []

    return blocks
        .flatMap(({ validTime, value }) => {
            const [startsAt, duration] = validTime.split('/')
            return offsets(durationHours(duration)).map(offset => ({ hour: addHours(startsAt, offset), percent: value }))
        })
        .slice(0, hours)
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: 19 passing.

- [ ] **Step 6: Commit**

```bash
git add src/gridpoint.js test/gridpoint.test.js test/fixtures/
git commit -m "Expand gridpoint thunder probability into hourly buckets

NWS validTime blocks run from PT1H to P1DT3H, so anything assuming an
hourly cadence silently drops most of the series."
```

---

### Task 6: `src/observation.js`

Normalises one AWC record into the view model the popup renders. This is where the awkward shapes of the upstream format are absorbed so the popup never sees them.

**Files:**
- Create: `src/observation.js`
- Test: `test/observation.test.js`

**Interfaces:**
- Consumes: `celsiusToFahrenheit`, `metresToFeet` from `./units.js`; `lclMetres` from `./lcl.js`
- Produces: `toViewModel(observation: AwcObservation): ObservationView`

```
ObservationView = {
    cloudBaseFeet: number,          // computed LCL, rounded
    clouds: string,                 // e.g. 'SCT 25000 ft', or 'clear'
    dewpointFahrenheit: number,
    observedAt: string,
    pressureHpa: number,
    stationName: string,
    temperatureFahrenheit: number,
    visibility: string,             // display text, '10+' preserved verbatim
    wind: string,                   // e.g. 'NNW 7 kt', or 'calm'
}
```

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { toViewModel } from '../src/observation.js'

const fixture = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url)))

test('toViewModel converts temperature and dewpoint to Fahrenheit', () => {
    const view = toViewModel({ dewp: 14.4, name: 'Newark Intl, NJ, US', reportTime: '2026-08-26T13:00:00.000Z', slp: 1019.1, temp: 21.7 })
    assert.equal(view.temperatureFahrenheit, 71)
    assert.equal(view.dewpointFahrenheit, 58)
})

test('toViewModel computes cloud base in feet from the spread', () => {
    const view = toViewModel({ dewp: 14.4, reportTime: '2026-08-26T13:00:00.000Z', temp: 21.7 })
    // 125 * 7.3 = 912.5 m = 2994 ft
    assert.equal(view.cloudBaseFeet, 2994)
})

test('toViewModel preserves the visibility string verbatim', () => {
    // AWC reports unlimited visibility as the string '10+', not a number.
    const view = toViewModel({ dewp: 14.4, reportTime: '2026-08-26T13:00:00.000Z', temp: 21.7, visib: '10+' })
    assert.equal(view.visibility, '10+')
})

test('toViewModel describes calm wind rather than printing a zero', () => {
    const view = toViewModel({ dewp: 14.4, reportTime: '2026-08-26T13:00:00.000Z', temp: 21.7, wdir: 0, wspd: 0 })
    assert.equal(view.wind, 'calm')
})

test('toViewModel names a cardinal direction for the wind', () => {
    const view = toViewModel({ dewp: 14.4, reportTime: '2026-08-26T13:00:00.000Z', temp: 21.7, wdir: 350, wspd: 7 })
    assert.equal(view.wind, 'NNW 7 kt')
})

test('toViewModel describes an empty cloud layer list as clear', () => {
    const view = toViewModel({ clouds: [], dewp: 14.4, reportTime: '2026-08-26T13:00:00.000Z', temp: 21.7 })
    assert.equal(view.clouds, 'clear')
})

test('toViewModel renders the newest fixture observation without throwing', () => {
    const view = toViewModel(fixture('kewr-rising')[0])
    assert.ok(view.stationName.includes('Newark'))
    assert.equal(typeof view.pressureHpa, 'number')
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/observation.js'`

- [ ] **Step 3: Write the minimal implementation**

```js
import { lclMetres } from './lcl.js'
import { celsiusToFahrenheit, metresToFeet } from './units.js'

const COMPASS_POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
const DEGREES_PER_POINT = 360 / COMPASS_POINTS.length

const cardinal = degrees => COMPASS_POINTS[Math.round(degrees / DEGREES_PER_POINT) % COMPASS_POINTS.length]

const describeWind = ({ wdir, wspd }) => {
    if (wspd === undefined || wspd === 0) return 'calm'
    if (wdir === undefined) return `${wspd} kt`
    return `${cardinal(wdir)} ${wspd} kt`
}

const describeClouds = clouds => {
    if (clouds === undefined || clouds.length === 0) return 'clear'
    return clouds.map(({ base, cover }) => (base === undefined ? cover : `${cover} ${base} ft`)).join(', ')
}

export const toViewModel = observation => {
    const { dewp, name, reportTime, slp, temp, visib } = observation

    return {
        cloudBaseFeet: Math.round(metresToFeet(lclMetres({ dewpointCelsius: dewp, temperatureCelsius: temp }))),
        clouds: describeClouds(observation.clouds),
        dewpointFahrenheit: Math.round(celsiusToFahrenheit(dewp)),
        observedAt: reportTime,
        pressureHpa: slp,
        stationName: name ?? 'unknown station',
        temperatureFahrenheit: Math.round(celsiusToFahrenheit(temp)),
        visibility: visib === undefined ? 'unreported' : String(visib),
        wind: describeWind(observation),
    }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: 26 passing.

- [ ] **Step 5: Commit**

```bash
git add src/observation.js test/observation.test.js
git commit -m "Normalise AWC observations into a display view model

Absorbs the upstream shapes the popup should never see: visibility as
the string '10+', absent wind keys meaning calm, cloud layers as a list."
```

---

### Task 7: `src/storage.js` and `src/nws.js`

The entire I/O surface. Everything else in `src/` is pure. These two take their collaborators by injection, so the tests reach the network never and the clock never.

**Files:**
- Create: `src/storage.js`, `src/nws.js`
- Test: `test/storage.test.js`, `test/nws.test.js`

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces: `createCache({ now, storage }): Cache`, `createNwsClient({ cache, fetch }): NwsClient`

```
Cache      = { read({ key, ttlMinutes }): Promise<unknown>, write({ key, value }): Promise<void> }
NwsClient  = {
    fetchGridpoint(url): Promise<object>,
    fetchObservations(stationId): Promise<AwcObservation[]>,
    resolveGridpointUrl({ lat, lon }): Promise<string>,
}
```

`ttlMinutes` is optional on `read`; omitting it means the entry never expires, which is how the gridpoint URL is cached.

- [ ] **Step 1: Write the failing cache test**

```js
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createCache } from '../src/storage.js'

const fakeStorage = () => {
    const entries = {}
    return {
        get: async key => (key in entries ? { [key]: entries[key] } : {}),
        set: async record => Object.assign(entries, record),
    }
}

test('createCache returns a value written within its TTL', async () => {
    const cache = createCache({ now: () => 1_000_000, storage: fakeStorage() })
    await cache.write({ key: 'observations', value: { slp: 1019.1 } })
    assert.deepEqual(await cache.read({ key: 'observations', ttlMinutes: 10 }), { slp: 1019.1 })
})

test('createCache expires a value past its TTL', async () => {
    const storage = fakeStorage()
    const written = createCache({ now: () => 0, storage })
    await written.write({ key: 'observations', value: { slp: 1019.1 } })

    const elevenMinutesLater = createCache({ now: () => 11 * 60_000, storage })
    assert.equal(await elevenMinutesLater.read({ key: 'observations', ttlMinutes: 10 }), undefined)
})

test('createCache never expires an entry read without a TTL', async () => {
    const storage = fakeStorage()
    const written = createCache({ now: () => 0, storage })
    await written.write({ key: 'gridpoint', value: 'https://api.weather.gov/gridpoints/OKX/32,42' })

    const muchLater = createCache({ now: () => 400 * 24 * 60 * 60_000, storage })
    assert.equal(await muchLater.read({ key: 'gridpoint' }), 'https://api.weather.gov/gridpoints/OKX/32,42')
})

test('createCache returns undefined for a key never written', async () => {
    const cache = createCache({ now: () => 0, storage: fakeStorage() })
    assert.equal(await cache.read({ key: 'absent', ttlMinutes: 10 }), undefined)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/storage.js'`

- [ ] **Step 3: Implement `src/storage.js`**

```js
const MILLISECONDS_PER_MINUTE = 60_000

// now and storage are injected so tests can drive the clock and skip the browser.
export const createCache = ({ now, storage }) => ({
    read: async ({ key, ttlMinutes }) => {
        const record = (await storage.get(key))[key]
        if (record === undefined) return undefined
        if (ttlMinutes === undefined) return record.value

        const ageMinutes = (now() - record.writtenAt) / MILLISECONDS_PER_MINUTE
        return ageMinutes > ttlMinutes ? undefined : record.value
    },

    write: async ({ key, value }) => storage.set({ [key]: { value, writtenAt: now() } }),
})
```

- [ ] **Step 4: Run the cache tests to verify they pass**

Run: `npm test`
Expected: 30 passing.

- [ ] **Step 5: Write the failing client test**

```js
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createNwsClient } from '../src/nws.js'

const recordingFetch = responses => {
    const calls = []
    const fetch = async url => {
        calls.push(url)
        return { json: async () => responses[calls.length - 1], ok: true, status: 200 }
    }
    return { calls, fetch }
}

const noopCache = () => {
    const entries = {}
    return {
        read: async ({ key }) => entries[key],
        write: async ({ key, value }) => {
            entries[key] = value
        },
    }
}

test('fetchObservations requests the AWC JSON endpoint for the station', async () => {
    const { calls, fetch } = recordingFetch([[{ slp: 1019.1 }]])
    const client = createNwsClient({ cache: noopCache(), fetch })
    await client.fetchObservations('KEWR')

    assert.ok(calls[0].startsWith('https://aviationweather.gov/api/data/metar'))
    assert.ok(calls[0].includes('ids=KEWR'))
    assert.ok(calls[0].includes('format=json'))
})

test('fetchObservations throws on the empty array AWC returns for a bad station', async () => {
    const { fetch } = recordingFetch([[]])
    const client = createNwsClient({ cache: noopCache(), fetch })
    await assert.rejects(() => client.fetchObservations('XXXX'), /no observations/)
})

test('resolveGridpointUrl resolves through the points endpoint once, then caches', async () => {
    const point = { properties: { forecastGridData: 'https://api.weather.gov/gridpoints/OKX/32,42' } }
    const { calls, fetch } = recordingFetch([point, point])
    const client = createNwsClient({ cache: noopCache(), fetch })

    const first = await client.resolveGridpointUrl({ lat: 40.6828, lon: -74.1692 })
    const second = await client.resolveGridpointUrl({ lat: 40.6828, lon: -74.1692 })

    assert.equal(first, second)
    assert.equal(calls.length, 1, 'the station never moves, so /points must not be re-resolved')
})

test('a non-ok response throws rather than yielding undefined', async () => {
    const client = createNwsClient({
        cache: noopCache(),
        fetch: async () => ({ json: async () => ({}), ok: false, status: 503 }),
    })
    await assert.rejects(() => client.fetchObservations('KEWR'), /503/)
})
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/nws.js'`

- [ ] **Step 7: Implement `src/nws.js`**

```js
const AWC_METAR_URL = 'https://aviationweather.gov/api/data/metar'
const NWS_POINTS_URL = 'https://api.weather.gov/points'
const OBSERVATION_HOURS = 5

// User-Agent cannot be set from fetch (forbidden header) and does not need to be:
// api.weather.gov 403s only when no UA is sent at all, and the browser always sends one.
const getJson = async (fetch, url) => {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`${url} responded ${response.status}`)
    return response.json()
}

export const createNwsClient = ({ cache, fetch }) => {
    const fetchObservations = async stationId => {
        const url = `${AWC_METAR_URL}?ids=${encodeURIComponent(stationId)}&format=json&hours=${OBSERVATION_HOURS}`
        const observations = await getJson(fetch, url)
        if (observations.length === 0) throw new Error(`no observations for station ${stationId}`)
        return observations
    }

    // A configured station never moves, so its gridpoint never changes. Cache the
    // resolution with no TTL rather than spending a request on it every popup open.
    const resolveGridpointUrl = async ({ lat, lon }) => {
        const key = `gridpoint:${lat},${lon}`
        const cached = await cache.read({ key })
        if (cached !== undefined) return cached

        const point = await getJson(fetch, `${NWS_POINTS_URL}/${lat},${lon}`)
        const url = point.properties.forecastGridData
        await cache.write({ key, value: url })
        return url
    }

    return {
        fetchGridpoint: url => getJson(fetch, url),
        fetchObservations,
        resolveGridpointUrl,
    }
}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npm test`
Expected: 34 passing.

- [ ] **Step 9: Commit**

```bash
git add src/storage.js src/nws.js test/storage.test.js test/nws.test.js
git commit -m "Add the fetch chain and TTL cache

Both take their collaborators by injection, which keeps the network and
the clock out of the test suite and leaves every other module pure."
```

---

### Task 8: Options page

Station configuration, validated at save time. An invalid station must fail here rather than surfacing as an empty popup later.

**REQUIRED SKILLS:** invoke `kit-developer-edition` and `modern-web-guidance` before writing markup or styles.

**Files:**
- Create: `src/options.html`, `src/options.js`
- Test: `test/options.test.js`

**Interfaces:**
- Consumes: `createNwsClient` from `./nws.js`
- Produces: `validateStation({ client, stationId }): Promise<{ name, stationId }>` — throws on an unknown station

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateStation } from '../src/options.js'

const clientReturning = observations => ({
    fetchObservations: async () => {
        if (observations.length === 0) throw new Error('no observations for station XXXX')
        return observations
    },
})

test('validateStation accepts a station that reports', async () => {
    const client = clientReturning([{ name: 'Newark Intl, NJ, US' }])
    assert.deepEqual(await validateStation({ client, stationId: 'kewr' }), { name: 'Newark Intl, NJ, US', stationId: 'KEWR' })
})

test('validateStation upper-cases the station id', async () => {
    const client = clientReturning([{ name: 'Newark Intl, NJ, US' }])
    const { stationId } = await validateStation({ client, stationId: '  kewr  ' })
    assert.equal(stationId, 'KEWR')
})

test('validateStation rejects a station that reports nothing', async () => {
    await assert.rejects(() => validateStation({ client: clientReturning([]), stationId: 'XXXX' }), /XXXX/)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/options.js'`

- [ ] **Step 3: Implement `validateStation` in `src/options.js`**

```js
export const validateStation = async ({ client, stationId }) => {
    const normalised = stationId.trim().toUpperCase()
    const [newest] = await client.fetchObservations(normalised)
    return { name: newest.name ?? normalised, stationId: normalised }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: 37 passing.

- [ ] **Step 5: Write `src/options.html`**

Head order is charset, viewport, meta, title, stylesheet. Attributes alphabetized. Void elements carry the closing slash. Script last, as a module.

```html
<meta charset="utf-8" />
<meta content="width=device-width, initial-scale=1" name="viewport" />
<title>Weather Button options</title>
<link href="/src/ui.css" rel="stylesheet" />

<main class="options">
    <h1>Weather Button</h1>
    <label for="station">Station ID</label>
    <input autocomplete="off" id="station" maxlength="4" placeholder="KEWR" spellcheck="false" type="text" />
    <p class="hint">A four-letter ICAO identifier for a reporting station near you.</p>
    <button id="save" type="button">Save</button>
    <p aria-live="polite" class="status" id="status"></p>
</main>

<script src="/src/options.js" type="module"></script>
```

- [ ] **Step 6: Wire the page in `src/options.js`**

Append to the module. Per `js.md`, `addEventListener` is wrapped so it hands back its own removal.

```js
const listen = ({ element, handler, type }) => {
    element.addEventListener(type, handler)
    return () => element.removeEventListener(type, handler)
}

const save = async () => {
    const status = document.querySelector('#status')
    const cache = createCache({ now: Date.now, storage: browser.storage.local })
    const client = createNwsClient({ cache, fetch })

    try {
        const station = await validateStation({ client, stationId: document.querySelector('#station').value })
        await browser.storage.local.set({ station })
        status.textContent = `Saved: ${station.name}`
    } catch (error) {
        status.textContent = `Not a reporting station: ${error.message}`
    }
}

listen({ element: document.querySelector('#save'), handler: save, type: 'click' })
```

The `catch` is deliberately broad: every failure here is reported to the user in the same way, and swallowing nothing — the message is surfaced verbatim.

- [ ] **Step 7: Verify the page loads**

Run: `npm start`, open the extension's options from `about:addons`, enter `KEWR`, save.
Expected: "Saved: Newark Intl, NJ, US". Enter `XXXX`: an error, and nothing stored.

- [ ] **Step 8: Validate the markup and commit**

```bash
npm run lint && npm test
git add src/options.html src/options.js test/options.test.js
git commit -m "Add options page with station validation at save time"
```

---

### Task 9: Popup

The only task that renders. Observation age and tendency provenance are permanent elements of the footer — they are the agreed substitute for de-tiding the pressure trend, and they are worthless hidden behind a hover.

**REQUIRED SKILLS:** invoke `kit-developer-edition` for the palette and `modern-web-guidance` before writing markup or styles. Do not invent token names; take them from the skill.

**Files:**
- Create: `src/popup.html`, `src/popup.js`, `src/ui.css`
- Modify: `icons/icon.svg` (replace the Task 1 placeholder)
- Test: `test/popup.test.js`

**Interfaces:**
- Consumes: `toViewModel` from `./observation.js`, `resolveTendency` from `./tendency.js`, `thunderSeries` from `./gridpoint.js`, `createNwsClient` from `./nws.js`, `createCache` from `./storage.js`
- Produces: `render({ document, model }): void`

```
PopupModel = { observation: ObservationView, thunder: ThunderHour[], tendency: Tendency }
```

Layout, ambient conditions leading:

```
+---------------------------------+
|  71F   NNW 7 kt   10+ mi        |  ambient
|  SCT 25000 ft                   |
+---------------------------------+
|  DEWPOINT   58F                 |  lead detail
|  1019.1 hPa   ^ +1.5 / 3h       |  pressure and trend
+---------------------------------+
|  Cloud base ~ 2994 ft           |  computed LCL
|  Thunder  bars                  |  thunder probability
+---------------------------------+
|  Newark Intl - obs 6m ago       |  age, always visible
|  tendency: reported (3h)        |  provenance, always visible
+---------------------------------+
```

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { render } from '../src/popup.js'

const popupDocument = () => new JSDOM(readFileSync(new URL('../src/popup.html', import.meta.url), 'utf8')).window.document

const model = {
    observation: {
        cloudBaseFeet: 2994,
        clouds: 'SCT 25000 ft',
        dewpointFahrenheit: 58,
        observedAt: '2026-08-26T13:00:00.000Z',
        pressureHpa: 1019.1,
        stationName: 'Newark Intl, NJ, US',
        temperatureFahrenheit: 71,
        visibility: '10+',
        wind: 'NNW 7 kt',
    },
    tendency: { direction: 'rising', hPa: 1.5, observedAt: '2026-08-26T12:00:00.000Z', provenance: 'reported', windowHours: 3 },
    thunder: [{ hour: '2026-08-26T13:00:00.000Z', percent: 25 }],
}

test('render shows the dewpoint', () => {
    const document = popupDocument()
    render({ document, model })
    assert.match(document.querySelector('#dewpoint').textContent, /58/)
})

test('render shows the pressure and its trend magnitude', () => {
    const document = popupDocument()
    render({ document, model })
    const pressure = document.querySelector('#pressure').textContent
    assert.match(pressure, /1019\.1/)
    assert.match(pressure, /1\.5/)
})

test('render shows the computed cloud base', () => {
    const document = popupDocument()
    render({ document, model })
    assert.match(document.querySelector('#cloud-base').textContent, /2994/)
})

test('render always states the tendency provenance', () => {
    const document = popupDocument()
    render({ document, model })
    assert.match(document.querySelector('#provenance').textContent, /reported/)
})

test('render states provenance for a computed tendency too', () => {
    const document = popupDocument()
    const computed = { ...model, tendency: { ...model.tendency, provenance: 'computed' } }
    render({ document, model: computed })
    assert.match(document.querySelector('#provenance').textContent, /computed/)
})

test('render always states the observation age', () => {
    const document = popupDocument()
    render({ document, model })
    assert.ok(document.querySelector('#age').textContent.length > 0)
})

test('render omits the thunder row rather than drawing an empty strip', () => {
    const document = popupDocument()
    render({ document, model: { ...model, thunder: [] } })
    assert.equal(document.querySelector('#thunder').hidden, true)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/popup.js'`

- [ ] **Step 3: Write `src/popup.html`**

Head order charset, viewport, meta, title, stylesheet. Attributes alphabetized. Void elements self-closing. Script last, as a module. Every element the tests query needs its id.

Required ids: `#ambient`, `#dewpoint`, `#pressure`, `#cloud-base`, `#thunder`, `#age`, `#provenance`.

- [ ] **Step 4: Implement `render` in `src/popup.js`**

Sketch — the arrow glyph is chosen by `tendency.direction`, and both footer lines are written unconditionally:

```js
const ARROWS = { falling: '↓', rising: '↑', steady: '→' }
const MILLISECONDS_PER_MINUTE = 60_000

const describeAge = ({ now, observedAt }) => {
    const minutes = Math.round((now - Date.parse(observedAt)) / MILLISECONDS_PER_MINUTE)
    if (minutes < 60) return `obs ${minutes}m ago`
    return `obs ${Math.round(minutes / 60)}h ago`
}

export const render = ({ document, model, now = Date.now() }) => {
    const { observation, tendency, thunder } = model
    const write = (selector, text) => {
        document.querySelector(selector).textContent = text
    }

    write('#ambient', `${observation.temperatureFahrenheit}F  ${observation.wind}  ${observation.visibility} mi`)
    write('#dewpoint', `${observation.dewpointFahrenheit}F`)
    write('#pressure', `${observation.pressureHpa} hPa  ${ARROWS[tendency.direction]} ${tendency.hPa} / ${tendency.windowHours}h`)
    write('#cloud-base', `Cloud base ~ ${observation.cloudBaseFeet} ft`)
    write('#age', `${observation.stationName} - ${describeAge({ now, observedAt: observation.observedAt })}`)
    write('#provenance', `tendency: ${tendency.provenance} (${tendency.windowHours}h)`)

    document.querySelector('#thunder').hidden = thunder.length === 0
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: 44 passing.

- [ ] **Step 6: Write `src/ui.css`**

Take every colour from the `kit-developer-edition` skill's tokens. Per `css.md`: custom properties alphabetized in `:root`, properties alphabetized per block, native nesting, classes ordered to follow the page, and a comment on the *why* for anything non-obvious.

The thunder strip is CSS bars over the `ThunderHour[]` — no canvas, no library.

- [ ] **Step 7: Wire the popup to live data**

Load the stored station, fetch through `createNwsClient`, build the model, call `render`. On any fetch failure, render the cached model with its real age rather than an error page — a stale popup that says how stale it is beats an empty one.

- [ ] **Step 8: Verify in the browser**

Run: `npm start`
Expected: the popup opens against your configured station and shows real values. Cross-check the pressure and dewpoint against `https://aviationweather.gov/api/data/metar?ids=<YOUR_STATION>&format=json&hours=2`.

Record the check in `docs/verification-log.md`.

- [ ] **Step 9: Validate and commit**

```bash
npm run format:check && npm run lint:js && npm run lint && npm test
git add src/popup.html src/popup.js src/ui.css icons/icon.svg test/popup.test.js docs/verification-log.md
git commit -m "Render the popup

Observation age and tendency provenance are permanent footer elements,
not hover affordances: they are what the design offers in place of
de-tiding the pressure trend."
```

---

### Task 10: Documentation and the 0.1.0 release

**REQUIRED SKILLS:** `simple-english` for the README, `versioning-with-semver` for the version and changelog, `update-docs-before-commit` before the final commit.

**Files:**
- Create: `docs/verification-log.md` (if Task 9 did not)
- Modify: `README.md`, `CHANGELOG.md`

- [ ] **Step 1: Write the README**

Cover: what it shows, why NWS rather than Firefox's own weather, how to install unsigned on Developer Edition, how to set a station, and what the tendency provenance label means. Apply `simple-english`.

State plainly that the pressure trend carries the semidiurnal tide and is not corrected for it, with a pointer to the spec's reasoning. A user who does not know this will misread the arrow every afternoon.

- [ ] **Step 2: Write the changelog entry**

```markdown
## [0.1.0] - 2026-08-26

### Added

- Toolbar popup showing dewpoint, sea-level pressure with a labelled trend, ambient conditions, computed cloud base, and thunder probability.
- Options page for configuring a reporting station, validated on save.
```

- [ ] **Step 3: Run the whole gate**

```bash
npm run format:check && npm run lint:js && npm run lint && npm test
```

Expected: all green, 44 tests passing.

- [ ] **Step 4: Build the extension**

Run: `npm run build`
Expected: an `.xpi` in `web-ext-artifacts/`.

- [ ] **Step 5: Commit**

```bash
git add README.md CHANGELOG.md docs/verification-log.md
git commit -m "Document the extension and release 0.1.0"
```

- [ ] **Step 6: Report, do not push**

Report the version to tag and what a tag command would be. Do not tag, push, or publish — per the user's standing instruction, those happen only when asked.

---

## Self-review

**Spec coverage.** Every spec section maps to a task: location and options to Task 8; popup scope to Tasks 6 and 9; the tendency rule to Task 4; the architecture seam to Tasks 2-7; data sources to Task 7; units to Tasks 2 and 6; error handling across Tasks 4-9; testing throughout; the manifest and tooling to Task 1; future work deliberately unimplemented.

**One spec correction, found while capturing fixtures.** The spec records `presTend`'s sign convention for falling pressure as unverified. It is now verified: KORD reported `presTend: -1.2` on 2026-08-26, and the sea-level pressure series it came from gives `1012.8 - 1014.0 = -1.2` exactly. Negative means falling, and the computed fallback reproduces the reported value to the tenth. The spec is updated in the same commit as this plan.

**Deferred with reason, not dropped.** `data_collection_permissions: ["none"]` is settled in Global Constraints rather than left open. The SPC outlook, the badge, and `5appp` character-code parsing stay in the spec's *Future work* and have no task here by design.

**Interface consistency.** `resolveTendency`, `toViewModel`, `thunderSeries`, `durationHours`, `createCache`, `createNwsClient`, `validateStation`, and `render` are each defined once and consumed under the same name and shape everywhere. `Tendency` carries `direction`, `hPa`, `observedAt`, `provenance`, and `windowHours` in Tasks 4, 9, and the popup test alike.

**Known gap, stated rather than hidden.** Task 9 Steps 3, 6, and 7 give requirements and a sketch instead of complete final source, because the palette tokens come from the `kit-developer-edition` skill at implementation time and inventing token names here would put wrong ones in the repo. Every element id those steps depend on is pinned by the Task 9 tests, so the contract is enforced even though the styling is not transcribed.
