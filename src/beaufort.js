// The Beaufort scale, WMO code table 1100, thresholds in knots. `below` is exclusive, so the
// first row a speed fits is its force and the last row catches everything above the chart —
// the same shape comfort.js uses for the dewpoint bands, and for the same reason.
//
// Colours are sampled from the printed Beaufort chart this project reads the scale off. Two
// departures from it, both forced by contrast on the popup's plaques (--tile):
//   - force 12's dark value is lifted from the chart's #c93f14 to #f05a2a, 2.8:1 to 4.15:1.
//     That is still under the 4.5:1 AA asks for the plaque's 11px gust text — a recorded
//     exception, not an oversight: darkening it further loses the top of the ramp to force 11.
//   - every light partner is its chart colour's own OKLCH hue held at L 0.52, the first step
//     where all thirteen clear 4.5:1 on --tile. The chart's own colours all fail there (1.0-2.8).
export const BEAUFORT = [
    { below: 1, dark: '#129bf7', light: '#056eb2', name: 'calm' },
    { below: 4, dark: '#6cc8f7', light: '#02729b', name: 'light air' },
    { below: 7, dark: '#7dcabf', light: '#25766d', name: 'light breeze' },
    { below: 11, dark: '#13dd14', light: '#017c02', name: 'gentle breeze' },
    { below: 17, dark: '#6cf640', light: '#287a03', name: 'moderate breeze' },
    { below: 22, dark: '#c8f640', light: '#5a7203', name: 'fresh breeze' },
    { below: 28, dark: '#dcf59d', light: '#5e7216', name: 'strong breeze' },
    { below: 34, dark: '#f5f69c', light: '#6f6d03', name: 'near gale' },
    { below: 41, dark: '#f1d860', light: '#7b6902', name: 'gale' },
    { below: 48, dark: '#f6be15', light: '#856502', name: 'strong gale' },
    { below: 56, dark: '#f69c6e', light: '#a65324', name: 'storm' },
    { below: 64, dark: '#f66d15', light: '#b14a02', name: 'violent storm' },
    { below: Infinity, dark: '#f05a2a', light: '#c13900', name: 'hurricane' },
]

// The force of an unrounded speed. The 5-knot rounding the barbs are drawn at is a drawing
// concern and stays in wind-barbs.js: rounding here would move a 33 kt wind up to force 8.
export const beaufortForce = knots => BEAUFORT.findIndex(force => knots < force.below)

// One string that serves both schemes, so the popup never has to ask which one it is in. The
// button does not use this — its face is Kit's toolbar indigo in both schemes, so it takes the
// dark hex directly.
export const beaufortColour = force => `light-dark(${BEAUFORT[force].light}, ${BEAUFORT[force].dark})`
