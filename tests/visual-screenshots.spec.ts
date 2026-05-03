import { test, devices } from '@playwright/test'
import * as path from 'path'

// Visual screenshots — captures title + gameplay framing in two viewports
// (desktop + mobile) for visual review. NOT snapshot-comparison; produces
// PNGs in tests/screenshots/ as artifacts so we can spot-check framing
// after layout / world-layer changes.
//
// To regenerate:
//   npx playwright test tests/visual-screenshots.spec.ts
// Output: tests/screenshots/{viewport}-{state}.png

const URL = 'https://quietbuildlab.github.io/flappy-3d/'
const OUT_DIR = path.join(process.cwd(), 'tests', 'screenshots')

const viewports = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'mobile', ...devices['iPhone 13'].viewport },
] as const

for (const vp of viewports) {
  test.describe(`Visual — ${vp.name} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } })

    test('title screen framing', async ({ page }) => {
      await page.goto(URL, { waitUntil: 'networkidle' })
      await page.evaluate(() => localStorage.removeItem('flappy-3d:v1'))
      await page.reload({ waitUntil: 'networkidle' })
      // Let title bird settle into mascot position + bob, demo pipes spawn
      await page.waitForSelector('.title-settings-btn', { state: 'visible', timeout: 15000 })
      await page.waitForTimeout(2000)
      await page.screenshot({
        path: path.join(OUT_DIR, `${vp.name}-title.png`),
        fullPage: false,
      })
    })

    test('gameplay framing', async ({ page }) => {
      await page.goto(URL, { waitUntil: 'networkidle' })
      await page.evaluate(() => localStorage.removeItem('flappy-3d:v1'))
      await page.reload({ waitUntil: 'networkidle' })
      await page.waitForSelector('#scene', { state: 'visible' })
      await page.waitForTimeout(800)  // let UI mount
      // Start round via Space key — InputManager listens on window for ' '
      // and triggers a flap; on title state that sends START.
      await page.keyboard.press('Space')
      // Flap a couple more times so the bird stays mid-air for the shot
      await page.keyboard.press('Space')
      await page.waitForTimeout(900)
      await page.keyboard.press('Space')
      await page.waitForTimeout(700)
      await page.screenshot({
        path: path.join(OUT_DIR, `${vp.name}-gameplay.png`),
        fullPage: false,
      })
    })
  })
}
