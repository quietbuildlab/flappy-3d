import { gsap } from 'gsap'
import type { Object3D, PerspectiveCamera } from 'three'
import type { Bird } from '../entities/Bird'

// Squash-and-stretch on flap (D-23 / ANIM-02)
export function squashStretch(target: Object3D): void {
  gsap.to(target.scale, {
    x: 1.15, y: 1.4, z: 1.15,
    duration: 0.04,
    ease: 'power2.out',
    yoyo: true,
    repeat: 1,
    overwrite: true,
  })
}

// Screen shake on death (D-24 / ANIM-04)
export function screenShake(camera: Object3D, baseX = 0, baseY = 0): void {
  const tl = gsap.timeline({
    onComplete: () => camera.position.set(baseX, baseY, camera.position.z),
  })
  // 5 keyframes x ~50ms = ~250ms total, decaying amplitude
  const offsets = [
    { x: 0.30, y: 0.20, dur: 0.05 },
    { x: -0.55, y: -0.35, dur: 0.05 },
    { x: 0.40, y: 0.25, dur: 0.05 },
    { x: -0.20, y: -0.15, dur: 0.05 },
    { x: 0.00, y: 0.00, dur: 0.05 },
  ]
  for (const o of offsets) {
    tl.to(camera.position, { x: baseX + o.x, y: baseY + o.y, duration: o.dur, ease: 'power1.inOut' })
  }
}

// Score pop CSS class trigger (D-25 / ANIM-03)
export function scorePop(el: HTMLElement | null): void {
  if (!el) return
  el.classList.remove('score-pop')
  // force reflow
  void el.offsetWidth
  el.classList.add('score-pop')
}

// Tiny FOV pulse on milestone scores (Diorama Pass v1.7).
// Quick zoom-out then back, ~400ms, capped at +6° so it reads as "wow"
// without inducing motion sickness. Caller must already have ruled out
// reduced-motion. Idempotent if a pulse is already running (overwrite).
export function pulseFOV(camera: PerspectiveCamera, baseFov = 50, peakFov = 56): void {
  const update = () => camera.updateProjectionMatrix()
  gsap.timeline({ overwrite: true })
    .to(camera, { fov: peakFov, duration: 0.18, ease: 'power2.out', onUpdate: update })
    .to(camera, { fov: baseFov, duration: 0.22, ease: 'power2.in', onUpdate: update })
}

// Wing flap animation on each jump (POLISH-02 / D-08)
// Left wing rotates +z, right wing mirrors to -z; both return to 0.
export function wingFlap(bird: Bird): void {
  const tl = gsap.timeline()
  tl.to(bird.leftWing.rotation, { z: 0.6, duration: 0.04, ease: 'power2.out', overwrite: true })
    .to(bird.rightWing.rotation, { z: -0.6, duration: 0.04, ease: 'power2.out', overwrite: true }, '<')
    .to(bird.leftWing.rotation, { z: 0, duration: 0.06, ease: 'power2.in' })
    .to(bird.rightWing.rotation, { z: 0, duration: 0.06, ease: 'power2.in' }, '<')
}
