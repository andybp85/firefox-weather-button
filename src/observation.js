import { lclMetres } from './lcl.js'
import { celsiusToFahrenheit, metresToFeet } from './units.js'

// 16-point compass, each name owning the 22.5° sector starting at its own heading
// (N = [0, 22.5), NNE = [22.5, 45), ... NNW = [337.5, 360)) and running clockwise to
// the next name — not centered on the named heading.
const COMPASS_POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
const DEGREES_PER_POINT = 360 / COMPASS_POINTS.length

const cardinal = degrees => COMPASS_POINTS[Math.floor(degrees / DEGREES_PER_POINT) % COMPASS_POINTS.length]

// AWC reports calm air as wdir: 0, wspd: 0 — indistinguishable from "due north" by
// direction alone, so speed must be checked first.
const describeWind = ({ wdir, wspd }) => (wspd ? `${cardinal(wdir)} ${wspd} kt` : 'calm')

const describeCloudLayer = ({ base, cover }) => `${cover} ${base} ft`

const describeClouds = clouds => (clouds === undefined || clouds.length === 0 ? 'clear' : clouds.map(describeCloudLayer).join(', '))

export const toViewModel = observation => {
    const { clouds, dewp, name, reportTime, slp, temp, visib } = observation

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
