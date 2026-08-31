import { test, expect } from '../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createExampleFromSidebar,
  createRequest,
  dragExample,
  dragExampleOntoOtherRequestExample,
  expandRequestExamples,
  getSidebarExampleNames
} from '../utils/page';
import { exampleOrderOnDisk, exampleOrderOnDiskOrNull, fileSnapshot, requestFilePath } from './utils';

// Names are deliberately non-overlapping so on-disk ordering can be read from raw file
// positions without parsing either format.
const ALPHA = 'Alpha';
const BRAVO = 'Bravo';
const CHARLIE = 'Charlie';
const ALL = [ALPHA, BRAVO, CHARLIE];

const FORMATS: Array<'bru' | 'yml'> = ['bru', 'yml'];

test.describe('Reorder response examples via drag and drop', () => {
  test.setTimeout(2 * 60 * 1000);

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  for (const format of FORMATS) {
    test(`reorders examples and persists the new order in a ${format} collection`, async ({ page, createTmpDir }) => {
      const testDir = await createTmpDir(`example-reorder-${format}`);
      const collectionName = `Reorder ${format}`;
      const requestName = 'flights';

      await createCollection(page, collectionName, testDir, format);
      await createRequest(page, requestName, collectionName);

      await test.step('Create three examples', async () => {
        for (const name of ALL) {
          await createExampleFromSidebar(page, requestName, name);
        }
        await expandRequestExamples(page, requestName);
        await expect(getSidebarExampleNames(page, requestName)).resolves.toEqual(ALL);
      });

      const filePath = requestFilePath(testDir, requestName, format);

      await test.step('Examples start in creation order on disk', async () => {
        expect(exampleOrderOnDisk(filePath, ALL)).toEqual(ALL);
      });

      await test.step('Drag the last example above the first', async () => {
        await dragExample(page, requestName, CHARLIE, ALPHA, 'above');

        await expect
          .poll(() => getSidebarExampleNames(page, requestName))
          .toEqual([CHARLIE, ALPHA, BRAVO]);
      });

      await test.step('New order is written to disk', async () => {
        await expect
          .poll(() => exampleOrderOnDisk(filePath, ALL))
          .toEqual([CHARLIE, ALPHA, BRAVO]);
      });

      await test.step('Drag the first example below the last', async () => {
        await dragExample(page, requestName, CHARLIE, BRAVO, 'below');

        await expect
          .poll(() => getSidebarExampleNames(page, requestName))
          .toEqual([ALPHA, BRAVO, CHARLIE]);
        await expect
          .poll(() => exampleOrderOnDisk(filePath, ALL))
          .toEqual([ALPHA, BRAVO, CHARLIE]);
      });
    });
  }

  test('a drop that would not change the order leaves the file untouched', async ({ page, createTmpDir }) => {
    const testDir = await createTmpDir('example-reorder-noop');
    const collectionName = 'Reorder Noop';

    await createCollection(page, collectionName, testDir, 'bru');
    await createRequest(page, 'flights', collectionName);
    await createRequest(page, 'hotels', collectionName);

    for (const name of ALL) {
      await createExampleFromSidebar(page, 'flights', name);
    }
    await createExampleFromSidebar(page, 'hotels', ALPHA);
    await createExampleFromSidebar(page, 'hotels', BRAVO);
    await expandRequestExamples(page, 'flights');
    await expandRequestExamples(page, 'hotels');

    const flightsFile = requestFilePath(testDir, 'flights', 'bru');
    const hotelsFile = requestFilePath(testDir, 'hotels', 'bru');
    const flightsBefore = fileSnapshot(flightsFile);
    const hotelsBefore = fileSnapshot(hotelsFile);

    await test.step('Drop Bravo below Alpha — the slot it already occupies', async () => {
      await dragExample(page, 'flights', BRAVO, ALPHA, 'below');
    });

    await test.step('A reorder on hotels reaches disk, so the drop above had its chance', async () => {
      // The drop above resolves to the order already stored, so it writes nothing and offers no
      // signal to wait on. Driving a drop that does write gives one — and waiting for hotels'
      // new order to appear *on disk*, rather than just in the sidebar, means a write wrongly
      // triggered by the earlier drop has also had time to land.
      await dragExample(page, 'hotels', BRAVO, ALPHA, 'above');
      await expect.poll(() => exampleOrderOnDiskOrNull(hotelsFile, [ALPHA, BRAVO])).toEqual([BRAVO, ALPHA]);
    });

    await test.step('flights kept its order and its file was never rewritten', async () => {
      expect(await getSidebarExampleNames(page, 'flights')).toEqual(ALL);
      // mtime matters as much as the bytes here: this drop would have been saved with content
      // identical to what is already on disk, which a content-only check cannot detect.
      expect(fileSnapshot(flightsFile)).toEqual(flightsBefore);

      // hotels was rewritten by the reorder above, so its mtime must have moved — proving the
      // comparison just made can actually fail, rather than passing because mtime never changes.
      expect(fileSnapshot(hotelsFile).mtimeMs).toBeGreaterThan(hotelsBefore.mtimeMs);
    });
  });

  test('an open example tab still shows the same example after a reorder', async ({ page, createTmpDir }) => {
    const testDir = await createTmpDir('example-reorder-tab');
    const collectionName = 'Reorder Tab';
    const requestName = 'flights';
    const { sidebar, responseExample } = buildCommonLocators(page);

    await createCollection(page, collectionName, testDir, 'bru');
    await createRequest(page, requestName, collectionName);

    for (const name of ALL) {
      await createExampleFromSidebar(page, requestName, name);
    }
    await expandRequestExamples(page, requestName);

    await test.step('Alpha is the open example tab', async () => {
      const alphaRow = sidebar.exampleRowIn(requestName, ALPHA);
      await alphaRow.click();
      await expect(responseExample.title()).toHaveText(`${requestName} / ${ALPHA}`);
    });

    await test.step('Moving Charlie to the top leaves the open tab on Alpha', async () => {
      // Example uids are derived from (file, index) on the electron side, so a reorder that
      // failed to re-sync that mapping would silently repoint this tab at another example.
      await dragExample(page, requestName, CHARLIE, ALPHA, 'above');

      await expect
        .poll(() => getSidebarExampleNames(page, requestName))
        .toEqual([CHARLIE, ALPHA, BRAVO]);
      await expect(responseExample.title()).toHaveText(`${requestName} / ${ALPHA}`);
    });
  });

  test('dragging an example onto another request leaves both requests untouched', async ({ page, createTmpDir }) => {
    const testDir = await createTmpDir('example-reorder-cross');
    const collectionName = 'Reorder Cross';

    await createCollection(page, collectionName, testDir, 'bru');
    await createRequest(page, 'flights', collectionName);
    await createRequest(page, 'hotels', collectionName);

    await test.step('Give each request its own examples', async () => {
      await createExampleFromSidebar(page, 'flights', ALPHA);
      await createExampleFromSidebar(page, 'flights', BRAVO);
      await createExampleFromSidebar(page, 'hotels', CHARLIE);
      await expandRequestExamples(page, 'flights');
      await expandRequestExamples(page, 'hotels');
    });

    const flightsFile = requestFilePath(testDir, 'flights', 'bru');
    const hotelsFile = requestFilePath(testDir, 'hotels', 'bru');
    const hotelsBefore = fileSnapshot(hotelsFile);

    await test.step('Drag Alpha from flights onto Charlie under hotels', async () => {
      await dragExampleOntoOtherRequestExample(page, 'flights', ALPHA, 'hotels', CHARLIE);
    });

    await test.step('A valid reorder inside flights reaches disk, so the rejected drop had its chance', async () => {
      // The rejected drop writes nothing and so offers no signal to wait on. Waiting for a drop
      // that does write — all the way to disk, not just to the sidebar — bounds the window in
      // which the rejected one could still have written.
      await dragExample(page, 'flights', BRAVO, ALPHA, 'above');
      await expect.poll(() => exampleOrderOnDiskOrNull(flightsFile, [ALPHA, BRAVO])).toEqual([BRAVO, ALPHA]);
    });

    await test.step('Alpha stayed under flights and never reached hotels', async () => {
      expect(await getSidebarExampleNames(page, 'flights')).toEqual([BRAVO, ALPHA]);
      expect(await getSidebarExampleNames(page, 'hotels')).toEqual([CHARLIE]);

      // Unchanged bytes *and* mtime: hotels was never rewritten, so Alpha was never appended
      // and then removed either.
      expect(fileSnapshot(hotelsFile)).toEqual(hotelsBefore);
      expect(hotelsBefore.content).not.toContain(ALPHA);
    });
  });
});
