---
# firefox-weather-button-ymj9
title: Parse the WMO 5appp pressure character code
status: draft
type: feature
priority: deferred
created_at: 2026-09-02T17:52:44Z
updated_at: 2026-09-02T17:52:44Z
---

From the design spec's *Future work*, carried into the tracker so it is findable.

Parse `5appp` out of `rawOb` to recover the shape of the 3-hour pressure change, not merely its magnitude — whether it rose steadily, rose then fell, fell then rose, and so on. The button draws one of three glyphs today; the character code is what the report actually says happened.
