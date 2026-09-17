# Starter

Copy this folder into your project (for example as `video/`), then:

```bash
npm install
```

Requirements: Node 20+, Google Chrome, ffmpeg on PATH. Set `CHROME_PATH` if Chrome is somewhere unusual.

| Path | What |
|---|---|
| `lib/recorder.mjs` | Walkthrough recording (caption, cursor, ripple, highlight, cards) |
| `lib/capture.mjs` | Screenshots and element positions for motion promos |
| `lib/qa.mjs` | Probe a video and make frame sheets |
| `motion/` | Remotion project: `theme.ts` (your colours), `parts.tsx` (building blocks), `Main.tsx` (your scenes) |

Commands:

```bash
node record.mjs                 # your walkthrough script (see examples/sample-tasks/record.mjs)
node capture.mjs                # your capture script (see examples/sample-tasks/capture.mjs)
npm run studio                  # preview the motion video in the browser
npm run render -- --browser-executable="<path to chrome>"
node lib/qa.mjs out/motion.mp4 --sheet 16 --end
```
