import { lclMetres } from './lcl.js'
import { celsiusToFahrenheit, metresToFeet } from './units.js'

const COMPASS_POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
const DEGREES_PER_POINT = 360 / COMPASS_POINTS.length

const cardinal = degrees => COMPASS_POINTS[Math.round(degrees / DEGREES_PER_POINT) % COMPASS_POINTS.length]

// AWC reports calm air as wdir: 0, wspd: 0 — indistinguishable from "due north" by
// direction alone, so speed must be checked first.
const describeWind = ({ wdir, wspd }) => {
    if (!wspd) return 'calm'
    if (wdir === undefined) return `${wspd} kt`
    // AWC also sends the literal string 'VRB' for genuinely variable wind, rather than
    // omitting wdir. Guard on it not being a number, not on matching 'VRB' specifically —
    // cardinal() only makes sense for a numeric bearing, and this is the correct rendering
    // for VRB (per the METAR code), not merely a safe fallback for an unexpected value.
    if (typeof wdir !== 'number') return `variable ${wspd} kt`
    return `${cardinal(wdir)} ${wspd} kt`
}

const describeCloudLayer = ({ base, cover }) => {
    if (cover === undefined) return 'unreported'
    return base === undefined ? cover : `${cover} ${base} ft`
}

const describeClouds = clouds => (clouds === undefined || clouds.length === 0 ? 'clear' : clouds.map(describeCloudLayer).join(', '))

export const toViewModel = observation => {
    const { clouds, dewp, name, reportTime, slp, temp, visib } = observation

    if (dewp === undefined || temp === undefined) throw new Error(`observation ${reportTime} is missing temperature or dewpoint`)

    return {
        cloudBaseFeet: Math.round(metresToFeet(lclMetres({ dewpointCelsius: dewp, temperatureCelsius: temp }))),
        clouds: describeClouds(clouds),
        dewpointFahrenheit: Math.round(celsiusToFahrenheit(dewp)),
        observedAt: reportTime,
        pressureHpa: slp,
        stationName: name ?? 'unknown station',
        temperatureFahrenheit: Math.round(celsiusToFahrenheit(temp)),
        visibility: visib === undefined ? 'unreported' : String(visib),
        wind: describeWind(observation),
    }
}
