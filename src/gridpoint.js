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

    const [, days = '0', hours = '0'] = match
    return Number(days) * HOURS_PER_DAY + Number(hours)
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
