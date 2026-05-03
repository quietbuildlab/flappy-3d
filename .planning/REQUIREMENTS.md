# Requirements — Flappy 3D v1

**Status:** v1 scope — endless mode polished PWA, single-player, mobile-first
**Source:** `.planning/PROJECT.md` (locked decisions) + `.planning/research/SUMMARY.md` (table-stakes + differentiators)
**REQ-ID format:** `[CATEGORY]-[NUMBER]`

---

## v1 Requirements

### Core gameplay (CORE)

- [ ] **CORE-01**: Player can flap the bird upward via tap/click/space-bar; identical input handler for all three sources
- [ ] **CORE-02**: Bird falls under constant gravity at a fixed timestep (60Hz physics decoupled from render rate)
- [ ] **CORE-03**: Bird collides with obstacles via AABB intersection (`THREE.Box3.intersectsBox`); collision triggers death
- [ ] **CORE-04**: Bird collides with floor/ceiling; collision triggers death
- [ ] **CORE-05**: Score increments by 1 each time the bird passes the midpoint of an obstacle pair
- [ ] **CORE-06**: Difficulty ramps with score: gap narrows and scroll speed increases until plateau at score ~40
- [ ] **CORE-07**: Game state machine (xstate) transitions: title → loading → playing ↔ paused → dying (800ms) → gameOver
- [ ] **CORE-08**: Player can restart from gameOver without page reload (state machine transition only)

### Visuals & rendering (VIS)

- [ ] **VIS-01**: Scene uses cel-shaded toon materials (`MeshToonMaterial` + gradient ramp texture) on bird and obstacles, evolving the Zelda-anime aesthetic
- [ ] **VIS-02**: Lighting setup includes one directional key light (with shadow disabled or low-res), one ambient/hemisphere fill — no `PCFSoftShadowMap`
- [ ] **VIS-03**: Post-processing pipeline (EffectComposer + UnrealBloomPass + VignetteShader + OutputPass) is enabled on desktop class devices
- [ ] **VIS-04**: Post-processing is reduced or disabled on devices with `navigator.hardwareConcurrency <= 4` (mid-tier mobile gate)
- [ ] **VIS-05**: Renderer DPR is capped to `Math.min(devicePixelRatio, 2)` to bound mobile fragment cost
- [ ] **VIS-06**: Color management uses sRGB output color space; tone mapping configured (ACESFilmic recommended)
- [ ] **VIS-07**: Background environment renders parallax decoration layers (sky gradient + distant mountains/trees) consistent with baseline aesthetic but with elevated craft

### UI / HUD / menus (HUD)

- [x] **HUD-01
**: DOM overlay layer (`#ui-root`) sits above the canvas with `pointer-events: none` on root and `auto` on interactive children
- [ ] **HUD-02**: Title screen displays game name, "tap to start" CTA, top-3 personal-best leaderboard, settings icon
- [ ] **HUD-03**: In-game HUD displays current score top-center, readable at 375px viewport width, updates in real time
- [ ] **HUD-04**: Pause screen shows when player taps a pause button; offers resume + back-to-title; auto-shown on `visibilitychange` (tab blur)
- [ ] **HUD-05**: Game-over screen displays final score, personal best (with "New best!" badge if exceeded), restart CTA, back-to-title CTA
- [ ] **HUD-06**: Settings screen offers sound on/off, music on/off, motion-reduce override, colorblind palette toggle; all persisted to localStorage
- [ ] **HUD-07**: All menu transitions take <150ms (CSS transitions), no canvas pause stutter
- [x] **HUD-08
**: UI uses Preact for reactive bits (score, leaderboard list, settings toggles); static screen HTML is plain DOM

### Audio (AUD)

- [x] **AUD-01
**: Audio plays via Howler.js; AudioContext is resumed inside the first `pointerup` handler synchronously (iOS unlock pattern)
- [x] **AUD-02
**: Sound effects: flap, score, death — recorded samples (not synthesized oscillators), packaged as audio sprite if size-favorable
- [x] **AUD-03
**: Background music plays in `playing` state, loops seamlessly, fades out on `dying`/`gameOver` and pauses on `paused`/tab-blur
- [x] **AUD-04
**: Sound on/off toggle in settings instantly mutes/unmutes (no reload); state persisted to localStorage
- [x] **AUD-05
**: All Howl instances created once at app init (singletons), never recreated on restart

