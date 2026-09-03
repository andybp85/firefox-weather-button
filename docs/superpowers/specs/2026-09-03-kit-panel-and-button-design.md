# Kit panel and button — Design

- **Date:** 2026-09-03
- **Status:** Approved; decisions resolved 2026-09-03; plan at `docs/superpowers/plans/2026-09-03-kit-panel-and-button.md`
- **Version target:** 0.3.0
- **Bean:** firefox-weather-button-gxdu (design), firefox-weather-button-o09n (release)
- **Canvas:** [Weather Button Panel](https://claude.ai/code/artifact/57afcd6c-62e7-4886-90df-501611581e30) — page 1
  holds the chosen direction; page 2 holds the unchosen sketches

## Purpose

Restyle the popup panel and the toolbar button on the Kit Developer Edition tokens so the weather reads at a glance:
the sky first, then the enthusiast numbers. The panel becomes a 2×2 of stat plaques with an instrument on each. The
button keeps its grammar (dewpoint numerals, comfort colour, pressure trend) and replaces the windsock with a compass
dart in the Beaufort colour.

Every number in this document was lifted from the canvas artboards or the bean, not rounded to a grid. Where the
canvas and this document differ, the canvas wins for geometry and this document wins for behaviour. Recover the
artboards from the artifact with the design helper's `--extract` (the `.dc.html` files are Design Components, not
standalone pages, and are not tracked here because the HTML gate would reject their custom elements).

## Non-goals

- The options page. Unchanged.
- A full light-scheme mockup. The panel's tokens already switch through `light-dark()`; only the Beaufort ramp
  needed light partners, and they are below.
- Unavailable and degraded states as a design. They keep the shipped behaviour (placeholders, footer reason) inside
  the new layout — see *Unavailable states*.
- A de-tided pressure trend, SPC outlooks, the WMO `5appp` parser. Separate beans.

## Settled decisions

| Decision                   | Choice                                                                  | Rationale                                                                                                          |
| -------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Panel direction            | Plaques, with the instruments moved onto them                           | Fastest to scan for a number; the instruments give it a picture without the Sky Column's height                    |
| Wind plot                  | Station-model barbs on a compass ring                                   | The one wind grammar an enthusiast already reads; gusts drawn as extra barbs behind                                 |
| Wind colour                | Beaufort force, by knots, from Andy's chart                             | Speed reads as colour before it reads as a number; the chart is the reference the user already owns                |
| Cloud base plaque          | Paints its own sky: layers at height, width is coverage                 | The computed base sits under the reported layers, so the two readings are compared in one look                     |
| Button wind mark           | Compass dart, no barbs, no shaft; direction is the dart, speed the colour | Barbs were under two device pixels at 16 px; the dart can be bold                                                   |
| Button colour rule         | Force of the gust when gust − sustained > 10 kt, else of the sustained   | A gust that far over the sustained wind is the thing you dress for                                                 |
| Dart sense                 | Flies downwind (map convention): a north wind points down the face      | Panel barbs point where the wind comes from; the two surfaces read differently on purpose — flip if it grates      |
| Hot element                | The pressure trend glyph, in `--accent`                                  | One hot element per view; the shipped accent-filled headline goes                                                  |
| Light-scheme Beaufort ramp | One `light-dark()` pair per force, partners at OKLCH L 0.52              | All thirteen chart colours fail AA on the light plaque (1.0–2.8); the partners clear 4.5 on `--tile`               |
| Windsock                   | Deleted, both consumers                                                 | Unreleased (it is in `[Unreleased]`), so it is replaced, not deprecated                                             |

## Standards Check

Applied (folded into the plan):

- WCAG 2.2 AA (1.4.3 contrast, 1.4.11 non-text contrast) → every text pair is a measured pair from the Kit palette
  table or the Beaufort tables below; instrument SVGs are `aria-hidden` and every reading has a text equivalent beside
  it (1.1.1). Force 12 at 4.15 on `--tile` for the 11 px gust text is an accepted exception recorded on the bean.
- WMO No. 306 / FMH-1 station-model wind plotting → half barb 5 kt, full 10, pennant 50, barbs on the right looking
  out along the shaft (northern hemisphere), shaft toward the source of the wind, speeds rounded to 5 kt.
