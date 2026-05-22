import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline'
// Side-effect: registers scene.postProcessRenderPipelineManager, which
// DefaultRenderingPipeline depends on but does not itself pull in.
import '@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderPipelineManagerSceneComponent'
import { Color4 } from '@babylonjs/core/Maths/math.color'
import type { Scene } from '@babylonjs/core/scene'
import type { Camera } from '@babylonjs/core/Cameras/camera'
import { BLOOM_WEIGHT, BLOOM_THRESHOLD, VIGNETTE_WEIGHT } from '../constants'

export type QualityTier = 'low' | 'medium' | 'high' | 'auto'

interface TierConfig {
  bloom: boolean
  bloomWeight: number
  fxaa: boolean
  vignette: boolean
}

const TIER_CONFIGS: Record<Exclude<QualityTier, 'auto'>, TierConfig> = {
  low:    { bloom: false, bloomWeight: 0,                  fxaa: false, vignette: false },
  medium: { bloom: true,  bloomWeight: BLOOM_WEIGHT * 0.7, fxaa: true,  vignette: false },
  high:   { bloom: true,  bloomWeight: BLOOM_WEIGHT,       fxaa: true,  vignette: true  },
}

/** Resolve 'auto' to a concrete tier based on device capability. */
export function resolveTier(t: QualityTier): Exclude<QualityTier, 'auto'> {
  if (t !== 'auto') return t
  const isMobile = /Mobile|Android/i.test(navigator.userAgent)
  const hc = navigator.hardwareConcurrency ?? 0
  if (hc >= 8 && !isMobile) return 'high'
  if (hc >= 4) return 'medium'
  return 'low'
}

/**
 * Attaches a DefaultRenderingPipeline (bloom + FXAA + vignette) to the camera.
 * Unlike the old Three EffectComposer this needs no separate render call —
 * scene.render() drives post-processing once the pipeline is attached.
 */
export function createPipeline(
  scene: Scene,
  camera: Camera,
  tier: QualityTier = 'auto',
): DefaultRenderingPipeline | null {
  const cfg = TIER_CONFIGS[resolveTier(tier)]
  if (!cfg.bloom && !cfg.fxaa && !cfg.vignette) return null

  const pipeline = new DefaultRenderingPipeline('default', true, scene, [camera])

  pipeline.bloomEnabled = cfg.bloom
  if (cfg.bloom) {
    pipeline.bloomWeight = cfg.bloomWeight
    pipeline.bloomThreshold = BLOOM_THRESHOLD
    pipeline.bloomKernel = 48
  }

  pipeline.fxaaEnabled = cfg.fxaa

  if (cfg.vignette) {
    const ip = pipeline.imageProcessing.imageProcessingConfiguration
    ip.vignetteEnabled = true
    ip.vignetteWeight = VIGNETTE_WEIGHT
    ip.vignetteColor = new Color4(0, 0, 0, 1)
  }

  return pipeline
}
