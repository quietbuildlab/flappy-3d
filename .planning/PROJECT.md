# Flappy 3D

## What This Is

A 3D Flappy Bird-style mobile-first web game, built with Three.js, that's measurably more polished than the friend's reference baseline ([guiguan/flappy-anna-3d](https://github.com/guiguan/flappy-anna-3d)) along four axes: visuals & animation, UI/HUD/menus, game feel, and performance. Single-player, endless mode for v1, installable as a PWA.

## Core Value

The game must feel **palpably more crafted** than the baseline within 30 seconds of play — that means polished motion, real menus, real audio, and 60fps on a mid-tier phone. Everything else is negotiable; "feels better than flappy-anna-3d" is not.

## Requirements

### Validated

(v1 awaiting human-verify on 7 runtime/device items + v1.0.0 tag — see `.planning/phases/05-hardening-ship/05-HUMAN-UAT.md`)

### v1.1 Milestone — Beauty Pass (CODE-COMPLETE 2026-05-01)

Visual polish shipped on top of v1. Three phases (6, 7, 8) all delivered:
- Phase 6 — Title-screen liveliness (bird bob, demo pipes, logo entrance, CTA pulse) ✓ user-confirmed on iPhone
- Phase 7 — In-game juice (`+1` score popups, flap trail toggle, milestone celebrations at 10/25/50, pipe color cycling) ✓ code-complete; 5 visual items reported failing on iPhone runtime — wiring confirmed in production bundle, investigation deferred
- Phase 8 — Glass UI refresh (Press Start 2P arcade font, backdrop-filter blur, gradient buttons, 2-layer focus ring) ✓ user-confirmed; backdrop-filter Chromium-minifier regression fixed mid-flight

12 BEAUTY-* requirements all coded. Final bundle: 196KB / 250KB budget. v1.1.0 tag pending user sign-off (Phase 7 visual issues are non-blocking for tag).

### v1.2 Milestone — Modes (CODE-COMPLETE 2026-05-02)

Time-attack + daily-seed modes layered on top of endless. Three phases (9, 10, 11) all delivered:
- Phase 9 — Mode infrastructure: gameMachine `mode` context, StorageManager v3 (per-mode leaderboards + v2 migration), Title mode picker ✓
- Phase 10 — Time-attack mode (60s countdown, HUD timer, mode-aware leaderboard) ✓
- Phase 11 — Daily-seed mode (deterministic obstacle layout per UTC date, daily attempts, Share button) ✓

9 MODE-* requirements coded. Bundle: 190.48KB / 250KB. Seeds SEED-004 + SEED-005 consumed.

### v1.3 Milestone — Atmosphere (CODE-COMPLETE 2026-05-02)

Cloud parallax + day/night cycle. Two phases (12, 13) both shipped:
- Phase 12 — Cloud parallax layer (5 inline-SVG clouds at z=-7, 0.5× scroll) ✓
- Phase 13 — Day/night cycle on sky shader (60s keyframe lerp, motion-gated) ✓

4 ATMOS-* requirements coded. Bundle: 198.90KB / 250KB. Seeds SEED-001 + SEED-002 consumed.

### v1.4 Milestone — Polish (CODE-COMPLETE 2026-05-02)

Final character + camera polish. Consumes the last dormant seed (SEED-003). Two phases (14, 15) both shipped:
- Phase 14 — Bird Polish: rim lighting via `onBeforeCompile` shader extension + 2 BoxGeometry wing meshes flapping ±0.6rad on each FLAP via GSAP, motion-gated ✓
- Phase 15 — Camera Depth (opt-in): subtle camera y-offset eases toward `bird.velocity.y * 0.05` per frame; double-gated behind new "Camera bob" Settings toggle (default OFF) + `prefersReducedMotion`; resets on `roundStarted` ✓

3 POLISH-* requirements coded. Bundle: 199.43KB / 250KB. Seed SEED-003 consumed (the final dormant seed). After v1.4, the seed pool is fully consumed (5 of 5 seeds shipped across v1.2/v1.3/v1.4).

### v1.5 Milestone — Approachability + Customization (CODE-COMPLETE 2026-05-02)

Direct user feedback after v1.4 ship: "make it easier to play" and "let players change the bird shape or upload a picture". Two phases (16, 17), both shipped:
- Phase 16 — Difficulty Presets: Easy/Normal/Hard picker in Settings. Easy = wider gaps + slower scroll (default for new players). Existing v1.0..v1.4 saves grandfather to Normal via v3→v4 migration. ✓
- Phase 17 — Bird Customization: Shape picker (Sphere / Cube / Pyramid) replaces the body geometry; image upload resizes the user's picture to 256×256 PNG and applies it as a textured plane (wings hide in image mode). ✓

3 POLISH-* requirements coded (POLISH-04, 05, 06). StorageManager schema bumped to v4. Bundle: 200.77KB / 250KB. First user-feedback-driven milestone (no seed).

### v1.6 Pass — Cross-cutting Polish (CODE-COMPLETE 2026-05-02, informal)

Six items the user flagged after v1.5 ship — title screen redesign, 3D
asset upgrade (bird beak/eyes + pipe caps), render interpolation for
120Hz, settings UX (sections + icons + tooltips), bundle/loading polish,
and postprocessing quality tiers. POLISH-07..12. Bundle: 202.12KB.

### v1.7 Pass — Diorama Flight Pass (CODE-COMPLETE 2026-05-02, informal)

Direction shift from "2D Flappy with 3D objects" toward layered storybook
diorama: bird character (rounded wings + tail + velocity pitch), pipe
diorama (bevel + rim + Y-rotation), WorldLayers (foreground grass +
midground shrubs + parallax), camera follow + FOV pulse, title-scene
framing via flex-grow spacer, depth-event balloon. DIORAMA-01..07.
Bundle: 203.10KB.

### v1.8 Milestone — Stickiness + Hygiene Pass (CODE-COMPLETE 2026-05-03)

Project is visually polished but every session looks identical (no
retention hook) and ops debt has accumulated. Three independent phases:

- Phase 18 — **Player progression / unlocks**: bird shapes initially
  locked except `sphere`; unlock at score thresholds; locked items show
  greyed in picker with "Unlock at N" tooltip; toast on first unlock.
  Schema bump v4 → v5 with `unlocks: BirdShape[]`. New emoji animals
  added to expand the unlock pool (🦄, 🐧). PROG-01..03.
- Phase 19 — **Ops hygiene**: bump GH Actions to Node 22-compatible
  versions (Sep 16 2026 deadline); migrate visual-screenshots.spec.ts
  to true golden-image regression via `toHaveScreenshot()`; review
  Lighthouse v11 pin. OPS-01..03.
- Phase 20 — **Audio polish**: per-mode music tracks with crossfade;
  master/music/sfx sub-bus mixing exposed in Settings; ambient layer on
  title; balloon fly-by whoosh. AUDIO-06..08.

9 requirements total (3 PROG + 3 OPS + 3 AUDIO). Schema bump v4 → v5
(unlocks + sub-bus volumes). Estimated bundle delta: +5-8KB. Each
phase independently shippable — no inter-phase dependencies.

### Active

- [ ] Endless flappy gameplay loop (input → gravity-flap → AABB collision → score → death)
- [ ] Polished 3D scene: lighting, materials, post-processing (bloom, vignette/tonemap)
- [ ] Animation polish via tween/spring lib + particles + screen shake
- [ ] Recorded SFX + ambient music (not synthesized oscillators)
- [ ] Real menu/HUD/game-over screens (DOM overlay layer over canvas)
- [ ] Settings (sound, motion-reduce, palette) persisted to localStorage
- [ ] Local leaderboard (top-N personal bests in localStorage)
- [ ] PWA installable with offline play
- [ ] Mobile-first responsive layout + large touch targets
- [ ] Accessibility: prefers-reduced-motion respected, colorblind-safe palette option
- [ ] 60fps on mid-tier mobile (iPhone 12 / Pixel 6 class), Lighthouse PWA ≥90
- [ ] Tree-shaken Three.js bundle, target <250KB gzipped JS
- [ ] State machine via xstate (Title / Playing / Paused / GameOver)
- [ ] Aesthetic: evolved Zelda-anime / cel-shaded direction with elevated craft

### Out of Scope

- **Native mobile builds (React Native / Capacitor / Tauri)** — PWA only; covers our target reach without app-store overhead.
- **Multiplayer / realtime** — out of scope for single-dev v1; doesn't fit core value.
- **Global leaderboard / accounts (Supabase or similar)** — local-only for v1; revisit if game gets traction.
- **Time-attack, daily-seed, hardcore modes** — endless only for v1; can add post-launch as a content drop.
- **AI-generated art mid-build** — defer to a possible v2; we're using procedural + minimal modeled assets.
- **Engine swap (Babylon, PlayCanvas, Unity, Godot WebGL)** — locked to Three.js; engine tax buys nothing for this scope.
- **react-three-fiber / R3F** — vanilla Three.js for smallest bundle and direct control.
- **AI codegen as part of the dev loop** — baseline was 100% AI-generated; we're doing a hand-crafted build for differentiation.

## Context

**Reference baseline:** `github.com/guiguan/flappy-anna-3d`. Vanilla TS + Three.js + Vite, Zelda-anime cel/toon shader, all procedural geometry, hand-rolled state machine, synthesized Web Audio, no menus, no PWA. We have read access to the source layout (see `.planning/research/SUMMARY.md` after research phase).

**Gaps the baseline leaves on the table** (these are the "better than" attack surface):
- No menus, settings, or game-over UI screens (no DOM overlay layer)
- No leaderboard or persistence
- No tween/spring library — animations likely linear lerps
- No post-processing
- No recorded audio
- No PWA / offline / install
- No accessibility considerations
- Mobile perf budget unverified

**Project root:** `/Users/ming/projects/flappy-3d`. Already scaffolded with Vite + TypeScript + Three.js (1 commit, building cleanly). Spinning cube placeholder in `src/main.ts` to be replaced in Phase 1.

## Constraints

- **Tech stack**: Vite + TypeScript + Three.js (vanilla), no React/R3F/Babylon — locked to maximize control and minimize bundle size.
- **Performance**: 60fps on mid-tier mobile (iPhone 12 / Pixel 6) — required for "feels better than baseline" verdict.
- **Bundle**: <250KB gzipped JS for the game shell — tree-shaking three.js is mandatory (current naive build = 510KB raw).
- **Platform**: PWA only — no native app store builds.
- **Backend**: None for v1 — entirely client-side, localStorage for persistence.
- **Solo dev / single context**: Built by one developer using Claude Code + GSD workflow.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Stack: Vite + TS + Three.js (vanilla) | Smallest bundle, direct Three.js control, matches baseline so comparisons are fair | — Pending |
| Reject React/R3F | Avoids React+drei runtime tax; DOM overlay is enough for the menu layer | — Pending |
| Reject effect.ts | Single-player offline game has no async/DI/error surface that justifies its abstraction tax | — Pending |
| Adopt xstate for state machine | Replaces hand-rolled state machine in baseline; ~15KB, visualizable, prevents impossible transitions | — Pending |
| Aesthetic: evolve Zelda-anime / cel-shaded | Direct comparison with baseline shows craft uplift; user's preference | — Pending |
| Modes: Endless only (v1) | Focus on nailing the core loop; other modes are content drops | — Pending |
| Leaderboard: Local-only (localStorage) | Zero infra, ships fast, sufficient for solo-play retention | — Pending |
| Granularity: Coarse (3-5 phases) | Small game scope, fast iteration, fewer review checkpoints | — Pending |
| GSD workflow throughout | User's preferred development discipline | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-28 after initialization*
