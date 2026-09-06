import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: ['cream-ui.spec.ts', 'side-camera.spec.ts'],
  outputDir: 'test-results/standalone',
  workers: 1,
  use: { launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } },
  webServer: {
    command: 'pnpm exec vite preview --host 127.0.0.1 --port 5205 --strictPort',
    url: 'http://127.0.0.1:5205/',
    reuseExistingServer: false,
  },
})
