import { h, render } from 'preact'
import { useState, useEffect, useRef } from 'preact/hooks'
import type { Actor, SnapshotFrom } from 'xstate'
import type { gameMachine, GameMode } from '../machine/gameMachine'
import type { AudioManager } from '../audio/AudioManager'
import type { StorageManager, BirdShape } from '../storage/StorageManager'
import type { LeaderboardEntry } from '../storage/StorageManager'
import { todayDate } from '../utils/rng'
import { TitleScreen } from './screens/TitleScreen'
import { HUD } from './screens/HUD'
import { PauseScreen } from './screens/PauseScreen'
import { GameOverScreen } from './screens/GameOverScreen'
import { SettingsModal } from './screens/SettingsModal'
import { Vector3, Matrix } from '@babylonjs/core/Maths/math.vector'
import { Viewport } from '@babylonjs/core/Maths/math.viewport'
import type { Scene } from '@babylonjs/core/scene'
import type { CameraView } from '../render/cameraViews'
import type { TimerSystem } from '../systems/TimerSystem'

type GameActor = Actor<typeof gameMachine>
type Snap = SnapshotFrom<typeof gameMachine>

const POPUP_POOL_SIZE = 6

class ScorePopupPool {
  private pool: HTMLDivElement[] = []
  private container: HTMLElement

  constructor(container: HTMLElement) {
    this.container = container
    for (let i = 0; i < POPUP_POOL_SIZE; i++) {
      const div = document.createElement('div')
      div.className = 'score-popup'
      div.textContent = '+1'
      container.appendChild(div)
      this.pool.push(div)
    }
  }

  spawn(worldPos: { x: number; y: number; z: number }, scene: Scene): void {
    const div = this.pool.find((d) => !d.classList.contains('animating'))
    if (!div) return

    const rect = this.container.getBoundingClientRect()
    // Babylon world → screen projection. scene.getTransformMatrix() carries
    // the active camera's view×projection; passing the container's CSS size
    // as the viewport yields CSS-pixel coords directly.
    const screen = Vector3.Project(
      new Vector3(worldPos.x, worldPos.y, worldPos.z),
      Matrix.Identity(),
      scene.getTransformMatrix(),
      new Viewport(0, 0, rect.width, rect.height),
    )

    div.style.left = `${screen.x}px`
    div.style.top = `${screen.y}px`
    div.classList.add('animating')

    const onEnd = () => {
      div.classList.remove('animating')
      div.removeEventListener('animationend', onEnd)
    }
    div.addEventListener('animationend', onEnd)
  }
}

interface AppProps {
  standalone: boolean
  actor: GameActor
  audio: AudioManager
  storage: StorageManager
  onPaletteChange: (palette: 'default' | 'colorblind') => void
  onShapeChange: (shape: BirdShape) => void
  onImageChange: (image: string | null) => void
  onCameraChange: (view: CameraView) => void
  timerSystem: TimerSystem | null
}

export class UIBridge {
  private timers = new Set<ReturnType<typeof setTimeout>>()
  private frames = new Set<number>()
  private actor: GameActor
  private audio: AudioManager
  private storage: StorageManager
  private onPaletteChange: (palette: 'default' | 'colorblind') => void
  private onShapeChange: (shape: BirdShape) => void
  private onImageChange: (image: string | null) => void
  private onCameraChange: (view: CameraView) => void
  private mountEl: HTMLElement | null = null
  private popupPool: ScorePopupPool | null = null
  private milestoneFlash: HTMLDivElement | null = null
  private scene: Scene | null = null
  private timerSystem: TimerSystem | null = null

  constructor(
    actor: GameActor,
    audio: AudioManager,
    storage: StorageManager,
    onPaletteChange: (palette: 'default' | 'colorblind') => void,
    scene?: Scene,
    timerSystem?: TimerSystem,
    onShapeChange?: (shape: BirdShape) => void,
    onImageChange?: (image: string | null) => void,
    onCameraChange?: (view: CameraView) => void,
  ) {
    this.actor = actor
    this.audio = audio
    this.storage = storage
    this.onPaletteChange = onPaletteChange
    this.onShapeChange = onShapeChange ?? (() => {})
    this.onImageChange = onImageChange ?? (() => {})
    this.onCameraChange = onCameraChange ?? (() => {})
    this.scene = scene ?? null
    this.timerSystem = timerSystem ?? null
  }

  mount(element: HTMLElement, standalone: boolean): void {
    this.mountEl = element

    this.popupPool = new ScorePopupPool(this.mountEl)

    const flash = document.createElement('div')
    flash.className = 'milestone-flash'
    this.mountEl.appendChild(flash)
    this.milestoneFlash = flash

    render(
      h(App, {
        actor: this.actor,
        standalone,
        audio: this.audio,
        storage: this.storage,
        onPaletteChange: this.onPaletteChange,
        onShapeChange: this.onShapeChange,
        onImageChange: this.onImageChange,
        onCameraChange: this.onCameraChange,
        timerSystem: this.timerSystem,
      }),
      this.mountEl,
    )
  }

