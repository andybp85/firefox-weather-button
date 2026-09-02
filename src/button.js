import { comfortBand } from './comfort.js'
import { resolveModel } from './model.js'

// Restores the manifest's own icon and title. The button is the only weather this extension
// shows before the popup is opened, so a failed refresh has to look unmistakably different
// from a real reading: a stale coloured chip claiming a dewpoint nobody measured is worse
// than the plain ornament plus a title that says what went wrong.
const DEFAULT_ICON_PATH = { 48: 'icons/icon.svg' }

const describeButton = ({ observation, tendency }) => ({
    dewpointFahrenheit: observation.dewpointFahrenheit,
    direction: tendency.direction,
    title: `${observation.stationName} — ${observation.dewpointFahrenheit}F dewpoint (${comfortBand(observation.dewpointFahrenheit).label}), pressure ${tendency.direction}`,
})

const showUnavailable = async ({ action, reason }) => {
    await action.setIcon({ path: DEFAULT_ICON_PATH })
    await action.setTitle({ title: `Weather detail — no reading (${reason})` })
}

// Paints the toolbar button from the current observation: the dewpoint in figures, the
// comfort band as the chip's colour, and the 3-hour pressure trend as the glyph beneath.
// paintIcon is injected because it needs a canvas, which is the one part of this that the
// test environment has no implementation of; everything above it is ordinary data.
export const updateButton = async ({ action, cache, client, now, paintIcon, stationId }) => {
    if (stationId === undefined) return showUnavailable({ action, reason: 'no station configured yet' })

    try {
        const model = await resolveModel({ cache, client, now, stationId })
        const { dewpointFahrenheit, direction, title } = describeButton(model)
        await action.setIcon({ imageData: paintIcon({ dewpointFahrenheit, direction }) })
        await action.setTitle({ title })
    } catch (error) {
        // resolveModel already falls back to the last good cached series, so reaching here
        // means there is no reading at all — a first run offline, or a station that has
        // never answered. Nothing is left to draw, so say so rather than leaving whatever
        // the button happened to show last.
        await showUnavailable({ action, reason: error.message })
    }
}
