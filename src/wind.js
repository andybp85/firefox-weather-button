const COMPASS_POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
const DEGREES_PER_POINT = 360 / COMPASS_POINTS.length

// The speed at which a steady wind is worth the toolbar button's bottom band on its own. It is
// roughly where wind stops being background and starts being something you dress for, and it is
// the small-craft advisory's own neighbourhood. A gust promotes the wind at any speed.
export const NOTABLE_KNOTS = 15

const cardinal = degrees => COMPASS_POINTS[Math.round(degrees / DEGREES_PER_POINT) % COMPASS_POINTS.length]

// AWC sends the literal string 'VRB' for genuinely variable wind rather than omitting wdir, so
// the guard is on the bearing not being a number rather than on matching 'VRB' specifically:
// cardinal() only means anything for a numeric bearing, and 'variable' is the correct reading
// of that report per the METAR code, not merely a safe fallback for an unexpected value.
const toDirection = wdir => {
    if (wdir === undefined) return undefined
    return typeof wdir === 'number' ? cardinal(wdir) : 'variable'
}

// A gust is the peak measured above the sustained wind, so one that fails to exceed it reports
// nothing the sustained figure has not already said. Dropping it here keeps every consumer from
// having to decide what "18 kt gusting 18" means.
const toGust = ({ knots, wgst }) => (wgst > knots ? wgst : undefined)

// Decodes the three wind fields of an AWC METAR record into one value the panel and the button
// can both read. Absent is not zero: a missing wspd means nobody measured the wind, while
// wspd: 0 is a positive report of calm air, and the two must stay distinguishable downstream.
export const toWind = ({ wdir, wgst, wspd }) => {
    if (wspd === undefined) return { state: 'unreported' }
    if (wspd === 0) return { state: 'calm' }

    const direction = toDirection(wdir)
    const gustKnots = toGust({ knots: wspd, wgst })

    // Unmeasured fields are left off the value rather than carried as undefined, so it holds
    // what the station reported and nothing else.
    return {
        ...(direction === undefined ? {} : { direction }),
        ...(gustKnots === undefined ? {} : { gustKnots }),
        knots: wspd,
        state: 'measured',
    }
}

const isBrisk = ({ gustKnots, knots }) => gustKnots !== undefined || knots >= NOTABLE_KNOTS

// Whether the wind has earned the toolbar button's bottom band from the pressure trend. Calm
// and unreported never do: an icon that reorganises itself to announce no wind is noise.
export const isNotable = wind => (wind.state === 'measured' ? isBrisk(wind) : false)

// The one wording of a wind, shared by the popup's row and the button's tooltip so the two can
// never describe the same reading differently. 'calm' and 'unreported' are the two things a wind
// can be that are not a measurement, and each has to read as itself: calm air was measured and
// found still, an unreported wind was not measured at all, and neither of them is "0 kt".
export const describeWind = wind => {
    if (wind.state === 'calm') return 'calm'
    if (wind.state === 'unreported') return 'unreported'

    const speed = wind.direction === undefined ? `${wind.knots} kt` : `${wind.direction} ${wind.knots} kt`
    return wind.gustKnots === undefined ? speed : `${speed} G ${wind.gustKnots}`
}
