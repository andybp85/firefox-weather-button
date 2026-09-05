const COMPASS_POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
const DEGREES_PER_POINT = 360 / COMPASS_POINTS.length

// A gust this far over the sustained wind is the wind you dress for, so it takes the button's
// ring colour. An absent gustKnots makes the subtraction NaN and NaN compares false, so the
// sustained speed wins with no guard of its own: the arithmetic is the guard.
const GUST_MARGIN_KNOTS = 10

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
        // The cardinal is for text and the degrees are for the plaque's shaft; both are left
        // off a variable or unreported direction rather than defaulted, so nothing downstream
        // can draw a heading the station never sent. toDirection() reads the same field for
        // its own 'variable' case — the two guards are the one decision, spelled twice.
        ...(typeof wdir === 'number' ? { bearingDegrees: wdir } : {}),
        ...(direction === undefined ? {} : { direction }),
        ...(gustKnots === undefined ? {} : { gustKnots }),
        knots: wspd,
        state: 'measured',
    }
}

// The speed the button colours itself by: the sustained wind, unless the gust is far enough
// over it to be the reading that matters.
export const announcedKnots = ({ gustKnots, knots }) => (gustKnots - knots > GUST_MARGIN_KNOTS ? gustKnots : knots)

// The button tooltip's wording of a wind. The popup's plaque splits the same reading across its
// speed and direction lines instead, so this is no longer a shared wording; it stays here
// because 'calm' and 'unreported' are decisions about the value, not about the tooltip.
export const describeWind = wind => {
    if (wind.state === 'calm') return 'calm'
    if (wind.state === 'unreported') return 'unreported'

    const speed = wind.direction === undefined ? `${wind.knots} kt` : `${wind.direction} ${wind.knots} kt`
    return wind.gustKnots === undefined ? speed : `${speed} G ${wind.gustKnots}`
}
