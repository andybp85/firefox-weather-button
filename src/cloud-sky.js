// The cloud plaque's sky, in the 136x112 box the artboard used. The plaque paints the reported
// layers at their heights and the computed base as a dashed line under them, so a reader can
// compare the two in one look — that comparison is the whole reason the plaque has a picture.
const PLOT = { foot: 112, ground: 106, width: 136 }

// A square-root height scale, not a linear one: linearly, everything below 5,000 ft — where
// almost every reported ceiling lives — piles into the bottom eighth of the plaque. The ceiling
// is where the text block's bottom edge falls, so a layer at 30,000 ft still clears the words.
const CEILING_FEET = 30000
const SCALE_HEIGHT = 40

// The low/mid boundary of the international cloud atlas. At or above it a layer takes the
// further colour (--panel), below it the nearer one (--raised). Two of the atlas's three tiers
// collapse into one colour: a third tone is more than a 112px plaque can carry.
export const HIGH_CLOUD_FEET = 6500

// Coverage sets how many puffs a row has and how wide each is, as a fraction of the plot's
// width. OVC is not simply more puffs: an overcast sky has no gaps, so it is drawn as a lid.
const COVERS = {
    BKN: { count: 2, fraction: 0.375 },
    FEW: { count: 1, fraction: 0.2 },
    SCT: { count: 2, fraction: 0.225 },
}

// A puff is a base ellipse with three circles rising off it, every radius scaled from the puff's
// own half-width so one shape serves a 27-unit FEW puff and a 51-unit BKN one. The vertical
// offsets are deliberately fixed: a taller puff at height reads as a nearer one, which is the
// opposite of what the plaque is saying.
const PUFF_ELLIPSE = { drop: 2.16, ry: 4.32 }
const PUFF_CIRCLES = [
    { across: -0.4, radius: 0.248, rise: 0.72 },
    { across: 0.15, radius: 0.31, rise: 2.88 },
    { across: 0.6, radius: 0.187, rise: 0 },
]

// The lid overhangs both edges of the plot so no seam shows at the plaque's rounded corner, and
// runs down to the foot so nothing is visible beneath an overcast sky.
const LID = { centres: [10.88, 35.36, 62.56, 89.76, 116.96], left: -4, radius: 7.92, right: 140, rise: 2.88 }

export const skyHeight = feet => PLOT.ground - SCALE_HEIGHT * Math.sqrt(Math.min(feet, CEILING_FEET) / CEILING_FEET)

// n puffs and n + 1 equal gaps, which centres a one-puff row without a special case for it.
const puffCentres = ({ count, width }) => {
    const gap = (PLOT.width - count * width) / (count + 1)
    return [...Array(count).keys()].map(index => gap * (index + 1) + width * (index + 0.5))
}

const puffRow = ({ cover, y }) => {
    const { count, fraction } = COVERS[cover]
    const width = PLOT.width * fraction
    const rx = width / 2

    return puffCentres({ count, width }).reduce(
        (row, cx) => ({
            circles: [
                ...row.circles,
                ...PUFF_CIRCLES.map(({ across, radius, rise }) => ({ cx: cx + across * rx, cy: y - rise, r: radius * rx })),
            ],
            ellipses: [...row.ellipses, { cx, cy: y + PUFF_ELLIPSE.drop, rx, ry: PUFF_ELLIPSE.ry }],
            rects: [],
        }),
        { circles: [], ellipses: [], rects: [] },
    )
}

const overcastLid = y => ({
    circles: LID.centres.map(cx => ({ cx, cy: y - LID.rise, r: LID.radius })),
    ellipses: [],
    rects: [{ height: PLOT.foot - (y - LID.rise), width: LID.right - LID.left, x: LID.left, y: y - LID.rise }],
})

// VV reports how far up you can see through an obscuration, not a deck at a height, so drawing
// it as a layer would put a solid ceiling on the plaque where the sky is merely opaque. Any
// other cover this module has no shape for is left out for the same reason: a gap is a smaller
// lie than a guess on a plot whose whole subject is coverage.
const isDrawable = ({ cover }) => cover === 'OVC' || COVERS[cover] !== undefined

const toLayer = ({ baseFeet, cover }) => {
    const y = skyHeight(baseFeet)
    return { far: baseFeet >= HIGH_CLOUD_FEET, ...(cover === 'OVC' ? overcastLid(y) : puffRow({ cover, y })) }
}

// Layers arrive high to low from observation.js and stay in that order, so a consumer painting
// them in sequence lands the lower deck over the higher one, which is what a sky looks like.
export const cloudSky = ({ baseFeet, layers }) => ({ base: { y: skyHeight(baseFeet) }, layers: layers.filter(isDrawable).map(toLayer) })
