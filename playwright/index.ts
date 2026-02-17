import { test as baseTest, BrowserContext, ElectronApplication, Page, TestInfo } from '@playwright/test';
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

const TRACING_OPTIONS = { screenshots: true, snapshots: true, sources: true };

function isTracingEnabled(testInfo: TestInfo): boolean {
  return !!(testInfo as any)._tracing.traceOptions();
}

async function usePageWithTracing(
  context: BrowserContext,
  page: Page,
  testInfo: TestInfo,
  use: (page: Page) => Promise<void>,
  options: { initTracing?: boolean; useChunks?: boolean } = {}
) {
  const { initTracing = false, useChunks = true } = options;

  if (!isTracingEnabled(testInfo)) {
    await use(page);
    return;
  }

  const tracePath = testInfo.outputPath(`trace-${testInfo.testId}.zip`);

  if (initTracing) {
    try {
      await context.tracing.start(TRACING_OPTIONS);
    } catch (e) { }
  }

  if (useChunks) {
    await context.tracing.startChunk();
    await use(page);
    try { await context.tracing.stopChunk({ path: tracePath }); } catch { }
  } else {
    await use(page);
    try { await context.tracing.stop({ path: tracePath }); } catch { }
  }

  try { await testInfo.attach('trace', { path: tracePath }); } catch { }
}

/**
 * Gracefully close an Electron app by telling it to exit with code 0.
 * This avoids the macOS "quit unexpectedly" crash dialog that appears when
 * app.context().close() kills subprocesses (renderer/GPU) abruptly before
 * the main process can shut down cleanly.
 *
 * Emits 'before-quit' first so cleanup handlers run (e.g., saving cookies to disk),
 * since app.exit() bypasses all lifecycle events.
 */
export async function closeElectronApp(app: ElectronApplication) {
  try {
    await app.evaluate(({ app }) => {
      app.emit('before-quit');
      app.exit(0);
    });
  } catch {
    // Expected: process exited before the CDP response was sent
  }
  try {
    await app.close();
  } catch {
    // Process already exited
  }
}

export const test = baseTest.extend<
  {
    context: BrowserContext;
    page: Page;
    newPage: Page;
    pageWithUserData: Page;
    collectionFixturePath: string | null;
    restartApp: (options?: { initUserDataPath?: string }) => Promise<ElectronApplication>;
  },
  {
    createTmpDir: (tag?: string) => Promise<string>;
    launchElectronApp: (options?: { initUserDataPath?: string; userDataPath?: string; dotEnv?: Record<string, string>; templateVars?: Record<string, string> }) => Promise<ElectronApplication>;
    electronApp: ElectronApplication;
    reuseOrLaunchElectronApp: (options?: { initUserDataPath?: string; testFile?: string; userDataPath?: string; dotEnv?: Record<string, string>; templateVars?: Record<string, string>; closePrevious?: boolean }) => Promise<ElectronApplication>;
  }