- Beaufort scale (WMO code table 1100), thresholds in knots → the thirteen forces below.

Considered, not applicable:

- OWASP ASVS — no new input, no new fetch; the observation pipeline is unchanged.
- GDPR / CCPA — no personal data.
- RFCs — no new wire traffic.

## Shared: the Beaufort ramp

`src/beaufort.js` is the one source for forces and colours. The popup writes a `light-dark()` pair inline; the button
uses the dark hex (its face is dark in both schemes).

| Force | Knots | Name            | Dark      | Light     |
| ----- | ----- | --------------- | --------- | --------- |
| 0     | < 1   | Calm            | `#129bf7` | `#056eb2` |
| 1     | 1–3   | Light air       | `#6cc8f7` | `#02729b` |
| 2     | 4–6   | Light breeze    | `#7dcabf` | `#25766d` |
| 3     | 7–10  | Gentle breeze   | `#13dd14` | `#017c02` |
| 4     | 11–16 | Moderate breeze | `#6cf640` | `#287a03` |
| 5     | 17–21 | Fresh breeze    | `#c8f640` | `#5a7203` |
| 6     | 22–27 | Strong breeze   | `#dcf59d` | `#5e7216` |
| 7     | 28–33 | Near gale       | `#f5f69c` | `#6f6d03` |
| 8     | 34–40 | Gale            | `#f1d860` | `#7b6902` |
| 9     | 41–47 | Strong gale     | `#f6be15` | `#856502` |
| 10    | 48–55 | Storm           | `#f69c6e` | `#a65324` |
| 11    | 56–63 | Violent storm   | `#f66d15` | `#b14a02` |
| 12    | ≥ 64  | Hurricane       | `#f05a2a` | `#c13900` |

Force is by the unrounded knots; the 5-kt rounding below is for drawing barbs only. Force 12's dark value was lifted
from the chart's `#c93f14` to clear 4.15 on `--tile`. The light partners keep each force's OKLCH hue, hold chroma
where sRGB allows, and sit at L 0.52: 4.5+ on `--tile`, 4.2 on `--bg` (touched only by plot strokes), 2.6 on
`--raised` (never text there).

```js
export const BEAUFORT = [
    { below: 1, dark: '#129bf7', light: '#056eb2', name: 'calm' },
    { below: 4, dark: '#6cc8f7', light: '#02729b', name: 'light air' },
    // ... one row per force, `below` exclusive, the last row Infinity
]

export const beaufortForce = knots => BEAUFORT.findIndex(force => knots < force.below)

// The popup's colour: the scheme picks the partner, so one string serves both.
export const beaufortColour = force => `light-dark(${BEAUFORT[force].light}, ${BEAUFORT[force].dark})`
```

The wind value gains the speed that colours the button. It lives in `src/wind.js` beside `isNotable`, because it is
the same judgement about what the wind has earned:

```js
// A gust this far over the sustained wind is the wind you dress for, so it takes the colour.
const GUST_MARGIN_KNOTS = 10

export const announcedKnots = ({ gustKnots, knots }) => (gustKnots - knots > GUST_MARGIN_KNOTS ? gustKnots : knots)
```

`gustKnots` undefined makes the subtraction NaN, and NaN compares false, so the sustained speed wins without a guard;
say so in a comment rather than adding one.

## Popup panel

Width stays 304 px (19 rem). The mesa is `--panel`, radius 12, overflow hidden. Plaques are `--tile`, radius 14,
padding 10 px 12 px, internal gap 4 px. The 2×2 grid has an 8 px gap and 12 px side padding. Type is Kit's:
`--font-display` for readings, `--font-body` elsewhere, `tabular-nums` on every number, labels 9.6 px 600 uppercase
tracked 0.14em in `--muted`.

Every fixed hex in the artboards is a Kit token: `#0a0e4a` `--bg`, `#2a3390` `--panel`, `#1a2170` `--tile`, `#3b4494`
`--raised`, `#6b74be` `--cloud`, `#d9ddf6` `--ink`, `#8a92cf` `--muted`, `#f47725` `--accent`. Write tokens, never the
hex.

Structure, top to bottom:

