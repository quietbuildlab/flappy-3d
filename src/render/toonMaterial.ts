import { Color3 } from '@babylonjs/core/Maths/math.color'
import { FresnelParameters } from '@babylonjs/core/Materials/fresnelParameters'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import type { Scene } from '@babylonjs/core/scene'

/** Convert a numeric hex color (0xrrggbb) to a Babylon Color3. */
export function hexColor3(hex: number): Color3 {
  return new Color3(
    ((hex >> 16) & 0xff) / 255,
    ((hex >> 8) & 0xff) / 255,
    (hex & 0xff) / 255,
  )
}

/**
 * Adds a rim-light contribution to a StandardMaterial via emissive Fresnel.
 * Babylon's emissiveFresnelParameters brighten silhouette edges facing away
 * from the camera — the same read as the old onBeforeCompile rim shader.
 */
export function addRimLight(material: StandardMaterial, rimStrength = 0.4): void {
  const fresnel = new FresnelParameters()
  fresnel.isEnabled = true
  fresnel.leftColor = new Color3(rimStrength, rimStrength, rimStrength) // edge
  fresnel.rightColor = Color3.Black()                                   // facing camera
  fresnel.bias = 0.2
  fresnel.power = 2
  material.emissiveFresnelParameters = fresnel
}

/**
 * Stylized lit material: flat-ish toon read via black specular + a small
 * emissive lift so colors stay vivid in shadow.
 */
export function createToonMaterial(scene: Scene, colorHex: number): StandardMaterial {
  const mat = new StandardMaterial(`toon-${colorHex.toString(16)}`, scene)
  const c = hexColor3(colorHex)
  mat.diffuseColor = c
  mat.specularColor = Color3.Black()
  mat.emissiveColor = c.scale(0.18)
  return mat
}

// Colorblind-safe palette (deuteranopia/protanopia, per D-13)
const COLORBLIND_BIRD_COLOR = 0xffd166 // high-luminance yellow
export const COLORBLIND_PIPE_COLOR = 0x118ab2 // teal-blue (high contrast vs sky)
const DEFAULT_BIRD_COLOR = 0xff7043    // orange
const DEFAULT_PIPE_COLOR = 0x4caf50    // green

function repaint(mat: StandardMaterial, hex: number): void {
  const c = hexColor3(hex)
  mat.diffuseColor = c
  mat.emissiveColor = c.scale(0.18)
}

export function applyColorblindPalette(
  birdMaterial: StandardMaterial,
  pipeMaterial: StandardMaterial,
): void {
  repaint(birdMaterial, COLORBLIND_BIRD_COLOR)
  repaint(pipeMaterial, COLORBLIND_PIPE_COLOR)
}

export function applyDefaultPalette(
  birdMaterial: StandardMaterial,
  pipeMaterial: StandardMaterial,
): void {
  repaint(birdMaterial, DEFAULT_BIRD_COLOR)
  repaint(pipeMaterial, DEFAULT_PIPE_COLOR)
}
