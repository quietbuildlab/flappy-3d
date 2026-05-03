import { Color } from 'three'

// Phase 13 — day/night cycle keyframes (ATMOS-03)
// 4 keyframes evenly spaced at 0s / 15s / 30s / 45s; loops back to 0 at 60s
export const SKY_KEYFRAMES = [
  { top: new Color(0x7ec8e3), bottom: new Color(0xbce6f0) }, // 0s  — morning (current default)
  { top: new Color(0x5dabd0), bottom: new Color(0xa8d5e8) }, // 15s — midday
  { top: new Color(0xff9966), bottom: new Color(0xffd6b3) }, // 30s — sunset
  { top: new Color(0x3a4a8c), bottom: new Color(0x7a5a9c) }, // 45s — dusk
] as const
export const SKY_CYCLE_DURATION_S = 60

export const GRAVITY = -25
export const FLAP_IMPULSE = 8.5
export const MAX_FALL_SPEED = -12
export const WORLD_FLOOR_Y = -4
export const WORLD_CEILING_Y = 4
export const FIXED_DT = 1 / 60
export const DT_CLAMP_MAX = 0.1

// Phase 2 — spatial layout (per D-12, D-32)
export const BIRD_X = 0                     // bird stays at world x=0 (fixed camera)
export const OBSTACLE_SPAWN_X = 6           // obstacles spawn here (right edge)
export const OBSTACLE_DESPAWN_X = -6        // obstacles released to pool past here (left edge)

// Phase 2 — obstacle geometry (per D-11, D-32)
export const PIPE_WIDTH = 0.8
export const PIPE_DEPTH = 0.6
export const PIPE_COLOR = 0x4caf50          // green placeholder; refined in Phase 3

// Phase 2 — difficulty ramp (per D-13, D-32)
export const BASE_SPAWN_INTERVAL = 1.6      // seconds between spawns at score 0
export const MIN_SPAWN_INTERVAL = 1.0       // seconds between spawns at score 40
export const BASE_SCROLL_SPEED = 3.5        // units/sec at score 0
export const MAX_SCROLL_SPEED = 6.0         // units/sec at score 40
export const BASE_GAP_HEIGHT = 2.6          // pipe gap (world units) at score 0
export const MIN_GAP_HEIGHT = 1.6           // pipe gap (world units) at score 40
export const GAP_CENTER_RANGE = 1.0         // gap center randomized in [-1.0, +1.0]
export const DIFFICULTY_SCORE_CAP = 40      // score at which difficulty plateaus

// Phase 16 — user-selectable difficulty presets (v1.5).
// Each preset scales gameplay difficulty axes. Easy = forgiving for new
// players (fresh-install default). Normal = original v1.0..v1.4 feel
// (existing-user default via v3→v4 migration). Hard = veterans only.
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
// `sphere` is unlocked at install (default starting shape). All others
// require crossing the listed best-score threshold. Existing v4 saves
// are grandfather-unlocked at migration time so no surprise loss.
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
/** All shape ids in unlock order. Source-of-truth for picker iteration
 * and v4→v5 grandfather migration. */
export const ALL_BIRD_SHAPES = ['sphere','cube','pyramid','bird','cat','dog','frog','unicorn','penguin'] as const

// Phase 7 — pipe color cycling (BEAUTY-08, D-14, D-18)
// 4 toon colors cycling per ObstaclePair spawn. PIPE_COLOR_CYCLE[0] === PIPE_COLOR (green).
// All colors chosen for adequate luminance contrast against sky-blue background.
// When colorblind palette is active, cycling is suppressed (uses colorblind single color instead).
export const PIPE_COLOR_CYCLE: readonly number[] = [
  0x4caf50,  // green (matches existing PIPE_COLOR)
  0x3f8fb8,  // teal-blue
  0xb8843f,  // warm orange-brown
  0x9b3fb8,  // muted purple
] as const

// Phase 2 — object pool (per D-07, D-22)
export const POOL_SIZE = 8                  // pre-warmed ObstaclePair instances

// Phase 2 — post-processing (per D-17, D-32)
export const BLOOM_STRENGTH = 0.7
export const BLOOM_RADIUS = 0.6
export const BLOOM_THRESHOLD = 0.85
export const VIGNETTE_OFFSET = 1.0
export const VIGNETTE_DARKNESS = 0.4
