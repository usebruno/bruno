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
      stdout: 'pipe',
      wait: { stdout: /ready\s+built in/i },
      reuseExistingServer: !process.env.CI,
      timeout: 10 * 60 * 1000
    },
    {
      command: 'npm start --workspace=packages/bruno-tests',
      url: 'http://localhost:8081/ping',
      reuseExistingServer: !process.env.CI,
      timeout: 10 * 60 * 1000
    }
  ],

  timeout: 10 * 60 * 1000,
  expect: {
    timeout: 120_000
  }
});