### Animation & game feel (ANIM)

- [ ] **ANIM-01**: GSAP integrated with Three.js loop via `gsap.ticker.add` (no double-tick); tweens drive non-physics motion only
- [ ] **ANIM-02**: Squash-and-stretch on flap (~80ms cycle) using GSAP `back.out` ease
- [ ] **ANIM-03**: Score pop animation (CSS keyframe scale+fade) per scored point
- [ ] **ANIM-04**: Screen shake on death (~250ms, decaying amplitude); gated behind `!prefers-reduced-motion`
- [ ] **ANIM-05**: Particle burst on death (20–40 particles via three.quarks); gated behind `!prefers-reduced-motion`; fallback to bespoke `THREE.Points` if quarks compat fails
- [ ] **ANIM-06**: "New best!" celebration on game-over when score > prior PB (golden flash + score pop)

### Persistence & leaderboard (SAVE)

- [ ] **SAVE-01**: `StorageManager` wraps localStorage with versioned schema (v1: settings + top-10 leaderboard) and migration scaffolding
- [ ] **SAVE-02**: Personal best score persists across sessions; seeds xstate context at actor init
- [x] **SAVE-03
**: Local leaderboard stores top-5 scores with timestamp; visible on title screen and game-over
- [x] **SAVE-04
**: All settings (sound, music, motion-reduce override, colorblind palette) persist to localStorage and load on app start

### Performance (PERF)

- [x] **PERF-01
**: Production JS bundle ≤250KB gzipped (measured via `rollup-plugin-visualizer`)
- [ ] **PERF-02**: Three.js imports are named only; no `import * as THREE` anywhere in `src/`
- [x] **PERF-03
**: Sustained 60fps on iPhone 12 / Pixel 6 class device during normal play (measured via Chrome DevTools FPS meter on real device)
- [ ] **PERF-04**: Object pooling: obstacles, particles, score-popups all use `ObjectPool<T>`; no `new THREE.Mesh()` calls during gameplay
- [x] **PERF-05
**: `disposeMesh()` utility called at teardown; `renderer.info.memory` does not grow across 10 restart cycles
- [ ] **PERF-06**: Variable timestep accumulator clamps raw dt to ≤100ms (absorbs tab-return spikes)
- [ ] **PERF-07**: Event listeners use `AbortController` so they don't accumulate on restart

### PWA & offline (PWA)

- [ ] **PWA-01**: `vite-plugin-pwa` configured with `generateSW` strategy and `skipWaiting` on update
- [ ] **PWA-02**: Web App Manifest includes name, short_name, description, theme color, background color, display=standalone, all required icon sizes (192, 512, maskable)
- [ ] **PWA-03**: Service worker caches all static assets including audio files; game playable offline after first load
- [x] **PWA-04
**: Install prompt available on supported browsers (Android Chrome, desktop Chrome/Edge); not auto-fired before user has played at least once
- [x] **PWA-05
**: Lighthouse PWA audit score ≥90

### Accessibility (A11Y)

- [x] **A11Y-01
**: `prefers-reduced-motion` check in JavaScript (not just CSS) gates screen shake, particle bursts, and aggressive tweens
- [x] **A11Y-02
**: Colorblind-safe palette option uses luminance contrast as primary differentiator (verified via deuteranopia/protanopia simulation)
- [x] **A11Y-03
**: Keyboard-only path: spacebar flaps, Enter/Esc navigate menus, focus visible on all interactive elements
- [x] **A11Y-04
**: All interactive elements meet WCAG 2.1 AA contrast (≥4.5:1) and minimum 44x44px touch target
- [x] **A11Y-05
**: HUD score has `aria-live="polite"` for screen readers; game-over screen score is announced

### TypeScript & build hygiene (HYG)

- [ ] **HYG-01**: `tsconfig.json` has `"strict": true` and `"noUncheckedIndexedAccess": true`
- [ ] **HYG-02**: `tsc --noEmit` returns 0 errors; runs as part of `npm run build`
- [x] **HYG-03**: `touch-action: none` on canvas + `manipulation` on body — closes iOS double-tap-zoom + 300ms tap delay (validated 2026-04-29)
- [ ] **HYG-04**: WebGL2 capability check on init; show graceful fallback message if unsupported

### Deployment (DEPLOY)

