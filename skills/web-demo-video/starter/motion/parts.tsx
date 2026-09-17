// Reusable pieces for motion-graphics product videos (Remotion).
// Every piece is a pure function of the frame number, so renders are deterministic.
//
// Coordinates: element positions from capture.mjs are fractions of the screenshot (0..1).
// A camera maps them to video pixels; overlays that must track the UI use mapPt(camAt(...)).
import React from 'react'
import { Easing, Img, interpolate, staticFile } from 'remotion'
import { H, W, theme } from './theme'

export const EASE = Easing.bezier(0.45, 0, 0.2, 1)

/** Clamped interpolate with a default ease. */
export const kf = (f: number, frames: number[], values: number[], easing = EASE) =>
  interpolate(f, frames, values, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing })

// ── Camera ─────────────────────────────────────────────────────────────
/** Put screenshot point (x, y) at the centre of the frame, zoomed by z, at frame f. */
export type CamKey = { f: number; x: number; y: number; z: number }
export type Cam = { z: number; tx: number; ty: number }

export function camAt(keys: CamKey[], f: number): Cam {
  const fr = keys.map((k) => k.f)
  const pick = (get: (k: CamKey) => number) => (keys.length > 1 ? kf(f, fr, keys.map(get)) : get(keys[0]))
  const z = pick((k) => k.z), x = pick((k) => k.x), y = pick((k) => k.y)
  // Never show past the screenshot edges
  const tx = Math.min(0, Math.max(W - W * z, W / 2 - x * W * z))
  const ty = Math.min(0, Math.max(H - H * z, H / 2 - y * H * z))
  return { z, tx, ty }
}
export const mapPt = (c: Cam, x: number, y: number) => ({ x: x * W * c.z + c.tx, y: y * H * c.z + c.ty })

/**
 * Helper for the most important rule: when the screen changes, show it whole first, then move in.
 * Returns keyframes: full view at `at`, hold for `hold` frames, then glide to the target over `glide` frames.
 */
export const enterWide = (at: number, target: { x: number; y: number; z: number }, hold = 14, glide = 20): CamKey[] => [
  { f: at, x: 0.5, y: 0.5, z: 1 },
  { f: at + hold, x: 0.5, y: 0.5, z: 1 },
  { f: at + hold + glide, ...target },
]

// ── Screen ─────────────────────────────────────────────────────────────
/**
 * A screenshot (or a sequence of them) under a camera.
 * states: [startFrame, shotName, crossfadeFrames] in time order. shotName is public/shots/<name>.png
 * inImage: things drawn in screenshot space (they zoom with the camera), e.g. NumberPatch
 */
export const Shot: React.FC<{
  f: number
  cam: CamKey[]
  states: [number, string, number][]
  inImage?: (f: number) => React.ReactNode
  style?: React.CSSProperties
}> = ({ f, cam, states, inImage, style }) => {
  const c = camAt(cam, f)
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: theme.screenBg, ...style }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0', transform: `translate(${c.tx}px, ${c.ty}px) scale(${c.z})` }}>
        {states.map(([from, name, fade], i) => {
          const next = states[i + 1]
          if (f < from || (next && f >= next[0] + next[2])) return null
          const op = i === 0 ? 1 : kf(f, [from, from + Math.max(1, fade)], [0, 1], Easing.linear)
          return <Img key={name + i} src={staticFile(`shots/${name}.png`)} style={{ position: 'absolute', inset: 0, width: W, height: H, opacity: op }} />
        })}
        {inImage?.(f)}
      </div>
    </div>
  )
}

// ── Numbers ────────────────────────────────────────────────────────────
/** Output of capture.mjs textRect() */
export type TextInfo = { box: [number, number, number, number]; color: string; background: string; weight: number; fontSize: number; fontFamily: string }

/**
 * Covers a number in the screenshot and redraws it counting from `from` to `to`.
 * Place inside Shot's inImage. Show it from the frame the screenshot appears (showFrom),
 * otherwise the real number flashes before the count starts.
 */
export const NumberPatch: React.FC<{
  f: number; info: TextInfo; from: number; to: number; start: number; end: number
  showFrom?: number; hideFrom?: number; suffix?: string; flash?: boolean; format?: (n: number) => string
}> = ({ f, info, from, to, start, end, showFrom = -Infinity, hideFrom = Infinity, suffix = '', flash = true, format = (n) => String(n) }) => {
  if (f < showFrom || f >= hideFrom) return null
  const v = Math.round(kf(f, [start, end], [from, to], Easing.out(Easing.cubic)))
  const hot = flash && f >= start ? kf(f, [end, end + 12], [1, 0], Easing.linear) : 0
  const [x0, y0, x1, y1] = info.box
  const pad = (y1 - y0) * H * 0.08
  return (
    <div style={{
      position: 'absolute', left: x0 * W - pad, top: y0 * H, height: (y1 - y0) * H, minWidth: (x1 - x0) * W + pad * 2, padding: `0 ${pad}px`, boxSizing: 'border-box',
      background: info.background, color: hot > 0 ? theme.accent : info.color, fontFamily: info.fontFamily, fontWeight: info.weight,
      fontSize: info.fontSize * H, lineHeight: `${(y1 - y0) * H}px`, whiteSpace: 'nowrap',
      transform: `scale(${1 + hot * 0.15})`, transformOrigin: 'left center',
    }}>
      {format(v)}{suffix}
    </div>
  )
}

