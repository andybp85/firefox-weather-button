// Generates the design-canvas artboards for the 0.4.0 button face from one shared drawing
// routine, so the four directions differ only in how the ring says the bearing. Run with
// `node build.mjs`; it writes the *.dc.html files and canvas.json beside itself.
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

// Kit's toolbar (rgba(18,24,103,.9) over the frame rgb(23,27,92)), flattened. The faces sit on
// it so the ring's outer edge is judged against what it really sits on.
const TOOLBAR = '#131866'
const INK = '#d9ddf6'
const MUTED = '#8a92cf'
const DISPLAY_FONT = "'Arial Rounded MT Bold', 'Avenir Next', 'Trebuchet MS', sans-serif"
const BODY_FONT = "'Avenir Next', 'Avenir', system-ui, -apple-system, sans-serif"

// Shared drawing code, embedded verbatim in every artboard's logic. Geometry is in the 64-unit
// face; `unit` scales it to the edge being painted, exactly as src/button-icon.js does.
const DRAW = String.raw`

const FACE = 64
const CENTRE = 32
const CHIP = '#03083f'
const CORNER = 9.6
const FONT = 'system-ui, sans-serif'

const COMFORT = [
    [50, '#DAEEF3', '#000000'],
    [56, '#CCFFCC', '#000000'],
    [61, '#008000', '#FFFFFF'],
    [66, '#FFFF00', '#000000'],
    [71, '#FF6600', '#000000'],
    [76, '#FF0000', '#000000'],
    [Infinity, '#C0504D', '#FFFFFF'],
]
const comfort = dew => {
    for (const [below, fill, ink] of COMFORT) if (dew < below) return { fill, ink }
}

const BEAUFORT = [
    [1, '#129bf7'], [4, '#6cc8f7'], [7, '#7dcabf'], [11, '#13dd14'], [17, '#6cf640'],
    [22, '#c8f640'], [28, '#dcf59d'], [34, '#f5f69c'], [41, '#f1d860'], [48, '#f6be15'],
    [56, '#f69c6e'], [64, '#f66d15'], [Infinity, '#f05a2a'],
]
const beaufort = knots => {
    for (const [below, colour] of BEAUFORT) if (knots < below) return colour
}
const GUST_MARGIN = 10
const announced = wind => (wind.gust !== undefined && wind.gust - wind.knots > GUST_MARGIN ? wind.gust : wind.knots)

const radians = degrees => ((degrees - 90) * Math.PI) / 180

const fullCircle = (ctx, r, width, colour, unit) => {
    ctx.strokeStyle = colour
    ctx.lineWidth = width * unit
    ctx.lineCap = 'butt'
    ctx.beginPath()
    ctx.arc(CENTRE * unit, CENTRE * unit, r * unit, 0, 2 * Math.PI)
    ctx.stroke()
}

const arc = (ctx, r, width, colour, unit, fromDegrees, toDegrees) => {
    ctx.strokeStyle = colour
    ctx.lineWidth = width * unit
    ctx.lineCap = 'butt'
    ctx.beginPath()
    ctx.arc(CENTRE * unit, CENTRE * unit, r * unit, radians(fromDegrees), radians(toDegrees))
    ctx.stroke()
}

// The four candidate marks. Each takes the mark's screen bearing (already flipped for sense).
const MARKS = {
    sweep: (ctx, g, colour, unit, at) => {
        fullCircle(ctx, g.ring, g.light, colour, unit)
        arc(ctx, g.ring, g.heavy, colour, unit, at - g.sweep / 2, at + g.sweep / 2)
    },
    gap: (ctx, g, colour, unit, at) => {
        arc(ctx, g.ring, g.heavy, colour, unit, at + g.gap / 2, at - g.gap / 2 + 360)
    },
    bead: (ctx, g, colour, unit, at) => {
        fullCircle(ctx, g.ring, g.light, colour, unit)
        const a = radians(at)
        ctx.fillStyle = colour
        ctx.beginPath()
        ctx.arc((CENTRE + g.ring * Math.cos(a)) * unit, (CENTRE + g.ring * Math.sin(a)) * unit, (g.bead / 2) * unit, 0, 2 * Math.PI)
        ctx.fill()
    },
    crescent: (ctx, g, colour, unit, at) => {
        // Outer circle centred; inner circle pushed away from the bearing, so the ring is
        // 'heavy' thick at the bearing and 'light' thick opposite, with no ends to alias.
        const outer = g.ring + g.heavy / 2
        const inner = outer - (g.heavy + g.light) / 2
        const shift = (g.heavy - g.light) / 2
        const a = radians(at)
        ctx.fillStyle = colour
        ctx.beginPath()
        ctx.arc(CENTRE * unit, CENTRE * unit, outer * unit, 0, 2 * Math.PI)
        ctx.arc((CENTRE - shift * Math.cos(a)) * unit, (CENTRE - shift * Math.sin(a)) * unit, inner * unit, 0, 2 * Math.PI, true)
        ctx.fill('evenodd')
    },
}

// Paints one face. reading is { temp, dew, wind } where wind is null when nothing was
// measured, { knots: 0 } for calm, and has no bearing for VRB.
const drawFace = ({ ctx, size, reading, g, mark, sense }) => {
    const unit = size / FACE
    const { fill, ink } = comfort(reading.dew)
    ctx.clearRect(0, 0, size, size)
    ctx.fillStyle = CHIP
    ctx.beginPath()
    ctx.roundRect(0, 0, size, size, CORNER * unit)
    ctx.fill()

    const disc = g.ring - g.heavy / 2 - g.moat
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.arc(CENTRE * unit, CENTRE * unit, disc * unit, 0, 2 * Math.PI)
    ctx.fill()

    const text = String(reading.temp)
    const em = text.length <= 2 ? g.em : (g.em * 2) / text.length
    ctx.fillStyle = ink
    ctx.font = 'bold ' + em * unit + 'px ' + FONT
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, CENTRE * unit, (CENTRE + g.baseline) * unit)

    const wind = reading.wind
    if (wind === null) return
    const colour = beaufort(announced(wind))
    if (wind.knots < 1) return fullCircle(ctx, g.ring, g.light, colour, unit)
    if (wind.bearing === undefined) return fullCircle(ctx, g.ring, g.heavy, colour, unit)
    const at = sense === 'downwind' ? wind.bearing + 180 : wind.bearing
    MARKS[mark](ctx, g, colour, unit, at)
}

const paintAll = ({ readings, g, mark, sense }) => {
    for (const canvas of document.querySelectorAll('canvas[data-face]')) {
        const reading = readings[Number(canvas.dataset.face)]
        const size = Number(canvas.width)
        drawFace({ ctx: canvas.getContext('2d'), size, reading, g, mark: canvas.dataset.mark || mark, sense: canvas.dataset.sense || sense })
    }
}
`

