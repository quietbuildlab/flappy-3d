# Flappy 3D — Project Guide

## What This Is

A polished 3D Flappy Bird-style PWA built with Babylon.js. As of 2026-05-21 it
is a **true-3D rebuild**: the bird flies down a corridor seen from a chase
camera behind it, with obstacle pipes rushing toward the player in depth (see
`docs/superpowers/specs/2026-05-21-flappy-3d-babylon-rebuild-design.md`). The
project's measured success target is **"feels palpably more crafted than [`guiguan/flappy-anna-3d`](https://github.com/guiguan/flappy-anna-3d) within 30 seconds of play."** Single-player, endless mode for v1, mobile-first, installable as a PWA.

## Source of truth

| Question | Read this file |
|---|---|
| What are we building? | `.planning/PROJECT.md` |
| What requirements must v1 deliver? | `.planning/REQUIREMENTS.md` |
| What phases and in what order? | `.planning/ROADMAP.md` |
| What's the current state? | `.planning/STATE.md` |
| What stack/libs and why? | `.planning/research/STACK.md` |
| What features are table-stakes vs polish? | `.planning/research/FEATURES.md` |
| How is the code organized? | `.planning/research/ARCHITECTURE.md` |
| What pitfalls to avoid? | `.planning/research/PITFALLS.md` |
| Tight overview of all of the above? | `.planning/research/SUMMARY.md` |

**Always re-read `.planning/STATE.md` at the start of any session** — it points to the active phase.

## Locked Decisions (do NOT relitigate without explicit user instruction)

- **Stack:** Vite + TypeScript + Babylon.js (`@babylonjs/core` v9). No React, no R3F. (Migrated off Three.js 2026-05-21 by explicit user instruction — superseding the former "no engine swap" lock.)
- **Auxiliary libs:** GSAP (tweens), xstate v5 (state machine), Howler.js (audio), Preact (DOM overlay UI), Babylon `ParticleSystem` (particles), Babylon `DefaultRenderingPipeline` (bloom + FXAA + vignette), vite-plugin-pwa.
- **No physics library** — hand-rolled AABB on logical positions in `CollisionSystem` (~15 lines).
- **No GLTF assets** — all geometry procedural.
- **Aesthetic:** evolved Zelda-anime / cel-shaded direction.
- **Modes:** endless only (v1). Time-attack/daily-seed/hardcore are deferred.
- **Leaderboard:** local-only via `localStorage`. No backend, no accounts.
- **Persistence:** `localStorage` only.
- **Bundle budget:** ≤600KB gzipped JS (relaxed from 250KB for Babylon, 2026-05-21; current ~521KB). Enforced by `scripts/bundle-check.sh` in CI. Import Babylon via **deep paths** (`@babylonjs/core/Meshes/meshBuilder`, etc.) — never the `@babylonjs/core` barrel, which defeats tree-shaking.
- **Perf target:** sustained 60fps on iPhone 12 / Pixel 6 class device.

## GSD Workflow

This project uses [Get-Shit-Done (GSD)](https://github.com/) for planning. The workflow per phase is:

```
/gsd-discuss-phase N    # gather phase-specific context → CONTEXT.md
/gsd-plan-phase N       # research + plan → RESEARCH.md + N-PLAN.md
/gsd-execute-phase N    # execute plan with atomic commits
/gsd-verify-work N      # UAT verification → VERIFICATION.md
```

Config: `.planning/config.json` — granularity=coarse, mode=yolo, parallel execution, all workflow agents enabled.

## Coding Rules

- **TypeScript strict mode is mandatory.** `tsconfig.json` must have `"strict": true` and `"noUncheckedIndexedAccess": true`. `tsc --noEmit` must exit 0.
- **Babylon.js:** import via deep paths (`import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'`). Never the `@babylonjs/core` barrel — it drags the whole engine (~1.4MB gzipped) past the bundle budget. Some features need a side-effect import (e.g. `DefaultRenderingPipeline` needs `@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderPipelineManagerSceneComponent`).
- **No `MeshBuilder.Create*()` in the game loop.** Use `ObjectPool<T>` for obstacles; pre-warm at load time.
- **Always `dispose()`** Babylon meshes/materials/textures when removing entities — `scene` removal alone does NOT free GPU buffers.
- **Collision runs in the fixed-step loop**, so it must NOT rely on Babylon world matrices (those update at render time). Use hand-rolled AABB on logical positions.
- **Event listeners use `AbortController`.** They accumulate across restarts otherwise.
- **xstate machine has zero Babylon imports.** Keep `src/machine/gameMachine.ts` pure.
- **DOM overlay never touches the Babylon scene; systems never touch DOM.** Single bridge: `UIBridge`.
- **`prefers-reduced-motion` checked in JS** (not just CSS) before triggering screen shake / particles / aggressive tweens.
- **iOS audio unlock:** `Howler.ctx.resume()` inside the FIRST `pointerup` handler, synchronously.
- **Cap renderer DPR** via `engine.setHardwareScalingLevel(1 / Math.min(devicePixelRatio, 2))`.
- **No shadows** — too expensive on mobile.

## API Research (per user CLAUDE.md global rule)

Never cite Babylon.js, GSAP, Howler, xstate, or vite-plugin-pwa APIs from memory — always verify before citing. The most authoritative source is the installed type defs:

```bash
grep -rn "<symbol>" node_modules/@babylonjs/core/**/*.d.ts
```

`ctx7` / `find-docs` also work. This is mandatory for API surface details — training data may be stale.

## Reference Baseline

`https://github.com/guiguan/flappy-anna-3d` — the friend's implementation, the thing we're benchmarking against. Source structure summarized in `.planning/research/SUMMARY.md`. Clone to `/tmp/flappy-anna-3d-ref/` if you need to inspect source-level patterns.

**The baseline's gaps are our roadmap's spine.** Every phase exists to close one or more of those gaps with elevated craft.

## Current Status

Initialized 2026-04-28. Scaffold complete (Vite + TS + Three.js, rotating-cube placeholder). Roadmap covers 5 phases, 62 v1 requirements. Next: `/gsd-discuss-phase 1`.
