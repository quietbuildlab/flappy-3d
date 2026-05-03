import { Group, Mesh, BoxGeometry, Material, MeshToonMaterial, Box3, Scene } from 'three'
import { PIPE_WIDTH, PIPE_DEPTH } from '../constants'

const PIPE_HEIGHT = 6
// Pipe cap (rim) — slightly wider than the body, thin slab at the gap end
const CAP_HEIGHT = 0.25
const CAP_WIDEN = 0.20
// Rim band — thin slab just inside the cap, narrower than cap but wider
// than the body; reads as a depth band that catches the toon shading.
const RIM_HEIGHT = 0.08
const RIM_WIDEN = 0.10
// Small per-pair Y rotation (capped tight so AABB collision stays accurate
// — rotated AABBs grow by ~0.5% at 3°, gameplay-imperceptible).
const PIPE_YROT_MAX = 0.06  // ≈ 3.5°

export class ObstaclePair {
  readonly group: Group
  private topMesh: Mesh<BoxGeometry, MeshToonMaterial>
  private bottomMesh: Mesh<BoxGeometry, MeshToonMaterial>
  private topCap: Mesh<BoxGeometry, MeshToonMaterial>
  private bottomCap: Mesh<BoxGeometry, MeshToonMaterial>
  private topRim: Mesh<BoxGeometry, MeshToonMaterial>
  private bottomRim: Mesh<BoxGeometry, MeshToonMaterial>
  private topBox: Box3 = new Box3()
  private bottomBox: Box3 = new Box3()
  private readonly pairMaterial: MeshToonMaterial
  passed = false

  constructor(geometry: BoxGeometry, material: Material, scene: Scene) {
    this.group = new Group()
    this.pairMaterial = (material as MeshToonMaterial).clone()
    this.topMesh = new Mesh(geometry, this.pairMaterial)
    this.bottomMesh = new Mesh(geometry, this.pairMaterial)
    this.group.add(this.topMesh)
    this.group.add(this.bottomMesh)
    // Caps — wide slab at the gap-facing end, classic Flappy silhouette
    const capGeo = new BoxGeometry(PIPE_WIDTH + 2 * CAP_WIDEN, CAP_HEIGHT, PIPE_DEPTH + 2 * CAP_WIDEN)
    this.topCap = new Mesh(capGeo, this.pairMaterial)
    this.bottomCap = new Mesh(capGeo, this.pairMaterial)
    this.group.add(this.topCap)
    this.group.add(this.bottomCap)
    // Rim bands — thinner slab just inside the cap, gives a 2-step bevel
    const rimGeo = new BoxGeometry(PIPE_WIDTH + 2 * RIM_WIDEN, RIM_HEIGHT, PIPE_DEPTH + 2 * RIM_WIDEN)
    this.topRim = new Mesh(rimGeo, this.pairMaterial)
    this.bottomRim = new Mesh(rimGeo, this.pairMaterial)
    this.group.add(this.topRim)
    this.group.add(this.bottomRim)
    this.group.visible = false
    scene.add(this.group)
  }

  setColor(colorHex: number): void {
    this.pairMaterial.color.set(colorHex)
  }

  reset(x: number, gapCenterY: number, gapHeight: number): void {
    this.passed = false
    this.group.visible = true
    this.group.position.x = x
    // Subtle, deterministic Y-rotation per pair so depth reads. Using
    // sin(x) keeps it stable across re-spawns of the same x bucket.
    this.group.rotation.y = Math.sin(x * 1.7) * PIPE_YROT_MAX

    this.topMesh.position.y = gapCenterY + gapHeight / 2 + PIPE_HEIGHT / 2
    this.bottomMesh.position.y = gapCenterY - gapHeight / 2 - PIPE_HEIGHT / 2
    // Caps + rim bands at the gap-facing end of each pipe
    this.topCap.position.y = gapCenterY + gapHeight / 2 + CAP_HEIGHT / 2
    this.bottomCap.position.y = gapCenterY - gapHeight / 2 - CAP_HEIGHT / 2
    this.topRim.position.y = gapCenterY + gapHeight / 2 + CAP_HEIGHT + RIM_HEIGHT / 2
    this.bottomRim.position.y = gapCenterY - gapHeight / 2 - CAP_HEIGHT - RIM_HEIGHT / 2
  }

  getAABBs(): [Box3, Box3] {
    this.topBox.setFromObject(this.topMesh)
    this.bottomBox.setFromObject(this.bottomMesh)
    return [this.topBox, this.bottomBox]
  }

  hide(): void {
    this.group.visible = false
  }
}
