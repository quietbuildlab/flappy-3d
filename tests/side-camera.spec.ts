import { test, expect } from '@playwright/test'

test.use({
  baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5205/flappy-3d/',
})

test('uploaded bird stays visible when switching between all camera views', async ({ page }, testInfo) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('group', { name: 'Camera view', exact: true }).getByRole('button', { name: 'side', exact: true }).click()
  await page.evaluate(() => {
    const tile = document.createElement('canvas')
    tile.width = tile.height = 32
    const ctx = tile.getContext('2d')!
    ctx.fillStyle = '#ff00ff'
    ctx.fillRect(0, 0, 32, 32)
    const save = JSON.parse(localStorage.getItem('flappy-3d:v1')!)
    save.settings.birdImage = tile.toDataURL()
    localStorage.setItem('flappy-3d:v1', JSON.stringify(save))
  })
  await page.reload()
  await expect(page.locator('.title-screen.active')).toBeVisible()
  for (const view of ['side', 'far', 'chase']) {
    await expect.poll(async () => {
      const png = await page.screenshot()
      return page.evaluate(async base64 => {
        const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob())
        const canvas = document.createElement('canvas')
        canvas.width = bitmap.width
        canvas.height = bitmap.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(bitmap, 0, 0)
        bitmap.close()
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
        let minX = canvas.width
        let maxX = 0
        for (let i = 0; i < data.length; i += 4) {
          if (data[i]! > 200 && data[i + 1]! < 80 && data[i + 2]! > 200) {
            const x = (i / 4) % canvas.width
            minX = Math.min(minX, x)
            maxX = Math.max(maxX, x)
          }
        }
        return Math.max(0, maxX - minX)
      }, png.toString('base64'))
    }, { message: `uploaded bird has readable width in ${view}` }).toBeGreaterThan(25)
    await page.screenshot({ path: testInfo.outputPath(`image-${view}.png`) })
    await page.keyboard.press('c')
  }
})

test('starts side-on, preserves scores, and remembers a deliberate camera choice', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const views = page.getByRole('group', { name: 'Camera view', exact: true })
  await expect(views.getByRole('button', { name: 'side', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await views.getByRole('button', { name: 'chase', exact: true }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(views.getByRole('button', { name: 'chase', exact: true })).toHaveAttribute('aria-pressed', 'true')

  // A previous release persisted the old default alongside unrelated settings.
  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('flappy-3d:v1')!)
    delete save.settings.cameraViewChosen
    save.bestScore = 99
    save.settings.sound = false
    localStorage.setItem('flappy-3d:v1', JSON.stringify(save))
  })
  await page.reload()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(views.getByRole('button', { name: 'side', exact: true })).toHaveAttribute('aria-pressed', 'true')
  expect(await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('flappy-3d:v1')!)
    return { best: save.bestScore, sound: save.settings.sound }
  })).toEqual({ best: 99, sound: false })

  // Far was never the default, so a legacy Far setting is an explicit choice.
  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('flappy-3d:v1')!)
    save.settings.cameraView = 'far'
    localStorage.setItem('flappy-3d:v1', JSON.stringify(save))
  })
  await page.reload()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(views.getByRole('button', { name: 'far', exact: true })).toHaveAttribute('aria-pressed', 'true')
})
