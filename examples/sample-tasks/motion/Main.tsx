// Promo (motion-graphics style) for the Sample Tasks demo app. 20 seconds.
// Screens are real screenshots from capture.mjs; every movement on top is code.
import React from 'react'
import { AbsoluteFill, Easing, useCurrentFrame } from 'remotion'
import {
  arc, camAt, Captions, Chip, Cursor, Impact, kf, mapPt, NumberPatch, ProgressDots, SheetIcon, Shot, WordReveal,
  type CamKey, type TextInfo,
} from '../../../skills/web-demo-video/starter/motion/parts'
import { H, theme, W } from '../../../skills/web-demo-video/starter/motion/theme'
import rects from './rects.json'

export const TOTAL = 600

type Box = [number, number, number, number]
const center = (b: Box) => ({ x: b[0] + b[2] / 2, y: b[1] + b[3] / 2 })
const search = center(rects.home.search as Box)
const row1 = center(rects.search.row1 as Box)
const panel = center(rects.detail.panel as Box)
const markDone = center(rects.detail.markDone as Box)
const exportBtn = center(rects.home.export as Box)
const doneCount = rects.done.doneCount as TextInfo
const countAt = { x: (doneCount.box[0] + doneCount.box[2]) / 2, y: (doneCount.box[1] + doneCount.box[3]) / 2 }

// One camera for the whole app sequence.
// Rule: whenever the screen changes, pull back to the full view first, then move in.
const CAM: CamKey[] = [
  { f: 90, x: 0.5, y: 0.5, z: 1 }, { f: 112, x: 0.5, y: 0.5, z: 1 },
  { f: 136, x: search.x, y: search.y, z: 2.2 }, { f: 186, x: search.x, y: search.y, z: 2.2 },
  { f: 204, x: 0.5, y: 0.5, z: 1 }, { f: 218, x: 0.5, y: 0.5, z: 1 },
  { f: 240, x: row1.x, y: row1.y, z: 1.8 }, { f: 260, x: row1.x, y: row1.y, z: 1.8 },
  { f: 272, x: 0.5, y: 0.5, z: 1 }, { f: 286, x: 0.5, y: 0.5, z: 1 },
  { f: 306, x: panel.x, y: 0.4, z: 1.7 }, { f: 328, x: panel.x, y: 0.4, z: 1.7 },
  { f: 360, x: countAt.x + 0.05, y: countAt.y + 0.04, z: 2.4 }, { f: 412, x: countAt.x + 0.05, y: countAt.y + 0.04, z: 2.4 },
  { f: 432, x: 0.5, y: 0.5, z: 1 }, { f: 446, x: 0.5, y: 0.5, z: 1 },
  { f: 464, x: exportBtn.x, y: exportBtn.y, z: 2.2 }, { f: 482, x: exportBtn.x, y: exportBtn.y, z: 2.2 },
  { f: 500, x: 0.5, y: 0.5, z: 1.1 },
]

// The typed query, drawn over the empty search box until the real "search" screenshot takes over
const TypedQuery: React.FC<{ f: number }> = ({ f }) => {
  if (f < 156 || f >= 200) return null
  const word = 'invoice'
  const n = Math.floor(kf(f, [160, 184], [0, word.length], Easing.linear))
  const [x, y, w, h] = rects.home.search as Box
  const caretOn = Math.floor(f / 8) % 2 === 0
  return (
    <div style={{ position: 'absolute', left: x * W + 3, top: y * H + 3, width: w * W - 6, height: h * H - 6, background: '#fff', borderRadius: 18, display: 'flex', alignItems: 'center', paddingLeft: 26, fontFamily: 'Inter, "Segoe UI", sans-serif', fontSize: 27, color: theme.ink, boxSizing: 'border-box' }}>
      {word.slice(0, n)}<span style={{ width: 2, height: 32, background: theme.accent, marginLeft: 2, opacity: caretOn ? 1 : 0 }} />
    </div>
  )
}

