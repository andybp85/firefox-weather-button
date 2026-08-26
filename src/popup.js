const ARROWS = { falling: '↓', rising: '↑', steady: '→' }
const HOUR_FORMAT = new Intl.DateTimeFormat(undefined, { hour: 'numeric' })
const MILLISECONDS_PER_MINUTE = 60_000

const describeAge = ({ now, observedAt }) => {
    const minutes = Math.round((now - Date.parse(observedAt)) / MILLISECONDS_PER_MINUTE)
    if (minutes < 60) return `obs ${minutes}m ago`
    return `obs ${Math.round(minutes / 60)}h ago`
}

// A reported or computed tendency already carries its sign for a fall (e.g. -1.2); only
// the positive case is missing one. Steady is exactly 0 and prints bare either way.
const describeHpaDelta = hPa => (hPa > 0 ? `+${hPa}` : `${hPa}`)

const describeTrend = tendency => `${ARROWS[tendency.direction]} ${describeHpaDelta(tendency.hPa)} / ${tendency.windowHours}h`

// SPECI reports omit sea-level pressure, and a SPECI can be the newest observation. The
// trend still resolves because it comes from the series, not the newest record alone, so
// it must render even when the absolute reading can't — never the literal string "undefined".
const describePressure = ({ observation, tendency }) => {
    const trend = describeTrend(tendency)
    return observation.pressureHpa === undefined ? trend : `${observation.pressureHpa} hPa   ${trend}`
}

const buildThunderBar = ({ document, hour, percent }) => {
    const bar = document.createElement('li')
    bar.className = 'thunder-bar'
    bar.style.setProperty('--percent', percent)
    bar.setAttribute('aria-label', `${HOUR_FORMAT.format(new Date(hour))} — ${percent}%`)
    return bar
}

const renderThunderBars = ({ document, thunder }) => {
    const bars = thunder.map(({ hour, percent }) => buildThunderBar({ document, hour, percent }))
    document.querySelector('.thunder-bars').replaceChildren(...bars)
}

export const render = ({ document, model, now = Date.now() }) => {
    const { observation, tendency, thunder } = model
    const write = (selector, text) => {
        document.querySelector(selector).textContent = text
    }

    write('.ambient-primary', `${observation.temperatureFahrenheit}F   ${observation.wind}   ${observation.visibility} mi`)
    write('.ambient-clouds', observation.clouds)
    write('#dewpoint', `${observation.dewpointFahrenheit}F`)
    write('#pressure', describePressure({ observation, tendency }))
    write('#cloud-base', `Cloud base ~ ${observation.cloudBaseFeet} ft`)
    write('#age', `${observation.stationName} - ${describeAge({ now, observedAt: observation.observedAt })}`)
    write('#provenance', `tendency: ${tendency.provenance} (${tendency.windowHours}h)`)

    renderThunderBars({ document, thunder })
    document.querySelector('#thunder').hidden = thunder.length === 0
}
