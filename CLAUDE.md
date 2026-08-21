# Arcanum

An offline workout logger. One HTML file, no build step, no account, no server.

Ships as two halves:
- **Web** — GitHub Pages serves `main`. This is the half that gets tested.
- **Android** — a Capacitor wrapper (`com.edsolano.arcanum`) loading the same URL. Not in this repo.

`index.html` is ~800KB and contains everything: markup, one `<style>` block, one `<script>` block.
That is deliberate — it is why the app works offline as a single artifact — and it is also the
main constraint on how to work in it. See **Traps** below before editing.

---

## Working agreement

- **Push without asking.** Commit and push finished work to `main` directly. Never branch — Pages
  serves `main`, so a branch never reaches the phone.
- **Bump both versions every time.** `APPV` in `index.html` and `CACHE` in `sw.js`. The service
  worker will serve the old build otherwise. `v4.9` is followed by `v4.10`, not `v4.91`.
- **End every reply with a TLDR and the build number** to look for.
- **The user is not a coder.** Short answers by default; they will ask for detail.
- **Only the Forge theme is in scope** until v5.0. Obsidian, Frost and Moonwell are frozen —
  check whether a selector is theme-scoped before changing it.

## Verifying

Rendering claims cannot be verified in a desktop browser. Both are Chromium, so the numbers always
look right and have been wrong three separate times.

The phone is adb-paired. **adb lives at `C:\Android\Sdk\platform-tools`** — not on PATH, not under
`%LOCALAPPDATA%`. A working raw-socket CDP client is saved at
`~/.claude/projects/<this project>/memory/cdp.js`:

```bash
export PATH="/c/Android/Sdk/platform-tools:$PATH"
adb shell cat /proc/net/unix | grep -o 'webview_devtools_remote_[0-9]*'
adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
curl -s http://127.0.0.1:9222/json/list          # get the ws:// url
node cdp.js "<wsUrl>" "APPV"
```

A **cold start** is the only way to see launch behaviour — a reload runs with the window already
settled. `adb shell am force-stop com.edsolano.arcanum && adb shell am start -n com.edsolano.arcanum/.MainActivity`,
then re-forward, because the WebView process is new.

Clear the service worker over CDP before testing a new build, or the phone serves the old one.

---

## Traps

**1. The same CSS class is declared twice.** Far apart, and the later one wins. A new rule can have
no effect at all and it looks like the CSS "didn't apply". Hit three times in one session
(`.mk-row`, `.mk-inv`, `.mk-rt`). Before restyling anything that exists:

```bash
grep -n "^\.classname" index.html
```

Two hits means delete the stale one — do not reorder or raise specificity.

**2. There is no syntax check between an edit and the phone.** A broken file ships as a blank app.
Run this before every push:

```bash
node -e "
const fs=require('fs');const s=fs.readFileSync('index.html','utf8');
let i=0,n=0,bad=0;
while((i=s.indexOf('<script',i))>=0){const gt=s.indexOf('>',i),c=s.indexOf('</script>',gt);n++;
  try{new Function(s.slice(gt+1,c));}catch(e){bad++;console.log('block '+n+':',e.message);}i=c+9;}
console.log(bad?'FAILED':'all '+n+' blocks parse');"
```

**3. Scripted edits mangle escapes.** Prefer the Edit tool with literal text. When a generator is
unavoidable, never write `'\\n'` inside a heredoc or `node -e` string — the shell and JS layers
each eat one level and it lands as a real newline inside a string literal, which is a syntax
error. Use `String.fromCharCode(92)+'n'`. Same for `\'`.

**4. `hidden` loses to any author `display` rule.** `[hidden]` is `display:none` in the UA sheet
only. An element with `display:flex` in the stylesheet ignores it completely.

---

## Vocabulary

Getting these wrong is what made the builder confusing, so they are settled:

| Term | Means |
|---|---|
| **Day** | A weekday. Seven exist, Sunday to Saturday. You cannot add one. Holds up to `DAY_MAX` (3) workouts. |
| **Workout** | The thing you build and place on a day. "Add" refers to this. |
| **Workout item** | One exercise inside a workout — its measure, sets and per-set rest. |
| **Workout builder** | The `#make` screen. Not "day builder". |

