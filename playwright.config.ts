import { defineConfig } from '@playwright/test';

const reporter: any[] = [['list'], ['html'], ['json', { outputFile: 'playwright-report/results.json' }]];

if (process.env.CI) {
  reporter.push(['github']);
}

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: undefined,
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
      // E2E_WEB_SERVER=build serves a production build instead of the dev
      // server. CI sets it because the dev server's watcher/compile work can
      // leave it unresponsive under parallel Electron load (observed on
      // Windows runners: launches hang loading localhost:3000 until teardown).
      command: process.env.E2E_WEB_SERVER === 'build'
        ? 'npm run build --workspace=packages/bruno-app && npm run preview --workspace=packages/bruno-app'
        : 'npm run dev:web',
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
