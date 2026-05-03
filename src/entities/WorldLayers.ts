import {
  Group,
  Mesh,
  PlaneGeometry,
  SphereGeometry,
  CylinderGeometry,
  MeshToonMaterial,
  Scene,
  DoubleSide,
} from 'three'

const GRASS_COLOR     = 0x3a7a3a
const GRASS_DARK      = 0x2d5e2d
const SHRUB_COLOR     = 0x4a8a4a
const SHRUB_DARK      = 0x3a6f3a
const FLOWER_COLOR_A  = 0xffc857
const FLOWER_COLOR_B  = 0xee6b8c

/** WorldLayers — adds foreground (close, fast parallax) + midground (mid-Z,
 * slower parallax) depth bands beyond what Background.ts ships (which is the
 * far backdrop: sky shader, mountains, trees).
 *
 * Foreground band sits at z = +1.5 so it's rendered IN FRONT of the
 * gameplay lane (z = 0). Positioned low (y = -3.2) so it only occupies the
 * bottom of the viewport, never covering the bird or pipes.
 *
 * Midground at z = -1.5 — between the gameplay lane and Background.ts's
 * trees (z = -4). Reads as a "second hedge" closer than the trees. */
export class WorldLayers {
  private foreground: Group
  private midground: Group
  private balloon: Group       // depth-event prop (drifts behind play lane)
  private balloonState: { active: boolean; cooldown: number } = { active: false, cooldown: 4 }

  constructor(scene: Scene) {
    this.foreground = this.createForeground()
    this.midground = this.createMidground()
    this.balloon = this.createBalloon()
    scene.add(this.foreground)
    scene.add(this.midground)
    scene.add(this.balloon)
  }

  /** Called from the scroll-system loop. Foreground scrolls fastest
   * (closest to camera), midground slower. Depth-event balloon drifts left
   * across the background (z = -3.5) on its own slow timer, then waits 8-15s
   * before re-entering. */
  scroll(dt: number, obstacleScrollSpeed: number): void {
    this.foreground.position.x -= obstacleScrollSpeed * 0.85 * dt
    this.midground.position.x -= obstacleScrollSpeed * 0.45 * dt
    if (this.foreground.position.x < -16) this.foreground.position.x += 16
    if (this.midground.position.x < -18) this.midground.position.x += 18

    // Depth event — balloon. Cooldown when off-screen.
    if (this.balloonState.active) {
      this.balloon.position.x -= 1.4 * dt  // independent drift speed; not tied to gameplay scroll
      this.balloon.position.y += Math.sin(this.balloon.position.x * 0.4) * 0.003  // tiny float wobble
      if (this.balloon.position.x < -10) {
        this.balloonState.active = false
        this.balloon.visible = false
        this.balloonState.cooldown = 8 + Math.random() * 7  // 8-15s gap
      }
    } else {
      this.balloonState.cooldown -= dt
      if (this.balloonState.cooldown <= 0) {
        this.balloonState.active = true
        this.balloon.visible = true
        this.balloon.position.set(10, 0.5 + Math.random() * 2.5, -3.5)
      }
    }
  }

  private createForeground(): Group {
    const group = new Group()

    // Grass band — long thin plane spanning the bottom of the viewport
    const bandGeo = new PlaneGeometry(40, 1.2)
    const bandMat = new MeshToonMaterial({ color: GRASS_COLOR, side: DoubleSide })
    const band = new Mesh(bandGeo, bandMat)
    band.position.set(0, -3.4, 1.5)
    group.add(band)

    // Darker grass tufts on top — small triangle-ish shapes via thin cylinders
    const tuftGeo = new CylinderGeometry(0, 0.10, 0.3, 4)
    const tuftMat = new MeshToonMaterial({ color: GRASS_DARK })
    for (let i = 0; i < 14; i++) {
      const tuft = new Mesh(tuftGeo, tuftMat)
      tuft.position.set(-15 + i * 2.2, -2.85, 1.5 + (i % 2 === 0 ? 0.05 : -0.05))
      group.add(tuft)
    }

    // A few wildflowers — tiny spheres in 2 colors, peeking up from the grass
    const flowerGeo = new SphereGeometry(0.07, 8, 6)
    const flowerMatA = new MeshToonMaterial({ color: FLOWER_COLOR_A })
    const flowerMatB = new MeshToonMaterial({ color: FLOWER_COLOR_B })
    for (let i = 0; i < 7; i++) {
      const f = new Mesh(flowerGeo, i % 2 === 0 ? flowerMatA : flowerMatB)
      f.position.set(-13 + i * 4.1, -2.78, 1.55)
      group.add(f)
    }

    return group
  }

  private createBalloon(): Group {
    const group = new Group()
    // Round body — flattened sphere reads as a balloon
    const balloonGeo = new SphereGeometry(0.35, 16, 12)
    const balloonMat = new MeshToonMaterial({ color: 0xee6b8c })  // pink
    const body = new Mesh(balloonGeo, balloonMat)
    body.scale.set(0.85, 1.0, 0.85)
    group.add(body)
    // String — thin tall cylinder under the balloon
    const stringGeo = new CylinderGeometry(0.012, 0.012, 0.6, 4)
    const stringMat = new MeshToonMaterial({ color: 0x222222 })
    const str = new Mesh(stringGeo, stringMat)
    str.position.y = -0.5
    group.add(str)

    group.visible = false
    group.position.set(10, 1, -3.5)
    return group
  }

  private createMidground(): Group {
    const group = new Group()

    // Shrub clusters — group of 3-4 spheres at slightly different sizes, like
    // a low hedge bush. Spaced so a few are visible at any time.
    const shrubGeo = new SphereGeometry(0.35, 10, 8)
    const shrubMat = new MeshToonMaterial({ color: SHRUB_COLOR })
    const shrubMatDark = new MeshToonMaterial({ color: SHRUB_DARK })
    const shrubXs = [-13, -8.5, -4, 0.5, 5, 9, 13.5]
    for (const x of shrubXs) {
      const cluster = new Group()
      // 3-sphere cluster
      const a = new Mesh(shrubGeo, shrubMat)
      a.position.set(0, 0, 0)
      a.scale.setScalar(1.0)
      const b = new Mesh(shrubGeo, shrubMatDark)
      b.position.set(0.32, -0.05, 0.10)
      b.scale.setScalar(0.78)
      const c = new Mesh(shrubGeo, shrubMat)
      c.position.set(-0.30, -0.04, -0.05)
      c.scale.setScalar(0.85)
      cluster.add(a, b, c)
      cluster.position.set(x, -3.05, -1.5)
      group.add(cluster)
    }

    return group
  }
}
