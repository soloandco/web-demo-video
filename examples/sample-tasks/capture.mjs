// Captures the UI states used by the motion video, plus element positions.
// Run from the repo root: node examples/sample-tasks/capture.mjs
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { openCapture } from '../../skills/web-demo-video/starter/lib/capture.mjs'

const APP = pathToFileURL(path.resolve('examples/sample-tasks/app/index.html')).href
const c = await openCapture({
  url: APP,
  readyText: 'This week',
  width: 1280,
  height: 720,
  outDir: 'examples/sample-tasks/motion/public/shots',
  rectsFile: 'examples/sample-tasks/motion/rects.json',
})
const { page, sleep } = c

// home: nothing selected
await c.rect('home', 'search', '#search')
await c.rect('home', 'export', '#export')
await c.textRect('home', 'doneCount', '#stat', '7')
await c.shot('home')

// search: "invoice" typed
await page.type('#search', 'invoice')
await sleep(300)
await c.rect('search', 'rows', '#rows')
await c.rect('search', 'row1', 'tr[data-task="1"]')
await c.shot('search')

// detail: first task opened
await page.click('tr[data-task="1"]')
await sleep(300)
await c.rect('detail', 'panel', '#detail')
await c.rect('detail', 'markDone', '#mark-done')
await c.shot('detail')

// done: task completed, weekly count is now 8
await page.click('#mark-done')
await sleep(500)
await c.rect('done', 'stat', '#stat')
await c.textRect('done', 'doneCount', '#stat', '8')
await c.shot('done')

// exported: toast visible
await page.click('#export')
await sleep(600)
await c.rect('exported', 'toast', '#toast')
await c.shot('exported')

await c.close()
