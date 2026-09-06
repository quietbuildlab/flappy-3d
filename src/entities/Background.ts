import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { Scene } from '@babylonjs/core/scene'
import { SKY_KEYFRAMES, SKY_CYCLE_DURATION_S, WORLD_FLOOR_Y } from '../constants'

const MOUNTAIN_COLOR = 0xb9d2b1
const GROUND_COLOR = 0xf3dc91
const MOUNTAIN_COUNT = 7
const MOUNTAIN_Z_SPAN = 140 // recycle window length in Z
const MOUNTAIN_Z_START = -14

/**
 * Far backdrop for the chase-cam corridor: a long ground plane the bird
 * flies over, a recycled row of distant mountains, and a day/night sky
 * colour cycle applied to the scene clear colour.
 */
export class Background {
  private readonly scene: Scene
  private readonly mountains: Mesh[] = []
  private cycleElapsed = 0

  constructor(scene: Scene) {
    this.scene = scene

    // Ground — long plane stretching down the +Z corridor.
    const ground = MeshBuilder.CreateBox(
      'ground',
      { width: 20, height: 8, depth: MOUNTAIN_Z_SPAN + 80 },
      scene,
    )
    ground.position.set(0, WORLD_FLOOR_Y - 4, 50)
    const groundMat = new StandardMaterial('ground-mat', scene)
    groundMat.diffuseColor = colorOf(GROUND_COLOR)
    groundMat.emissiveColor = colorOf(GROUND_COLOR)
    groundMat.disableLighting = true
    groundMat.specularColor = Color3.Black()
    ground.material = groundMat

    // Distant mountains — large cones on either side of the lane.
    const mountainMat = new StandardMaterial('mountain-mat', scene)
    mountainMat.diffuseColor = colorOf(MOUNTAIN_COLOR)
    mountainMat.emissiveColor = colorOf(MOUNTAIN_COLOR)
    mountainMat.disableLighting = true
    mountainMat.specularColor = Color3.Black()
    for (let i = 0; i < MOUNTAIN_COUNT; i++) {
      const m = MeshBuilder.CreateSphere(
        `mountain-${i}`,
        { diameter: 10, segments: 20 },
        scene,
      )
      m.material = mountainMat
      m.isPickable = false
      m.scaling.set(1, 0.55 + (i % 3) * 0.1, 1.5)
      m.position = new Vector3(
        -(14 + (i % 3) * 4),
        WORLD_FLOOR_Y - 1,
        MOUNTAIN_Z_START + (i / MOUNTAIN_COUNT) * MOUNTAIN_Z_SPAN,
      )
      this.mountains.push(m)
    }

    this.resetSkyCycle()
  }

  /** Scroll distant scenery toward the camera and recycle past the bird. */
  scroll(dt: number, obstacleScrollSpeed: number): void {
    const speed = obstacleScrollSpeed * 0.3
    for (const m of this.mountains) {
      m.position.z -= speed * dt
      if (m.position.z < MOUNTAIN_Z_START) m.position.z += MOUNTAIN_Z_SPAN
    }
  }

  /** Lerp the sky (scene clear colour) over a continuous day/night cycle. */
  cycleSky(dt: number, isReducedMotion: boolean): void {
    if (isReducedMotion) return
    this.cycleElapsed = (this.cycleElapsed + dt) % SKY_CYCLE_DURATION_S
    const segment = SKY_CYCLE_DURATION_S / SKY_KEYFRAMES.length
    const idx = Math.floor(this.cycleElapsed / segment)
    const t = (this.cycleElapsed % segment) / segment
    const cur = SKY_KEYFRAMES[idx]!
    const nxt = SKY_KEYFRAMES[(idx + 1) % SKY_KEYFRAMES.length]!
    this.applySky(Color3.Lerp(cur.top, nxt.top, t))
  }

  resetSkyCycle(): void {
    this.cycleElapsed = 0
    this.applySky(SKY_KEYFRAMES[0]!.top)
  }

  private applySky(c: Color3): void {
    const clear = this.scene.clearColor
    clear.r = c.r
    clear.g = c.g
    clear.b = c.b
  }

  dispose(): void {
    for (const m of this.mountains) m.dispose()
  }
}

function colorOf(hex: number): Color3 {
  return new Color3(
    ((hex >> 16) & 0xff) / 255,
    ((hex >> 8) & 0xff) / 255,
    (hex & 0xff) / 255,
  )
}
