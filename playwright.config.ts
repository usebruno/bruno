import { defineConfig, devices } from '@playwright/test';

const reporter: string[][string] = [['list'], ['html']];

if (process.env.CI) {
  reporter.push(["github"]);
}


export default defineConfig({
  testDir: './e2e-tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? undefined : 1,
  reporter,
  use: {
    trace: 'on-first-retry'
  },

  projects: [
    {
      name: 'Bruno Electron App'
    }
  ],

  webServer: {
    command: 'npm run dev:web',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI
  }
});
