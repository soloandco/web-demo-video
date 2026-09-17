// Screen-recording helper for walkthrough videos.
// Drives a real web page with headless Chrome, draws captions / cursor / click ripples /
// highlight rings on top of the page, collects screencast frames and encodes an MP4.
//
//   const r = await createRecorder({ url, width: 1440, height: 810, framesDir: '.frames/part1' })
//   await r.start()
//   await r.caption('Search by <b>customer name</b>')
//   await r.click('#search')
//   await r.finish('out/part1.mp4')
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import puppeteer from 'puppeteer-core'

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  if (process.platform === 'win32') return 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  if (process.platform === 'darwin') return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  return '/usr/bin/google-chrome'
}

const FFMPEG = process.env.FFMPEG || 'ffmpeg'

export const defaultTheme = {
  accent: '#2563EB',
  captionBg: 'rgba(17, 24, 39, 0.9)',
  captionColor: '#ffffff',
  cardBg: '#ffffff',
  cardColor: '#111827',
  font: 'inherit',
  logo: '', // optional image URL shown on cards when card(..., { logo: true })
}

// Everything below runs inside the page. `u` scales sizes so a 1920-wide capture looks like a 1280-wide one.
const OVERLAY = ({ theme, u, hideTexts }) => {
  const root = document.createElement('div')
  root.id = 'wdv-root'
  root.innerHTML = `
  <style>
    #wdv-root { position: fixed; inset: 0; pointer-events: none; z-index: 2147483000; font-family: ${theme.font}; }
    #wdv-tick { position: absolute; left: 0; top: 0; width: ${2 * u}px; height: ${2 * u}px; background: #fff; animation: wdvTick .5s linear infinite alternate; }
    @keyframes wdvTick { from { opacity: .02 } to { opacity: .05 } }
    #wdv-band { position: absolute; left: 0; right: 0; bottom: 0; height: ${120 * u}px; opacity: 0; transition: opacity .45s ease;
      background: linear-gradient(to top, rgba(255,255,255,.92), rgba(255,255,255,0)); }
    #wdv-band.show { opacity: 1; }
    #wdv-caption { position: absolute; left: 50%; bottom: ${30 * u}px; transform: translate(-50%, ${16 * u}px); opacity: 0;
      transition: opacity .45s ease, transform .45s ease; background: ${theme.captionBg}; color: ${theme.captionColor};
      font-size: ${22 * u}px; font-weight: 500; padding: ${12 * u}px ${26 * u}px; border-radius: ${12 * u}px; white-space: nowrap; letter-spacing: -${0.3 * u}px; }
    #wdv-caption b { color: #fff; font-weight: 700; }
    #wdv-caption.show { opacity: 1; transform: translate(-50%, 0); }
    #wdv-cursor { position: absolute; left: 0; top: 0; width: ${30 * u}px; height: ${30 * u}px; opacity: 0;
      transform: translate(${640 * u}px, ${400 * u}px); transition: transform .9s cubic-bezier(.45,0,.2,1), opacity .3s; filter: drop-shadow(0 ${2 * u}px ${4 * u}px rgba(0,0,0,.3)); }
    .wdv-ripple { position: absolute; width: ${34 * u}px; height: ${34 * u}px; margin: -${17 * u}px 0 0 -${17 * u}px; border-radius: 50%;
      border: ${3 * u}px solid ${theme.accent}; animation: wdvRipple .65s ease-out forwards; }
    @keyframes wdvRipple { from { opacity: .95; transform: scale(.5) } to { opacity: 0; transform: scale(3.4) } }
    #wdv-ring { position: absolute; opacity: 0; border: ${3 * u}px solid ${theme.accent}; border-radius: ${12 * u}px;
      box-shadow: 0 0 0 ${7 * u}px color-mix(in srgb, ${theme.accent} 16%, transparent); transition: all .6s cubic-bezier(.45,0,.2,1); }
    #wdv-badge { position: absolute; left: ${22 * u}px; bottom: ${38 * u}px; opacity: 0; transition: opacity .4s; background: ${theme.captionBg}; color: #fff;
      font-size: ${14 * u}px; font-weight: 700; padding: ${6 * u}px ${14 * u}px; border-radius: 999px; }
    #wdv-badge.show { opacity: 1; }
    #wdv-card { position: absolute; inset: 0; background: ${theme.cardBg}; color: ${theme.cardColor}; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: ${26 * u}px; transition: opacity .7s ease; text-align: center; }
    #wdv-card.hide { opacity: 0; }
    #wdv-card .t { font-size: ${40 * u}px; font-weight: 700; letter-spacing: -${1 * u}px; line-height: 1.35; }
    #wdv-card .t em { font-style: normal; color: ${theme.accent}; }
    #wdv-card .s { font-size: ${18 * u}px; color: #6b7280; display: flex; flex-direction: column; align-items: center; gap: ${18 * u}px; }
    #wdv-card .s img { height: ${28 * u}px; }
  </style>
  <div id="wdv-tick"></div><div id="wdv-ring"></div><div id="wdv-band"></div><div id="wdv-badge"></div><div id="wdv-caption"></div>
  <svg id="wdv-cursor" viewBox="0 0 24 24"><path d="M4 2 L4 20 L9 15.5 L12.5 22 L15.5 20.6 L12.2 14.2 L19 14.2 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>
  <div id="wdv-card"><div class="t"></div><div class="s"></div></div>`
  document.documentElement.appendChild(root)
  window.__wdvImgs = theme.logo ? [theme.logo].map((src) => { const i = new Image(); i.src = src; return i }) : []

  // Hide UI that should not be filmed (dev-only buttons, chat widgets). Keeps watching as the page changes.
  const hide = () => {
    for (const el of document.querySelectorAll('button, a')) {
      if (hideTexts.includes(el.textContent?.trim()) && el.style.display !== 'none') el.style.display = 'none'
    }
  }
  hide()
  new MutationObserver(hide).observe(document.body, { childList: true, subtree: true })

  const $ = (id) => document.getElementById(id)
  const cursor = { x: 640 * u, y: 400 * u }
  window.__wdv = {
    caption(html) {
      const c = $('wdv-caption')
      $('wdv-band').classList.toggle('show', !!html)
      if (!html) { c.classList.remove('show'); return }
      c.classList.remove('show')
      setTimeout(() => { c.innerHTML = html; c.classList.add('show') }, c.innerHTML ? 250 : 0)
    },
    card(title, sub, logo) {
      const k = $('wdv-card')
      k.querySelector('.t').innerHTML = title
      k.querySelector('.s').innerHTML = (sub ? `<div>${sub}</div>` : '') + (logo && theme.logo ? `<img src="${theme.logo}" alt="">` : '')
      k.classList.remove('hide')
    },
    hideCard() { $('wdv-card').classList.add('hide') },
    badge(label) { const b = $('wdv-badge'); if (label) b.textContent = label; b.classList.toggle('show', !!label) },
    showCursor(on) { $('wdv-cursor').style.opacity = on ? 1 : 0 },
    cursorTo(x, y) { cursor.x = x; cursor.y = y; $('wdv-cursor').style.transform = `translate(${x}px, ${y}px)` },
    ripple() {
      const r = document.createElement('div')
      r.className = 'wdv-ripple'
      r.style.left = cursor.x + 4 * u + 'px'
      r.style.top = cursor.y + 3 * u + 'px'
      $('wdv-root').appendChild(r)
      setTimeout(() => r.remove(), 700)
    },
    ring(rect) {
      const g = $('wdv-ring')
      if (!rect) { g.style.opacity = 0; return }
      const p = 8 * u
      Object.assign(g.style, { left: rect.x - p + 'px', top: rect.y - p + 'px', width: rect.w + p * 2 + 'px', height: rect.h + p * 2 + 'px', opacity: 1 })
    },
  }
}

