# web-demo-video

[한국어](README.ko.md)

A Claude Code skill and toolkit for making product videos from a real web app.

- **Walkthrough**: records the real UI being used, with captions, a smooth cursor, click ripples and highlights. For how-to and support videos.
- **Motion promo**: animates a camera, travelling objects and counting numbers over high-resolution screenshots. For launch and homepage videos.

Output is 2560x1440, 30 fps H.264 by default.

The skill also carries the working rules that matter more than the code: pick the style by purpose, agree on a storyboard before rendering, show a new screen whole before zooming in, vary the movement between scenes, write captions from real user questions, check frame sheets before handing over, and never put real customer data on screen.

## Install

In Claude Code:

```
/plugin marketplace add soloandco/web-demo-video
/plugin install web-demo-video@web-demo-video
```

Then ask for a video, for example: *"Make a 30 second walkthrough of the invoice export flow in my app"*. Claude picks the style, drafts a storyboard for your OK, copies the starter toolkit into your project and builds the video.

Requirements on the machine: Node 20+, Google Chrome, ffmpeg.

## Try the example

The repository includes a made-up task app and scripts that produce one video of each style.

```bash
git clone https://github.com/soloandco/web-demo-video
cd web-demo-video
npm install

npm run example:record      # -> out/sample-tasks-walkthrough.mp4  (~30 s to record)
npm run example:capture     # screenshots for the promo
npm run example:render -- --browser-executable="<path to chrome>"   # -> out/sample-tasks-motion.mp4 (a few minutes)
```

Set `CHROME_PATH` if Chrome is not in the default location. Remotion's render needs `--browser-executable` to use your Chrome instead of downloading one.

## Layout

```
skills/web-demo-video/
  SKILL.md              what Claude follows
  references/           storyboard, captions, walkthrough, motion, QA
  starter/              toolkit copied into your project
    lib/recorder.mjs    walkthrough recording
    lib/capture.mjs     screenshots + element positions
    lib/qa.mjs          probe + frame sheets
    motion/             Remotion project (theme, parts, your scenes)
examples/sample-tasks/  demo app and scripts for both styles
```

## Notes

- Everything shown in the example is fictional.
- Voice-over is not included. Recommended: Gemini 3.1 Flash TTS (`gemini-3.1-flash-tts-preview`) with the **Charon** voice.
- Motion effects such as a document flying into a form are illustrations. When you publish a video, keep captions honest about what the product actually does.
- The motion style depends on Remotion, which has its own license: free for individuals, non-profits and for-profit companies with up to 3 employees; larger companies need a Remotion company license. See [remotion.dev/license](https://www.remotion.dev/license). The walkthrough style does not use Remotion.

## License

MIT
