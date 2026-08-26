const MILLISECONDS_PER_HOUR = 3_600_000
const TENDENCY_WINDOW_HOURS = 3

const roundToTenth = value => Number(value.toFixed(1))

const directionOf = hPa => {
    if (hPa > 0) return 'rising'
    if (hPa < 0) return 'falling'
    return 'steady'
}

const hoursBetween = (earlier, later) => (Date.parse(later.reportTime) - Date.parse(earlier.reportTime)) / MILLISECONDS_PER_HOUR

// Math.sign(0) is 0, so a flat series would otherwise "conflict" with every reported
// tendency and discard it. Only an actual opposing sign counts as a conflict.
const signsConflict = (a, b) => a !== 0 && b !== 0 && Math.sign(a) !== Math.sign(b)

// Returns undefined rather than throwing when the series is too short: this is an
// optional fallback, not an essential value, and resolveTendency decides what to do.
// Assumes the series is newest-first; nws.js sorts it there so this need not re-derive it.
const computeFromSeries = observations => {
    const newest = observations[0]
    const baseline = observations.find(observation => hoursBetween(observation, newest) >= TENDENCY_WINDOW_HOURS)
    if (baseline === undefined) return undefined
    if (newest.slp === undefined || baseline.slp === undefined) return undefined

    const hPa = roundToTenth(newest.slp - baseline.slp)
    return {
        direction: directionOf(hPa),
        hPa,
        observedAt: newest.reportTime,
        provenance: 'computed',
        windowHours: hoursBetween(baseline, newest),
    }
}

export const resolveTendency = observations => {
    if (observations.length === 0) throw new Error('cannot resolve a pressure tendency from an empty observation series')

    const computed = computeFromSeries(observations)
    // AWC carries presTend only in the 3-hourly synoptic METARs, so the newest observation
    // holding one can trail the newest observation by up to three hours.
    const reported = observations.find(observation => observation.presTend !== undefined)
    if (reported === undefined) {
        if (computed === undefined) throw new Error('no reported tendency and too few observations to compute one')
        return computed
    }

    // A reported value can describe a window ending up to three hours in the past, while the
    // computed value always ends now. On a genuine sign conflict the more current series wins.
    if (computed !== undefined && signsConflict(computed.hPa, reported.presTend)) return computed

    return {
        direction: directionOf(reported.presTend),
        hPa: reported.presTend,
        observedAt: reported.reportTime,
        provenance: 'reported',
        windowHours: TENDENCY_WINDOW_HOURS,
    }
}
