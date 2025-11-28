# Playwright Testing Guide for Bruno

This guide explains how to create and run Playwright test cases for the Bruno application using the UI.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Creating Tests Using Codegen](#creating-tests-using-codegen)
- [Manual Test Creation](#manual-test-creation)
- [Test Structure and Organization](#test-structure-and-organization)
- [Available Test Fixtures](#available-test-fixtures)
- [Running Tests](#running-tests)
- [Best Practices](#best-practices)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## Overview

Bruno uses Playwright for end-to-end testing of its Electron application. The testing setup includes custom fixtures for Electron app testing and utilities for managing test data.

## Prerequisites

- Node.js installed
- All dependencies installed (`npm install`)
- Electron app can be built and run

## Creating Tests Using Codegen

The easiest way to create tests is using Playwright's codegen feature, which records your UI interactions and generates test code.

### Using the Built-in Codegen Script

```bash
# Generate a test with a specific name
npm run test:codegen my-new-test

# Generate a test without specifying a name (will prompt for input)
npm run test:codegen
```

### What Happens During Codegen

1. The Electron app launches automatically
2. Playwright Inspector opens in a separate window
3. You interact with the Bruno UI
4. Actions are recorded and converted to test code
5. The generated test file is saved in `e2e-tests/`

### Codegen Workflow

1. **Start Recording**: Run the codegen command
2. **Interact with UI**: Perform the actions you want to test
3. **Add Assertions**: Use the inspector to add assertions
4. **Save Test**: The test file is automatically generated
5. **Review and Refine**: Edit the generated test as needed

## Manual Test Creation

You can also create tests manually by following the established patterns.

### Basic Test Structure

```typescript
import { test, expect } from '../../playwright';

test('Test description', async ({ page }) => {
  // Test steps here
  await page.getByLabel('Some Label').click();

  // Assertions
  await expect(page.getByText('Expected Text')).toBeVisible();
});
```

### Test with Temporary Data

```typescript
import { test, expect } from '../../playwright';

test('Test with temporary data', async ({ page, createTmpDir }) => {
  // Create temporary directory for test data
  const testDir = await createTmpDir('test-collection');

  // Test steps
  await page.getByLabel('Create Collection').click();
  await page.getByLabel('Name').fill('test-collection');
  await page.getByLabel('Location').fill(testDir);

  // Assertions
  await expect(page.getByText('test-collection')).toBeVisible();
});
```

## Test Structure and Organization

### Directory Structure

```
e2e-tests/
├── 001-sanity-tests/          # Basic functionality tests
│   ├── 001-home-screen.spec.ts
│   └── 002-create-new-collection-and-new-request.spec.ts
├── 002-feature-tests/         # Specific feature tests
├── 003-integration-tests/     # Complex workflow tests
└── bruno-testbench/           # Test utilities and helpers
```

### Naming Conventions

- **Files**: Use descriptive names with `.spec.ts` extension
- **Tests**: Use clear, descriptive test names
- **Folders**: Use numbered prefixes for ordering

### Test File Template

```typescript
import { test, expect } from '../../playwright';

test.describe('Feature Name', () => {
  test('should perform specific action', async ({ page }) => {
    // Arrange
    // Act
    // Assert
  });

  test('should handle error case', async ({ page }) => {
    // Test error scenarios
  });
});
```

## Available Test Fixtures

The Bruno Playwright setup provides several custom fixtures:

### Core Fixtures

- `page`: Main page for testing
- `context`: Browser context
- `electronApp`: Electron application instance

### Utility Fixtures

- `createTmpDir`: Creates temporary directories for test data
- `newPage`: Creates a new page instance
- `pageWithUserData`: Page with custom user data
- `launchElectronApp`: Launches a new Electron app instance
- `reuseOrLaunchElectronApp`: Reuses existing app or launches new one

### Using Fixtures

```typescript
test('Test with multiple fixtures', async ({ page, createTmpDir, electronApp }) => {
  const testDir = await createTmpDir('test-data');

  // Your test logic here
});
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm run test:e2e

# Run specific test file
npx playwright test e2e-tests/001-sanity-tests/001-home-screen.spec.ts

# Run tests in a specific folder
npx playwright test e2e-tests/001-sanity-tests/
```

### Advanced Options

```bash
# Run with UI mode (for debugging)
npx playwright test --ui

# Run in headed mode (see browser)
npx playwright test --headed

# Run with specific browser
npx playwright test --project="Bruno Electron App"

# Run with debugging
npx playwright test --debug

# Run with trace recording
npx playwright test --trace on
```

### CI/CD Integration

```bash
# Install browsers for CI
npx playwright install

# Run tests in CI mode
npm run test:e2e
```

## Best Practices

### 1. Use Semantic Selectors

**Preferred:**

```typescript
await page.getByRole('button', { name: 'Create' }).click();
await page.getByLabel('Collection Name').fill('test');
await page.getByText('Success message').toBeVisible();
```

**Avoid:**

```typescript
await page.locator('.btn-primary').click();
await page.locator('#collection-name').fill('test');
```

### 2. Create Isolated Tests

Each test should be independent and not rely on other tests:

```typescript
test('should create collection', async ({ page, createTmpDir }) => {
  const testDir = await createTmpDir('collection-test');

  // Test creates its own data
  await page.getByLabel('Create Collection').click();
  await page.getByLabel('Name').fill('test-collection');
  await page.getByLabel('Location').fill(testDir);

  // Clean up happens automatically via createTmpDir
});
```

### 3. Add Meaningful Assertions

Always verify the expected outcomes:

```typescript
test('should save request successfully', async ({ page }) => {
  // Arrange
  await page.getByLabel('Create Collection').click();

  // Act
  await page.getByRole('button', { name: 'Save' }).click();

  // Assert
  await expect(page.getByText('Request saved successfully')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'GET request' })).toBeVisible();
});
```

### 4. Handle Async Operations

```typescript
test('should wait for network requests', async ({ page }) => {
  // Wait for specific network request
  await page.waitForResponse((response) => response.url().includes('/api/endpoint'));

  // Or wait for element to be stable
  await page.waitForSelector('[data-testid="loading"]', { state: 'hidden' });
});
```

### 5. Use Test Data Management

```typescript
test('should work with test data', async ({ page, createTmpDir }) => {
  const testDir = await createTmpDir('test-data');

  // Create test files
  await fs.writeFile(path.join(testDir, 'test.bru'), testContent);

  // Use in test
  await page.getByLabel('Open Collection').click();
  await page.getByText(testDir).click();
});
```

## Examples

### Example 1: Basic Collection Creation

```typescript
import { test, expect } from '../../playwright';

test('should create a new collection', async ({ page, createTmpDir }) => {
  const testDir = await createTmpDir('new-collection');

  await page.getByLabel('Create Collection').click();
  await page.getByLabel('Name').fill('My Test Collection');
  await page.getByLabel('Location').fill(testDir);
  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page.getByText('My Test Collection')).toBeVisible();
});
```

### Example 2: Request Creation and Execution

```typescript
import { test, expect } from '../../playwright';

test('should create and execute HTTP request', async ({ page, createTmpDir }) => {
  const testDir = await createTmpDir('request-test');

  // Create collection
  await page.getByLabel('Create Collection').click();
  await page.getByLabel('Name').fill('Request Test');
  await page.getByLabel('Location').fill(testDir);
  await page.getByRole('button', { name: 'Create' }).click();

  // Create request
  await page.locator('#create-new-tab').getByRole('img').click();
  await page.getByPlaceholder('Request Name').fill('Test Request');
  await page.locator('#new-request-url .CodeMirror').click();
  await page.locator('textarea').fill('http://localhost:8081/ping');
  await page.getByRole('button', { name: 'Create' }).click();

  // Execute request
  await page.locator('#send-request').getByRole('img').nth(2).click();

  // Verify response
  await expect(page.getByRole('main')).toContainText('200 OK');
});
```

### Example 3: Environment Management

```typescript
import { test, expect } from '../../playwright';

test('should create and use environment variables', async ({ page, createTmpDir }) => {
  const testDir = await createTmpDir('env-test');

  // Setup collection
  await page.getByLabel('Create Collection').click();
  await page.getByLabel('Name').fill('Environment Test');
  await page.getByLabel('Location').fill(testDir);
  await page.getByRole('button', { name: 'Create' }).click();

  // Create environment
  await page.getByRole('button', { name: 'Environments' }).click();
  await page.getByRole('button', { name: 'Add Environment' }).click();
  await page.getByLabel('Environment Name').fill('Development');
  await page.getByRole('button', { name: 'Create' }).click();

  // Add variable
  await page.getByRole('button', { name: 'Add Variable' }).click();
  await page.getByLabel('Variable Name').fill('API_URL');
  await page.getByLabel('Variable Value').fill('http://localhost:3000');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText('API_URL')).toBeVisible();
});
```

## Troubleshooting

### Common Issues

1. **Electron App Not Starting**

   ```bash
   # Ensure dependencies are installed
   npm install

   # Try running the app manually first
   npm run dev:electron
   ```

2. **Tests Timing Out**

   ```typescript
   // Increase timeout for specific test
   test('slow test', async ({ page }) => {
     test.setTimeout(60000); // 60 seconds
     // Test steps
   });
   ```

3. **Element Not Found**

   ```typescript
   // Wait for element to be present
   await page.waitForSelector('[data-testid="element"]');

   // Or use more specific selectors
   await page.getByRole('button', { name: 'Exact Button Text' }).click();
   ```

4. **Flaky Tests**

   ```typescript
   // Use stable selectors
   await page.getByTestId('stable-id').click();

   // Wait for state changes
   await page.waitForLoadState('networkidle');
   ```

### Debug Mode

```bash
# Run with debug mode
npx playwright test --debug

# Run specific test in debug mode
npx playwright test --debug e2e-tests/001-sanity-tests/001-home-screen.spec.ts
```

### Trace Analysis

```bash
# Run with trace recording
npx playwright test --trace on

# View trace in browser
npx playwright show-trace test-results/trace-*.zip
```

## Configuration

The Playwright configuration is in `playwright.config.ts`:

```typescript
export default defineConfig({
  testDir: './e2e-tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? undefined : 1,

  projects: [
    {
      name: 'Bruno Electron App'
    }
  ],

  webServer: [
    {
      command: 'npm run dev:web',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI
    },
    {
      command: 'npm start --workspace=packages/bruno-tests',
      url: 'http://localhost:8081/ping',
      reuseExistingServer: !process.env.CI
    }
  ]
});
```

## Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Test API](https://playwright.dev/docs/api/class-test)
- [Electron Testing with Playwright](https://playwright.dev/docs/api/class-electronapplication)
- [Bruno Project Structure](../readme.md)

---

For questions or issues with testing, please refer to the project's contributing guidelines or create an issue in the repository.