const wind = (bearing, knots, gust) => ({ bearing, gust, knots })
const vrb = (knots, gust) => ({ gust, knots })

// The brief's case list, plus the pairs it asks for beside it.
const CASES = [
    { dew: 48, label: '55 · 48 · nothing measured', temp: 55, tests: 'no ring at all', wind: null },
    { dew: 53, label: '61 · 53 · calm, 0 kt', temp: 61, tests: 'calm is not absence', wind: wind(210, 0) },
    { dew: 58, label: '66 · 58 · from 40°, 14 kt', temp: 66, tests: 'an ordinary light wind, force 4', wind: wind(40, 14) },
    { dew: 63, label: '71 · 63 · from 202.5°, 15 kt', temp: 71, tests: 'SSW, force 4', wind: wind(202.5, 15) },
    {
        dew: 63,
        label: '74 · 63 · from 292.5°, 22 g 31',
        temp: 74,
        tests: 'gust 9 over: sustained keeps the colour',
        wind: wind(292.5, 22, 31),
    },
    { dew: 68, label: '79 · 68 · from 270°, 18 g 32', temp: 79, tests: 'gust 14 over: the gust takes the colour', wind: wind(270, 18, 32) },
    { dew: 73, label: '84 · 73 · from 180°, 55 g 65', temp: 84, tests: 'the top of the ramp', wind: wind(180, 55, 65) },
    { dew: 78, label: '86 · 78 · variable, 6 g 21', temp: 86, tests: 'a gust on a wind with no heading', wind: vrb(6, 21) },
    { dew: -4, label: '10 · −4 · from 20°, 8 kt', temp: 10, tests: 'subfreezing, two characters', wind: wind(20, 8) },
    { dew: -12, label: '−3 · −12 · nothing measured', temp: -3, tests: 'three characters', wind: null },
    { dew: 100, label: '104 · 100 · from 160°, 4 kt', temp: 104, tests: 'three characters, no minus', wind: wind(160, 4) },
    { dew: 60, label: '72 · 60 · from 40°, 3 kt', temp: 72, tests: 'force 1 — must not nag', wind: wind(40, 3) },
    { dew: 60, label: '72 · 60 · from 40°, 50 kt', temp: 72, tests: 'force 10, beside force 1', wind: wind(40, 50) },
    { dew: 63, label: '72 · 63 · from 40°, 30 kt', temp: 72, tests: 'collision check: sticky disc, force 7 ring', wind: wind(40, 30) },
    {
        dew: 73,
        label: '88 · 73 · from 40°, 70 kt',
        temp: 88,
        tests: 'collision check: oppressive disc, hurricane ring',
        wind: wind(40, 70),
    },
]

const POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
const SWEEP = POINTS.map((point, step) => ({
    dew: 60,
    label: point + ' · ' + step * 22.5 + '°',
    temp: 72,
    tests: '',
    wind: wind(step * 22.5, 20),
}))

const KEY = {
    dew: 60,
    label: '72 · 60 · from 225°, 20 kt',
    temp: 72,
    tests: 'the takeaway case: sticky-ish, SW, force 5',
    wind: wind(225, 20),
}
const SENSE_CASE = { dew: 63, label: '71 · 63 · from 202.5°, 15 kt', temp: 71, tests: '', wind: wind(202.5, 15) }

const DIRECTIONS = [
    {
        file: 'SweepOverThinRing',
        mark: 'sweep',
        name: 'A · Thick sweep over a thin ring',
        optimises: 'Optimises for a continuous ring: the thin circle always says "wind", and the heavy arc adds where.',
        tradeoff: 'Costs contrast between the two weights — at 16 px the thin ring is under a pixel, so it lives on anti-aliasing.',
        span: { default: 90, max: 180, min: 45, prop: 'sweep' },
    },
    {
        file: 'GapInRing',
        mark: 'gap',
        name: 'B · A gap in a complete ring',
        optimises: 'Optimises for ink: one heavy stroke, no second weight to resolve, the most colour on the face for the force.',
        tradeoff: 'Costs certainty at small gaps — a narrow notch can read as a rendering flaw, and the heavy ring crowds the disc.',
        span: { default: 60, max: 120, min: 30, prop: 'gap' },
    },
    {
        file: 'BeadOnRing',
        mark: 'bead',
        name: 'C · A bead on the ring',
        optimises: 'Optimises for a point: a compass rose reads position, not span, and a dot is the smallest mark that has one.',
        tradeoff: 'Costs presence — the bead is two pixels, at the floor the last button failed at; only its position carries meaning.',
        span: { default: 9, max: 14, min: 6, prop: 'bead', unit: 'u' },
    },
    {
        file: 'Crescent',
        mark: 'crescent',
        name: 'D · Crescent (the fourth)',
        optimises: 'Optimises for freedom from edges: the ring thickens toward the bearing and thins away, so nothing has an end to alias.',
        tradeoff: 'Costs resolution — weight changes slowly around the circle, so two neighbouring points differ by a shade, not a step.',
        span: undefined,
    },
]

