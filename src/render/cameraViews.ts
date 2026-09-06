import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { FreeCamera } from '@babylonjs/core/Cameras/freeCamera'
import { Camera } from '@babylonjs/core/Cameras/camera'

/** Selectable camera framings for the true-3D corridor. */
export type CameraView = 'chase' | 'side' | 'far'

export interface CameraConfig {
  /** Resting camera position; `y` is the height the follow-spring rests at. */
  pos: { x: number; y: number; z: number }
  /** Look-at point — sets the camera's (fixed) rotation. */
  target: { x: number; y: number; z: number }
  /** How strongly the camera height tracks the bird's y (0 = static). */
  followFactor: number
  /** Vertical field of view, radians. */
  fov: number
}

export const CAMERA_VIEWS: Record<CameraView, CameraConfig> = {
  // Behind + slightly above the bird, looking down the corridor.
  chase: { pos: { x: 0, y: 1.6, z: -7 }, target: { x: 0, y: 0, z: 6 }, followFactor: 0.3, fov: 0.85 },
  // Classic side-on Flappy framing: camera off the +X side looking across,
  // pipes move right to left, with the bird left of centre and a fixed horizon.
  side: { pos: { x: 12, y: 0, z: 2 }, target: { x: 0, y: 0, z: 2 }, followFactor: 0, fov: 0.92 },
  // Pulled back and higher — a wide cinematic shot; tracks the bird gently.
  far: { pos: { x: 0, y: 4.5, z: -14 }, target: { x: 0, y: 0.4, z: 5 }, followFactor: 0.16, fov: 0.98 },
}

export const CAMERA_VIEW_ORDER: readonly CameraView[] = ['chase', 'side', 'far']

export const CAMERA_VIEW_LABELS: Record<CameraView, string> = {
  chase: 'Chase',
  side: 'Side',
  far: 'Far',
}

/** Snap the camera fully to a view preset (position, aim, fov). */
export function applyCameraView(camera: FreeCamera, view: CameraView): void {
  const cfg = CAMERA_VIEWS[view]
  camera.position.set(cfg.pos.x, cfg.pos.y, cfg.pos.z)
  camera.setTarget(new Vector3(cfg.target.x, cfg.target.y, cfg.target.z))
  camera.fov = cfg.fov
  camera.mode = view === 'side' ? Camera.ORTHOGRAPHIC_CAMERA : Camera.PERSPECTIVE_CAMERA
  resizeSideCamera(camera)
}

/** Keep bird and pipe edges on one scale, with the bird at 32.5% width. */
export function resizeSideCamera(camera: FreeCamera): void {
  if (camera.mode !== Camera.ORTHOGRAPHIC_CAMERA) return
  const engine = camera.getEngine()
  const halfHeight = 5.2
  const halfWidth = halfHeight * engine.getRenderWidth() / engine.getRenderHeight()
  camera.orthoTop = halfHeight
  camera.orthoBottom = -halfHeight
  camera.orthoLeft = -halfWidth
  camera.orthoRight = halfWidth
  camera.position.z = halfWidth * 0.35
  camera.setTarget(new Vector3(0, 0, camera.position.z))
}
