// The compass dart the toolbar button draws for a notable wind, in the 64-unit face the
// artboards were drawn in. Station-model barbs were tried here first and lost: at 16 device
// pixels a barb is under two pixels wide, so the mark that survives has to be one bold shape.
//
// The notched tail and the absent shaft are what make it read as a compass needle rather than
// as an arrow. An arrow at this size is mostly shaft, and the shaft is the part that vanishes.
const DART = { notch: 7, tip: 16, wingBack: 14, wingOut: 13 }

// A wind with no bearing still has a speed. The button draws this ring in the force colour in
// place of the dart: it reports the speed and claims no heading, which is the honest reading of
// a VRB report. The panel's plaque answers the same case with barbs and no shaft.
export const DIRECTIONLESS_RING = { radius: 10, stroke: 6 }

// The dart flies downwind, the map convention: a north wind points down the face. The panel's
// barbs point the other way, toward the source, because that is the station-model grammar an
// enthusiast already reads. The split is deliberate and is recorded in the design spec.
const DOWNWIND_DEGREES = 180

const radians = degrees => (degrees * Math.PI) / 180

// Wound tip, right wing, tail notch, left wing, so a canvas path or an SVG polygon closes
// correctly straight off the list. `centre` and the result are in the caller's own units, and
// `scale` carries the 64-unit face into them.
export const dartPoints = ({ centre, fromDegrees, scale }) => {
    const heading = radians(fromDegrees + DOWNWIND_DEGREES)
    const forward = { x: Math.sin(heading), y: -Math.cos(heading) }
    // Screen right of `forward`, with y running down the face.
    const right = { x: Math.cos(heading), y: Math.sin(heading) }

    const at = ({ across, along }) => ({
        x: centre.x + scale * (along * forward.x + across * right.x),
        y: centre.y + scale * (along * forward.y + across * right.y),
    })

    return [
        at({ across: 0, along: DART.tip }),
        at({ across: DART.wingOut, along: -DART.wingBack }),
        at({ across: 0, along: -DART.notch }),
        at({ across: -DART.wingOut, along: -DART.wingBack }),
    ]
}