const GEOMETRY_PROPS = {
    ringRadius: { default: 27, editor: 'range', max: 29, min: 24, section: 'Geometry (64-unit face)', step: 0.5, unit: 'u' },
    heavy: { default: 6, editor: 'range', max: 9, min: 4, section: 'Geometry (64-unit face)', step: 0.5, unit: 'u' },
    light: { default: 2.5, editor: 'range', max: 4, min: 1.5, section: 'Geometry (64-unit face)', step: 0.5, unit: 'u' },
    moat: { default: 3, editor: 'range', max: 5, min: 1, section: 'Geometry (64-unit face)', step: 0.5, unit: 'u' },
    typeEm: { default: 28, editor: 'range', max: 34, min: 22, section: 'Geometry (64-unit face)', step: 1, unit: 'u' },
    sense: { default: 'upwind', editor: 'enum', options: ['upwind', 'downwind'], section: 'Wind' },
}

const geometryFromProps = String.raw`
    geometry() {
        const p = this.props
        return {
            ring: p.ringRadius ?? 27, heavy: p.heavy ?? 6, light: p.light ?? 2.5, moat: p.moat ?? 3,
            em: p.typeEm ?? 28, baseline: 1, sweep: p.sweep ?? 90, gap: p.gap ?? 60, bead: p.bead ?? 9,
        }
    }
`

const escapeHtml = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const canvasTag = ({ index, size, zoom, mark, sense }) =>
    `<canvas data-face="${index}"${mark ? ` data-mark="${mark}"` : ''}${sense ? ` data-sense="${sense}"` : ''} width="${size}" height="${size}" ` +
    `style="width: ${size * zoom}px; height: ${size * zoom}px; display: block;${zoom > 1 ? ' image-rendering: pixelated;' : ''}"></canvas>`

// One case: 16 and 32 at 1:1 stacked on the left, the 16 magnified 8× beside them, caption under.
const caseCell = ({ index, reading, width = 184, mark, sense }) => `
<div style="display: flex; flex-direction: column; gap: 8px; width: ${width}px">
  <div style="display: flex; gap: 10px; align-items: flex-end">
    <div style="display: flex; flex-direction: column; gap: 10px; align-items: center; justify-content: flex-end">
      ${canvasTag({ index, mark, sense, size: 16, zoom: 1 })}
      ${canvasTag({ index, mark, sense, size: 32, zoom: 1 })}
    </div>
    ${canvasTag({ index, mark, sense, size: 16, zoom: 8 })}
  </div>
  <div style="font-family: ${BODY_FONT}; font-size: 12px; line-height: 1.3; color: ${INK}">${escapeHtml(reading.label)}</div>
  ${reading.tests ? `<div style="font-family: ${BODY_FONT}; font-size: 11px; line-height: 1.3; color: ${MUTED}">${escapeHtml(reading.tests)}</div>` : ''}
</div>`

const sweepCell = ({ index, reading }) => `
<div style="display: flex; flex-direction: column; gap: 6px; align-items: center; width: 140px">
  ${canvasTag({ index, size: 16, zoom: 8 })}
  ${canvasTag({ index, size: 16, zoom: 1 })}
  <div style="font-family: ${BODY_FONT}; font-size: 12px; color: ${INK}">${escapeHtml(reading.label)}</div>
</div>`

const heading = (title, sub) => `
<div style="display: flex; flex-direction: column; gap: 6px">
  <div style="font-family: ${DISPLAY_FONT}; font-size: 22px; color: ${INK}">${escapeHtml(title)}</div>
  ${sub ? `<div style="font-family: ${BODY_FONT}; font-size: 13px; line-height: 1.4; color: ${MUTED}; max-width: 900px; text-wrap: pretty">${escapeHtml(sub)}</div>` : ''}
</div>`

const label = text =>
    `<div style="font-family: ${DISPLAY_FONT}; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: ${MUTED}">${escapeHtml(text)}</div>`

