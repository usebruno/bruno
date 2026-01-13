import { test as baseTest, BrowserContext, ElectronApplication, Page } from '@playwright/test';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

const electronAppPath = path.join(__dirname, '../packages/bruno-electron');

const existsAsync = (filepath: string) => fs.promises.access(filepath).then(() => true).catch(() => false);

async function recursiveCopy(src: string, dest: string) {
  if (!await existsAsync(src)) {
    throw new Error(`${src} doesn't exist`);
  }

  const files = await fs.promises.readdir(src, {
    recursive: true,
    withFileTypes: true
  });

  for (const file of files) {
    if (!file.isFile()) continue;
    const fullPath = path.join(src, file.name);
    const fullDestPath = path.join(dest, file.name);
    await fs.promises.copyFile(fullPath, fullDestPath);
  }
}

export const test = baseTest.extend<
  {
    context: BrowserContext;
    page: Page;
    newPage: Page;
    pageWithUserData: Page;
    restartApp: (options?: { initUserDataPath?: string }) => Promise<ElectronApplication>;
  },
  {
    createTmpDir: (tag?: string) => Promise<string>;
    launchElectronApp: (options?: { initUserDataPath?: string; userDataPath?: string; dotEnv?: Record<string, string> }) => Promise<ElectronApplication>;
    electronApp: ElectronApplication;
    reuseOrLaunchElectronApp: (options?: { initUserDataPath?: string; testFile?: string; userDataPath?: string; dotEnv?: Record<string, string> }) => Promise<ElectronApplication>;
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
      await use(async ({ initUserDataPath, userDataPath: providedUserDataPath, dotEnv = {} } = {}) => {
        const userDataPath = providedUserDataPath || (await createTmpDir('electron-userdata'));

        // Ensure dir exists when caller supplies their own path
        if (providedUserDataPath) {
          await fs.promises.mkdir(userDataPath, { recursive: true });
        }

        if (initUserDataPath) {
          const replacements = {
            projectRoot: path.posix.join(__dirname, '..')
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
            DISABLE_SAMPLE_COLLECTION_IMPORT: 'true',
            PLAYWRIGHT: 'true',
            DISABLE_SINGLE_INSTANCE: 'true',
            ...dotEnv
          }
        });

        const { workerIndex } = workerInfo;
        const electronProcess = app.process();
        if (electronProcess?.stdout) {
          electronProcess.stdout.on('data', (data) => {
            process.stdout.write(data.toString().replace(/^(?=.)/gm, `[Electron #${workerIndex}] |`));
          });
        }
        if (electronProcess?.stderr) {
          electronProcess.stderr.on('data', (error) => {
            process.stderr.write(error.toString().replace(/^(?=.)/gm, `[Electron #${workerIndex}] |`));
          });
        }

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
      await use(async ({ initUserDataPath, testFile, userDataPath, dotEnv = {} } = {}) => {
        const key = testFile || userDataPath || initUserDataPath;
        if (key && apps[key]) {
          return apps[key];
        }
        const app = await launchElectronApp({ initUserDataPath, userDataPath, dotEnv });
        if (key) {
          apps[key] = app;
        }
        return app;
      });
    },
    { scope: 'worker' }
  ],

  restartApp: async ({ launchElectronApp }, use, testInfo) => {
    const appInstances: Array<{ app: ElectronApplication; initUserDataPath?: string }> = [];
    await use(async ({ initUserDataPath } = {}) => {
      // Get the test directory and check for init-user-data folder
      const testDir = path.dirname(testInfo.file);
      const defaultInitUserDataPath = path.join(testDir, 'init-user-data');

      // Use provided initUserDataPath, or check if default path exists, or use undefined
      let userDataPath = initUserDataPath;
      if (!userDataPath) {
        const hasInitUserData = await fs.promises.stat(defaultInitUserDataPath).catch(() => false);
        userDataPath = hasInitUserData ? defaultInitUserDataPath : undefined;
      }

      const app = await launchElectronApp({ initUserDataPath: userDataPath });
      appInstances.push({ app, initUserDataPath: userDataPath });
      return app;
    });

    // Clean up all app instances
    for (const { app } of appInstances) {
      await app.context().close();
      await app.close();
    }
  },

  pageWithUserData: async ({ reuseOrLaunchElectronApp, createTmpDir }, use, testInfo) => {
    const testDir = path.dirname(testInfo.file);
    const initUserDataPath = path.join(testDir, 'init-user-data');

    const tmpAppDataDir = await createTmpDir();
    try {
      await recursiveCopy(initUserDataPath, tmpAppDataDir);
    } catch (err) {
      if (err instanceof Error && err.message.includes('doesn\'t exist')) {
        throw new Error(`${initUserDataPath} doesn't exist, either add one or if you don't need an initial state then use the \`page\` fixture instead of \`pageWithUserData\`.`);
      }
      throw err;
    }

    const app = await reuseOrLaunchElectronApp({ initUserDataPath: tmpAppDataDir, testFile: testInfo.file });

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
