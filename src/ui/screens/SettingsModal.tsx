import { h } from 'preact'
import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import type { StorageManager, SettingsV5, BirdShape } from '../../storage/StorageManager'
import type { AudioManager } from '../../audio/AudioManager'
import type { DifficultyPreset } from '../../constants'
import { SHAPE_UNLOCK_THRESHOLDS } from '../../constants'
import type { QualityTier } from '../../render/createPipeline'
import type { CameraView } from '../../render/cameraViews'
import { CAMERA_VIEW_ORDER, CAMERA_VIEW_LABELS } from '../../render/cameraViews'
import { Button } from '../components/Button'
import { Toggle } from '../components/Toggle'
import { refreshReducedMotion } from '../../a11y/motion'

const MAX_IMAGE_BYTES = 1_500_000  // ~1.5 MB after base64 — fits in localStorage

interface Props {
  storage: StorageManager
  audio: AudioManager
  onClose: () => void
  onPaletteChange: (palette: 'default' | 'colorblind') => void
  onShapeChange: (shape: BirdShape) => void
  onImageChange: (image: string | null) => void
  onCameraChange: (view: CameraView) => void
}

function Section({ title, children }: { title: string; children?: ComponentChildren }) {
  return h(
    'div',
    { className: 'settings-section' },
    h('div', { className: 'settings-section-title' }, title),
    children,
  )
}

