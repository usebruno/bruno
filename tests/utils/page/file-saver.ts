import { Page } from '../../../playwright';

/**
 * Capture a `FileSaver.saveAs` download that never surfaces as a Playwright
 * `download` event (in-memory Blob + synthetic `<a download>` click).
 *
 * Arms renderer-side intercepts, runs `trigger` (the click that starts the
 * save), and returns the Blob text plus the suggested file name. The real
 * save is suppressed so nothing leaks to disk.
 */
export const captureFileSaverDownload = async (
  page: Page,
  trigger: () => Promise<void>
): Promise<{ content: string; fileName: string }> => {
  await page.evaluate(() => {
    const w = window as any;
    const originalCreate = URL.createObjectURL.bind(URL);
    const originalDispatch = HTMLAnchorElement.prototype.dispatchEvent;
    w.__originalCreateObjectURL = originalCreate;
    w.__originalDispatchEvent = originalDispatch;

    w.__fileSaverContent = new Promise<string>((resolve) => {
      URL.createObjectURL = function (obj: Blob | MediaSource) {
        if (obj instanceof Blob) {
          obj.text().then(resolve);
        }
        return originalCreate(obj as Blob);
      };
    });

    w.__fileSaverFileName = new Promise<string>((resolve) => {
      HTMLAnchorElement.prototype.dispatchEvent = function (this: HTMLAnchorElement, event: Event) {
        if (this.download && event && event.type === 'click') {
          resolve(this.download);
          // Suppress the actual save — the Blob content is already captured.
          return true;
        }
        return originalDispatch.call(this, event);
      };
    });
  });

  try {
    await trigger();
  } finally {
    await page.evaluate(() => {
      const w = window as any;
      URL.createObjectURL = w.__originalCreateObjectURL;
      HTMLAnchorElement.prototype.dispatchEvent = w.__originalDispatchEvent;
    });
  }

  const content = await page.evaluate(() => (window as any).__fileSaverContent as Promise<string>);
  const fileName = await page.evaluate(() => (window as any).__fileSaverFileName as Promise<string>);

  return { content, fileName };
};
