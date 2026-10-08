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
5. The generated test file is saved in `tests/`

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
tests/
├── common/                             # Basic functionality tests
│   ├── home-screen.spec.ts
│   └── create-new-collection.spec.ts
├── feature-a/                          # Specific feature tests
├── utils/                              # Test utilities and helpers
│   ├── page/
│   │   ├── locators.ts                # common locators and merged sub feature locators
│   │   ├── actions.ts                 # common actions
│   │   ├── feature-a.ts               # Feature A specific locator builder and actions
│   │   └── feature-b.ts               # Feature B specific locator builder and actions
```

### Naming Conventions

- **Files**: Use descriptive names with `.spec.ts` extension
- **Tests**: Use clear, descriptive test names
- **Folders**: Use for grouping the tests

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
npx playwright test tests/common/home-screen.spec.ts

# Run tests in a specific folder
npx playwright test tests/folder-a/
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

## Best Practices

### 1. Centralize Locators and Actions in Page Modules

**Never inline raw `page.locator(...)` / `page.getByTestId(...)` selectors in a spec.** Locators and the interactions that use them live in **page modules** under `tests/utils/page/*`, and specs consume them through the shared builders and exported actions. This keeps selectors single-sourced, so a UI change is fixed in one place instead of across every spec.

**A page module owns one section.** Each file under `tests/utils/page/*` covers a single UI section/domain and exports *both* a locator builder and the actions for that section, co-located. [`mounting.ts`](../tests/utils/page/mounting.ts) is the reference shape — `buildCollectionTreeLocators(page)` lives alongside its actions (`waitForCollectionMount`, `openCollectionFromPath`, `getCollectionTreeStructure`, …) in one file.

**New section → new file → link into common.** Create a new page module for a new section rather than growing the inline object in `locators.ts`, then map its locator builder into `buildCommonLocators` so specs get it for free. This is **required** for every new page module.

A spec builds locators once and destructures the groups it needs — no per-section imports at the call site:

```typescript
import { test, expect } from '../../playwright';
import { buildCommonLocators, createCollection, createRequest, closeAllCollections } from '../utils/page';

test('should rename a request via the sidebar', async ({ page, createTmpDir }) => {
  const { sidebar, actions, dropdown } = buildCommonLocators(page);
  const testDir = await createTmpDir('rename-test');

  await createCollection(page, 'My Collection', testDir);
  await createRequest(page, 'Test Request', 'My Collection');

  await sidebar.request('Test Request').hover();
  await actions.collectionItemActions('Test Request').click();
  await dropdown.item('Rename').click();

  await closeAllCollections(page);
});
```

Defining a new page module (locator builder **and** its actions in one file):

```typescript
// tests/utils/page/notifications.ts — one file owns the "notifications" section
import { test, Page } from '../../../playwright';

export const buildNotificationLocators = (page: Page) => ({
  toast: (text: string) => page.getByTestId('notification-toast').filter({ hasText: text }),
  dismissButton: () => page.getByTestId('notification-dismiss')
});

export const dismissNotification = async (page: Page, text: string) => {
  await test.step(`Dismiss notification "${text}"`, async () => {
    const notifications = buildNotificationLocators(page);
    await notifications.toast(text).waitFor({ state: 'visible' });
    await notifications.dismissButton().click();
  });
};
```

Then link the builder into `buildCommonLocators` so every spec can reach it:

```typescript
// tests/utils/page/locators.ts
import { buildNotificationLocators } from './notifications';

export const buildCommonLocators = (page: Page) => ({
  runner: () => page.getByTestId('run-button'),
  sidebar: { /* … */ },
  notifications: buildNotificationLocators(page),   // now buildCommonLocators(page).notifications
  // …
});
```

**Scope of enforcement:**

- **Strict for new tests** — any new spec must go through this pattern; no direct selectors, no duplicated inline queries.
- **Lenient for existing tests** — small tweaks to an existing spec need not refactor its existing selectors. But if you rewrite or substantially modify a large portion of a spec, extract its selectors and interactions into a page module as part of the change.
- **Don't retro-link existing modules right now** — some already-extracted modules (e.g. [`mounting.ts`](../tests/utils/page/mounting.ts)) aren't wired into `buildCommonLocators` yet; leave them until their specs are next reworked. The rules above apply going forward, not as a migration mandate.
- **Long-term goal** — every section is a page module and every module is reachable from `buildCommonLocators`, so locators and actions stay consistent and single-sourced.

### 2. Use Semantic Selectors

Applies to the selectors written *inside* a page module (`locators.ts` or a section file), not the spec.

**Preferred:**

```typescript
page.getByTestId('collection-name');
page.getByRole('button', { name: 'Create' });
page.getByLabel('Collection Name');
```

**Avoid:**

```typescript
page.locator('.btn-primary');
page.locator('#collection-name');
```

### 3. Keep `defaultPreferences` in Sync with App Preferences

E2E launches seed a fresh userData dir from the `defaultPreferences` mock in [`playwright/index.ts`](../playwright/index.ts) (merged into any `init-user-data/preferences.json`). **Whenever you add or change a key in the app's `preferences.json` schema/defaults, add a matching default to that mock** — otherwise tests run against unset preferences and diverge from real app behaviour.

```typescript
// playwright/index.ts
const defaultPreferences = {
  preferences: {
    onboarding: {
      hasLaunchedBefore: true,
      hasSeenWelcomeModal: true,
      lastSeenVersion: version
    }
    // ← add the default for any new preferences.json key here
  }
};
```

### 4. Create Isolated Tests

Each test should be independent and not rely on other tests — its own temp dir, its own data, deterministic cleanup:

```typescript
import { test, expect } from '../../playwright';
import { buildCommonLocators, createCollection, closeAllCollections } from '../utils/page';

