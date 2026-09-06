import { defineConfig } from '@playwright/test'

export default defineConfig({ testDir: './tests', testMatch: 'gameplay.spec.ts', workers: 1 })
