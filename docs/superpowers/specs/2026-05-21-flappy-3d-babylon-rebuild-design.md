# Flappy 3D — Babylon.js Rebuild (true 3D)

**Date:** 2026-05-21
**Status:** Approved — implementation in progress

## Goal

Rebuild Flappy 3D on the **Babylon.js** engine (replacing Three.js) as a
genuine 3D game: same Flappy Bird mechanics, but viewed from a **chase camera
behind the bird**, flying down a corridor with obstacles rushing toward the
player in depth.

## Superseded locked decisions

`CLAUDE.md` previously locked "No Babylon, no engine swap" and a "≤250KB
gzipped JS" budget. Both are **superseded by explicit user instruction**:

- Engine: **Babylon.js (`@babylonjs/core` v9)** replaces Three.js.
- Bundle budget: **relaxed to ~500KB gzipped** (Babylon is heavier than Three).

## What stays vs. changes

**Untouched (engine-agnostic):** `machine/`, `audio/`, `ui/screens/`,
`ui/components/`, `storage/`, `a11y/`, `utils/`, `systems/Difficulty.ts`,
`pools/ObjectPool.ts`, `input/`, the xstate machine, Howler audio, Preact UI.

**Rewritten on Babylon:** `render/`, all `entities/`, `particles/`,
`anim/anim.ts`, the Three-typed parts of `PhysicsSystem` / `CollisionSystem` /
`ScrollSystem` / `ScoreSystem` / `ObstacleSpawner`, `UIBridge` projection,
`GameLoop`, `main.ts`.

## 3D gameplay model

- **Axis change:** obstacles scroll along **−Z** (toward the camera) instead
  of −X. The bird is fixed at world `x=0, z=0`; only its `y` is physics-driven.
- **Chase camera:** `FreeCamera` behind + slightly above the bird at
  `z ≈ −7`, looking down the corridor. It eases vertically toward the bird's
  `y` (lag spring) so flaps feel weighty.
- **Obstacles:** classic pipe pairs — top + bottom **cylinders** along Y with
  a vertical gap and cap rings, spawned far ahead and rushing toward the bird.
- **Physics unchanged:** flap = `+y` impulse, gravity `−y`. Floor death when
  `y < WORLD_FLOOR_Y`.
- **Collision:** Babylon AABB via `mesh.intersectsMesh(other, false)` —
  no physics library (keeps the `CLAUDE.md` spirit).

## Rendering

- `render/createEngine.ts`: Babylon `Engine` + `Scene` + chase `FreeCamera` +
  `HemisphericLight` + `DirectionalLight`. DPR capped at 2, no shadows.
- Materials: `StandardMaterial`, black specular, `emissiveFresnelParameters`
  for a rim-light edge (stylized, readable). Colorblind palette preserved.
- `render/createPipeline.ts`: `DefaultRenderingPipeline` (bloom + FXAA +
  vignette) with the existing `low / medium / high` quality tiers.
- Particles: Babylon `ParticleSystem`, one-shot bursts via `manualEmitCount`.

## Loop

`GameLoop` keeps its fixed-timestep accumulator + interpolator hook verbatim.
Driver changes only: `engine.runRenderLoop()` + `scene.render()`.

## Migration order

1. Engine/scene/camera + render loop.
2. Bird + physics + input.
3. ObstaclePair + spawner + scroll (Z) + collision.
4. Score / UI bridge wiring.
5. Background / clouds / world layers + FX + audio.
6. Remove `three`, `tsc --noEmit` clean, build, PWA verify.

## Testing

`tsc --noEmit` exits 0 is the hard gate. Playwright UAT specs updated for the
new 3D framing as a follow-up (screenshots will differ).
