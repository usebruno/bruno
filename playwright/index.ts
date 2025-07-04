import { test as baseTest, BrowserContext, ElectronApplication, Page } from '@playwright/test';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

const electronAppPath = path.join(__dirname, '../packages/bruno-electron');

export const test = baseTest.extend<
  {
    context: BrowserContext;
    page: Page;
    newPage: Page;
    pageWithUserData: Page;
  },
  {
    createTmpDir: (tag?: string) => Promise<string>;
    launchElectronApp: (options?: { initUserDataPath?: string }) => Promise<ElectronApplication>;
    electronApp: ElectronApplication;
    reuseOrLaunchElectronApp: (options?: { initUserDataPath?: string }) => Promise<ElectronApplication>;
  }
>({
  createTmpDir: [
    async ({}, use) => {
      const dirs: string[] = [];
      await use(async (tag?: string) => {
        const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), `pw-${tag || ''}-`));
        dirs.push(dir);
        return dir;
      });
      await Promise.all(
        dirs.map((dir) => fs.promises.rm(dir, { recursive: true, force: true, maxRetries: 10 }).catch((e) => e))
      );
    },
    { scope: 'worker' }
  ],

  launchElectronApp: [
    async ({ playwright, createTmpDir }, use, workerInfo) => {
      const apps: ElectronApplication[] = [];
      await use(async ({ initUserDataPath } = {}) => {
        const userDataPath = await createTmpDir('electron-userdata');

        if (initUserDataPath) {
          const replacements = {
            projectRoot: path.join(__dirname, '..')
          };

          for (const file of await fs.promises.readdir(initUserDataPath)) {
            let content = await fs.promises.readFile(path.join(initUserDataPath, file), 'utf-8');
            content = content.replace(/{{(\w+)}}/g, (_, key) => {
              if (replacements[key]) {
                return replacements[key];
              } else {
                throw new Error(`\tNo replacement for {{${key}}} in ${path.join(initUserDataPath, file)}`);
              }
            });
            await fs.promises.writeFile(path.join(userDataPath, file), content, 'utf-8');
          }
        }

        const app = await playwright._electron.launch({
          args: [electronAppPath],
          env: {
            ...process.env,
            ELECTRON_USER_DATA_PATH: userDataPath,
          }
        });

        const { workerIndex } = workerInfo;
        app.process().stdout.on('data', (data) => {
          process.stdout.write(data.toString().replace(/^(?=.)/gm, `[Electron #${workerIndex}] |`));
        });
        app.process().stderr.on('data', (error) => {
          process.stderr.write(error.toString().replace(/^(?=.)/gm, `[Electron #${workerIndex}] |`));
        });

        apps.push(app);
        return app;
      });
      for (const app of apps) {
        await app.context().close();
        await app.close();
      }
    },
    { scope: 'worker' }
  ],

  electronApp: [
    async ({ launchElectronApp }, use) => {
      const app = await launchElectronApp();
      await use(app);
    },
    { scope: 'worker' }
  ],

  context: async ({ electronApp }, use, testInfo) => {
    const context = await electronApp.context();
    const tracingOptions = (testInfo as any)._tracing.traceOptions();
    if (tracingOptions) {
      try {
        await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
      } catch (e) {}
    }
    await use(context);
  },

  page: async ({ electronApp, context }, use, testInfo) => {
    const page = await electronApp.firstWindow();
    const tracingOptions = (testInfo as any)._tracing.traceOptions();
    if (tracingOptions) {
      const tracePath = testInfo.outputPath(`trace-${testInfo.testId}.zip`);
      await context.tracing.startChunk();
      await use(page);
      await context.tracing.stopChunk({ path: tracePath });
      await testInfo.attach('trace', { path: tracePath });
    } else {
      await use(page);
    }
  },

  newPage: async ({ launchElectronApp }, use, testInfo) => {
    const app = await launchElectronApp();
    const context = await app.context();
    const page = await app.firstWindow();
    const tracingOptions = (testInfo as any)._tracing.traceOptions();
    if (tracingOptions) {
      const tracePath = testInfo.outputPath(`trace-${testInfo.testId}.zip`);
      await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
      await use(page);
      await context.tracing.stop({ path: tracePath });
      await testInfo.attach('trace', { path: tracePath });
    } else {
      await use(page);
    }
  },

  reuseOrLaunchElectronApp: [
    async ({ launchElectronApp }, use, testInfo) => {
      const apps: Record<string, ElectronApplication> = {};
      await use(async ({ initUserDataPath } = {}) => {
        const key = initUserDataPath;
        if (key && apps[key]) {
          return apps[key];
        }
        const app = await launchElectronApp({ initUserDataPath });
        apps[key] = app;
        return app;
      });
    },
    { scope: 'worker' }
  ],

  pageWithUserData: async ({ reuseOrLaunchElectronApp }, use, testInfo) => {
    const testDir = path.dirname(testInfo.file);
    const initUserDataPath = path.join(testDir, 'init-user-data');

    const app = await reuseOrLaunchElectronApp(
      (await fs.promises.stat(initUserDataPath).catch(() => false)) ? { initUserDataPath } : {}
    );

    const context = await app.context();
    const page = await app.firstWindow();
    const tracingOptions = (testInfo as any)._tracing.traceOptions();
    if (tracingOptions) {
      const tracePath = testInfo.outputPath(`trace-${testInfo.testId}.zip`);
      try {
        await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
      } catch (e) {}
      await context.tracing.startChunk();
      await use(page);
      await context.tracing.stopChunk({ path: tracePath });
      await testInfo.attach('trace', { path: tracePath });
    } else {
      await use(page);
    }
  }
});

export * from '@playwright/test';
