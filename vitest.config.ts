import { defineConfig } from 'vitest/config'
import path from 'path'

// Default device timezone for the suite; test:tz re-runs it in others to
// prove results never depend on the device (all math is German time).
process.env.TZ ||= 'Europe/Berlin'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname) } },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
