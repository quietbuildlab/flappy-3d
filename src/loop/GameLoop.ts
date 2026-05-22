import type { Engine } from '@babylonjs/core/Engines/engine'
import type { Scene } from '@babylonjs/core/scene'
import { FIXED_DT, DT_CLAMP_MAX } from '../constants'

interface UpdatableSystem {
  step(dt: number): void
}

type Interpolator = (alpha: number) => void

export class GameLoop {
  private engine: Engine
  private scene: Scene
  private systems: UpdatableSystem[] = []
  private interpolators: Interpolator[] = []
  private accumulator = 0
  private lastTime = 0

  constructor(engine: Engine, scene: Scene) {
    this.engine = engine
    this.scene = scene
  }

  add(system: UpdatableSystem): void {
    this.systems.push(system)
  }

  /** Register a per-frame interpolation hook that runs AFTER all fixed-step
   * updates and BEFORE render. Receives `alpha = accumulator / FIXED_DT` in
   * [0, 1) — the fractional progress toward the next fixed step. */
  addInterpolator(fn: Interpolator): void {
    this.interpolators.push(fn)
  }

  start(): void {
    this.lastTime = 0
    this.accumulator = 0
    this.engine.runRenderLoop(() => this.tick(performance.now()))
  }

  stop(): void {
    this.engine.stopRenderLoop()
  }

  private tick(now: number): void {
    const rawDt = this.lastTime === 0 ? 0 : (now - this.lastTime) / 1000
    this.lastTime = now
    const dt = Math.min(rawDt, DT_CLAMP_MAX)

    this.accumulator += dt

    while (this.accumulator >= FIXED_DT) {
      for (const system of this.systems) {
        system.step(FIXED_DT)
      }
      this.accumulator -= FIXED_DT
    }

    const alpha = this.accumulator / FIXED_DT
    for (const interp of this.interpolators) interp(alpha)

    this.scene.render()
  }
}