test('should create a collection', async ({ page, createTmpDir }) => {
  const { sidebar } = buildCommonLocators(page);
  const testDir = await createTmpDir('collection-test');   // isolated per test

  await createCollection(page, 'test-collection', testDir);
  await expect(sidebar.collection('test-collection')).toBeVisible();

  await closeAllCollections(page);   // deterministic cleanup
});
```

### 5. Add Meaningful Assertions

Always verify the expected outcome through locators from a page module:

```typescript
import { test, expect } from '../../playwright';
import { buildCommonLocators, createCollection, createRequest, saveRequest, closeAllCollections } from '../utils/page';

test('should save a request', async ({ page, createTmpDir }) => {
  const { tabs } = buildCommonLocators(page);
  const testDir = await createTmpDir('save-test');

  // Arrange
  await createCollection(page, 'Save Test', testDir);
  await createRequest(page, 'Get Ping', 'Save Test', { url: 'http://localhost:8081/ping', method: 'GET' });

  // Act
  await saveRequest(page);

  // Assert — the tab is open and no longer shows the unsaved-changes indicator
  await expect(tabs.requestTab('Get Ping')).toBeVisible();
  await expect(tabs.draftIndicator()).toBeHidden();

  await closeAllCollections(page);
});
```

### 6. Keep Assertions in Specs, Not Actions

`expect(...)` belongs in the spec, that's where the test's intent and its pass/fail criteria must be visible. Action helpers in `tests/utils/page/*` perform interactions and synchronize state; they must **not** assert the test's expectations. An action that asserts hides pass/fail logic behind a reusable helper and forces every caller to accept that one expectation.

**Actions synchronize with `waitFor`; specs verify with `expect`.** When an action needs the UI to reach a state before its next step (a modal to open, a spinner to clear), wait with Playwright's wait utilities like `locator.waitFor({ state })`, `page.waitForLoadState()` etc., not `expect`. `waitFor` synchronizes so the next action is reliable; `expect` decides whether the test passes and stays in the spec.

```typescript
// tests/utils/page/collection.ts — the action WAITS, it does not assert
export const openRenameModal = async (page: Page, requestName: string) => {
  await test.step(`Open rename modal for "${requestName}"`, async () => {
    const { sidebar, actions, dropdown } = buildCommonLocators(page);
    await sidebar.request(requestName).hover();
    await actions.collectionItemActions(requestName).click();
    await dropdown.item('Rename').click();
    // Synchronization, not assertion — wait until the modal is ready to interact with
    await page.locator('.bruno-modal').filter({ hasText: 'Rename Request' }).waitFor({ state: 'visible' });
  });
};
```

```typescript
// the spec OWNS the assertion
test('renames a request', async ({ page, createTmpDir }) => {
  const { modal } = buildCommonLocators(page);
  // … arrange: create collection + request …

  await openRenameModal(page, 'Test Request');

  await expect(modal.title('Rename Request')).toBeVisible();   // expect lives here, in the spec
});
```

### 7. Handle Async Operations

Prefer auto-retrying assertions and action helpers that encapsulate the wait; never wait on a raw inline selector.

```typescript
import { test, expect } from '../../playwright';
import { buildCommonLocators, sendRequestAndWaitForResponse } from '../utils/page';

test('should wait for async operations', async ({ page }) => {
  const { response } = buildCommonLocators(page);

  // Action helpers wrap "do the thing + wait for its result"
  await sendRequestAndWaitForResponse(page, 200);

  // Auto-retrying assertions wait until the condition holds — no hardcoded sleeps
  await expect(response.statusCode()).toContainText('200');
  await expect(response.pane()).toBeVisible();

  // page.waitForResponse targets the network (not the DOM), so it's fine to use directly.
  // Avoid page.waitForSelector('[data-testid="…"]') — wait on a locator from a page module instead.
});
```

### 8. Use Test Data Management

```typescript
import { test, expect } from '../../playwright';
import { buildCommonLocators, openCollection } from '../utils/page';

test('should work with test data', async ({ page, createTmpDir }) => {
  const { sidebar } = buildCommonLocators(page);
  const testDir = await createTmpDir('test-data');

  // Create test files
  await fs.writeFile(path.join(testDir, 'test.bru'), testContent);

  // Use in test — actions/locators come from page modules, not raw selectors
  await openCollection(page, 'test-data');
  await expect(sidebar.collection('test-data')).toBeVisible();
});
```

## Examples

All examples use `buildCommonLocators` for locators and the exported action helpers from `tests/utils/page` — see [Best Practices §1](#1-centralize-locators-and-actions-in-page-modules).

### Example 1: Basic Collection Creation

```typescript
import { test, expect } from '../../playwright';
import { buildCommonLocators, createCollection, closeAllCollections } from '../utils/page';

test('should create a new collection', async ({ page, createTmpDir }) => {
  const { sidebar } = buildCommonLocators(page);
  const testDir = await createTmpDir('new-collection');

  await createCollection(page, 'My Test Collection', testDir);

  await expect(sidebar.collection('My Test Collection')).toBeVisible();
  await closeAllCollections(page);
});
```

### Example 2: Request Creation and Execution

```typescript
import { test, expect } from '../../playwright';
import {
  buildCommonLocators,
  createCollection,
  createRequest,
  sendRequestAndWaitForResponse,
  closeAllCollections
} from '../utils/page';

test('should create and execute an HTTP request', async ({ page, createTmpDir }) => {
  const { response } = buildCommonLocators(page);
  const testDir = await createTmpDir('request-test');

  await createCollection(page, 'Request Test', testDir);
  await createRequest(page, 'Ping', 'Request Test', {
    url: 'http://localhost:8081/ping',
    method: 'GET'
  });

  // Sends the active request and asserts the status code in one step
  await sendRequestAndWaitForResponse(page, 200);

  await expect(response.statusCode()).toContainText('200');
  await closeAllCollections(page);
});
```

### Example 3: Environment Management

```typescript
import { test, expect } from '../../playwright';
import {
  buildCommonLocators,
  createCollection,
  createEnvironment,
  addEnvironmentVariable,
  closeAllCollections
} from '../utils/page';

test('should create and use environment variables', async ({ page, createTmpDir }) => {
  const { environment } = buildCommonLocators(page);
  const testDir = await createTmpDir('env-test');

  await createCollection(page, 'Environment Test', testDir);

  await createEnvironment(page, 'Development');
  await addEnvironmentVariable(page, { name: 'API_URL', value: 'http://localhost:3000' });

  await expect(environment.varRow('API_URL')).toBeVisible();
  await closeAllCollections(page);
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

   First find out *why* it's slow - a timeout is usually a symptom, not the problem. Replace hardcoded waits with auto-retrying assertions, wait on the app-ready signal (`[data-app-state="loaded"]`), and use action helpers that wait for their own result. Bumping the timeout hides the real issue and slows the suite for everyone.

   Only raise the timeout when the test genuinely does long-running work (large import, a slow real endpoint) - and scope it to that test, not globally:

   ```typescript
   // Justified: this test imports a very large collection that legitimately takes ~40s.
   test('imports a large collection', async ({ page }) => {
     test.setTimeout(60000); // 60s — the work is genuinely long, not a masked flake
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
npx playwright test --debug tests/common/home-screen.spec.ts
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
  testDir: './tests',
  fullyParallel: tue,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: undefined,

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
