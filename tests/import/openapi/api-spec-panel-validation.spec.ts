import { test, expect } from '../../../playwright';
import * as path from 'path';

test.describe('API Spec Panel - open & preview validation', () => {
  let originalShowOpenDialog: any;

  test.beforeAll(async ({ electronApp }) => {
    // save the original showOpenDialog function
    await electronApp.evaluate(({ dialog }) => {
      originalShowOpenDialog = dialog.showOpenDialog;
    });
  });

  test.afterAll(async ({ electronApp }) => {
    // restore the original showOpenDialog function
    await electronApp.evaluate(({ dialog }) => {
      dialog.showOpenDialog = originalShowOpenDialog;
    });
  });

  test('Reject a file with an unsupported extension', async ({ page, electronApp }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-invalid-extension.txt');

    // Mock the native file dialog to return the fixture path
    await electronApp.evaluate(({ dialog }, openApiFile) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [openApiFile] });
    }, openApiFile);

    await page.getByTestId('api-specs-header-add-menu').click();
    await page.getByTestId('api-specs-header-add-menu-open-api-spec').click();

    await expect(
      page.getByText('Invalid file format. Please select a valid OpenAPI spec in YAML or JSON format.')
    ).toBeVisible({ timeout: 10000 });
  });

  test('Show the empty-spec message when opening an empty file', async ({ page, electronApp }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-empty.yaml');

    await electronApp.evaluate(({ dialog }, openApiFile) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [openApiFile] });
    }, openApiFile);

    await page.getByTestId('api-specs-header-add-menu').click();
    await page.getByTestId('api-specs-header-add-menu-open-api-spec').click();

    // Opened spec shows up in the sidebar; click it to render the preview pane
    await page.locator('.api-spec-item').filter({ hasText: 'openapi-empty' }).click();

    await expect(page.getByText('Unable to render preview: No API definition provided.')).toBeVisible({
      timeout: 10000
    });
  });

  test('Show a parse error when opening malformed YAML', async ({ page, electronApp }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-malformed.yaml');

    await electronApp.evaluate(({ dialog }, openApiFile) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [openApiFile] });
    }, openApiFile);

    await page.getByTestId('api-specs-header-add-menu').click();
    await page.getByTestId('api-specs-header-add-menu-open-api-spec').click();

    await page.locator('.api-spec-item').filter({ hasText: 'openapi-malformed' }).click();

    await expect(
      page.getByText('Unable to render preview: content is not a valid YAML or JSON.')
    ).toBeVisible({ timeout: 10000 });
  });

  test('Show a spec error when the file parses but is not a valid OpenAPI document', async ({ page, electronApp }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-missing-info.yaml');

    await electronApp.evaluate(({ dialog }, openApiFile) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [openApiFile] });
    }, openApiFile);

    await page.getByTestId('api-specs-header-add-menu').click();
    await page.getByTestId('api-specs-header-add-menu-open-api-spec').click();

    await page.locator('.api-spec-item').filter({ hasText: 'openapi-missing-info' }).click();

    // Parses as an object but lacks the openapi/swagger + info contract, so it must fail
    // fast with a precise message rather than falling through to the preview timeout.
    await expect(
      page.getByText('Unable to render preview: content is not a valid OpenAPI specification.')
    ).toBeVisible({ timeout: 10000 });
  });

  test('Render a valid spec without any preview error', async ({ page, electronApp }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-simple.json');

    await electronApp.evaluate(({ dialog }, openApiFile) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [openApiFile] });
    }, openApiFile);

    await page.getByTestId('api-specs-header-add-menu').click();
    await page.getByTestId('api-specs-header-add-menu-open-api-spec').click();

    await page.locator('.api-spec-item').filter({ hasText: 'Simple Test API' }).click();

    // Panel opens for the valid spec (filename shown in the header) and no preview error appears
    await expect(page.getByText('openapi-simple.json')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Unable to render preview/)).toHaveCount(0);
  });
});
