import { h } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import type { Actor } from 'xstate'
import type { gameMachine, GameMode } from '../../machine/gameMachine'
import type { TimerSystem } from '../../systems/TimerSystem'
import { Button } from '../components/Button'
import { TimerDisplay } from '../components/TimerDisplay'

type GameActor = Actor<typeof gameMachine>

interface Props {
  active: boolean
  actor: GameActor
  score: number
  onPause: () => void
  mode: GameMode
  timerSystem: TimerSystem | null
}

export function HUD({ active, actor: _actor, score, onPause, mode, timerSystem }: Props) {
  const [displayScore, setDisplayScore] = useState(score)
  const [popping, setPopping] = useState(false)
  const popTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    mode === 'timeAttack' && timerSystem !== null
      ? h(TimerDisplay, { timerSystem })
      : null,
    h(Button, { className: 'hud-pause-btn', onClick: onPause, 'aria-label': 'Pause' }, '⏸'),
  )
}
