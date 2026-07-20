import { test, expect } from '../../../playwright';
import * as path from 'path';
import {
  openApiSpecFromDialog,
  openApiSpecSidebarItem,
  expandOperation,
  operationExampleValue
} from '../../utils/page/openapi/render-spec';
import { SPEC_PREVIEW_ERRORS } from '../../../packages/bruno-app/src/components/ApiSpecPanel/constants';
import { INVALID_EXTENSION_MESSAGE } from '../../../packages/bruno-electron/src/app/apiSpecs';

test.describe('API Spec Panel - open & preview validation', () => {
  test.beforeAll(async ({ electronApp }) => {
    await electronApp.evaluate(({ dialog }) => {
      (dialog as any).__savedShowOpenDialog = dialog.showOpenDialog;
    });
  });

  test.afterAll(async ({ electronApp }) => {
    await electronApp.evaluate(({ dialog }) => {
      dialog.showOpenDialog = (dialog as any).__savedShowOpenDialog;
      delete (dialog as any).__savedShowOpenDialog;
    });
  });

  test('Reject a file with an unsupported extension', async ({ page, electronApp }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-invalid-extension.txt');
    await openApiSpecFromDialog(page, electronApp, openApiFile);
    await expect(
      page.getByText(INVALID_EXTENSION_MESSAGE)
    ).toBeVisible();
  });

  test('Show the empty-spec message when opening an empty file', async ({ page, electronApp }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-empty.yaml');
    await openApiSpecFromDialog(page, electronApp, openApiFile);
    await openApiSpecSidebarItem(page, 'openapi-empty');
    await expect(page.getByText(SPEC_PREVIEW_ERRORS.EMPTY)).toBeVisible();
  });

  test('Show a parse error when opening malformed YAML', async ({ page, electronApp }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-malformed.yaml');
    await openApiSpecFromDialog(page, electronApp, openApiFile);
    await openApiSpecSidebarItem(page, 'openapi-malformed');
    await expect(
      page.getByText(SPEC_PREVIEW_ERRORS.INVALID_YAML_JSON)
    ).toBeVisible();
  });

  test('Show a parse error when opening malformed JSON', async ({ page, electronApp }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-broken.json');
    await openApiSpecFromDialog(page, electronApp, openApiFile);
    await openApiSpecSidebarItem(page, 'openapi-broken');
    await expect(
      page.getByText(SPEC_PREVIEW_ERRORS.INVALID_YAML_JSON)
    ).toBeVisible();
  });

  test('Show a spec error when the file parses but is not a valid OpenAPI document', async ({ page, electronApp }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-missing-info.yaml');

    await openApiSpecFromDialog(page, electronApp, openApiFile);
    await openApiSpecSidebarItem(page, 'openapi-missing-info');
    // Parses as an object but lacks the openapi/swagger + info contract, so it must fail
    // fast with a precise message rather than falling through to the preview timeout.
    await expect(
      page.getByText(SPEC_PREVIEW_ERRORS.INVALID_OPENAPI)
    ).toBeVisible();
  });

  test('Render a valid spec without any preview error', async ({ page, electronApp }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-simple.json');
    await openApiSpecFromDialog(page, electronApp, openApiFile);
    await openApiSpecSidebarItem(page, 'Simple Test API');
    // Panel opens for the valid spec (filename shown in the header) and no preview error appears
    await expect(page.getByText('openapi-simple.json')).toBeVisible();
    await expect(page.getByText(/Unable to render preview/i)).toHaveCount(0);
  });

  test('Resolve $ref schemas when rendering a spec', async ({ page, electronApp }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-comprehensive.yaml');
    await openApiSpecFromDialog(page, electronApp, openApiFile);
    await openApiSpecSidebarItem(page, 'Comprehensive API Test Collection');

    await expandOperation(page, 'get', '/users');
    const exampleValue = operationExampleValue(page, 'get', '/users', '200');

    // pagination and users[] are $ref'd to the Pagination and User component schemas;
    // their fields only appear in the generated example if those refs resolved.
    await expect(exampleValue).toContainText('totalPages');
    await expect(exampleValue).toContainText('avatar');
    await expect(exampleValue).toContainText('createdAt');
  });
});
