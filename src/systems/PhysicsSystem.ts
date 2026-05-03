import type { Actor } from 'xstate'
import type { gameMachine } from '../machine/gameMachine'
import { GRAVITY, FLAP_IMPULSE, MAX_FALL_SPEED, WORLD_CEILING_Y, DIFFICULTY_MULTIPLIERS } from '../constants'
import type { Bird } from '../entities/Bird'
import type { StorageManager } from '../storage/StorageManager'

type GameActor = Actor<typeof gameMachine>

export class PhysicsSystem {
  private bird: Bird
  private actor: GameActor
  private storage: StorageManager | null
  private flapQueued = false

  constructor(bird: Bird, actor: GameActor, storage: StorageManager | null = null) {
    this.bird = bird
    this.actor = actor
    this.storage = storage
  }

  queueFlap(): void {
    this.flapQueued = true
  }

  // actor.send audit (Phase 5): read-only — no send calls
  step(dt: number): void {
    const state = this.actor.getSnapshot().value

    if (state === 'dying') {
      this.bird.mesh.rotation.z += 1.5 * dt
    } else if (state === 'title') {
      this.bird.mesh.rotation.z = 0
    } else if (state === 'playing') {
      // Velocity-based pitch: nose-up when rising, nose-down when falling.
      // Lerp toward target so the rotation reads as a smooth banking motion
      // rather than snapping every frame.
      const targetZ = Math.max(-0.6, Math.min(0.45, -this.bird.velocity.y * 0.06))
      this.bird.mesh.rotation.z += (targetZ - this.bird.mesh.rotation.z) * 0.12
    }

    if (state !== 'playing' && state !== 'dying') {
      this.bird.syncMesh()
      return
    }

    // Snapshot prev position for render interpolation (Phase 18 #3 v1.6)
    this.bird.snapshotPosition()

    if (this.flapQueued) {
      this.bird.velocity.y = FLAP_IMPULSE
      this.flapQueued = false
    }

    const preset = this.storage?.getSettings().difficulty ?? 'normal'
    const gravityMul = DIFFICULTY_MULTIPLIERS[preset].gravity
    this.bird.velocity.y += GRAVITY * gravityMul * dt

    // Scale max fall speed too so the gentler gravity actually shows
    const maxFall = MAX_FALL_SPEED * gravityMul
    if (this.bird.velocity.y < maxFall) {
      this.bird.velocity.y = maxFall
    }

    this.bird.position.y += this.bird.velocity.y * dt

    // Clamp at ceiling — flapping into the sky shouldn't kill (only the floor does).
    // Original Flappy Bird treated the top of the screen as a soft cap, not a death.
    if (this.bird.position.y > WORLD_CEILING_Y) {
      this.bird.position.y = WORLD_CEILING_Y
      this.bird.velocity.y = 0
    }

    // syncMesh is intentionally NOT called here — the GameLoop interpolator
    // (in main.ts) lerps mesh.position from prevPosition→position by alpha
    // each render frame, giving smoother motion on >60Hz screens.
  }
}