One exception: copy where "day" means *the day's session* stays — "this day stays open until you
finish it" is correct English about a different thing.

---

## Structure

### Screens
`#splash` (launch) → `#welcome` (first run only) → `#home` (the week) → `#session` (logging) /
`#make` (the workout builder). `#bg` is the ambient ground behind everything. Sheets are `.ovl`.

### Data
- `DB` — everything the user owns. `logs`, `active` (open sessions), `custom` (their workouts),
  `cex` (their exercises), `days` (weekday → workout ids), `extra` (the shelf), `exNotes`, `walks`.
  Persisted through `Store` (artifact storage → localStorage → memory).
- `EX` — the exercise library. `cardio:1` marks cardio; `inv:1` marks assisted (less weight is
  better, and grading, readiness and level-up all invert on it); `bw:1` marks bodyweight.
- `W` — workout definitions. `sections:[{title, ss, rows}]` where a row is `[exId,{sets,rest}]`.
- `MK` — the builder's working copy. **Flat `rows[]`**, not sections. Each row: `id, n, w, r,
  unit, lines[], rest, g` (group id), `k` (stable key for drag).

### The builder's model
- `sets` is one line per set, and lines may differ — `"135x10\n155x8\n175x6"` is a pyramid.
- `rest` is parallel: one value applies to all sets, a newline-joined list gives one per set.
  `restAt(rest, i)` is the only thing downstream that knows this.
- A **superset/circuit** is a shared `g` on consecutive rows, up to `SS_MAX` (6). Consecutive is
  load-bearing: it is the only way sections can express it.
- `mkBuild()` collapses the flat list back into `sections` on save, so nothing downstream changed.
- Units: `wr` (weight×reps), `reps`, `sec` for lifting; `min`, `cal` for cardio. The workout's
  `kind` (`lift`/`cardio`) decides which are offered.

### Saving
The workout is created first (name/kind/day), then filled. From creation onward every change
writes through — `mkTouch()`, debounced 500ms. There is no "unsaved" state in the builder.

---

## Open decisions

1. **Two editors.** The builder (`#make`) and the in-session hold-menu (`exEditOvl`) edit the same
   nouns with different controls, and the session one is stale — it has no per-set targets, no
   unit control, and reorders only inside a superset. Recommendation: unify the *component* (the
   same workout-item card in both) and ask "this week or just today?" once on the way out of a
   session, rather than merging the modes. **Do not update `exEditOvl` piecemeal** — that work is
   thrown away if this happens.
2. **Analysis features.** v1 shipped in v4.136: the Progress sheet's exercise rows now open
   into est 1RM (Epley on the session's top set), volume last/best, and an SVG line chart per
   exercise — assisted work charts assistance falling, timed work charts the hold. Still open:
   day/week-level volume trends, and richer charts if v1 earns them. Full gap analysis against
   Hevy/Strong/Jefit exists as a published artifact.
3. **Kilograms.** The toggle shipped in v4.141 as a display skin: storage stays pounds
   forever, the Units toggle (Settings) converts at render and converts input back exactly
   once. Session inputs carry the exact pound value in `data-lb` while showing kg — that is
   what stops a 145 lb target round-tripping through "66 kg" into a 145.5 phantom PR.

   **Committed: kg users are first-class, not a conversion afterthought.** They get the
   same experience as lb users and never do mental math to make their numbers fit. This is
   the standard approach across weight-measuring software (lifting apps, scales, health
   apps): one canonical unit internally, conversion only at the edges, and — the part that
   separates good from lazy — every number the app GENERATES is produced natively in the
   user's unit, so suggestions always read as round, natural values in their world. The
   remaining build-out, in order:
   - **First run asks the unit** before any number is shown — a step in the welcome/forging
     ritual, not a setting to discover later.
   - **The generator speaks the unit**: in kg mode the wizard computes starting weights as
     natural kg (the bar is 20 kg, not 20.4; rounding is to 2.5 kg, not 5 lb) and stores
     the exact lb equivalent. A kg user's first week must look like a kg coach wrote it.
   - **Plate-math fallback goes unit-aware**: level-up steps of 2.5/5 kg in kg mode
     (learned machine lattices are already unit-agnostic and need nothing).
   - Storage stays canonical-lb throughout — no data migration, ever.
