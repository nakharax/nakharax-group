# NakharaX Launch Film Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a real original 24-second brand film and integrate its accessible player into the existing website without redesigning the page.

**Architecture:** A pure Canvas renderer consumes a beat-grid specification. A separate player owns lifecycle and original synthesized audio; the browser and offline exporter use the same renderer and audio generator. Integration only replaces the old dialog internals and removes duplicate old handlers.

**Tech Stack:** Existing vanilla HTML/CSS/JavaScript, Canvas 2D, Web Audio, Node built-in tests, Playwright, FFmpeg.

**Spec:** `docs/superpowers/specs/2026-10-30-launch-film-design.md`

## Global Constraints
- Keep the existing layout, Three.js scene, original logo/fonts and product boundaries.
- 160 BPM, 64 beats, 24 seconds; review exports 1920×1080 at 60 fps.
- No paid services, deployment, merge or default-branch writes.
- Deterministic time-based rendering and identical browser/export PCM synthesis.
- Execute tests and renders only in a bounded rootless sandbox with no host secrets/network.
- Remote code handoff uses a task branch and Draft PR. Video files are downloadable review artifacts, not a new mandatory runtime download.

## Review Focus
- Non-finite/out-of-range seeks must clamp to a valid frame; test in Task 1.
- Close/reopen, seeking while playing and hidden tabs must not leave audio or animation running; test in Task 2.
- Web Audio unavailable/denied and Three.js failure must retain a functional silent film; test in Task 2.
- Reduced-motion and narrow viewports must keep explicit playback and usable 44px controls; test in Task 2.
- Exported media must represent the same final renderer/audio and decode/play, not only have correct metadata; verify in Task 3.

---

### Task 1: Deterministic film and original soundtrack
**Files:** create `launch-film/spec.mjs`, `launch-film/renderer.mjs`, `launch-film/audio.mjs`, `tests/film.test.mjs`.
**Interfaces:** consumes existing `assets/nakharax-icon.png` and licensed fonts. Produces `DURATION`, `CHAPTERS`, `frameState(seconds)`, `drawFrame(context, seconds, assets, language)`, `synthesizeAudio(sampleRate)` returning mono Float32Array.
- [ ] Write Node tests for scene selection at 0/3/12/21/24 seconds, clamp invalid timestamps, deterministic samples, finite headroom and silence after the ending envelope.
- [ ] Run `node --test tests/film.test.mjs`; confirm failure because the film modules are absent.
- [ ] Implement the scene specification, full-frame kinetic typography/orbits and original PCM synthesis.
- [ ] Run the complete Node suite and confirm all tests pass.
- [ ] Commit `feat(film): add deterministic brand film and original soundtrack`.

### Task 2: Accessible player and minimal website integration
**Files:** create `launch-film/player.mjs`, `launch-film/film.css`, `launch-film/index.html`, `tests/browser.mjs`; modify `index.html`, `app.js`, `package.json`.
**Interfaces:** consumes Task 1 exports. Produces `mountFilm(root)` and a returned player with `play()`, `pause()`, `seek(seconds)`, `getState()` and `ready` for standalone authoring/export. Native controls and dialog events are the public website interface.
- [ ] Write browser tests for actual canvas changes, play/pause/seek/chapter/end, mute, dialog close/reopen/Escape, reduced motion, hidden-page pause, missing audio, and film independence from Three.js. Check local-only requests, console errors and 44px controls at 360/768/1440px.
- [ ] Run the browser suite against the old site; confirm failure because the new film player is absent.
- [ ] Implement lifecycle and accessible controls. Replace only film dialog content, remove old duplicate controllers, keep the rest of the page unchanged. Add npm scripts without introducing a production dependency.
- [ ] Run all Node and browser tests in the sandbox; inspect screenshots and fix demonstrated defects.
- [ ] Commit `feat(site): connect accessible launch film to existing vision dialog`.

### Task 3: Export, verify and hand off
**Files:** create `scripts/export-film.mjs`, `scripts/film-audio.mjs`, `launch-film/README.md`; update `README.md`; add a sanitized verification receipt.
**Interfaces:** consumes the standalone player's seek/ready interface and Task 1 audio. Produces MP4/WebM/poster/contact sheet outside the public runtime, plus byte/hash receipts.
- [ ] Verify the export script rejects a missing browser/FFmpeg or invalid output arguments clearly, without inventing media.
- [ ] Render deterministic 1080p/60 fps frames with subframe motion blur; encode MP4/H.264 and WebM/VP9 with the original audio and fast-start where supported.
- [ ] Run FFprobe, full FFmpeg decode, browser advancing-currentTime playback for both outputs, loudness and kinetic motion checks. Inspect representative frames/contact sheets.
- [ ] Run the full Node/browser suites and `git diff --check`, review the whole branch, record limitations and hashes, and commit documentation/tools.
- [ ] Push only the task branch using an existing authorized transport; create a Draft PR and read back its exact head, draft state and checks. Deliver exported media and PR; no merge or deploy.

## Execution
The Founder explicitly chose autonomous continuation. Execute inline without another design/plan approval prompt. If no fresh-reviewer tool is available, perform a separate self-review pass and label that limitation. Missing remote authentication must not be bypassed by extracting credentials; use the existing GitHub RW integration and preserve source/media artifacts.
