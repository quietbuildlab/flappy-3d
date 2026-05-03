import { test, expect, devices } from '@playwright/test'

// Phase 19 OPS-02: visual regression for the DOM overlay at title state.
// Uses Playwright's toHaveScreenshot golden-image comparison. The canvas
// (#scene) is MASKED to avoid 3D non-determinism (bird bob phase, demo
// pipe gap-center randomness, depth-event balloon timer); only the DOM
// composition is compared.
//
// Baselines live in tests/visual-regression.spec.ts-snapshots/.
// To accept new layout intentionally:
//   npx playwright test tests/visual-regression.spec.ts --update-snapshots

const URL = 'https://quietbuildlab.github.io/flappy-3d/'

const viewports = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'mobile', ...devices['iPhone 13'].viewport },
] as const

for (const vp of viewports) {
  test.describe(`Regression — ${vp.name} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } })

    test(`title DOM overlay`, async ({ page }) => {
      await page.goto(URL, { waitUntil: 'networkidle' })
      await page.evaluate(() => localStorage.removeItem('flappy-3d:v1'))
      // Reduce motion ON so any DOM transitions (CTA pulse, etc.) are stilled
      await page.evaluate(() => {
        const v5 = {
          schemaVersion: 5, bestScore: 0,
          settings: {
            sound: false, music: false, reduceMotion: 'on', palette: 'default',
            flapTrail: false, lastMode: 'endless', cameraBob: false,
            difficulty: 'easy', birdShape: 'sphere', birdImage: null,
            quality: 'auto', unlocks: ['sphere'],
          },
          leaderboardByMode: { endless: [], timeAttack: [], daily: [] },
          dailyAttempts: {},
        }
        localStorage.setItem('flappy-3d:v1', JSON.stringify(v5))
      })
      await page.reload({ waitUntil: 'networkidle' })
      await page.waitForSelector('.title-settings-btn', { state: 'visible', timeout: 15000 })
      await page.waitForTimeout(800)  // let UI mount + settle

      await expect(page).toHaveScreenshot(`title-${vp.name}.png`, {
        // Mask the 3D canvas so non-deterministic motion doesn't cause flakes
        mask: [page.locator('#scene')],
        // Allow up to 1% pixel diff for font sub-pixel + filter variance
        maxDiffPixelRatio: 0.01,
        // Capture only the visible viewport, not the full document
        fullPage: false,
      })
    })
  })
}
