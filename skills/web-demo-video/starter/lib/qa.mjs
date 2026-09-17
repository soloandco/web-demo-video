// Quick checks for a finished video.
//   node lib/qa.mjs out/video.mp4                 prints codec / size / fps / duration / audio
//   node lib/qa.mjs out/video.mp4 --sheet 16      also writes out/video.sheet.jpg (16 evenly spaced frames)
//   node lib/qa.mjs out/video.mp4 --end           also writes out/video.end.jpg (last 1.5 s, every 0.3 s)
// Look at the sheets before you call a video done: cut-off captions, half-open dialogs, blank frames and
// late-loading logos all show up here and are invisible in a probe.
import { execFileSync } from 'node:child_process'

const FFMPEG = process.env.FFMPEG || 'ffmpeg'
const FFPROBE = process.env.FFPROBE || 'ffprobe'
const [file, ...args] = process.argv.slice(2)
if (!file) { console.error('usage: node qa.mjs <video.mp4> [--sheet N] [--end]'); process.exit(2) }

const info = JSON.parse(execFileSync(FFPROBE, ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file], { encoding: 'utf8' }))
const v = info.streams.find((s) => s.codec_type === 'video')
const a = info.streams.find((s) => s.codec_type === 'audio')
const dur = Number(info.format.duration)
console.log(`video: ${v.codec_name} ${v.width}x${v.height} ${v.r_frame_rate} fps, ${dur.toFixed(2)} s`)
console.log(`audio: ${a ? a.codec_name : 'none'}`)

const base = file.replace(/\.mp4$/i, '')
const i = args.indexOf('--sheet')
if (i >= 0) {
  const n = Number(args[i + 1] || 12)
  const cols = Math.ceil(Math.sqrt(n))
  const rows = Math.ceil(n / cols)
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', file, '-vf', `fps=${n}/${dur},scale=640:-1,tile=${cols}x${rows}`, '-frames:v', '1', `${base}.sheet.jpg`])
  console.log('sheet:', `${base}.sheet.jpg`)
}
if (args.includes('--end')) {
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-sseof', '-1.5', '-i', file, '-vf', 'fps=1/0.3,scale=640:-1,tile=5x1', '-frames:v', '1', `${base}.end.jpg`])
  console.log('end:', `${base}.end.jpg`)
}
