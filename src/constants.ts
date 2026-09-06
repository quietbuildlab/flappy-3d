import { Color3 } from '@babylonjs/core/Maths/math.color.js'

// Phase 13 — day/night cycle keyframes (ATMOS-03)
// 4 keyframes evenly spaced at 0s / 15s / 30s / 45s; loops back to 0 at 60s
export const SKY_KEYFRAMES = [
  { top: new Color3(0.79, 0.91, 0.91), bottom: new Color3(0.90, 0.95, 0.91) }, // morning
  { top: new Color3(0.76, 0.88, 0.91), bottom: new Color3(0.88, 0.94, 0.94) }, // midday
  { top: new Color3(0.96, 0.85, 0.78), bottom: new Color3(0.98, 0.91, 0.83) }, // sunset
  { top: new Color3(0.83, 0.83, 0.92), bottom: new Color3(0.92, 0.88, 0.94) }, // dusk
] as const
export const SKY_CYCLE_DURATION_S = 60

export const GRAVITY = -25
export const FLAP_IMPULSE = 8.5
export const MAX_FALL_SPEED = -12
export const WORLD_FLOOR_Y = -4
export const WORLD_CEILING_Y = 4
export const FIXED_DT = 1 / 60
export const DT_CLAMP_MAX = 0.1

// True-3D spatial layout (chase camera looking down +Z).
// The bird is fixed at world (0,0); obstacles rush toward it along −Z.
export const BIRD_Z = 0                     // bird stays at world z=0
export const OBSTACLE_SPAWN_Z = 22          // obstacles spawn far ahead (+Z)
export const OBSTACLE_DESPAWN_Z = -10       // released to pool once past the camera

// Chase camera framing
export const CAMERA_OFFSET_Z = -7           // camera sits 7 units behind the bird
export const CAMERA_BASE_Y = 1.6            // camera floats above the gameplay lane
export const CAMERA_FOV = 0.85              // radians (~49°)

// Obstacle geometry — pipes are vertical cylinders along Y
export const PIPE_RADIUS = 0.7
export const PIPE_CAP_RADIUS = PIPE_RADIUS + 0.16
export const PIPE_CAP_HEIGHT = 0.3
// A forgiving circle inside the illustrated body; feathers and beak do not collide.
export const BIRD_RADIUS = 0.24
export const PIPE_HEIGHT = 8
export const PIPE_COLOR = 0x78ad85          // sage

// Difficulty ramp (per D-13)
export const BASE_SPAWN_INTERVAL = 1.6      // seconds between spawns at score 0
export const MIN_SPAWN_INTERVAL = 1.0       // seconds between spawns at score 40
export const BASE_SCROLL_SPEED = 3.5        // units/sec at score 0
export const MAX_SCROLL_SPEED = 6.0         // units/sec at score 40
export const BASE_GAP_HEIGHT = 2.6          // pipe gap (world units) at score 0
export const MIN_GAP_HEIGHT = 1.6           // pipe gap (world units) at score 40
export const GAP_CENTER_RANGE = 1.0         // gap center randomized in [-1.0, +1.0]
export const DIFFICULTY_SCORE_CAP = 40      // score at which difficulty plateaus

// Phase 16 — user-selectable difficulty presets (v1.5).
export type DifficultyPreset = 'easy' | 'normal' | 'hard'
export interface DifficultyMultiplier {
  gap: number          // multiplied into BASE/MIN_GAP_HEIGHT (>1 = wider gap = easier)
  scroll: number       // multiplied into BASE/MAX_SCROLL_SPEED (<1 = slower = easier)
  spawn: number        // multiplied into BASE/MIN_SPAWN_INTERVAL (>1 = longer interval = easier)
  gravity: number      // multiplied into GRAVITY (<1 = gentler fall = easier)
}
export const DIFFICULTY_MULTIPLIERS: Record<DifficultyPreset, DifficultyMultiplier> = {
  easy:   { gap: 1.25, scroll: 0.85, spawn: 1.20, gravity: 0.75 },
  normal: { gap: 1.00, scroll: 1.00, spawn: 1.00, gravity: 1.00 },
  hard:   { gap: 0.85, scroll: 1.10, spawn: 0.90, gravity: 1.10 },
}

// Phase 18 — Score-threshold unlocks for bird shapes (PROG-01).
export const SHAPE_UNLOCK_THRESHOLDS: Record<string, number> = {
  sphere:  0,
  cube:    5,
  pyramid: 15,
  bird:    30,
  cat:     50,
  dog:     75,
  frog:    100,
  unicorn: 150,
  penguin: 200,
}
/** All shape ids in unlock order. */
export const ALL_BIRD_SHAPES = ['sphere','cube','pyramid','bird','cat','dog','frog','unicorn','penguin'] as const

// Phase 7 — pipe color cycling (BEAUTY-08, D-14, D-18)
export const PIPE_COLOR_CYCLE: readonly number[] = [
  0x78ad85,  // sage
  0x80b2b9,  // soft teal
  0xccaa7c,  // honey
  0xae9abc,  // lavender
] as const

// Object pool — pre-warmed ObstaclePair instances
export const POOL_SIZE = 10

// Post-processing (bloom + vignette)
export const BLOOM_WEIGHT = 0.04
export const BLOOM_THRESHOLD = 0.78
export const VIGNETTE_WEIGHT = 0.15
