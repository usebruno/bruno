import { test as baseTest, ElectronApplication, Page } from '@playwright/test';

const { startApp } = require('./electron.ts');

export const test = baseTest.extend<{ page: Page }, { electronApp: ElectronApplication }>({
  electronApp: [
    async ({}, use) => {
      const { app: electronApp, context } = await startApp();

      await use(electronApp);
      await context.close();
      await electronApp.close();
    },
    { scope: 'worker' }
  ],
  page: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow();
    await use(page);
    await page.reload();
  }
});

export * from '@playwright/test'