1. **Header** — padding 16 px 16 px 10 px, flex, items at the baseline end, space between. Left: the temperature,
   48 px display, line-height 0.9, `--ink`, written `71°` (degree sign, no unit letter). Right: a column of two 12 px
   `--ink` lines, right-aligned, 2 px gap — the cloud layers high to low with thousands separators joined by ` · `
   (`BKN 25,000 · SCT 4,500`; `clear` when there are none), then the visibility (`10+ mi`; `unreported` bare).
2. **Plaque grid** — dewpoint and cloud base on the top row, wind and pressure below.
3. **Thunder plaque** — margin 8 px 12 px 12 px. Label, then the bar strip as shipped (height 40 px, gap 3 px,
   `--raised`, radius 3 3 0 0, 2 px minimum), then an axis row of `now`, `+6h`, `+12h` at 9.6 px `--muted`, space
   between. Hidden when the series is empty, as shipped.
4. **Footer** — `--tile`, padding 10 px 16 px, two 11 px `--muted` lines: `Newark Intl · obs 6m ago` and
   `tendency: reported (3h), ended 26m ago`. The shipped ` - obs` joiner becomes ` · obs`.

The shipped hairline dividers between sections go; the plaques and the footer's tile ground carry the structure.

### Dewpoint plaque

Label, then the reading at 58 px display, line-height 0.9, centred, `--ink`, written `58°`. Below it, centred, a
comfort chip: pill (radius 999), padding 2 px 8 px, 10 px 600, background the band's `background`, text the band's
`foreground`, label capitalised (`Comfortable`). A three-character reading (`-12°`) stays at 58 px; the plaque is
wide enough.

### Cloud base plaque

A fixed 112 px tall plaque with the sky painted behind the text. The SVG is 136×112 (the plaque's full size at
304 px), absolutely positioned; the text block sits over it: label, reading (`2,990 ft`, 22 px display with the unit at
12 px), and `computed` at 11 px `--ink`.

Height scale, square root, in the 136×112 viewBox:

- Ground is 6 above the foot: `y = 106`. 30,000 ft is the bottom of the text block: `y = 66`.
- `y(feet) = 106 − 40 · √(feet / 30000)`, clamped to the top at 30,000 ft.

Checked against the artboard: 2,990 ft → 93.37, 6,100 → 87.96, 4,500 → 90.51, 25,000 → 69.49, 400 → 101.38.

The computed base is a dashed line across the full width at `y(cloudBaseFeet)`: `--cloud`, stroke 1.5,
dasharray 4 4. It is drawn on every sky, including clear.

Each reported layer is one row of puffs at `y(baseFeet)`, drawn high to low so the lower layer paints over the
higher. Coverage sets how many puffs and how wide; the puffs of a row are spread across the 136 with `n + 1` equal
gaps:

| Cover | Puffs | Each puff wide | Notes                                         |
| ----- | ----- | -------------- | --------------------------------------------- |
| FEW   | 1     | 27.2 (0.20)    | Centred at 68                                 |
| SCT   | 2     | 30.6 (0.225)   | Centres 40.23 and 95.77                       |
| BKN   | 2     | 51.0 (0.375)   | Centres 36.83 and 99.17                       |
| OVC   | lid   | full width     | See below                                     |

A puff of half-width `rx` at row `y`, centre `cx`:

- Base ellipse at `(cx, y + 2.16)`, `rx`, `ry` 4.32.
- Three circles: `(cx − 0.4·rx, y − 0.72)` r `0.248·rx`; `(cx + 0.15·rx, y − 2.88)` r `0.310·rx`;
  `(cx + 0.6·rx, y)` r `0.187·rx`. The vertical offsets are fixed, the radii scale with the width.

An OVC lid is a rect from `x −4` to `140`, from `y − 2.88` to the foot, with five circles r 7.92 on its top edge at
`x` 10.88, 35.36, 62.56, 89.76, 116.96.

Colour: a layer at 6,500 ft or above is `--panel` (a step further away); below it, `--raised`. The cut is the
low/mid cloud boundary in the international cloud atlas — see *Resolved decisions*. VV (vertical visibility) and
layers with no base are not drawn. CLR/SKC draws no layer.

