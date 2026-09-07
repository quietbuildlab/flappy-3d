import { test, expect } from '@playwright/test'

test.use({ baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5205/flappy-3d/' })

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const events: unknown[] = []
    ;(window as any).inputTrace = events
    for (const name of ['pointerdown', 'click', 'focusout']) document.addEventListener(name, event => {
      events.push({ time: performance.now(), name, target: (event.target as Element)?.className, active: [...document.querySelectorAll('.screen.active, .hud-screen.active')].map(el => el.className) })
    }, true)
  })
})

test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus) console.log('Native input trace:', JSON.stringify(await page.evaluate(() => ({ events: (window as any).inputTrace, active: [...document.querySelectorAll('.screen.active, .hud-screen.active')].map(el => el.className) }))))
})

test('clicking start launches the bird just like Space does', async ({ page }) => {
  await page.goto('./')
  await expect(page.locator('.title-screen.active')).toBeVisible()
  await page.waitForTimeout(1200)
  await page.locator('.title-heading').click()
  const pauseButton = await page.getByRole('button', { name: 'Pause', exact: true }).boundingBox()
  expect(pauseButton).not.toBeNull()
  // A click should launch, not drop straight into the floor before the next tap.
  await page.waitForTimeout(650)
  await page.mouse.click(pauseButton!.x + pauseButton!.width / 2, pauseButton!.y + pauseButton!.height / 2)
  await expect(page.locator('.pause-screen.active')).toBeVisible()
})

for (const [name, viewport] of Object.entries({
  desktop: { width: 1280, height: 720 },
  mobile: { width: 390, height: 664 },
})) {
  test.describe(`Cream chrome — ${name}`, () => {
    test.use({ viewport, hasTouch: name === 'mobile', isMobile: name === 'mobile' })

    test('settings, play, pause, full results, and restart remain usable', async ({ page }, testInfo) => {
      test.setTimeout(45_000)
      await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') })
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto('./')
      await expect(page.locator('.title-screen.active')).toBeVisible()
      await page.waitForTimeout(1200) // Let the existing staggered logo entrance finish before capture.
      await page.screenshot({ path: testInfo.outputPath('menu.png') })
      await page.getByRole('button', { name: 'Settings', exact: true }).click()
      const settings = page.locator('dialog.settings-modal')
      await expect(settings).toBeVisible()
      await settings.getByRole('button', { name: 'hard', exact: true }).click()
      await expect(settings.getByRole('button', { name: 'hard', exact: true })).toHaveAttribute('aria-pressed', 'true')
      for (const toggle of await settings.getByRole('switch').all()) {
        const box = await toggle.boundingBox()
        expect(box!.height).toBeGreaterThanOrEqual(44)
      }
      await page.screenshot({ path: testInfo.outputPath('settings.png') })
      await page.keyboard.press('Escape')
      await expect(settings).toHaveCount(0)

      // Existing persisted data exercises the longest result layout; no game-state hooks.
      await page.evaluate(() => {
        const save = JSON.parse(localStorage.getItem('flappy-3d:v1')!)
        save.bestScore = 99
        save.leaderboardByMode.endless = [99, 80, 60, 40, 20].map(score => ({ score, ts: Date.now() }))
        localStorage.setItem('flappy-3d:v1', JSON.stringify(save))
      })
      await page.reload()
      await expect(page.locator('.title-screen.active')).toBeVisible()
      // As on the first launch, let the title entrance and initial render finish.
      await expect(page.locator('.title-letter').last()).toHaveCSS('opacity', '1')
      const title = await page.locator('.title-heading').boundingBox()
      expect(title).not.toBeNull()
      // CI can spend seconds locating the HUD. Hold this layout setup's time
      // so it checks Pause before a natural collision; resume real time below.
      await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'))
      await page.mouse.click(title!.x + title!.width / 2, title!.y + title!.height / 2)
      await page.clock.runFor(32)
      await expect(page.locator('.hud-screen.active')).toBeVisible()
      // Send native pointer input to the fixed HUD button's observed bounds.
      const pauseButton = await page.getByRole('button', { name: 'Pause', exact: true }).boundingBox()
      expect(pauseButton).not.toBeNull()
      await page.mouse.click(pauseButton!.x + pauseButton!.width / 2, pauseButton!.y + pauseButton!.height / 2)
      await page.clock.runFor(200)
      await expect(page.locator('.pause-screen.active .result-card')).toBeVisible()
      await page.clock.resume()
      await page.waitForTimeout(200) // Capture after the overlay crossfade.
      await page.screenshot({ path: testInfo.outputPath('pause.png') })
      await page.getByRole('button', { name: 'Resume', exact: true }).click()
      await expect(page.locator('.hud-screen.active')).toBeVisible()
      await page.waitForTimeout(200)
      await page.screenshot({ path: testInfo.outputPath('play.png') })

      // The first floor collision ends the round; no hearts or respawn.
      await expect(page.locator('.hud-hearts')).toHaveCount(0)
      const results = page.locator('.gameover-screen.active')
      await expect(results).toBeVisible({ timeout: 5_000 })
      await expect(results.locator('.leaderboard-item')).toHaveCount(5)
      if (name === 'mobile') await page.setViewportSize({ width: 320, height: 568 })
      const card = await results.locator('.result-card').boundingBox()
      expect(card!.x).toBeGreaterThanOrEqual(16)
      expect(card!.x + card!.width).toBeLessThanOrEqual(name === 'mobile' ? 304 : viewport.width - 16)
      for (const button of await results.getByRole('button').all()) {
        const box = await button.boundingBox()
        expect(box!.x).toBeGreaterThanOrEqual(card!.x)
        expect(box!.x + box!.width).toBeLessThanOrEqual(card!.x + card!.width)
        expect(box!.y + box!.height).toBeLessThanOrEqual(card!.y + card!.height)
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
      await page.screenshot({ path: testInfo.outputPath('results.png') })
      await results.getByRole('button', { name: 'Restart', exact: true }).scrollIntoViewIfNeeded()
      await page.screenshot({ path: testInfo.outputPath('results-actions.png') })
      await results.getByRole('button', { name: 'Restart', exact: true }).click()
      await expect(page.locator('.hud-screen.active')).toBeVisible()
      expect(errors).toEqual([])
    })
  })
}
