import { test, expect } from '../../playwright';

test.describe('manage protofile', () => {
  test('protofiles, import paths from bruno.json are visible in the protobuf settings', async ({ pageWithUserData: page }) => {
    await page.locator('#sidebar-collection-name').filter({ hasText: 'Grpcbin' }).click();

    await page.getByRole('tab', { name: 'Protobuf' }).click();

    // Wait for protobuf settings to load
    await page.locator('[data-test-id="protobuf-proto-files-section"]').waitFor();

    // Check proto files table
    const protoFilesTable = page.locator('[data-test-id="protobuf-proto-files-table"]');
    expect(protoFilesTable).toBeVisible();

    const file = page.getByRole('cell', { name: 'product.proto', exact: true });
    expect(file).toBeVisible();

    const filePath = page.getByRole('cell', { name: '../protos/services/product.proto' });
    expect(filePath).toBeVisible();

    // Check import paths table
    const importPathsTable = page.locator('[data-test-id="protobuf-import-paths-table"]');
    expect(importPathsTable).toBeVisible();

    const importPath = page.getByRole('cell', { name: 'types', exact: true });
    expect(importPath).toBeVisible();

    const invalidFilePath = page.getByRole('cell', { name: 'invalid-file-path.proto', exact: true });
    expect(invalidFilePath).toBeVisible();

    const invalidImportPath = page.getByRole('cell', { name: 'invalid-import-path', exact: true });
    expect(invalidImportPath).toBeVisible();

    const collectionPathAsImportPath = page.getByRole('cell', { name: '.', exact: true });
    const collectionPathName = page.getByRole('cell', { name: 'collection', exact: true });

    // Invalid messages using test IDs
    const invalidProtoFilesMessage = page.locator('[data-test-id="protobuf-invalid-files-message"]');
    const invalidImportPathsMessage = page.locator('[data-test-id="protobuf-invalid-import-paths-message"]');

    expect(invalidProtoFilesMessage).toBeVisible();
    expect(invalidImportPathsMessage).toBeVisible();

    expect(collectionPathAsImportPath).toBeVisible();
    expect(collectionPathName).toBeVisible();

    // Use test IDs for buttons
    await page.locator('[data-test-id="protobuf-remove-file-button"]').first().click();
    await page.locator('[data-test-id="protobuf-remove-import-path-button"]').first().click();
    await page.locator('[data-test-id="protobuf-save-button"]').click();

    expect(invalidProtoFilesMessage).not.toBeVisible();
    expect(invalidImportPathsMessage).not.toBeVisible();

    expect(invalidFilePath).not.toBeVisible();
    expect(invalidImportPath).not.toBeVisible();
  });

  test('order.proto loads methods successfully when selected', async ({ pageWithUserData: page }) => {
    await page.locator('#sidebar-collection-name').filter({ hasText: 'Grpcbin' }).click();
    await page.getByText('HelloService').click();
    await page.getByText('SayHello').click();

    // Wait for gRPC query URL container to load
    await page.locator('[data-test-id="grpc-query-url-container"]').waitFor();

    await page.getByText('Using Reflection').click();
    await page.getByText('Proto FileReflection').click();

    // Use more specific selector for proto file selection
    await page.locator('div').filter({ hasText: /^order\.proto\.\.\/protos\/services\/order\.proto$/ }).first().click();

    // Use test ID for method selection
    await page.locator('[data-test-id="grpc-methods-dropdown"]').click();
    const method = page.locator('[data-test-id="grpc-method-item"]').filter({ hasText: /^CreateOrderunary$/ }).first();
    expect(method).toBeVisible();
    await method.click();
    await page.getByRole('tab', { name: 'gRPC sayHello' }).getByRole('img').click();
    await page.getByRole('button', { name: 'Don\'t Save' }).click();
  });

  test('product.proto fails to load methods when selected', async ({ pageWithUserData: page }) => {
    await page.locator('#sidebar-collection-name').filter({ hasText: 'Grpcbin' }).click();
    await page.getByText('HelloService').click();
    await page.getByText('SayHello').click();

    // Wait for gRPC query URL container to load
    await page.locator('[data-test-id="grpc-query-url-container"]').waitFor();

    await page.getByText('Using Reflection').click();
    await page.getByText('Proto FileReflection').click();

    // Use more specific selector for proto file selection
    await page.locator('div').filter({ hasText: /^product\.proto\.\.\/protos\/services\/product\.proto$/ }).first().click();

    const loadedMethodsMessage = await page.getByText('Failed to load gRPC methods: Unknown error').first().isVisible();
    expect(loadedMethodsMessage).toBe(true);

    // Check that methods dropdown is not visible when loading fails
    const methodsDropdown = page.locator('[data-test-id="grpc-methods-dropdown"]');
    expect(methodsDropdown).not.toBeVisible();

    await page.getByRole('tab', { name: 'gRPC sayHello' }).getByRole('img').click();
    await page.getByRole('button', { name: 'Don\'t Save' }).click();
  });

  test('product.proto successfully loads methods once import path is provided', async ({ pageWithUserData: page }) => {
    await page.locator('#sidebar-collection-name').filter({ hasText: 'Grpcbin' }).click();
    // add import path within collection setting, protobuf tab
    await page.getByRole('tab', { name: 'Protobuf' }).click();

    // Wait for protobuf settings to load
    await page.locator('[data-test-id="protobuf-import-paths-section"]').waitFor();

    // Use test ID for checkbox
    await page.getByRole('checkbox', { name: 'Enable this import path' }).check();
    // Save the changes using test ID
    await page.getByRole('button', { name: 'Save' }).click();

    // Now test that product.proto can load methods successfully
    await page.getByText('HelloService').click();
    await page.getByText('SayHello').click();

    // Wait for gRPC query URL container to load
    await page.locator('[data-test-id="grpc-query-url-container"]').waitFor();

    await page.getByText('Using Reflection').click();
    await page.getByText('Proto FileReflection').click();

    // Use more specific selector for proto file selection
    await page.locator('div').filter({ hasText: /^product\.proto\.\.\/protos\/services\/product\.proto$/ }).first().click();
    await page.locator('[data-test-id="grpc-methods-dropdown"]').click();
    const method = page.locator('[data-test-id="grpc-methods-list"] div').filter({ hasText: 'CreateProductunary' }).first();
    expect(method).toBeVisible();
    await method.click();

    // Clean up
    await page.getByRole('tab', { name: 'gRPC sayHello' }).getByRole('img').click();
    await page.getByRole('button', { name: 'Don\'t Save' }).click();
  });
});
