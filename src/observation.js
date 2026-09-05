import { lclMetres } from './lcl.js'
import { celsiusToFahrenheit, metresToFeet } from './units.js'
import { toWind } from './wind.js'

// The layers as data rather than as a sentence: the cloud plaque paints them at their heights
// and the header writes its own line from the same list, so the two can never disagree about
// what the station reported.
//
// A layer with no `base` is dropped rather than carried with an undefined height. AWC omits the
// field on CLR and SKC, and neither surface can place a layer it has no height for; an empty
// list already reads as 'clear' on both.
const toCloudLayers = clouds =>
    (clouds ?? [])
        .filter(({ base }) => base !== undefined)
        .map(({ base, cover }) => ({ baseFeet: base, cover }))
        // High to low, so a consumer painting them in sequence lands the lower deck over the
        // higher one — which is what a sky looks like from underneath.
        .sort((one, other) => other.baseFeet - one.baseFeet)

export const toViewModel = observation => {
    const { clouds, dewp, icaoId, name, reportTime, slp, temp, visib } = observation

    if (dewp === undefined || temp === undefined) throw new Error(`observation ${reportTime} is missing temperature or dewpoint`)

    return {
        cloudBaseFeet: Math.round(metresToFeet(lclMetres({ dewpointCelsius: dewp, temperatureCelsius: temp }))),
        cloudLayers: toCloudLayers(clouds),
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
        // The wind is a value rather than a sentence: the button colours its ring by the figures,
        // and wind.js's describeWind owns the wording.
        wind: toWind(observation),
    }
}
