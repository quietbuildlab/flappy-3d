# Roadmap — Flappy 3D

**Milestones:** v1 (shipped, awaiting tag) + v1.1 Beauty Pass (in planning)
**Granularity:** Coarse (5 phases v1 + 3 phases v1.1)
**Coverage:** 62/62 v1 requirements + 12 BEAUTY-* requirements mapped
**Generated:** 2026-04-28 (v1) · 2026-04-29 (v1.1 added)

---

## Phases

- [x] **Phase 1: Scaffold + Core Loop** — Bird falls, flaps, and collides; renderer hardened against mobile pitfalls; TypeScript strict mode enforced from commit 1 ✓ (2026-04-28)
- [x] **Phase 2: Game Machine + Obstacles + Rendering** — Full playable loop with XState state machine, pooled obstacle system, toon rendering, and difficulty ramp ✓ (2026-04-29)
- [x] **Phase 3: UI + Audio + Polish** — All four screens, Howler audio, GSAP juice (squash, shake, particles), persistence, leaderboard ✓ (2026-04-29)
- [x] **Phase 4: PWA + Accessibility + Bundle Audit** — Lighthouse PWA 1.00 (gate ≥0.90), offline play, colorblind palette, 188KB / 250KB budget, GitHub Pages deploy ✓ (2026-04-29; PERF-03 60fps still pending real-device check)
- [x] **Phase 5: Hardening + Ship** — DEV memory probe + AbortController on resize listeners, real CC0 audio (Kenney + Junkala), iOS silent-switch note, README hardening procedures, docs/SHIPPED.md ✓ (2026-04-29; 7 runtime/device checks pending in 05-HUMAN-UAT.md before v1.0.0 tag)

### v1.1 — Beauty Pass

- [x] **Phase 6: Title-Screen Liveliness** — Bird bob, demo pipes scrolling on title, logo entrance, CTA pulse — first-impression beauty ✓ (2026-04-29)
- [x] **Phase 7: In-Game Juice** — `+1` score popups, flap trail, milestone celebrations at 10/25/50, per-pair pipe color cycling ✓ (2026-04-29; 5 visual items reported failing on iPhone — wiring confirmed in production bundle, investigation deferred)
- [x] **Phase 8: Glass UI Refresh** — Press Start 2P font for headings, backdrop-filter blur on overlays, gradient buttons, focus polish ✓ (2026-05-01; backdrop-filter minifier regression fixed mid-flight)

### v1.2 — Modes

- [x] **Phase 9: Mode Infrastructure** — gameMachine `mode` context, StorageManager v3 (per-mode leaderboards + v2 migration), Title mode picker UI ✓ (2026-04-29)
- [x] **Phase 10: Time-Attack Mode** — 60s countdown timer in HUD, mode-aware leaderboard, GameOver shows time-attack PB ✓ (2026-04-29)
- [x] **Phase 11: Daily-Seed Mode** — Seeded RNG (mulberry32) for deterministic obstacle layout per UTC date, daily attempt tracking, optional share-result ✓ (2026-05-02)

### v1.3 — Atmosphere

- [x] **Phase 12: Cloud Parallax Layer** — 5 inline-SVG cloud sprites at z=-7 scrolling at 0.5× speed, state-gated (title/playing/dying), reset on roundStarted ✓ (2026-05-02; 198.66KB gzip)
- [x] **Phase 13: Day/Night Cycle on Sky Shader** — animate sky shader top/bottom colors over time or score; gated by `prefersReducedMotion` (completed 2026-05-02)

### v1.4 — Polish (3D scene)

- [x] **Phase 14: Bird Polish** — rim lighting on toon material + animated wing meshes (rotation tween on flap) ✓ (2026-05-02; 199.25KB gzip)
- [x] **Phase 15: Camera Depth (opt-in)** — subtle camera y-bob following bird velocity; double-gated behind new Settings toggle (default OFF) + `prefersReducedMotion` ✓

### v1.5 — Approachability + Customization

- [x] **Phase 16: Difficulty Presets** — Easy/Normal/Hard picker; multipliers on gap, scroll, spawn, gravity ✓
- [x] **Phase 17: Bird Customization** — shape picker (sphere/cube/pyramid + 4 emoji animals) + image upload ✓

### v1.6 + v1.7 — Cross-cutting passes (informal, no phase numbers)

- [x] **v1.6 Pass**: 6 cross-cutting items (title screen, 3D assets, render interp, settings UX, bundle, quality tiers) — POLISH-07..12 ✓
- [x] **v1.7 Pass**: Diorama Flight Pass — 7 items (bird character, pipe diorama, world layers, camera follow, title framing, depth events, screenshot harness) — DIORAMA-01..07 ✓

