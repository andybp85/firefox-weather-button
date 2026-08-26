const ARROWS = { falling: '↓', rising: '↑', steady: '→' }
const HOUR_FORMAT = new Intl.DateTimeFormat(undefined, { hour: 'numeric' })
const MILLISECONDS_PER_MINUTE = 60_000
const PLACEHOLDER = '—'

// The one place every element id popup.html carries is spelled out — render() and
// renderUnavailable() both write through this, rather than each holding its own copy of the
// selector strings, so a rename can't silently desync the two (renderUnavailable previously
// lived in popup-main.js with its own hand-copied selectors, untested and unenforced).
const SELECTORS = {
    ambientClouds: '.ambient-clouds',
    ambientPrimary: '.ambient-primary',
    age: '#age',
    cloudBase: '#cloud-base',
    dewpoint: '#dewpoint',
    pressure: '#pressure',
    provenance: '#provenance',
    thunder: '#thunder',
    thunderBars: '.thunder-bars',
}

const write = ({ document, selector, text }) => {
    document.querySelector(selector).textContent = text
}

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
    document.querySelector(SELECTORS.thunderBars).replaceChildren(...bars)
}

export const render = ({ document, model, now = Date.now() }) => {
    const { observation, tendency, thunder } = model

    write({
        document,
        selector: SELECTORS.ambientPrimary,
        text: `${observation.temperatureFahrenheit}F   ${observation.wind}   ${observation.visibility} mi`,
    })
    write({ document, selector: SELECTORS.ambientClouds, text: observation.clouds })
    write({ document, selector: SELECTORS.dewpoint, text: `${observation.dewpointFahrenheit}F` })
    write({ document, selector: SELECTORS.pressure, text: describePressure({ observation, tendency }) })
    write({ document, selector: SELECTORS.cloudBase, text: `Cloud base ~ ${observation.cloudBaseFeet} ft` })
    write({
        document,
        selector: SELECTORS.age,
        text: `${observation.stationName} - ${describeAge({ now, observedAt: observation.observedAt })}`,
    })
    write({ document, selector: SELECTORS.provenance, text: `tendency: ${tendency.provenance} (${tendency.windowHours}h)` })

    renderThunderBars({ document, thunder })
    document.querySelector(SELECTORS.thunder).hidden = thunder.length === 0
}

// The footer is a requirement on every code path, including this one: a user who has never
// successfully loaded data still sees why, rather than a blank popup. Shares SELECTORS with
// render() above so the two can't drift — see the comment on SELECTORS for why that matters.
export const renderUnavailable = ({ document, reason }) => {
    write({ document, selector: SELECTORS.ambientPrimary, text: PLACEHOLDER })
    write({ document, selector: SELECTORS.ambientClouds, text: '' })
    write({ document, selector: SELECTORS.dewpoint, text: PLACEHOLDER })
    write({ document, selector: SELECTORS.pressure, text: PLACEHOLDER })
    write({ document, selector: SELECTORS.cloudBase, text: PLACEHOLDER })
    write({ document, selector: SELECTORS.age, text: `no observation available — ${reason}` })
    write({ document, selector: SELECTORS.provenance, text: 'tendency: unavailable' })
    document.querySelector(SELECTORS.thunder).hidden = true
}
