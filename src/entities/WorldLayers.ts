import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { Scene } from '@babylonjs/core/scene'
import { WORLD_FLOOR_Y } from '../constants'

const TREE_FOLIAGE_COLOR = 0x2d5a27
const TREE_TRUNK_COLOR = 0x4a3527
const SHRUB_COLOR = 0x4a8a4a

const TREE_COUNT = 12
const Z_SPAN = 130
const Z_START = -12
const LANE_EDGE = 6.5

/**
 * Mid-distance scenery lining the corridor: trees and shrubs that scroll
 * toward the camera and recycle, plus an occasional drifting balloon prop.
 */
export class WorldLayers {
  private readonly trees: TransformNode[] = []
  private readonly balloon: TransformNode
  private balloonActive = false
  private balloonCooldown = 4
  /** Called once when the balloon re-enters the visible band. */
  onBalloonAppear: () => void = () => {}

  constructor(scene: Scene) {
    const trunkMat = new StandardMaterial('trunk-mat', scene)
    trunkMat.diffuseColor = colorOf(TREE_TRUNK_COLOR)
    trunkMat.specularColor = Color3.Black()
    const foliageMat = new StandardMaterial('foliage-mat', scene)
    foliageMat.diffuseColor = colorOf(TREE_FOLIAGE_COLOR)
    foliageMat.specularColor = Color3.Black()
    const shrubMat = new StandardMaterial('shrub-mat', scene)
    shrubMat.diffuseColor = colorOf(SHRUB_COLOR)
    shrubMat.specularColor = Color3.Black()

    for (let i = 0; i < TREE_COUNT; i++) {
      const tree = new TransformNode(`tree-${i}`, scene)
      const trunk = MeshBuilder.CreateCylinder(
        `trunk-${i}`, { height: 1.1, diameter: 0.3, tessellation: 6 }, scene,
      )
      trunk.material = trunkMat
      trunk.position.y = 0.55
      trunk.parent = tree
      const foliage = MeshBuilder.CreateCylinder(
        `foliage-${i}`, { height: 2, diameterTop: 0, diameterBottom: 1.4, tessellation: 7 }, scene,
      )
      foliage.material = foliageMat
      foliage.position.y = 2
      foliage.parent = tree
      // Small shrub at the base for variety.
      const shrub = MeshBuilder.CreateSphere(`shrub-${i}`, { diameter: 0.7, segments: 6 }, scene)
      shrub.material = shrubMat
      shrub.position.set(0.5, 0.25, 0.3)
      shrub.parent = tree

      const side = i % 2 === 0 ? -1 : 1
      tree.position = new Vector3(
        side * (LANE_EDGE + (i % 3) * 1.5),
        WORLD_FLOOR_Y,
        Z_START + (i / TREE_COUNT) * Z_SPAN,
      )
      this.trees.push(tree)
    }

    // Balloon depth-event prop.
    this.balloon = new TransformNode('balloon', scene)
    const balloonMat = new StandardMaterial('balloon-mat', scene)
    balloonMat.diffuseColor = colorOf(0xee6b8c)
    balloonMat.specularColor = Color3.Black()
    const body = MeshBuilder.CreateSphere('balloon-body', { diameter: 1.1, segments: 10 }, scene)
    body.scaling.set(0.85, 1, 0.85)
    body.material = balloonMat
    body.parent = this.balloon
    const stringMat = new StandardMaterial('balloon-string', scene)
    stringMat.diffuseColor = new Color3(0.1, 0.1, 0.1)
    const str = MeshBuilder.CreateCylinder('balloon-string', { height: 1, diameter: 0.04 }, scene)
    str.position.y = -0.8
    str.material = stringMat
    str.parent = this.balloon
    this.balloon.setEnabled(false)
  }

  /** Scroll scenery toward the camera; advance the balloon depth event. */
  scroll(dt: number, obstacleScrollSpeed: number): void {
    for (const tree of this.trees) {
      tree.position.z -= obstacleScrollSpeed * 0.7 * dt
      if (tree.position.z < Z_START) tree.position.z += Z_SPAN
    }

    if (this.balloonActive) {
      this.balloon.position.z -= obstacleScrollSpeed * 0.5 * dt
      this.balloon.position.y += Math.sin(this.balloon.position.z * 0.4) * 0.004
      if (this.balloon.position.z < Z_START) {
        this.balloonActive = false
        this.balloon.setEnabled(false)
        this.balloonCooldown = 8 + Math.random() * 7
      }
    } else {
      this.balloonCooldown -= dt
      if (this.balloonCooldown <= 0) {
        this.balloonActive = true
        this.balloon.setEnabled(true)
        this.balloon.position.set(
          (Math.random() > 0.5 ? 1 : -1) * (4 + Math.random() * 3),
          2 + Math.random() * 3,
          Z_SPAN * 0.7,
        )
        this.onBalloonAppear()
      }
    }
  }
}

function colorOf(hex: number): Color3 {
  return new Color3(
    ((hex >> 16) & 0xff) / 255,
    ((hex >> 8) & 0xff) / 255,
    (hex & 0xff) / 255,
  )
}
