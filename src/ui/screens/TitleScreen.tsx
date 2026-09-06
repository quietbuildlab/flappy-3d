import { h } from 'preact'
import { useEffect, useRef } from 'preact/hooks'
import { gsap } from 'gsap'
import type { Actor } from 'xstate'
import type { gameMachine, GameMode } from '../../machine/gameMachine'
import type { LeaderboardEntry, StorageManager } from '../../storage/StorageManager'
import { todayDate } from '../../utils/rng'
import { Button } from '../components/Button'
import { LeaderboardList } from '../components/LeaderboardList'
import { ModePicker } from '../components/ModePicker'

type GameActor = Actor<typeof gameMachine>

interface Props {
  active: boolean
  actor: GameActor
  leaderboard: LeaderboardEntry[]
  onSettings: () => void
  onInstall?: () => void
  showInstall?: boolean
  mode: GameMode
  onModeChange: (mode: GameMode) => void
  storage: StorageManager
}

const LOGO_TEXT = 'FLAPPY 3D'
const logoLetters = LOGO_TEXT.split('')

export function TitleScreen({ active, actor, leaderboard, onSettings, onInstall, showInstall, mode, onModeChange, storage }: Props) {
  const hasAnimated = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    // One-shot: skip if already animated this session (e.g. back-to-title from gameOver)
    if (hasAnimated.current) return
    // Skip if OS has set reduced-motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    hasAnimated.current = true

    const spans = heading.current?.querySelectorAll('.title-letter')
    if (!spans?.length) return

    const tween = gsap.from(spans, {
      opacity: 0,
      y: 10,
      duration: 0.35,
      stagger: 0.05,
      ease: 'power2.out',
      clearProps: 'opacity,transform',
    })
    return () => { tween.revert() }
  }, [])


  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return h(
    'div',
    {
      className: 'screen title-screen' + (active ? ' active' : ''),
      onClick: (e: MouseEvent) => {
        // Only trigger START if click is not on a button
        const target = e.target as HTMLElement
        if (!target.closest('button, input, select, a')) {
          actor.send({ type: 'START' })
        }
      },
    },
    h(
      Button,
      {
        className: 'title-settings-btn',
        onClick: (e: MouseEvent) => { e.stopPropagation(); onSettings() },
        'aria-label': 'Settings',
      },
      '⚙️',
    ),
    h('h1', { ref: heading, className: 'title-heading' },
      ...logoLetters.map((ch, i) =>
        h('span', { key: i, className: 'title-letter' },
          ch === ' ' ? ' ' : ch,
        )
      )
    ),
    // Diorama Pass v1.7: empty grow-element creates a clear band between
    // the logo and the bottom DOM stack so the 3D bird mascot has room
    // to read on both desktop and mobile aspect ratios.
    h('div', { className: 'title-bird-zone', 'aria-hidden': 'true' }),
    h(ModePicker, { mode, onModeChange }),
    mode === 'daily' ? (() => {
      const attempt = storage.getDailyAttempt(todayDate())
      return attempt !== null
        ? h('p', { className: 'daily-stats' }, `Today's best: ${attempt.best} (${attempt.count} attempt${attempt.count === 1 ? '' : 's'})`)
        : h('p', { className: 'daily-stats' }, 'First attempt today')
    })() : null,
    h(
      'div',
      { style: 'margin: 8px 0 16px; width: 100%; max-width: 300px;' },
      h(LeaderboardList, { entries: leaderboard, max: 3 }),
    ),
    h('p', { className: 'title-cta' + (reducedMotion ? '' : ' pulse') }, 'Tap anywhere to start'),
    (showInstall && leaderboard.length >= 1)
      ? h(Button, {
          className: 'install-cta',
          onClick: (e: MouseEvent) => { e.stopPropagation(); onInstall?.() },
        }, 'Install App →')
      : null,
  )
}