export function SettingsModal({
  storage, audio, onClose, onPaletteChange, onShapeChange, onImageChange, onCameraChange,
}: Props) {
  const [settings, setSettings] = useState<SettingsV5>(() => storage.getSettings())
  const [imageError, setImageError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const el = dialogRef.current
    if (el && !el.open) el.showModal()

    const handleCancel = (e: Event) => {
      e.preventDefault()
      onClose()
    }
    el?.addEventListener('cancel', handleCancel)
    return () => {
      el?.removeEventListener('cancel', handleCancel)
      if (el?.open) el.close()
    }
  }, [])

  function update(partial: Partial<SettingsV5>) {
    const next = { ...settings, ...partial }
    setSettings(next)
    storage.setSettings(partial)

    if (partial.sound !== undefined) audio.setSfxMuted(!partial.sound)
    if (partial.music !== undefined) audio.setMusicMuted(!partial.music)
    if (partial.reduceMotion !== undefined) refreshReducedMotion(storage)
    if (partial.palette !== undefined) onPaletteChange(partial.palette)
    if (partial.birdShape !== undefined) onShapeChange(partial.birdShape)
    if (partial.birdImage !== undefined) onImageChange(partial.birdImage)
    if (partial.cameraView !== undefined) onCameraChange(partial.cameraView)
    // Phase 20 v1.8: live-apply sub-bus volumes
    if (partial.volumeMaster !== undefined) audio.setVolumeMaster(partial.volumeMaster)
    if (partial.volumeMusic !== undefined) audio.setVolumeMusic(partial.volumeMusic)
    if (partial.volumeSfx !== undefined) audio.setVolumeSfx(partial.volumeSfx)
  }

  const reduceMotionOn =
    settings.reduceMotion === 'on' ||
    (settings.reduceMotion === 'auto' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  async function handleFile(e: Event) {
    setImageError(null)
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setImageError('Please pick an image file.')
      target.value = ''
      return
    }
    try {
      const bitmap = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 256
      const ctx = canvas.getContext('2d')
      if (ctx === null) {
        setImageError("Couldn't read the image. Try another file.")
        return
      }
      const ratio = Math.max(canvas.width / bitmap.width, canvas.height / bitmap.height)
      const w = bitmap.width * ratio
      const hh = bitmap.height * ratio
      ctx.drawImage(bitmap, (canvas.width - w) / 2, (canvas.height - hh) / 2, w, hh)
      bitmap.close()
      const resized = canvas.toDataURL('image/png')
      if (resized.length > MAX_IMAGE_BYTES) {
        setImageError('Image is too large after resize — pick something simpler.')
        return
      }
      update({ birdImage: resized })
    } catch {
      setImageError("Couldn't decode the image. Try another file.")
    } finally {
      target.value = ''
    }
  }

  function clearImage() {
    setImageError(null)
    update({ birdImage: null })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Phase 20 AUDIO-07: render a labelled 0..1 slider row for a sub-bus volume.
  const renderVolumeRow = (label: string, value: number, onChange: (v: number) => void) =>
    h('div', { className: 'settings-row settings-volumerow' },
      h('span', { className: 'settings-row-label' }, label),
      h('input', {
        type: 'range',
        min: 0,
        max: 1,
        step: 0.05,
        value: value,
        'aria-label': label,
        onInput: (e: Event) => onChange(parseFloat((e.target as HTMLInputElement).value)),
        className: 'settings-volume-slider',
      }),
      h('span', { className: 'settings-volume-value' }, `${Math.round(value * 100)}%`),
    )

  const pickerButton = <T extends string>(
    current: T, id: T, label: string, onPick: (id: T) => void, ariaLabel?: string,
  ) =>
    h(Button, {
      key: id,
      className: 'mode-btn' + (current === id ? ' active' : ''),
      'aria-pressed': current === id,
      'aria-label': ariaLabel ?? id,
      onClick: () => onPick(id),
    }, label)

  return h(
    'dialog',
    { ref: dialogRef, className: 'settings-modal' },
    h(
      'div',
      { className: 'settings-header' },
      h('h2', { className: 'settings-title' }, 'Settings'),
      h(Button, { className: 'settings-close-btn', onClick: onClose, 'aria-label': 'Close settings' }, '✕'),
    ),
    h(
      'div',
      { className: 'settings-rows' },

      // ── Audio ──────────────────────────────────────────
      h(Section, { title: '🔊 Audio' },
        h(Toggle, {
          label: '🔊 Sound',
          checked: settings.sound,
          onChange: (v) => update({ sound: v }),
          tip: 'Flap, score, and death sound effects. iOS silent switch overrides this system-wide.',
        }),
        h(Toggle, {
          label: '🎵 Music',
          checked: settings.music,
          onChange: (v) => update({ music: v }),
          tip: 'Background music. Plays softer on the title screen.',
        }),
        // Phase 20 AUDIO-07: 3 sub-bus volume sliders
        renderVolumeRow('🔊 Master', settings.volumeMaster, (v) => update({ volumeMaster: v })),
        renderVolumeRow('🎵 Music vol', settings.volumeMusic, (v) => update({ volumeMusic: v })),
        renderVolumeRow('💥 SFX vol', settings.volumeSfx, (v) => update({ volumeSfx: v })),
      ),

      // ── Accessibility ──────────────────────────────────
      h(Section, { title: '♿ Accessibility' },
        h(Toggle, {
          label: '🌀 Reduce Motion',
          checked: reduceMotionOn,
          onChange: (v) => update({ reduceMotion: v ? 'on' : 'off' }),
          tip: 'Disables screen shake, particles, sky cycle, camera bob, and bird wing-flap animation.',
        }),
        h(Toggle, {
          label: '🎨 Colorblind Palette',
          checked: settings.palette === 'colorblind',
          onChange: (v) => update({ palette: v ? 'colorblind' : 'default' }),
          tip: 'Switches the bird and pipes to a deuteranopia-safe palette.',
        }),
      ),

      // ── Visual polish ──────────────────────────────────
      h(Section, { title: '✨ Visual' },
        h(Toggle, {
          label: '👻 Flap trail',
          checked: settings.flapTrail ?? false,
          onChange: (v) => update({ flapTrail: v }),
          tip: 'Adds ghost echoes after each flap. May reduce performance on older devices.',
        }),
        h(Toggle, {
          label: '🎥 Camera bob',
          checked: settings.cameraBob ?? false,
          onChange: (v) => update({ cameraBob: v }),
          tip: 'Subtle camera tilt following the bird. Off by default — may cause motion discomfort. Disabled when Reduce Motion is on.',
        }),
        h('div', {
          className: 'settings-row settings-pickerrow',
          title: 'Auto picks Low/Medium/High based on your device. Reload required for changes to apply.',
        },
          h('span', { className: 'settings-row-label' }, '⚙️ Quality'),
          h('div', { className: 'settings-picker', role: 'group', 'aria-label': 'Render quality' },
            (['auto', 'low', 'medium', 'high'] as const).map((q) =>
              pickerButton(settings.quality, q as QualityTier, q.charAt(0).toUpperCase() + q.slice(1), (id) => update({ quality: id })),
            ),
          ),
        ),
        h('div', {
          className: 'settings-row settings-pickerrow',
          title: 'Camera angle: Chase (behind the bird), Side (classic side-on), or Far (wide cinematic). Press C in-game to cycle.',
        },
          h('span', { className: 'settings-row-label' }, '🎥 Camera'),
          h('div', { className: 'settings-picker', role: 'group', 'aria-label': 'Camera view' },
            CAMERA_VIEW_ORDER.map((v) =>
              pickerButton(settings.cameraView, v, CAMERA_VIEW_LABELS[v], (id) => update({ cameraView: id })),
            ),
          ),
        ),
      ),

      // ── Gameplay ───────────────────────────────────────
      h(Section, { title: '🎮 Gameplay' },
        h('div', {
          className: 'settings-row settings-pickerrow',
          title: 'Easy = wider gaps + slower scroll + gentler gravity. Default for new players. Hard scales the other way.',
        },
          h('span', { className: 'settings-row-label' }, '🎯 Difficulty'),
          h('div', { className: 'settings-picker', role: 'group', 'aria-label': 'Difficulty preset' },
            (['easy', 'normal', 'hard'] as const).map((d) =>
              pickerButton(settings.difficulty, d as DifficultyPreset, d.charAt(0).toUpperCase() + d.slice(1), (id) => update({ difficulty: id })),
            ),
          ),
        ),
      ),

      // ── Bird customization ─────────────────────────────
      h(Section, { title: '🐦 Bird' },
        settings.birdImage === null ? h('div', {
          className: 'settings-row settings-pickerrow',
          title: 'Pick a body shape or an animal emoji. Wings hide for emoji.',
        },
          h('span', { className: 'settings-row-label' }, 'Shape'),
          h('div', { className: 'settings-picker settings-picker-shapes', role: 'group', 'aria-label': 'Bird shape' },
            (
              [
                { id: 'sphere',  label: 'Sphere'  },
                { id: 'cube',    label: 'Cube'    },
                { id: 'pyramid', label: 'Pyramid' },
                { id: 'bird',    label: '🐦'      },
                { id: 'cat',     label: '🐱'      },
                { id: 'dog',     label: '🐶'      },
                { id: 'frog',    label: '🐸'      },
                { id: 'unicorn', label: '🦄'      },
                { id: 'penguin', label: '🐧'      },
              ] as const
            ).map(({ id, label }) => {
              const unlocked = settings.unlocks.includes(id as BirdShape)
              const threshold = SHAPE_UNLOCK_THRESHOLDS[id] ?? 0
              if (unlocked) {
                return pickerButton(settings.birdShape, id as BirdShape, label, (i) => update({ birdShape: i }))
              }
              // Locked button — greyed, non-clickable, tooltip explains threshold.
              return h('button', {
                key: id,
                type: 'button',
                className: 'mode-btn locked',
                'aria-disabled': true,
                'aria-label': `${id} — locked, unlock at score ${threshold}`,
                title: `🔒 Unlock at score ${threshold}`,
                onClick: (e: MouseEvent) => e.preventDefault(),
              }, label)
            }),
          ),
        ) : null,
        h('div', {
          className: 'settings-row settings-imagerow',
          title: 'Upload your favourite picture to use as the bird. Resized to 256×256 and saved locally.',
        },
          h('span', { className: 'settings-row-label' }, '🖼️ Image'),
          h('div', { className: 'settings-imageactions' },
            h('input', {
              ref: fileInputRef,
              type: 'file',
              accept: 'image/*',
              'aria-label': 'Upload bird image',
              onChange: handleFile,
              className: 'settings-fileinput',
            }),
            settings.birdImage !== null
              ? h(Button, { onClick: clearImage, className: 'settings-clearimage' }, 'Clear')
              : null,
          ),
        ),
        imageError !== null
          ? h('p', { className: 'settings-note settings-error' }, imageError)
          : null,
      ),
    ),
  )
}
