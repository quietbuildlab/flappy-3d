import { createActor } from 'xstate'
import { gsap } from 'gsap'
import { createEngine } from './render/createEngine'
import { createPipeline } from './render/createPipeline'
import { createToonMaterial, addRimLight, applyColorblindPalette, applyDefaultPalette, COLORBLIND_PIPE_COLOR } from './render/toonMaterial'
import { GameLoop } from './loop/GameLoop'
import { InputManager, isControlTarget } from './input/InputManager'
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
import { PIPE_COLOR, POOL_SIZE, FLAP_IMPULSE } from './constants'
import { applyCameraView, resizeSideCamera, CAMERA_VIEWS, CAMERA_VIEW_ORDER } from './render/cameraViews'
import type { CameraView } from './render/cameraViews'
import { mulberry32, dailySeed } from './utils/rng'
import { difficultyFrom } from './systems/Difficulty'
import { ALL_BIRD_SHAPES, SHAPE_UNLOCK_THRESHOLDS } from './constants'

// Pretty labels for unlock toasts.
const EMOJI_FOR_SHAPE_FOR_TOAST: Record<string, string> = {
  sphere: 'Classic', cube: 'Cube', pyramid: 'Pyramid',
  bird: '🐦', cat: '🐱', dog: '🐶', frog: '🐸',
  unicorn: '🦄', penguin: '🐧',
}
import styles from './style.css?inline'
import uiStyles from './ui/styles.css?inline'

export interface MountOptions {
  storageKey?: string
  standalone?: boolean
  onRoundEnded?: (detail: { mode: string; score: number }) => void
}

