import { test, expect } from '@playwright/test'

test.use({ baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5205/flappy-3d/' })

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
      await page.locator('.title-heading').click()
      await expect(page.locator('.hud-screen.active')).toBeVisible()
      // Send a real pointer click without waiting extra render frames while
      // gravity runs. The fixed HUD button's current bounds locate the target.
      const pauseButton = await page.getByRole('button', { name: 'Pause', exact: true }).boundingBox()
      expect(pauseButton).not.toBeNull()
      await page.mouse.click(pauseButton!.x + pauseButton!.width / 2, pauseButton!.y + pauseButton!.height / 2)
      await expect(page.locator('.pause-screen.active .result-card')).toBeVisible()
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
