import { test, expect } from '@playwright/test'

const URL = 'https://quietbuildlab.github.io/flappy-3d/'

// v1.5 — Approachability UAT: difficulty presets + bird customization.
// Code-level structural checks against the deployed bundle. Visual quality
// (does the cube actually look like a cube? is Easy actually easier?)
// is in 16-HUMAN-UAT.md / 17-HUMAN-UAT.md.

async function openSettings(page: import('@playwright/test').Page) {
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.removeItem('flappy-3d:v1'))
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('.title-settings-btn', { state: 'visible', timeout: 15000 })
  await page.locator('.title-settings-btn').evaluate((el) => (el as HTMLButtonElement).click())
  // Wait for the Difficulty row to render (Settings is open)
  await expect(page.locator('text=Difficulty')).toBeVisible({ timeout: 5000 })
}

test.describe('Flappy 3D — v1.5 UAT (Approachability + Customization)', () => {
  test('Phase 16 — Difficulty defaults to Easy on fresh install (UI state)', async ({ page }) => {
    await openSettings(page)
    const easyBtn = page.locator('.settings-picker[aria-label="Difficulty preset"]').locator('button:has-text("Easy")')
    await expect(easyBtn).toHaveAttribute('aria-pressed', 'true')
  })

  test('Phase 16 — Difficulty toggle persists Hard preset', async ({ page }) => {
    await openSettings(page)
    await page.locator('.settings-picker[aria-label="Difficulty preset"]').locator('button:has-text("Hard")')
      .evaluate((el) => (el as HTMLButtonElement).click())
    await page.waitForTimeout(120)
    const persisted = await page.evaluate(() => {
      const raw = localStorage.getItem('flappy-3d:v1')
      return raw ? JSON.parse(raw)?.settings?.difficulty : null
    })
    expect(persisted).toBe('hard')
  })

  test('Phase 17 — Bird shape defaults to sphere (UI state)', async ({ page }) => {
    await openSettings(page)
    const sphereBtn = page.locator('.settings-picker-shapes').locator('button:has-text("Sphere")')
    await expect(sphereBtn).toHaveAttribute('aria-pressed', 'true')
  })

  test('Phase 17 — Bird shape persists when changed to Cube', async ({ page }) => {
    // v1.8 Phase 18: cube is now locked-by-default. Plant a v5 save with
    // cube already unlocked so the test can verify shape switching itself
    // (independent of the unlock mechanism, which is covered in v1.8 UAT).
    await page.goto(URL, { waitUntil: 'networkidle' })
    await page.evaluate(() => {
      const v5 = {
        schemaVersion: 5, bestScore: 0,
        settings: {
          sound: true, music: true, reduceMotion: 'auto', palette: 'default',
          flapTrail: false, lastMode: 'endless', cameraBob: false,
          difficulty: 'easy', birdShape: 'sphere', birdImage: null,
          quality: 'auto', unlocks: ['sphere', 'cube'],
          volumeMaster: 0.7, volumeMusic: 0.4, volumeSfx: 0.6,
        },
        leaderboardByMode: { endless: [], timeAttack: [], daily: [] },
        dailyAttempts: {},
      }
      localStorage.setItem('flappy-3d:v1', JSON.stringify(v5))
    })
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForSelector('.title-settings-btn', { state: 'visible', timeout: 15000 })
    await page.locator('.title-settings-btn').evaluate((el) => (el as HTMLButtonElement).click())
    await expect(page.locator('text=Difficulty')).toBeVisible({ timeout: 5000 })

    const shapePicker = page.locator('.settings-picker-shapes').first()
    await shapePicker.locator('button:has-text("Cube")').evaluate((el) => (el as HTMLButtonElement).click())
    await page.waitForTimeout(120)
    const persisted = await page.evaluate(() => {
      const raw = localStorage.getItem('flappy-3d:v1')
      return raw ? JSON.parse(raw)?.settings?.birdShape : null
    })
    expect(persisted).toBe('cube')
  })

  test('Phase 17 — Bird image defaults to null (Clear button absent)', async ({ page }) => {
    await openSettings(page)
    const clearBtn = page.locator('.settings-clearimage')
    await expect(clearBtn).toHaveCount(0)
    await expect(page.locator('.settings-picker-shapes')).toBeVisible()
  })

  test('Phase 17 — Bird image file input is present in Settings', async ({ page }) => {
    await openSettings(page)
    const fileInput = page.locator('.settings-fileinput')
    await expect(fileInput).toBeVisible()
    const accept = await fileInput.getAttribute('accept')
    expect(accept).toBe('image/*')
  })

  test('v3 → v4 migration grandfathers existing user to Normal (UI state)', async ({ page }) => {
    await page.goto(URL, { waitUntil: 'networkidle' })
    // Plant a v3 save (no `difficulty` field) and reload
    await page.evaluate(() => {
      const v3 = {
        schemaVersion: 3,
        bestScore: 5,
        settings: {
          sound: true, music: true, reduceMotion: 'auto', palette: 'default',
          flapTrail: false, lastMode: 'endless', cameraBob: false,
        },
        leaderboardByMode: { endless: [], timeAttack: [], daily: [] },
        dailyAttempts: {},
      }
      localStorage.setItem('flappy-3d:v1', JSON.stringify(v3))
    })
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForSelector('.title-settings-btn', { state: 'visible', timeout: 15000 })
    await page.locator('.title-settings-btn').evaluate((el) => (el as HTMLButtonElement).click())
    await expect(page.locator('text=Difficulty')).toBeVisible({ timeout: 5000 })
    // load() applies v3→v4 migration in-memory: difficulty='normal'. SettingsModal
    // calls getSettings() which goes through that migration path. Verify Normal
    // button is the active one.
    const normalBtn = page.locator('.settings-picker[aria-label="Difficulty preset"]').locator('button:has-text("Normal")')
    await expect(normalBtn).toHaveAttribute('aria-pressed', 'true')
  })
})
