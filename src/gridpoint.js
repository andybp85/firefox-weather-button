const DURATION_PATTERN = /^P(?:(\d+)D)?(?:T(\d+)H)?$/
const HOURS_PER_DAY = 24
const MILLISECONDS_PER_HOUR = 3_600_000

const offsets = count => [...Array(count).keys()]

const addHours = (startsAt, hours) => new Date(Date.parse(startsAt) + hours * MILLISECONDS_PER_HOUR).toISOString()

// NWS gridpoint validTime blocks vary from PT1H near the present out to P1DT3H days
// ahead, so consumers cannot assume hourly buckets.
export const durationHours = duration => {
    const match = DURATION_PATTERN.exec(duration)
    if (match === null) throw new Error(`unsupported gridpoint duration: ${duration}`)

    const [, days, hours] = match
    // Both components are optional in the pattern, so a bare 'P' matches with neither.
    // Returning 0 would silently drop a forecast block; ISO 8601 requires at least one.
    if (days === undefined && hours === undefined) throw new Error(`unsupported gridpoint duration: ${duration}`)

    return Number(days ?? 0) * HOURS_PER_DAY + Number(hours ?? 0)
}

export const thunderSeries = ({ gridpoint, hours }) => {
    const blocks = gridpoint.properties?.probabilityOfThunder?.values ?? []

    return blocks
        .flatMap(({ validTime, value }) => {
            const [startsAt, duration] = validTime.split('/')
            return offsets(durationHours(duration)).map(offset => ({ hour: addHours(startsAt, offset), percent: value }))
        })
        .slice(0, hours)
}