>({
  createTmpDir: [
    async ({ }, use) => {
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

  collectionFixturePath: async ({ createTmpDir }, use, testInfo) => {
    const testDir = path.dirname(testInfo.file);
    const fixturesDir = path.join(testDir, 'fixtures');
    // fixtures/collections — multiple named collections (subdirs with bruno.json/opencollection.yml)
    // fixtures/collection — single collection (single dir with bruno.json/opencollection.yml)
    const srcPath = [path.join(fixturesDir, 'collections'), path.join(fixturesDir, 'collection')]
      .find((p) => fs.existsSync(p));

    if (srcPath) {
      const tmpDir = await createTmpDir(path.basename(srcPath));
      await fs.promises.cp(srcPath, tmpDir, { recursive: true });
      await use(tmpDir);
    } else {
      await use(null);
    }
  },

  launchElectronApp: [
    async ({ playwright, createTmpDir }, use, workerInfo) => {
      const apps: ElectronApplication[] = [];
      await use(async ({ initUserDataPath, userDataPath: providedUserDataPath, dotEnv = {}, templateVars = {} } = {}) => {
        const userDataPath = providedUserDataPath || (await createTmpDir('electron-userdata'));

        // Ensure dir exists when caller supplies their own path
        if (providedUserDataPath) {
          await fs.promises.mkdir(userDataPath, { recursive: true });
        }

        if (initUserDataPath) {
          const replacements: Record<string, string> = {
            projectRoot: path.posix.join(__dirname, '..'),
            ...templateVars
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
          args: [electronAppPath, '--disable-gpu'],
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
        await closeElectronApp(app);
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
    if (isTracingEnabled(testInfo)) {
      try {
        await context.tracing.start(TRACING_OPTIONS);
      } catch (e) { }
    }
    await use(context);
  },

  page: async ({ electronApp, context }, use, testInfo) => {
    const page = await electronApp.firstWindow();
    await usePageWithTracing(context, page, testInfo, use);
  },

  newPage: async ({ launchElectronApp }, use, testInfo) => {
    const app = await launchElectronApp();
    const context = await app.context();
    const page = await app.firstWindow();
    await usePageWithTracing(context, page, testInfo, use, { initTracing: true, useChunks: false });
  },

  reuseOrLaunchElectronApp: [
    async ({ launchElectronApp }, use, testInfo) => {
      const apps: Record<string, ElectronApplication> = {};
      await use(async ({ initUserDataPath, testFile, userDataPath, dotEnv = {}, templateVars = {}, closePrevious = false } = {}) => {
        const key = testFile || userDataPath || initUserDataPath;
        if (key && apps[key]) {
          if (closePrevious) {
            await closeElectronApp(apps[key]);
            delete apps[key];
          } else {
            return apps[key];
          }
        }

        // Close other cached apps to prevent resource accumulation across test files
        for (const existingKey of Object.keys(apps)) {
          if (existingKey !== key) {
            await closeElectronApp(apps[existingKey]);
            delete apps[existingKey];
          }
        }

        const app = await launchElectronApp({ initUserDataPath, userDataPath, dotEnv, templateVars });
        if (key) {
          apps[key] = app;
        }
        return app;
      });
    },
    { scope: 'worker' }
  ],

  restartApp: async ({ reuseOrLaunchElectronApp, createTmpDir, collectionFixturePath }, use, testInfo) => {
    await use(async ({ initUserDataPath } = {}) => {
      const testDir = path.dirname(testInfo.file);
      const defaultInitUserDataPath = path.join(testDir, 'init-user-data');

      let srcUserDataPath = initUserDataPath;
      if (!srcUserDataPath) {
        const hasInitUserData = await fs.promises.stat(defaultInitUserDataPath).catch(() => false);
        srcUserDataPath = hasInitUserData ? defaultInitUserDataPath : undefined;
      }

      // Copy init-user-data to a fresh tmp dir (same as pageWithUserData)
      const tmpAppDataDir = await createTmpDir();
      if (srcUserDataPath) {
        await recursiveCopy(srcUserDataPath, tmpAppDataDir);
      }

      const templateVars: Record<string, string> = {};
      if (collectionFixturePath) {
        templateVars.collectionPath = collectionFixturePath;
      }

      // Close the previous app (from pageWithUserData) before launching a new one
      return await reuseOrLaunchElectronApp({
        initUserDataPath: tmpAppDataDir,
        testFile: testInfo.file,
        templateVars,
        closePrevious: true
      });
    });
  },

  pageWithUserData: async ({ reuseOrLaunchElectronApp, createTmpDir, collectionFixturePath }, use, testInfo) => {
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

    const templateVars: Record<string, string> = {};
    if (collectionFixturePath) {
      templateVars.collectionPath = collectionFixturePath;
    }

    const app = await reuseOrLaunchElectronApp({ initUserDataPath: tmpAppDataDir, testFile: testInfo.file, templateVars });

    const context = await app.context();
    const page = await app.firstWindow();

    // Wait for app to be ready
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });
    await usePageWithTracing(context, page, testInfo, use, { initTracing: true });
  }
});

export * from '@playwright/test';