### v1.8 — Stickiness + Hygiene Pass (PLANNED)

- [ ] **Phase 18: Player Progression** — locked-by-default bird shapes + score-threshold unlocks + first-time toast; schema bump v4 → v5 (PROG-01..03)
- [ ] **Phase 19: Ops Hygiene** — GH Actions Node bump + Playwright golden-image regression + Lighthouse pin review (OPS-01..03)
- [ ] **Phase 20: Audio Polish** — per-mode music + sub-bus mixing + ambient layer + balloon whoosh (AUDIO-06..08)

---

## Phase Details

### Phase 1: Scaffold + Core Loop
**Goal**: After Phase 1, you can open the game, watch the bird fall under gravity, tap/click/spacebar to flap, and see a collision logged — with the renderer already hardened against the most expensive mobile pitfalls.
**Depends on**: Nothing (scaffold already has Vite + TS + Three.js from commit cccfe9c)
**Requirements**: HYG-01, HYG-02, HYG-03, HYG-04, CORE-01, CORE-02, CORE-03, CORE-04, VIS-02, VIS-05, VIS-06, PERF-02, PERF-06, PERF-07
**Success Criteria** (what must be TRUE):
  1. Bird visible in scene falls under gravity at 60Hz fixed timestep; tapping/clicking/spacebar causes an upward velocity impulse
  2. AABB collision with a static test obstacle is detected and logged to console (death hook stubbed)
  3. `tsc --noEmit` exits 0 with `strict: true` and `noUncheckedIndexedAccess: true` in tsconfig; no `import * as THREE` anywhere in `src/`
  4. Canvas has `touch-action: none`; DPR is capped to `Math.min(devicePixelRatio, 2)`; shadow maps are disabled; sRGB color space is explicit
  5. Event listeners use `AbortController` so repeated bootstrap calls do not accumulate listeners; dt is clamped to ≤100ms
**Plans**: 4 plans
Plans:
- [x] 01-01-renderer-scene-PLAN.md — Hardened WebGLRenderer factory, lighting, sky-blue scene, WebGL2 gate ✓
- [x] 01-02-ts-hygiene-bundle-PLAN.md — strict tsconfig, noUncheckedIndexedAccess, rollup-plugin-visualizer ✓
- [x] 01-03-game-loop-input-PLAN.md — GameLoop fixed-timestep accumulator, InputManager with AbortController ✓
- [x] 01-04-bird-physics-collision-PLAN.md — Bird entity, PhysicsSystem, CollisionSystem, static test obstacle ✓
**UI hint**: yes

### Phase 2: Game Machine + Obstacles + Rendering
**Goal**: After Phase 2, you can play a complete Flappy Bird loop — title screen (stub), pipe obstacles scroll past, score increments, death triggers a 800ms dying state, and restart works without page reload; the visual style is cel-shaded toon with post-processing gated for mobile.
**Depends on**: Phase 1 (physics loop, input manager, renderer hardening)
**Requirements**: CORE-05, CORE-06, CORE-07, CORE-08, VIS-01, VIS-03, VIS-04, VIS-07, PERF-04, SAVE-01, SAVE-02
**Success Criteria** (what must be TRUE):
  1. XState machine transitions correctly through title → playing → dying (800ms timer) → gameOver → playing (restart) without page reload
  2. Obstacle pairs scroll from right to left; score increments exactly once per pair as bird passes the midpoint; difficulty (gap + speed) ramps until ~score 40
  3. All obstacle and particle objects come from pre-warmed `ObjectPool<T>`; no `new THREE.Mesh()` executes during active gameplay
  4. Bird and pipes render with `MeshToonMaterial` + gradient ramp; EffectComposer + UnrealBloomPass active on desktop, reduced/disabled when `navigator.hardwareConcurrency <= 4`
  5. Personal best score seeds XState context from `StorageManager` on actor init; `StorageManager` versioned schema (v1) is readable/writable
**Plans**: 3 plans
Plans:
- [x] 02-01-PLAN.md — XState v5 machine + StorageManager + actor wiring in main.ts (CORE-07, CORE-08, SAVE-01, SAVE-02) ✓
- [x] 02-02-PLAN.md — ObjectPool + ObstaclePair + obstacle/score/difficulty systems + actor-integrated PhysicsSystem + CollisionSystem (CORE-05, CORE-06, PERF-04) ✓
- [x] 02-03-PLAN.md — Toon materials + EffectComposer (mobile-gated) + parallax background + full main.ts wiring (VIS-01, VIS-03, VIS-04, VIS-07, CORE-05–08) ✓
**UI hint**: yes

