import { test, expect } from '../../playwright';

test.describe('manage protofile', () => {

  test('protofiles, import paths from bruno.json are visible in the protobuf settings', async ({ pageWithUserData: page }) => {
    await page.locator('#sidebar-collection-name').filter({ hasText: 'Grpcbin' }).click();

    await page.getByRole('tab', { name: 'Protobuf' }).click();

    const file = page.getByRole('cell', { name: 'product.proto', exact: true })
    expect(file).toBeVisible();

    const filePath = page.getByRole('cell', { name: '../protos/services/product.proto' })
    expect(filePath).toBeVisible();

    const importPath = page.getByRole('cell', { name: 'types', exact: true })
    expect(importPath).toBeVisible();

    const invalidFilePath = page.getByRole('cell', { name: 'invalid-file-path.proto', exact: true })
    expect(invalidFilePath).toBeVisible();

    const invalidImportPath = page.getByRole('cell', { name: 'invalid-import-path', exact: true })
    expect(invalidImportPath).toBeVisible();

    const collectionPathAsImportPath = page.getByRole('cell', { name: '.', exact: true })
    const collectionPathName = page.getByRole('cell', { name: 'Grpcbin', exact: true })

    // Invalid messages
    const invalidProtoFilesMessage = page.getByText('Some proto files cannot be')
    const invalidImportPathsMessage = page.getByText('Some import paths cannot be')

    expect(invalidProtoFilesMessage).toBeVisible();
    expect(invalidImportPathsMessage).toBeVisible();

    expect(collectionPathAsImportPath).toBeVisible();
    expect(collectionPathName).toBeVisible();

    await page.getByRole('button', { name: 'Remove file' }).first().click();
    await page.getByRole('button', { name: 'Remove import path' }).first().click()
    await page.getByRole('button', { name: 'Save' }).click();

    expect(invalidProtoFilesMessage).not.toBeVisible()
    expect(invalidImportPathsMessage).not.toBeVisible();

    expect(invalidFilePath).not.toBeVisible();
    expect(invalidImportPath).not.toBeVisible();
  });

  test('order.proto loads methods successfully when selected', async ({ pageWithUserData: page }) => {
    await page.locator('#sidebar-collection-name').filter({ hasText: 'Grpcbin' }).click();
    await page.getByText('HelloService').click();
    await page.getByText('SayHello').click();
    await page.getByText('Using Reflection').click();
    await page.getByText('Proto FileReflection').click();
    await page.locator('div').filter({ hasText: /^order\.proto\.\.\/protos\/services\/order\.proto$/ }).nth(1).click();

    const loadedMethodsMessage = await page.getByText('Loaded 6 gRPC methods from proto file').first().isVisible();
    expect(loadedMethodsMessage).toBe(true);

    await page.getByText('Select Method').click();
    const method = page.locator('div').filter({ hasText: /^CreateOrderunary$/ }).first();
    expect(method).toBeVisible();
    await method.click();
    await page.getByRole('tab', { name: 'gRPC sayHello' }).getByRole('img').click();
    await page.getByRole('button', { name: 'Don\'t Save' }).click();
  })

  test('product.proto fails to load methods when selected', async ({ pageWithUserData: page }) => {
    await page.locator('#sidebar-collection-name').filter({ hasText: 'Grpcbin' }).click();
    await page.getByText('HelloService').click();
    await page.getByText('SayHello').click();
    await page.getByText('Using Reflection').click();
    await page.getByText('Proto FileReflection').click();
    await page.locator('div').filter({ hasText: /^product\.proto\.\.\/protos\/services\/product\.proto$/ }).nth(1).click();

    const loadedMethodsMessage = await page.getByText('Failed to load gRPC methods: Unknown error').first().isVisible();
    expect(loadedMethodsMessage).toBe(true);

    const selectMethod = page.getByText('Select Method');
    expect(selectMethod).not.toBeVisible();
    await page.getByRole('tab', { name: 'gRPC sayHello' }).getByRole('img').click();
    await page.getByRole('button', { name: 'Don\'t Save' }).click();
  })

  test('product.proto successfully loads methods once import path is provided', async ({ pageWithUserData: page }) => {
    await page.locator('#sidebar-collection-name').filter({ hasText: 'Grpcbin' }).click();
    // add import path within collection setting, protobuf tab
    await page.getByRole('tab', { name: 'Protobuf' }).click();
    await page.getByRole('checkbox', { name: 'Enable this import path' }).check();
    // Save the changes
    await page.getByRole('button', { name: 'Save' }).click();
    
    // Now test that product.proto can load methods successfully
    await page.getByText('HelloService').click();
    await page.getByText('SayHello').click();
    await page.getByText('Using Reflection').click();
    await page.getByText('Proto FileReflection').click();
    await page.locator('div').filter({ hasText: /^product\.proto\.\.\/protos\/services\/product\.proto$/ }).nth(1).click();

    // Should now successfully load methods instead of failing
    const loadedMethodsMessage = await page.getByText('Loaded 9 gRPC methods from proto file').first().isVisible();
    expect(loadedMethodsMessage).toBe(true);

    // Verify that Select Method dropdown is now visible
    const selectMethod = page.getByText('Select Method');
    expect(selectMethod).toBeVisible();
    
    // Clean up
    await page.getByRole('tab', { name: 'gRPC sayHello' }).getByRole('img').click();
    await page.getByRole('button', { name: 'Don\'t Save' }).click();
  })
});
