import path from 'path';
import { test, expect } from '../../playwright';
import { closeAllCollections } from '../utils/page';
import fs from 'fs';

const COLLECTION_PATH = path.join(__dirname, 'collection', 'bruno.json');
const BACKUP_PATH = path.join(__dirname, 'collection', 'bruno.json.backup');
import { execSync } from 'child_process';

test.describe('manage protofile', () => {
  test.beforeAll(async () => {
    // Backup original file
    if (fs.existsSync(COLLECTION_PATH)) {
      fs.copyFileSync(COLLECTION_PATH, BACKUP_PATH);
    }
  });

  test.afterAll(async ({ pageWithUserData: page }) => {
    // Close all collections
    await closeAllCollections(page);
    // Reset the collection request file to the original state
    execSync(`git checkout -- ${path.join(__dirname, 'collection', 'bruno.json')}`);
  });

  test('protofiles, import paths from bruno.json are visible in the protobuf settings', async ({ pageWithUserData: page }) => {
    await page.locator('#sidebar-collection-name').filter({ hasText: 'Grpcbin' }).click();

    await page.getByRole('tab', { name: 'Protobuf' }).click();

    // Wait for protobuf settings to load
    const protobufProtoFilesSection = page.getByTestId('protobuf-proto-files-section');
    await protobufProtoFilesSection.waitFor({ state: 'visible' });

    // Check proto files table
    const protoFilesTable = page.getByTestId('protobuf-proto-files-table');
    await expect(protoFilesTable).toBeVisible();

    const file = page.getByRole('cell', { name: 'product.proto', exact: true });
    expect(file).toBeVisible();

    const filePath = page.getByRole('cell', { name: '../protos/services/product.proto' });
    expect(filePath).toBeVisible();

    // Check import paths table
    const importPathsTable = page.getByTestId('protobuf-import-paths-table');
    await expect(importPathsTable).toBeVisible();

    const importPath = page.getByRole('cell', { name: '../protos/types', exact: true });
    await expect(importPath).toBeVisible();

    const invalidFilePath = page.getByRole('cell', { name: 'invalid-file-path.proto', exact: true });
    await expect(invalidFilePath).toBeVisible();

    const invalidImportPath = page.getByRole('cell', { name: '../protos/invalid-import-path', exact: true });
    await expect(invalidImportPath).toBeVisible();

    const collectionPathAsImportPath = page.getByRole('cell', { name: '.', exact: true });
    const collectionPathName = page.getByRole('cell', { name: 'collection', exact: true });

    // Invalid messages using test IDs
    const invalidProtoFilesMessage = page.getByTestId('protobuf-invalid-files-message');
    const invalidImportPathsMessage = page.getByTestId('protobuf-invalid-import-paths-message');

    await expect(invalidProtoFilesMessage).toBeVisible();
    await expect(invalidImportPathsMessage).toBeVisible();

    await expect(collectionPathAsImportPath).toBeVisible();
    await expect(collectionPathName).toBeVisible();

    await page.getByRole('row', { name: 'invalid-file-path.proto' }).getByTestId('protobuf-remove-file-button').click();

    await expect(page.getByRole('cell', { name: 'invalid-file-path.proto', exact: true })).not.toBeVisible();
    await expect(invalidProtoFilesMessage).not.toBeVisible();

    await page.getByRole('row', { name: '../protos/invalid-import-path' }).getByTestId('protobuf-remove-import-path-button').click();

    await expect(page.getByRole('cell', { name: '../protos/invalid-import-path', exact: true })).not.toBeVisible();
    await expect(invalidImportPathsMessage).not.toBeVisible();

    // Save the changes to persist them to bruno.json
    await page.getByRole('button', { name: 'Save' }).click();
  });

  test('order.proto loads methods successfully when selected', async ({ pageWithUserData: page }) => {
    await page.locator('#sidebar-collection-name').filter({ hasText: 'Grpcbin' }).click();
    await page.getByText('HelloService').click();
    await page.getByText('SayHello').click();

    // Wait for gRPC query URL container to load
    const grpcQueryUrlContainer = page.getByTestId('grpc-query-url-container');
    await grpcQueryUrlContainer.waitFor({ state: 'visible' });

    await page.getByText('Using Reflection').click();
    await page.getByText('Proto FileReflection').click();

    // Use more specific selector for proto file selection
    await page.locator('div').filter({ hasText: /^order\.proto\.\.\/protos\/services\/order\.proto$/ }).first().click();

    // Use test ID for method selection
    const grpcMethodsDropdown = page.getByTestId('grpc-methods-dropdown');
    await grpcMethodsDropdown.click();
    const method = page.getByTestId('grpc-method-item').filter({ hasText: /^CreateOrderunary$/ }).first();
    await expect(method).toBeVisible();
    await method.click();
    await page.getByRole('tab', { name: 'gRPC sayHello' }).getByRole('img').click();
    await page.getByRole('button', { name: 'Don\'t Save' }).click();
  });

  test('product.proto fails to load methods when selected', async ({ pageWithUserData: page }) => {
    await page.locator('#sidebar-collection-name').filter({ hasText: 'Grpcbin' }).click();
    await page.getByText('HelloService').click();
    await page.getByText('SayHello').click();

    // Wait for gRPC query URL container to load
    const grpcQueryUrlContainer = page.getByTestId('grpc-query-url-container');
    await grpcQueryUrlContainer.waitFor({ state: 'visible' });

    await page.getByText('Using Reflection').click();
    await page.getByText('Proto FileReflection').click();

    // Use more specific selector for proto file selection
    await page.locator('div').filter({ hasText: /^product\.proto\.\.\/protos\/services\/product\.proto$/ }).first().click();

    const loadedMethodsMessage = await page.getByText('Failed to load gRPC methods: Unknown error').first().isVisible();
    expect(loadedMethodsMessage).toBe(true);

    // Check that methods dropdown is not visible when loading fails
    const methodsDropdown = page.getByTestId('grpc-methods-dropdown');
    await expect(methodsDropdown).not.toBeVisible();

    await page.getByRole('tab', { name: 'gRPC sayHello' }).getByRole('img').click();
    await page.getByRole('button', { name: 'Don\'t Save' }).click();
  });

  test('product.proto successfully loads methods once import path is provided', async ({ pageWithUserData: page }) => {
    await page.locator('#sidebar-collection-name').filter({ hasText: 'Grpcbin' }).click();
    // add import path within collection setting, protobuf tab
    await page.getByRole('tab', { name: 'Protobuf' }).click();

    // Wait for protobuf settings to load
    const protobufImportPathsSection = page.getByTestId('protobuf-import-paths-section');
    await protobufImportPathsSection.waitFor({ state: 'visible' });
    const importPathTable = page.getByTestId('protobuf-import-paths-table');
    await expect(importPathTable).toBeVisible();

    // Use test ID for checkbox
    const checkbox = page.getByRole('row', { name: 'Enable this import path types' }).getByTestId('protobuf-import-path-checkbox');
    await checkbox.click();

    // Save the changes to persist them to bruno.json
    await page.getByRole('button', { name: 'Save' }).click();

    // Now test that product.proto can load methods successfully
    await page.getByText('HelloService').click();
    await page.getByText('SayHello').click();

    // Wait for gRPC query URL container to load
    const grpcQueryUrlContainer = page.getByTestId('grpc-query-url-container');
    await grpcQueryUrlContainer.waitFor({ state: 'visible' });

    await page.getByText('Using Reflection').click();
    await page.getByText('Proto FileReflection').click();

    // Use more specific selector for proto file selection
    await page.locator('div').filter({ hasText: /^product\.proto\.\.\/protos\/services\/product\.proto$/ }).first().click();
    const grpcMethodsDropdown = page.getByTestId('grpc-methods-dropdown');
    await grpcMethodsDropdown.click();
    const method = page.getByTestId('grpc-methods-list').filter({ hasText: 'CreateProductunary' }).first();
    await expect(method).toBeVisible();
    await method.click();

    // Clean up
    await page.getByRole('tab', { name: 'gRPC sayHello' }).getByRole('img').click();
    await page.getByRole('button', { name: 'Don\'t Save' }).click();
  });
});