const page = ({ body, props, logic, width }) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>
    body { margin: 0; background: ${TOOLBAR}; }
    a { color: #f47725; } a:hover { color: #ffc300; }
  </style>
</helmet>
<div style="display: flex; flex-direction: column; gap: 28px; padding: 28px 32px 36px; width: ${width - 64}px; background: ${TOOLBAR}">
${body}
</div>
</x-dc>
<script data-dc-script data-props='${escapeHtml(JSON.stringify(props)).replace(/'/g, '&#39;')}'>
${logic}
</script>
</body>
</html>
`

const logicFor = ({ readings, mark }) => String.raw`${DRAW}
const READINGS = ${JSON.stringify(readings)}
class Component extends DCLogic {
${geometryFromProps}
    paint() {
        paintAll({ readings: READINGS, g: this.geometry(), mark: ${JSON.stringify(mark)}, sense: this.props.sense ?? 'upwind' })
    }
    componentDidMount() { this.paint() }
    componentDidUpdate() { this.paint() }
    renderVals() { return {} }
}
`

const ROW_WIDTH = 2560

// The one direction-specific tweak: the sweep or gap in degrees, or the bead in face units.
const spanProp = span => ({
    default: span.default,
    editor: 'range',
    max: span.max,
    min: span.min,
    section: 'Wind',
    step: span.unit ? 0.5 : 5,
    unit: span.unit ?? '°',
})

const directionArtboard = direction => {
    const readings = [...CASES, ...SWEEP]
    const cases = CASES.map((reading, index) => caseCell({ index, reading })).join('')
    const sweep = SWEEP.map((reading, step) => sweepCell({ index: CASES.length + step, reading })).join('')
    const body = `
${heading(direction.name, direction.optimises + ' ' + direction.tradeoff)}
${label('The brief’s cases · 16 px · 32 px · the 16 magnified 8×')}
<div style="display: flex; flex-wrap: wrap; gap: 24px 16px">${cases}</div>
${label('Compass sweep · 72 · 60 · 20 kt at every point, 22.5° apart')}
<div style="display: flex; gap: 12px">${sweep}</div>`
    const props = {
        ...GEOMETRY_PROPS,
        ...(direction.span ? { [direction.span.prop]: spanProp(direction.span) } : {}),
        $preview: { height: 900, width: ROW_WIDTH },
    }
    return page({ body, logic: logicFor({ mark: direction.mark, readings }), props, width: ROW_WIDTH })
}

// Main: every direction on the takeaway case and the three no-heading states, side by side.
const mainArtboard = () => {
    const readings = [KEY, CASES[1], CASES[7], CASES[0]]
    const columns = DIRECTIONS.map(
        direction => `
<div style="display: flex; flex-direction: column; gap: 16px; width: 230px">
  <div style="font-family: ${DISPLAY_FONT}; font-size: 15px; line-height: 1.3; color: ${INK}">${escapeHtml(direction.name)}</div>
  ${caseCell({ index: 0, mark: direction.mark, reading: KEY, width: 230 })}
  <div style="display: flex; gap: 8px">
    ${[1, 2].map(index => `<div style="display: flex; flex-direction: column; gap: 6px; align-items: center">${canvasTag({ index, mark: direction.mark, size: 16, zoom: 4 })}${canvasTag({ index, mark: direction.mark, size: 16, zoom: 1 })}<div style="font-family: ${BODY_FONT}; font-size: 11px; color: ${MUTED}">${index === 1 ? 'calm' : 'variable'}</div></div>`).join('')}
    <div style="display: flex; flex-direction: column; gap: 6px; align-items: center">${canvasTag({ index: 3, mark: direction.mark, size: 16, zoom: 4 })}${canvasTag({ index: 3, mark: direction.mark, size: 16, zoom: 1 })}<div style="font-family: ${BODY_FONT}; font-size: 11px; color: ${MUTED}">unreported</div></div>
  </div>
  <div style="font-family: ${BODY_FONT}; font-size: 12px; line-height: 1.4; color: ${INK}; text-wrap: pretty">${escapeHtml(direction.optimises)}</div>
  <div style="font-family: ${BODY_FONT}; font-size: 12px; line-height: 1.4; color: ${MUTED}; text-wrap: pretty">${escapeHtml(direction.tradeoff)}</div>
</div>`,
    ).join('')
    const body = `
