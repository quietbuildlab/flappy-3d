import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem'
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Color4 } from '@babylonjs/core/Maths/math.color'
import type { Scene } from '@babylonjs/core/scene'

const BURST_COUNT = 36

function softDotTexture(scene: Scene): DynamicTexture {
  const size = 64
  const tex = new DynamicTexture('particle', { width: size, height: size }, scene, false)
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.5, 'rgba(255,255,255,0.6)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  tex.update()
  tex.hasAlpha = true
  return tex
}

function color4Of(hex: number): Color4 {
  return new Color4(
    ((hex >> 16) & 0xff) / 255,
    ((hex >> 8) & 0xff) / 255,
    (hex & 0xff) / 255,
    1,
  )
}

/**
 * One-shot particle burst built on Babylon's ParticleSystem. A single
 * persistent system is re-aimed and re-fired via manualEmitCount — Babylon
 * advances live particles automatically during scene.render().
 */
export class ParticleEmitter {
  private readonly system: ParticleSystem
  private readonly emitPos = new Vector3(0, 0, 0)

  constructor(scene: Scene, count = 60) {
    const system = new ParticleSystem('burst', count, scene)
    system.particleTexture = softDotTexture(scene)
    system.emitter = this.emitPos
    system.minEmitBox = new Vector3(0, 0, 0)
    system.maxEmitBox = new Vector3(0, 0, 0)
    system.direction1 = new Vector3(-1, 1, -1)
    system.direction2 = new Vector3(1, 1, 1)
    system.minEmitPower = 2.5
    system.maxEmitPower = 6.5
    system.minLifeTime = 0.5
    system.maxLifeTime = 1.0
    system.minSize = 0.1
    system.maxSize = 0.28
    system.gravity = new Vector3(0, -12, 0)
    system.blendMode = ParticleSystem.BLENDMODE_ADD
    system.colorDead = new Color4(1, 1, 1, 0)
    system.emitRate = 0
    system.updateSpeed = 0.016
    this.system = system
    this.setColor(0xffd166)
    system.start()
  }

  private setColor(hex: number): void {
    const c = color4Of(hex)
    this.system.color1 = c
    this.system.color2 = c
  }

  burst(origin: { x: number; y: number; z: number }): void {
    this.burstTinted(origin, 0xffd166)
  }

  burstTinted(origin: { x: number; y: number; z: number }, color: number): void {
    this.emitPos.set(origin.x, origin.y, origin.z)
    this.setColor(color)
    this.system.manualEmitCount = BURST_COUNT
  }

  /** Babylon advances particles itself during render — no manual step needed. */
  step(_dt: number): void {}
}
