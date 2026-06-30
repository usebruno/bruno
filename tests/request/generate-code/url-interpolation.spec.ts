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
  test('resolves {{var}} in URL when interpolation is ON, keeps template when OFF', async ({
    pageWithUserData: page
  }) => {
    await openCollection(page, COLLECTION);
    await openRequestInFolder(page, FOLDER, 'interpolation-url-var');

    // Open the dialog.
    await getGeneratedSnippet(page);

    await setInterpolateVariables(page, true);
    const interpolated = await readGeneratedSnippet(page);
    expect(interpolated).toContain('http://localhost:8081/api/echo/anything/ping');
    expect(interpolated).not.toContain('{{host}}');

    await setInterpolateVariables(page, false);
    const templated = await readGeneratedSnippet(page);
    expect(templated).toContain('{{host}}/api/echo/anything/ping');
    expect(templated).not.toContain('http://localhost:8081/api/echo/anything/ping');

    await closeGenerateCodeDialog(page);
  });

  test('resolves :pathParam when interpolation is ON, keeps :pathParam when OFF', async ({
    pageWithUserData: page
  }) => {
    await openCollection(page, COLLECTION);
    await openRequestInFolder(page, FOLDER, 'interpolation-path-param');

    // Open the dialog.
    await getGeneratedSnippet(page);

    await setInterpolateVariables(page, true);
    const interpolated = await readGeneratedSnippet(page);
    expect(interpolated).toContain('http://localhost:8081/api/echo/anything/users/123');
    expect(interpolated).not.toContain('{{host}}');
    expect(interpolated).not.toContain(':userId');

    await setInterpolateVariables(page, false);
    const templated = await readGeneratedSnippet(page);
    expect(templated).toContain('{{host}}/api/echo/anything/users/:userId');
    expect(templated).not.toContain('/users/123');

    await closeGenerateCodeDialog(page);
  });
});