// ── Cursor ─────────────────────────────────────────────────────────────
/**
 * Waypoints are in screenshot coordinates under a camera, so the cursor stays on its target while the camera moves.
 * Repeat a waypoint to make the cursor wait (arrive, click, then leave).
 */
export type Waypoint = { f: number; cam: CamKey[]; x: number; y: number }

export const Cursor: React.FC<{ f: number; path: Waypoint[]; clicks: number[]; show: [number, number][] }> = ({ f, path, clicks, show }) => {
  const vis = show.map(([a, b]) => kf(f, [a, a + 6, b - 6, b], [0, 1, 1, 0], Easing.linear)).reduce((m, v) => Math.max(m, v), 0)
  if (vis <= 0) return null
  const at = (fr: number) => {
    const pos = (w: Waypoint) => mapPt(camAt(w.cam, fr), w.x, w.y)
    let q = pos(path[0])
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1]
      if (fr >= a.f && fr < b.f) {
        const t = kf(fr, [a.f, b.f], [0, 1])
        const pa = pos(a), pb = pos(b)
        const bow = Math.sin(t * Math.PI) * 0.06 // a slight arc reads as a hand, a straight line reads as a robot
        q = { x: pa.x + (pb.x - pa.x) * t + (pb.y - pa.y) * bow, y: pa.y + (pb.y - pa.y) * t - (pb.x - pa.x) * bow }
      } else if (fr >= b.f) q = pos(b)
    }
    return q
  }
  const p = at(f)
  const press = clicks.reduce((m, c) => Math.max(m, kf(f, [c - 3, c, c + 5], [0, 1, 0], Easing.linear)), 0)
  return (
    <>
      {clicks.map((c) => (f >= c && f < c + 22 ? (
        // The ripple stays where the click happened, even if the cursor moves on
        <div key={c} style={{ position: 'absolute', left: at(c).x, top: at(c).y }}>
          <div style={{ position: 'absolute', left: -40, top: -40, width: 80, height: 80, borderRadius: '50%', border: `6px solid ${theme.accent}`, opacity: kf(f, [c, c + 22], [0.9, 0], Easing.linear), transform: `scale(${kf(f, [c, c + 22], [0.4, 2.6], Easing.out(Easing.quad))})` }} />
        </div>
      ) : null))}
      <svg viewBox="0 0 24 24" style={{ position: 'absolute', left: p.x - 8, top: p.y - 4, width: 68, height: 68, opacity: vis, transform: `scale(${1 - press * 0.18})`, transformOrigin: '8px 4px', filter: 'drop-shadow(0 6px 10px rgba(0,0,0,.25))' }}>
        <path d="M4 2 L4 20 L9 15.5 L12.5 22 L15.5 20.6 L12.2 14.2 L19 14.2 Z" fill="#111" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </>
  )
}

// ── Text ───────────────────────────────────────────────────────────────
/** Captions that wipe in left to right. items: [start, end, content, 'top' | 'bottom'] */
export const Captions: React.FC<{ f: number; items: [number, number, React.ReactNode, ('top' | 'bottom')?][] }> = ({ f, items }) => (
  <>
    {items.map(([a, b, node, where], i) => {
      if (f < a || f > b) return null
      const wipe = kf(f, [a, a + 14], [0, 100], Easing.out(Easing.cubic))
      const out = kf(f, [b - 7, b], [1, 0], Easing.linear)
      return (
        <div key={i} style={{ position: 'absolute', left: 0, right: 0, ...(where === 'top' ? { top: 70 } : { bottom: 70 }), display: 'flex', justifyContent: 'center', opacity: out }}>
          <div style={{ background: theme.captionBg, color: '#fff', fontFamily: theme.font, fontSize: 50, fontWeight: 500, letterSpacing: -0.5, padding: '22px 44px', borderRadius: 18, clipPath: `inset(0 ${100 - wipe}% 0 0 round 18px)`, boxShadow: '0 12px 40px rgba(0,0,0,.18)' }}>
            {node}
          </div>
        </div>
      )
    })}
  </>
)

