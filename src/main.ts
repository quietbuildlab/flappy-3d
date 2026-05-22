// Augment Window for beforeinstallprompt (not in TS DOM lib)
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
declare global {
  interface Window {
    deferredInstallPrompt?: BeforeInstallPromptEvent
  }
}

import { createActor } from 'xstate'
import { createEngine } from './render/createEngine'
import { createPipeline } from './render/createPipeline'
import { createToonMaterial, addRimLight, applyColorblindPalette, applyDefaultPalette, COLORBLIND_PIPE_COLOR } from './render/toonMaterial'
import { GameLoop } from './loop/GameLoop'
import { InputManager } from './input/InputManager'
import { Bird } from './entities/Bird'
import { PhysicsSystem } from './systems/PhysicsSystem'
import { CollisionSystem } from './systems/CollisionSystem'
import { TimerSystem } from './systems/TimerSystem'
import { ObstacleSpawner } from './systems/ObstacleSpawner'
import { ScrollSystem } from './systems/ScrollSystem'
import { ScoreSystem } from './systems/ScoreSystem'
import { ObjectPool } from './pools/ObjectPool'
import { ObstaclePair } from './entities/ObstaclePair'
import { Background } from './entities/Background'
import { WorldLayers } from './entities/WorldLayers'
import { Clouds } from './entities/Clouds'
import { gameMachine } from './machine/gameMachine'
import { StorageManager } from './storage/StorageManager'
import { AudioManager } from './audio/AudioManager'
import { UIBridge } from './ui/UIBridge'
import { squashStretch, screenShake, wingFlap, pulseFOV } from './anim/anim'
import { createParticles } from './particles/createParticles'
import { prefersReducedMotion } from './a11y/motion'
import { PIPE_COLOR, POOL_SIZE } from './constants'
import { applyCameraView, CAMERA_VIEWS, CAMERA_VIEW_ORDER } from './render/cameraViews'
import type { CameraView } from './render/cameraViews'
import { mulberry32, dailySeed } from './utils/rng'
import { difficultyFrom } from './systems/Difficulty'
import { ALL_BIRD_SHAPES, SHAPE_UNLOCK_THRESHOLDS } from './constants'

// Pretty labels for unlock toasts.
const EMOJI_FOR_SHAPE_FOR_TOAST: Record<string, string> = {
  sphere: 'Sphere', cube: 'Cube', pyramid: 'Pyramid',
  bird: '🐦', cat: '🐱', dog: '🐶', frog: '🐸',
  unicorn: '🦄', penguin: '🐧',
}
import './style.css'
import './ui/styles.css'

function webgl2Available(): boolean {
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
}

