import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'

// The background page is the extension's other entry point, and like popup-main.js it does its
// work on import against globals Firefox supplies. Each case gets its own module instance via a
// distinct import specifier so the run, and the listeners it registers, see that case's fakes.
//
// No case configures a station. That keeps every path in this file clear of paintIcon, which
// needs an OffscreenCanvas that Node has no implementation of; the drawing is button-icon.js's
// subject and the reading is button.js's, leaving the wiring itself as this file's.
// The listeners are fire-and-forget: Firefox does not await them, so neither do they return a
// handle. Draining the microtask queue is what lets a test see the refresh they started.
const settle = () => new Promise(resolve => setImmediate(resolve))

const listenerSlot = () => {
    const listeners = []
    return { addListener: listener => listeners.push(listener), listeners }
}

const runBackground = async () => {
    const alarms = { created: [], onAlarm: listenerSlot() }
    alarms.create = (name, options) => alarms.created.push({ name, ...options })

    const action = { icons: [], titles: [] }
    action.setIcon = async icon => action.icons.push(icon)
    action.setTitle = async ({ title }) => action.titles.push(title)

    const storage = { get: async () => ({}), onChanged: listenerSlot(), set: async () => {} }

    globalThis.browser = {
        action,
        alarms,
        runtime: { onInstalled: listenerSlot(), onStartup: listenerSlot() },
        storage: { local: storage },
    }
    globalThis.fetch = async url => {
        throw new Error(`unexpected fetch: ${url}`)
    }

    const { ready } = await import(`../src/background.js?instance=${randomUUID()}`)
    await ready
    return globalThis.browser
}

test('loading the background page paints the button once, without waiting for the first alarm', async () => {
    const { action } = await runBackground()

    assert.match(action.titles.at(-1), /no station configured yet/)
})

test('the refresh alarm is created on install and on browser start, and not on every wake', async () => {
    const { alarms, runtime } = await runBackground()

    assert.deepEqual(alarms.created, [], 'creating it on load would push the next fire out on every wake')
    for (const register of [runtime.onInstalled, runtime.onStartup]) register.listeners[0]()
    assert.deepEqual(alarms.created, [
        { name: 'refresh-button', periodInMinutes: 10 },
        { name: 'refresh-button', periodInMinutes: 10 },
    ])
})

test('the alarm listener refreshes for its own alarm and ignores any other', async () => {
    const { action, alarms } = await runBackground()
    const [onAlarm] = alarms.onAlarm.listeners
    const paints = action.titles.length

    onAlarm({ name: 'some-other-alarm' })
    assert.equal(action.titles.length, paints)

    onAlarm({ name: 'refresh-button' })
    await settle()
    assert.equal(action.titles.length, paints + 1)
})

// Saving a station has to change the button now, not up to ten minutes from now. The narrowing
// matters as much: this storage area also holds the observation cache the refresh itself
// writes, and reacting to those would have the button refresh itself in a loop.
test('a saved station refreshes the button, and the cache it writes does not', async () => {
    const { action, storage } = await runBackground()
    const [onChanged] = storage.local.onChanged.listeners
    const paints = action.titles.length

    onChanged({ 'observations:KEWR': { newValue: [] } })
    assert.equal(action.titles.length, paints)

    onChanged({ station: { newValue: { stationId: 'KEWR' } } })
    await settle()
    assert.equal(action.titles.length, paints + 1)
})
