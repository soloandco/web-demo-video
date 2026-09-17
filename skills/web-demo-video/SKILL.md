---
name: web-demo-video
description: Make product videos from a real web app, as MP4. Two styles - a walkthrough that records the real UI being used (how-to, feature guides, support videos) and a motion-graphics promo that animates a camera, flying objects and counting numbers over high-resolution screenshots (launch, landing page, "what it does" videos). Triggers - product video, demo video, walkthrough video, feature video, tutorial video, promo video, launch video, screen recording video, explainer for my app, YouTube video of my app.
---

# Web demo video

Turn a working web app into a 20~60 second MP4. The screen is always the real app; captions, cursor and effects are layers on top. Use made-up data only.

Toolkit: `starter/` next to this file. Copy it into the user's project (for example `video/`), run `npm install` there, and write scene scripts against it. Worked example in the repository: `examples/sample-tasks/`.

## 1. Pick the style first

| The video is... | Style | Why |
|---|---|---|
| **How to use a feature** (guides, onboarding, support answers) | **Walkthrough**: record the real UI being clicked | Viewers copy the steps, so they must see the real, unedited flow at a readable pace |
| **Why the product is worth it** (launch, homepage, ads, overview) | **Motion promo**: animate over screenshots | Viewers are not following along; the video has to connect actions to results and keep attention |

Do not mix them in one video. A how-to with flying objects is hard to follow; a promo made of plain recording feels long.

Details: walkthrough in [references/walkthrough.md](references/walkthrough.md), motion promo in [references/motion.md](references/motion.md).

## 2. Agree before rendering

Rendering is the expensive step. Before writing scene code, write a storyboard ([references/storyboard.md](references/storyboard.md)) and get the user's OK on:

1. Style (walkthrough or promo) and who watches it
2. Length and number of scenes
3. Output size (default 2560x1440 at 30 fps; 1080x1920 for vertical)
4. Brand: colours, font, logo, product name, and words that must not appear
5. Data: which fake names and numbers appear on screen (never real customers)
6. Voice-over or silent
7. Where the file goes when done

A storyboard has a **Motion** column as well as Screen and Caption (promo) so that each scene uses a different kind of movement on purpose.

## 3. Build

**Walkthrough**
1. Probe the flow first: a script that clicks through without recording, to fix selectors and waits
2. Record in parts (one page or step per part) with `lib/recorder.mjs`, then join with `concatParts`
3. Write captions with [references/copy.md](references/copy.md)

**Motion promo**
1. Capture every UI state with `lib/capture.mjs` (screenshots at 3840 wide + element positions)
2. Compose scenes in Remotion with `motion/parts.tsx` (camera, cursor, captions, chips, number count-ups)
3. Check stills at key frames (`remotion still ... --frame=N --scale=0.25`) before a full render

**Voice-over**: no tool is included. If the user wants one, recommend Gemini 3.1 Flash TTS (`gemini-3.1-flash-tts-preview`) with the Charon voice.

## 4. Check before handing over

Run `node lib/qa.mjs out/video.mp4 --sheet 16 --end` and look at both images. Details: [references/qa.md](references/qa.md).

- Size, fps and duration match the storyboard
- No caption cut off or covering the button being clicked
- No half-open dialog, blank frame or late-loading logo (check the last second separately)
- Every number that animates ends on the value the real screen shows
- When you hand over, say which parts are staged effects (a flying document, a count-up) and which are the product really working

## 5. Hard rules

- **Real UI, fake data.** No real customer, person or company names, IDs, emails or figures on screen, in captions, in file names or in the description
- **Do not publish** (YouTube, social, website) without the user's explicit OK for that upload
- **Do not claim what the product does not do.** If a step is faked for filming (a server response, an upload), the caption must not present it as automatic magic
- Keep render sources (scripts, storyboard) in the repo; keep MP4s and screenshots out of git