### Phase 3: UI + Audio + Polish
**Goal**: After Phase 3, the game has all four real screens (title with leaderboard, in-game HUD, pause, game-over), recorded audio with iOS unlock, and GSAP juice that makes it palpably more crafted than the baseline within 30 seconds.
**Depends on**: Phase 2 (XState machine is load-bearing for every UI screen and audio state)
**Requirements**: HUD-01, HUD-02, HUD-03, HUD-04, HUD-05, HUD-06, HUD-07, HUD-08, AUD-01, AUD-02, AUD-03, AUD-04, AUD-05, ANIM-01, ANIM-02, ANIM-03, ANIM-04, ANIM-05, ANIM-06, SAVE-03, SAVE-04
**Success Criteria** (what must be TRUE):
  1. Title, HUD, pause, and game-over screens render correctly; all transitions complete in <150ms via CSS; `visibilitychange` auto-triggers pause
  2. Flap plays a recorded SFX; score SFX plays on each point; death SFX + music fade-out plays on dying state; music loops in playing state; iOS `AudioContext` unlocks on first `pointerup`
  3. Squash-and-stretch fires on every flap (~80ms GSAP `back.out` cycle); screen shake fires on death (gated behind `!prefers-reduced-motion`); 20–40 particle burst fires on death
  4. "New best!" golden flash + score pop displays on game-over when score exceeds prior personal best; top-5 leaderboard saves and loads correctly across sessions
  5. All settings (sound, music, motion-reduce, colorblind palette) persist to localStorage and are correctly restored on next app start; `Howl` instances are singletons created once at init
**Plans**: 6 plans (4 original + 2 gap-closure)
Plans:
- [x] 03-01-audio-PLAN.md — Howler AudioManager singleton, iOS unlock, synth fallback, SFX/music wiring (AUD-01..05) ✓
- [x] 03-02-ui-infra-PLAN.md — Preact toolchain, #ui-root overlay, UIBridge, StorageManager v2 (HUD-01, HUD-08, SAVE-03, SAVE-04) ✓
- [x] 03-03-screens-PLAN.md — 5 screens (Title/HUD/Pause/GameOver/Settings) + 4 components (HUD-02..07) ✓
- [x] 03-04-juice-PLAN.md — GSAP squash/shake/particles, ParticleEmitter, reduced-motion gate (ANIM-01..06) ✓
- [x] 03-05-fix-ui-state-PLAN.md — Gap closure: priorBest race fix (HUD-05, ANIM-06), reduceMotion toggle (HUD-06), 120ms transition (HUD-07) ✓
- [x] 03-06-fix-audio-motion-PLAN.md — Gap closure: visibilitychange auto-pause (HUD-04), paused audio branch (AUD-03), music volume reset (AUD-03), squashStretch gate (CLAUDE.md) ✓
**UI hint**: yes

### Phase 4: PWA + Accessibility + Bundle Audit
**Goal**: After Phase 4, the game is installable from Android Chrome / desktop Chrome, plays offline, scores ≥90 on Lighthouse PWA audit, the JS bundle is confirmed <250KB gzipped, and colorblind + keyboard-only players have a complete play path.
**Depends on**: Phase 3 (complete feature set must be present before SW caches assets; stale-cache debugging during active dev is painful)
**Requirements**: PWA-01, PWA-02, PWA-03, PWA-04, PWA-05, A11Y-01, A11Y-02, A11Y-03, A11Y-04, A11Y-05, PERF-01, PERF-03, DEPLOY-01, DEPLOY-02, DEPLOY-03
**Success Criteria** (what must be TRUE):
  1. Lighthouse PWA audit scores ≥90; game is playable offline after first load; "Add to Home Screen" prompt appears on Android Chrome after one full play session
  2. Production JS bundle measures <250KB gzipped (confirmed via `rollup-plugin-visualizer`); 60fps sustained on iPhone 12 / Pixel 6 class device during normal play
  3. `prefers-reduced-motion` OS setting suppresses screen shake and particle bursts in JavaScript (not just CSS); colorblind palette uses luminance contrast as primary differentiator
  4. Spacebar flaps, Enter/Esc navigate menus, focus is visible on all interactive elements; all touch targets are ≥44×44px and meet WCAG 2.1 AA contrast (≥4.5:1)
  5. `npm run build` produces a deployable artifact; game is accessible at a public HTTPS URL with all assets loading (no 404s in Network panel)
