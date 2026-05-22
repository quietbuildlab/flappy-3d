import type { Scene } from '@babylonjs/core/scene'
import { ParticleEmitter } from './ParticleEmitter'

export interface ParticleSystemAdapter {
  burst(origin: { x: number; y: number; z: number }): void
  burstTinted(origin: { x: number; y: number; z: number }, color: number): void
  step(dt: number): void
}

export function createParticles(scene: Scene): ParticleSystemAdapter {
  const emitter = new ParticleEmitter(scene, 60)
  return {
    burst: (origin) => emitter.burst(origin),
    burstTinted: (origin, color) => emitter.burstTinted(origin, color),
    step: (dt) => emitter.step(dt),
  }
}
