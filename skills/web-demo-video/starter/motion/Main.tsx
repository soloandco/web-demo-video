// Start here. Replace the scenes with your storyboard.
// A complete 20 s example lives in the repository: examples/sample-tasks/motion/Main.tsx
import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { Captions, Shot, WordReveal, type CamKey } from './parts'
import { theme } from './theme'

export const TOTAL = 150 // frames (5 s at 30 fps)

// Show the new screen whole, then move in (x, y are fractions of the screenshot)
const CAM: CamKey[] = [
  { f: 45, x: 0.5, y: 0.5, z: 1 },
  { f: 65, x: 0.5, y: 0.5, z: 1 },
  { f: 90, x: 0.3, y: 0.2, z: 1.8 },
]

export const Main: React.FC = () => {
  const f = useCurrentFrame()
  return (
    <AbsoluteFill style={{ background: '#fff', fontFamily: theme.font }}>
      {f < 50 ? <WordReveal f={f} lines={[['Your', 'problem,'], ['in', 'one', 'line?']]} /> : null}
      {f >= 45 ? <Shot f={f} cam={CAM} states={[[45, 'home', 0]]} /> : null}
      <Captions f={f} items={[[70, 145, <>What this screen <b>does for you</b></>]]} />
    </AbsoluteFill>
  )
}
