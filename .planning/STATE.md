---
gsd_state_version: 1.0
milestone: v1.8
milestone_name: — Stickiness + Hygiene Pass
status: planned
stopped_at: v1.7 Diorama Pass shipped; v1.8 ROADMAP drafted
last_updated: "2026-05-03T05:00:00Z"
progress:
  total_phases: 20
  completed_phases: 17
  total_plans: 36
  completed_plans: 32
  percent: 85
---

# Project State — Flappy 3D

**Last updated:** 2026-05-03
**Updated by:** v1.8 ROADMAP draft

---

## Project Reference

**Core value:** The game must feel palpably more crafted than `guiguan/flappy-anna-3d` within 30 seconds of play — polished motion, real menus, real audio, 60fps on a mid-tier phone.
**Current focus:** v1.8 Stickiness + Hygiene Pass — PLANNED. Phases 18-20 ready for `/gsd-plan-phase`.

---

## Current Position

| Field | Value |
|-------|-------|
| Phase | 18 — Planned, not started |
| Phase name | Player Progression / unlocks |
| Plans complete | None for v1.8 (17/17 done for prior milestones; v1.6 + v1.7 shipped informally) |
| Plans in progress | None |
| Status | v1.8 ROADMAP drafted — 3 independent phases ready to execute |
| Phase goal | Locked-by-default bird shapes + score-threshold unlocks + first-time toast |
| Blocked on | User greenlight on which phase to start (or all 3 in parallel) |

**Progress bar:**

```
Phase 1  [██████████] 100% ✓ (user-verified 2026-04-28)
Phase 2  [██████████] 100% ✓ (user-verified 2026-04-29)
Phase 3  [██████████] 100% ✓ (03-01 audio ✓, 03-02 ui-infra ✓, 03-03 screens ✓, 03-04 juice ✓, 03-05 fix-ui-state ✓, 03-06 fix-audio-motion ✓)
Phase 4  [██████████] 100% ✓ (04-01 pwa-setup ✓, 04-02 a11y ✓, 04-03 bundle-audit ✓, 04-04 deploy ✓)
Phase 5  [████████  ] 80% (05-01 ✓, 05-02 ✓, 05-03 tasks 1-3 ✓ | tasks 4-5 awaiting human)
Phase 6  [██████████] 100% ✓ (06-01 bird-bob+demo-pipes ✓ | 06-02 logo+CTA ✓)
Phase 7  [██████████] 100% ✓ (07-01 +1 popup + milestones ✓ | 07-02 flap trail + pipe colors ✓)
Phase 8  [██████████] 100% ✓ (08-01 glass UI refresh ✓ | BEAUTY-09..12 closed)
Phase 9  [██████████] 100% ✓ (09-01 GameMode + StorageManager v3 ✓ | 09-02 Title mode picker ✓)
Phase 10 [██████████] 100% ✓ (10-01 TimerSystem + TIME_UP + HUD timer ✓)
Phase 11 [██████████] 100% ✓ (11-01 mulberry32 RNG + daily tracking + Share button ✓)
Phase 12 [██████████] 100% ✓ (12-01 inline-SVG cloud sprites + parallax scroll ✓)
Phase 13 [██████████] 100% ✓ (13-01 day/night sky cycle ✓)
Phase 14 [██████████] 100% ✓ (14-01 rim-light shader + wing meshes + wingFlap animation ✓)
Phase 15 [██████████] 100% ✓ (15-01 cameraBob toggle + per-frame y-bob loop + roundStarted reset ✓)
Phase 16 [██████████] 100% ✓ (16-01 difficulty presets Easy/Normal/Hard + schema v4 migration ✓)
Phase 17 [██████████] 100% ✓ (17-01 bird shape picker + image upload + textured-plane swap ✓)
v1.6     [██████████] 100% ✓ (POLISH-07..12 — 6 cross-cutting items, informal)
v1.7     [██████████] 100% ✓ (DIORAMA-01..07 — diorama flight pass, informal)
Phase 18 [          ] 0%   PLANNED — Player Progression (PROG-01..03)
Phase 19 [          ] 0%   PLANNED — Ops Hygiene (OPS-01..03)
Phase 20 [          ] 0%   PLANNED — Audio Polish (AUDIO-06..08)
```

---

## Accumulated Context

### Decisions Locked