/** Small label in the corner that flips when it changes (e.g. "Admin view" / "Customer view"). */
export const Badge: React.FC<{ f: number; items: [number, number, string][] }> = ({ f, items }) => (
  <>
    {items.map(([a, b, label], i) => {
      if (f < a || f > b) return null
      const flip = kf(f, [a, a + 10], [90, 0], Easing.out(Easing.back(1.6)))
      const out = kf(f, [b - 6, b], [1, 0], Easing.linear)
      return (
        <div key={i} style={{ position: 'absolute', left: 48, bottom: 84, perspective: 600, opacity: out }}>
          <div style={{ background: theme.accent, color: '#fff', fontFamily: theme.font, fontSize: 30, fontWeight: 700, padding: '12px 26px', borderRadius: 999, transform: `rotateX(${flip}deg)` }}>{label}</div>
        </div>
      )
    })}
  </>
)

/** Words sharpen in one by one. Words listed in `struck` get a line drawn through them at strikeAt. */
export const WordReveal: React.FC<{ f: number; lines: string[][]; start?: number; stagger?: number; struck?: string[]; strikeAt?: number; size?: number }> = ({ f, lines, start = 6, stagger = 5, struck = [], strikeAt = Infinity, size = 104 }) => {
  let i = 0
  const strike = Number.isFinite(strikeAt) ? kf(f, [strikeAt, strikeAt + 20], [0, 1], Easing.inOut(Easing.cubic)) : 0
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: theme.font, fontWeight: 700, fontSize: size, letterSpacing: -2, lineHeight: 1.45, color: theme.ink }}>
      {lines.map((words, li) => (
        <div key={li}>
          {words.map((w) => {
            const t0 = start + i++ * stagger
            const p = kf(f, [t0, t0 + 10], [0, 1], Easing.out(Easing.cubic))
            const isStruck = struck.includes(w)
            return (
              <span key={w + t0} style={{ position: 'relative', display: 'inline-block', margin: '0 0.12em', opacity: p, filter: `blur(${(1 - p) * 14}px)`, color: isStruck && strike > 0.5 ? theme.muted : theme.ink }}>
                {w}
                {isStruck ? <span style={{ position: 'absolute', left: 0, top: '54%', height: size * 0.09, borderRadius: 99, background: theme.accent, width: `${strike * 100}%` }} /> : null}
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ── Objects that travel between screens ────────────────────────────────
/** A pill with an icon and a label. Good for "link copied", "task completed", "file sent". */
export const Chip: React.FC<{ x: number; y: number; scale: number; opacity?: number; label: string; icon?: React.ReactNode; color?: string }> = ({ x, y, scale, opacity = 1, label, icon, color = theme.accent }) => (
  <div style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${scale})`, opacity }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, background: '#fff', borderRadius: 999, padding: '18px 38px 18px 18px', boxShadow: `0 24px 60px rgba(0,0,0,.22), 0 0 0 3px ${color}40`, fontFamily: theme.font, whiteSpace: 'nowrap' }}>
      <div style={{ width: 60, height: 60, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon ?? <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
      </div>
      <div style={{ fontSize: 38, fontWeight: 700, color: theme.ink }}>{label}</div>
    </div>
  </div>
)

export const LinkIcon = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>
)

/** A generic document card (e.g. an uploaded file) with an optional scan line (0..1). */
export const DocCard: React.FC<{ x: number; y: number; scale: number; rot?: number; scan?: number; opacity?: number; title: string; tag?: string; tagColor?: string }> = ({ x, y, scale, rot = 0, scan = 0, opacity = 1, title, tag = 'PDF', tagColor = '#DC2626' }) => (
  <div style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${scale})`, opacity }}>
    <div style={{ position: 'relative', width: 420, height: 560, background: '#fff', borderRadius: 16, boxShadow: '0 30px 70px rgba(0,0,0,.28)', overflow: 'hidden', fontFamily: theme.font, padding: 36, boxSizing: 'border-box' }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: theme.ink, lineHeight: 1.3 }}>{title}</div>
      <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[1, 0.8, 0.9, 0.7, 0.85, 0.6, 0.9, 0.75].map((w, i) => <div key={i} style={{ height: 14, width: `${w * 100}%`, background: i === 0 ? `${theme.accent}33` : '#ECEDF1', borderRadius: 7 }} />)}
      </div>
      <div style={{ position: 'absolute', right: 26, bottom: 26, background: tagColor, color: '#fff', fontSize: 24, fontWeight: 800, padding: '6px 16px', borderRadius: 8 }}>{tag}</div>
      {scan > 0 && scan < 1 ? <div style={{ position: 'absolute', left: 0, right: 0, top: `${scan * 100}%`, height: 90, marginTop: -45, background: `linear-gradient(180deg, transparent, ${theme.accent}47, transparent)` }} /> : null}
    </div>
  </div>
)

/** A spreadsheet-style file icon (for "export" endings). */
export const SheetIcon: React.FC<{ x: number; y: number; scale: number; opacity?: number; label?: string; color?: string }> = ({ x, y, scale, opacity = 1, label = 'CSV', color = theme.success }) => (
  <div style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${scale})`, opacity }}>
    <div style={{ position: 'relative', width: 180, height: 220, background: '#fff', borderRadius: 18, boxShadow: '0 24px 60px rgba(0,0,0,.25)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 22, right: 22, top: 26, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {Array.from({ length: 15 }).map((_, i) => <div key={i} style={{ height: 18, background: i < 3 ? `${color}55` : `${color}1A`, borderRadius: 3 }} />)}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 64, background: color, color: '#fff', fontFamily: theme.font, fontWeight: 800, fontSize: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{label}</div>
    </div>
  </div>
)

// ── Emphasis ───────────────────────────────────────────────────────────
/** Expanding ring + sparks. Draw in screenshot space (inImage) at a success icon, or in screen space. */
export const Burst: React.FC<{ f: number; at: number; x: number; y: number; color?: string }> = ({ f, at, x, y, color = theme.success }) => {
  if (f < at || f > at + 34) return null
  const p = kf(f, [at, at + 32], [0, 1], Easing.out(Easing.cubic))
  return (
    <div style={{ position: 'absolute', left: x, top: y }}>
      <div style={{ position: 'absolute', left: -90, top: -90, width: 180, height: 180, borderRadius: '50%', border: `8px solid ${color}`, opacity: 1 - p, transform: `scale(${0.6 + p * 1.2})` }} />
      {Array.from({ length: 10 }).map((_, k) => {
        const a = (k / 10) * Math.PI * 2
        const r = 70 + p * 90
        return <div key={k} style={{ position: 'absolute', left: Math.cos(a) * r - 6, top: Math.sin(a) * r - 6, width: 12, height: 12, borderRadius: '50%', background: k % 2 ? color : theme.accent, opacity: 1 - p }} />
      })}
    </div>
  )
}

/** Soft pulse where a travelling object lands. */
export const Impact: React.FC<{ f: number; at: number; x: number; y: number }> = ({ f, at, x, y }) => {
  if (f < at || f > at + 18) return null
  const p = kf(f, [at, at + 16], [0, 1], Easing.out(Easing.cubic))
  return <div style={{ position: 'absolute', left: x - 70, top: y - 70, width: 140, height: 140, borderRadius: '50%', background: `${theme.accent}40`, opacity: 1 - p, transform: `scale(${0.3 + p * 1.8})` }} />
}

/** Row of dots for "N of M done". The dot at index `filled` fills at `fillAt`; the rest pulse as "still to do" from `warnAt`. */
export const ProgressDots: React.FC<{ f: number; x: number; y: number; total: number; filled: number; fillAt: number; appearAt: number; warnAt?: number; hideAt?: number }> = ({ f, x, y, total, filled, fillAt, appearAt, warnAt = Infinity, hideAt = Infinity }) => {
  if (f < appearAt || f > hideAt) return null
  const out = Number.isFinite(hideAt) ? kf(f, [hideAt - 8, hideAt], [1, 0], Easing.linear) : 1
  return (
    <div style={{ position: 'absolute', left: x, top: y, display: 'flex', gap: 16, background: '#fff', padding: '18px 24px', borderRadius: 999, boxShadow: '0 16px 40px rgba(0,0,0,.14)', opacity: out }}>
      {Array.from({ length: total }).map((_, i) => {
        const inP = kf(f, [appearAt + i * 1.5, appearAt + 10 + i * 1.5], [0, 1], Easing.out(Easing.back(2)))
        const isOn = i < filled || (i === filled && f >= fillAt)
        const pop = i === filled ? kf(f, [fillAt, fillAt + 5, fillAt + 13], [1, 1.5, 1]) : 1
        const warn = i > filled && f >= warnAt ? 0.6 + 0.4 * Math.sin((f - warnAt) / 3) : 0
        return <div key={i} style={{ width: 34, height: 34, borderRadius: '50%', boxSizing: 'border-box', background: isOn ? theme.accent : '#fff', border: isOn ? 'none' : `5px solid ${warn > 0 ? theme.warning : '#D1D5DB'}`, opacity: warn > 0 ? warn : 1, transform: `scale(${inP * pop})` }} />
      })}
    </div>
  )
}

/** Quadratic arc from a to b, lifted by `lift` px at the middle. t in 0..1 */
export const arc = (a: { x: number; y: number }, b: { x: number; y: number }, t: number, lift = 200) => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * lift,
})