**Plans**: 4 plans
Plans:
- [x] 04-01-PLAN.md — vite-plugin-pwa setup, icons, manifest, service worker (PWA-01, PWA-02, PWA-03, DEPLOY-01) ✓
- [x] 04-02-PLAN.md — Install prompt, keyboard nav, aria-live, colorblind palette swap (PWA-04, A11Y-01..05)
- [x] 04-03-PLAN.md — CI bundle-size gate script, 60fps perf test docs (PERF-01, PERF-03)
- [x] 04-04-PLAN.md — GitHub Pages deploy workflow + Lighthouse PWA gate (PWA-05, DEPLOY-02, DEPLOY-03)
**UI hint**: yes

### Phase 5: Hardening + Ship
**Goal**: After Phase 5, the game passes every "Looks Done But Isn't" check from PITFALLS.md — memory is stable across 10 restarts, audio works on real iOS with ringer on and off, tab-blur pauses music, and the production URL is the final shipped artifact.
**Depends on**: Phase 4 (deployed URL, SW active, full feature set locked)
**Requirements**: PERF-05, VIS-07 (parallax verification on device)
**Success Criteria** (what must be TRUE):
  1. `renderer.info.memory.geometries` and `.textures` are stable (not growing) across 10 consecutive death+restart cycles
  2. `Howler.ctx.state === 'running'` confirmed after first tap on real iOS Safari; audio plays correctly with ringer ON; silent switch behavior documented in settings UI
  3. Tab-switching mid-game pauses music and triggers the paused state; returning to tab resumes correctly
  4. No "Event sent to stopped actor" warnings in console across 20 play cycles; `getEventListeners(document)` count is stable after 10 restarts
**Plans**: 3 plans
Plans:
- [x] 05-01-PLAN.md — Hardening audit: DEV memory probe + AbortController resize fix + actor.send site audit
- [x] 05-02-PLAN.md — Real CC0 audio sourcing: replace placeholder MP3s + update CREDITS.md
- [x] 05-03-PLAN.md — Real-device verification + README polish + SettingsModal iOS note + v1.0.0 tag (tasks 1-3 complete; tasks 4-5 awaiting human real-device verify)
**UI hint**: yes

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Scaffold + Core Loop | 4/4 | Complete | 2026-04-28 |
| 2. Game Machine + Obstacles + Rendering | 3/3 | Complete | 2026-04-29 |
| 3. UI + Audio + Polish | 6/6 | Complete | 2026-04-29 |
| 4. PWA + Accessibility + Bundle Audit | 4/4 | Complete | 2026-04-29 |
| 5. Hardening + Ship | 2/3 (05-03 partial) | In progress — awaiting human real-device verify | - |
| 6. Title-Screen Liveliness | 2/2 | Complete (v1.1) | 2026-04-29 |
| 7. In-Game Juice | 2/2 | Complete (v1.1) | 2026-04-29 |
| 8. Glass UI Refresh | 1/1 | Complete (v1.1) | 2026-04-30 |
| 9. Mode Infrastructure | 2/2 | Complete (v1.2) | 2026-04-29 |
| 10. Time-Attack Mode | 1/1 | Complete    | 2026-05-01 |
| 11. Daily-Seed Mode | 1/1 | Complete    | 2026-05-01 |
| 12. Cloud Parallax Layer | 1/1 | Complete (v1.3) | 2026-05-02 |
| 13. Day/Night Cycle | 1/1 | Complete (v1.3) | 2026-05-02 |
| 14. Bird Polish | 1/1 | Complete (v1.4) | 2026-05-02 |
| 15. Camera Depth | TBD | Not started | - |

---

## v1.1 Phase Details

### Phase 6: Title-Screen Liveliness
**Goal**: After Phase 6, the Title screen feels alive within 2 seconds of opening — the bird bobs gently, demo pipes scroll past in the background, the logo animates in, and the "Tap to start" CTA pulses subtly. All effects motion-gated.
**Depends on**: Phase 3 (TitleScreen exists), Phase 4 (motion gates wired)
**Requirements**: BEAUTY-01, BEAUTY-02, BEAUTY-03, BEAUTY-04
**Success Criteria** (what must be TRUE):
  1. Bird visible on title screen and bobbing on a sine wave (~1Hz, ±0.15m amplitude); freezes when `prefersReducedMotion` is true
  2. Pipes scroll past in title state (no collision, despawn-and-respawn loop); music plays at lower volume than gameplay
  3. "Flappy 3D" logo letters fade in staggered ~50ms apart on title mount; one-shot, no re-trigger
  4. "Tap to start" CTA opacity pulses 0.6 ↔ 1.0 over 1.6s ease-in-out; static when reduced-motion
