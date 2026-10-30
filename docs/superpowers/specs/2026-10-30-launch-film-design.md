# NakharaX Group Launch Film — Design

## Authority and intent
The Founder chose **Launch Film**, requested the design/Superpowers/kinetic-film skill combination, then explicitly delegated design and implementation without another approval round, while retaining the existing layout and prohibiting paid services. The installed design and motion skills are `claude-design` and `scenario-kinetic-film`; the literal names `ai-design` and `kinetic-flim` were not installed.

Create an original brand film that communicates the existing NakharaX story and opens from the existing “Watch the vision” dialog. This is a Decide/Learn surface; the surrounding site is not an operations dashboard.

## Approaches
- Website polish: improve the page first and retain the old motion study; lower scope but not the chosen outcome.
- Cinematic Orbit: redesign the page and its motion together; broader visual changes than requested.
- **Launch Film (Founder selection):** create the film and its player, change the dialog only, preserve the page and Three.js scene.

## Builder decisions
- A deterministic Canvas 2D film, authored as scene blocks on a 160 BPM grid: 64 beats / 24 seconds. Existing HTML/CSS/JavaScript stack; no framework migration or runtime dependency.
- The live film is code, not a heavyweight new video download. The same renderer exports a 1920×1080, 60 fps MP4 plus WebM for review. Exports are review artifacts; the repository contains the reproducible source and exporter.
- Reuse the supplied, unmodified NakharaX icon and locally licensed Space Grotesk / Noto Sans Thai fonts. Dark navy, champagne gold and selective violet borrow from existing brand tokens. No replacement logo, invented metrics, testimonials or customer claims.
- Sound is an original deterministic synthesized score and sound effects produced locally from the same PCM synthesis function used by the browser. No Scenario generation, paid APIs, stock music or unverified licensing claims.
- Eight 3-second blocks: Beyond ideas; Into impact; Human ambition; Engineered intelligence; XpFirm (risk & discipline); NakharaX Protocol (distinct initiative); human-led internal AI workforce; NakharaX Group end card. English display copy and Thai/English captions/transcript reflect the site's current language.
- Large kinetic words, whip/push transitions, beat cuts, orbit geometry, restrained grain in the encoded export. The brand end card is the only intentional rest.

## Integration and boundaries
Keep sections, navigation, EN/TH controls, Cosmic/Pearl themes, project claims, vendor bundles, existing assets and 3D camera behavior. Replace only the old film contents and duplicate film event handlers. A standalone authoring page uses the same player. The film player loads independently of the Three.js module, so scene initialization failure must not disable it.

Native dialog handles modal focus and Escape. The player provides play/pause, restart, mute, seek, chapters, elapsed time and an accessible transcript. Opening is a user gesture; reduced-motion users initially receive a still with an explicit Play choice. Close, page hiding and end-of-film stop playback/audio; reopening resumes consistently without accumulating audio sources or animation loops. Sound failure must not prevent silent playback. Controls remain at least 44×44 CSS pixels on narrow mobile, tablet and desktop.

## Verification and delivery
Tests first: timeline clamping/boundaries/non-finite input; deterministic bounded audio; actual browser playback, seek/chapters, end, pause/reopen/Escape, reduced motion, no-WebGL independence, local assets and responsive bounds. Export both codecs, validate dimensions/duration/frame count/audio loudness/decoding, inspect representative frames and measure motion with the kinetic-film analysis scripts. Report Linux/browser evidence separately from unavailable macOS hardware decoder or independent-human review.

All product execution occurs in a bounded rootless sandbox without host home, credentials, peer workspaces, engine sockets or network during tests/rendering. No merge, default-branch push, release, deployment or paid service. Handoff: task branch and Draft PR, real exported files and truthful test results. Existing deployment observations show GitHub Pages deploying `main`; no repository workflow exists. Recheck remote state before publication and never change `main`.
