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

// Wait for the Electron app to have a ready, loaded window.
// Handles cases where the first window is slow to appear (e.g. on Windows).
export async function waitForReadyPage(app: ElectronApplication, options: { timeout?: number } = {}): Promise<Page> {
  const { timeout = 45000 } = options;

  let page: Page | null = null;
  try {
    page = await app.firstWindow();
  } catch {
    page = null;
  }

  if (!page) {
    page = await app.waitForEvent('window', { timeout });
  }

  await page.locator('[data-app-state="loaded"]').waitFor({ timeout });
  await page.waitForTimeout(200);

  return page;
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

// Sentinel returned by `withTimeout` when the deadline fires before the wrapped
// promise resolves. Using a unique symbol lets callers distinguish a real
// timeout from a promise that legitimately resolved with `undefined`
// (e.g. `Promise<void>` from `app.close()`).
const WITH_TIMEOUT = Symbol('withTimeout/timeout');

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | typeof WITH_TIMEOUT> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(WITH_TIMEOUT), ms);
    promise.then(
      (v) => {
        clearTimeout(timer); resolve(v);
      },
      () => {
        clearTimeout(timer); resolve(undefined as T);
      }
    );
  });
}

/**
 * Close an Electron app gracefully so macOS Crash Reporter doesn't fire.
 *
 * Strategy: close all BrowserWindows from inside the main process. The
 * default `window-all-closed` handler then triggers `app.quit()` →
 * `before-quit` → `will-quit` → clean exit. Helper processes (renderer/GPU)
 * shut down via the normal IPC handshake instead of detecting a broken
 * channel and aborting — that abort is what produced the "Electron quit
 * unexpectedly" dialog under the previous `app.exit(0)` approach.
 *
 * Each step is bounded so a wedged process can't burn the worker teardown
 * budget. SIGKILL is only sent if the process is genuinely still alive
 * after the graceful path has timed out.
 */
export async function closeElectronApp(app: ElectronApplication) {
  await withTimeout(
    app.evaluate(({ BrowserWindow }) => {
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) win.close();
      }
    }).catch(() => { /* CDP may have closed already */ }),
    3000
  );

  const closed = await withTimeout(
    app.close().catch(() => { /* already exited */ }),
    5000
  );

  if (closed === WITH_TIMEOUT) {
    try { app.process()?.kill('SIGKILL'); } catch { /* already dead */ }
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
      // Normalize to forward slashes so the path is valid JSON when substituted
      // into template files (e.g. preferences.json). Windows paths with backslashes
      // produce invalid JSON escape sequences such as \U, \A, \T, etc.
      await use(tmpDir.replace(/\\/g, '/'));
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
            projectRoot: path.join(__dirname, '..').replace(/\\/g, '/'),
            ...templateVars
          };

          for (const file of await fs.promises.readdir(initUserDataPath)) {
            let content = await fs.promises.readFile(path.join(initUserDataPath, file), 'utf-8');
            content = content.replace(/{{(\w+)}}/g, (_, key) => {
              if (replacements[key]) {
                return replacements[key].replace(/\\/g, '/');
              } else {
                throw new Error(`\tNo replacement for {{${key}}} in ${path.join(initUserDataPath, file)}`);
              }
            });
            await fs.promises.writeFile(path.join(userDataPath, file), content, 'utf-8');
          }
        } else {
          // No initUserDataPath provided: create default preferences to skip onboarding
          // BUT only if preferences.json doesn't already exist
          const prefsPath = path.join(userDataPath, 'preferences.json');
          const prefsExist = await existsAsync(prefsPath);

          if (!prefsExist) {
            const defaultPreferences = {
              preferences: {
                onboarding: {
                  hasLaunchedBefore: true,
                  hasSeenWelcomeModal: true
                }
              }
            };
            await fs.promises.writeFile(
              prefsPath,
              JSON.stringify(defaultPreferences, null, 2),
              'utf-8'
            );
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
      // Close every still-tracked app in parallel.
      // `closeElectronApp` is internally bounded, so this can't hang.
      await Promise.allSettled(apps.map((app) => closeElectronApp(app)));
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
    const page = await waitForReadyPage(electronApp);
    await usePageWithTracing(context, page, testInfo, use);
  },

  newPage: async ({ launchElectronApp }, use, testInfo) => {
    const app = await launchElectronApp();
    const context = await app.context();
    const page = await waitForReadyPage(app);
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
        templateVars.collectionPath = collectionFixturePath.split(path.sep).join('/');
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
      templateVars.collectionPath = collectionFixturePath.split(path.sep).join('/');
    }

    const app = await reuseOrLaunchElectronApp({ initUserDataPath: tmpAppDataDir, testFile: testInfo.file, templateVars });

    const context = await app.context();
    const page = await waitForReadyPage(app);

    await usePageWithTracing(context, page, testInfo, use, { initTracing: true });
  }
});

export * from '@playwright/test';
