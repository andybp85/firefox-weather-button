// The dewpoint comfort chart the toolbar button colours itself by. Backgrounds are the
// chart's own swatches, sampled from it rather than eyeballed.
//
// Bands are whole degrees Fahrenheit, and every caller rounds the reading before it gets
// here (observation.js already rounds dewpointFahrenheit), so the chart's written gaps —
// 55 to 56, 60 to 61 — never fall between two bands. `below` is exclusive: the first band
// a reading fits is its band, and the last one catches everything above the chart.
//
// Each foreground is whichever of black or white contrasts more with its background,
// computed rather than chosen by eye. The chart itself prints black on every row, but the
// button draws two digits at 16 device pixels, where the 4.09:1 of black on #008000 is
// worth trading for the 5.14:1 of white.
const BANDS = [
    { background: '#DAEEF3', below: 50, foreground: '#000000', label: 'dry' },
    { background: '#CCFFCC', below: 56, foreground: '#000000', label: 'pleasant' },
    { background: '#008000', below: 61, foreground: '#FFFFFF', label: 'comfortable' },
    { background: '#FFFF00', below: 66, foreground: '#000000', label: 'sticky' },
    { background: '#FF6600', below: 71, foreground: '#000000', label: 'uncomfortable' },
    { background: '#FF0000', below: 76, foreground: '#000000', label: 'oppressive' },
    { background: '#C0504D', below: Infinity, foreground: '#FFFFFF', label: 'miserable' },
]

export const comfortBand = dewpointFahrenheit => BANDS.find(band => dewpointFahrenheit < band.below)