`observation.js` must expose the layers as data: `cloudLayers: [{ baseFeet, cover }]`, sorted high to low, in
addition to (then instead of) the `clouds` sentence, which nothing reads once the header renders the layers itself.

### Wind plaque

Label, then the plot (88×88, centred), then the speed (`22 kt`, 22 px display with the unit at 12 px, in the
sustained force's colour), then the direction line at 11 px `--ink`: `from WNW`, and ` · G 31` with the gust in the
gust force's colour.

The plot, in the 88 viewBox, centre `(44, 44)`:

- Compass ring r 38, `--raised`, stroke 2. Cardinal letters N E S W at 8 px `--muted`, anchored middle, at
  `(44, 11)`, `(81, 47)`, `(44, 84)`, `(7, 47)`.
- Station circle r 3.6, stroke 2.4, no fill, in the sustained colour.
- Calm: a second ring r 7.92, same stroke and colour (the station-model calm symbol); no shaft. Speed reads `calm`
  in force 0's colour and the direction line reads `no direction` in `--muted`.
- Shaft from r 3.6 to r 30 along the bearing the wind comes from, stroke 2.76, round caps, sustained colour.
  Screen bearing: `(44 + r·sin θ, 44 − r·cos θ)` for `θ` the meteorological direction in radians.
- Speed rounds to the nearest 5 kt: pennants of 50, full barbs of 10, a half barb of 5.
- Marks sit on the shaft from the tip inward at 4.5-unit steps. A full barb is a 12.6-long line from the shaft at 60°
  from the shaft direction, on the right looking out from the station along the shaft, leaning toward the tip end.
  A half barb is 6.3 long. A lone half barb (5 kt) sits one step back from the tip, at r 25.5. A pennant is a filled
  triangle: base 5.85 along the shaft from the tip inward, apex 12.6 out at the same 60°; the next mark after a
  pennant sits 7.65 from the tip.
- Sustained barbs are stroke 2.76; every mark is the sustained colour.
- Gust: draw the gust's marks first, stroke 2.4 in the gust colour, at the same slots, with no shaft of its own; then
  the sustained marks on top. What shows past the sustained barbs is the gust.

Worked cases from the artboard: NE 8 → 10 kt, one full barb at the tip. SSW 15, full at the tip and half at 4.5 back.
WNW 22 G 31: three force-7 barbs behind, two force-6 barbs in front. N 38 → 40, four full barbs at 0, 4.5, 9, 13.5.
S 55 G 65: pennant plus one half (sustained) over pennant plus one full plus one half (gust).

Bearing needs degrees. `wind.js` keeps the cardinal `direction` for text and adds `bearingDegrees` when the station
sent a number. A variable or missing bearing draws the station circle and lays the marks out on a notional vertical
with no shaft drawn, and the direction line reads `variable` or `no direction` in `--muted` — see *Resolved
decisions*. An unreported wind draws the ring alone, speed `—`, direction line `unreported` in `--muted`.

### Pressure plaque

Label, then the arc (112×76, centred), then the reading (`1019.1`, 22 px display, `--ink`), then the trend row at
11 px `--ink`: a 10×10 glyph and `+1.5 / 3h`.

The arc, centre `(56, 56)`, in the 112×76 viewBox:

- Half-circle r 44 from `(12, 56)` to `(100, 56)`, `--raised`, stroke 8, round caps.
- Five ticks at 0, 25, 50, 75, 100 % from r 39 to r 49, `--muted`, stroke 1.5.
- Scale 980 to 1050 hPa, left to right, clamped. Needle from the centre to r 38.7 at
  `angle = π · (1 − (hPa − 980) / 70)`, `--ink`, stroke 3, round cap; hub circle r 4.5 `--ink`.
- Labels `980` at `(6, 73)` start-anchored and `1050` at `(106, 73)` end-anchored, 9 px `--muted`.

The trend glyph is the view's one hot element, filled `--accent`: rising a triangle apex up
(`5,1 9.5,8.5 0.5,8.5`), falling the same apex down, steady a dash 9 wide and 2 tall centred in the 10 box. When the
newest observation carries no sea-level pressure (a SPECI), the needle and hub are not drawn and the reading is `—`;
the trend row still renders, as shipped.

## Toolbar button

The face is drawn in a 64-unit square and scaled, as shipped. Two Kit chrome values are fixed in both schemes and are
not `light-dark()` tokens: the toolbar-field indigo `#03083f` and the chrome text `#e6e8ff`.

- Chip: rect 64×64, rx 9.6 (the shipped 0.15), filled `#03083f`.
- Comfort band: the bottom 14 units (`y` 50 to 64), filled with the band's `background`, following the chip's bottom
  corners. The shipped flood fill of the whole chip goes.
- Trend, cut into the band in the chip colour `#03083f`: rising a triangle apex `(32, 52.5)`, base `(24, 61.5)` to
  `(40, 61.5)`; falling the mirror, apex `(32, 61.5)`, base at `y` 52.5; steady a rect from `(24, 55)` to `(40, 59)`.
  The steady dash keeps the shipped 0.4545 height ratio to the triangles; it is not on the artboard.
- Reading: the dewpoint numerals, bold 34-unit `system-ui`, centred at `(32, 25)`, filled `#e6e8ff`. Three characters
  shrink by the shipped `readingEm` rule.
- The trend stays in the band in both layouts. The shipped corner mark and `WIND_LAYOUT` go with the windsock.

When the wind is notable (`isNotable`, unchanged: sustained ≥ 15 kt or any gust), the numerals give way to the dart.
The comfort band and the trend stay, so the dewpoint is still read from the colour.

The dart, a compass needle's pointer, about the plot centre `(32, 25)`, for `θ` the **downwind** bearing
(`fromDegrees + 180`) with `forward = (sin θ, −cos θ)` and `right = (cos θ, sin θ)`:

```js
// Tip, right wing, tail notch, left wing. A notched tail with no shaft reads as a needle, not an arrow.
const DART = { notch: 7, tip: 16, wingBack: 14, wingOut: 13 }
```

- Tip at `centre + 16·forward`; wings at `centre − 14·forward ± 13·right`; notch at `centre − 7·forward`.
- Filled and stroked in the same colour, stroke 2 with round joins (`lineJoin = 'round'`, width `2 · size / 64`).
- Worst-case reach is 19.1 to a vertex (20.1 with the stroke) against 25 to the top edge and to the band.

Checked: SSW 15 → `38.12,10.22 38.65,42.91 29.32,31.47 14.63,32.96`; S 55 → `32,9 45,39 32,32 19,39`.

Colour: `beaufortForce(announcedKnots(wind))`, dark hex. Samples: SSW 15 → force 4 `#6cf640`; WNW 22 G 31 (gust +9)
→ force 6 `#dcf59d`; W 18 G 32 (gust +14) → force 7 `#f5f69c`; S 55 G 65 (gust +10, not more) → force 10 `#f69c6e`.

The tooltip is unchanged. `docs/icon-preview.js` replaces its sock-lift ladder with cases on both sides of the
notable threshold, both sides of the 10 kt gust margin, and the sixteen bearings.

## Light scheme

Nothing in the layout changes. Every Beaufort colour the popup writes is the `light-dark()` pair from
`beaufortColour`, so the ramp follows the scheme. The button's face is `#03083f` in both schemes and takes the dark
ramp. Chrome's auto-dark inverted the local preview, so the light artboard was checked by construction and by the
numbers; the first real look is the implementation's.

## Unavailable states

`renderUnavailable` keeps its contract inside the new layout: every reading is `—`, the comfort chip is hidden, the
wind and cloud plots draw their grounds only (ring; dashed base omitted), the barometer draws no needle, the thunder
plaque is hidden, and the footer states the reason. The button's unavailable path is unchanged (plain icon, reason
in the title).