- [ ] **DEPLOY-01**: Vite `base` configured for the chosen deployment target (GitHub Pages sub-path or custom domain — decision before Phase 4)
- [x] **DEPLOY-02
**: Production build deployable via `npm run build` + static-host upload (one command, no manual steps)
- [x] **DEPLOY-03
**: Game accessible at a public URL with HTTPS (PWA requirement)

---

## v1.1 — Beauty Pass

Visual polish layer on top of the shipped v1. Each requirement is motion-gated where applicable; bundle stays ≤250KB gzip.

### Title-screen liveliness (BEAUTY)

- [x] **BEAUTY-01
**: Bird hover-bobs with sine-wave motion (~1Hz, ±0.15m amplitude) on title state; freezes flat when `prefersReducedMotion(storage)` is true
- [x] **BEAUTY-02
**: Demo pipes scroll past on the title screen using existing `ScrollSystem` and `ObstacleSpawner`; no collision (CollisionSystem is gated on state==='playing'); music plays at lower volume
- [ ] **BEAUTY-03**: "Flappy 3D" logo letters fade in staggered ~50ms apart on title mount via GSAP timeline; one-shot (does not re-trigger on RESTART → title)
- [ ] **BEAUTY-04**: "Tap to start" CTA opacity pulses 0.6 ↔ 1.0 over 1.6s ease-in-out via CSS keyframes; static when reduced-motion is set

### In-game juice (BEAUTY)

- [x] **BEAUTY-05
**: Each `SCORE` event spawns a DOM `+1` element rising 60-80px and fading out over 600-800ms from the bird's projected screen position; gated under `prefersReducedMotion`
- [ ] **BEAUTY-06**: Optional flap trail — 2-3 fading semi-transparent bird-mesh echoes following the bird for 150-200ms after a flap; gated under `prefersReducedMotion`; default OFF in Settings (perf-conscious)
- [x] **BEAUTY-07
**: Score milestones (10, 25, 50) trigger a one-shot gold particle burst + 200ms screen-flash overlay; gated under `prefersReducedMotion`
- [ ] **BEAUTY-08**: Successive `ObstaclePair` instances cycle through 3-4 toon material colors (subtle hue shift) so consecutive pipes look distinct; cycle resets on `roundStarted`

### Glass UI refresh (BEAUTY)

- [x] **BEAUTY-09
**: `Press Start 2P` (or comparable arcade font) locally hosted as woff2 at ≤12KB; used for `<h1>`/`<h2>` only; body text remains the system stack for readability
- [x] **BEAUTY-10
**: PauseScreen, GameOverScreen, SettingsModal use `backdrop-filter: blur(12px) saturate(120%)`; falls back gracefully on browsers without `backdrop-filter` support (solid-color background)
- [x] **BEAUTY-11
**: `Button` component has a linear-gradient background + subtle inset shadow; hover and active states distinct; touch-target minimums (≥44×44px) preserved
- [x] **BEAUTY-12
**: Focus ring polished — 2-color outline (inner glow + outer ring) via `:focus-visible`; remains WCAG-AA contrast against all overlay backgrounds; verify in dark + colorblind palettes

---

## v1.2 — Modes

Time-attack + daily-seed modes layered on top of endless. Adds mode picker, per-mode leaderboard schema, deterministic-seed RNG. Seeds SEED-004 + SEED-005 consumed.

### Mode infrastructure (MODE)