| Decision | Rationale |
|----------|-----------|
| Vite + TS + Three.js vanilla | Smallest bundle, direct control, fair comparison to baseline |
| No React / R3F | Avoids runtime tax; DOM overlay sufficient for menu layer |
| No physics library | Hand-rolled AABB via THREE.Box3 (~20 lines, zero KB) |
| XState v5 for state machine | Replaces hand-rolled booleans; flat 5-state machine |
| GSAP for tweens | Elastic/back eases; integrates via `gsap.ticker.add` |
| Howler.js for audio | Handles iOS unlock; SFX sprites + music |
| Preact for reactive UI bits | 4.7KB; score, leaderboard, settings toggles |
| three.quarks for particles | 42KB; fallback = bespoke THREE.Points if compat fails |
| Granularity: Coarse (5 phases) | Small game scope; fast iteration |
| Endless mode only (v1) | Focus on core loop polish |
| Local-only leaderboard | Zero infra; localStorage sufficient for solo play |
| Named Three.js imports only | Mandatory — `import * as THREE` = 128KB gzip penalty |
| HUD uses .hud-screen (not .screen) | Avoids blocking canvas pointer events during play |
| gameMachine paused state real (not stub) | PauseScreen requires actor.value==='paused' to activate |
| Score reset on START/RESTART actions (not playing entry) | Allows resume-from-pause without resetting score |
| scheduleAutoRestart removed | GameOverScreen tap → actor.send(RESTART) is the restart path |

### Pre-Phase Flags

| Flag | Phase | Action |
|------|-------|--------|
| Verify three.quarks 0.17.0 vs Three.js r175 compat | Before Phase 3 | Test before writing particle system; fallback = bespoke THREE.Points |
| Decide deployment target | Before Phase 4 | GitHub Pages sub-path vs custom domain → sets Vite `base` |

### Known Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| three.quarks r175 compat breaks | MEDIUM | Pin 0.17.0; fallback = THREE.Points |
| Tree-shaken Three.js > 50KB | MEDIUM | Run visualizer after Phase 1; rebudget if needed |
| Mobile GPU tier heuristic inaccurate | LOW | Test bloom gating on real Pixel 6 |

### Session Continuity

**What was done last (this session):**

- Phase 14 Plan 01 (Bird Polish) executed: 2 tasks, 2 commits.
  - Task 1 (6788209): Added addRimLight() to toonMaterial.ts — onBeforeCompile hook injects uRimStrength uniform + rim GLSL into outgoingLight before opaque_fragment. Applied to birdMaterial in main.ts.
  - Task 2 (3f05c85): Added leftWing+rightWing BoxGeometry children to Bird.ts. Added wingFlap(bird) GSAP timeline in anim.ts. Wired wingFlap call in main.ts onFlap handler, gated by prefersReducedMotion.
- tsc --noEmit: exit 0. Build: clean. Bundle: 199.25KB gzip (+0.35KB delta).
- POLISH-01, POLISH-02 requirements addressed. Phase 14 complete. v1.4 Polish milestone in progress.

**What's next:**

Phase 15: Camera Depth (opt-in) — subtle camera y-bob following bird velocity; Settings toggle (default OFF); double-gated by prefersReducedMotion.

**Blockers:**

- None.

---

## Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| JS bundle gzipped | <250KB | 199.25KB (Phase 14 complete; rim shader + wing meshes added) |
| FPS on Pixel 6 class | 60fps | Unmeasured (Phase 4 PERF-03) |
| Lighthouse PWA | ≥90 | 0 (Phase 4 PWA-05) |
| tsc --noEmit | 0 errors | ✓ 0 errors (strict + noUncheckedIndexedAccess) |