## Modules

New, all pure and tested at the module boundary:

| Module               | Exports                                               | Consumers                        |
| -------------------- | ----------------------------------------------------- | -------------------------------- |
| `src/beaufort.js`    | `BEAUFORT`, `beaufortForce`, `beaufortColour`         | `popup.js`, `button-icon.js`     |
| `src/wind-barbs.js`  | `windBarbs({ bearingDegrees, gustKnots, knots })` → marks in the 88-unit plot | `popup.js`                       |
| `src/wind-dart.js`   | `dartPoints({ centre, fromDegrees, scale })` → four points | `button-icon.js`                 |
| `src/cloud-sky.js`   | `cloudSky({ baseFeet, layers })` → shapes in the 136×112 plot | `popup.js`                       |

Changed:

- `src/wind.js` — `bearingDegrees` on a measured wind; `announcedKnots`.
- `src/observation.js` — `cloudLayers` as data; the `clouds` sentence goes once nothing reads it.
- `src/popup.html`, `src/ui.css`, `src/popup.js` — the layout above. `SELECTORS` stays the one list of ids.
- `src/button-icon.js` — band, notch, dart; the sock, `WIND_LAYOUT`, and the corner trend go.
- `src/windsock.js`, `test/windsock.test.js` — deleted.
- `README.md` — the button and popup sections. `CHANGELOG.md` — the `[Unreleased]` windsock entries are rewritten,
  not marked removed: they never shipped.

