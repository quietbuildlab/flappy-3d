import type { DifficultyPreset } from '../constants'
import { ALL_BIRD_SHAPES } from '../constants'
import type { QualityTier } from '../render/createPipeline'
import type { CameraView } from '../render/cameraViews'

const STORAGE_KEY = 'flappy-3d:v1'

// GameMode is duplicated here so StorageManager has zero dependency on src/machine/.
// TypeScript structural typing makes this compatible with gameMachine.ts's GameMode.
export type GameMode = 'endless' | 'timeAttack' | 'daily'
export type BirdShape = 'sphere' | 'cube' | 'pyramid' | 'bird' | 'cat' | 'dog' | 'frog' | 'unicorn' | 'penguin'

export interface SettingsV2 {
  sound: boolean
  music: boolean
  reduceMotion: 'auto' | 'on' | 'off'
  palette: 'default' | 'colorblind'
  flapTrail: boolean  // Phase 7 BEAUTY-06; default false
}

export interface SettingsV3 extends SettingsV2 {
  lastMode: GameMode
  cameraBob: boolean  // Phase 15 POLISH-03; default false (opt-in, motion-sensitive)
}

export interface SettingsV4 extends SettingsV3 {
  difficulty: DifficultyPreset  // Phase 16 v1.5; default 'easy' (fresh) or 'normal' (existing migrated)
  birdShape: BirdShape           // Phase 17 v1.5; default 'sphere'
  birdImage: string | null       // Phase 17 v1.5; data URL (PNG, ≤256×256), null = use shape
  quality: QualityTier           // Phase 18 v1.6; default 'auto' (auto-tier by device)
}

export interface SettingsV5 extends SettingsV4 {
  unlocks: BirdShape[]           // Phase 18 v1.8 (PROG-01); default ['sphere'] for fresh installs.
                                  // v4 → v5 migration grandfathers existing users to ALL_BIRD_SHAPES.
  volumeMaster: number           // Phase 20 v1.8 (AUDIO-07); 0..1 master gain
  volumeMusic: number            // Phase 20 v1.8 (AUDIO-07); 0..1 music sub-bus gain
  volumeSfx: number              // Phase 20 v1.8 (AUDIO-07); 0..1 sfx sub-bus gain
  cameraView: CameraView         // Classic side-on view unless deliberately changed.
  cameraViewChosen: boolean      // Distinguishes a player choice from the old saved default.
}

export interface LeaderboardEntry {
  score: number
  ts: number
}

const DEFAULT_SETTINGS: SettingsV2 = {
  sound: true,
  music: true,
  reduceMotion: 'auto',
  palette: 'default',
  flapTrail: false,
}

const DEFAULT_SETTINGS_V3: SettingsV3 = {
  ...DEFAULT_SETTINGS,
  lastMode: 'endless',
  cameraBob: false,
}

const DEFAULT_SETTINGS_V4: SettingsV4 = {
  ...DEFAULT_SETTINGS_V3,
  difficulty: 'easy',  // fresh-install default — easier for new players (v1.5)
  birdShape: 'sphere',
  birdImage: null,
  quality: 'auto',     // resolves to low/medium/high based on device capability
}

const DEFAULT_SETTINGS_V5: SettingsV5 = {
  ...DEFAULT_SETTINGS_V4,
  unlocks: ['sphere'],  // fresh install — only sphere unlocked at start (v1.8)
  volumeMaster: 0.7,    // master gain — applied to this session's audio only
  volumeMusic: 0.4,     // music sub-bus — applied to music Howl on top of master
  volumeSfx: 0.6,       // sfx sub-bus — applied to flap/score/death/whoosh on top of master
  cameraView: 'side',
  cameraViewChosen: false,
}

interface SaveV1 {
  schemaVersion: 1
  bestScore: number
}

interface SaveV2 {
  schemaVersion: 2
  bestScore: number
  leaderboard: LeaderboardEntry[]
  settings: SettingsV2
}

interface SaveV3 {
  schemaVersion: 3
  bestScore: number
  settings: SettingsV3
  leaderboardByMode: {
    endless: LeaderboardEntry[]
    timeAttack: LeaderboardEntry[]
    daily: LeaderboardEntry[]
  }
  dailyAttempts: Record<string, { count: number; best: number }>
}

interface SaveV4 extends Omit<SaveV3, 'schemaVersion' | 'settings'> {
  schemaVersion: 4
  settings: SettingsV4
}

interface SaveV5 extends Omit<SaveV4, 'schemaVersion' | 'settings'> {
  schemaVersion: 5
  settings: SettingsV5
}

export class StorageManager {
  private key: string

  constructor(key = STORAGE_KEY) { this.key = key }

