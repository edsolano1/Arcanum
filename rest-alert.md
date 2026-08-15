# The rest alert — handoff

> **Dropped in v4.23, deliberately.** After about a day and a half on it, the backgrounded alert
> no longer makes a sound of its own. Behind another app the alert is the notification and the
> vibration — Android owns both, neither competes for the speaker, and the entire audio-focus
> problem below goes with it. In front of you nothing changed: WebAudio always mixed happily and
> is still the alert.
>
> Everything the element path needed is still in `index.html` and simply unwired — `alertPreRoll`,
> `playAlertElement`, `alertGuard`, `buildRestWAV`, `armAlert`, `releaseAlert`, the phrases, the
> five-second rule. Putting it back is a handful of call sites: `alertPreRoll()` in `startTimer`,
> `playAlertElement()` in `restAlert`, `armAlert()` and `buildRestWAV()` in `initAudio`,
> `buildRestWAV(t)` in `applyTheme`.
>
> **Read the rest of this before re-wiring any of it.** The five-second rule is the part that must
> not be relearned — it cost the most to find and it is invisible until the music dies.
>
> What was never resolved: even at 3.6s and correctly filed as transient, the sound did not
> reliably fire from a hidden page on the device. The duck was solved; audibility was not.

**Solved.** The music was being stopped by the *length of the bell file*, not by anything the web
platform withholds. Read "The five second rule" before touching any alert audio; it is the one
thing in here that can silently bring the bug back.

Fixed in **v4.10 / `arcanum-v151`**. Device under test: **Galaxy Z Fold**, Chrome, app used both
as a tab and installed.

---

## What it has to do

A rest timer runs 45s–3min. When it ends the user must **hear** an alert, while they are in
another app — in practice Spotify plus a muted mobile game, at the gym.

1. The alert must sound with Arcanum in the background.
2. **The user's music must survive.** Dipping while the bell rings is fine. Stopping is not.

One environmental fact: **the phone's ringer is on silent or vibrate, media volume ~25%.**
Anything on the notification/ringer stream is inaudible by definition. Only the **media stream**
can be heard.

---

## The five second rule

Chrome does not treat all media the same. Before it asks Android for audio focus it classifies
the resource **by its duration** (Chromium, `media/base/media_content_type.cc`,
`kMinimumContentDuration = 5000ms`):

| duration | Chrome files it as | what it asks Android for | what Spotify does |
| --- | --- | --- | --- |
| **5s or less** | transient | `AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK` | dips, then comes back |
| **over 5s** | persistent | `AUDIOFOCUS_GAIN` | stops dead, stays stopped |

The polite focus type the whole document used to say was unreachable is reachable. It is not an
API you call — it is a consequence of how long your file is.

The bell was **5.85s**. Eight tenths of a second over the line, and that is the entire bug.

Two things in the old notes were the tell, both misread at the time:

- **The leftover media notification with a play button.** Chrome only builds one of those for a
  *persistent* session. It was not a side effect of the bug; it was Chrome saying which bucket it
  had put the clip in. If it comes back, the classification has gone wrong again.
- **The old silent keep-alive dimmed the music for two minutes and never stopped it.** A dim is a
  duck. Short clip, transient focus. Same page, same phone, same Chrome — the only difference was
  length.

**Never let an alert file reach five seconds.** Nothing warns you. The music simply starts dying
again, some later build, with nothing in the log to explain it.

### Where every theme stands

| Theme | Alert source | Duration | Before v4.10 |
| --- | --- | --- | --- |
| Obsidian | rendered WAV, `phraseDark` — a struck inkwell, three times | 3.60s | 5.85s MP3 — **stopped the music** |
| Tundra | rendered WAV, `phraseLight` — an ice pick, three times | 2.00s | the same 5.85s MP3 — **stopped the music** |
| Forge | `HAMB64` recording | 1.62s | fine, and always was |
| Moonwell | rendered WAV | 3.60s | fine, and always was |

Forge and Moonwell were never broken. That is not luck — they were the two themes whose clips were
already under the threshold, and the split is what confirmed the diagnosis before a line changed.

---

## What v4.10 does

1. **Obsidian and Tundra no longer play a recording.** Both alerts are synthesised and rendered
   offline into a WAV data URI at the first tap, the way Moonwell already did it — `buildRestWAV`,
   next to `buildMoonAlert`. Nothing is added to the file on disk; it is built at runtime.
2. **The live and background alerts are now the same sound.** `phraseDark` and `phraseLight` run
   live on the context when the app is in front of you and render offline when it is not. What you
   hear with the phone in your pocket is what you hear in Settings.
3. **Tundra has its own voice** instead of borrowing Obsidian's. Both alerts have been through a
   round of listening since: Obsidian is a struck inkwell, Tundra an ice pick driven into ice,
   three strikes each. Whatever they become, the partials want to land in the 2.6–4kHz window the
   alert has always been aimed at — that is what carries across a gym.
4. **Settings → Sound check plays the element**, which is what its comment always claimed and its
   code never did — it called `sfxRest()`, i.e. WebAudio, the path that mixes with music happily
   and was never in the fight. Every "it didn't dip at all" reading came from testing the wrong one
   of the two. Start Spotify, press **Rest over**, and you know inside three seconds.
5. **The rest log records `dur=`.** If that ever reads 5 or more, the bug is back.

The synthesis helpers (`bellOn`, `nzOn`, `breathOn`, `iceOn`) now take their context, destination
and noise buffer as arguments so one phrase can be built live or offline; `bell`, `nz` and `breath`
are unchanged wrappers that hand them the live ones.