The barometer's needle angle is three lines and lives in `popup.js`.

## Testing

- `beaufort.test.js` — every threshold edge (0, 1, 3, 4, 63, 64); the colour string shape.
- `wind.test.js` — `announcedKnots` at gust +10 (sustained) and +11 (gust); no gust; `bearingDegrees` present only
  for a numeric `wdir`.
- `wind-barbs.test.js` — the worked cases above, read back as points with a tolerance of 0.01; barbs on the right;
  the lone half barb one step back; pennant slot spacing; gust marks precede sustained marks.
- `cloud-sky.test.js` — the scale at the checked heights; puff counts and widths per cover; layers ordered high to
  low; OVC lid; clamp at 30,000.
- `wind-dart.test.js` — the two checked polygons; reach under 20.1 for all sixteen bearings.
- `button-icon.test.js` — the recording context gains `stroke`, `lineJoin`, `lineWidth`; asserts the band, the notch
  per trend, the numerals when calm, the dart and its colour when notable, and the four colour-rule samples.
- `popup.test.js` — jsdom reads back the SVG points and inline colours; the unavailable path; the header's cloud
  line ordering and separators.

## Resolved decisions

Settled 2026-09-03, before the implementation plan was written. Each was put to the user and each took the
recommendation the design pass had made.

1. **High-cloud colour threshold: 6,500 ft.** The low/mid boundary in the international cloud atlas. A layer at or
   above it paints `--panel`, below it `--raised`. The artboard agrees: 12,000 ft far, 4,500 ft near. Two of the
   atlas's three tiers collapse into one colour; a third tone was rejected as too much for a 112 px plaque.
2. **Notable wind with no bearing: a force-colour ring on the button, shaftless barbs on the panel.** The button
   draws a ring about the plot centre, r 10, stroke 6, in the force colour — speed with no heading claimed. The panel
   lays its marks out on a notional vertical and draws no shaft; the missing shaft is the signal, and the direction
   line reads `variable` or `no direction` in `--muted` beside it.
3. **Dart sense: downwind, unchanged.** The button follows the map convention and the panel's barbs keep the
   station-model one. The split is deliberate. Revisit only if it grates on a real toolbar.
4. **16 px legibility: deferred to the verification bean.** Implement the dart as specified. Bean
   firefox-weather-button-4q55 (controlled-environment testing) covers the real-toolbar look after 0.3.0 lands.

## Code rules

> These rules outrank this plan. Where a code sample above contradicts one, follow the rule and say so in your report.

