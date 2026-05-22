import type { Actor } from 'xstate'
import type { gameMachine } from '../machine/gameMachine'
import type { ObjectPool } from '../pools/ObjectPool'
import type { ObstaclePair } from '../entities/ObstaclePair'
import type { Background } from '../entities/Background'
import type { StorageManager } from '../storage/StorageManager'
import { OBSTACLE_DESPAWN_Z } from '../constants'
import { difficultyFrom } from './Difficulty'

const TITLE_DEMO_SCROLL_SPEED = 1.8  // world units/sec — slower, relaxed feel

type GameActor = Actor<typeof gameMachine>

export class ScrollSystem {
  private readonly pool: ObjectPool<ObstaclePair>
  private readonly actor: GameActor
  private readonly background: Background | null
  private readonly storage: StorageManager | null

  constructor(
    pool: ObjectPool<ObstaclePair>,
    actor: GameActor,
    background: Background | null = null,
    storage: StorageManager | null = null,
  ) {
    this.pool = pool
    this.actor = actor
    this.background = background
    this.storage = storage
  }

  step(dt: number): void {
    const state = this.actor.getSnapshot().value
    const isTitleDemo = state === 'title'
    if (!isTitleDemo && state !== 'playing' && state !== 'dying') return

    const score = this.actor.getSnapshot().context.score
    const preset = this.storage?.getSettings().difficulty ?? 'normal'
    const scrollSpeed = isTitleDemo
      ? TITLE_DEMO_SCROLL_SPEED
      : difficultyFrom(score, preset).scrollSpeed

    const toRelease: ObstaclePair[] = []
    this.pool.forEachActive((pair) => {
      pair.z -= scrollSpeed * dt
      if (pair.z < OBSTACLE_DESPAWN_Z) {
        pair.hide()
        toRelease.push(pair)
      }
    })
    for (const p of toRelease) this.pool.release(p)

    if (this.background !== null) {
      this.background.scroll(dt, scrollSpeed)
    }
  }
}
