// The station-model wind plot the panel's wind plaque draws, in the 88-unit box the artboard
// used. WMO No. 306 and FMH-1: the shaft points toward where the wind comes from, the marks sit
// on the right looking out along it (northern hemisphere), and the speed is rounded to 5 kt —
// a half barb is 5, a full barb 10, a pennant 50.
const PLOT = { centre: { x: 44, y: 44 }, hubRadius: 3.6, tipRadius: 30 }

// Marks lean toward the tip at 60 degrees off the shaft, which is what keeps four full barbs
// from reading as a comb: at a right angle the shaft disappears between them.
const BARB_ANGLE = Math.PI / 3
const BARB_LENGTH = 12.6
const HALF_BARB_LENGTH = 6.3

const KNOTS_PER_BARB = 10
const KNOTS_PER_HALF_BARB = 5
const KNOTS_PER_PENNANT = 50

// A pennant's base eats more of the shaft than a barb's root does, so the mark after one starts
// further in than one slot.
const PENNANT_BASE = 5.85
const PENNANT_STEP = 7.65
const SLOT_STEP = 4.5

// A wind with no bearing is laid out on a vertical and drawn with no shaft: the marks report the
// speed and the missing shaft is what says the heading was never reported. Drawing them on some
// arbitrary heading instead would read as a north wind, which is a claim the station did not make.
const UPRIGHT_DEGREES = 0

const radians = degrees => (degrees * Math.PI) / 180

const axes = bearingDegrees => {
    const heading = radians(bearingDegrees ?? UPRIGHT_DEGREES)
    const out = { x: Math.sin(heading), y: -Math.cos(heading) }
    // Screen right of `out`, with y running down the plot.
    return { out, right: { x: -out.y, y: out.x } }
}

const at = ({ out, radius }) => ({ x: PLOT.centre.x + radius * out.x, y: PLOT.centre.y + radius * out.y })

// Counts rather than a walk down the knots: the scale is 50, then 10, then 5, and the remainder
// after each is what the next mark counts. The 5 kt rounding is the model's own rule.
const tally = knots => {
    const rounded = Math.round(knots / KNOTS_PER_HALF_BARB) * KNOTS_PER_HALF_BARB
    return {
        barbs: Math.floor((rounded % KNOTS_PER_PENNANT) / KNOTS_PER_BARB),
        halves: Math.floor((rounded % KNOTS_PER_BARB) / KNOTS_PER_HALF_BARB),
        pennants: Math.floor(rounded / KNOTS_PER_PENNANT),
    }
}

// How far in from the tip each mark starts, walked outermost-first in the order the model draws
// them. A lone half barb is the one special case: on the tip it reads as a fletching that fell
// off the end of the shaft, so it starts one slot in.
const slots = ({ barbs, halves, pennants }) => {
    const kinds = [...Array(pennants).fill('pennant'), ...Array(barbs).fill('barb'), ...Array(halves).fill('half')]
    const start = pennants + barbs === 0 ? SLOT_STEP : 0

    return kinds.reduce(
        ({ offset, placed }, kind) => ({
            offset: offset + (kind === 'pennant' ? PENNANT_STEP : SLOT_STEP),
            placed: [...placed, { kind, offset }],
        }),
        { offset: start, placed: [] },
    ).placed
}

const marksFor = ({ bearingDegrees, gust, knots }) => {
    const { out, right } = axes(bearingDegrees)

    const outward = ({ from, length }) => ({
        x: from.x + length * (Math.cos(BARB_ANGLE) * out.x + Math.sin(BARB_ANGLE) * right.x),
        y: from.y + length * (Math.cos(BARB_ANGLE) * out.y + Math.sin(BARB_ANGLE) * right.y),
    })

    const barb = ({ length, offset }) => {
        const root = at({ out, radius: PLOT.tipRadius - offset })
        return { filled: false, gust, points: [root, outward({ from: root, length })] }
    }

    const pennant = offset => {
        const outer = at({ out, radius: PLOT.tipRadius - offset })
        return {
            filled: true,
            gust,
            points: [outer, outward({ from: outer, length: BARB_LENGTH }), at({ out, radius: PLOT.tipRadius - offset - PENNANT_BASE })],
        }
    }

    const draw = {
        barb: offset => barb({ length: BARB_LENGTH, offset }),
        half: offset => barb({ length: HALF_BARB_LENGTH, offset }),
        pennant,
    }

    return slots(tally(knots)).map(({ kind, offset }) => draw[kind](offset))
}

// The shaft and the marks of one wind, as points, so the popup emits SVG and a jsdom test can
// read the same numbers back. Colour is not decided here: the plaque paints the sustained marks
// in the sustained force's colour and the gust's in the gust force's, and the two rules live
// beside each other in popup.js rather than being split across this boundary.
export const windBarbs = ({ bearingDegrees, gustKnots, knots }) => {
    const { out } = axes(bearingDegrees)
    const gustMarks = gustKnots === undefined ? [] : marksFor({ bearingDegrees, gust: true, knots: gustKnots })

    return {
        marks: [...gustMarks, ...marksFor({ bearingDegrees, gust: false, knots })],
        ...(bearingDegrees === undefined
            ? {}
            : { shaft: { from: at({ out, radius: PLOT.hubRadius }), to: at({ out, radius: PLOT.tipRadius }) } }),
    }
}