**Plans**: 2 plans
Plans:
- [x] 06-01-PLAN.md — Bird sine bob (BEAUTY-01) + demo pipes via ScrollSystem/ObstacleSpawner title gate (BEAUTY-02) + AudioManager.setMusicVolume ✓
- [x] 06-02-PLAN.md — Logo letter-stagger GSAP entrance + hasAnimated guard (BEAUTY-03) + CTA pulse CSS with motion gate (BEAUTY-04) ✓
**UI hint**: yes (frontend-heavy)

### Phase 7: In-Game Juice
**Goal**: After Phase 7, scoring feels visceral and milestone-rewarding. Each scored point gets a `+1` popup floating from the bird, milestone scores trigger a celebration burst, and pipe colors cycle subtly so the world doesn't feel monotonous.
**Depends on**: Phase 6 (title polish complete; in-game polish builds on motion-gating already proven)
**Requirements**: BEAUTY-05, BEAUTY-06, BEAUTY-07, BEAUTY-08
**Success Criteria** (what must be TRUE):
  1. Each SCORE event triggers a DOM `+1` element rising 60-80px and fading out over 600-800ms from the bird's screen position; gated under reduced-motion
  2. Optional flap trail: 2-3 fading semi-transparent bird-mesh echoes following the bird for 150-200ms after a flap; gated under reduced-motion (default OFF for perf)
  3. Score milestones (10, 25, 50) trigger a one-shot gold particle burst + 200ms screen-flash overlay; motion-gated
  4. Successive ObstaclePair instances cycle through 3-4 toon material colors (subtle hue shift, not jarring) so consecutive pipes look distinct
**Plans**: 2 plans
Plans:
- [x] 07-01-PLAN.md — Score popup pool + milestone flash (BEAUTY-05, BEAUTY-07) + main.ts wiring ✓
- [x] 07-02-PLAN.md — Flap trail ghosts + pipe color cycling + flapTrail setting (BEAUTY-06, BEAUTY-08) ✓
**UI hint**: yes

### Phase 8: Glass UI Refresh
**Goal**: After Phase 8, the DOM screens feel polished and modern — arcade-style headings, glass-blur overlays, gradient buttons, and a refined focus state. No accessibility regressions; bundle stays ≤250KB.
**Depends on**: Phase 6, Phase 7 (juice in place; this is the static-style coat of paint on top)
**Requirements**: BEAUTY-09, BEAUTY-10, BEAUTY-11, BEAUTY-12
**Success Criteria** (what must be TRUE):
  1. `Press Start 2P` (or comparable arcade font) is locally hosted as woff2 at ≤12KB; used for `<h1>`/`<h2>` only; body text remains the system stack for readability
  2. PauseScreen, GameOverScreen, SettingsModal use `backdrop-filter: blur(12px) saturate(120%)`; falls back gracefully on browsers without `backdrop-filter` support (solid-color background)
  3. Button component has a linear-gradient background + subtle inset shadow; hover and active states distinct; touch-target minimums (≥44×44px) preserved
  4. Focus ring polished — 2-color outline (inner glow + outer ring) via `:focus-visible`; remains WCAG-AA contrast against all overlay backgrounds; verify in dark + colorblind palettes
**Plans**: 1 plan
Plans:
- [x] 08-01-PLAN.md — Press Start 2P font, glass blur overlays, gradient buttons, focus ring (BEAUTY-09..12)
**UI hint**: yes (CSS + 1 font asset)

---

## v1.2 Phase Details

### Phase 9: Mode Infrastructure
**Goal**: After Phase 9, the game supports a `mode` context (`'endless' | 'timeAttack' | 'daily'`), Title shows a mode picker, and per-mode leaderboards persist via StorageManager v3 (with safe migration from v2). No new playable mode yet — just the rails.
**Depends on**: v1.1 (Phase 8) — Title screen + Settings infrastructure must be in place.
**Requirements**: MODE-01, MODE-02, MODE-03
**Seeds consumed**: SEED-004, SEED-005 (both depend on this phase)
**Success Criteria** (what must be TRUE):
  1. `gameMachine.context.mode` is one of `'endless'`, `'timeAttack'`, `'daily'`; defaults to `'endless'`; persists across rounds within a session
  2. StorageManager v3 schema: `leaderboardByMode: { endless: LeaderboardEntry[], timeAttack: [], daily: [] }`; existing v2 `leaderboard` migrates into `leaderboardByMode.endless` on first read
  3. Title screen shows a 3-option mode picker (Endless / Time-Attack / Daily); selection sets `actor.send({type:'SET_MODE', mode})`; selected mode visually highlighted
  4. Endless mode behavior unchanged from v1.1 — no regression
