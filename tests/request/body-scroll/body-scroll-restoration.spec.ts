import { test, expect, Page } from '../../../playwright';
import {
  closeAllCollections,
  createCollection,
  createRequest,
  selectRequestPaneTab,
  openRequest
} from '../../utils/page';

// Generate a large JSON body that requires scrolling
const generateLargeJsonBody = () => JSON.stringify(
  {
    users: Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      address: {
        street: `${i + 1} Main Street`,
        city: 'Test City',
        zipCode: `${10000 + i}`
      },
      metadata: {
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        tags: ['tag1', 'tag2', 'tag3']
      }
    }))
  },
  null,
  2
);

// Helper to set body content using CodeMirror API
const setBodyContent = async (page: Page, content: string) => {
  const bodyEditor = page.locator('.request-pane .CodeMirror').first();
  await bodyEditor.evaluate((el, value) => {
    const cm = (el as any).CodeMirror;
    if (cm) {
      cm.setValue(value);
    }
  }, content);
};

// Helper to get scroll position
const getScrollPosition = async (page: Page): Promise<number> => {
  const bodyEditor = page.locator('.request-pane .CodeMirror').first();
  return await bodyEditor.evaluate((el) => {
    const cm = (el as any).CodeMirror;
    if (cm && cm.doc) {
      return cm.doc.scrollTop || 0;
    }
    const scrollElement = el.querySelector('.CodeMirror-scroll');
    return scrollElement ? scrollElement.scrollTop : 0;
  });
};

// Helper to set scroll position
const setScrollPosition = async (page: Page, scrollTop: number) => {
  const bodyEditor = page.locator('.request-pane .CodeMirror').first();
  await bodyEditor.evaluate((el, top) => {
    const cm = (el as any).CodeMirror;
    if (cm) {
      cm.scrollTo(null, top);
    }
  }, scrollTop);
};

// Helper to select body mode
const selectBodyMode = async (page: Page, mode: string) => {
  await page.locator('.body-mode-selector').click();
  await page.locator('.dropdown-item').filter({ hasText: mode }).click();
  await page.waitForTimeout(100);
};

test.describe('Request Body Scroll Position Restoration', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should restore scroll position when switching tabs and back', async ({ page, createTmpDir }) => {
    const collectionName = 'body-scroll-test';
    const largeJsonBody = generateLargeJsonBody();

    await test.step('Create collection and request with JSON body', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, 'scroll-test', collectionName, {
        url: 'https://testbench-sanity.usebruno.com/api/echo/json'
      });
    });

    await test.step('Navigate to Body tab and set JSON body', async () => {
      await selectRequestPaneTab(page, 'Body');
      await selectBodyMode(page, 'JSON');
      await setBodyContent(page, largeJsonBody);
    });

    let initialScrollTop: number;

    await test.step('Scroll down in the body editor', async () => {
      await setScrollPosition(page, 500);
      await page.waitForTimeout(200);
      initialScrollTop = await getScrollPosition(page);
      expect(initialScrollTop).toBeGreaterThan(0);
    });

    await test.step('Switch to Headers tab', async () => {
      await selectRequestPaneTab(page, 'Headers');
      await page.waitForTimeout(200);
    });

    await test.step('Switch back to Body tab and verify scroll position', async () => {
      await selectRequestPaneTab(page, 'Body');
      await page.waitForTimeout(300);

      const restoredScrollTop = await getScrollPosition(page);

      // The restored scroll position should be approximately the same
      // Allow some tolerance for rendering differences
      expect(restoredScrollTop).toBeGreaterThan(0);
      expect(Math.abs(restoredScrollTop - initialScrollTop)).toBeLessThan(50);
    });
  });

  test('should restore scroll position when switching between requests', async ({ page, createTmpDir }) => {
    const collectionName = 'body-scroll-multi-request';
    const largeJsonBody = generateLargeJsonBody();

    await test.step('Create collection with two requests', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, 'request-1', collectionName, {
        url: 'https://testbench-sanity.usebruno.com/api/echo/json'
      });
      await createRequest(page, 'request-2', collectionName, {
        url: 'https://testbench-sanity.usebruno.com/ping'
      });
    });

    let scrollPosition: number;

    await test.step('Open first request, add body, and scroll', async () => {
      await openRequest(page, collectionName, 'request-1');
      await selectRequestPaneTab(page, 'Body');
      await selectBodyMode(page, 'JSON');
      await setBodyContent(page, largeJsonBody);

      await setScrollPosition(page, 400);
      await page.waitForTimeout(200);

      scrollPosition = await getScrollPosition(page);
      expect(scrollPosition).toBeGreaterThan(0);
    });

    await test.step('Switch to second request', async () => {
      await openRequest(page, collectionName, 'request-2');
      await page.waitForTimeout(200);
    });

    await test.step('Switch back to first request and verify scroll position', async () => {
      await openRequest(page, collectionName, 'request-1');
      await selectRequestPaneTab(page, 'Body');
      await page.waitForTimeout(300);

      const restoredScrollTop = await getScrollPosition(page);

      // Verify scroll position is restored
      expect(restoredScrollTop).toBeGreaterThan(0);
      expect(Math.abs(restoredScrollTop - scrollPosition)).toBeLessThan(50);
    });
  });

  test('should preserve scroll position for XML body mode', async ({ page, createTmpDir }) => {
    const collectionName = 'body-scroll-xml';

    // Generate large XML body
    const largeXmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<root>
${Array.from({ length: 50 }, (_, i) => `  <item id="${i + 1}">
    <name>Item ${i + 1}</name>
    <description>This is a description for item ${i + 1}</description>
    <metadata>
      <created>2024-01-01T00:00:00Z</created>
      <updated>2024-01-01T00:00:00Z</updated>
    </metadata>
  </item>`).join('\n')}
</root>`;

    await test.step('Create collection and request', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, 'xml-scroll-test', collectionName, {
        url: 'https://testbench-sanity.usebruno.com/api/echo/xml'
      });
    });

    await test.step('Set XML body mode and add content', async () => {
      await selectRequestPaneTab(page, 'Body');
      await selectBodyMode(page, 'XML');
      await setBodyContent(page, largeXmlBody);
    });

    let xmlScrollPosition: number;

    await test.step('Scroll in XML body and verify restoration', async () => {
      await setScrollPosition(page, 350);
      await page.waitForTimeout(200);

      xmlScrollPosition = await getScrollPosition(page);
      expect(xmlScrollPosition).toBeGreaterThan(0);

      // Switch tabs
      await selectRequestPaneTab(page, 'Params');
      await page.waitForTimeout(200);

      // Switch back
      await selectRequestPaneTab(page, 'Body');
      await page.waitForTimeout(300);

      const restoredScrollTop = await getScrollPosition(page);

      expect(restoredScrollTop).toBeGreaterThan(0);
      expect(Math.abs(restoredScrollTop - xmlScrollPosition)).toBeLessThan(50);
    });
  });
});
