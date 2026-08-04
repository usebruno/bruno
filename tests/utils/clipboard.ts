import { Page } from '../../playwright';

// The OS clipboard is shared across parallel workers, so asserting on real clipboard
// content races with other copy tests. This captures writes in-page instead and
// returns a reader for the last copied text.
export const captureClipboardWrites = async (page: Page): Promise<() => Promise<string | null>> => {
  await page.evaluate(() => {
    (window as any).__copiedText = null;
    navigator.clipboard.writeText = (text: string) => {
      (window as any).__copiedText = text;
      return Promise.resolve();
    };
  });
  return () => page.evaluate(() => (window as any).__copiedText as string | null);
};
