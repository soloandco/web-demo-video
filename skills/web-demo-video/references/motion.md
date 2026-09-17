# Motion promo (animation over screenshots)

Real screens, animated by code. Built with [Remotion](https://www.remotion.dev/) (React components rendered frame by frame).

## Pipeline

1. **Capture** every UI state you will show with `starter/lib/capture.mjs`: a 3840-wide screenshot per state plus element positions as fractions (0..1) in a JSON file
2. **Compose** in `motion/Main.tsx` using `motion/parts.tsx`
3. **Check stills** at the frames where something happens: `npx remotion still motion/index.ts Main out/f300.png --frame=300 --scale=0.25 --public-dir motion/public`
4. **Render**: `npm run render` (about 5 minutes per 45 s at 2560x1440 on a laptop)

Set `theme.ts` (accent, font, background) once; parts read colours from there.

## Capture API

```js
import { openCapture } from './lib/capture.mjs'
const c = await openCapture({ url, readyText: 'This week', width: 1280, height: 720,
  outDir: 'motion/public/shots', rectsFile: 'motion/rects.json' })
await c.rect('home', 'search', '#search')          // [x, y, w, h] fractions
await c.textRect('done', 'count', '#stat', '8')    // exact box, colour, font of a piece of text
await c.shot('home')                               // motion/public/shots/home.png
await c.page.click('...')                          // move the app to the next state
await c.close()
```

Keep one viewport size for all shots of a video. `textRect` works on text nodes, not on `<input>` values.

## Parts

| Part | Use |
|---|---|
| `Shot` + `CamKey[]` | Screenshot(s) under a camera. `states` crossfade between captures |
| `camAt`, `mapPt` | Where a screenshot point is on screen at frame f (to attach overlays to UI) |
| `enterWide(at, target)` | Keyframes that show a new screen whole, then move in |
| `Cursor` | Waypoints in screenshot space; stays on target while the camera moves. Repeat a waypoint to wait |
| `Captions` | Wipe-in captions, bottom or top |
| `Badge` | Corner label that flips when it changes |
| `WordReveal` | Intro / ending lines; optional strike-through on some words |
| `Chip`, `DocCard`, `SheetIcon` | Objects that travel: link copied, file uploaded, export |
| `NumberPatch` | Covers a number in the screenshot and counts it up |
| `ProgressDots`, `Burst`, `Impact` | Emphasis for "N of M", success, landing |
| `arc(a, b, t)` | Curved path between two points |

## Rules

1. **When the screen changes, show it whole first, then move in.** Arriving zoomed into a new screen leaves the viewer unsure where they are. Hold the full view ~0.5 s, then glide to the target
2. **Connect action to result.** Let the result of a click travel into the next screen (a copied link unfolds into the page it opens; a "submitted" chip lands in the counter it increments) instead of cutting to a new card
3. **Vary the movement.** Plan a different movement per scene in the storyboard. The same entrance and exit on every scene is what makes videos feel repetitive
4. **Leave reading time.** Motion first, then stillness. Large elements must not move while a caption is being read. Viewers called the first busy version "a bit hectic"
5. **Say what is staged.** A document flying into a form is a metaphor; say so when handing over

## Pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| Real number flashes before the count-up | Patch only drawn from the count start | `showFrom` = frame the screenshot appears |
| Ripple slides across the screen | Ripple follows the moving cursor | Built-in: ripples stay at the click position |
| Cursor leaves before clicking | Next waypoint starts right after arrival | Add the same waypoint again at click + 6 frames |
| Caption covers the target | Target near the bottom and camera clamped at the edge | Put that caption at `'top'` |
| Blurry zoom | Screenshot not wider than the video | Capture at 3840 wide, keep zoom under ~1.5x for sharp text (up to ~3x is acceptable in motion) |
| Silent AAC track in the file | Remotion adds audio by default | Render with `--muted` |
| `inputRange must contain only finite numbers` | An `Infinity` default reached `interpolate` | Guard with `Number.isFinite` |
| Render uses a downloaded browser | Remotion default | Pass `--browser-executable` to use installed Chrome |