export const Main: React.FC = () => {
  const f = useCurrentFrame()

  // "Task completed" chip travels from the button to the weekly count
  const chipFrom = mapPt(camAt(CAM, 330), markDone.x, markDone.y)
  const chipTo = mapPt(camAt(CAM, f), countAt.x, countAt.y)
  const chipT = kf(f, [336, 368], [0, 1], Easing.inOut(Easing.cubic))
  const chip = arc({ x: chipFrom.x, y: chipFrom.y - 90 }, chipTo, chipT, 220)
  const chipScale = f < 336 ? kf(f, [328, 336], [0.3, 1], Easing.out(Easing.back(2))) : kf(f, [336, 368], [1, 0.45])

  // CSV file pops out of the Export button and grows to the centre
  const fileFrom = mapPt(camAt(CAM, 476), exportBtn.x, exportBtn.y)
  const fileT = kf(f, [476, 506], [0, 1], Easing.out(Easing.cubic))
  const dotsAt = mapPt(camAt(CAM, f), (rects.done.stat as Box)[0], (rects.done.stat as Box)[1] + (rects.done.stat as Box)[3])

  return (
    <AbsoluteFill style={{ background: '#fff', fontFamily: theme.font }}>
      {f < 125 ? <WordReveal f={f} lines={[['Too', 'many', 'tasks'], ['to', 'find', 'the', 'one', 'you', 'need?']]} /> : null}

      {f >= 90 && f < 530 ? (
        <Shot
          f={f}
          cam={CAM}
          states={[[90, 'home', 0], [192, 'search', 8], [262, 'detail', 8], [326, 'done', 4], [476, 'exported', 6]]}
          style={{ clipPath: `circle(${kf(f, [90, 124], [0, 1700], Easing.inOut(Easing.cubic))}px at 50% 50%)` }}
          inImage={(fr) => (
            <>
              <TypedQuery f={fr} />
              <NumberPatch f={fr} info={doneCount} from={7} to={8} start={368} end={370} showFrom={326} hideFrom={476} />
            </>
          )}
        />
      ) : null}
      {f >= 500 ? <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: kf(f, [500, 522], [0, 1], Easing.linear) }} /> : null}

      <ProgressDots f={f} x={dotsAt.x} y={dotsAt.y + 30} total={12} filled={7} fillAt={368} appearAt={344} warnAt={380} hideAt={420} />
      {f >= 368 && f < 390 ? <Impact f={f} at={368} x={chipTo.x} y={chipTo.y} /> : null}

      <Cursor
        f={f}
        show={[[128, 170], [214, 262], [290, 334], [446, 486]]}
        clicks={[156, 252, 324, 474]}
        path={[
          { f: 128, cam: CAM, x: 0.62, y: 0.3 }, { f: 150, cam: CAM, x: search.x, y: search.y },
          { f: 214, cam: CAM, x: 0.55, y: 0.6 }, { f: 244, cam: CAM, x: row1.x, y: row1.y },
          { f: 290, cam: CAM, x: 0.6, y: 0.7 }, { f: 316, cam: CAM, x: markDone.x, y: markDone.y },
          { f: 446, cam: CAM, x: 0.65, y: 0.25 }, { f: 468, cam: CAM, x: exportBtn.x, y: exportBtn.y },
        ]}
      />

      {f >= 328 && f < 372 ? <Chip x={chip.x} y={chip.y} scale={chipScale} opacity={kf(f, [364, 371], [1, 0], Easing.linear)} label="Task completed" /> : null}
      {f >= 476 && f < 545 ? (
        <SheetIcon x={fileFrom.x + (W / 2 - fileFrom.x) * fileT} y={fileFrom.y + (H * 0.42 - fileFrom.y) * fileT} scale={0.3 + 1.2 * fileT} opacity={1 - kf(f, [526, 540], [0, 1], Easing.linear)} />
      ) : null}
      {f >= 528 ? <WordReveal f={f} start={532} lines={[['Find', 'it.', 'Finish', 'it.', 'Share', 'it.']]} size={96} /> : null}

      <Captions f={f} items={[
        [126, 188, <>Type a word to <b>filter the list</b></>],
        [206, 262, <>Click a task to <b>open it</b></>],
        [274, 326, <>Everything about it <b>in one panel</b></>],
        [338, 420, <>Mark it done and <b>the weekly count updates</b></>],
        [434, 500, <>Export the list as <b>CSV</b> any time</>],
      ]} />
    </AbsoluteFill>
  )
}
