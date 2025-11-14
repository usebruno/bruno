import { defineConfig } from '@playwright/test';

const reporter: any[] = [['list'], ['html']];

if (process.env.CI) {
  reporter.push(['github']);
}

export default defineConfig({
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? undefined : 1,
  reporter,

  use: {
    trace: process.env.CI ? 'on-first-retry' : 'on'
  },

  projects: [
    {
      name: 'default',
      testDir: './tests',
      testIgnore: [
        'ssl/**',
        'proxy-settings/**'
      ]
    },
    {
      name: 'ssl',
      testDir: './tests/ssl'
    },
    {
      name: 'proxy-off',
      testDir: './tests/proxy-settings/with-proxy-turned-OFF'
    },
    {
      name: 'proxy-on',
      testDir: './tests/proxy-settings/with-proxy-turned-ON'
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