**Plans**: 2 plans
Plans:
- [x] 09-01-PLAN.md — gameMachine GameMode + SET_MODE event; StorageManager v3 schema + v2→v3 migration + per-mode methods; UIBridge mode-aware leaderboard push (MODE-01, MODE-02)
- [x] 09-02-PLAN.md — ModePicker component; TitleScreen integration; UIBridge mode state + leaderboard refresh (MODE-03) ✓
**UI hint**: yes (mode picker component)

### Phase 10: Time-Attack Mode
**Goal**: After Phase 10, selecting Time-Attack starts a 60-second countdown; player scores as much as possible before time runs out; HUD shows the timer; GameOver shows time-attack PB; mode-aware leaderboard.
**Depends on**: Phase 9 (mode infrastructure)
**Requirements**: MODE-04, MODE-05, MODE-06
**Success Criteria**:
  1. In time-attack mode, a 60-second timer starts on START; HUD shows seconds remaining
  2. When timer reaches 0, machine transitions to `gameOver` (auto-end, no death required)
  3. GameOver shows time-attack PB and time-attack-specific leaderboard
  4. Endless mode still works (no regression on Phase 9 work)
**Plans**: 1 plan
Plans:
- [x] 10-01-PLAN.md — TimerSystem + TIME_UP event + HUD timer display (MODE-04, MODE-05, MODE-06) ✓
**UI hint**: yes (timer display in HUD)

### Phase 11: Daily-Seed Mode
**Goal**: After Phase 11, selecting Daily Seed plays a deterministic obstacle layout based on today's UTC date — every player on a given day sees the same pipes. Daily attempt tracking; optional share-result via clipboard.
**Depends on**: Phase 9 (mode infrastructure)
**Requirements**: MODE-07, MODE-08, MODE-09
**Success Criteria**:
  1. ObstacleSpawner uses a seeded RNG (mulberry32) when `mode === 'daily'`; seed derived from `YYYYMMDD` UTC date
  2. Two players on the same UTC date see the same pipe sequence (deterministic)
  3. Daily attempts tracked in StorageManager v3 (`dailyAttempts: { [date]: number }`); UI shows "Today's best: N (M attempts)" on Title
  4. Share-result button (optional) copies "Daily YYYY-MM-DD: score 🐦" to clipboard
**Plans**: 1 plan
Plans:
- [x] 11-01-PLAN.md — mulberry32 seeded RNG + ObstacleSpawner.setRng + daily attempt tracking + TitleScreen stats + GameOver Share button (MODE-07, MODE-08, MODE-09) ✓
**UI hint**: yes (daily UI affordances)

---

## v1.3 Phase Details

### Phase 12: Cloud Parallax Layer
**Goal**: After Phase 12, the sky has 4-6 inline-SVG clouds scrolling at half the foreground speed, sitting between the sky shader and the mountains. Adds depth without art-asset dependencies. Title screen gets visible benefit immediately (clouds always scroll); gameplay also.
**Depends on**: Phase 6 (demo-pipes ScrollSystem extension proved the title-state scroll pattern works)
**Requirements**: ATMOS-01, ATMOS-02
**Seeds consumed**: SEED-001
**Success Criteria**:
  1. 4-6 cloud meshes scroll at 0.5× scrollSpeed in title + playing + dying states; despawn off left, respawn off right (similar to ObstaclePair pool, simpler since no collision)
  2. Cloud sprites are inline SVG-as-data-URL, baked into the JS bundle (no `public/` HTTP fetch); ≤2KB total cloud-asset overhead in gzipped JS
  3. Cloud color/opacity tuned for both default (sky-blue background) AND colorblind palettes — desaturated white/gray with `transparent: true`, `depthWrite: false`
  4. Endless / Time-Attack / Daily modes all show clouds; clouds NOT motion-gated (decoration, not animation juice — same call as Phase 6 demo pipes per BEAUTY-02)
**Plans**: TBD
**UI hint**: no (Three.js scene only)