${heading('The 0.4.0 button face · four ways to say where the wind is from', 'Temperature on a dewpoint-comfort disc, ringed in Beaufort colour. Same geometry in every column; only the bearing mark changes. Calm is a light ring, variable is a heavy ring with no mark, unreported is no ring. Marks point upwind.')}
<div style="display: flex; gap: 32px">${columns}</div>`
    const props = { ...GEOMETRY_PROPS, $preview: { height: 800, width: 1120 } }
    return page({ body, logic: logicFor({ mark: 'sweep', readings }), props, width: 1120 })
}

// Sense: one case, upwind and downwind, in every direction.
const senseArtboard = () => {
    const readings = [SENSE_CASE]
    const rows = ['upwind', 'downwind']
        .map(
            sense => `
<div style="display: flex; flex-direction: column; gap: 10px">
  ${label(sense === 'upwind' ? 'Upwind · the mark sits where the wind comes from (station-model, as the popup)' : 'Downwind · the mark sits where the wind is going (map convention, as the retired dart)')}
  <div style="display: flex; gap: 24px">${DIRECTIONS.map(direction => caseCell({ index: 0, mark: direction.mark, reading: { ...SENSE_CASE, label: direction.name }, sense })).join('')}</div>
</div>`,
        )
        .join('')
    const body = `${heading('Sense · SSW 15 kt both ways', 'A wind from 202.5°. Upwind puts the mark lower-left, downwind upper-right.')}${rows}`
    const props = { ...GEOMETRY_PROPS, $preview: { height: 520, width: 900 } }
    delete props.sense
    return page({ body, logic: logicFor({ mark: 'sweep', readings }), props, width: 900 })
}

writeFileSync(join(here, 'Main.dc.html'), mainArtboard())
writeFileSync(join(here, 'Sense.dc.html'), senseArtboard())
for (const direction of DIRECTIONS) writeFileSync(join(here, `${direction.file}.dc.html`), directionArtboard(direction))

const canvas = {
    artboards: [
        { file: 'Main.dc.html', h: 800, title: 'Overview', w: 1120, x: 0, y: 0 },
        { file: 'Sense.dc.html', h: 660, title: 'Sense', w: 1120, x: 1220, y: 0 },
        ...DIRECTIONS.map((direction, row) => ({
            file: `${direction.file}.dc.html`,
            h: 900,
            title: direction.name,
            w: ROW_WIDTH,
            x: 0,
            y: 940 + row * 1040,
        })),
    ],
    annotations: [
        {
            id: 'recommendation',
            text:
                'Recommendation: A, the thick sweep over a thin ring.\n\n' +
                'At 16 px it is the only mark whose direction and whose presence are both a step, not a shade: the thin ring says wind, the heavy quarter says where from, and every compass neighbour differs in the sweep row.\n\n' +
                'It also makes the three no-heading states fall out of the same grammar: calm is the thin ring alone, variable is the heavy ring all the way round, unreported is no ring. In B those last two are a full heavy ring with and without a notch, which is the one pair a glance can miss.\n\n' +
                'B is the runner-up if you want more force colour on the face. C is at the floor the last button failed at. D loses the sweep: neighbouring points differ by a shade.\n\n' +
                'Gust: the ring takes the announced colour silently. Nothing on the face says which of the two it read; the popup does.',
            w: 360,
            x: 2440,
            y: 0,
        },
        {
            id: 'collision-audit',
            text:
                'Colour audit, 16 px.\n\n' +
                'Sticky #FFFF00 disc against a force 7 #f5f69c ring: the moat keeps them apart, but the ring reads as pale rather than as a colour. Weakest pairing on the canvas; geometry holds, identity does not.\n\n' +
                'Oppressive #FF0000 against hurricane #f05a2a: separated by the moat, the ring reads orange. Passable.\n\n' +
                'Calm, variable and unreported are three visibly different states in every direction.\n\n' +
                'Three characters shrink the type to two thirds, as the shipped button does; 104 and -3 hold inside the disc.\n\n' +
                'Rendered in Chromium canvas, not Gecko. The real check is still setIcon on a toolbar.',
            w: 360,
            x: 2440,
            y: 400,
        },
    ],
    launch: { view: 'canvas' },
}
writeFileSync(join(here, 'canvas.json'), JSON.stringify(canvas, null, 4) + '\n')
