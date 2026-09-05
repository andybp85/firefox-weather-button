import { comfortBand } from './comfort.js'
import { resolveModel } from './model.js'
import { describeWind } from './wind.js'

// Restores the manifest's own icon and title. The button is the only weather this extension
// shows before the popup is opened, so a failed refresh has to look unmistakably different
// from a real reading: a stale coloured chip claiming a dewpoint nobody measured is worse
// than the plain ornament plus a title that says what went wrong.
const DEFAULT_ICON_PATH = { 48: 'icons/icon.svg' }

const describeButton = ({ observation, tendency }) => {
    const { dewpointFahrenheit, stationName, temperatureFahrenheit, wind } = observation
    const { label } = comfortBand(dewpointFahrenheit)

    return {
        dewpointFahrenheit,
        temperatureFahrenheit,
        // The tooltip carries every reading the face draws and the one it dropped: the pressure
        // trend was unreadable at 16 px, and this line and the popup are where it lives now.
        title:
            `${stationName} — ${temperatureFahrenheit}F, dewpoint ${dewpointFahrenheit}F (${label}), ` +
            `pressure ${tendency.direction}, wind ${describeWind(wind)}`,
        wind,
    }
}

const showUnavailable = async ({ action, reason }) => {
    await action.setIcon({ path: DEFAULT_ICON_PATH })
    await action.setTitle({ title: `Weather detail — no reading (${reason})` })
}

// Paints the toolbar button from the current observation: the temperature in figures on a disc
// in the dewpoint's comfort colour, ringed by the wind in its Beaufort colour with a bead on the
// upwind side. paintIcon is injected because it needs a canvas, which is the one part of this
// that the test environment has no implementation of; everything above it is ordinary data.
export const updateButton = async ({ action, cache, client, now, paintIcon, stationId }) => {
    if (stationId === undefined) return showUnavailable({ action, reason: 'no station configured yet' })

    try {
        const model = await resolveModel({ cache, client, now, stationId })
        const { dewpointFahrenheit, temperatureFahrenheit, title, wind } = describeButton(model)
        await action.setIcon({ imageData: paintIcon({ dewpointFahrenheit, temperatureFahrenheit, wind }) })
        await action.setTitle({ title })
    } catch (error) {
        // resolveModel already falls back to the last good cached series, so reaching here
        // means there is no reading at all — a first run offline, or a station that has
        // never answered. Nothing is left to draw, so say so rather than leaving whatever
        // the button happened to show last.
        await showUnavailable({ action, reason: error.message })
    }
}
