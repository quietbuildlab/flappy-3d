// CRITICAL: Zero Three.js imports — machine context holds only primitive values.

import { setup, assign, emit } from 'xstate'
import { StorageManager } from '../storage/StorageManager'

export type GameMode = 'endless' | 'timeAttack' | 'daily'

// v1.9 — Lives system constants. 3 starting lives; +1 every 5 obstacles
// passed, capped at 5 (so the bonus stops accumulating into infinity but
// you keep getting them as a recovery cushion).
export const STARTING_LIVES = 3
export const MAX_LIVES = 5
export const SCORE_PER_BONUS_LIFE = 5

export type GameContext = {
  score: number
  bestScore: number
  runDuration: number
  paused: boolean
  mode: GameMode
  lives: number       // v1.9 — remaining lives this round
}

export type GameEvent =
  | { type: 'START' }
  | { type: 'FLAP' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'HIT' }
  | { type: 'RESPAWN_DONE' }   // v1.9 — fired by main.ts after respawn delay
  | { type: 'RESTART' }
  | { type: 'SCORE' }
  | { type: 'SET_MODE'; mode: GameMode }
  | { type: 'TIME_UP' }

// Emitted to subscribers via `actor.on(...)`. Used to signal "fresh round
// starting" so external systems (Three.js entities, pools) can reset.
// Distinct from the playing state's `entry` to avoid firing on RESUME.
//   - roundStarted: full round reset (bird → 0,0,0; obstacles released)
//   - lifeLost: HIT consumed a life but lives > 0 → respawn (no full reset)
//   - lifeGained: bonus life from score milestone
export type GameEmitted =
  | { type: 'roundStarted' }
  | { type: 'lifeLost'; livesRemaining: number }
  | { type: 'lifeGained'; livesRemaining: number }

// StorageManager instance used by the gameOver entry action.
// Singleton at module level — pure TS, no Three.js dependency.
const storage = new StorageManager()

export const gameMachine = setup({
  types: {
    context: {} as GameContext,
    events: {} as GameEvent,
    emitted: {} as GameEmitted,
    input: {} as { bestScore: number; mode?: GameMode },
  },
}).createMachine({
  id: 'flappy',
  // Context seeded from createActor input (see main.ts):
  //   createActor(gameMachine, { input: { bestScore, mode } })
  context: ({ input }) => ({
    score: 0,
    bestScore: input.bestScore,
    runDuration: 0,
    paused: false,
    mode: input.mode ?? 'endless',
    lives: STARTING_LIVES,
  }),
  initial: 'title',
  states: {
    title: {
      on: {
        START: {
          target: 'playing',
          actions: [
            assign({ score: 0, runDuration: 0, lives: STARTING_LIVES }),
            emit({ type: 'roundStarted' }),
          ],
        },
        SET_MODE: {
          actions: assign({ mode: ({ event }) => event.mode }),
        },
      },
    },

    playing: {
      on: {
        // v1.9 — HIT branches: spend a life and respawn if any remain,
        // otherwise fall through to dying as before.
        HIT: [
          {
            guard: ({ context }) => context.lives > 1,
            target: 'respawning',
            actions: [
              assign({ lives: ({ context }) => context.lives - 1 }),
              emit(({ context }) => ({
                type: 'lifeLost' as const,
                livesRemaining: context.lives - 1,
              })),
            ],
          },
          { target: 'dying' },
        ],
        TIME_UP: { target: 'dying' },
        SCORE: [
          // Bonus-life branch: score increments AND crosses a SCORE_PER_BONUS_LIFE
          // boundary AND lives below cap. Increments score + lives, emits lifeGained.
          {
            guard: ({ context }) => {
              const next = context.score + 1
              return next % SCORE_PER_BONUS_LIFE === 0 && context.lives < MAX_LIVES
            },
            actions: [
              assign({
                score: ({ context }) => context.score + 1,
                lives: ({ context }) => context.lives + 1,
              }),
              emit(({ context }) => ({
                type: 'lifeGained' as const,
                livesRemaining: context.lives,  // post-assign; reflects new value
              })),
            ],
          },
          // Default branch: just increment score (no emit needed).
          {
            actions: assign({ score: ({ context }) => context.score + 1 }),
          },
        ],
        PAUSE: { target: 'paused' },
        // FLAP handled externally (PhysicsSystem reads state)
        FLAP: {},
      },
    },

    // v1.9 — respawning is a brief invincibility window where the bird is
    // reset to (0,0,0) and the player can't take damage. Driven externally
    // by main.ts (which fires RESPAWN_DONE after ~1.4s including animation).
    respawning: {
      on: {
        RESPAWN_DONE: { target: 'playing' },
        // Allow pause during respawn for safety (don't softlock)
        PAUSE: { target: 'paused' },
      },
    },

    paused: {
      on: {
        RESUME: { target: 'playing' },
        START: { target: 'title' },
      },
    },

    dying: {
      // 800ms death delay — bird plays death animation, no new obstacle spawns
      after: {
        800: { target: 'gameOver' },
      },
    },

    gameOver: {
      entry: [
        // Persist best score if current run beat it, and update context
        assign({
          bestScore: ({ context }) => {
            if (context.score > context.bestScore) {
              storage.setBestScore(context.score)
              return context.score
            }
            return context.bestScore
          },
        }),
        // Phase 2 debug log (Phase 3 replaces with game-over screen DOM)
        ({ context }) => {
          console.log(
            '[machine] GAME OVER:',
            context.score,
            '(best:',
            context.bestScore,
            ')',
          )
        },
      ],
      on: {
        RESTART: {
          target: 'playing',
          actions: [
            assign({ score: 0, runDuration: 0, lives: STARTING_LIVES }),
            emit({ type: 'roundStarted' }),
          ],
        },
        START: {
          // GameOverScreen "Back to Title" button — reset and return to title.
          // Reuses roundStarted to reset bird position + clear obstacles + reset
          // milestone-fired set + ghost meshes + pipe color cycle index.
          target: 'title',
          actions: [
            assign({ score: 0, runDuration: 0, lives: STARTING_LIVES }),
            emit({ type: 'roundStarted' }),
          ],
        },
      },
    },
  },
})

