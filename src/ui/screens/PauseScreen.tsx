import { h } from 'preact'
import type { Actor } from 'xstate'
import type { gameMachine } from '../../machine/gameMachine'
import { Button } from '../components/Button'

type GameActor = Actor<typeof gameMachine>

interface Props {
  active: boolean
  actor: GameActor
}

export function PauseScreen({ active, actor }: Props) {

  return h(
    'div',
    { className: 'screen pause-screen' + (active ? ' active' : '') },
    h('div', { className: 'result-card' },
      h('h2', { className: 'pause-heading' }, 'Paused'),
      h(
        'div',
        { className: 'btn-row' },
        h(Button, { onClick: () => actor.send({ type: 'RESUME' }) }, 'Resume'),
        h(Button, { onClick: () => actor.send({ type: 'START' }) }, 'Back to Title'),
      ),
    ),
  )
}
