import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const draws = new Map<HTMLCanvasElement, number>()
    ;(window as any).draws = draws
    const sounds = new Set<AudioBufferSourceNode>()
    ;(window as any).sounds = sounds
    const start = AudioBufferSourceNode.prototype.start
    const stop = AudioBufferSourceNode.prototype.stop
    AudioBufferSourceNode.prototype.start = function (...args) {
      sounds.add(this)
      this.addEventListener('ended', () => sounds.delete(this), { once: true })
      return start.apply(this, args)
    }
    AudioBufferSourceNode.prototype.stop = function (...args) {
      sounds.delete(this)
      return stop.apply(this, args)
    }
    const gains: GainNode[] = []
    ;(window as any).gains = gains
    const createGain = AudioContext.prototype.createGain
    AudioContext.prototype.createGain = function () {
      const gain = createGain.call(this)
      gains.push(gain)
      return gain
    }
    for (const name of ['drawElements', 'drawArrays'] as const) {
      const original = WebGL2RenderingContext.prototype[name]
      ;(WebGL2RenderingContext.prototype as any)[name] = function (...args: any[]) {
        draws.set(this.canvas, (draws.get(this.canvas) ?? 0) + 1)
        return (original as any).apply(this, args)
      }
    }
  })
})

test('cross-origin component registers and renders a ready game', async ({ page }) => {
  await page.goto('/')
  await expect.poll(() => page.evaluate(() => Boolean(customElements.get('pma-flappy')))).toBe(true)
  await expect(page.locator('pma-flappy .title-screen.active')).toBeVisible()
  expect(await page.evaluate(() => (window as any).gameEvents)).toContainEqual({ name: 'pma-ready', detail: { gameId: 'flappy' }, bubbles: true, composed: true })
  await expect.poll(() => page.evaluate(() => [...(window as any).draws.values()].reduce((a: number, b: number) => a + b, 0))).toBeGreaterThan(0)
})