### Phase 13: Day/Night Cycle on Sky Shader
**Goal**: After Phase 13, the sky shader animates between 4-5 keyframe colors (morning blue → afternoon → sunset → dusk) over a 60-second cycle OR per score milestone. Adds atmospheric progression without changing scene geometry.
**Depends on**: Phase 12 (clouds in place to catch sunset color)
**Requirements**: ATMOS-03, ATMOS-04
**Seeds consumed**: SEED-002
**Success Criteria**:
  1. Sky `ShaderMaterial` uniforms `uTopColor` and `uBottomColor` lerp between 4-5 keyframe color pairs; cycle continuously OR step on score milestones (planning-time decision)
  2. Animation gated by `prefersReducedMotion(storage)`: when reduced-motion, sky holds default morning-blue colors (no cycling)
  3. Keyframe palette WCAG-friendly with bird (orange/yellow) and pipes (green/cycling); avoid sunsets that wash out into bird color
  4. Cycle reset on `roundStarted` to keep title screen + first-round visuals consistent
**Plans**: TBD
**UI hint**: no (Three.js shader only)

---

## v1.4 Phase Details

### Phase 14: Bird Polish
**Goal**: After Phase 14, the bird looks more characterful — rim lighting picks up the silhouette against the sky, and small wing meshes animate on each flap. Pure additive on top of v1.3.
**Depends on**: Phase 3 (toon material), Phase 6 (GSAP squashStretch pattern)
**Requirements**: POLISH-01, POLISH-02
**Seeds consumed**: SEED-003 (partial — A + B)
**Success Criteria**:
  1. Bird toon material has a rim-light fragment shader contribution (subtle edge glow); strength configurable via uniform; preserves WCAG-AA contrast against sky in default + colorblind palettes
  2. Bird mesh gains 2 small wing geometries (Plane or thin Box) as children; positioned at the bird's flanks
  3. On each `FLAP`, wings rotate via GSAP timeline (~80ms, similar to squashStretch); motion-gated via `prefersReducedMotion(storage)`
  4. No mobile-perf regression: 60fps maintained on iPhone 12 / Pixel 6 class device
**Plans**: TBD
**UI hint**: no (Three.js scene + shader)

### Phase 15: Camera Depth (opt-in)
**Goal**: After Phase 15, players can opt into a subtle camera y-bob that follows bird velocity, adding parallax depth to the playfield. Default OFF; double-gated for motion sensitivity.
**Depends on**: Phase 14 (bird polish lands first)
**Requirements**: POLISH-03
**Seeds consumed**: SEED-003 (final — C)
**Success Criteria**:
  1. New Settings toggle "Camera bob" (default OFF); persists in StorageManager v3 settings
  2. When toggle ON AND `prefersReducedMotion(storage)` is false, camera y-offset interpolates toward `bird.velocity.y * factor` (e.g., 0.05) per frame; smooth easing
  3. Camera position resets to original on `roundStarted` (no lingering offset between rounds)
  4. No mobile-perf regression on iPhone 12 / Pixel 6
**Plans**: 1 plan
Plans:
- [x] 15-01-camera-bob-PLAN.md — cameraBob setting in StorageManager v3 + Settings toggle row + per-frame loop step (lerp 0.08, factor 0.05) + roundStarted reset ✓
**UI hint**: yes (new Settings toggle row)

---

## v1.8 Phase Details (PLANNED)

### Phase 18: Player Progression
**Goal**: After Phase 18, the bird shape picker shows locked + unlocked states. Fresh installs start with only `sphere`. Hitting score thresholds unlocks new shapes / animals one at a time. Existing v4 saves grandfather-unlock everything (no surprise loss of access).
**Depends on**: Phase 17 (bird shape picker exists)
**Requirements**: PROG-01, PROG-02, PROG-03
**Success Criteria**:
  1. SettingsV5 schema adds `unlocks: BirdShape[]`. Default fresh = `['sphere']`. v4 → v5 migration sets `unlocks: ALL_SHAPES` for existing users.
  2. SettingsModal shape picker renders locked items with `.locked` class (greyed + non-clickable). Tooltip shows "Unlock at score N".
  3. On gameOver, if score crosses any threshold not already in `unlocks`, push to `unlocks` and show a "🔓 Unlocked: 🐦" toast for ~3s. Toast is motion-gated (skipped under reduced-motion).
  4. New emoji animals 🦄 (unicorn, threshold 150) + 🐧 (penguin, threshold 200) added to BirdShape type — pure additions, don't break existing renders.
  5. No regression: existing image upload still overrides shape; emoji shapes still render plane-textures.
