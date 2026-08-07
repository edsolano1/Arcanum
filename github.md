repo: edsolano1/Arcanum
branch: main
path: (repo root)

## Last sync
date: 2026-08-06T21:40:00Z

### Updated in this project
- Session progress is now written through on every tap (was a 250ms debounce that lost the last sets when Android froze the tab), with a `baseline:db:bak` mirror and a flush on background.
- `reconcileActive()` no longer deletes today's open session when it reads as empty — the cause of the wiped-day bug.
- Added "Save & leave open" so a partly finished day can be banked and resumed.
- Swapped exercises are graded and exported against the lift actually performed; completed logs store their swap map.
- Rest alert rebuilt on its own reverb-free, limited signal path at 2.6–4kHz, repeating 3×, with a Normal/Loud/Gym level control.
- A first-ever set on a lift now grades grey (`first`) instead of gold — a baseline to beat, not a record. PR counts and the `PR` export tag no longer fire on it.
- Session completion plays an igniting-diamond animation before the export sheet, with a matching ignition cue.
- `sw.js` cache bumped `arcanum-v5` → `arcanum-v6`.

## Sync history
- 2026-08-06T06:45:00Z — Fixed `ReferenceError: pr is not defined` in `toggleSet`; save/done/timer moved ahead of effects; splash decoupled from IndexedDB with a 3.6s ceiling; `sw.js` → `arcanum-v5`.

## Screen map
| Screen / feature | Source |
| --- | --- |
| Whole app | index.html (local copy: Arcanum.html) |
| Offline shell | sw.js |
| Install metadata | manifest.json, icons/ |