```text
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

- readability over writability — hard thinking at write-time makes reading cheap
- simple (cheap to reason about) over easy (cheap to write)
- minimize accidental complexity; spend the budget on the problem itself
- structure every unit to fit in working memory: small, labeled, composable pieces
- fix small messes before they rot

## Functions

- one concept per function; do exactly what the name says — a name that feels dumb to type means it shouldn't be a function
- build a vocabulary of small, composable functions
- aim short; split over ~20 lines or high cognitive complexity — never split a single concept to hit a number
- entry points (`main`, scripts) may stay long once pure logic is factored out — locality wins there
- ≤3 heterogeneous positional params (hard max 4); beyond that, named/keyword args
- explicit inputs and outputs over hidden state mutation

## Control flow & shape

- flatten: guard clauses / early returns; isolate unavoidably deep logic in its own function
- short conditionals; never mix `&&` and `||` in one test — extract or split
- declarative over imperative; `map`/`filter`/`reduce` (pure) over `forEach`/loops (side-effecting)
- break long call/method chains into well-named intermediates
- familiar, consistent patterns over exotic syntax/sugar (least surprise)

## State & effects

- treat data as immutable — mutate during construction, then freeze
- no action-at-a-distance: no global mutable state; behavior readable locally
- isolate side effects (I/O) at the edges; keep core logic pure
- declare near first use, minimize liveness span; no long-lived cross-function mutable vars (use an object or refactor)
- acquire returns release: `open`/`attach`/`subscribe`/`lock` hands back its own undo — no "am I open" flag to keep in sync

## Naming

- name by purpose — never `value`, `data`, `temp`
- functions are verbs, variables nouns, collections plural; single letters only in tight iteration
- visually distinct names (no `i`/`j`, `item`/`items` pairs); never shadow
- descriptive names don't excuse bad design; over-long names are bloat too
- alphabetize wherever order is otherwise arbitrary

## Abstractions

- abstractions must be lawful — obey what they imply (consistent equality, no surprising special cases); a leaky or misleading one
  explodes cognitive load, a lawful one reduces it

## Errors

- never pass silently, unless explicitly silenced
- throw to let the caller decide — don't swallow at the point of occurrence
- catch only the specific condition you can handle; re-throw the rest
- an essential missing value throws — never returns empty/`undefined`

## Comments & docs

- comment the *why*; a needed "what" means unclear code — clarify first (hard math/algorithms/perf excepted)
- comment the non-obvious: what a reader would ask, what you had to re-derive, non-specific catches, unrefactored hacks
- staleness-fear doesn't excuse omission — names go stale too; prefer assertions over comments documenting assumptions
- colocate docs with what they describe; read nearby commentary before editing
- cite what a URL is *for*; mark workarounds with removal criteria; flag cross-file coupling on both sides
- generate API docs from source, never hand-maintain a parallel copy; tests are documentation

## Testing

- CLAUDE.md holds the strategy (test-first, regression tests, mock boundaries); code-level additions below
- a bug signals excess complexity — fix the root cause and structure, not just the symptom
- set up mocks/spies in the test that uses them (locality over DRY)

## Hygiene

- no dead or vestigial code (unused imports, params, variables)
- no stray debug output in committed code (`console.log`, `print`); error logging is fine
- LF line endings

## Tooling

- the formatter owns formatting; if it's wrong, fix the config, not the file
- a suppression names its one rule and states the invariant that earns it — narrowest scope; never bare, never file-wide where a line does
- the same rule suppressed everywhere = wrong rule for the project — off in config, once, with the reason
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

--- markdown.md ---
# Markdown style

markdownlint enforces most of this, once a repo has a `.markdownlint-cli2.jsonc`, and `--fix` takes most of what it finds
(run it twice — one pass is not a fixpoint). Deliberately *not* oxfmt, though it reads markdown: it reformats the code
inside a fence, which restyles dated design records and agent-written `.beans/` issues. What no tool decides for you is
the line length, whether a fence has a language, and whether the link text says anything.

- 140-char line limit; exempt code blocks, tables, and unbreakable tokens (long URLs, link refs)
- ATX headers (`#`), never Setext (`===`/`---`); one H1 per doc; don't skip levels
- blank line around headers, lists, code blocks, and tables
- fenced code blocks (```` ``` ````), always language-tagged; never indented blocks
- `-` for unordered lists; `1.` lazy numbering for ordered (let the renderer count)
- descriptive link text, never "click here"; no bare URLs — wrap in `<...>` or a link
- reference-style links when a URL repeats or inline would blow the line limit
- no trailing whitespace; single trailing newline; no consecutive blank lines
- tables only when data is genuinely tabular; pad the cells to a common width — MD060 expects it and `--fix` writes it,
  so hand-trimmed cells are the thing that drifts
- comment the *why* for non-obvious structure via HTML comments (`<!-- -->`)

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
