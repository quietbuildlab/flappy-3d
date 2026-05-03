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
import { Vector3 } from 'three'
import type { Camera } from 'three'
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

  spawn(worldPos: { x: number; y: number; z: number }, camera: Camera): void {
    const div = this.pool.find((d) => !d.classList.contains('animating'))
    if (!div) return

    const vec = new Vector3(worldPos.x, worldPos.y, worldPos.z)
    vec.project(camera)
    const rect = this.container.getBoundingClientRect()
    const x = ((vec.x + 1) / 2) * rect.width
    const y = ((-vec.y + 1) / 2) * rect.height

    div.style.left = `${x}px`
    div.style.top = `${y}px`
    div.classList.add('animating')

    const onEnd = () => {
      div.classList.remove('animating')
      div.removeEventListener('animationend', onEnd)
    }
    div.addEventListener('animationend', onEnd)
  }
}

interface AppProps {
  actor: GameActor
  audio: AudioManager
  storage: StorageManager
  onPaletteChange: (palette: 'default' | 'colorblind') => void
  onShapeChange: (shape: BirdShape) => void
  onImageChange: (image: string | null) => void
  timerSystem: TimerSystem | null
}

export class UIBridge {
  private actor: GameActor
  private audio: AudioManager
  private storage: StorageManager
  private onPaletteChange: (palette: 'default' | 'colorblind') => void
  private onShapeChange: (shape: BirdShape) => void
  private onImageChange: (image: string | null) => void
  private mountEl: HTMLElement | null = null
  private popupPool: ScorePopupPool | null = null
  private milestoneFlash: HTMLDivElement | null = null
  private camera: Camera | null = null
  private timerSystem: TimerSystem | null = null

  constructor(
    actor: GameActor,
    audio: AudioManager,
    storage: StorageManager,
    onPaletteChange: (palette: 'default' | 'colorblind') => void,
    camera?: Camera,
    timerSystem?: TimerSystem,
    onShapeChange?: (shape: BirdShape) => void,
    onImageChange?: (image: string | null) => void,
  ) {
    this.actor = actor
    this.audio = audio
    this.storage = storage
    this.onPaletteChange = onPaletteChange
    this.onShapeChange = onShapeChange ?? (() => {})
    this.onImageChange = onImageChange ?? (() => {})
    this.camera = camera ?? null
    this.timerSystem = timerSystem ?? null
  }

  mount(): void {
    this.mountEl = document.getElementById('ui-root')
    if (!this.mountEl) throw new Error('#ui-root not found in DOM')

    this.popupPool = new ScorePopupPool(this.mountEl)

    const flash = document.createElement('div')
    flash.className = 'milestone-flash'
    this.mountEl.appendChild(flash)
    this.milestoneFlash = flash

    render(
      h(App, {
        actor: this.actor,
        audio: this.audio,
        storage: this.storage,
        onPaletteChange: this.onPaletteChange,
        onShapeChange: this.onShapeChange,
        onImageChange: this.onImageChange,
        timerSystem: this.timerSystem,
      }),
      this.mountEl,
    )
  }

  spawnScorePopup(worldPos: { x: number; y: number; z: number }): void {
    if (!this.popupPool || !this.camera) return
    this.popupPool.spawn(worldPos, this.camera)
  }

  triggerMilestoneFlash(): void {
    const flash = this.milestoneFlash
    if (!flash) return
    flash.classList.add('active')
    setTimeout(() => flash.classList.remove('active'), 200)
  }

  /** Phase 18 PROG-03: show a "🔓 Unlocked: X" toast for ~3s. Caller is
   * responsible for state-gating (typically called once on game over when
   * the score crossed a threshold not previously in unlocks). */
  showUnlockToast(label: string): void {
    if (!this.mountEl) return
    const toast = document.createElement('div')
    toast.className = 'unlock-toast'
    toast.textContent = `🔓 Unlocked: ${label}`
    this.mountEl.appendChild(toast)
    // Pop the .active class on the next frame so the CSS transition runs
    requestAnimationFrame(() => toast.classList.add('active'))
    setTimeout(() => {
      toast.classList.remove('active')
      setTimeout(() => toast.remove(), 250)
    }, 3000)
  }

  dispose(): void {
    if (this.mountEl) render(null, this.mountEl)
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
      // Snapshot best before round starts; gameMachine writes best synchronously on gameOver
      // so we must capture here, not in the gameOver branch
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

  // Detect when browser fires beforeinstallprompt so install CTA can appear
  useEffect(() => {
    const checkPrompt = () => setShowInstall(!!window.deferredInstallPrompt)
    window.addEventListener('beforeinstallprompt', checkPrompt)
    return () => window.removeEventListener('beforeinstallprompt', checkPrompt)
  }, [])

  function handleModeChange(newMode: GameMode): void {
    props.actor.send({ type: 'SET_MODE', mode: newMode })
    props.storage.setLastMode(newMode)
    setMode(newMode)
    setLeaderboard(props.storage.getLeaderboard(newMode))
    // Phase 20 AUDIO-06: notify audio of new track preference (no-op fallback)
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
      // v1.9: HUD now also visible during 'respawning' so the player can
      // see their remaining lives + bird position update during invincibility.
      active: value === 'playing' || value === 'dying' || value === 'respawning',
      actor: props.actor,
      score: snap.context.score,
      lives: snap.context.lives,
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
        })
      : null,
  )
}
