import { h } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import type { Actor } from 'xstate'
import type { gameMachine, GameMode } from '../../machine/gameMachine'
import { MAX_LIVES } from '../../machine/gameMachine'
import type { TimerSystem } from '../../systems/TimerSystem'
import { Button } from '../components/Button'
import { TimerDisplay } from '../components/TimerDisplay'

type GameActor = Actor<typeof gameMachine>

interface Props {
  active: boolean
  actor: GameActor
  score: number
  lives: number
  onPause: () => void
  mode: GameMode
  timerSystem: TimerSystem | null
}

export function HUD({ active, actor: _actor, score, lives, onPause, mode, timerSystem }: Props) {
  const [displayScore, setDisplayScore] = useState(score)
  const [popping, setPopping] = useState(false)
  const popTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // v1.9: animate hearts on lives change. Track which transition fired
  // (gain vs lose) and apply a one-shot CSS class on the affected slot.
  const [prevLives, setPrevLives] = useState(lives)
  const [heartFx, setHeartFx] = useState<{ index: number; kind: 'gain' | 'lose' } | null>(null)
  const heartTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let frame = 0
    if (score !== displayScore) {
      setDisplayScore(score)
      setPopping(false)
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          setPopping(true)
          if (popTimer.current !== null) clearTimeout(popTimer.current)
          popTimer.current = setTimeout(() => setPopping(false), 280)
        })
      })
    }
    return () => {
      cancelAnimationFrame(frame)
      if (popTimer.current !== null) clearTimeout(popTimer.current)
    }
  }, [score])

  useEffect(() => {
    if (lives === prevLives) return
    if (lives > prevLives) {
      // Gain — animate the new (rightmost added) heart
      setHeartFx({ index: lives - 1, kind: 'gain' })
    } else {
      // Lose — animate the heart at the slot just removed (was prevLives - 1)
      setHeartFx({ index: prevLives - 1, kind: 'lose' })
    }
    setPrevLives(lives)
    if (heartTimer.current !== null) clearTimeout(heartTimer.current)
    heartTimer.current = setTimeout(() => setHeartFx(null), 600)
    return () => {
      if (heartTimer.current !== null) clearTimeout(heartTimer.current)
    }
  }, [lives])

  // Render up to MAX_LIVES heart slots; filled or empty per current count
  const heartSlots = Array.from({ length: MAX_LIVES }, (_, i) => {
    const filled = i < lives
    const fxKind = heartFx?.index === i ? heartFx.kind : null
    const cls =
      'hud-heart' +
      (filled ? ' filled' : ' empty') +
      (fxKind === 'gain' ? ' fx-gain' : '') +
      (fxKind === 'lose' ? ' fx-lose' : '')
    return h('span', { key: i, className: cls, 'aria-hidden': 'true' }, filled ? '❤️' : '🖤')
  })

  return h(
    'div',
    { className: 'hud-screen' + (active ? ' active' : '') },
    h(
      'div',
      {
        className: 'hud-score' + (popping ? ' score-pop' : ''),
        'aria-live': 'polite',
        'aria-atomic': 'true',
      },
      displayScore,
    ),
    h(
      'div',
      { className: 'hud-hearts', role: 'status', 'aria-label': `${lives} lives remaining` },
      ...heartSlots,
    ),
    mode === 'timeAttack' && timerSystem !== null
      ? h(TimerDisplay, { timerSystem })
      : null,
    h(Button, { className: 'hud-pause-btn', onClick: onPause, 'aria-label': 'Pause' }, '⏸'),
  )
}
