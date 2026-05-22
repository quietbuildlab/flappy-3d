import type { Actor } from 'xstate'
import type { gameMachine } from '../machine/gameMachine'
import type { ObjectPool } from '../pools/ObjectPool'
import type { ObstaclePair } from '../entities/ObstaclePair'
import type { StorageManager } from '../storage/StorageManager'
import { OBSTACLE_SPAWN_Z, GAP_CENTER_RANGE, PIPE_COLOR_CYCLE } from '../constants'
import { COLORBLIND_PIPE_COLOR } from '../render/toonMaterial'
import { difficultyFrom } from './Difficulty'
import type { DifficultyConfig } from './Difficulty'

const TITLE_DEMO_DIFFICULTY: DifficultyConfig = {
  spawnInterval: 2.2,  // seconds — slower cadence, fewer pipes on screen
  scrollSpeed: 1.8,    // matches TITLE_DEMO_SCROLL_SPEED in ScrollSystem
  gapHeight: 3.2,      // wider than gameplay BASE_GAP_HEIGHT (2.6) — easy/relaxed
}

type GameActor = Actor<typeof gameMachine>

export class ObstacleSpawner {
  private readonly pool: ObjectPool<ObstaclePair>
  private readonly actor: GameActor
  private readonly storage: StorageManager | null
  private elapsed = 0
  private spawnIndex = 0
  private colorblindMode = false
  private rng: () => number = Math.random

  constructor(
    pool: ObjectPool<ObstaclePair>,
    actor: GameActor,
    storage: StorageManager | null = null,
  ) {
    this.pool = pool
    this.actor = actor
    this.storage = storage
  }

  setRng(rng: () => number): void {
    this.rng = rng
  }

  resetColorIndex(): void {
    this.spawnIndex = 0
  }

  setColorblindMode(on: boolean): void {
    this.colorblindMode = on
  }

  step(dt: number): void {
    const state = this.actor.getSnapshot().value
    const isTitleDemo = state === 'title'

    if (!isTitleDemo && state !== 'playing') {
      this.elapsed = 0
      return
    }

    this.elapsed += dt

    const preset = this.storage?.getSettings().difficulty ?? 'normal'
    const difficulty: DifficultyConfig = isTitleDemo
      ? TITLE_DEMO_DIFFICULTY
      : difficultyFrom(this.actor.getSnapshot().context.score, preset)

    if (this.elapsed >= difficulty.spawnInterval) {
      this.elapsed = 0
      const pair = this.pool.acquire()
      if (pair === null) return
      const gapCenterY = (this.rng() * 2 - 1) * GAP_CENTER_RANGE
      pair.reset(OBSTACLE_SPAWN_Z, gapCenterY, difficulty.gapHeight)
      // Always set an explicit colour so a pair never relies on whatever the
      // cloned template happened to be. Colorblind mode → single safe colour.
      if (this.colorblindMode) {
        pair.setColor(COLORBLIND_PIPE_COLOR)
      } else {
        const color = PIPE_COLOR_CYCLE[this.spawnIndex % PIPE_COLOR_CYCLE.length]
        if (color !== undefined) pair.setColor(color)
      }
      this.spawnIndex++
    }
  }
}
