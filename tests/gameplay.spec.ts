import { test, expect } from '@playwright/test'
import { createActor } from 'xstate'
import { gameMachine, type GameMode } from '../src/machine/gameMachine'
import { CollisionSystem } from '../src/systems/CollisionSystem'
import type { Bird } from '../src/entities/Bird'
import { ObjectPool } from '../src/pools/ObjectPool'
import type { ObstaclePair } from '../src/entities/ObstaclePair'

test('body-sized collision allows clearance and rounded corners, but hits pipe faces, caps and floor', () => {
  const actor = createActor(gameMachine, { input: { bestScore: 0 } }).start()
  const bird = { position: { y: 0 } } as Bird
  const pool = new ObjectPool(() => ({ z: 0, gapCenterY: 0, gapHeight: 2.6 }) as ObstaclePair, 1)
  const pipe = pool.acquire()!
  const collision = new CollisionSystem(bird, pool, actor)
  const cases = [
    { y: 1.05, z: 0, hit: false }, // Visible body clears the top lip.
    { y: -1.05, z: 0, hit: false },
    { y: 1.08, z: 1.03, hit: false }, // Rounded body clears the cap corner.
    { y: -1.08, z: 1.03, hit: false },
    { y: 2, z: 0.95, hit: false }, // Clear of the narrower shaft.
    { y: 1.15, z: 0, hit: true },
    { y: -1.15, z: 0, hit: true },
    { y: 1.45, z: 1.05, hit: true }, // Cap is wider than the shaft.
    { y: 2, z: 0.9, hit: true },
    { y: -3.75, z: 10, hit: false },
    { y: -3.77, z: 10, hit: true },
  ]
  for (const sample of cases) {
    const round = createActor(gameMachine, { input: { bestScore: 0 } }).start()
    round.send({ type: 'START' })
    bird.position.y = sample.y
    pipe.z = sample.z
    const system = new CollisionSystem(bird, pool, round)
    system.step(1 / 60)
    expect(round.getSnapshot().value !== 'playing', JSON.stringify(sample)).toBe(sample.hit)
    round.stop()
  }
  // Title and pause never collide.
  bird.position.y = -5
  collision.step(1 / 60)
  expect(actor.getSnapshot().value).toBe('title')
  actor.send({ type: 'START' }); actor.send({ type: 'PAUSE' })
  collision.step(1 / 60)
  expect(actor.getSnapshot().value).toBe('paused')
  actor.stop()
})

test('one hit ends each mode, score milestones do not add lives, and restart resets only the round', async () => {
  for (const mode of ['endless', 'daily', 'timeAttack'] as GameMode[]) {
    const actor = createActor(gameMachine, { input: { bestScore: 3, mode } }).start()
    actor.send({ type: 'START' })
    for (let i = 0; i < 5; i++) actor.send({ type: 'SCORE' })
    expect(actor.getSnapshot().context).not.toHaveProperty('lives')
    actor.send({ type: 'HIT' })
    expect(actor.getSnapshot().value).toBe('dying')
    await expect.poll(() => actor.getSnapshot().value).toBe('gameOver')
    expect(actor.getSnapshot().context.bestScore).toBe(5)
    actor.send({ type: 'RESTART' })
    expect(actor.getSnapshot().value).toBe('playing')
    expect(actor.getSnapshot().context).toMatchObject({ score: 0, bestScore: 5, mode })
    actor.stop()
  }
})
