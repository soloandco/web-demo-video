// Still captures for motion-graphics videos.
// Opens a real page, and for each UI state saves a high-resolution screenshot plus the
// positions of the elements you will animate (as fractions of the viewport, 0..1).
//
//   const c = await openCapture({ url, width: 1440, height: 810, outDir: 'motion/public/shots', rectsFile: 'motion/src/rects.json' })
//   await c.rect('home', 'search', '#search')
//   await c.shot('home')
//   await c.page.type('#search', 'invoice')
//   ...
//   await c.close()
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'
import { chromePath, sleep } from './recorder.mjs'

export { sleep }

/**
 * @param {object} o
 * @param {string} o.url
 * @param {string} [o.readyText]
 * @param {number} [o.width=1440]  CSS viewport; all shots of one video should share the same aspect ratio (16:9)
 * @param {number} [o.height=810]
 * @param {number} [o.pixelWidth=3840]  screenshot width. Wider than the video so the camera can zoom in without blur
 * @param {string} o.outDir     where PNGs go (the motion project's public/shots)
 * @param {string} o.rectsFile  JSON file that collects element positions for all shots
 * @param {string[]} [o.hideSelectors]  elements to hide before shooting (chat widgets, cookie banners)
 */
export async function openCapture({ url, readyText, width = 1440, height = 810, pixelWidth = 3840, outDir, rectsFile, hideSelectors = [] }) {
  fs.mkdirSync(outDir, { recursive: true })
  fs.mkdirSync(path.dirname(rectsFile), { recursive: true })
  const rects = fs.existsSync(rectsFile) ? JSON.parse(fs.readFileSync(rectsFile, 'utf8')) : {}
  const save = () => fs.writeFileSync(rectsFile, JSON.stringify(rects, null, 2))

  const browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: true,
    defaultViewport: { width, height, deviceScaleFactor: pixelWidth / width },
    args: ['--hide-scrollbars', '--force-color-profile=srgb'],
  })
  const page = await browser.newPage()
  page.on('pageerror', (e) => console.log('[pageerror]', e.message))
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 180000 })
  if (readyText) await page.waitForSelector(`::-p-text(${readyText})`, { timeout: 120000 })
  await page.evaluate(() => document.fonts.ready)

  const hide = () => page.evaluate((sels) => { for (const s of sels) for (const el of document.querySelectorAll(s)) el.style.setProperty('display', 'none', 'important') }, hideSelectors)

  /** Screenshot the current state as <name>.png */
  async function shot(name, { settle = 500 } = {}) {
    await hide()
    await sleep(settle)
    await page.screenshot({ path: path.join(outDir, `${name}.png`) })
    rects[name] = { ...(rects[name] || {}), size: [width, height] }
    save()
    console.log('shot', name)
  }

  /** Record where an element is in state <name>, as [x, y, w, h] fractions of the viewport. */
  async function rect(name, key, selector, closest) {
    const el = await page.waitForSelector(selector, { timeout: 20000 })
    const b = await el.evaluate((n, c) => { const t = c ? n.closest(c) || n : n; const r = t.getBoundingClientRect(); return [r.left, r.top, r.width, r.height] }, closest)
    rects[name] = { ...(rects[name] || {}), [key]: [b[0] / width, b[1] / height, b[2] / width, b[3] / height] }
    save()
    return rects[name][key]
  }

  /**
   * Record the box of a piece of text inside an element (for NumberPatch: redraw a number and count it up).
   * Also stores the text colour, weight, font (size as a fraction of viewport height) and the nearest non-transparent background colour.
   * Result: rects[name][key] = { box: [x0, y0, x1, y1] fractions, color, background, weight, fontSize, fontFamily }
   */
  async function textRect(name, key, selector, text) {
    const info = await page.evaluate((sel, txt) => {
      const root = document.querySelector(sel)
      if (!root) throw new Error('not found: ' + sel)
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      let node
      while ((node = walker.nextNode())) {
        const i = node.textContent.indexOf(txt)
        if (i < 0) continue
        const range = document.createRange()
        range.setStart(node, i)
        range.setEnd(node, i + txt.length)
        const r = range.getBoundingClientRect()
        const el = node.parentElement
        const cs = getComputedStyle(el)
        let bgEl = el, bg = 'rgba(0, 0, 0, 0)'
        while (bgEl && (bg = getComputedStyle(bgEl).backgroundColor) === 'rgba(0, 0, 0, 0)') bgEl = bgEl.parentElement
        return { r: [r.left, r.top, r.right, r.bottom], color: cs.color, weight: Number(cs.fontWeight), fontSize: parseFloat(cs.fontSize), fontFamily: cs.fontFamily, background: bg === 'rgba(0, 0, 0, 0)' ? '#ffffff' : bg }
      }
      throw new Error(`text "${txt}" not found in ${sel}`)
    }, selector, text)
    rects[name] = {
      ...(rects[name] || {}),
      [key]: { box: [info.r[0] / width, info.r[1] / height, info.r[2] / width, info.r[3] / height], color: info.color, background: info.background, weight: info.weight, fontSize: info.fontSize / height, fontFamily: info.fontFamily },
    }
    save()
    return rects[name][key]
  }

  return { page, shot, rect, textRect, sleep, close: () => browser.close() }
}
