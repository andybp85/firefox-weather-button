import { lclMetres } from './lcl.js'
import { celsiusToFahrenheit, metresToFeet } from './units.js'
import { toWind } from './wind.js'

const describeCloudLayer = ({ base, cover }) => {
    if (cover === undefined) return 'unreported'
    return base === undefined ? cover : `${cover} ${base} ft`
}

const describeClouds = clouds => (clouds === undefined || clouds.length === 0 ? 'clear' : clouds.map(describeCloudLayer).join(', '))

export const toViewModel = observation => {
    const { clouds, dewp, icaoId, name, reportTime, slp, temp, visib } = observation

    if (dewp === undefined || temp === undefined) throw new Error(`observation ${reportTime} is missing temperature or dewpoint`)

    return {
        cloudBaseFeet: Math.round(metresToFeet(lclMetres({ dewpointCelsius: dewp, temperatureCelsius: temp }))),
        clouds: describeClouds(clouds),
        dewpointFahrenheit: Math.round(celsiusToFahrenheit(dewp)),
        observedAt: reportTime,
        pressureHpa: slp,
        // Some stations report observations with no name. The id identifies the station and
        // is always present; 'unknown station' identifies nothing. station.js falls back the
        // same way when it validates a station id, and the two must agree.
        stationName: name ?? icaoId,
        temperatureFahrenheit: Math.round(celsiusToFahrenheit(temp)),
        // AWC sends visib as "10+" or as a number and omits it when unmeasured; 'unreported'
        // is manufactured here, not received. popup.js's describeVisibility matches on this
        // exact string to drop the "mi" unit — flagged on both sides because nothing enforces it.
        visibility: visib === undefined ? 'unreported' : String(visib),
        // The wind is a value rather than a sentence: the button needs the figures to decide
        // whether the wind has earned its bottom band, and wind.js's describeWind owns the wording.
        wind: toWind(observation),
    }
}
