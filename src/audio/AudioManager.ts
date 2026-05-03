import { Howl, Howler } from 'howler'

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))

// Tiny WebAudio synth fallback used when MP3 files are placeholder/unavailable (D-09)
function synthBurst(
  type: OscillatorType,
  freq: number,
  durationMs: number,
): void {
  try {
    const ctx = Howler.ctx
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + durationMs / 1000)
  } catch {
    // silently swallow — synth is best-effort
  }
}

export class AudioManager {
  private flap: Howl
  private score: Howl
  private death: Howl
  private music: Howl
  // Track whether each Howl successfully loaded (used for synth fallback — see playFlap/playScore/playDeath)
  private flapLoaded = false
  private scoreLoaded = false
  private deathLoaded = false

  private musicPlaying = false
  private sfxMuted = false
  private musicMuted = false
  private unlocked = false
  private unlockHandler: ((e: PointerEvent) => void) | null = null

  // Phase 20 AUDIO-07: sub-bus mixing. master applies via Howler.volume()
  // (global), music/sfx are multiplied per-howl on top.
  private master = 0.7
  private musicGain = 0.4
  private sfxGain = 0.6

  constructor() {
    // All Howl instances created ONCE here (AUD-05) — never recreated on restart
    this.flap = new Howl({
      src: ['/audio/flap.mp3'],
      volume: 0.6,
      preload: true,
      onload: () => { this.flapLoaded = true },
    })
    this.score = new Howl({
      src: ['/audio/score.mp3'],
      volume: 0.7,
      preload: true,
      onload: () => { this.scoreLoaded = true },
    })
    this.death = new Howl({
      src: ['/audio/death.mp3'],
      volume: 0.8,
      preload: true,
      onload: () => { this.deathLoaded = true },
    })
    this.music = new Howl({
      src: ['/audio/music.mp3'],
      volume: 0.4,
      loop: true,
      preload: true,
    })

    // iOS unlock pattern (AUD-01, D-08): one-time pointerup listener
    // MUST call Howler.ctx.resume() synchronously inside the user-gesture handler
    this.unlockHandler = () => {
      if (this.unlocked) return
      void Howler.ctx?.resume()
      this.unlocked = true
      if (this.unlockHandler) {
        document.removeEventListener('pointerup', this.unlockHandler)
        this.unlockHandler = null
      }
      // If music was queued before unlock, start it now
      if (this.musicPlaying && !this.musicMuted) this.music.play()
    }
    document.addEventListener('pointerup', this.unlockHandler)
  }

  playFlap(): void {
    if (this.sfxMuted) return
    if (this.flapLoaded) {
      this.flap.play()
    } else {
      // Synth fallback: short high-frequency sine (D-09)
      synthBurst('sine', 880, 80)
    }
  }

  playScore(): void {
    if (this.sfxMuted) return
    if (this.scoreLoaded) {
      this.score.play()
    } else {
      // Synth fallback: bright triangle "ding" (D-09)
      synthBurst('triangle', 1320, 150)
    }
  }

  playDeath(): void {
    if (this.sfxMuted) return
    if (this.deathLoaded) {
      this.death.play()
    } else {
      // Synth fallback: low sawtooth thud (D-09)
      synthBurst('sawtooth', 120, 250)
    }
  }

  setMusicPlaying(playing: boolean): void {
    this.musicPlaying = playing
    if (playing && !this.musicMuted) {
      this.music.volume(0.4)  // reset after potential fadeMusicOut (which fades to 0)
      if (this.unlocked) {
        this.music.play()
      }
      // else: unlockHandler will call music.play() after first pointerup
    } else {
      this.music.pause()
    }
  }

  setSfxMuted(muted: boolean): void {
    this.sfxMuted = muted
  }

  setMusicVolume(volume: number): void {
    this.music.volume(volume)
  }

  setMusicMuted(muted: boolean): void {
    this.musicMuted = muted
    if (muted) {
      this.music.pause()
    } else if (this.musicPlaying && this.unlocked) {
      this.music.play()
    }
  }

  // Phase 20 AUDIO-07: sub-bus volume controls. master goes through
  // Howler global; music/sfx are multiplied per-instance.
  setVolumeMaster(v: number): void {
    this.master = clamp01(v)
    Howler.volume(this.master)
  }
  setVolumeMusic(v: number): void {
    this.musicGain = clamp01(v)
    this.music.volume(this.musicGain)
  }
  setVolumeSfx(v: number): void {
    this.sfxGain = clamp01(v)
    this.flap.volume(this.sfxGain)
    this.score.volume(this.sfxGain)
    this.death.volume(this.sfxGain)
  }
  /** Apply all 3 sub-bus volumes from a settings snapshot in one call. */
  applyVolumes(master: number, music: number, sfx: number): void {
    this.setVolumeMaster(master)
    this.setVolumeMusic(music)
    this.setVolumeSfx(sfx)
  }

  // Phase 20 AUDIO-06: per-mode music track stub. Source files don't yet
  // exist; until they're sourced this is a no-op fallback that keeps the
  // existing `music` Howl playing. API is in place so future drop-in
  // works without further wiring.
  setMusicTrack(_modeKey: 'endless' | 'timeAttack' | 'daily'): void {
    // no-op fallback — future: crossfade between mode-specific Howls
  }

  // Phase 20 AUDIO-08: balloon fly-by whoosh — synth fallback (low filtered
  // noise burst). Sfx-bus gated. Called by WorldLayers when balloon spawns.
  playWhoosh(): void {
    if (this.sfxMuted) return
    synthBurst('sine', 220, 320)
  }

  fadeMusicOut(durationMs: number): void {
    const currentVol = this.music.volume()
    if (currentVol > 0) {
      this.music.fade(currentVol, 0, durationMs)
    }
  }

  // Programmatic unlock — call inside first pointerup synchronously (D-08)
  unlock(): void {
    this.unlockHandler?.(new PointerEvent('pointerup'))
  }

  dispose(): void {
    this.flap.unload()
    this.score.unload()
    this.death.unload()
    this.music.unload()
    if (this.unlockHandler) {
      document.removeEventListener('pointerup', this.unlockHandler)
      this.unlockHandler = null
    }
  }
}
