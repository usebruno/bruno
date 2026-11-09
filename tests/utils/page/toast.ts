import { Page } from '../../../playwright';

/**
 * Toast (react-hot-toast) locators, parameterised by message.
 */
export const buildToastLocators = (page: Page) => ({
  byMessage: (message: string | RegExp) => page.getByRole('status').filter({ hasText: message })
});

/**
 * Records every toast matching `pattern` that appears while `run` executes, and returns their text.
 * Toasts dismiss themselves, so asserting one never appeared by counting them races that dismissal;
 * watching the DOM for the whole window does not.
 */
export const recordToasts = async (page: Page, pattern: RegExp, run: () => Promise<void>): Promise<string[]> => {
  await page.evaluate(
    ({ source, flags }) => {
      const matcher = new RegExp(source, flags);
      const seen: string[] = [];
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            const text = node.textContent ?? '';
            if (matcher.test(text)) seen.push(text);
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      Object.assign(window, { __recordedToasts: seen, __recordedToastsObserver: observer });
    },
    { source: pattern.source, flags: pattern.flags }
  );

  try {
    await run();
    return await page.evaluate(() => (window as unknown as { __recordedToasts?: string[] }).__recordedToasts ?? []);
  } finally {
    await page.evaluate(() => {
      const scope = window as unknown as { __recordedToastsObserver?: MutationObserver };
      scope.__recordedToastsObserver?.disconnect();
      delete scope.__recordedToastsObserver;
      delete (window as unknown as { __recordedToasts?: string[] }).__recordedToasts;
    });
  }
};
