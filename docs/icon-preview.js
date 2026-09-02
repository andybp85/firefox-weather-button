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
// The set covers both layouts, both sides of the 15 kt threshold, all three trend glyphs, the
// lift ladder from a hanging sock to a fully flown one, and the readings that run to three
// characters and shrink the type.
const CASES = [
    { dewpointFahrenheit: 48, direction: 'steady', metar: {}, note: 'Nothing measured — the plain icon' },
    { dewpointFahrenheit: 53, direction: 'rising', metar: { wdir: 210, wspd: 0 }, note: 'Calm air, measured and still' },
    { dewpointFahrenheit: 58, direction: 'falling', metar: { wdir: 40, wspd: 8 }, note: 'Light wind keeps the plain icon' },
    { dewpointFahrenheit: 58, direction: 'falling', metar: { wdir: 40, wspd: 14 }, note: 'One knot under the threshold' },
    { dewpointFahrenheit: 63, direction: 'steady', metar: { wdir: 40, wspd: 15 }, note: 'At the threshold — the sock takes the band' },
    { dewpointFahrenheit: 63, direction: 'rising', metar: { wdir: 190, wspd: 18 }, note: 'The same layout, rising' },
    { dewpointFahrenheit: 68, direction: 'falling', metar: { wdir: 'VRB', wgst: 21, wspd: 6 }, note: 'A gust promotes a light wind' },
    { dewpointFahrenheit: 73, direction: 'rising', metar: { wdir: 300, wgst: 34, wspd: 22 }, note: 'Half lift, gusting' },
    {
        dewpointFahrenheit: 78,
        direction: 'steady',
        metar: { wdir: 330, wgst: 60, wspd: 45 },
        note: 'Full lift — the sock cannot rise past this',
    },
    { dewpointFahrenheit: -4, direction: 'falling', metar: { wdir: 20, wspd: 20 }, note: 'Subfreezing, two characters' },
    { dewpointFahrenheit: -12, direction: 'rising', metar: { wdir: 20, wgst: 40, wspd: 26 }, note: 'Three characters shrink the type' },
    { dewpointFahrenheit: 100, direction: 'steady', metar: { wdir: 160, wspd: 30 }, note: 'Three characters, no minus' },
]

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
        direction: example.direction,
        size,
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

const toExample = ({ dewpointFahrenheit, direction, metar, note }) => {
    const wind = toWind(metar)
    return { dewpointFahrenheit, direction, label: `${dewpointFahrenheit}F ${direction} ${describeWind(wind)}`, note, wind }
}

const examples = CASES.map(toExample)
document.getElementById('cases').append(...examples.map(row))
document.getElementById('scale-note').textContent =
    `This display reports a device pixel ratio of ${devicePixelRatio}, so a 16-pixel icon is drawn ` +
    `${trueCssPixels(16)} CSS pixels wide. Check the icon on a 1x display too: it is the size the button is hardest to read at.`