/**
 * @param {object} o
 * @param {string} o.url            page to open (http://, https:// or file://)
 * @param {string} [o.readyText]    wait until this text is on the page
 * @param {string} o.framesDir      scratch folder for frames (wiped on start)
 * @param {number} [o.width=1280]   CSS viewport. Output is always outputWidth wide, so a wider viewport = smaller UI
 * @param {number} [o.height=720]
 * @param {number} [o.outputWidth=2560]
 * @param {object} [o.theme]        overrides for defaultTheme
 * @param {string[]} [o.hideTexts]  buttons/links with exactly this text are hidden while filming
 */
export async function createRecorder({ url, readyText, framesDir, width = 1280, height = 720, outputWidth = 2560, theme = {}, hideTexts = [] }) {
  if (!framesDir) throw new Error('framesDir is required')
  fs.rmSync(framesDir, { recursive: true, force: true })
  fs.mkdirSync(framesDir, { recursive: true })
  const t = { ...defaultTheme, ...theme }
  const u = width / 1280

  const browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: true,
    defaultViewport: { width, height, deviceScaleFactor: outputWidth / width },
    args: ['--hide-scrollbars', '--force-color-profile=srgb'],
  })
  const page = await browser.newPage()
  page.on('pageerror', (e) => console.log('[pageerror]', e.message))
  page.on('dialog', (d) => d.dismiss())
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 180000 })
  if (readyText) await page.waitForSelector(`::-p-text(${readyText})`, { timeout: 120000 })
  await page.evaluate(OVERLAY, { theme: t, u, hideTexts })
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => Promise.all(window.__wdvImgs.map((i) => i.decode().catch(() => {}))))
  await sleep(600)

  const call = (fn, ...args) => page.evaluate((f, a) => window.__wdv[f](...a), fn, args)

  async function rectOf(selector, closest) {
    const el = await page.waitForSelector(selector, { timeout: 20000 })
    return el.evaluate((node, c) => {
      const target = c ? node.closest(c) || node : node
      const r = target.getBoundingClientRect()
      return { x: r.left, y: r.top, w: r.width, h: r.height }
    }, closest)
  }
  async function moveTo(selectorOrRect, { closest, dx = 0.5, dy = 0.5 } = {}) {
    const r = typeof selectorOrRect === 'string' ? await rectOf(selectorOrRect, closest) : selectorOrRect
    await call('cursorTo', r.x + r.w * dx, r.y + r.h * dy)
    await sleep(950)
  }
  /** Move the cursor to the element, show a ripple, then really click it. */
  async function click(selector, opts = {}) {
    await call('showCursor', true)
    await moveTo(selector, opts)
    await call('ripple')
    await page.click(selector)
  }
  /** Type like a person, a character at a time. */
  async function type(selector, text, delay = 70) {
    await page.type(selector, text, { delay })
  }
  /**
   * Scroll the nearest scrollable ancestor of an element (many apps scroll an inner panel, not the window).
   * mode 'top' puts the element's top at `offset` px from the top; 'bottom' puts its bottom `offset` px above the bottom.
   */
  async function scrollInto(selector, { mode = 'top', offset = 160, ms = 1100 } = {}) {
    await page.evaluate((sel, md, off, dur, h) => new Promise((resolve) => {
      const el = document.querySelector(sel)
      let box = el.parentElement
      while (box && !(box.scrollHeight > box.clientHeight + 5 && /auto|scroll/.test(getComputedStyle(box).overflowY))) box = box.parentElement
      const scroller = box || document.scrollingElement
      const er = el.getBoundingClientRect()
      const delta = md === 'top' ? er.top - off : er.bottom - (h - off)
      const from = scroller.scrollTop
      const to = Math.max(0, Math.min(scroller.scrollHeight - scroller.clientHeight, from + delta))
      const t0 = performance.now()
      const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2)
      const step = (now) => { const k = Math.min(1, (now - t0) / dur); scroller.scrollTop = from + (to - from) * ease(k); if (k < 1) requestAnimationFrame(step); else resolve() }
      requestAnimationFrame(step)
    }), selector, mode, offset, ms, height)
  }

  const client = await page.createCDPSession()
  const frames = []
  client.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const file = path.join(framesDir, String(frames.length).padStart(6, '0') + '.jpg')
    fs.writeFileSync(file, Buffer.from(data, 'base64'))
    frames.push({ file, t: metadata.timestamp })
    client.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  })

  async function start() {
    const outH = Math.round((outputWidth * height) / width)
    await client.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: outputWidth, maxHeight: outH, everyNthFrame: 1 })
  }

  async function finish(outFile, { lastFrame = 1.0 } = {}) {
    await client.send('Page.stopScreencast')
    await sleep(300)
    await browser.close()
    if (frames.length < 10) throw new Error(`too few frames: ${frames.length}`)
    const lines = ['ffconcat version 1.0']
    for (let i = 0; i < frames.length; i++) {
      const dur = i + 1 < frames.length ? Math.max(0.001, frames[i + 1].t - frames[i].t) : lastFrame
      lines.push(`file '${path.resolve(frames[i].file).split(path.sep).join('/')}'`, `duration ${dur.toFixed(4)}`)
    }
    lines.push(`file '${path.resolve(frames.at(-1).file).split(path.sep).join('/')}'`)
    const list = path.join(framesDir, 'list.ffconcat')
    fs.writeFileSync(list, lines.join('\n'))
    const outH = Math.round((outputWidth * height) / width / 2) * 2
    fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true })
    execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list,
      '-vf', `fps=30,scale=${outputWidth}:${outH}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '17',
      '-movflags', '+faststart', outFile], { stdio: 'inherit' })
    const span = frames.at(-1).t - frames[0].t
    console.log(`${outFile}: ${frames.length} frames over ${span.toFixed(1)}s`)
  }

  return {
    page, browser, sleep, rectOf, moveTo, click, type, scrollInto, start, finish,
    caption: (html) => call('caption', html),
    card: (title, sub = '', { logo = false } = {}) => call('card', title, sub, logo),
    hideCard: () => call('hideCard'),
    badge: (label) => call('badge', label),
    showCursor: (on) => call('showCursor', on),
    ring: async (target, closest) => call('ring', target ? (typeof target === 'string' ? await rectOf(target, closest) : target) : null),
  }
}

/** Join same-size MP4 parts without re-encoding. */
export function concatParts(parts, outFile) {
  const list = path.join(os.tmpdir(), `wdv-concat-${Date.now()}.txt`)
  fs.writeFileSync(list, parts.map((p) => `file '${path.resolve(p).split(path.sep).join('/')}'`).join('\n'))
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', outFile], { stdio: 'inherit' })
  fs.rmSync(list)
  console.log('joined', outFile)
}
