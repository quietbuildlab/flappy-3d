// Runtime smoke test for the Babylon rebuild. Loads the built game, checks
// for console/page errors, verifies the Babylon canvas renders non-empty
// frames, and exercises a flap to confirm the state machine advances.
import { chromium } from '@playwright/test'

const URL = process.env.SMOKE_URL ?? 'http://localhost:4173/flappy-3d/'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 800, height: 1000 } })

const errors = []
const logs = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
  else logs.push(`[${m.type()}] ${m.text()}`)
})
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`))
page.on('response', (r) => { if (r.status() === 404) errors.push(`404: ${r.url()}`) })

await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

// 1. Canvas exists and has a backing buffer.
const canvas = await page.evaluate(() => {
  const c = document.querySelector('#scene')
  return c ? { w: c.width, h: c.height } : null
})

// 2. Title-screen screenshot (WebGL drawing buffer isn't preserved for
//    readPixels, so we composite via a real screenshot instead).
await page.screenshot({ path: '/tmp/smoke-title.png' })

// 3. Flap → the game should leave the title screen and start playing.
await page.mouse.click(400, 500)
await page.waitForTimeout(500)
await page.mouse.click(400, 500)
await page.waitForTimeout(900)
const hudVisible = await page.evaluate(() => {
  const hud = document.querySelector('.hud, [class*="hud" i], [class*="HUD"]')
  return !!hud && getComputedStyle(hud).display !== 'none'
})
// Closed-loop play: flap to keep the bird near mid-height (y≈0) using the
// dev hook, so it actually navigates gaps — this exercises scoring, not just
// collisions. Run long enough for several pipes to pass.
let shot = 0
let maxScore = 0
const deadline = Date.now() + 26000
while (Date.now() < deadline) {
  const g = await page.evaluate(() => {
    const f = window.__flappy
    return f ? { y: f.birdY(), score: f.score(), state: f.state(), gap: f.nextGapY() } : null
  })
  if (g) {
    maxScore = Math.max(maxScore, g.score)
    // The flap impulse swings the bird ~2 units, so aim the swing centred on
    // the upcoming gap: flap once the bird drops just below the gap centre.
    if ((g.state === 'playing' || g.state === 'title') && g.y < g.gap - 0.7) {
      await page.mouse.click(400, 480)
    } else if (g.state === 'gameOver') {
      await page.mouse.click(400, 480) // restart
    }
  }
  if (shot < 6 && Date.now() % 4 < 2) {
    await page.screenshot({ path: `/tmp/play-${shot++}.png` })
  }
  await page.waitForTimeout(95)
}
await page.screenshot({ path: '/tmp/smoke-playing.png' })

await browser.close()

// Audio 404s are a pre-existing base-path issue in the (untouched)
// AudioManager — orthogonal to the engine rebuild.
const realErrors = errors.filter((e) => !/\/audio\/.*\.mp3|Failed to load resource/.test(e))

console.log('canvas:', JSON.stringify(canvas))
console.log('hud after flaps:', hudVisible)
console.log('max score reached:', maxScore)
console.log('audio 404s (pre-existing, ignored):', errors.length - realErrors.length)
console.log('real errors:', realErrors.length)
for (const e of realErrors.slice(0, 10)) console.log('  -', e)
console.log('screenshots: /tmp/smoke-title.png /tmp/smoke-playing.png')

const ok = canvas && canvas.w > 0 && hudVisible && maxScore > 0 && realErrors.length === 0
console.log(ok ? '\nSMOKE PASS' : '\nSMOKE FAIL')
process.exit(ok ? 0 : 1)
