const MILLISECONDS_PER_MINUTE = 60_000

// now and storage are injected so tests can drive the clock and skip the browser.
export const createCache = ({ now, storage }) => ({
    read: async ({ key, ttlMinutes }) => {
        const record = (await storage.get(key))[key]
        if (record === undefined) return undefined
        if (ttlMinutes === undefined) return record.value

        const ageMinutes = (now() - record.writtenAt) / MILLISECONDS_PER_MINUTE
        return ageMinutes > ttlMinutes ? undefined : record.value
    },

    write: async ({ key, value }) => storage.set({ [key]: { value, writtenAt: now() } }),
})
