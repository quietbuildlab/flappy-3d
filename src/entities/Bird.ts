import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { Scene } from '@babylonjs/core/scene'
import type { BirdShape } from '../storage/StorageManager'

const GHOST_COUNT = 3
const GHOST_OPACITIES = [0.55, 0.38, 0.2] as const
const GHOST_SCALES = [0.95, 0.9, 0.85] as const
const GHOST_FADE_SPEED = 1 / 0.18 // opacity → 0 in 180ms

const GEOMETRIC_SHAPES: ReadonlySet<BirdShape> = new Set(['sphere', 'cube', 'pyramid'])
const EMOJI_FOR_SHAPE: Record<string, string> = {
  bird: '🐦', cat: '🐱', dog: '🐶', frog: '🐸', unicorn: '🦄', penguin: '🐧',
}

/**
 * The player bird. `root` is the transform physics drives; the visible body
 * is a swappable child, with wing/eye/beak/tail accents and an invisible
 * collision hitbox that stays constant regardless of the cosmetic shape.
 */
export class Bird {
  readonly root: TransformNode
  body: Mesh
  readonly leftWing: Mesh
  readonly rightWing: Mesh
  private readonly leftEye: Mesh
  private readonly rightEye: Mesh
  private readonly beak: Mesh
  private readonly tail: TransformNode

  readonly position = new Vector3(0, 0, 0)
  readonly velocity = new Vector3(0, 0, 0)
  readonly prevPosition = new Vector3(0, 0, 0)

  private readonly scene: Scene
  private ghosts: Mesh[] = []
  private ghostHead = 0

  private currentShape: BirdShape = 'sphere'
  private currentImage: string | null = null
  private imageToken = 0
  private baseMaterial: StandardMaterial | null = null
  private skinMaterial: StandardMaterial | null = null
  private skinTexture: DynamicTexture | null = null

  constructor(scene: Scene) {
    this.scene = scene
    this.root = new TransformNode('bird-root', scene)

    this.body = MeshBuilder.CreateSphere('bird-body', { diameter: 0.7, segments: 16 }, scene)
    this.body.scaling.set(1, 0.65, 0.8)
    this.body.parent = this.root

    // Wings — flattened ellipsoids on the ±X sides.
    const wingMat = new StandardMaterial('bird-wing', scene)
    wingMat.diffuseColor = new Color3(1, 0.54, 0.36)
    wingMat.specularColor = Color3.Black()
    this.leftWing = MeshBuilder.CreateSphere('bird-wing-l', { diameter: 0.64, segments: 8 }, scene)
    this.leftWing.scaling.set(1.0, 0.22, 0.5)
    this.leftWing.position.set(0.3, 0.05, 0)
    this.leftWing.material = wingMat
    this.leftWing.parent = this.root
    this.rightWing = MeshBuilder.CreateSphere('bird-wing-r', { diameter: 0.64, segments: 8 }, scene)
    this.rightWing.scaling.set(1.0, 0.22, 0.5)
    this.rightWing.position.set(-0.3, 0.05, 0)
    this.rightWing.material = wingMat
    this.rightWing.parent = this.root

    // Eyes — small dark spheres at the front (+Z).
    const eyeMat = new StandardMaterial('bird-eye', scene)
    eyeMat.diffuseColor = new Color3(0.07, 0.07, 0.07)
    eyeMat.emissiveColor = new Color3(0.04, 0.04, 0.04)
    eyeMat.specularColor = new Color3(0.5, 0.5, 0.5)
    this.leftEye = MeshBuilder.CreateSphere('bird-eye-l', { diameter: 0.18, segments: 8 }, scene)
    this.leftEye.position.set(0.18, 0.2, 0.22)
    this.leftEye.material = eyeMat
    this.leftEye.parent = this.root
    this.rightEye = MeshBuilder.CreateSphere('bird-eye-r', { diameter: 0.18, segments: 8 }, scene)
    this.rightEye.position.set(-0.18, 0.2, 0.22)
    this.rightEye.material = eyeMat
    this.rightEye.parent = this.root

    // Beak — cone pointing forward (+Z).
    const beakMat = new StandardMaterial('bird-beak', scene)
    beakMat.diffuseColor = new Color3(1, 0.72, 0.3)
    beakMat.specularColor = Color3.Black()
    this.beak = MeshBuilder.CreateCylinder(
      'bird-beak',
      { height: 0.26, diameterTop: 0, diameterBottom: 0.2, tessellation: 8 },
      scene,
    )
    this.beak.rotation.x = Math.PI / 2 // point +Z
    this.beak.position.set(0, 0.02, 0.36)
    this.beak.material = beakMat
    this.beak.parent = this.root

    // Tail — 3 small cones at the back (−Z).
    this.tail = new TransformNode('bird-tail', scene)
    this.tail.parent = this.root
    const tailMat = new StandardMaterial('bird-tail', scene)
    tailMat.diffuseColor = new Color3(1, 0.44, 0.26)
    tailMat.specularColor = Color3.Black()
    for (const x of [-0.12, 0, 0.12]) {
      const feather = MeshBuilder.CreateCylinder(
        'tail-feather',
        { height: 0.24, diameterTop: 0, diameterBottom: 0.13, tessellation: 5 },
        scene,
      )
      feather.rotation.x = -Math.PI / 2 // point −Z
      feather.position.set(x, 0.05, -0.32)
      feather.material = tailMat
      feather.parent = this.tail
    }

    // Ghost trail meshes.
    for (let i = 0; i < GHOST_COUNT; i++) {
      const g = MeshBuilder.CreateSphere(`bird-ghost-${i}`, { diameter: 0.7, segments: 6 }, scene)
      const s = GHOST_SCALES[i] ?? 0.85
      g.scaling.set(s, s * 0.65, s * 0.8)
      const gm = new StandardMaterial(`ghost-mat-${i}`, scene)
      gm.diffuseColor = new Color3(1, 0.44, 0.26)
      gm.emissiveColor = new Color3(1, 0.44, 0.26)
      gm.specularColor = Color3.Black()
      gm.alpha = 0
      gm.disableLighting = true
      g.material = gm
      g.isVisible = false
      g.isPickable = false
      this.ghosts.push(g)
    }
  }