test('plays, pauses, restarts, isolates host keys and saves, loads remote audio without a host SW', async ({ page }, testInfo) => {
  const audio: string[] = []
  const errors: string[] = []
  page.on('request', request => { if (request.url().endsWith('.mp3')) audio.push(request.url()) })
  page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => localStorage.setItem('flappy-3d:v1', 'standalone sentinel'))
  await page.goto('/')
  const game = page.locator('pma-flappy')
  await expect(game.locator('.title-screen.active')).toBeVisible()
  await page.locator('#host-text').fill('space c Enter Escape')
  for (const key of ['Space', 'c', 'Enter', 'Escape']) await page.keyboard.press(key)
  await expect(page.locator('#host-text')).toHaveValue('space c Enter Escape c')
  await expect(game.locator('.title-screen.active')).toBeVisible()
  await game.getByRole('button', { name: 'Settings', exact: true }).click()
  const master = game.getByRole('slider', { name: '🔊 Master', exact: true })
  await master.fill('0')
  expect(await page.evaluate(() => (window as any).gains[0].gain.value)).toBe(1)
  await master.fill('0.7')
  const views = game.getByRole('group', { name: 'Camera view', exact: true })
  await expect(views.getByRole('button', { name: 'side', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await views.getByRole('button', { name: 'far', exact: true }).click()
  await page.keyboard.press('c')
  await expect(views.getByRole('button', { name: 'far', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await game.getByRole('button', { name: 'Close settings' }).click()
  await game.locator('.title-heading').click()
  await expect(game.locator('.hud-screen.active')).toBeVisible()
  await expect.poll(() => page.evaluate(() => (window as any).sounds.size)).toBeGreaterThan(0)
  await page.keyboard.press('Space')
  await game.evaluate((el: any) => el.pause())
  await expect(game.locator('.pause-screen.active')).toBeVisible()
  await page.locator('#host-text').click()
  for (const key of ['Space', 'c', 'Enter', 'Escape']) await page.keyboard.press(key)
  await expect(game.locator('.pause-screen.active')).toBeVisible()
  await game.getByRole('button', { name: 'Resume', exact: true }).click()
  await expect(game.locator('.hud-screen.active')).toBeVisible()
  await page.locator('#host-text').click()
  await expect(game.locator('.pause-screen.active')).toBeVisible()
  await game.getByRole('button', { name: 'Resume', exact: true }).click()
  await expect(game.locator('.gameover-screen.active')).toBeVisible({ timeout: 20_000 })
  const rounds = await page.evaluate(() => (window as any).gameEvents.filter((e: any) => e.name === 'pma-round-ended'))
  expect(rounds).toHaveLength(1)
  expect(rounds[0]).toEqual({ name: 'pma-round-ended', detail: { gameId: 'flappy', mode: 'endless', score: 0 }, bubbles: true, composed: true })
  await game.getByRole('button', { name: 'Restart', exact: true }).click()
  await expect(game.locator('.hud-screen.active')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('desktop-gameplay.png') })
  expect(audio).toHaveLength(4)
  expect(audio.every(url => url.startsWith('http://127.0.0.1:5205/audio/'))).toBe(true)
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0)
  expect(await page.evaluate(() => localStorage.getItem('flappy-3d:v1'))).toBe('standalone sentinel')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pma:flappy:v1')!).settings.cameraView)).toBe('far')
  expect(errors).toEqual([])
})

test('ten disconnect/reconnects stop detached WebGL rendering, including respawn and menu animations', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto('/')
  const game = page.locator('pma-flappy')
  await expect(game.locator('.title-screen.active')).toBeVisible()
  for (let cycle = 0; cycle < 10; cycle++) {
    if (cycle % 2 === 0) {
      await game.locator('.title-heading').click()
      await expect(game.getByRole('status', { name: '2 lives remaining' })).toBeVisible({ timeout: 10_000 })
    }
    await game.evaluate((el: any) => { (window as any).detached = el; el.remove() })
    const draws = await page.evaluate(() => [...(window as any).draws.values()])
    await page.waitForTimeout(1600)
    expect(await page.evaluate(() => [...(window as any).draws.values()])).toEqual(draws)
    expect(await page.evaluate(() => (window as any).sounds.size)).toBe(0)
    await page.evaluate(() => document.querySelector('#slot')!.append((window as any).detached))
    await expect(game.locator('.title-screen.active')).toBeVisible()
    expect(await game.locator('canvas').count()).toBe(1)
    await expect.poll(() => page.evaluate(() => {
      const canvas = document.querySelector('pma-flappy')!.shadowRoot!.querySelector('canvas')
      return (window as any).draws.get(canvas) ?? 0
    })).toBeGreaterThan(0)
  }
  expect(await page.evaluate(() => (window as any).gameEvents.filter((e: any) => e.name === 'pma-ready').length)).toBe(11)
  expect(errors).toEqual([])
})

test('portrait layout, resized canvas, native settings and fullscreen remain usable', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const game = page.locator('pma-flappy')
  await expect(game.locator('.title-screen.active')).toBeVisible()
  await page.waitForTimeout(1000)
  await page.screenshot({ path: testInfo.outputPath('mobile-title.png') })
  await game.getByRole('button', { name: 'Settings', exact: true }).click()
  const dialog = game.locator('dialog')
  await expect(dialog).toBeVisible()
  const box = await dialog.boundingBox()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.y + box!.height).toBeLessThanOrEqual(844)
  await game.getByRole('group', { name: 'Camera view', exact: true }).getByRole('button', { name: 'side', exact: true }).click()
  await game.getByRole('button', { name: 'Close settings' }).click()
  await page.locator('#slot').evaluate(el => { el.style.width = '300px'; el.style.height = '480px' })
  await expect.poll(() => game.locator('canvas').evaluate(c => [c.width, c.height])).toEqual([300, 480])
  await page.getByRole('button', { name: 'Fullscreen', exact: true }).click()
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.id)).toBe('slot')
  await page.evaluate(() => document.exitFullscreen())
  await game.locator('.title-heading').click()
  await expect(game.locator('.hud-screen.active')).toBeVisible()
  await game.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect(game.locator('.pause-screen.active')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('mobile-pause.png') })
})

