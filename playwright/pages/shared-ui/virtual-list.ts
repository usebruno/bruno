import { Page, Locator } from '../..';

export const SETTLE_MS = 2_000;

/**
 * Scroll a row inside a react-virtuoso table (request/folder/collection vars or
 * env vars — both rendered with the `table-container` className) into view so it
 * mounts in the DOM. Virtuoso only keeps rows near the viewport mounted and can
 * restore a persisted scroll position, so reset to the top first — retried, to
 * beat that restore — then walk down until `target` mounts.
 */
export const scrollVirtuosoRowIntoView = async (page: Page, target: Locator) => {
  if (await target.count()) {
    await target.scrollIntoViewIfNeeded({ timeout: SETTLE_MS }).catch(() => { });
    return;
  }

  const scroll = (toTop: boolean) => page.evaluate((toTop) => {
    let moved = false;
    document.querySelectorAll('.table-container').forEach((el) => {
      const before = el.scrollTop;
      el.scrollTop = toTop ? 0 : el.scrollTop + el.clientHeight * 0.7 + 80;
      if (el.scrollTop !== before) moved = true;
    });
    return moved;
  }, toTop);

  for (let i = 0; i < 5; i++) {
    await scroll(true);
    await page.waitForTimeout(120);
    if (await target.count()) {
      await target.scrollIntoViewIfNeeded({ timeout: SETTLE_MS }).catch(() => { });
      return;
    }
  }

  for (let i = 0; i < 40; i++) {
    if (await target.count()) break;
    if (!(await scroll(false))) break;
    await page.waitForTimeout(120);
  }
  await target.scrollIntoViewIfNeeded({ timeout: SETTLE_MS }).catch(() => { });
};