- [ ] **MODE-01**: `gameMachine.context.mode` is one of `'endless' | 'timeAttack' | 'daily'` (defaults to `'endless'`); persists across rounds within a session; reset only by explicit `SET_MODE` event
- [ ] **MODE-02**: StorageManager v3 schema: `leaderboardByMode: { endless: LeaderboardEntry[], timeAttack: LeaderboardEntry[], daily: LeaderboardEntry[] }`; existing v2 `leaderboard` migrates into `leaderboardByMode.endless` on first read; backward-compatible with v2 saves
- [ ] **MODE-03**: Title screen shows a 3-option mode picker (Endless / Time-Attack / Daily); selection sends `SET_MODE` event; selected mode visually highlighted; selection persists in StorageManager settings
- [x] **MODE-04
**: In `mode === 'timeAttack'`, a 60-second countdown timer starts on round start (`roundStarted` event); timer ticks down at 1s intervals
- [x] **MODE-05
**: HUD displays the timer in time-attack mode (top-right, mm:ss format); ARIA-live label for screen readers
- [x] **MODE-06
**: When time-attack timer reaches 0, `gameMachine` transitions to `gameOver` (auto-end, no death required); GameOver shows mode-specific PB and leaderboard
- [ ] **MODE-07**: In `mode === 'daily'`, ObstacleSpawner uses a seeded RNG (mulberry32 implementation, ~10 LOC) instead of `Math.random()`; seed derived from UTC date `parseInt(YYYYMMDD, 10) % 0xFFFFFFFF`
- [ ] **MODE-08**: StorageManager tracks daily attempts: `dailyAttempts: { 'YYYY-MM-DD': { count, best } }`; Title shows "Today's best: N (M attempts)" when daily mode is selected
- [ ] **MODE-09**: GameOver in daily mode offers a "Share" button copying `Daily YYYY-MM-DD: <score> 🐦` to clipboard via `navigator.clipboard.writeText()`; gracefully no-ops on browsers without clipboard API

---

## v1.3 — Atmosphere

Cloud parallax + day/night cycle. Two phases (12, 13). Seeds SEED-001 + SEED-002 consumed.

### Sky / clouds (ATMOS)

- [ ] **ATMOS-01**: 4-6 cloud meshes scroll at 0.5× scrollSpeed in all states except `gameOver`/`paused`/`title` (clouds always scroll on title for ambient life); cloud sprites are inline SVG-as-data-URL baked into JS bundle (≤2KB total cloud-asset overhead)
- [ ] **ATMOS-02**: Cloud meshes use `MeshBasicMaterial` with `transparent: true`, `depthWrite: false`; color tuned for default + colorblind palettes (desaturated white/gray); positioned at z≈-7 (between sky shader at z=-10 and mountains)
- [ ] **ATMOS-03**: Sky `ShaderMaterial` uniforms `uTopColor` and `uBottomColor` lerp between 4-5 keyframe color pairs over a continuous 60s cycle (or step on score milestones — planning-time decision)
- [ ] **ATMOS-04**: Sky color animation gated by `prefersReducedMotion(storage)`: when reduced-motion, sky holds default morning-blue colors (no animation); cycle resets on `roundStarted`

---

## v1.4 — Polish (3D scene)

Final character + camera polish. Consumes SEED-003. Two phases (14, 15).

### Bird + camera (POLISH)

- [x] **POLISH-01**: Bird toon material extends with rim-light contribution (subtle edge glow); strength configurable via uniform; preserves WCAG-AA contrast against sky in default + colorblind palettes ✓ Phase 14
- [x] **POLISH-02**: Bird mesh gains 2 small wing geometries (Plane or thin Box) as children; on each `FLAP`, wings rotate via GSAP timeline (~80ms); motion-gated via `prefersReducedMotion(storage)` ✓ Phase 14
- [x] **POLISH-03**: New "Camera bob" Settings toggle (default OFF) — when ON AND `prefersReducedMotion(storage)` is false, camera y-offset eases toward `bird.velocity.y * factor` per frame; resets to original on `roundStarted` ✓ Phase 15

---

## v1.5 — Approachability + Customization

Direct user feedback after v1.4 ship: "make it easier to play" and "let players change the bird shape or upload a picture". Two phases (16, 17). Schema bump v3 → v4.

### Difficulty + bird customization (POLISH)

- [x] **POLISH-04**: New "Difficulty" Settings picker (Easy / Normal / Hard) — Easy multiplies gap×1.25, scroll×0.85, spawn×1.20; Hard inverts (gap×0.85, scroll×1.10, spawn×0.90). Fresh-install default is Easy; v1/v2/v3 saves migrate to Normal so existing players don't get a surprise re-balance. ✓ Phase 16
- [x] **POLISH-05**: New "Bird shape" Settings picker (Sphere / Cube / Pyramid) — `bird.setShape()` swaps body geometry while preserving wings, rim light, squash-stretch, and ghost trail. Default sphere. Hidden when a custom image is set. ✓ Phase 17
- [x] **POLISH-06**: "Bird image" upload in Settings — user picks an image file, it's resized to 256×256 PNG via canvas, stored as base64 data URL in `localStorage` (≤1.5 MB cap), applied as a textured plane that replaces the body. Wings hide in image mode. "Clear" button restores selected shape. ✓ Phase 17

