import { expect, test } from '../../../playwright';
import {
  closeGenerateCodeDialog,
  getGeneratedSnippet,
  openCollection,
  openRequestInFolder,
  readGeneratedSnippet,
  setInterpolateVariables
} from '../../utils/page';

const COLLECTION = 'generate-code-encoding';
const FOLDER = 'requests';

test.describe('Generate Code – URL variable interpolation toggle', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeGenerateCodeDialog(page);
  });

  test('resolves {{var}} in URL when interpolation is ON, keeps template when OFF', async ({
    pageWithUserData: page
  }) => {
    await openCollection(page, COLLECTION);
    await openRequestInFolder(page, FOLDER, 'interpolation-url-var');

    // Open the dialog.
    await getGeneratedSnippet(page);

    await setInterpolateVariables(page, true);
    await expect(async () => {
      const interpolated = await readGeneratedSnippet(page);
      expect(interpolated).toContain('http://localhost:8081/api/echo/anything/ping');
      expect(interpolated).not.toContain('{{host}}');
    }).toPass({ timeout: 5000 });

    await setInterpolateVariables(page, false);
    await expect(async () => {
      const templated = await readGeneratedSnippet(page);
      expect(templated).toContain('{{host}}/api/echo/anything/ping');
      expect(templated).not.toContain('http://localhost:8081/api/echo/anything/ping');
    }).toPass({ timeout: 5000 });
  });

  test('resolves :pathParam when interpolation is ON, keeps :pathParam when OFF', async ({
    pageWithUserData: page
  }) => {
    await openCollection(page, COLLECTION);
    await openRequestInFolder(page, FOLDER, 'interpolation-path-param');

    // Open the dialog.
    await getGeneratedSnippet(page);

    await setInterpolateVariables(page, true);
    await expect(async () => {
      const interpolated = await readGeneratedSnippet(page);
      expect(interpolated).toContain('http://localhost:8081/api/echo/anything/users/123');
      expect(interpolated).not.toContain('{{host}}');
      expect(interpolated).not.toContain(':userId');
    }).toPass({ timeout: 5000 });

    await setInterpolateVariables(page, false);
    await expect(async () => {
      const templated = await readGeneratedSnippet(page);
      expect(templated).toContain('{{host}}/api/echo/anything/users/:userId');
      expect(templated).not.toContain('/users/123');
    }).toPass({ timeout: 5000 });
  });
});