**Plans**: TBD
**UI hint**: yes (Settings shape picker + new unlock toast)

### Phase 19: Ops Hygiene
**Goal**: After Phase 19, CI no longer warns about Node 20 deprecation, the visual screenshot harness catches pixel regressions automatically, and the Lighthouse pin is either bumped or annotated permanently.
**Depends on**: nothing (CI / test only — orthogonal to game code)
**Requirements**: OPS-01, OPS-02, OPS-03
**Success Criteria**:
  1. `.github/workflows/deploy.yml` actions bumped to versions that support Node 22+ (or `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` env). Deploy run shows zero Node 20 deprecation warnings.
  2. `tests/visual-screenshots.spec.ts` migrated from informational `page.screenshot()` to `expect(page).toHaveScreenshot()`. Baseline images committed to `tests/visual-screenshots.spec.ts-snapshots/`. Pixel-diff threshold pinned ~0.1%. CI workflow runs the spec and fails on mismatch.
  3. Lighthouse pin (`lighthouse@^11.7.1`) reviewed: either bump to v12 + new audit category mapping, or document the pin reason permanently in deploy.yml comment.
**Plans**: TBD
**UI hint**: no (CI / tests only)

### Phase 20: Audio Polish
**Goal**: After Phase 20, each game mode has its own music track that crossfades on switch, master/music/sfx volumes are independently mixable, and the title screen has a subtle ambient layer (wind / chirp loop). Depth-event balloon gets a quiet fly-by whoosh.
**Depends on**: Phase 3 (AudioManager + Howler), Phase 9 (mode infrastructure), Phase 17/Diorama (balloon)
**Requirements**: AUDIO-06, AUDIO-07, AUDIO-08
**Success Criteria**:
  1. AudioManager learns `setMusicTrack(mode: GameMode)` that crossfades the music between mode tracks. Falls back to current single track if mode-specific source isn't sourced (CC0 audio sourcing optional).
  2. AudioManager exposes 3 sub-bus volumes (master / music / sfx) — each persisted in SettingsV5 (or v6 if v5 already taken by Phase 18). Settings UI shows 3 sliders or compact +/- toggles, replacing the existing Sound + Music binary toggles (or supplementing them).
  3. Title screen plays a low-volume ambient loop (wind or distant chirp). Pauses with the rest of the audio context on tab-blur.
  4. Depth-event balloon (`WorldLayers.balloon`) plays a single low-volume whoosh on each fly-through. Sfx-bus gated.
**Plans**: TBD
**UI hint**: yes (Settings volume controls)

---

## Requirement Coverage

**v1 requirements:** 62 / 62 mapped, 0 orphaned
**v1.1 requirements:** 12 / 12 mapped (BEAUTY-01..12)
**v1.2 requirements:** 9 / 9 mapped (MODE-01..09)

| Category | Phase |
|----------|-------|
| HYG (4) | Phase 1 |
| CORE-01–04 (4) | Phase 1 |
| VIS-02, VIS-05, VIS-06 (3) | Phase 1 |
| PERF-02, PERF-06, PERF-07 (3) | Phase 1 |
| CORE-05–08 (4) | Phase 2 |
| VIS-01, VIS-03, VIS-04 (3) | Phase 2 |
| VIS-07 (1) | Phase 2 |
| PERF-04 (1) | Phase 2 |
| SAVE-01, SAVE-02 (2) | Phase 2 |
| HUD (8) | Phase 3 |
| AUD (5) | Phase 3 |
| ANIM (6) | Phase 3 |
| SAVE-03, SAVE-04 (2) | Phase 3 |
| PWA (5) | Phase 4 |
| A11Y (5) | Phase 4 |
| PERF-01, PERF-03 (2) | Phase 4 |
| DEPLOY (3) | Phase 4 |
| PERF-05 (1) | Phase 5 |
| BEAUTY-01..04 (4) | Phase 6 |
| BEAUTY-05..08 (4) | Phase 7 |
| BEAUTY-09..12 (4) | Phase 8 |
| MODE-01..03 (3) | Phase 9 |
| MODE-04..06 (3) | Phase 10 |
| MODE-07..09 (3) | Phase 11 |
| ATMOS-01..02 (2) | Phase 12 |
| ATMOS-03..04 (2) | Phase 13 |
| POLISH-01..02 (2) | Phase 14 |
| POLISH-03 (1) | Phase 15 |

---

*Last updated: 2026-05-02 — v1.4 Polish milestone added (Phases 14-15), consumes final SEED-003*
