import { createCache } from './storage.js'
import { createNwsClient } from './nws.js'
import { drawButtonIcon } from './button-icon.js'
import { updateButton } from './button.js'

// Firefox picks the icon nearest the toolbar's device pixel ratio, so both the 1x and 2x
// squares are supplied; button-icon.js draws one scalable design rather than two.
const ICON_SIZES = [16, 32]

const REFRESH_ALARM = 'refresh-button'

// Matches model.js's cache TTL. A shorter period would mostly redraw the same chip from the
// same cached series, and METARs are issued hourly anyway.
const REFRESH_MINUTES = 10

const rasterise = ({ dewpointFahrenheit, direction, size }) => {
    const context = new OffscreenCanvas(size, size).getContext('2d')
    drawButtonIcon({ context, dewpointFahrenheit, direction, size })
    return context.getImageData(0, 0, size, size)
}

const paintIcon = ({ dewpointFahrenheit, direction }) =>
    Object.fromEntries(ICON_SIZES.map(size => [size, rasterise({ dewpointFahrenheit, direction, size })]))

const refresh = async () => {
    const cache = createCache({ now: Date.now, storage: browser.storage.local })
    const { station } = await browser.storage.local.get('station')
    await updateButton({
        action: browser.action,
        cache,
        client: createNwsClient({ cache, fetch }),
        now: Date.now(),
        paintIcon,
        stationId: station?.stationId,
    })
}

// Registered at the top level, synchronously, because this is an event page: Firefox unloads
// it when idle and delivers these events by loading it again, so a listener added inside an
// awaited call would not exist yet when the event that wakes the page arrives.
browser.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === REFRESH_ALARM) refresh()
})

// The alarm outlives the event page, so this only needs to run when the extension is first
// installed and when the browser starts; creating it again on every wake would push the next
// fire out by a full period each time.
browser.runtime.onInstalled.addListener(() => browser.alarms.create(REFRESH_ALARM, { periodInMinutes: REFRESH_MINUTES }))
browser.runtime.onStartup.addListener(() => browser.alarms.create(REFRESH_ALARM, { periodInMinutes: REFRESH_MINUTES }))

// Saving a station in the options page has to change the button now, not up to ten minutes
// from now. Narrowed to the station key: this same storage area holds the observation cache
// that refresh() itself writes, and reacting to those would have the button refresh itself.
browser.storage.local.onChanged.addListener(changes => {
    if ('station' in changes) refresh()
})

// Exported for the same reason popup-main.js exports its run: the entry point does its work
// on import, and a test needs a handle on it. Firefox only needs the import's side effect —
// an immediate repaint whenever the event page is loaded, including after it was unloaded.
export const ready = refresh().catch(() => {
    // updateButton already turns a failed reading into the default icon and a title that
    // names the cause. Reaching here means the browser APIs themselves are unavailable,
    // and there is no surface left to report it on.
})
