// Launch + drive the game, then cycle the camera views with the 'C' hotkey,
// capturing a screenshot of each.
import { chromium } from '@playwright/test'

const URL = 'http://localhost:4321/flappy-3d/'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 480, height: 720 } })
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message))

await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

// Start the game and play briefly so pipes are on screen.
const get = () =>
  page.evaluate(() => {
    const f = window.__flappy
    return f ? { y: f.birdY(), score: f.score(), state: f.state(), gap: f.nextGapY() } : null
  })

for (let i = 0; i < 60; i++) {
  const g = await get()
  if (g) {
    if (g.state === 'title' || g.state === 'gameOver') await page.keyboard.press('Space')
    else if (g.state === 'playing' && g.y < g.gap - 0.7) await page.keyboard.press('Space')
  }
  await page.waitForTimeout(90)
  if (i === 30) break // ~3s of play
}

// Capture each camera view by cycling with 'C'.
const views = ['chase', 'side', 'far']
for (const name of views) {
  const g = await get()
  console.log(`view ${name}: state=${g?.state}`)
  await page.screenshot({ path: `/tmp/cam-${name}.png` })
  await page.keyboard.press('c')
  await page.waitForTimeout(700)
}
await browser.close()
console.log('camera screenshots: /tmp/cam-chase.png /tmp/cam-side.png /tmp/cam-far.png')
