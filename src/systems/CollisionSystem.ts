import type { Actor } from 'xstate'
import type { gameMachine } from '../machine/gameMachine'
import { WORLD_FLOOR_Y, BIRD_Z, PIPE_RADIUS } from '../constants'
import type { Bird } from '../entities/Bird'
import type { ObjectPool } from '../pools/ObjectPool'
import type { ObstaclePair } from '../entities/ObstaclePair'

type GameActor = Actor<typeof gameMachine>

// Effective collision radius of the bird (body sphere is ~0.35, kept a touch
// forgiving so near-misses feel fair).
const BIRD_RADIUS = 0.3

export class CollisionSystem {
  private bird: Bird
  private pool: ObjectPool<ObstaclePair>
  private actor: GameActor

  constructor(bird: Bird, pool: ObjectPool<ObstaclePair>, actor: GameActor) {
    this.bird = bird
    this.pool = pool
    this.actor = actor
  }

  step(_dt: number): void {
    if (this.actor.getSnapshot().value !== 'playing') return

    // Floor death — flying into the ground ends the run.
    if (this.bird.position.y < WORLD_FLOOR_Y) {
      this.hit()
      return
    }

    // Hand-rolled AABB against each active pipe pair, computed purely from
    // logical positions (no Babylon world-matrix dependency, so a pipe
    // spawned this same tick collides correctly). A hit needs depth overlap
    // in Z *and* the bird outside the vertical gap.
    const birdY = this.bird.position.y
    let collided = false
    this.pool.forEachActive((pair) => {
      if (collided) return
      if (Math.abs(pair.z - BIRD_Z) > PIPE_RADIUS + BIRD_RADIUS) return
      const gapTop = pair.gapCenterY + pair.gapHeight / 2
      const gapBottom = pair.gapCenterY - pair.gapHeight / 2
      if (birdY + BIRD_RADIUS > gapTop || birdY - BIRD_RADIUS < gapBottom) {
        collided = true
      }
    })

    if (collided) {
      this.hit()
    }
  }

  private hit(): void {
    if (this.actor.getSnapshot().status !== 'active') return
    this.actor.send({ type: 'HIT' })
  }
}