test('unsupported WebGL emits a recoverable error and reconnect retries', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext
    ;(window as any).restoreWebGL = () => { HTMLCanvasElement.prototype.getContext = getContext }
    ;(HTMLCanvasElement.prototype as any).getContext = function (type: string, ...args: any[]) {
      return type === 'webgl2' ? null : (getContext as any).call(this, type, ...args)
    }
  })
  await page.goto('/')
  await expect.poll(() => page.evaluate(() => (window as any).gameEvents.some((e: any) => e.name === 'pma-error'))).toBe(true)
  expect(await page.evaluate(() => (window as any).gameEvents[0])).toMatchObject({ name: 'pma-error', detail: { gameId: 'flappy' }, bubbles: true, composed: true })
  await page.evaluate(() => {
    ;(window as any).restoreWebGL()
    const el = document.querySelector('pma-flappy')!
    el.remove()
    document.querySelector('#slot')!.append(el)
  })
  await expect(page.locator('pma-flappy .title-screen.active')).toBeVisible()
})

test('custom image renders and mode/settings survive a clean reconnect', async ({ page }, testInfo) => {
  await page.goto('/')
  const game = page.locator('pma-flappy')
  await game.getByRole('button', { name: 'Settings', exact: true }).click()
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 32
    const context = canvas.getContext('2d')!
    context.fillStyle = '#ff00ff'
    context.fillRect(0, 0, 32, 32)
    return canvas.toDataURL().split(',')[1]!
  })
  await game.locator('input[type=file]').setInputFiles({ name: 'bird.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') })
  await game.getByRole('button', { name: 'Close settings' }).click()
  await expect.poll(async () => {
    const screenshot = await game.screenshot()
    return page.evaluate(async base64 => {
      const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob())
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width; canvas.height = bitmap.height
      const context = canvas.getContext('2d')!
      context.drawImage(bitmap, 0, 0); bitmap.close()
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
      let count = 0
      for (let i = 0; i < data.length; i += 4) if (data[i]! > 200 && data[i + 1]! < 80 && data[i + 2]! > 200) count++
      return count
    }, screenshot.toString('base64'))
  }).toBeGreaterThan(100)
  await page.screenshot({ path: testInfo.outputPath('custom-skin.png') })
  await game.getByRole('button', { name: 'Time-Attack', exact: true }).click()
  await game.locator('.title-heading').click()
  await expect(game.locator('.hud-timer')).toBeVisible()
  await game.evaluate((el: any) => el.pause())
  await game.getByRole('button', { name: 'Back to Title', exact: true }).click()
  await game.getByRole('button', { name: 'Daily', exact: true }).click()
  await game.evaluate(el => { el.remove(); document.querySelector('#slot')!.append(el) })
  await expect(game.getByRole('button', { name: 'Daily', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await game.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(game.getByRole('button', { name: 'Clear', exact: true })).toBeVisible()
})

test('a setup failure disposes the already-created engine before retry', async ({ page }) => {
  await page.addInitScript(() => {
    const observer = window.ResizeObserver
    ;(window as any).restoreResize = () => { window.ResizeObserver = observer }
    window.ResizeObserver = class { constructor() { throw new Error('Injected resize setup failure') } } as any
  })
  await page.goto('/')
  await expect.poll(() => page.evaluate(() => (window as any).gameEvents[0]?.detail.message)).toBe('Injected resize setup failure')
  await page.evaluate(() => {
    ;(window as any).restoreResize()
    const el = document.querySelector('pma-flappy')!
    el.remove(); document.querySelector('#slot')!.append(el)
  })
  await expect(page.locator('pma-flappy .title-screen.active')).toBeVisible()
})
