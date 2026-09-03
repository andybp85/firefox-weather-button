---
# firefox-weather-button-cj8j
title: test/popup-main.test.js fails intermittently
status: todo
type: bug
priority: normal
created_at: 2026-09-03T17:45:34Z
updated_at: 2026-09-03T17:45:34Z
---

A test in `test/popup-main.test.js` fails about once per session and does not reproduce. The suite total drops by exactly one; the next run is green.

## Evidence

Four sightings across four sessions, recorded in the task reports for Tasks 9, 10, 11, and 12 of the Kit panel and button plan (`docs/superpowers/reports/`). The sightings span commits d1d3477 through 3c5f163.

- After the Task 12 commit the suite reported 175/176, then passed 176/176 on 17 consecutive re-runs.
- Task 12 changed no file under `src/` or `test/`, so the failure is not caused by the change it followed.
- It has survived the whole 13-task run, which rules out any single task's code as the cause.

## Why it matters

An unexplained flake makes every green suite a weaker signal. It fires often enough to be seen and rarely enough to be waved through, which is the combination that eventually hides a real fault.

## Todo

- [ ] Capture the actual failure: which test, which assertion, and the reported vs. expected value. No report so far records the failing test's name.
- [ ] Run the file under repeat until it fires, and keep the output.
- [ ] Check the usual suspects for this shape: shared mutable module state between tests, a real clock or Date read, unawaited promises in the popup's render path, and test-order dependence (run the file alone, and with a shuffled order).
- [ ] Fix the cause, or, if it is a test-harness artifact rather than a product fault, record that finding and make the test deterministic.
- [ ] Add a regression test if the cause is a product fault.