  spawnScorePopup(worldPos: { x: number; y: number; z: number }): void {
    if (!this.popupPool || !this.scene) return
    this.popupPool.spawn(worldPos, this.scene)
  }

  triggerMilestoneFlash(): void {
    const flash = this.milestoneFlash
    if (!flash) return
    flash.classList.add('active')
    this.later(() => flash.classList.remove('active'), 200)
  }

  /** Phase 18 PROG-03: show a "🔓 Unlocked: X" toast for ~3s. */
  showUnlockToast(label: string): void {
    if (!this.mountEl) return
    const toast = document.createElement('div')
    toast.className = 'unlock-toast'
    toast.textContent = `🔓 Unlocked: ${label}`
    this.mountEl.appendChild(toast)
    const frame = requestAnimationFrame(() => { this.frames.delete(frame); toast.classList.add('active') })
    this.frames.add(frame)
    this.later(() => {
      toast.classList.remove('active')
      this.later(() => toast.remove(), 250)
    }, 3000)
  }

  private later(callback: () => void, ms: number): void {
    const id = setTimeout(() => { this.timers.delete(id); callback() }, ms)
    this.timers.add(id)
  }

  dispose(): void {
    this.timers.forEach(clearTimeout)
    this.frames.forEach(cancelAnimationFrame)
    if (this.mountEl) {
      render(null, this.mountEl)
      this.mountEl.replaceChildren()
    }
    this.mountEl = null
    this.popupPool = null
    this.milestoneFlash = null
  }
}

function App(props: AppProps) {
  const [snap, setSnap] = useState<Snap>(props.actor.getSnapshot())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mode, setMode] = useState<GameMode>(() => props.storage.getLastMode())
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() =>
    props.storage.getLeaderboard(props.storage.getLastMode()),
  )
  const [priorBest, setPriorBest] = useState<number>(() => props.storage.getBestScore())
  const priorBestRef = useRef<number>(props.storage.getBestScore())
  const [showInstall, setShowInstall] = useState(false)

  useEffect(() => {
    let prevValue = props.actor.getSnapshot().value as string
    const sub = props.actor.subscribe((s) => {
      const nextValue = s.value as string
      if (nextValue === 'playing' && prevValue !== 'playing') {
        priorBestRef.current = props.storage.getBestScore()
      }
      if (nextValue === 'gameOver' && prevValue !== 'gameOver') {
        setPriorBest(priorBestRef.current)
        const mode = s.context.mode
        props.storage.pushLeaderboard(mode, { score: s.context.score, ts: Date.now() })
        if (mode === 'daily') {
          props.storage.recordDailyAttempt(todayDate(), s.context.score)
        }
        setLeaderboard(props.storage.getLeaderboard(mode))
      }
      prevValue = nextValue
      setSnap(s)
    })
    return () => sub.unsubscribe()
  }, [])

  useEffect(() => {
    if (!props.standalone) return
    const checkPrompt = () => setShowInstall(!!window.deferredInstallPrompt)
    window.addEventListener('beforeinstallprompt', checkPrompt)
    return () => window.removeEventListener('beforeinstallprompt', checkPrompt)
  }, [])

  function handleModeChange(newMode: GameMode): void {
    props.actor.send({ type: 'SET_MODE', mode: newMode })
    props.storage.setLastMode(newMode)
    setMode(newMode)
    setLeaderboard(props.storage.getLeaderboard(newMode))
    props.audio.setMusicTrack(newMode)
  }

  function handleInstall() {
    const prompt = window.deferredInstallPrompt
    if (!prompt) return
    void prompt.prompt()
    void prompt.userChoice.then(() => {
      window.deferredInstallPrompt = undefined
      setShowInstall(false)
    })
  }

  const value = snap.value as string

  return h(
    'div',
    null,
    h(TitleScreen, {
      active: value === 'title',
      actor: props.actor,
      leaderboard,
      onSettings: () => setSettingsOpen(true),
      onInstall: handleInstall,
      showInstall,
      mode,
      onModeChange: handleModeChange,
      storage: props.storage,
    }),
    h(HUD, {
      active: value === 'playing' || value === 'dying',
      actor: props.actor,
      score: snap.context.score,
      onPause: () => props.actor.send({ type: 'PAUSE' }),
      mode: snap.context.mode,
      timerSystem: props.timerSystem,
    }),
    h(PauseScreen, {
      active: value === 'paused',
      actor: props.actor,
    }),
    h(GameOverScreen, {
      active: value === 'gameOver',
      actor: props.actor,
      score: snap.context.score,
      priorBest,
      leaderboard,
      mode: snap.context.mode,
    }),
    settingsOpen
      ? h(SettingsModal, {
          storage: props.storage,
          audio: props.audio,
          onClose: () => setSettingsOpen(false),
          onPaletteChange: props.onPaletteChange,
          onShapeChange: props.onShapeChange,
          onImageChange: props.onImageChange,
          onCameraChange: props.onCameraChange,
        })
      : null,
  )
}
