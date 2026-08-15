repo: edsolano1/Arcanum
branch: main
path: (repo root)

## Last sync
date: 2026-08-15
release: v4.32 (`APPV`) on `arcanum-v173` (`CACHE`)

This folder is the repository now. It was not before: files were uploaded through the GitHub
website, so the folder and the repo were unrelated copies and the folder was missing
`manifest.json`, `icons/` and `README.md` entirely. Editing and shipping are the same place from
here, which is why `.gitignore` exists and why `Arcanum.html` is back on disk - see the warning
about it further down. It is still stale and still a trap.

### v4.0 - v4.32 — the rest alert, and an Android app
The alert was the whole of this stretch. Chrome files any media longer than five seconds as
persistent playback and asks Android for permanent audio focus, which is what had been killing
Spotify: the bell was 5.85s. Under five seconds it asks for the transient kind that ducks. That
one fact is written up properly in `rest-alert.md`, which is the file to read before touching any
of it.

It ends in a different place than it started. Backgrounded sound from a web page turned out to be
unwinnable in every direction - even correctly filed as transient it would not reliably fire from
a hidden page - so the page stopped trying, and Arcanum is now also a Capacitor Android app
(`~/Desktop/Arcanum-Android`, `com.edsolano.arcanum`) that loads this live site. The app owns the
notification channel, so it owns the vibration pattern a web page can never set, and it plays the
alert itself on the media stream, where ringer mode has no say and no audio focus is requested -
so it mixes over music instead of stopping it.

**Two deploy paths now, and the order is not symmetric.** Web changes land on a push; native
changes need a rebuild and a reinstall. Ship the web change FIRST. Deleting a notification channel
in a build while the live site still named it made Android drop every notification silently.

Also in this stretch: the week became an ordered plan with drag-to-reorder and a bank for days
that are off it, backup and restore (the only way history moves between the browser and the app -
storage does not cross), Obsidian and Tundra resynthesised, and safe-area insets throughout,
because a WebView draws under the system bars where a browser tab did not.

### v3.1 - v3.2, shipped unconfirmed
Steppers removed from the set sheet entirely; the value is typed, with the pad set per field -
decimal for weight, digits for reps and seconds. `stepsFor`, `CABLE_EX`, `XOVER_EX`, `edStep`,
`#edSteps` and `.edbtn` all deleted with them; `sfxTick` survives on its six other callers.
Tutorial step 4 copy rewritten in all four theme blocks, which named the steppers outright.

Reordering an exercise now needs a held press - 520ms and 8px, the same threshold the rest of
the app uses - because the drag began on touch-down and a brush moved the exercise.

Audio session claimed as `ambient` before the context exists, so what the app plays mixes with
music instead of taking it over; only the rest alert switches to `transient`, and only while it
sounds. This is the fix for both the two-minute duck and the pause-instead-of-dip: Android was
handing the page a playback session the moment it made a sound, and the silent keep-alive held
one for the entire rest. The keep-alive still runs the whole rest - it is the only thing keeping
the tab off Android's freezer - but it no longer costs the music anything.

Pull-to-refresh disabled: `overscroll-behavior-y:none` at the root, `contain` on every inner
scroller so reaching the top of a day cannot hand the gesture back up. A reload here is a full
boot, which mid-workout means losing your place.

**Unconfirmed and needs the device.** `navigator.audioSession` may not exist on the phone, in
which case every audio-session line above is a no-op. Settings > Sound check now prints whether
it is supported and what the type currently is - read that before drawing any conclusion. The
"Rest over" check was also playing on the ambient session, so it could never have dipped music
and would have read as broken; it now takes the transient session a real alert takes.

Still open: the alert does not fire when another app has focus. The rest notice cannot fix it -
`restDoneNotif()` posts from the running page and there is no `showTrigger` or push anywhere, so
it was never scheduled and inherits the same dependency. Real options are a push backend or
accepting the app must be foregrounded. Test whether the ambient session helps first.

### v3.0

`APPV` and `CACHE` are deliberately not the same count. `APPV` is a label the footer prints and
nothing else reads, so it may say anything and may go backwards — v21.2 became v3.0 here.
`CACHE` is what makes a device drop the build it is holding, so it only ever moves forward and
is never renumbered to match a release name. Reusing a cache name leaves phones serving a stale
shell, which looks exactly like a fix that did not work.

### Updated in this project
Six builds, v20.6 → v3.0, cache v124 → v131. Confirmed on a Z Fold unfolded.

**Render.** Six paint-expensive properties taken off boxes with moving children — the four in
the handoff, plus the watermark mask (all four themes, dropped above a 664px shorter side where
it provably clears the mark) and the orrery mask (Arcanum only, replaced with an equivalent
inverse gradient rather than removed, since it was doing visible work). The PR row's `prbreath`
`text-shadow` is off during the tour; it was only ever off for Frost. `#session` and `#make`
now hide and freeze the ground behind them the way `.ovl` always did — they are opaque and
full-screen but were never `.ovl`, so the whole ground kept painting behind them. That was the
day opening in two bands, and was never a tutorial bug.

**Tutorial.** Step 1 no longer shakes at a tap when it is waiting for nothing, and its copy was
rewritten in all four theme voices (there are four copy blocks, not one). Step 2 opens on the
whole week and closes the highlight onto Tuesday. Replayed steps now behave like first-pass
ones: a condition is armed unless it was already true on arrival, which frees every step but
the marked-set one, instead of freezing all of them. NEXT rebuilds the scene a skipped action
would have built. Sheets reopen if they go missing, the week-card hold is disarmed for the
whole tour, the exercise step fences its own set controls, and the rest timer restores itself.

## Sync history
- 2026-08-06T21:40:00Z — Session progress written through on every tap; `reconcileActive()` no
  longer deletes today's empty session; "Save & leave open"; swaps graded against the lift
  performed; rest alert rebuilt at 2.6–4kHz; first-ever set grades grey, not gold; ignition
  animation before export. `arcanum-v5` → `arcanum-v6`.
- 2026-08-06T06:45:00Z — Fixed `ReferenceError: pr is not defined` in `toggleSet`; save/done/
  timer moved ahead of effects; splash decoupled from IndexedDB with a 3.6s ceiling;
  `sw.js` → `arcanum-v5`.

## Screen map
| Screen / feature | Source |
| --- | --- |
| Whole app | index.html |
| Offline shell | sw.js |
| Install metadata | manifest.json, icons/ |

`Arcanum.html` is listed in older copies of this file as the local source of truth. No such file
exists on this machine — `index.html` is edited directly. If a copy does live elsewhere, changes
must be ported back into it or the next `Arcanum.html` → `index.html` copy silently reverts them.

## Verifying a render fix
It cannot be done here. There is no Python or Node on this machine to serve the file and the
browser pane refuses `file://`; a desktop GPU would not miss the frame budget anyway, so a clean
local run would prove nothing. Ship it and look at a Z Fold unfolded. What is worth checking
locally first: CSS brace balance, that new symbols resolve, and that `TUT_STEPS` and `TUT_SCENE`
are still the same length and aligned — a step added without its scene entry lands BACK on the
wrong screen.
