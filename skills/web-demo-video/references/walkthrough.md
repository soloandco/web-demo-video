# Walkthrough (recording style)

`starter/lib/recorder.mjs` opens the app in headless Chrome, draws an overlay layer (caption, cursor, click ripple, highlight ring, corner badge, full-screen card) and collects screencast frames, then encodes them to MP4.

## API

```js
import { createRecorder, concatParts, sleep } from './lib/recorder.mjs'

const r = await createRecorder({
  url: 'http://localhost:3000/tasks',   // or file://
  readyText: 'This week',               // wait for this text
  width: 1280, height: 720,             // CSS viewport; output is 2560 wide either way
  framesDir: '.frames/part1',
  theme: { accent: '#2563EB', logo: '/logo.svg' },
  hideTexts: ['Dev tools', 'Chat with us'],   // buttons/links hidden while filming
})
await r.card('Still hunting for <em>one task</em>?')   // cards start visible
await r.start()                 // frames start here
await sleep(3000)
await r.hideCard()
await r.caption('Type a word to <b>filter the list</b>')
await r.click('#search')        // cursor glides there, ripple, real click
await r.type('#search', 'invoice')
await r.ring('#rows')           // highlight; r.ring(null) removes it
await r.badge('Admin view')     // corner label; r.badge('') hides it
await r.scrollInto('#details', { mode: 'top', offset: 160 })
await r.finish('out/part1.mp4')
concatParts(['out/part1.mp4', 'out/part2.mp4'], 'out/walkthrough.mp4')
```

`r.page` is the Puppeteer page for anything else (waitForSelector, keyboard, uploads).

## Scene pattern

| Part | Content |
|---|---|
| Intro (3~4 s) | Card with the problem in one line |
| Body (30~45 s) | Real interaction. One caption and at most one highlight per step |
| Ending (3~4 s) | Card with the result line and logo |

- Move the cursor slowly (the default glide is ~0.9 s) and click only after it arrives
- One highlight ring at a time. For big targets (tables, dialogs) ring a part that fits on screen
- Leave 1.5~2.5 s after something changes so viewers can read it

## Pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| First frames are a white card | Cards start visible so the intro does not flash the app | Call `hideCard()` even in parts without an intro |
| Scrolling does nothing | The app scrolls an inner panel, not the window | `scrollInto()` finds the nearest scrollable parent |
| Tables and sidebars cut off | Viewport too narrow for a dashboard | Record admin screens at 1920x1080; keep narrow centred pages at 1280~1440 |
| A click does nothing after closing a dialog | An invisible backdrop is still on top | Check `document.elementFromPoint(x, y)`, press Escape until no backdrop remains |
| Caption hides the button being clicked | Buttons along the bottom edge | Clear the caption during that click, or scroll the button up first |
| Dev-only buttons appear | Local dev build | `hideTexts` |
| Logo appears late in the ending | Image loads on first use | Set `theme.logo`; the recorder preloads it |
| Page reloads mid-recording | Dev server hot reload after you edited a file | Finish edits, then record |
| Real data on screen | Filming against a live account | Seed fake data or intercept API calls; never film production data |

## Faking the backend

If a screen needs server data, serve fixed fake responses (request interception in Puppeteer, a mock server, or a fixture mode in the app). Read what the UI expects from each response in the code, and match that shape. When handing over, list which parts were faked.
