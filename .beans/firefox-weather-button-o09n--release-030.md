---
# firefox-weather-button-o09n
title: Release 0.3.0
status: completed
type: task
priority: normal
created_at: 2026-09-02T17:52:43Z
updated_at: 2026-09-04T14:29:45Z
---

The wind feature is sitting under `## [Unreleased]` in the changelog and `manifest.json` still says 0.2.0. Additive, no public surface removed or changed incompatibly, so a minor bump.

## Todo

- [x] Run the versioning-with-semver skill against the unreleased entries to confirm minor
- [x] Bump the version in `manifest.json` and `package.json`
- [x] Move the Unreleased entries under a `## [0.3.0]` heading with the date
- [x] Tag

## Summary of Changes

0.2.0 to 0.3.0. The unreleased entries add the wind plaque, the compass dart, and the painted cloud sky, and reshape the popup and the button; nothing was removed from a public surface, so a minor bump under the project's own 0.x convention.

The version moved in `manifest.json`, `package.json`, and the root entries of `package-lock.json`. The changelog's `## [Unreleased]` block became `## [0.3.0] - 2026-09-04` with a fresh empty Unreleased above it. Suite green at 179/179 before the commit. Tagged `v0.3.0`.

The surfaces this release ships are the ones 0.4.0 redraws, so 0.3.0 is the last cut of the plaque panel and the compass-dart button.