---

## v1.6 — Cross-cutting Polish (informal, in response to direct user feedback)

Six items the user flagged after v1.5 ship. Shipped as one combined feat commit
(see `feat(v1.6): tackle all 6 feedback items`). Documented retroactively for
traceability — no formal phase numbers.

- [x] **POLISH-07**: Title screen redesigned — bird lifted to mascot
  position, blur removed, foreground ground strip added (#1)
- [x] **POLISH-08**: Bird beak + eyes added; pipes get rim caps (#2)
- [x] **POLISH-09**: Render interpolation hook in GameLoop for smoother
  motion on >60Hz displays (#3)
- [x] **POLISH-10**: Settings modal — section grouping + emoji icons +
  tooltip-based explanations (#4)
- [x] **POLISH-11**: Bundle hygiene — font moved to src/assets, PWA glob
  includes woff2 (#5)
- [x] **POLISH-12**: Postprocessing quality tiers (Auto/Low/Medium/High)
  replace binary mobile-vs-desktop gating (#6)

---

## v1.7 — Diorama Flight Pass (informal, single direction-shift feedback)

Steered the project from "2D Flappy with 3D objects" toward a layered
storybook diorama. Single combined commit (`feat(v1.7): Diorama Flight Pass`).

- [x] **DIORAMA-01**: Bird character — rounded wings + tail feathers +
  velocity-based pitch
- [x] **DIORAMA-02**: Pipe diorama — bevel + rim band + subtle Y rotation
- [x] **DIORAMA-03**: WorldLayers entity — foreground grass + midground
  shrubs + parallax depth
- [x] **DIORAMA-04**: Camera follow + FOV pulse on milestone
- [x] **DIORAMA-05**: Title scene framing via flex-grow spacer
- [x] **DIORAMA-06**: Depth-event balloon drifting behind play lane
- [x] **DIORAMA-07**: Visual screenshot harness (Playwright × 2 viewports
  × 2 states)

---

## v1.8 — Stickiness + Hygiene Pass (PLANNED 2026-05-03)

After v1.7 the project is visually polished but has zero retention hook
(every session is identical) and accumulated ops debt. Three phases (18,
19, 20) — each independently executable.

### Player progression (PROG)

- [ ] **PROG-01**: New `unlocks: BirdShape[]` field in Settings v5 schema.
  Initial `birdShape` choices restricted to `sphere`. Other shapes
  (`cube`, `pyramid`) + emoji animals unlock at score thresholds:
  `cube` = 5, `pyramid` = 15, `bird` = 30, `cat` = 50, `dog` = 75,
  `frog` = 100, plus 2 new high-end animals (`unicorn` 🦄 = 150,
  `penguin` 🐧 = 200). Default install gets `unlocks: ['sphere']`.
  v4 → v5 migration grandfathers existing users with `unlocks: ALL_SHAPES`
  (no surprise loss of access).
- [ ] **PROG-02**: SettingsModal shape picker shows locked shapes greyed
  out + tooltip "Unlock at score N". Tap-on-locked shows a brief flash.
- [ ] **PROG-03**: On gameOver, if the score crosses a new threshold,
  show a "🔓 Unlocked: 🐦" toast for ~3s in the GameOver screen (or
  bottom of HUD if implementing on next-round-start). Subtle, motion-gated.

### Ops hygiene (OPS)

- [ ] **OPS-01**: Bump `actions/checkout`, `actions/setup-node`,
  `actions/configure-pages`, `actions/upload-artifact` to versions that
  support Node 22 (or set `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` env)
  in `.github/workflows/deploy.yml`. Silences Node 20 deprecation warning
  before the Sep 16 2026 deadline.
- [ ] **OPS-02**: Migrate `tests/visual-screenshots.spec.ts` from
  informational PNGs to true visual regression via
  `expect(...).toHaveScreenshot()`. Commit baseline images. CI fails on
  pixel-diff above default threshold (will need explicit `--update-snapshots`
  to refresh). Pin Playwright pixel-diff threshold to ~0.1% to handle
  font + bloom variance.
- [ ] **OPS-03**: Review Lighthouse pin (`@^11.7.1`) — either bump to v12
  with the new audit categories that replaced PWA, or document the pin
  reason permanently. Current pin is suspected-stale.

### Audio polish (AUDIO)

- [ ] **AUDIO-06**: Per-mode music tracks — endless gets the existing
  chiptune; time-attack gets a faster track; daily gets a more
  contemplative one. AudioManager learns to `setMusicTrack(modeKey)`
  and crossfade across track switches. Falls back gracefully to current
  single track if the new tracks aren't sourced yet.
- [ ] **AUDIO-07**: Sub-bus mixing — separate master / music / sfx volumes
  in AudioManager, exposed via Settings (3 sliders or 3 +/- toggles).
  Existing single Sound + Music toggles are equivalent to setting volume
  to 0 / restoring it. Persists in Settings v5.
- [ ] **AUDIO-08**: Title-screen ambient layer (low-volume wind / chirp
  loop) and depth-event balloon "fly-by" whoosh. Both motion-gated via
  AudioManager mute when sound is off.

---

## v2 / Deferred

These are valuable but deliberately out of v1 scope. Add post-launch.

- **MODES-V2-01**: Time-attack mode (60s, score as much as possible)
- **MODES-V2-02**: Daily-seed challenge (deterministic obstacle layout per day)
- **MODES-V2-03**: Hardcore mode (tighter gaps, faster scroll, no continues)
- **LB-V2-01**: Global leaderboard via Supabase free tier (account-optional, name + score)
- **SOCIAL-V2-01**: Share-score web-share API integration
- **SKINS-V2-01**: Character skin selector (cosmetic only)
- **HAPTIC-V2-01**: Vibration API on Android (silent no-op on iOS)
- **MEDALS-V2-01**: Bronze/silver/gold/platinum medal system at 10/20/30/40 thresholds
- **ASSETS-V2-01**: Modeled hero bird via GLTF (replace procedural)

---

## Out of Scope (explicit exclusions)

- **Native mobile builds (React Native / Capacitor / Tauri)** — PWA reach is sufficient; app-store submission is overhead we're not paying for
- **Multiplayer / realtime** — single-dev v1; doesn't fit core value
- **User accounts / auth** — local-only persistence covers solo play; accounts come with leaderboard v2 if traction warrants
- **AI-generated art mid-build** — baseline was 100% AI-generated; we're hand-crafting for differentiation
- **Engine swap (Babylon, PlayCanvas, Unity, Godot WebGL)** — Three.js is sufficient; engine tax buys nothing for this scope
- **react-three-fiber / R3F** — vanilla Three.js for smallest bundle and direct control
- **Physics engine (cannon-es, rapier)** — hand-rolled AABB is ~20 lines and zero KB
- **Modeled environment assets (GLTF for trees/terrain)** — procedural matches the baseline aesthetic and saves bundle weight
- **Ads, IAP, monetization** — not relevant to the "beat the baseline" goal
- **Backend / server** — entirely client-side
- **Analytics SDKs** — privacy-friendly approach; if needed later, use lightweight first-party only

---

## Requirement Quality Notes

All v1 requirements are:
- **Specific**: include exact APIs, libraries, thresholds (not "handle audio" but "audio plays via Howler.js with iOS unlock")
- **Testable**: each can be verified by running the build, inspecting code, measuring with DevTools, or playing on a target device
- **User-centric (where applicable)**: phrased as user-facing capabilities, not implementation details (HYG/PERF necessarily reference internals)
- **Atomic**: one capability per ID

---

## Traceability

Populated by `gsd-roadmapper` on 2026-04-28. Every v1 REQ-ID maps to exactly one phase.

| REQ-ID | Phase | Status |
|--------|-------|--------|
| CORE-01 | Phase 1 | Pending |
| CORE-02 | Phase 1 | Pending |
| CORE-03 | Phase 1 | Pending |
| CORE-04 | Phase 1 | Pending |
| CORE-05 | Phase 2 | Pending |
| CORE-06 | Phase 2 | Pending |
| CORE-07 | Phase 2 | Pending |
| CORE-08 | Phase 2 | Pending |
| VIS-01 | Phase 2 | Pending |
| VIS-02 | Phase 1 | Pending |
| VIS-03 | Phase 2 | Pending |
| VIS-04 | Phase 2 | Pending |
| VIS-05 | Phase 1 | Pending |
| VIS-06 | Phase 1 | Pending |
| VIS-07 | Phase 2 | Pending |
| HUD-01 | Phase 3 | Pending |
| HUD-02 | Phase 3 | Pending |
| HUD-03 | Phase 3 | Pending |
| HUD-04 | Phase 3 | Pending |
| HUD-05 | Phase 3 | Pending |
| HUD-06 | Phase 3 | Pending |
| HUD-07 | Phase 3 | Pending |
| HUD-08 | Phase 3 | Pending |
| AUD-01 | Phase 3 | Pending |
| AUD-02 | Phase 3 | Pending |
| AUD-03 | Phase 3 | Pending |
| AUD-04 | Phase 3 | Pending |
| AUD-05 | Phase 3 | Pending |
| ANIM-01 | Phase 3 | Pending |
| ANIM-02 | Phase 3 | Pending |
| ANIM-03 | Phase 3 | Pending |
| ANIM-04 | Phase 3 | Pending |
| ANIM-05 | Phase 3 | Pending |
| ANIM-06 | Phase 3 | Pending |
| SAVE-01 | Phase 2 | Pending |
| SAVE-02 | Phase 2 | Pending |
| SAVE-03 | Phase 3 | Pending |
| SAVE-04 | Phase 3 | Pending |
| PERF-01 | Phase 4 | Pending |
| PERF-02 | Phase 1 | Pending |
| PERF-03 | Phase 4 | Pending |
| PERF-04 | Phase 2 | Pending |
| PERF-05 | Phase 5 | Pending |
| PERF-06 | Phase 1 | Pending |
| PERF-07 | Phase 1 | Pending |
| PWA-01 | Phase 4 | Pending |
| PWA-02 | Phase 4 | Pending |
| PWA-03 | Phase 4 | Pending |
| PWA-04 | Phase 4 | Pending |
| PWA-05 | Phase 4 | Pending |
| A11Y-01 | Phase 4 | Pending |
| A11Y-02 | Phase 4 | Pending |
| A11Y-03 | Phase 4 | Pending |
| A11Y-04 | Phase 4 | Pending |
| A11Y-05 | Phase 4 | Pending |
| HYG-01 | Phase 1 | Pending |
| HYG-02 | Phase 1 | Pending |
| HYG-03 | Phase 1 | Pending |
| HYG-04 | Phase 1 | Pending |
| DEPLOY-01 | Phase 4 | Pending |
| DEPLOY-02 | Phase 4 | Pending |
| DEPLOY-03 | Phase 4 | Pending |
| BEAUTY-01 | Phase 6 | Pending |
| BEAUTY-02 | Phase 6 | Pending |
| BEAUTY-03 | Phase 6 | Pending |
| BEAUTY-04 | Phase 6 | Pending |
| BEAUTY-05 | Phase 7 | Pending |
| BEAUTY-06 | Phase 7 | Pending |
| BEAUTY-07 | Phase 7 | Pending |
| BEAUTY-08 | Phase 7 | Pending |
| BEAUTY-09 | Phase 8 | Pending |
| BEAUTY-10 | Phase 8 | Pending |
| BEAUTY-11 | Phase 8 | Pending |
| BEAUTY-12 | Phase 8 | Pending |
| MODE-01 | Phase 9 | Pending |
| MODE-02 | Phase 9 | Pending |
| MODE-03 | Phase 9 | Pending |
| MODE-04 | Phase 10 | Pending |
| MODE-05 | Phase 10 | Pending |
| MODE-06 | Phase 10 | Pending |
| MODE-07 | Phase 11 | Pending |
| MODE-08 | Phase 11 | Pending |
| MODE-09 | Phase 11 | Pending |
| ATMOS-01 | Phase 12 | Pending |
| ATMOS-02 | Phase 12 | Pending |
| ATMOS-03 | Phase 13 | Pending |
| ATMOS-04 | Phase 13 | Pending |
| POLISH-01 | Phase 14 | Pending |
| POLISH-02 | Phase 14 | Pending |
| POLISH-03 | Phase 15 | Pending |
| POLISH-04 | Phase 16 | Pending |
| POLISH-05 | Phase 17 | Pending |
| POLISH-06 | Phase 17 | Pending |
| POLISH-07..12 | (v1.6 informal) | Done |
| DIORAMA-01..07 | (v1.7 informal) | Done |
| PROG-01..03 | Phase 18 | Pending |
| OPS-01..03 | Phase 19 | Pending |
| AUDIO-06..08 | Phase 20 | Pending |
