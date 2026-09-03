import { comfortBand } from './comfort.js'
import { resolveModel } from './model.js'
import { describeWind } from './wind.js'

// Restores the manifest's own icon and title. The button is the only weather this extension
// shows before the popup is opened, so a failed refresh has to look unmistakably different
// from a real reading: a stale coloured chip claiming a dewpoint nobody measured is worse
// than the plain ornament plus a title that says what went wrong.
const DEFAULT_ICON_PATH = { 48: 'icons/icon.svg' }

const describeButton = ({ observation, tendency }) => {
    const { dewpointFahrenheit, stationName, wind } = observation
    const { label } = comfortBand(dewpointFahrenheit)

    return {
        dewpointFahrenheit,
        direction: tendency.direction,
        // The tooltip carries the wind in words on every path, including the ones where the icon
        // does not draw it: a light wind is still a reading, it has simply not earned the band.
        title: `${stationName} — ${dewpointFahrenheit}F dewpoint (${label}), pressure ${tendency.direction}, wind ${describeWind(wind)}`,
        wind,
    }
}

const showUnavailable = async ({ action, reason }) => {
    await action.setIcon({ path: DEFAULT_ICON_PATH })
    await action.setTitle({ title: `Weather detail — no reading (${reason})` })
}

// Paints the toolbar button from the current observation: the dewpoint in figures, the comfort
// band along the chip's foot, the 3-hour pressure trend cut into it, and the wind as a compass
// dart in place of the figures once it is blowing hard enough (see wind.js's isNotable).
// paintIcon is injected because it needs a canvas, which is the one part of this that the
// test environment has no implementation of; everything above it is ordinary data.
export const updateButton = async ({ action, cache, client, now, paintIcon, stationId }) => {
    if (stationId === undefined) return showUnavailable({ action, reason: 'no station configured yet' })

    try {
        const model = await resolveModel({ cache, client, now, stationId })
        const { dewpointFahrenheit, direction, title, wind } = describeButton(model)
        await action.setIcon({ imageData: paintIcon({ dewpointFahrenheit, direction, wind }) })
        await action.setTitle({ title })
    } catch (error) {
        // resolveModel already falls back to the last good cached series, so reaching here
        // means there is no reading at all — a first run offline, or a station that has
        // never answered. Nothing is left to draw, so say so rather than leaving whatever
        // the button happened to show last.
        await showUnavailable({ action, reason: error.message })
    }
}
