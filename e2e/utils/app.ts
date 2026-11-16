import {
  expect,
  Page,
  Locator,
  ElectronApplication,
  waitForReadyPage as waitForReadyPageImpl
} from '../playwright';

export type WaitForAppReadyOptions = {
  timeout?: number;
};

/**
 * Read an element's scroll dimensions for asserting scroll/overflow behavior.
 */
export const getScrollMetrics = (locator: Locator) =>
  locator.evaluate((el) => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, scrollTop: el.scrollTop }));

/**
 * Wait for the Electron app to have a ready, loaded window.
 * Handles cases where the first window is slow to appear.
 */
export const waitForReadyPage = (
  app: ElectronApplication,
  options: WaitForAppReadyOptions = {}
) => waitForReadyPageImpl(app, options);

/**
 * Read the system clipboard through the renderer, which is where the app's copy
 * buttons write. Windows hands multi-line text back as CRLF, so line endings are
 * normalized and callers can compare against plain \n.
 * @param page - The page object
 * @returns The clipboard's text
 */
export const readClipboard = async (page: Page): Promise<string> => {
  const text = await page.evaluate(() => navigator.clipboard.readText());
  return text.replace(/\r\n/g, '\n');
};

/**
 * Resizes the main window's content area and waits until the renderer reports the new width.
 * @param app - The Electron app owning the window
 * @param page - The Playwright page object
 * @param size - The content width and height to resize to
 * @returns void
 */
export const setWindowContentSize = async (app: ElectronApplication, page: Page, size: { width: number; height: number }) => {
  await app.evaluate(({ BrowserWindow }, { width, height }) => {
    BrowserWindow.getAllWindows()[0].setContentSize(width, height);
  }, size);

  await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(size.width);
};
