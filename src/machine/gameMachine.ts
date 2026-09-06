// CRITICAL: Zero Three.js imports — machine context holds only primitive values.

import { setup, assign, emit } from 'xstate'

export type GameMode = 'endless' | 'timeAttack' | 'daily'

export type GameContext = {
  score: number
  bestScore: number
  runDuration: number
  paused: boolean
  mode: GameMode
}

export type GameEvent =
  | { type: 'START' }
  | { type: 'FLAP' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'HIT' }
  | { type: 'RESTART' }
  | { type: 'SCORE' }
  | { type: 'SET_MODE'; mode: GameMode }
  | { type: 'TIME_UP' }

// Emitted to subscribers via `actor.on(...)`. Used to signal "fresh round
// starting" so external systems (Three.js entities, pools) can reset.
// Distinct from the playing state's `entry` to avoid firing on RESUME.
//   - roundStarted: full round reset (bird → 0,0,0; obstacles released)
export type GameEmitted = { type: 'roundStarted' }

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
  }),
  initial: 'title',
  states: {
    title: {
      on: {
        START: {
          target: 'playing',
          actions: [
            assign({ score: 0, runDuration: 0 }),
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
        HIT: { target: 'dying' },
        TIME_UP: { target: 'dying' },
        SCORE: { actions: assign({ score: ({ context }) => context.score + 1 }) },
        PAUSE: { target: 'paused' },
        // FLAP handled externally (PhysicsSystem reads state)
        FLAP: {},
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
            assign({ score: 0, runDuration: 0 }),
            emit({ type: 'roundStarted' }),
          ],
        },
        START: {
          // GameOverScreen "Back to Title" button — reset and return to title.
          // Reuses roundStarted to reset bird position + clear obstacles + reset
          // milestone-fired set + ghost meshes + pipe color cycle index.
          target: 'title',
          actions: [
            assign({ score: 0, runDuration: 0 }),
            emit({ type: 'roundStarted' }),
          ],
        },
      },
    },
  },
})
