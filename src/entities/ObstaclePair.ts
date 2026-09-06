import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { Scene } from '@babylonjs/core/scene'
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { PIPE_RADIUS, PIPE_HEIGHT, PIPE_CAP_RADIUS as CAP_RADIUS, PIPE_CAP_HEIGHT as CAP_HEIGHT } from '../constants'
import { hexColor3 } from '../render/toonMaterial'

/**
 * A top + bottom pipe pair with a vertical gap. In the true-3D rebuild the
 * pipes are vertical cylinders along Y; the pair scrolls toward the camera
 * along −Z. `root.position.z` is the scroll coordinate.
 */
export class ObstaclePair {
  readonly root: TransformNode
  private readonly topPipe: Mesh
  private readonly bottomPipe: Mesh
  private readonly topCap: Mesh
  private readonly bottomCap: Mesh
  private readonly material: StandardMaterial
  passed = false
  // Gap geometry — read by CollisionSystem's hand-rolled AABB.
  gapCenterY = 0
  gapHeight = 0

  constructor(scene: Scene, material: StandardMaterial) {
    this.root = new TransformNode('obstacle-pair', scene)
    this.material = material.clone(`pipe-mat-${this.root.uniqueId}`) as StandardMaterial

    this.topPipe = MeshBuilder.CreateCylinder(
      'pipe-top',
      { diameter: PIPE_RADIUS * 2, height: PIPE_HEIGHT, tessellation: 20 },
      scene,
    )
    this.bottomPipe = MeshBuilder.CreateCylinder(
      'pipe-bottom',
      { diameter: PIPE_RADIUS * 2, height: PIPE_HEIGHT, tessellation: 20 },
      scene,
    )
    this.topCap = MeshBuilder.CreateCylinder(
      'pipe-cap-top',
      { diameter: CAP_RADIUS * 2, height: CAP_HEIGHT, tessellation: 20 },
      scene,
    )
    this.bottomCap = MeshBuilder.CreateCylinder(
      'pipe-cap-bottom',
      { diameter: CAP_RADIUS * 2, height: CAP_HEIGHT, tessellation: 20 },
      scene,
    )
    for (const m of [this.topPipe, this.bottomPipe, this.topCap, this.bottomCap]) {
      m.material = this.material
      m.parent = this.root
    }
    this.root.setEnabled(false)
  }

  get z(): number {
    return this.root.position.z
  }

  set z(value: number) {
    this.root.position.z = value
  }

  setColor(colorHex: number): void {
    const c = hexColor3(colorHex)
    this.material.diffuseColor = c
    this.material.emissiveColor = c.scale(0.18)
  }

  reset(z: number, gapCenterY: number, gapHeight: number): void {
    this.passed = false
    this.gapCenterY = gapCenterY
    this.gapHeight = gapHeight
    this.root.setEnabled(true)
    this.root.position.set(0, 0, z)

    this.topPipe.position.y = gapCenterY + gapHeight / 2 + PIPE_HEIGHT / 2
    this.bottomPipe.position.y = gapCenterY - gapHeight / 2 - PIPE_HEIGHT / 2
    this.topCap.position.y = gapCenterY + gapHeight / 2 + CAP_HEIGHT / 2
    this.bottomCap.position.y = gapCenterY - gapHeight / 2 - CAP_HEIGHT / 2
  }

  hide(): void {
    this.root.setEnabled(false)
  }

  dispose(): void {
    this.root.dispose(false, true)
    this.material.dispose()
  }
}
