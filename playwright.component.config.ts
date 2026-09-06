import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: 'component.spec.ts',
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:5206',
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
    },
  },
  webServer: [
    { command: 'pnpm exec vite preview --host 127.0.0.1 --port 5205 --strictPort', url: 'http://127.0.0.1:5205/flappy-3d/', reuseExistingServer: false },
    { command: 'node tests/component-server.mjs', url: 'http://127.0.0.1:5206', reuseExistingServer: false },
  ],
})
