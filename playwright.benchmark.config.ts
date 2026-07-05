import { defineConfig } from '@playwright/test';

export default defineConfig({
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: 'benchmark-report/results.json' }]
  ],

  use: {
    trace: 'off'
  },

  projects: [
    {
      name: 'benchmarks',
      testDir: './tests/benchmarks',
      testMatch: '**/*.bench.ts'
    }
  ],

  webServer: [
    {
      command: 'npm run dev:web',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 10 * 60 * 1000
    }
  ],

  timeout: 10 * 60 * 1000,
  expect: {
    timeout: 120_000
  }
});