if (!webgl2Available()) {
  const msg = document.createElement('div')
  msg.style.cssText =
    'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;font-family:sans-serif;font-size:1.2rem;padding:2rem;text-align:center;background:#1a1a1a;color:#fff'
  msg.textContent =
    'Sorry, this game needs WebGL 2. Please try a recent version of Chrome, Firefox, or Safari.'
  document.body.appendChild(msg)
} else {
  const ac = new AbortController()
  const { engine, scene, camera, canvas } = createEngine(ac.signal)

  const storage = new StorageManager()
  const actor = createActor(gameMachine, {
    input: { bestScore: storage.getBestScore(), mode: storage.getLastMode() },
  })

  const birdMaterial = createToonMaterial(scene, 0xff7043)
  const pipeMaterial = createToonMaterial(scene, PIPE_COLOR)
  addRimLight(birdMaterial)

  // Apply stored palette BEFORE pool warm-up so pooled pipes clone the right colour.
  const storedSettings = storage.getSettings()
  if (storedSettings.palette === 'colorblind') {
    applyColorblindPalette(birdMaterial, pipeMaterial)
  }

  const bird = new Bird(scene)
  bird.setBaseMaterial(birdMaterial)

  const obstaclePool = new ObjectPool<ObstaclePair>(
    () => new ObstaclePair(scene, pipeMaterial),
    POOL_SIZE,
  )

  const background = new Background(scene)
  const worldLayers = new WorldLayers(scene)
  const clouds = new Clouds(scene)

  const loop = new GameLoop(engine, scene)
  const input = new InputManager(canvas)
  const physics = new PhysicsSystem(bird, actor, storage)
  const scrollSystem = new ScrollSystem(obstaclePool, actor, background, storage)
  const spawner = new ObstacleSpawner(obstaclePool, actor, storage)
  const scoreSystem = new ScoreSystem(obstaclePool, actor)
  const collision = new CollisionSystem(bird, obstaclePool, actor)
  const timer = new TimerSystem(actor)

  const audio = new AudioManager()

  if (storedSettings.palette === 'colorblind') {
    spawner.setColorblindMode(true)
  }

  // Apply stored bird shape + image at startup
  bird.setShape(storedSettings.birdShape)
  bird.setImage(storedSettings.birdImage)

  // Apply stored sub-bus volumes + initial mode music track
  audio.applyVolumes(storedSettings.volumeMaster, storedSettings.volumeMusic, storedSettings.volumeSfx)
  audio.setMusicTrack(storedSettings.lastMode)

  // Balloon fly-by whoosh (AUDIO-08)
  worldLayers.onBalloonAppear = () => audio.playWhoosh()

  // Camera view — framing preset (position / aim / fov + follow strength).
  // Switchable from Settings or by cycling with the 'C' key.
  let currentView: CameraView = storedSettings.cameraView
  applyCameraView(camera, currentView)

  function setCameraView(view: CameraView, persist: boolean): void {
    currentView = view
    applyCameraView(camera, view)
    if (persist) storage.setSettings({ cameraView: view })
  }

  const ui = new UIBridge(
    actor,
    audio,
    storage,
    (palette) => {
      if (palette === 'colorblind') {
        applyColorblindPalette(birdMaterial, pipeMaterial)
        // Recolour pipes already on screen — their cloned materials don't
        // track the template, so toggling at runtime must repaint them.
        obstaclePool.forEachActive((p) => p.setColor(COLORBLIND_PIPE_COLOR))
      } else {
        applyDefaultPalette(birdMaterial, pipeMaterial)
        obstaclePool.forEachActive((p) => p.setColor(PIPE_COLOR))
      }
      spawner.setColorblindMode(palette === 'colorblind')
    },
    scene,
    timer,
    (shape) => bird.setShape(shape),
    (image) => bird.setImage(image),
    (view) => setCameraView(view, false),
  )
  const particles = createParticles(scene)

  input.onFlap(() => {
    const state = actor.getSnapshot().value
    if (state === 'title') {
      actor.send({ type: 'START' })
      physics.queueFlap()
    } else if (state === 'playing') {
      physics.queueFlap()
      actor.send({ type: 'FLAP' })
      audio.playFlap()
      if (!prefersReducedMotion(storage)) {
        squashStretch(bird.root)
        wingFlap(bird)
      }
      if (storage.getSettings().flapTrail && !prefersReducedMotion(storage)) {
        bird.snapshotGhost()
      }
    } else if (state === 'gameOver') {
      actor.send({ type: 'RESTART' })
      physics.queueFlap()
    }
  })

  let bobTime = 0

  loop.add(physics)
  loop.add(scrollSystem)
  loop.add(spawner)
  loop.add(scoreSystem)
  loop.add(collision)
  loop.add(timer)
  loop.add({ step: (dt: number) => particles.step(dt) })
  loop.add({
    step: (dt: number) => {
      const s = actor.getSnapshot().value
      if (s === 'title' || s === 'playing' || s === 'dying') {
        const preset = storage.getSettings().difficulty
        const speed = s === 'title'
          ? 1.8
          : difficultyFrom(actor.getSnapshot().context.score, preset).scrollSpeed
        clouds.step(dt, speed)
        worldLayers.scroll(dt, speed)
      }
    },
  })
  loop.add({ step: (dt: number) => bird.stepGhosts(dt) })
  // Animate sky colours over a 60s cycle (motion-gated)
  loop.add({ step: (dt: number) => background.cycleSky(dt, prefersReducedMotion(storage)) })

  // Vertical camera follow — eases toward the bird's height using the active
  // view's follow strength. Velocity bob is opt-in (cameraBob setting).
  const CAMERA_BOB_FACTOR = 0.05
  const CAMERA_LERP = 0.08
  loop.add({
    step: (_dt: number) => {
      const s = actor.getSnapshot().value
      if (s !== 'playing' && s !== 'dying') return
      const cfg = CAMERA_VIEWS[currentView]
      if (prefersReducedMotion(storage)) {
        camera.position.y = cfg.pos.y
        return
      }
      const follow = bird.position.y * cfg.followFactor
      const bob = storage.getSettings().cameraBob ? bird.velocity.y * CAMERA_BOB_FACTOR : 0
      const target = cfg.pos.y + follow + bob
      camera.position.y += (target - camera.position.y) * CAMERA_LERP
    },
  })

  // Title-screen mascot: bird hovers centred in the corridor, gently bobbing.
  const TITLE_MASCOT_Y = 0.3
  loop.add({
    step: (dt: number) => {
      const s = actor.getSnapshot().value
      if (s !== 'title') {
        if (s === 'playing') bobTime = 0
        return
      }
      bird.root.position.x = 0
      bird.root.position.z = 0
      if (prefersReducedMotion(storage)) {
        bird.root.position.y = TITLE_MASCOT_Y
        return
      }
      bobTime += dt
      bird.root.position.y = TITLE_MASCOT_Y + Math.sin(bobTime * Math.PI * 2) * 0.18
    },
  })

  // Render-time interpolation for the bird (gated to physics-driven states).
  loop.addInterpolator((alpha) => {
    const s = actor.getSnapshot().value
    if (s === 'playing' || s === 'dying') {
      bird.interpolate(alpha)
    }
  })

  createPipeline(scene, camera, storage.getSettings().quality)

  actor.start()

  // 'C' cycles the camera view live (Chase → Side → Far → …).
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'c' || e.key === 'C') {
        const i = CAMERA_VIEW_ORDER.indexOf(currentView)
        setCameraView(CAMERA_VIEW_ORDER[(i + 1) % CAMERA_VIEW_ORDER.length]!, true)
      }
    },
    { signal: ac.signal },
  )

  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden && actor.getSnapshot().value === 'playing') {
        actor.send({ type: 'PAUSE' })
      }
    },
    { signal: ac.signal },
  )

  window.addEventListener(
    'beforeinstallprompt',
    (e) => {
      e.preventDefault()
      window.deferredInstallPrompt = e as BeforeInstallPromptEvent
    },
    { signal: ac.signal },
  )

  ui.mount()

  // Reset bird + clear obstacles when the machine emits 'roundStarted'.
  let roundCount = 0
  actor.on('roundStarted', () => {
    roundCount++
    bird.position.set(0, 0, 0)
    bird.velocity.set(0, 0, 0)
    bird.prevPosition.set(0, 0, 0)
    bird.root.rotation.z = 0
    bird.root.position.set(0, 0, 0)
    bird.syncMesh()
    bird.setAlpha(1)
    const toRelease: ObstaclePair[] = []
    obstaclePool.forEachActive((pair) => {
      pair.hide()
      toRelease.push(pair)
    })
    for (const p of toRelease) obstaclePool.release(p)
    firedMilestones.clear()
    bird.resetGhosts()
    spawner.resetColorIndex()
    timer.reset()
    clouds.reset()
    background.resetSkyCycle()
    applyCameraView(camera, currentView)

    const currentMode = actor.getSnapshot().context.mode
    if (currentMode === 'daily') {
      spawner.setRng(mulberry32(dailySeed()))
    } else {
      spawner.setRng(Math.random)
    }

    if (import.meta.env.DEV) {
      console.log(`[mem probe] round=${roundCount} meshes=${scene.meshes.length}`)
    }
  })

  const MILESTONE_SCORES = new Set([10, 25, 50])
  const firedMilestones = new Set<number>()

  let lastScore = 0
  let prevState: string | undefined

  // v1.9 — Lives system.
  actor.on('lifeLost', () => {
    bird.position.set(0, 0, 0)
    bird.velocity.set(0, 0, 0)
    bird.prevPosition.set(0, 0, 0)
    bird.root.rotation.z = 0
    bird.syncMesh()
    physics.queueFlap()
    const toRelease: ObstaclePair[] = []
    obstaclePool.forEachActive((pair) => {
      pair.hide()
      toRelease.push(pair)
    })
    for (const p of toRelease) obstaclePool.release(p)
    if (!prefersReducedMotion(storage)) {
      particles.burstTinted(
        { x: bird.position.x, y: bird.position.y, z: bird.position.z },
        0xff5252,
      )
      // Bird "blinks" during the invincibility window.
      let blinks = 0
      const blink = () => {
        bird.setAlpha(blinks % 2 === 0 ? 0.3 : 1.0)
        blinks++
        if (blinks < 6) setTimeout(blink, 200)
        else bird.setAlpha(1)
      }
      blink()
    }
    audio.playDeath()
    setTimeout(() => actor.send({ type: 'RESPAWN_DONE' }), 1400)
  })

  actor.on('lifeGained', () => {
    if (!prefersReducedMotion(storage)) {
      particles.burstTinted(
        { x: bird.position.x, y: bird.position.y, z: bird.position.z },
        0x66ff99,
      )
    }
    audio.playScore()
  })

  actor.subscribe((snapshot) => {
    const s = snapshot.value as string
    if (import.meta.env.DEV) {
      console.log('[machine]', s, 'score:', snapshot.context.score)
    }

    if (s === 'playing') {
      audio.setMusicPlaying(true)
      audio.setMusicVolume(0.4)
    } else if (s === 'dying') {
      audio.fadeMusicOut(600)
      audio.playDeath()
    } else if (s === 'paused') {
      audio.setMusicPlaying(false)
    } else if (s === 'title') {
      audio.setMusicPlaying(true)
      audio.setMusicVolume(0.2)
    } else if (s === 'gameOver') {
      audio.setMusicPlaying(false)
    }

    // Unlock thresholds crossed on game-over.
    if (s === 'gameOver' && prevState !== 'gameOver') {
      const score = snapshot.context.score
      const currentUnlocks = storage.getSettings().unlocks
      const newlyUnlocked: string[] = []
      for (const shape of ALL_BIRD_SHAPES) {
        const threshold = SHAPE_UNLOCK_THRESHOLDS[shape] ?? Infinity
        if (score >= threshold && !currentUnlocks.includes(shape)) {
          if (storage.unlockShape(shape)) newlyUnlocked.push(shape)
        }
      }
      if (newlyUnlocked.length > 0 && !prefersReducedMotion(storage)) {
        newlyUnlocked.forEach((shape, i) => {
          const label = EMOJI_FOR_SHAPE_FOR_TOAST[shape] ?? shape
          setTimeout(() => ui.showUnlockToast(label), i * 350)
        })
      }
    }

    // Juice on dying transition.
    if (s === 'dying' && prevState !== 'dying') {
      if (!prefersReducedMotion(storage)) {
        screenShake(camera, camera.position.x, camera.position.y)
        particles.burst({ x: bird.position.x, y: bird.position.y, z: bird.position.z })
      }
    }

    // Score SFX + popup + milestone on each increment.
    if (s === 'playing' && snapshot.context.score > lastScore) {
      audio.playScore()
      if (!prefersReducedMotion(storage)) {
        ui.spawnScorePopup({ x: bird.position.x, y: bird.position.y, z: bird.position.z })
      }
      const score = snapshot.context.score
      if (MILESTONE_SCORES.has(score) && !firedMilestones.has(score)) {
        firedMilestones.add(score)
        if (!prefersReducedMotion(storage)) {
          particles.burstTinted(
            { x: bird.position.x, y: bird.position.y, z: bird.position.z },
            0xffd166,
          )
          ui.triggerMilestoneFlash()
          pulseFOV(camera, CAMERA_VIEWS[currentView].fov, CAMERA_VIEWS[currentView].fov + 0.12)
        }
      }
    }
    lastScore = snapshot.context.score
    prevState = s
  })

  // Dev-only test hook for the headless smoke test (stripped from prod builds).
  if (import.meta.env.DEV) {
    ;(window as unknown as { __flappy?: unknown }).__flappy = {
      birdY: () => bird.position.y,
      score: () => actor.getSnapshot().context.score,
      state: () => actor.getSnapshot().value,
      nextGapY: () => {
        let best = 0
        let bestZ = Infinity
        obstaclePool.forEachActive((p) => {
          if (p.z > -0.5 && p.z < bestZ) {
            bestZ = p.z
            best = p.gapCenterY
          }
        })
        return best
      },
    }
  }

  loop.start()
}
