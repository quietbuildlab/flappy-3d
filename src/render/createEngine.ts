import { Engine } from '@babylonjs/core/Engines/engine'
import { Scene } from '@babylonjs/core/scene'
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera'
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight'
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color'
import { CAMERA_BASE_Y, CAMERA_OFFSET_Z, CAMERA_FOV } from '../constants'

export interface EngineBundle {
  engine: Engine
  scene: Scene
  camera: FreeCamera
  canvas: HTMLCanvasElement
}

/**
 * Boots the Babylon engine + scene + chase camera. The camera sits behind
 * and slightly above the bird, looking down the +Z corridor — obstacles
 * rush toward the player in depth.
 */
export function createEngine(canvas: HTMLCanvasElement): EngineBundle {
  canvas.style.touchAction = 'none'

  const engine = new Engine(canvas, true, { powerPreference: 'high-performance' }, false)
  try {
    // Cap effective DPR at 2 (lower hardware-scaling level = higher resolution).
    engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 2))

    const scene = new Scene(engine)
    scene.clearColor = new Color4(0.53, 0.81, 0.92, 1) // sky blue
    scene.ambientColor = new Color3(0.6, 0.65, 0.72)

    const camera = new FreeCamera('chase', new Vector3(0, CAMERA_BASE_Y, CAMERA_OFFSET_Z), scene)
    camera.fov = CAMERA_FOV
    camera.minZ = 0.1
    camera.maxZ = 200
    camera.setTarget(new Vector3(0, 0, 6))

    const keyLight = new DirectionalLight('key', new Vector3(-0.4, -0.7, 0.6), scene)
    keyLight.intensity = 1.6
    keyLight.diffuse = new Color3(1, 0.98, 0.92)

    const fillLight = new HemisphericLight('fill', new Vector3(0, 1, 0), scene)
    fillLight.intensity = 0.85
    fillLight.diffuse = new Color3(0.85, 0.92, 1)
    fillLight.groundColor = new Color3(0.35, 0.32, 0.3)

    return { engine, scene, camera, canvas }
  } catch (error) {
    engine.dispose()
    throw error
  }
}
