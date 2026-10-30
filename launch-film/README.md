# NakharaX Group — A Shared Orbit

An original 24-second kinetic brand film, integrated into the existing website's **Watch the vision** dialog. The site layout and its interactive Three.js scene remain intact. Open the standalone authoring player at `launch-film/` through a local static server.

## Authoring
- `spec.mjs`: eight story chapters and their 160 BPM beat grid; English/Thai captions.
- `renderer.mjs`: deterministic Canvas 2D frames. Calling `drawFrame(context, seconds, assets, language)` in any order gives the same picture for the same input.
- `audio.mjs`: original locally synthesized music and sound effects. The browser and exporter use this same PCM generator, not two separately composed soundtracks.
- `player.mjs`: accessible playback, sound, seeking, chapter navigation, transcript and dialog lifecycle. No video needs downloading before the live film can play.
- `film.css`: scoped player styles and local font declarations. No external runtime asset requests.

The supplied NakharaX icon is reused intact. Existing Space Grotesk and Noto Sans Thai files and their OFL notices remain under `assets/fonts`. No stock music, generated photography, new external service or paid asset is used. Project descriptions preserve the existing boundaries: XpFirm is risk/discipline, Protocol is a distinct initiative, AI workforce is internal and human-led. This film is not launch/availability evidence or live telemetry.

## Play and accessibility
Normal opening is a user-initiated play action. Reduced-motion preference opens a still instead; explicit Play remains available. Sound can be muted; if Web Audio is missing or fails, playback remains available silently. Canvas focus supports Space, Left/Right (one chapter), and Home. The seek range and chapter buttons work without dragging. The full transcript is readable separately from the animation.

Closing, Escape, pagehide and background visibility stop the player. The 3D background pauses while the film dialog is open and restores its previous motion state after closing.

## Verify
Use Node 18+ for unit tests; the exercised environment was Node 22.20.0 and Chromium from `@playwright/test@1.56.1`.

```sh
npm test
# In your isolated development environment, install the exact browser-test tooling once:
npm install --no-save --ignore-scripts --package-lock=false @playwright/test@1.56.1
npx playwright install chromium
npm run test:browser
```

The browser test script starts a temporary loopback-only HTTP server. It tests the actual site/player at mobile, tablet and desktop widths; the standalone film is checked with no external requests. Test screenshots and receipts go into ignored `.runtime/`. No CI workflow, release or deployment is added.

## Export the actual film
Install FFmpeg with H.264, VP9 and Opus encoding in your isolated build environment, then:

```sh
npm run export:film -- --output .runtime/output
# If FFmpeg is not on PATH:
FFMPEG=/path/to/ffmpeg npm run export:film -- --output .runtime/output
```

Outputs:
- `nakharax-launch-1080p60.mp4` — 1920×1080, 60 fps, H.264 High/Level 4.2, AAC, fast-start.
- `nakharax-launch-1080p60.webm` — VP9/Opus companion for browsers without H.264 support.
- `original-score.wav`, `poster.jpg`, `contact-sheet.jpg` and `export-receipt.json`.

The exporter renders the same local Canvas code with three real subframe samples per encoded frame; it never samples across a hard cut. Audio is normalized toward -14 LUFS. Files are actual review artifacts, not checked-in runtime downloads. The receipt includes byte lengths/SHA-256 and source hashes. Render determinism describes the authored frames/PCM; codec output can vary across FFmpeg versions.

Review exports do not prove deployment, Safari/mobile hardware decoding or independent human acceptance. Validate FFprobe frame counts, full decode, browser advancing playback, loudness and motion before handoff. No automatic merge or deploy is authorized by running these scripts.
