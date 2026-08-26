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

const describeElapsed = ({ now, observedAt }) => {
    const minutes = Math.round((now - Date.parse(observedAt)) / MILLISECONDS_PER_MINUTE)
    if (minutes < 60) return `${minutes}m ago`
    return `${Math.round(minutes / 60)}h ago`
}

// A reported or computed tendency already carries its sign for a fall (e.g. -1.2); only
// the positive case is missing one. Steady is exactly 0 and prints bare either way.
const describeHpaDelta = hPa => (hPa > 0 ? `+${hPa}` : `${hPa}`)

// windowHours is a display concern, not a domain one: resolveTendency's computed path rarely
// lands on an exact hour boundary (e.g. 2.98), and that decimal has no place in text meant to
// read as "3h" — round here rather than adding a defensive branch to tendency.js for it.
const describeWindowHours = tendency => Math.round(tendency.windowHours)

const describeTrend = tendency => `${ARROWS[tendency.direction]} ${describeHpaDelta(tendency.hPa)} / ${describeWindowHours(tendency)}h`

// AWC reports unlimited/unmeasured visibility as the string 'unreported' (see observation.js);
// appending "mi" to that reads as a bogus unit on a non-quantity, so the unit is dropped instead.
const describeVisibility = visibility => (visibility === 'unreported' ? visibility : `${visibility} mi`)

// The tendency's window can close well before the newest observation: a reported value comes
// from the 3-hourly synoptic METAR, which nws.js's 5-hour fetch can trail by more than the
// window is long. The design deliberately does not correct the trend for the semidiurnal tide;
// disclosing when the window actually closed is what it offers in place of that correction, so
// the age belongs beside the provenance rather than being inferred from the observation's.
const describeProvenance = ({ now, tendency }) =>
    `tendency: ${tendency.provenance} (${describeWindowHours(tendency)}h), ended ${describeElapsed({ now, observedAt: tendency.observedAt })}`

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

export const render = ({ document, model, now }) => {
    // now is required rather than defaulted to Date.now(), exactly as thunderSeries requires
    // it: a default keeps this module impure and, worse, silently dates the footer from a
    // clock the caller never chose. Every age in the popup must come from one pinned instant.
    if (now === undefined) throw new Error('render requires now')

    const { observation, tendency, thunder } = model

    write({
        document,
        selector: SELECTORS.ambientPrimary,
        text: `${observation.temperatureFahrenheit}F   ${observation.wind}   ${describeVisibility(observation.visibility)}`,
    })
    write({ document, selector: SELECTORS.ambientClouds, text: observation.clouds })
    write({ document, selector: SELECTORS.dewpoint, text: `${observation.dewpointFahrenheit}F` })
    write({ document, selector: SELECTORS.pressure, text: describePressure({ observation, tendency }) })
    write({ document, selector: SELECTORS.cloudBase, text: `Cloud base ~ ${observation.cloudBaseFeet} ft` })
    write({
        document,
        selector: SELECTORS.age,
        text: `${observation.stationName} - obs ${describeElapsed({ now, observedAt: observation.observedAt })}`,
    })
    write({ document, selector: SELECTORS.provenance, text: describeProvenance({ now, tendency }) })

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
