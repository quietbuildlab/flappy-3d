import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { Scene } from '@babylonjs/core/scene'

const COUNT = 6
const SPAWN_Z = 70
const DESPAWN_Z = -12

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/** Puffy clouds drifting toward the camera high above the gameplay lane. */
export class Clouds {
  private readonly meshes: Mesh[] = []

  constructor(scene: Scene) {
    const mat = new StandardMaterial('cloud-mat', scene)
    mat.diffuseColor = new Color3(1, 1, 1)
    mat.emissiveColor = new Color3(1, 0.98, 0.91)
    mat.disableLighting = true
    mat.specularColor = Color3.Black()
    mat.alpha = 0.85

    for (let i = 0; i < COUNT; i++) {
      const cloud = MeshBuilder.CreateSphere(`cloud-${i}`, { diameter: 3, segments: 8 }, scene)
      cloud.material = mat
      cloud.isPickable = false
      this.meshes.push(cloud)
    }
    this.reset()
  }

  step(dt: number, scrollSpeed: number): void {
    const speed = scrollSpeed * 0.5
    for (const cloud of this.meshes) {
      cloud.position.z -= speed * dt
      if (cloud.position.z < DESPAWN_Z) {
        cloud.position.z = SPAWN_Z
        cloud.position.x = randRange(-16, -5)
        cloud.position.y = randRange(4, 8)
        this.scale(cloud)
      }
    }
  }

  reset(): void {
    for (const cloud of this.meshes) {
      cloud.position.x = randRange(-16, -5)
      cloud.position.y = randRange(4, 8)
      cloud.position.z = randRange(DESPAWN_Z, SPAWN_Z)
      this.scale(cloud)
    }
  }

  private scale(cloud: Mesh): void {
    const s = randRange(0.7, 1.4)
    cloud.scaling.set(s * 1.6, s * 0.7, s)
  }
}