---

## Verified locally, and what still needs the device

Measured in Chrome by rendering the shipped `buildRestWAV` and reading back the element:

```
dark   duration=3.60s  sounds for 3.16s  peak=0.90  clipped samples=0  tail=0
light  duration=2.00s  sounds for 1.57s  peak=0.90  clipped samples=0  tail=0
```

Tundra's is deliberately the shorter of the two: it re-strikes inside the five-second guarded
window rather than ringing once and hanging.

Peak and clipping are worth keeping an eye on. The limiter's 1ms attack cannot catch the front of a
bell strike, so about a hundred samples per render were coming out past full scale and being
flattened by the WAV writer, which clamps hard. There is a tanh curve after the limiter now, and a
trim under it that lands the peak at 0.9 with nothing clipped.

**Still needs the Z Fold**, and cannot be answered from a desk: whether Spotify actually ducks and
resumes. What to check on one rest, backgrounded:

- The music dips at the bell and **comes back up**.
- **No Arcanum media notification with a play button is left in the shade.** It should not appear at
  all now. Its absence is the visible proof that the focus type changed.
- `Settings → Rest log` shows `dur=3.6` (or `3` on Tundra) at the ZERO line.

If it still stops: `adb logcat | grep -i audiofocus` on one rest shows exactly which focus type
Chrome asks for and what Android grants. That has still never been run, and it is the only way to
see the mechanism rather than infer it from behaviour.

---

## Already tried — do not redo

| Approach | Result |
| --- | --- |
| `navigator.audioSession = ambient/transient` | **Unsupported on device.** `navigator.audioSession` is `undefined`; every call is a guarded no-op. Not needed any more — duration gets you the same focus type. |
| Notification with `silent:false` | Fires and vibrates, but notification sound is on the **ringer** stream — inaudible with the phone on silent. |
| `<audio>` `play()` at zero, backgrounded | Refused. Chrome blocks playback starting in a hidden page. Still true; the muted pre-roll is what gets round it. |
| Pre-roll **audible** (vol 0.0001) from the tap | Element was `paused=true` 15s in — Android reclaimed the speaker as soon as Spotify was fronted. |
| Pre-roll **muted** from the tap | **Survives.** Still `paused=false` at 15s and 30s. Music untouched. This is the current design and it stays. |
| Shortening the *audible window* | Does nothing on its own. The classification is on the declared duration of the resource, not on how long you let it sound. Shorten the **file**. |
| Notification Triggers (`showTrigger`) | Never shipped in stable Chrome. No local scheduling exists. |
| Web Push | Solves scheduling, which already works. Cannot make sound on the media stream. |
| TWA / Bubblewrap / Capacitor shell | No longer needed. It was the only known-good route while the focus type looked unreachable; it is a large change to a single-file web app and the five second rule makes it unnecessary. |

---

## How the current mechanism works

In `index.html`, search `alertPreRoll`. Unchanged by this fix, and still the reason the alert can
sound at all from behind a game:

1. **`armAlert()`** — on the first tap anywhere, the alert `<audio>` element is played once while
   muted and paused again, spending a user gesture so it may play later.
2. **`alertPreRoll()`** — called from `startTimer()`, inside the tap that logs the set, while the
   page is still visible. Starts the element **muted**, `loop=true`, at target volume.
3. It stays muted and playing for the whole rest. Muted playback takes no audio focus, so the music
   is untouched and Chrome does not pause it.
4. **`playAlertElement()`** at zero sets `muted=false`. No `play()` call — the element never
   stopped — so there is nothing for the autoplay policy to refuse.
5. **`alertGuard()`** watches for five seconds and re-plays the element whenever something pauses
   it.

Step 4 is where the music used to die: the unmute claims focus, and what *kind* of focus it claims
is decided by the length of what is loaded.

---

## Things that will waste your time

- **Checking the user's settings.** Notification permission granted, sound and vibration allowed,
  DND off, in-app "Sound check" on, alert volume 5/10. All verified repeatedly.
- **Assuming the tab is frozen.** It is not. The notification fires on time from page JS at zero.
- **Assuming muted media gets dropped in the background.** Measured: it does not. It is audible
  media that gets paused.
- **The notification route for audibility.** It works, it vibrates, it is on the wrong stream.

---

## Left to clean up

- `loadBell()` and `bellBuf` are gone — they decoded 93KB of MP3 on every init into a buffer
  nothing read. `BELLB64` itself survives as the element's last-resort source if the offline
  render has not landed, and the rest log says so out loud when that happens. Dropping it too
  would take ~124KB of base64 out of `index.html`, at the cost of the one path that must never be
  silent; that is a trade worth making deliberately, not by accident. `HAMB64` stays regardless,
  because Forge still plays it.
- `bell()` / `bellOn()` and `iceOn()` are unused as of v4.13 — they are the alerts Obsidian and
  Tundra had before this round, kept while the sound design is still moving. If the phrases settle,
  they go.
- `Settings → Rest log` and the `rlog()` calls are temporary. Keep them until the ducking is
  confirmed on the device, then take them out — except `dur=`, which is worth keeping wherever it
  ends up living.
- The sound bench is gone as of v4.13. It cost more than it returned — the candidates it was
  auditioning are now the real cues, and changes get requested one at a time instead.
- Version discipline: `APPV` in `index.html` is a label the user owns the major digit of; `CACHE` in
  `sw.js` must only ever increase, and the two are deliberately unrelated.
