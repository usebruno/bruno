import { defineConfig } from '@playwright/test';

const reporter: any[] = [['list'], ['html']];

if (process.env.CI) {
  reporter.push(['github']);
}

export default defineConfig({
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? undefined : 1,
  reporter,

  use: {
    trace: process.env.CI ? 'on-first-retry' : 'on'
  },

  projects: [
    {
      name: 'default',
      testDir: './e2e-tests',
      testIgnore: [
        'ca_certs/**' // CA certificate tests require separate server setup and certificate generation
      ]
    },
    {
      name: 'ca_certs',
      testDir: './e2e-tests/ca_certs'
    }
  ],

  webServer: [
    {
      command: 'npm run dev:web',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI
    },
    {
      command: 'npm start --workspace=packages/bruno-tests',
      url: 'http://localhost:8081/ping',
      reuseExistingServer: !process.env.CI
    }
  ]
});
