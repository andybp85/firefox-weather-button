// The wind speed at which a real windsock flies straight out. Below it the sock droops toward
// its mast in proportion, which is the whole reading: the angle is the speed.
export const FULL_LIFT_KNOTS = 45

// Every dimension is a fraction of the sock's reach — the distance from the mast to the tip of
// a fully lifted sock. The caller supplies that reach as `scale`, so one geometry serves the
// toolbar button's few device pixels and the popup's larger echo without being re-tuned.
// Every width here is bounded from below by the toolbar button, where the whole sock is about
// seven device pixels long: at the first proportions tried the mast came out under a pixel wide
// and disappeared, and the tip and the gust tick were not much better. They are drawn thicker
// than a sock really is because a mark too thin to survive rounding reports nothing at all.
const GUST_FAR = 1.3
const GUST_HALF_WIDTH = 0.09
const GUST_NEAR = 1.06
const MAST_HALF_WIDTH = 0.09
const MAST_LENGTH = 0.85
const MOUTH_HALF_WIDTH = 0.2
const QUARTER_TURN = Math.PI / 2
const TIP_HALF_WIDTH = 0.09

// The mast hangs from the pivot whatever the wind is doing, so it is fixed rather than computed.
const MAST = [
    { x: -MAST_HALF_WIDTH, y: 0 },
    { x: MAST_HALF_WIDTH, y: 0 },
    { x: MAST_HALF_WIDTH, y: MAST_LENGTH },
    { x: -MAST_HALF_WIDTH, y: MAST_LENGTH },
]

// Clamped at the top because a sock cannot rise above its mast: left to run on, a gale would
// swing the cone over the horizontal and read as a wind falling back toward calm.
const lift = knots => Math.min(knots / FULL_LIFT_KNOTS, 1)

// `along` runs from the pivot down the sock's own axis — straight down at calm, horizontal at
// full lift — and `across` is the perpendicular the cone's width is measured on.
const axes = knots => {
    const angle = lift(knots) * QUARTER_TURN
    const along = { x: Math.sin(angle), y: Math.cos(angle) }
    return { across: { x: along.y, y: -along.x }, along }
}

// One point of a polygon, `span` reaches along the sock's axis and `width` out to one side of it.
const pointAt = ({ across, along, span, width }) => ({
    x: along.x * span + across.x * width,
    y: along.y * span + across.y * width,
})

// Wound mouth-edge, tip-edge, tip-edge, mouth-edge so the far end is the middle pair: the sock's
// reach is the midpoint of those two, and consumers read the taper off the ends.
const cone = axes => [
    pointAt({ ...axes, span: 0, width: MOUTH_HALF_WIDTH }),
    pointAt({ ...axes, span: 1, width: TIP_HALF_WIDTH }),
    pointAt({ ...axes, span: 1, width: -TIP_HALF_WIDTH }),
    pointAt({ ...axes, span: 0, width: -MOUTH_HALF_WIDTH }),
]

// A short dash flying free beyond the tip, on the sock's axis. A gust is not a longer sock — it
// is the wind arriving in pieces — so it reads as something detached rather than as more cone.
const gustTick = axes => [
    pointAt({ ...axes, span: GUST_NEAR, width: GUST_HALF_WIDTH }),
    pointAt({ ...axes, span: GUST_FAR, width: GUST_HALF_WIDTH }),
    pointAt({ ...axes, span: GUST_FAR, width: -GUST_HALF_WIDTH }),
    pointAt({ ...axes, span: GUST_NEAR, width: -GUST_HALF_WIDTH }),
]

const place =
    ({ origin, scale }) =>
    ({ x, y }) => ({ x: origin.x + scale * x, y: origin.y + scale * y })

// The windsock as filled polygons, placed with its pivot at `origin` and sized by `scale`. It
// returns points rather than drawing them because its two consumers draw differently: the button
// fills paths on a canvas, and the popup emits the same points as SVG, which is the only one of
// the two a jsdom test can read back.
export const windsockPolygons = ({ gusting, knots, origin, scale }) => {
    const { across, along } = axes(knots)
    const toDevice = place({ origin, scale })

    return {
        ...(gusting ? { gust: gustTick({ across, along }).map(toDevice) } : {}),
        mast: MAST.map(toDevice),
        sock: cone({ across, along }).map(toDevice),
    }
}
