import { Page, test as base } from '../../../../playwright';

type GeneratedDocsCapture = {
  read: () => Promise<{ content: string; fileName: string }>;
};

// FileSaver writes docs through URL.createObjectURL and a synthetic <a download> click.
// The window is worker scoped and outlives the test, so both prototypes are put back at teardown
// even when an assertion fails.
export const test = base.extend<{
  captureGeneratedDocs: (page: Page) => Promise<GeneratedDocsCapture>;
}>({
  captureGeneratedDocs: async ({ }, use) => {
    const patchedPages: Page[] = [];

    await use(async (page: Page) => {
      await page.evaluate(() => {
        const w = window as any;
        w.__originalCreateObjectURL = URL.createObjectURL;
        w.__originalAnchorDispatch = HTMLAnchorElement.prototype.dispatchEvent;

        w.__docsContent = new Promise<string>((resolve) => {
          URL.createObjectURL = function (obj: Blob | MediaSource) {
            if (obj instanceof Blob) {
              obj.text().then(resolve);
            }
            return w.__originalCreateObjectURL.call(URL, obj);
          };
        });

        w.__docsFileName = new Promise<string>((resolve) => {
          HTMLAnchorElement.prototype.dispatchEvent = function (this: HTMLAnchorElement, event: Event) {
            if (this.download && event && event.type === 'click') {
              resolve(this.download);
              return true;
            }
            return w.__originalAnchorDispatch.call(this, event);
          };
        });
      });
      patchedPages.push(page);

      return {
        read: async () => {
          const [content, fileName] = await page.evaluate(() => Promise.all([
            (window as any).__docsContent as Promise<string>,
            (window as any).__docsFileName as Promise<string>
          ]));
          return { content, fileName };
        }
      };
    });

    await Promise.allSettled(
      patchedPages.map((page) => page.evaluate(() => {
        const w = window as any;
        if (typeof w.__originalCreateObjectURL === 'function') {
          URL.createObjectURL = w.__originalCreateObjectURL;
        }
        if (typeof w.__originalAnchorDispatch === 'function') {
          HTMLAnchorElement.prototype.dispatchEvent = w.__originalAnchorDispatch;
        }
        delete w.__docsContent;
        delete w.__docsFileName;
        delete w.__originalCreateObjectURL;
        delete w.__originalAnchorDispatch;
      }))
    );
  }
});
