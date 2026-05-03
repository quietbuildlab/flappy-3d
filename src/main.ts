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
import { BoxGeometry } from 'three'
import WebGL from 'three/addons/capabilities/WebGL.js'
import { createRenderer } from './render/createRenderer'
import { createComposer } from './render/createComposer'
import { createToonGradient, createToonMaterial, addRimLight, applyColorblindPalette, applyDefaultPalette } from './render/toonMaterial'
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
import { PIPE_WIDTH, PIPE_DEPTH, PIPE_COLOR, POOL_SIZE } from './constants'
import { mulberry32, dailySeed } from './utils/rng'
import { difficultyFrom } from './systems/Difficulty'
import './style.css'
import './ui/styles.css'

if (!WebGL.isWebGL2Available()) {
  const msg = document.createElement('div')
  msg.style.cssText =
    'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;font-family:sans-serif;font-size:1.2rem;padding:2rem;text-align:center;background:#1a1a1a;color:#fff'
  msg.textContent =
    'Sorry, this game needs WebGL 2. Please try a recent version of Chrome, Firefox, or Safari.'
  document.body.appendChild(msg)
} else {
  const ac = new AbortController()
  const { renderer, scene, camera } = createRenderer(ac.signal)
  const canvas = renderer.domElement

  const storage = new StorageManager()
  const actor = createActor(gameMachine, {
    input: { bestScore: storage.getBestScore(), mode: storage.getLastMode() },
  })

  const gradient = createToonGradient()
  const birdMaterial = createToonMaterial(gradient, 0xff7043)
  const pipeMaterial = createToonMaterial(gradient, PIPE_COLOR)

  addRimLight(birdMaterial)

  const bird = new Bird(scene)
  bird.mesh.material = birdMaterial
  bird.setBaseMaterial(birdMaterial)

  const pipeGeometry = new BoxGeometry(PIPE_WIDTH, 6, PIPE_DEPTH)
  const obstaclePool = new ObjectPool<ObstaclePair>(
    () => new ObstaclePair(pipeGeometry, pipeMaterial, scene),
    POOL_SIZE,
  )

  const background = new Background(scene)
  const worldLayers = new WorldLayers(scene)
  const clouds = new Clouds(scene)

  const loop = new GameLoop(renderer, scene, camera)
  const input = new InputManager(canvas)
  const physics = new PhysicsSystem(bird, actor, storage)
  const scrollSystem = new ScrollSystem(obstaclePool, actor, background, storage)
  const spawner = new ObstacleSpawner(obstaclePool, actor, storage)
  const scoreSystem = new ScoreSystem(obstaclePool, actor)
  const collision = new CollisionSystem(bird, obstaclePool, actor)
  const timer = new TimerSystem(actor)

  const audio = new AudioManager()

  // Apply stored palette at startup (per D-13)
  const storedSettings = storage.getSettings()
  if (storedSettings.palette === 'colorblind') {
    applyColorblindPalette(birdMaterial, pipeMaterial)
    spawner.setColorblindMode(true)
  }

  // Phase 17 v1.5: apply stored bird shape + image at startup
  bird.setShape(storedSettings.birdShape)
  bird.setImage(storedSettings.birdImage)

  const ui = new UIBridge(
    actor,
    audio,
    storage,
    (palette) => {
      if (palette === 'colorblind') {
        applyColorblindPalette(birdMaterial, pipeMaterial)
      } else {
        applyDefaultPalette(birdMaterial, pipeMaterial)
      }
      spawner.setColorblindMode(palette === 'colorblind')
    },
    camera,
    timer,
    (shape) => bird.setShape(shape),
    (image) => bird.setImage(image),
  )
  const particles = createParticles(scene)

  input.onFlap(() => {
    const state = actor.getSnapshot().value
    if (state === 'title') {
      actor.send({ type: 'START' })
    } else if (state === 'playing') {
      physics.queueFlap()
      actor.send({ type: 'FLAP' })
      audio.playFlap()
      if (!prefersReducedMotion(storage)) {
        squashStretch(bird.mesh)
        wingFlap(bird)
      }
      if (storage.getSettings().flapTrail && !prefersReducedMotion(storage)) {
        bird.snapshotGhost()
      }
    } else if (state === 'gameOver') {
      actor.send({ type: 'RESTART' })
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
  // Phase 13: animate sky shader colors over a 60s cycle (motion-gated)
  loop.add({ step: (dt: number) => background.cycleSky(dt, prefersReducedMotion(storage)) })
  // Camera follow + opt-in velocity bob (Diorama Pass v1.7).
  //   - Always-on subtle position follow (0.18 of bird.y, lerped) — gives
  //     a gentle parallax read on the layered world without free-camera feel.
  //   - Velocity-based bob ADDED ON TOP when the cameraBob Settings toggle
  //     is on (Phase 15 POLISH-03). Off by default for motion-sensitive users.
  //   - Reduce-motion snaps to base regardless of toggle.
  const CAMERA_BASE_Y = 0
  const CAMERA_FOLLOW_FACTOR = 0.18
  const CAMERA_BOB_FACTOR = 0.05
  const CAMERA_LERP = 0.08
  loop.add({
    step: (_dt: number) => {
      const s = actor.getSnapshot().value
      if (s !== 'playing' && s !== 'dying') return
      if (prefersReducedMotion(storage)) {
        if (camera.position.y !== CAMERA_BASE_Y) camera.position.y = CAMERA_BASE_Y
        return
      }
      const follow = bird.position.y * CAMERA_FOLLOW_FACTOR
      const bob = storage.getSettings().cameraBob ? bird.velocity.y * CAMERA_BOB_FACTOR : 0
      const target = CAMERA_BASE_Y + follow + bob
      camera.position.y += (target - camera.position.y) * CAMERA_LERP
    },
  })
  // Title-screen mascot positioning: lift bird above viewport center so it
  // doesn't sit behind the mode picker / leaderboard, and pull forward in z
  // so it reads as the foreground character. Resets to (0,0,0) on roundStarted.
  // Title-screen mascot framing — TitleScreen.tsx adds a `.title-bird-zone`
  // flex-grow spacer between the logo and the bottom DOM stack, opening
  // a clear band centered around viewport ~34vh. World y=1.0 maps to that
  // band on both desktop and mobile aspect ratios. Bird stays at world x=0
  // (centered) so it lines up under the centered logo.
  const TITLE_MASCOT_X = 0
  const TITLE_MASCOT_Y = 1.0
  const TITLE_MASCOT_Z = 0.5
  loop.add({
    step: (dt: number) => {
      const s = actor.getSnapshot().value
      if (s !== 'title') {
        if (s === 'playing') bobTime = 0
        return
      }
      // Showcase position — off-center left, above viewport center, forward
      bird.mesh.position.x = TITLE_MASCOT_X
      bird.mesh.position.z = TITLE_MASCOT_Z
      if (prefersReducedMotion(storage)) {
        bird.mesh.position.y = TITLE_MASCOT_Y
        return
      }
      bobTime += dt
      bird.mesh.position.y = TITLE_MASCOT_Y + Math.sin(bobTime * Math.PI * 2) * 0.15
    },
  })

  // Render-time interpolation for the bird only (the most motion-visible
  // entity). Title bob writes mesh.position directly, so interp is gated to
  // 'playing'/'dying' where physics drives the position.
  loop.addInterpolator((alpha) => {
    const s = actor.getSnapshot().value
    if (s === 'playing' || s === 'dying') {
      bird.interpolate(alpha)
    }
  })

  const composerResult = createComposer(renderer, scene, camera, ac.signal, storage.getSettings().quality)
  if (composerResult !== null) {
    loop.setRenderFn(composerResult.render)
  }

  actor.start()

  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden && actor.getSnapshot().value === 'playing') {
        actor.send({ type: 'PAUSE' })
      }
    },
    { signal: ac.signal },
  )

  // Capture beforeinstallprompt for deferred PWA install CTA (per D-10)
  window.addEventListener(
    'beforeinstallprompt',
    (e) => {
      e.preventDefault()
      window.deferredInstallPrompt = e as BeforeInstallPromptEvent
    },
    { signal: ac.signal },
  )

  ui.mount()

  // Reset bird + clear obstacles when the machine emits 'roundStarted'
  // (i.e. on START or RESTART, but not on RESUME). Driven by the machine's
  // emitted event so main.ts doesn't need to track state-transition history.
  let roundCount = 0
  actor.on('roundStarted', () => {
    roundCount++
    bird.position.set(0, 0, 0)
    bird.velocity.set(0, 0, 0)
    bird.prevPosition.set(0, 0, 0)  // reset interp anchor (no first-frame snap)
    bird.mesh.rotation.z = 0
    bird.mesh.position.set(0, 0, 0)  // clear title-mascot x/y/z offset
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
    camera.position.y = CAMERA_BASE_Y

    const currentMode = actor.getSnapshot().context.mode
    if (currentMode === 'daily') {
      spawner.setRng(mulberry32(dailySeed()))
    } else {
      spawner.setRng(Math.random)
    }

    if (import.meta.env.DEV) {
      const mem = renderer.info.memory
      console.log(
        `[mem probe] round=${roundCount} geometries=${mem.geometries} textures=${mem.textures}`,
      )
      if (roundCount >= 3 && mem.geometries > roundCount + 5) {
        console.warn('[mem probe] geometry count growing — possible leak')
      }
    }
  })

  const MILESTONE_SCORES = new Set([10, 25, 50])
  const firedMilestones = new Set<number>()

  let lastScore = 0
  let prevState: string | undefined

  actor.subscribe((snapshot) => {
    const s = snapshot.value as string
    if (import.meta.env.DEV) {
      console.log('[machine]', s, 'score:', snapshot.context.score)
    }

    // Music control: play in 'playing', fade on 'dying', stop elsewhere
    if (s === 'playing') {
      audio.setMusicPlaying(true)
      audio.setMusicVolume(0.4)  // restore gameplay volume (was lowered on title)
    } else if (s === 'dying') {
      audio.fadeMusicOut(600)
      audio.playDeath()
    } else if (s === 'paused') {
      audio.setMusicPlaying(false)
    } else if (s === 'title') {
      // Music plays softly on title screen (BEAUTY-02 / D-07)
      audio.setMusicPlaying(true)
      audio.setMusicVolume(0.2)
    } else if (s === 'gameOver') {
      audio.setMusicPlaying(false)
    }

    // Juice on dying transition (screen shake + particle burst) — gated behind reduced motion
    if (s === 'dying' && prevState !== 'dying') {
      if (!prefersReducedMotion(storage)) {
        screenShake(camera)
        particles.burst({ x: bird.position.x, y: bird.position.y, z: bird.position.z })
      }
    }

    // Score SFX + popup + milestone on each increment
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
          pulseFOV(camera)  // tiny zoom-out → back, ~400ms
        }
      }
    }
    lastScore = snapshot.context.score
    prevState = s
  })

  loop.start()
}