  /** Register the toon material as the body's base (geometric shapes). */
  setBaseMaterial(mat: StandardMaterial): void {
    this.baseMaterial = mat
    if (this.currentImage === null && GEOMETRIC_SHAPES.has(this.currentShape)) {
      this.body.material = mat
    }
  }

  setShape(shape: BirdShape): void {
    this.currentShape = shape
    if (this.currentImage !== null) return // uploaded image wins
    this.applyShape()
  }

  private applyShape(): void {
    this.rebuildBody(this.currentShape)
    if (GEOMETRIC_SHAPES.has(this.currentShape)) {
      this.disposeSkin()
      if (this.baseMaterial !== null) this.body.material = this.baseMaterial
      this.setAccentsVisible(true)
    } else {
      const emoji = EMOJI_FOR_SHAPE[this.currentShape]
      if (emoji !== undefined) {
        this.paintSkin((ctx, size) => {
          ctx.font = `${size * 0.8}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(emoji, size / 2, size / 2)
        })
      }
      this.setAccentsVisible(false)
    }
  }

  /** Apply a user-uploaded image as the body skin. null clears it. */
  setImage(dataURL: string | null): void {
    // Bump the token so any in-flight image load from a prior call is ignored
    // (rapid re-selection must not let a stale onload win).
    const token = ++this.imageToken
    this.currentImage = dataURL
    if (dataURL === null) {
      this.applyShape()
      return
    }
    this.rebuildBody('sphere') // flat plane body regardless of shape
    this.setAccentsVisible(false)
    const img = new Image()
    img.onload = () => {
      if (token !== this.imageToken) return // superseded by a newer setImage
      this.paintSkin((ctx, size) => ctx.drawImage(img, 0, 0, size, size))
    }
    img.onerror = () => {
      if (token !== this.imageToken) return
      // Decode failed — fall back to the currently selected geometric shape
      // rather than leaving a blank flat body.
      this.currentImage = null
      this.applyShape()
    }
    img.src = dataURL
  }

  /** Recreate the body mesh for a shape. Plane for emoji/image, else solid. */
  private rebuildBody(shape: BirdShape): void {
    this.body.dispose()
    const useFlat = !GEOMETRIC_SHAPES.has(shape) || this.currentImage !== null
    if (useFlat) {
      this.body = MeshBuilder.CreatePlane('bird-body', { width: 0.95, height: 0.95 }, this.scene)
      this.body.billboardMode = TransformNode.BILLBOARDMODE_ALL
      this.body.scaling.set(1, 1, 1)
    } else if (shape === 'cube') {
      this.body = MeshBuilder.CreateBox('bird-body', { size: 0.58 }, this.scene)
      this.body.scaling.set(1, 1, 1)
    } else if (shape === 'pyramid') {
      this.body = MeshBuilder.CreateCylinder(
        'bird-body',
        { height: 0.74, diameterTop: 0, diameterBottom: 0.7, tessellation: 4 },
        this.scene,
      )
      this.body.scaling.set(1, 1, 1)
    } else {
      this.body = MeshBuilder.CreateSphere('bird-body', { diameter: 0.7, segments: 16 }, this.scene)
      this.body.scaling.set(1, 0.65, 0.8)
    }
    this.body.parent = this.root
  }

  /** Build (or refresh) the emoji/image skin material on a flat body. */
  private paintSkin(draw: (ctx: CanvasRenderingContext2D, size: number) => void): void {
    this.disposeSkin()
    const size = 256
    const tex = new DynamicTexture('bird-skin', { width: size, height: size }, this.scene, false)
    tex.hasAlpha = true
    const ctx = tex.getContext() as unknown as CanvasRenderingContext2D
    ctx.clearRect(0, 0, size, size)
    draw(ctx, size)
    tex.update()
    const mat = new StandardMaterial('bird-skin', this.scene)
    mat.diffuseTexture = tex
    mat.diffuseTexture.hasAlpha = true
    mat.useAlphaFromDiffuseTexture = true
    mat.emissiveColor = new Color3(1, 1, 1)
    mat.disableLighting = true
    mat.backFaceCulling = false
    this.skinTexture = tex
    this.skinMaterial = mat
    this.body.material = mat
  }

  private disposeSkin(): void {
    this.skinTexture?.dispose()
    this.skinMaterial?.dispose()
    this.skinTexture = null
    this.skinMaterial = null
  }

  private setAccentsVisible(on: boolean): void {
    this.leftWing.setEnabled(on)
    this.rightWing.setEnabled(on)
    this.leftEye.setEnabled(on)
    this.rightEye.setEnabled(on)
    this.beak.setEnabled(on)
    this.tail.setEnabled(on)
  }

  /** Set body opacity (used for the invincibility blink). */
  setAlpha(a: number): void {
    const mat = this.body.material
    if (mat) mat.alpha = a
  }

  // Flap trail — snapshot current bird position into the next ghost slot.
  snapshotGhost(): void {
    const idx = this.ghostHead % GHOST_COUNT
    const ghost = this.ghosts[idx]
    if (!ghost) return
    ghost.position.copyFrom(this.root.position)
    const mat = ghost.material as StandardMaterial
    mat.alpha = GHOST_OPACITIES[idx] ?? 0.2
    ghost.isVisible = true
    this.ghostHead = (this.ghostHead + 1) % GHOST_COUNT
  }

  stepGhosts(dt: number): void {
    for (const ghost of this.ghosts) {
      if (!ghost.isVisible) continue
      const mat = ghost.material as StandardMaterial
      mat.alpha -= GHOST_FADE_SPEED * dt
      if (mat.alpha <= 0) {
        mat.alpha = 0
        ghost.isVisible = false
      }
    }
  }

  resetGhosts(): void {
    this.ghostHead = 0
    for (const ghost of this.ghosts) {
      ghost.isVisible = false
      ;(ghost.material as StandardMaterial).alpha = 0
    }
  }

  syncMesh(): void {
    this.root.position.copyFrom(this.position)
  }

  /** Snapshot the logical position as the "previous" frame anchor. */
  snapshotPosition(): void {
    this.prevPosition.copyFrom(this.position)
  }

  /** Lerp root.position from prevPosition → position by alpha ∈ [0,1). */
  interpolate(alpha: number): void {
    Vector3.LerpToRef(this.prevPosition, this.position, alpha, this.root.position)
  }

  dispose(): void {
    this.disposeSkin()
    this.root.dispose(false, true)
    for (const g of this.ghosts) {
      g.material?.dispose()
      g.dispose()
    }
  }
}
