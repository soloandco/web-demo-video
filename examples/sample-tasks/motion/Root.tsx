import React from 'react'
import { Composition } from 'remotion'
import { FPS, H, W } from '../../../skills/web-demo-video/starter/motion/theme'
import { Main, TOTAL } from './Main'

export const Root: React.FC = () => <Composition id="Main" component={Main} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
