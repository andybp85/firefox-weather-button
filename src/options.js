import { createNwsClient } from './nws.js'
import { validateStation } from './station.js'
import { createCache } from './storage.js'

const listen = ({ element, handler, type }) => {
    element.addEventListener(type, handler)
    return () => element.removeEventListener(type, handler)
}

const save = async () => {
    const status = document.querySelector('#status')
    const cache = createCache({ now: Date.now, storage: browser.storage.local })
    const client = createNwsClient({ cache, fetch })

    try {
        const station = await validateStation({ client, stationId: document.querySelector('#station').value })
        await browser.storage.local.set({ station })
        status.textContent = `Saved: ${station.name}`
    } catch (error) {
        // Broad on purpose: every failure here — an unknown station, a network error,
        // a malformed response — is reported to the user the same way, verbatim.
        status.textContent = `Not a reporting station: ${error.message}`
    }
}

listen({ element: document.querySelector('#save'), handler: save, type: 'click' })
