import { h } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import type { Actor } from 'xstate'
import type { gameMachine, GameMode } from '../../machine/gameMachine'
import type { LeaderboardEntry } from '../../storage/StorageManager'
import { todayDate } from '../../utils/rng'
import { Button } from '../components/Button'
import { LeaderboardList } from '../components/LeaderboardList'
import { NewBestBadge } from '../components/NewBestBadge'

type GameActor = Actor<typeof gameMachine>

interface Props {
  active: boolean
  actor: GameActor
  score: number
  priorBest: number
  leaderboard: LeaderboardEntry[]
  mode: GameMode
}

export function GameOverScreen({ active, actor, score, priorBest, leaderboard, mode }: Props) {
  const isNewBest = score > 0 && score > priorBest
  const [copyLabel, setCopyLabel] = useState<'Share' | 'Copied!'>('Share')

  useEffect(() => {
    const ac = new AbortController()
    const handleKey = (e: KeyboardEvent) => {
      if (!active) return
      if (e.key === 'Escape' || e.key === 'Enter') {
        actor.send({ type: 'RESTART' })
      }
    }
    document.addEventListener('keydown', handleKey, { signal: ac.signal })
    return () => ac.abort()
  }, [active, actor])

  return h(
    'div',
    {
      className: 'screen gameover-screen' + (active ? ' active' : ''),
      onClick: (e: MouseEvent) => {
        const target = e.target as HTMLElement
        if (target.tagName !== 'BUTTON') {
          actor.send({ type: 'RESTART' })
        }
      },
    },
    h('div', { className: 'result-card' },
      h('h2', { className: 'gameover-heading' }, 'Game Over'),
      h('div', {
        className: 'gameover-score',
        'aria-live': 'polite',
        'aria-atomic': 'true',
      }, score),
      isNewBest ? h(NewBestBadge, null) : h('p', { className: 'gameover-pb' }, 'Best: ' + priorBest),
      h('div', { style: 'margin: 8px 0; width: 100%; max-width: 300px;' },
        h(LeaderboardList, { entries: leaderboard, max: 5 }),
      ),
      h('p', { className: 'gameover-cta' }, 'Tap to restart'),
      h(
        'div',
        { className: 'btn-row' },
        h(Button, { onClick: (e: MouseEvent) => { e.stopPropagation(); actor.send({ type: 'RESTART' }) } }, 'Restart'),
        h(Button, { onClick: (e: MouseEvent) => { e.stopPropagation(); actor.send({ type: 'START' }) } }, 'Back to Title'),
        mode === 'daily' ? h(Button, {
          onClick: (e: MouseEvent) => {
            e.stopPropagation()
            const text = `Daily ${todayDate()}: ${score} 🐦`
            if (navigator.clipboard) {
              navigator.clipboard.writeText(text).then(() => {
                setCopyLabel('Copied!')
                setTimeout(() => setCopyLabel('Share'), 2000)
              }).catch(() => { /* silent */ })
            }
          },
        }, copyLabel) : null,
      ),
    ),
  )
}