  private load(): SaveV5 {
    try {
      const raw = localStorage.getItem(this.key)
      if (raw === null) return this.defaults()
      const parsed = JSON.parse(raw) as SaveV1 | SaveV2 | SaveV3 | SaveV4 | SaveV5
      // Existing users (any prior schema) get ALL_BIRD_SHAPES grandfathered —
      // no surprise loss of access to shapes they could already pick.
      const grandfatheredUnlocks: BirdShape[] = [...ALL_BIRD_SHAPES]
      if (parsed.schemaVersion === 1) {
        return {
          schemaVersion: 5,
          bestScore: parsed.bestScore,
          settings: { ...DEFAULT_SETTINGS_V5, difficulty: 'normal', unlocks: grandfatheredUnlocks },
          leaderboardByMode: {
            endless: parsed.bestScore > 0 ? [{ score: parsed.bestScore, ts: Date.now() }] : [],
            timeAttack: [],
            daily: [],
          },
          dailyAttempts: {},
        }
      }
      if (parsed.schemaVersion === 2) {
        return {
          schemaVersion: 5,
          bestScore: parsed.bestScore,
          settings: { ...DEFAULT_SETTINGS_V5, ...parsed.settings, difficulty: 'normal', unlocks: grandfatheredUnlocks },
          leaderboardByMode: { endless: parsed.leaderboard, timeAttack: [], daily: [] },
          dailyAttempts: {},
        }
      }
      if (parsed.schemaVersion === 3) {
        return {
          schemaVersion: 5,
          bestScore: parsed.bestScore,
          settings: { ...DEFAULT_SETTINGS_V5, ...parsed.settings, difficulty: 'normal', unlocks: grandfatheredUnlocks },
          leaderboardByMode: parsed.leaderboardByMode,
          dailyAttempts: parsed.dailyAttempts,
        }
      }
      if (parsed.schemaVersion === 4) {
        return {
          schemaVersion: 5,
          bestScore: parsed.bestScore,
          settings: { ...DEFAULT_SETTINGS_V5, ...parsed.settings, unlocks: grandfatheredUnlocks },
          leaderboardByMode: parsed.leaderboardByMode,
          dailyAttempts: parsed.dailyAttempts,
        }
      }
      if (parsed.schemaVersion === 5) return parsed as SaveV5
      return this.defaults()
    } catch {
      return this.defaults()
    }
  }

  private save(data: SaveV5): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(data))
    } catch {
      // Quota exceeded or disabled — silent fail (game still playable)
    }
  }

  private defaults(): SaveV5 {
    return {
      schemaVersion: 5,
      bestScore: 0,
      settings: { ...DEFAULT_SETTINGS_V5 },
      leaderboardByMode: { endless: [], timeAttack: [], daily: [] },
      dailyAttempts: {},
    }
  }

  getBestScore(): number {
    return this.load().bestScore
  }

  setBestScore(score: number): void {
    const data = this.load()
    if (score > data.bestScore) {
      data.bestScore = score
      this.save(data)
    }
  }

  /** @deprecated Use getLeaderboard(mode) */
  getLeaderboard(): LeaderboardEntry[]
  getLeaderboard(mode: GameMode): LeaderboardEntry[]
  getLeaderboard(mode: GameMode = 'endless'): LeaderboardEntry[] {
    return this.load().leaderboardByMode[mode].slice()
  }

  /** Push entry to mode-specific leaderboard. Returns isNewBest and rank within that mode's list. */
  pushLeaderboard(mode: GameMode, entry: LeaderboardEntry): { isNewBest: boolean; rank: number | null }
  /** @deprecated Use pushLeaderboard(mode, entry) */
  pushLeaderboard(score: number): { isNewBest: boolean; rank: number | null }
  pushLeaderboard(
    modeOrScore: GameMode | number,
    entry?: LeaderboardEntry,
  ): { isNewBest: boolean; rank: number | null } {
    const mode: GameMode = typeof modeOrScore === 'number' ? 'endless' : modeOrScore
    const e: LeaderboardEntry =
      entry ?? { score: modeOrScore as number, ts: Date.now() }

    const data = this.load()
    const bucket = data.leaderboardByMode[mode]
    const before = bucket.length > 0 ? (bucket[0]?.score ?? 0) : 0
    const updated = [...bucket, e].sort((a, b) => b.score - a.score).slice(0, 5)
    data.leaderboardByMode[mode] = updated
    const idx = updated.findIndex((x) => x.score === e.score && x.ts === e.ts)
    const rank = idx >= 0 ? idx + 1 : null
    if (e.score > data.bestScore) data.bestScore = e.score
    this.save(data)
    return { isNewBest: e.score > before, rank }
  }

  getDailyAttempt(date: string): { count: number; best: number } | null {
    const data = this.load()
    return data.dailyAttempts[date] ?? null
  }

  recordDailyAttempt(date: string, score: number): void {
    const data = this.load()
    const existing = data.dailyAttempts[date]
    if (existing === undefined) {
      data.dailyAttempts[date] = { count: 1, best: score }
    } else {
      existing.count++
      if (score > existing.best) existing.best = score
    }
    this.save(data)
  }

  getSettings(): SettingsV5 {
    const settings = { ...DEFAULT_SETTINGS_V5, ...this.load().settings }
    if (!settings.cameraViewChosen && settings.cameraView === 'chase') settings.cameraView = 'side'
    return settings
  }

  setSettings(partial: Partial<SettingsV5>): void {
    const data = this.load()
    data.settings = { ...data.settings, ...partial }
    if (partial.cameraView !== undefined) data.settings.cameraViewChosen = true
    this.save(data)
  }

  /** Phase 18 PROG-01: append a freshly-unlocked shape to the unlocks list
   * (idempotent — no-op if already unlocked). Returns true on first unlock. */
  unlockShape(shape: BirdShape): boolean {
    const data = this.load()
    if (data.settings.unlocks.includes(shape)) return false
    data.settings = { ...data.settings, unlocks: [...data.settings.unlocks, shape] }
    this.save(data)
    return true
  }

  getLastMode(): GameMode {
    return this.load().settings.lastMode ?? 'endless'
  }

  setLastMode(mode: GameMode): void {
    const data = this.load()
    data.settings = { ...data.settings, lastMode: mode }
    this.save(data)
  }
}