/** One owned session, shared by the standalone page and custom element. */
export function mount(root: HTMLElement, options: MountOptions = {}) {
  root.innerHTML = '<canvas id="scene" aria-label="Flappy game"></canvas><div id="ui-root"></div>'
  root.className = 'flappy-root'
  root.tabIndex = 0
  const style = document.createElement('style')
  style.textContent = styles + uiStyles
  root.prepend(style)
  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!
  if (!canvas.getContext('webgl2')) {
    root.replaceChildren()
    throw new Error('This game needs WebGL 2. Try a recent Chrome, Firefox, or Safari.')
  }
  const ac = new AbortController()
  const cleanups: Array<() => void> = [() => ac.abort(), () => root.replaceChildren()]
  let disposed = false
  const dispose = () => {
    if (disposed) return
    disposed = true
    for (const cleanup of cleanups.reverse()) cleanup()
  }
  const timers = new Set<ReturnType<typeof setTimeout>>()
  function later(callback: () => void, ms: number) {
    const id = setTimeout(() => { timers.delete(id); callback() }, ms)
    timers.add(id)
  }
  cleanups.push(() => timers.forEach(clearTimeout))
  try {
    const { engine, scene, camera } = createEngine(canvas)
    cleanups.push(() => engine.dispose())
    const resize = new ResizeObserver(() => { engine.resize(); resizeSideCamera(camera) })
    resize.observe(root)
    cleanups.push(() => resize.disconnect())

    const storage = new StorageManager(options.storageKey)
    const actor = createActor(gameMachine, {
      input: { bestScore: storage.getBestScore(), mode: storage.getLastMode() },
    })
    cleanups.push(() => actor.stop())

    const birdMaterial = createToonMaterial(scene, 0xefad61)
    const pipeMaterial = createToonMaterial(scene, PIPE_COLOR)
    addRimLight(birdMaterial)

    // Apply stored palette BEFORE pool warm-up so pooled pipes clone the right colour.
    const storedSettings = storage.getSettings()
    if (storedSettings.palette === 'colorblind') {
      applyColorblindPalette(birdMaterial, pipeMaterial)
    }

    const bird = new Bird(scene)
    cleanups.push(() => bird.dispose())
    cleanups.push(() => {
      for (const tween of gsap.getTweensOf([bird.root.scaling, bird.leftWing.rotation, bird.rightWing.rotation, camera, camera.position])) {
        if (tween.parent && tween.parent !== gsap.globalTimeline) tween.parent.kill()
        else tween.kill()
      }
    })
    bird.setBaseMaterial(birdMaterial)

    const obstaclePool = new ObjectPool<ObstaclePair>(
      () => new ObstaclePair(scene, pipeMaterial),
      POOL_SIZE,
    )

    const background = new Background(scene)
    const worldLayers = new WorldLayers(scene)
    const clouds = new Clouds(scene)

    const loop = new GameLoop(engine, scene)
    cleanups.push(() => loop.stop())
    const input = new InputManager(canvas, root)
    cleanups.push(() => input.destroy())
    const physics = new PhysicsSystem(bird, actor, storage)
    const scrollSystem = new ScrollSystem(obstaclePool, actor, background, storage)
    const spawner = new ObstacleSpawner(obstaclePool, actor, storage)
    const scoreSystem = new ScoreSystem(obstaclePool, actor)
    const collision = new CollisionSystem(bird, obstaclePool, actor)
    const timer = new TimerSystem(actor)

    const audio = new AudioManager(root)
    cleanups.push(() => audio.dispose())

    if (storedSettings.palette === 'colorblind') {
      spawner.setColorblindMode(true)
    }

    // Apply stored bird shape + image at startup
    bird.setShape(storedSettings.birdShape)
    bird.setImage(storedSettings.birdImage)

    // Apply stored sub-bus volumes + initial mode music track
    audio.applyVolumes(storedSettings.volumeMaster, storedSettings.volumeMusic, storedSettings.volumeSfx)
    audio.setSfxMuted(!storedSettings.sound)
    audio.setMusicMuted(!storedSettings.music)
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
    cleanups.push(() => ui.dispose())
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
        if (currentView === 'side' || prefersReducedMotion(storage)) {
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
    root.addEventListener(
      'keydown',
      (e) => {
        if (isControlTarget(e)) return
        if (e.key === 'c' || e.key === 'C') {
          const i = CAMERA_VIEW_ORDER.indexOf(currentView)
          setCameraView(CAMERA_VIEW_ORDER[(i + 1) % CAMERA_VIEW_ORDER.length]!, true)
        }
        const state = actor.getSnapshot().value
        if (e.key === 'Enter' && state === 'title') actor.send({ type: 'START' })
        if (e.key === 'Escape' && state === 'paused') actor.send({ type: 'RESUME' })
        else if (e.key === 'Escape') actor.send({ type: 'PAUSE' })
        if ((e.key === 'Enter' || e.key === 'Escape') && state === 'gameOver') actor.send({ type: 'RESTART' })
      },
      { signal: ac.signal },
    )

    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) pause()
      },
      { signal: ac.signal },
    )

    const pause = () => { actor.send({ type: 'PAUSE' }); audio.setMusicPlaying(false) }
    root.addEventListener('focusout', (e) => {
      if (!(e.relatedTarget instanceof Node) || !root.contains(e.relatedTarget)) pause()
    }, { signal: ac.signal })
    window.addEventListener('blur', pause, { signal: ac.signal })
    root.addEventListener('pointerdown', (e) => {
      if (!isControlTarget(e)) root.focus({ preventScroll: true })
    }, { signal: ac.signal })
    // Return focus from a menu action to gameplay after Preact updates its screen.
    root.addEventListener('click', () => {
      if (actor.getSnapshot().value === 'playing') root.focus({ preventScroll: true })
    }, { signal: ac.signal })
    ui.mount(root.querySelector<HTMLElement>('#ui-root')!, options.standalone ?? false)

    // Reset bird + clear obstacles when the machine emits 'roundStarted'.
    let roundCount = 0
    const roundStarted = actor.on('roundStarted', () => {
      roundCount++
      bird.position.set(0, 0, 0)
      bird.velocity.set(0, FLAP_IMPULSE, 0)
      bird.prevPosition.set(0, 0, 0)
      bird.root.rotation.z = 0
      bird.root.position.set(0, 0, 0)
      bird.syncMesh()
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

    cleanups.push(() => roundStarted.unsubscribe())
    const MILESTONE_SCORES = new Set([10, 25, 50])
    const firedMilestones = new Set<number>()

    let lastScore = 0
    let prevState: string | undefined

    const subscription = actor.subscribe((snapshot) => {
      const s = snapshot.value as string
      const roundEnded = s === 'gameOver' && prevState !== 'gameOver'
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
      if (roundEnded) {
        const score = snapshot.context.score
        storage.setBestScore(score)
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
            later(() => ui.showUnlockToast(label), i * 350)
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
      // A host may synchronously remove this element in response to the event.
      if (roundEnded) options.onRoundEnded?.({ mode: snapshot.context.mode, score: snapshot.context.score })
    })

    cleanups.push(() => subscription.unsubscribe())
    // Dev-only test hook for the headless smoke test (stripped from prod builds).
    if (import.meta.env.DEV && options.standalone) {
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
    return { pause, dispose }
  } catch (error) {
    dispose()
    throw error
  }
}
