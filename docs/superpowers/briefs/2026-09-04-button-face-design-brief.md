# Claude Design handoff — the 0.4.0 toolbar button face

Paste everything below the line into a fresh session.

---

Design the face of a Firefox toolbar button icon. Use the `design` skill and give me a canvas of
artboards I can compare side by side. I want to settle one open question by looking at it rather
than by reasoning about it.

## ARTIFACT

- **Type:** icon mockups — one artboard per case, on a comparison canvas
- **Format:** each face is a 64×64-unit square (the artboard unit the existing code draws in);
  show every mockup three ways — at 16 device pixels 1:1, at 32 device pixels 1:1, and magnified
  8× beside them. The 16 px rendering is the only one that decides anything; the magnification is
  for reading what went wrong.
- **Destination:** handoff to Claude Code. The geometry is transcribed into a canvas-drawing
  module, so express positions in the 64-unit face, not in pixels or percentages.

## AUDIENCE + JOB

- **For:** one person, who reads this button in his own Firefox toolbar dozens of times a day at
  16 px, and who reads station-model weather plots for pleasure. Not a general audience.
- **It must make them:** know the temperature, know how the dewpoint feels, and know where the
  wind is from and how hard — in a glance, without opening anything.
- **Single takeaway:** "It's 72, it's sticky, and the wind's up from the southwest."

## WHAT IS ALREADY DECIDED — do not redesign these

- The chip is Kit Developer Edition's toolbar indigo `#03083f`, 64-unit square, corner radius 9.6.
  The toolbar does not follow the page colour scheme, so there is one fixed palette, not a pair.
- The **temperature** in figures is the reading on the face. It replaces the dewpoint figure the
  shipped button carried, which is not a number anyone acts on.
- Those figures sit on a **disc filled with the dewpoint comfort colour**, centred on the face.
  Geometry separates the two colour systems: the disc is always comfort, the ring is always wind.
- The figures are drawn in the comfort chart's own computed ink (black or white per band, listed
  below) — those were contrast-checked against each band already.
- A **ring around the disc** carries the wind: its colour is the Beaufort force colour, and it
  shows the bearing.
- The **pressure trend leaves the face**. It is hard to read at this size and it is on the popup.
  Do not put it back unless a direction genuinely earns it, and say so if you do.

## THE OPEN QUESTION — this is what the mockups are for

**How does the ring say which way the wind is blowing?** Three candidates; show all three, and a
fourth of your own if you have one:

1. **Thick sweep over a thin ring** — the full circle drawn thin, a ~90° arc centred on the
   bearing drawn heavy.
2. **A gap in a complete ring** — the ring heavy all the way round except a wedge at the bearing.
   Direction as negative space, the way a compass rose opens toward its point.
3. **A bead on the ring** — an evenly drawn ring with a single blob sitting on it at the bearing.

The arithmetic that constrains this, at 16 device pixels with the ring at radius 26 of the
64-unit face: the ring is about 41 px of circumference, so a 90° arc is ~10 px of arc and a bead
is about 2×2 px. A previous version of this button failed at about 4×2 device pixels — the mark
was visibly present but its direction could not be read. Treat that as the floor.

## ALSO SETTLE, in the same canvas

- **Sense.** Does the mark point at where the wind comes from (upwind — the station-model
  convention, which the popup's wind plot uses) or where it is going (downwind — the map
  convention, which the retired button used)? Draw one case both ways.
- **A wind with a speed but no heading.** Stations report `VRB` for genuinely variable wind. The
  ring must report the force and claim no heading. What does it look like?
- **Calm, and unreported.** Calm air is a positive report; unreported means nobody measured. They
  must not look the same, and neither should look like a wind.
- **Light wind.** Every wind gets a ring now, not only a notable one — so force 1 has to be quiet
  enough not to nag. Show force 1 and force 10 side by side.
- **Three characters.** `-12` and `100` both happen. Does the disc hold them, or does the type
  shrink? Show it.

## CONTENT — draw these exact cases

Written as temperature °F / dewpoint °F / wind, from the project's own case list:

| Temp | Dewpoint | Wind | What it tests |
| --- | --- | --- | --- |
| 55 | 48 | nothing measured | no ring at all |
| 61 | 53 | calm (measured, 0 kt) | calm is not absence |
| 66 | 58 | from 40°, 14 kt | an ordinary light wind |
| 71 | 63 | from 202.5°, 15 kt | SSW, force 4 |
| 74 | 63 | from 292.5°, 22 kt gusting 31 | gust 9 over — the sustained wind keeps the colour |
| 79 | 68 | from 270°, 18 kt gusting 32 | gust 14 over — the gust takes the colour |
| 84 | 73 | from 180°, 55 kt gusting 65 | the top of the ramp |
| 86 | 78 | variable, 6 kt gusting 21 | a gust on a wind with no heading |
| 10 | -4 | from 20°, 8 kt | subfreezing, two characters |
| -3 | -12 | nothing measured | three characters |
| 104 | 100 | from 160°, 4 kt | three characters, no minus |

Then a **compass sweep**: the same reading (72°F, 60°F dewpoint, 20 kt) at all sixteen compass
points, 22.5° apart, in one row. Whichever mark wins has to survive that sweep without any two
neighbouring points looking identical.

## PALETTE — use these hexes only, no others

**Dewpoint comfort — the disc fill, and the ink for the figures on it:**

| Below °F | Fill | Ink | Band |
| --- | --- | --- | --- |
| 50 | `#DAEEF3` | `#000000` | dry |
| 56 | `#CCFFCC` | `#000000` | pleasant |
| 61 | `#008000` | `#FFFFFF` | comfortable |
| 66 | `#FFFF00` | `#000000` | sticky |
| 71 | `#FF6600` | `#000000` | uncomfortable |
| 76 | `#FF0000` | `#000000` | oppressive |
| above | `#C0504D` | `#FFFFFF` | miserable |

**Beaufort force — the ring.** Force 0 to 12, thresholds in knots, exclusive upper bound:

`0` <1 kt `#129bf7` calm · `1` <4 `#6cc8f7` · `2` <7 `#7dcabf` · `3` <11 `#13dd14` ·
`4` <17 `#6cf640` · `5` <22 `#c8f640` · `6` <28 `#dcf59d` · `7` <34 `#f5f69c` ·
`8` <41 `#f1d860` · `9` <48 `#f6be15` · `10` <56 `#f69c6e` · `11` <64 `#f66d15` ·
`12` above `#f05a2a` hurricane

The ring takes the force of the **sustained** wind, unless the gust is **more than 10 kt** over
the sustained speed, in which case it takes the gust's force. That rule is already settled — the
question is only whether the face should *show* which of the two it is reading, or just take the
colour silently.

**Chip:** `#03083f` indigo. **Chrome ink (if you need it):** `#e6e8ff`.

## FEEL

Instrument, not weather app. It should read like a gauge on a panel: legible first, decorative
never. **Not** cute, **not** skeuomorphic, **not** a sun-behind-a-cloud pictogram, and **not** a
gradient anywhere.

## NON-NEGOTIABLES

- Nothing on the face but the disc, the ring, and up to three characters of temperature.
- Two colour systems and no third. Every colour on the face comes from the tables above.
- The face must survive being clipped to a rounded square — the ring cannot rely on space the
  corner radius eats.
- One stroke weight for the ring's heavy state and one for its light state. Not four.
- Legible at 16 device pixels is the bar. A mockup that only works at 32 has failed.

## SELF-AUDIT BEFORE PRESENTING

Render every direction at 16 px and look at it before showing me. Check: the figures are readable
at that size; the ring's direction cue is unambiguous at that size; no two adjacent compass points
render identically; the disc and ring colours do not collide for the sticky/near-gale pairing
(`#FFFF00` disc against a `#f5f69c` ring) or the oppressive/hurricane one (`#FF0000` against
`#f05a2a`); calm, variable, and unreported are three visibly different states.

Say which pairings failed rather than quietly adjusting a hex — the two charts are fixed, so a
collision is a geometry problem to solve, not a colour to change.

## DELIVERY

Three distinct directions, not three variations on one, each with a sentence on what it optimises
for. Then your recommendation and why. I will pick one, and it goes back to Claude Code as
geometry in 64-unit coordinates.