---
| Phase 03 P01 | 218 | 2 tasks | 9 files |
| Phase 03 P02 | 420 | 3 tasks | 9 files |
| Phase 03 P03 | 1089 | 3 tasks | 13 files |
| Phase 03 P04 | 119 | 3 tasks | 6 files |
| Phase 04 P01 | 165 | 2 tasks | 8 files |
| Phase 04 P03 | 87 | 2 tasks | 3 files |
| Phase 04 P02 | 258 | 2 tasks | 9 files |
| Phase 04 P04 | 6 | 2 tasks | 2 files |
| Phase 05 P01 | 2 | 3 tasks | 6 files |
| Phase 05 P02 | 1480 | 2 tasks | 5 files |
| Phase 06 P01 | 180 | 2 tasks | 4 files |
| Phase 06 P02 | 10 | 2 tasks | 2 files |
| Phase 07-in-game-juice P01 | 6 | 3 tasks | 5 files |
| Phase 07-in-game-juice P02 | 6 | 2 tasks | 7 files |
| Phase 08-glass-ui-refresh P01 | 5 | 4 tasks | 3 files |
| Phase 09-mode-infrastructure P01 | 1989 | 3 tasks | 4 files |
| Phase 09-mode-infrastructure P02 | 480 | 2 tasks | 4 files |
| Phase 10-time-attack-mode P01 | 161 | 3 tasks | 7 files |
| Phase 11-daily-seed-mode P01 | 246 | 3 tasks | 8 files |
| Phase 12-cloud-parallax-layer P01 | 97 | 2 tasks | 3 files |
| Phase 14-bird-polish P01 | 12 | 2 tasks | 4 files |

## Phase Log

| Phase | Status | Completed | Notes |
|-------|--------|-----------|-------|
| 1 | ✓ Complete | 2026-04-28 | 4 plans, 4 commits, user-verified in browser |
| 2 | ✓ Complete | 2026-04-29 | 3 plans, 6 atomic commits; user-verified in browser |
| 3 | ✓ Complete | 2026-04-29 | 6 plans, 12 atomic commits; HUD-04, AUD-03, ANIM-06 closed; 194.49 KB gzip |
| 4 | ✓ Complete | 2026-04-29 | 4 plans, 8 atomic commits; PWA-05, DEPLOY-02, DEPLOY-03 closed; 188.01 KB gzip |
| 5 | In progress | - | 05-01 hardening-audit ✓; 05-02 real-audio ✓ (AUD-02 closed); 05-03 tasks 1-3 ✓ (docs+iOS note+SHIPPED.md); tasks 4-5 awaiting human real-device verify + v1.0.0 tag |
| 6 | ✓ Complete | 2026-04-29 | 06-01 bird-bob+demo-pipes ✓ (BEAUTY-01, BEAUTY-02 closed; 188KB gzip); 06-02 logo+CTA ✓ (BEAUTY-03, BEAUTY-04 closed; 196.78KB gzip) |
| 7 | ✓ Complete | 2026-04-29 | 07-01 +1 popup + milestones ✓ (BEAUTY-05, BEAUTY-07 closed; 195.81KB gzip); 07-02 flap trail + pipe colors ✓ (BEAUTY-06, BEAUTY-08 closed; 196.33KB gzip) |
| 8 | ✓ Complete | 2026-04-30 | 08-01 glass UI refresh ✓ (BEAUTY-09..12 closed; 196.33KB gzip; v1.1 Beauty Pass code complete) |
| 9 | ✓ Complete | 2026-04-29 | 09-01 GameMode + StorageManager v3 ✓ (MODE-01, MODE-02); 09-02 Title mode picker ✓ (MODE-03); 196.75KB gzip |
| 10 | ✓ Complete | 2026-04-29 | 10-01 TimerSystem + TIME_UP + HUD timer ✓ (MODE-04, MODE-05, MODE-06); ~194.6KB gzip |
| 11 | ✓ Complete | 2026-05-01 | 11-01 mulberry32 RNG + daily tracking + Share button ✓ (MODE-07, MODE-08, MODE-09); 197.65KB gzip |
| 12 | ✓ Complete | 2026-05-02 | 12-01 inline-SVG cloud sprites + parallax scroll ✓ (ATMOS-01, ATMOS-02); 198.66KB gzip |
| 13 | ✓ Complete | 2026-05-02 | 13-01 day/night sky cycle ✓ (ATMOS-03, ATMOS-04); 198.90KB gzip |
| 14 | ✓ Complete | 2026-05-02 | 14-01 rim-light shader + wing meshes + wingFlap ✓ (POLISH-01, POLISH-02); 199.25KB gzip |

---

*This file is the project's memory. Update at every phase transition and plan completion.*

**Stopped At:** Completed 14-01-PLAN.md
**Resume:** Phase 15: Camera Depth (opt-in). v1.4 Polish milestone in progress.

**Planned Phase:** 14 (bird-polish) — 1 plan — 2026-05-02T02:47:00Z
