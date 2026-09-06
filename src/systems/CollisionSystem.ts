import type { Actor } from 'xstate'
import type { gameMachine } from '../machine/gameMachine'
import { WORLD_FLOOR_Y, BIRD_Z, BIRD_RADIUS, PIPE_RADIUS, PIPE_CAP_RADIUS, PIPE_CAP_HEIGHT, PIPE_HEIGHT } from '../constants'
import type { Bird } from '../entities/Bird'
import type { ObjectPool } from '../pools/ObjectPool'
import type { ObstaclePair } from '../entities/ObstaclePair'

type GameActor = Actor<typeof gameMachine>

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
    if (this.bird.position.y - BIRD_RADIUS < WORLD_FLOOR_Y) {
      this.hit()
      return
    }

    // Circle versus the actual shaft/cap rectangles in the side-on Y/Z plane.
    // Nearest-point distance leaves rounded corners clear instead of treating
    // the bird as a square. Use logical positions, never render-frame matrices.
    const birdY = this.bird.position.y
    let collided = false
    this.pool.forEachActive((pair) => {
      if (collided) return
      const gapTop = pair.gapCenterY + pair.gapHeight / 2
      const gapBottom = pair.gapCenterY - pair.gapHeight / 2
      const overlaps = (radius: number, bottom: number, top: number) => {
        const dz = Math.max(0, Math.abs(pair.z - BIRD_Z) - radius)
        const dy = Math.max(bottom - birdY, 0, birdY - top)
        return dz * dz + dy * dy < BIRD_RADIUS * BIRD_RADIUS
      }
      collided = overlaps(PIPE_RADIUS, gapTop, gapTop + PIPE_HEIGHT)
        || overlaps(PIPE_RADIUS, gapBottom - PIPE_HEIGHT, gapBottom)
        || overlaps(PIPE_CAP_RADIUS, gapTop, gapTop + PIPE_CAP_HEIGHT)
        || overlaps(PIPE_CAP_RADIUS, gapBottom - PIPE_CAP_HEIGHT, gapBottom)
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
