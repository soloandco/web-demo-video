// Walkthrough (recording style) for the Sample Tasks demo app.
// Run from the repo root: node examples/sample-tasks/record.mjs
// Output: out/sample-tasks-walkthrough.mp4 (2560x1440, 30 fps, silent)
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRecorder, sleep } from '../../skills/web-demo-video/starter/lib/recorder.mjs'

const APP = pathToFileURL(path.resolve('examples/sample-tasks/app/index.html')).href

const r = await createRecorder({ url: APP, readyText: 'This week', width: 1280, height: 720, framesDir: '.frames/walkthrough' })

// 1. Intro card (the card is visible when recording starts)
await r.card('Still hunting for <em>one task</em><br>in a long list?')
await r.start()
await sleep(3200)
await r.hideCard()
await sleep(700)

// 2. Search
await r.caption('Type a word to <b>filter the list</b>')
await r.click('#search')
await r.type('#search', 'invoice', 110)
await sleep(1200)
await r.ring('#rows')
await sleep(1800)
await r.ring(null)

// 3. Open a task
await r.caption('Click a task to <b>see its details</b>')
await r.click('tr[data-task="1"]')
await sleep(900)
await r.ring('#detail')
await sleep(2200)
await r.ring(null)

// 4. Complete it
await r.caption('Mark it done and <b>the weekly count updates</b>')
await r.click('#mark-done')
await sleep(800)
await r.showCursor(false)
await r.ring('#stat', '.summary')
await sleep(2600)
await r.ring(null)

// 5. Export
await r.caption('Export the list as <b>CSV</b> any time')
await r.click('#export')
await sleep(2200)
await r.showCursor(false)
await r.caption('')

// 6. Closing card
await r.card('Find it, finish it, share it.', 'Sample Tasks')
await sleep(3000)
await r.finish('out/sample-tasks-walkthrough.mp4')
