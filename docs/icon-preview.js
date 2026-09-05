import { drawButtonIcon } from '/src/button-icon.js'
import { describeWind, toWind } from '/src/wind.js'

// Sizes Firefox actually asks the button for, drawn at true device resolution. The 16 is the
// case worth looking at: everything the geometry gets wrong, it gets wrong there first.
const TRUE_SIZES = [16, 32, 64]

// The blow-ups. Backing pixels are scaled by whole numbers with smoothing off, so a magnified
// square is exactly the raster above it and not a resampled guess at it.
const MAGNIFIED = [
    { factor: 6, size: 16 },
    { factor: 3, size: 32 },
]

// One row per case, each written as the METAR fields the station sends rather than as a decoded
// wind, so the page exercises toWind() on the way in and reads the same wording the popup does.
// The set is the design brief's: the three no-heading states, both sides of the 10 kt gust margin,
// force 1 beside force 10, the readings that run to three characters, and the two comfort-ring
// pairings whose colours sit closest.
const CASES = [
    { dewpointFahrenheit: 48, metar: {}, note: 'Nothing measured: disc and figures, no ring', temperatureFahrenheit: 55 },
    {
        dewpointFahrenheit: 53,
        metar: { wdir: 210, wspd: 0 },
        note: 'Calm: a light ring in the force 0 blue, no bead',
        temperatureFahrenheit: 61,
    },
    { dewpointFahrenheit: 58, metar: { wdir: 40, wspd: 14 }, note: 'An ordinary wind, force 4', temperatureFahrenheit: 66 },
    { dewpointFahrenheit: 63, metar: { wdir: 202.5, wspd: 15 }, note: 'SSW, force 4: the bead sits lower left', temperatureFahrenheit: 71 },
    {
        dewpointFahrenheit: 63,
        metar: { wdir: 292.5, wgst: 31, wspd: 22 },
        note: 'Gust 9 over: the sustained wind keeps the colour',
        temperatureFahrenheit: 74,
    },
    {
        dewpointFahrenheit: 68,
        metar: { wdir: 270, wgst: 32, wspd: 18 },
        note: 'Gust 14 over: the gust takes the colour',
        temperatureFahrenheit: 79,
    },
    {
        dewpointFahrenheit: 73,
        metar: { wdir: 180, wgst: 65, wspd: 55 },
        note: 'Gust exactly 10 over: still the sustained wind, force 10',
        temperatureFahrenheit: 84,
    },
    {
        dewpointFahrenheit: 78,
        metar: { wdir: 'VRB', wgst: 21, wspd: 6 },
        note: 'Variable: a heavy ring, no bead',
        temperatureFahrenheit: 86,
    },
    { dewpointFahrenheit: -4, metar: { wdir: 20, wspd: 8 }, note: 'Subfreezing, two characters', temperatureFahrenheit: 10 },
    { dewpointFahrenheit: -12, metar: {}, note: 'Three characters shrink the type', temperatureFahrenheit: -3 },
    { dewpointFahrenheit: 100, metar: { wdir: 160, wspd: 4 }, note: 'Three characters, no minus', temperatureFahrenheit: 104 },
    { dewpointFahrenheit: 60, metar: { wdir: 40, wspd: 3 }, note: 'Force 1: quiet enough not to nag', temperatureFahrenheit: 72 },
    { dewpointFahrenheit: 60, metar: { wdir: 40, wspd: 50 }, note: 'Force 10, beside force 1', temperatureFahrenheit: 72 },
    {
        dewpointFahrenheit: 63,
        metar: { wdir: 40, wspd: 30 },
        note: 'Weak pairing: a sticky disc inside a force 7 ring',
        temperatureFahrenheit: 72,
    },
    {
        dewpointFahrenheit: 73,
        metar: { wdir: 40, wspd: 70 },
        note: 'An oppressive disc inside a hurricane ring',
        temperatureFahrenheit: 88,
    },
]

// The sixteen compass points at one speed. The bead's sense is the one thing about this mark a
// reader can get backwards, so it gets a sweep to check against: the bead sits upwind, so a wind
// from the north puts it at the top of the face. No two neighbours may look alike at 16 px.
const COMPASS_CASES = [...Array(16).keys()].map(step => ({
    dewpointFahrenheit: 60,
    metar: { wdir: step * 22.5, wspd: 20 },
    note: 'Compass sweep',
    temperatureFahrenheit: 72,
}))

// A canvas is only honest about a 16-device-pixel icon when one backing pixel lands on one
// device pixel. On a 2x display that is 8 CSS pixels wide, which looks wrong on the page and is
// right on the screen.
const trueCssPixels = size => size / devicePixelRatio

const paint = ({ example, size }) => {
    const canvas = document.createElement('canvas')
    canvas.height = size
    canvas.width = size
    drawButtonIcon({
        context: canvas.getContext('2d'),
        dewpointFahrenheit: example.dewpointFahrenheit,
        size,
        temperatureFahrenheit: example.temperatureFahrenheit,
        wind: example.wind,
    })
    return canvas
}

const cell = canvas => {
    const td = document.createElement('td')
    td.append(canvas)
    return td
}

const trueCell = ({ example, size }) => {
    const canvas = paint({ example, size })
    canvas.ariaLabel = `${example.label}, ${size} device pixels`
    canvas.role = 'img'
    canvas.style.height = `${trueCssPixels(size)}px`
    canvas.style.width = `${trueCssPixels(size)}px`
    return cell(canvas)
}

const magnifiedCell = ({ example, factor, size }) => {
    const canvas = paint({ example, size })
    canvas.ariaLabel = `${example.label}, ${size} device pixels magnified ${factor} times`
    canvas.className = 'magnified'
    canvas.role = 'img'
    canvas.style.height = `${size * factor}px`
    canvas.style.width = `${size * factor}px`
    return cell(canvas)
}

const heading = example => {
    const th = document.createElement('th')
    const note = document.createElement('span')
    th.scope = 'row'
    th.textContent = example.label
    note.className = 'case-note'
    note.textContent = example.note
    th.append(note)
    return th
}

const row = example => {
    const tr = document.createElement('tr')
    tr.append(heading(example))
    for (const size of TRUE_SIZES) tr.append(trueCell({ example, size }))
    for (const { factor, size } of MAGNIFIED) tr.append(magnifiedCell({ example, factor, size }))
    return tr
}

const toExample = ({ dewpointFahrenheit, metar, note, temperatureFahrenheit }) => {
    const wind = toWind(metar)
    return {
        dewpointFahrenheit,
        label: `${temperatureFahrenheit}F, dewpoint ${dewpointFahrenheit}F, wind ${describeWind(wind)}`,
        note,
        temperatureFahrenheit,
        wind,
    }
}

const examples = [...CASES, ...COMPASS_CASES].map(toExample)
document.getElementById('cases').append(...examples.map(row))
document.getElementById('scale-note').textContent =
    `This display reports a device pixel ratio of ${devicePixelRatio}, so a 16-pixel icon is drawn ` +
    `${trueCssPixels(16)} CSS pixels wide. Check the icon on a 1x display too: it is the size the button is hardest to read at.`
