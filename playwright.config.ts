import { defineConfig } from '@playwright/test';

const reporter: any[] = [
  ['list'],
  ['html'],
  ['json', { outputFile: 'playwright-report/results.json' }],
  ['./playwright/reporters/worker-timeline.js']
];

if (process.env.CI) {
  reporter.push(['github']);
  // Blob reports are mergeable across shards (see tests-linux.yml e2e-test-report).
  reporter.push(['blob']);
}

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: undefined,
  // Electron boots under load; fixtures own the boot budget separately (see playwright/index.ts).
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter,

  use: {
    trace: process.env.CI ? 'on-first-retry' : 'on'
  },

  projects: [
    {
      name: 'default',
      testDir: './tests',
      testIgnore: [
        'ssl/**', // custom CA certificate tests require separate server setup and certificate generation
        'auth/**', // auth tests have their own project
        'benchmarks/**',
        'proxy/system-pac/**' // shares ports with proxy/pac — runs in its own project after default
      ]
    },
    {
      name: 'auth',
      testDir: './tests/auth'
    },
    {
      name: 'ssl',
      testDir: './tests/ssl'
    },
    {
      // system-pac and pac specs share the same PAC/proxy/target ports.
      name: 'system-pac',
      testDir: './tests/proxy/system-pac',
    }
  ],

  webServer: [
    {
      command: 'npm run dev:web',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 10 * 60 * 1000
    },
    {
      command: 'npm start --workspace=packages/bruno-tests',
      url: 'http://localhost:8081/ping',
      reuseExistingServer: !process.env.CI,
      timeout: 10 * 60 * 1000
    }
  ]
});
