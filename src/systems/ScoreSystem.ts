import type { Actor } from 'xstate'
import type { gameMachine } from '../machine/gameMachine'
import type { ObjectPool } from '../pools/ObjectPool'
import type { ObstaclePair } from '../entities/ObstaclePair'
import { BIRD_Z } from '../constants'

type GameActor = Actor<typeof gameMachine>

export class ScoreSystem {
  private readonly pool: ObjectPool<ObstaclePair>
  private readonly actor: GameActor

  constructor(pool: ObjectPool<ObstaclePair>, actor: GameActor) {
    this.pool = pool
    this.actor = actor
  }

  step(_dt: number): void {
    if (this.actor.getSnapshot().value !== 'playing') return
    if (this.actor.getSnapshot().status !== 'active') return

    this.pool.forEachActive((pair) => {
      if (pair.z < BIRD_Z && !pair.passed) {
        pair.passed = true
        this.actor.send({ type: 'SCORE' })
      }
    })
  }
}
