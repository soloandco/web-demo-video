# Checking a finished video

```bash
node lib/qa.mjs out/video.mp4 --sheet 16 --end
```

Prints codec, size, fps, duration and audio, and writes two images next to the video:
`video.sheet.jpg` (16 evenly spaced frames) and `video.end.jpg` (last 1.5 s every 0.3 s).

## Look for

| Where | What |
|---|---|
| Sheet | Captions cut off or overlapping controls, half-open dialogs, blank or white frames, cursor far from what it clicks, real data |
| End strip | Logo or closing line appearing late, video ending mid-fade |
| Transitions | Extract the frames around each scene change (`remotion still --frame` or `ffmpeg -ss`). Wrong camera framing hides there |
| Numbers | Every count-up ends on the value the next real screenshot shows |
| Brand | Search the source for banned names and colours before rendering, not after |

## Before handing over

- State the style, length and size
- List which parts are staged (metaphors, faked server responses) and which are the product working
- Say what you could not check (for example: you cannot hear the voice-over)
- Delete scratch frames and screenshots; keep scripts and the storyboard
